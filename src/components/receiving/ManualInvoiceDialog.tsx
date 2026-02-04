"use client";

import { useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Loader2, Save } from "lucide-react";
import { useProducts } from "@/lib/hooks";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { InvoiceItem } from "@/lib/file-parser";

interface ManualInvoiceDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (items: InvoiceItem[], mapping: Record<string, string>, source: string) => void;
}

interface RowItem {
    tempId: string;
    productId: string | "new";
    quantity: number;
    // New product fields
    newName: string;
    newSku: string;
    newCategory: string;
}

const CATEGORIES = [
    "POS-терминалы",
    "Сканеры",
    "Принтеры",
    "Мониторы",
    "ПК и Ноутбуки",
    "Сетевое оборудование",
    "Прочее"
];

export function ManualInvoiceDialog({ open, onOpenChange, onSubmit }: ManualInvoiceDialogProps) {
    const { data: products, refetch: refetchProducts } = useProducts();
    const [source, setSource] = useState("");
    const [rows, setRows] = useState<RowItem[]>([
        { tempId: "1", productId: "", quantity: 1, newName: "", newSku: "", newCategory: "" }
    ]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const addRow = () => {
        setRows(prev => [
            ...prev,
            {
                tempId: Math.random().toString(36).substr(2, 9),
                productId: "",
                quantity: 1,
                newName: "",
                newSku: "",
                newCategory: ""
            }
        ]);
    };

    const removeRow = (id: string) => {
        setRows(prev => prev.filter(r => r.tempId !== id));
    };

    const updateRow = (id: string, field: keyof RowItem, value: any) => {
        setRows(prev => prev.map(r => r.tempId === id ? { ...r, [field]: value } : r));
    };

    const handleSubmit = async () => {
        if (!source.trim()) {
            toast.error("Укажите, откуда привозится оборудование");
            return;
        }

        if (rows.length === 0) {
            toast.error("Добавьте хотя бы одну позицию");
            return;
        }

        // Validate rows
        for (const row of rows) {
            if (!row.productId) {
                toast.error("Выберите оборудование или создайте новое для всех позиций");
                return;
            }
            if (row.productId === "new") {
                if (!row.newName || !row.newSku || !row.newCategory) {
                    toast.error("Заполните обязательные поля для нового оборудования (Название, Артикул, Категория)");
                    return;
                }
            }
            if (row.quantity <= 0) {
                toast.error("Количество должно быть больше 0");
                return;
            }
        }

        setIsSubmitting(true);
        try {
            const finalItems: InvoiceItem[] = [];
            const finalMapping: Record<string, string> = {};

            // Process each row
            for (const row of rows) {
                // Generate item ID for the invoice
                const itemInvoiceId = Math.random().toString(36).substr(2, 9);
                let targetProductId = row.productId;

                // Create new product if needed
                if (row.productId === "new") {
                    try {
                        const newProduct: any = await api.post("/products", {
                            name: row.newName,
                            sku: row.newSku,
                            category: row.newCategory,
                            isActive: true
                        });
                        targetProductId = newProduct.id;
                    } catch (e) {
                        console.error("Error creating product", e);
                        toast.error(`Ошибка при создании товара: ${row.newName}`);
                        setIsSubmitting(false);
                        return;
                    }
                }

                // Add to invoice items list
                // We use the product name as originalName for new items, or find existing name
                const productName = targetProductId === row.productId // if it was existing
                    ? products?.find(p => p.id === targetProductId)?.name || "Unknown"
                    : row.newName;

                finalItems.push({
                    id: itemInvoiceId,
                    originalName: productName,
                    quantity: Number(row.quantity),
                    sku: row.newSku || products?.find(p => p.id === targetProductId)?.sku
                });

                // Add to mapping
                finalMapping[itemInvoiceId] = targetProductId;
            }

            // Refresh products list in background to ensure new items appear in future
            refetchProducts();

            onSubmit(finalItems, finalMapping, source);
            onOpenChange(false);

            // Reset form
            setRows([{ tempId: Math.random().toString(36), productId: "", quantity: 1, newName: "", newSku: "", newCategory: "" }]);
            setSource("");

        } catch (error) {
            console.error(error);
            toast.error("Произошла ошибка при обработке списка");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl h-[90vh] md:h-[80vh] flex flex-col p-0 gap-0 overflow-hidden">
                <DialogHeader className="p-4 md:p-6 pb-2 border-b shrink-0 bg-background z-10">
                    <DialogTitle>Ручное создание накладной</DialogTitle>
                    <DialogDescription>
                        Заполните список оборудования. Новые позиции будут добавлены в каталог автоматически.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="source">Откуда привозится (Поставщик / Склад)</Label>
                        <Input
                            id="source"
                            placeholder="например: Главный склад, Поставщик ООО 'Техно'"
                            value={source}
                            onChange={(e) => setSource(e.target.value)}
                        />
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <Label>Список оборудования</Label>
                            <Button size="sm" variant="outline" onClick={addRow}>
                                <Plus className="h-4 w-4 mr-2" /> Добавить
                            </Button>
                        </div>

                        {rows.map((row, index) => (
                            <div key={row.tempId} className="p-4 border rounded-lg bg-muted/20 space-y-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-medium text-muted-foreground">Позиция #{index + 1}</span>
                                    {rows.length > 1 && (
                                        <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => removeRow(row.tempId)}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                                    <div className="md:col-span-8 space-y-2">
                                        <Label>Оборудование</Label>
                                        <Select
                                            value={row.productId}
                                            onValueChange={(val) => updateRow(row.tempId, "productId", val)}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Выберите из каталога..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="new" className="font-bold text-primary">+ Создать новое оборудование</SelectItem>
                                                {products?.map(p => (
                                                    <SelectItem key={p.id} value={p.id}>{p.name} ({p.sku})</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="md:col-span-4 space-y-2">
                                        <Label>Количество</Label>
                                        <Input
                                            type="number"
                                            min="1"
                                            value={row.quantity}
                                            onChange={(e) => updateRow(row.tempId, "quantity", Number(e.target.value))}
                                        />
                                    </div>
                                </div>

                                {row.productId === "new" && (
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-3 bg-background border rounded-md animate-in fade-in slide-in-from-top-2">
                                        <div className="space-y-2">
                                            <Label className="text-xs">Название <span className="text-destructive">*</span></Label>
                                            <Input
                                                value={row.newName}
                                                onChange={(e) => updateRow(row.tempId, "newName", e.target.value)}
                                                placeholder="Название товара"
                                                className="h-8"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs">Артикул / SKU <span className="text-destructive">*</span></Label>
                                            <Input
                                                value={row.newSku}
                                                onChange={(e) => updateRow(row.tempId, "newSku", e.target.value)}
                                                placeholder="REF-12345"
                                                className="h-8"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs">Категория <span className="text-destructive">*</span></Label>
                                            <Select
                                                value={row.newCategory}
                                                onValueChange={(val) => updateRow(row.tempId, "newCategory", val)}
                                            >
                                                <SelectTrigger className="h-8">
                                                    <SelectValue placeholder="Категория" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}

                        <Button variant="outline" className="w-full border-dashed" onClick={addRow}>
                            <Plus className="h-4 w-4 mr-2" /> Добавить еще строку
                        </Button>
                    </div>
                </div>

                <DialogFooter className="p-4 md:p-6 border-t shrink-0 bg-background z-10 gap-2">
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                        Отмена
                    </Button>
                    <Button onClick={handleSubmit} disabled={isSubmitting} className="w-full md:w-auto">
                        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                        Создать накладную
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
