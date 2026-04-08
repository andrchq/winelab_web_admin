"use client";

import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectSeparator, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, Save, Trash2 } from "lucide-react";
import { useCategories, useProducts } from "@/lib/hooks";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { InvoiceItem } from "@/lib/file-parser";
import type { EquipmentCategory, Product } from "@/types/api";

interface ManualInvoiceDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (items: InvoiceItem[], mapping: Record<string, string>, source: string) => void;
}

interface RowItem {
    tempId: string;
    categoryId: string;
    quantity: number;
}

interface CategoryGroup {
    parent: EquipmentCategory;
    children: EquipmentCategory[];
}

const TEXT = {
    sourceRequired: "\u0423\u043a\u0430\u0436\u0438\u0442\u0435, \u043e\u0442\u043a\u0443\u0434\u0430 \u043f\u0440\u0438\u0432\u043e\u0437\u0438\u0442\u0441\u044f \u043e\u0431\u043e\u0440\u0443\u0434\u043e\u0432\u0430\u043d\u0438\u0435",
    addAtLeastOne: "\u0414\u043e\u0431\u0430\u0432\u044c\u0442\u0435 \u0445\u043e\u0442\u044f \u0431\u044b \u043e\u0434\u043d\u0443 \u043f\u043e\u0437\u0438\u0446\u0438\u044e",
    selectEquipment: "\u0412\u044b\u0431\u0435\u0440\u0438\u0442\u0435 \u043e\u0431\u043e\u0440\u0443\u0434\u043e\u0432\u0430\u043d\u0438\u0435 \u0434\u043b\u044f \u0432\u0441\u0435\u0445 \u043f\u043e\u0437\u0438\u0446\u0438\u0439",
    quantityPositive: "\u041a\u043e\u043b\u0438\u0447\u0435\u0441\u0442\u0432\u043e \u0434\u043e\u043b\u0436\u043d\u043e \u0431\u044b\u0442\u044c \u0431\u043e\u043b\u044c\u0448\u0435 0",
    categoryNotFound: "\u041a\u0430\u0442\u0435\u0433\u043e\u0440\u0438\u044f \u043e\u0431\u043e\u0440\u0443\u0434\u043e\u0432\u0430\u043d\u0438\u044f \u043d\u0435 \u043d\u0430\u0439\u0434\u0435\u043d\u0430",
    processingError: "\u041f\u0440\u043e\u0438\u0437\u043e\u0448\u043b\u0430 \u043e\u0448\u0438\u0431\u043a\u0430 \u043f\u0440\u0438 \u043e\u0431\u0440\u0430\u0431\u043e\u0442\u043a\u0435 \u0441\u043f\u0438\u0441\u043a\u0430",
    title: "\u0420\u0443\u0447\u043d\u043e\u0435 \u0441\u043e\u0437\u0434\u0430\u043d\u0438\u0435 \u043d\u0430\u043a\u043b\u0430\u0434\u043d\u043e\u0439",
    description: "\u0417\u0430\u043f\u043e\u043b\u043d\u0438\u0442\u0435 \u0441\u043f\u0438\u0441\u043e\u043a \u043e\u0431\u043e\u0440\u0443\u0434\u043e\u0432\u0430\u043d\u0438\u044f \u0438\u0437 \u0441\u043f\u0440\u0430\u0432\u043e\u0447\u043d\u0438\u043a\u0430 \u043a\u0430\u0442\u0435\u0433\u043e\u0440\u0438\u0439.",
    sourceLabel: "\u041e\u0442\u043a\u0443\u0434\u0430 \u043f\u0440\u0438\u0432\u043e\u0437\u0438\u0442\u0441\u044f (\u041f\u043e\u0441\u0442\u0430\u0432\u0449\u0438\u043a / \u0421\u043a\u043b\u0430\u0434)",
    sourcePlaceholder: "\u043d\u0430\u043f\u0440\u0438\u043c\u0435\u0440: \u0413\u043b\u0430\u0432\u043d\u044b\u0439 \u0441\u043a\u043b\u0430\u0434, \u041f\u043e\u0441\u0442\u0430\u0432\u0449\u0438\u043a \u041e\u041e\u041e '\u0422\u0435\u0445\u043d\u043e'",
    listLabel: "\u0421\u043f\u0438\u0441\u043e\u043a \u043e\u0431\u043e\u0440\u0443\u0434\u043e\u0432\u0430\u043d\u0438\u044f",
    addButton: "\u0414\u043e\u0431\u0430\u0432\u0438\u0442\u044c",
    positionPrefix: "\u041f\u043e\u0437\u0438\u0446\u0438\u044f",
    equipmentLabel: "\u041e\u0431\u043e\u0440\u0443\u0434\u043e\u0432\u0430\u043d\u0438\u0435",
    selectPlaceholder: "\u0412\u044b\u0431\u0435\u0440\u0438\u0442\u0435 \u0438\u0437 \u0441\u043f\u0440\u0430\u0432\u043e\u0447\u043d\u0438\u043a\u0430...",
    quantityLabel: "\u041a\u043e\u043b\u0438\u0447\u0435\u0441\u0442\u0432\u043e",
    addAnotherRow: "\u0414\u043e\u0431\u0430\u0432\u0438\u0442\u044c \u0435\u0449\u0435 \u0441\u0442\u0440\u043e\u043a\u0443",
    cancelButton: "\u041e\u0442\u043c\u0435\u043d\u0430",
    submitButton: "\u0421\u043e\u0437\u0434\u0430\u0442\u044c \u043d\u0430\u043a\u043b\u0430\u0434\u043d\u0443\u044e",
    standaloneLabel: "\u0411\u0435\u0437 \u0433\u0440\u0443\u043f\u043f\u044b",
};

export function ManualInvoiceDialog({ open, onOpenChange, onSubmit }: ManualInvoiceDialogProps) {
    const { data: products } = useProducts();
    const { data: categories } = useCategories();
    const [source, setSource] = useState("");
    const [rows, setRows] = useState<RowItem[]>([
        { tempId: "1", categoryId: "", quantity: 1 }
    ]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const groupedCategories = useMemo(() => {
        const allCategories = categories || [];
        const childrenByParentId = new Map<string, EquipmentCategory[]>();

        for (const category of allCategories) {
            if (!category.parentId) {
                continue;
            }

            const currentChildren = childrenByParentId.get(category.parentId) || [];
            currentChildren.push(category);
            childrenByParentId.set(category.parentId, currentChildren);
        }

        const topLevelGroups: CategoryGroup[] = allCategories
            .filter((category) => !category.parentId)
            .map((category) => ({
                parent: category,
                children: [...(childrenByParentId.get(category.id) || [])].sort((a, b) => a.name.localeCompare(b.name, "ru")),
            }))
            .filter((group) => group.children.length > 0)
            .sort((a, b) => a.parent.name.localeCompare(b.parent.name, "ru"));

        const standaloneCategories = allCategories
            .filter((category) => !category.parentId && (childrenByParentId.get(category.id)?.length || 0) === 0)
            .sort((a, b) => a.name.localeCompare(b.name, "ru"));

        return {
            topLevelGroups,
            standaloneCategories,
        };
    }, [categories]);

    const selectableCategories = useMemo(() => {
        return [
            ...groupedCategories.topLevelGroups.flatMap((group) => group.children),
            ...groupedCategories.standaloneCategories,
        ];
    }, [groupedCategories]);

    const addRow = () => {
        setRows((prev) => [
            ...prev,
            {
                tempId: Math.random().toString(36).substr(2, 9),
                categoryId: "",
                quantity: 1,
            }
        ]);
    };

    const removeRow = (id: string) => {
        setRows((prev) => prev.filter((row) => row.tempId !== id));
    };

    const updateRow = (id: string, field: keyof RowItem, value: string | number) => {
        setRows((prev) => prev.map((row) => row.tempId === id ? { ...row, [field]: value } : row));
    };

    const resolveCategoryProduct = async (category: EquipmentCategory, activeProducts: Product[]) => {
        const exactMatch = activeProducts.find((product) =>
            product.categoryId === category.id &&
            (product.sku === category.code || product.name === category.name)
        );

        if (exactMatch) {
            return exactMatch;
        }

        const fallbackByCategory = activeProducts.find((product) => product.categoryId === category.id);
        if (fallbackByCategory) {
            return fallbackByCategory;
        }

        return api.post<Product>("/products", {
            name: category.name,
            sku: category.code,
            category: category.id,
            categoryId: category.id,
            description: `Auto-created for receiving from category ${category.code}`,
        });
    };

    const handleSubmit = async () => {
        if (!source.trim()) {
            toast.error(TEXT.sourceRequired);
            return;
        }

        if (rows.length === 0) {
            toast.error(TEXT.addAtLeastOne);
            return;
        }

        for (const row of rows) {
            if (!row.categoryId) {
                toast.error(TEXT.selectEquipment);
                return;
            }
            if (row.quantity <= 0) {
                toast.error(TEXT.quantityPositive);
                return;
            }
        }

        setIsSubmitting(true);
        try {
            const finalItems: InvoiceItem[] = [];
            const finalMapping: Record<string, string> = {};
            const availableProducts = [...(products || [])];

            for (const row of rows) {
                const itemInvoiceId = Math.random().toString(36).substr(2, 9);
                const category = selectableCategories.find((item) => item.id === row.categoryId);

                if (!category) {
                    throw new Error(TEXT.categoryNotFound);
                }

                const resolvedProduct = await resolveCategoryProduct(category, availableProducts);
                if (!availableProducts.some((product) => product.id === resolvedProduct.id)) {
                    availableProducts.push(resolvedProduct);
                }

                finalItems.push({
                    id: itemInvoiceId,
                    originalName: category.name,
                    quantity: Number(row.quantity),
                    sku: resolvedProduct.sku,
                });

                finalMapping[itemInvoiceId] = resolvedProduct.id;
            }

            onSubmit(finalItems, finalMapping, source);
            onOpenChange(false);
            setRows([{ tempId: Math.random().toString(36), categoryId: "", quantity: 1 }]);
            setSource("");
        } catch (error) {
            console.error(error);
            toast.error(error instanceof Error ? error.message : TEXT.processingError);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl h-[90vh] md:h-[80vh] flex flex-col p-0 gap-0 overflow-hidden">
                <DialogHeader className="p-4 md:p-6 pb-2 border-b shrink-0 bg-background z-10">
                    <DialogTitle>{TEXT.title}</DialogTitle>
                    <DialogDescription>{TEXT.description}</DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="source">{TEXT.sourceLabel}</Label>
                        <Input
                            id="source"
                            placeholder={TEXT.sourcePlaceholder}
                            value={source}
                            onChange={(e) => setSource(e.target.value)}
                        />
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <Label>{TEXT.listLabel}</Label>
                            <Button size="sm" variant="outline" onClick={addRow}>
                                <Plus className="h-4 w-4 mr-2" /> {TEXT.addButton}
                            </Button>
                        </div>

                        {rows.map((row, index) => (
                            <div key={row.tempId} className="p-4 border rounded-lg bg-muted/20 space-y-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-medium text-muted-foreground">
                                        {TEXT.positionPrefix} #{index + 1}
                                    </span>
                                    {rows.length > 1 && (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="text-destructive hover:bg-destructive/10"
                                            onClick={() => removeRow(row.tempId)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                                    <div className="md:col-span-8 space-y-2">
                                        <Label>{TEXT.equipmentLabel}</Label>
                                        <Select
                                            value={row.categoryId}
                                            onValueChange={(value) => updateRow(row.tempId, "categoryId", value)}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder={TEXT.selectPlaceholder} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {groupedCategories.topLevelGroups.map((group, index) => (
                                                    <div key={group.parent.id}>
                                                        {index > 0 && <SelectSeparator />}
                                                        <SelectGroup>
                                                            <SelectLabel>{group.parent.name}</SelectLabel>
                                                            {group.children.map((category) => (
                                                                <SelectItem key={category.id} value={category.id}>
                                                                    {category.name} ({category.code})
                                                                </SelectItem>
                                                            ))}
                                                        </SelectGroup>
                                                    </div>
                                                ))}
                                                {groupedCategories.standaloneCategories.length > 0 && (
                                                    <>
                                                        {groupedCategories.topLevelGroups.length > 0 && <SelectSeparator />}
                                                        <SelectGroup>
                                                            <SelectLabel>{TEXT.standaloneLabel}</SelectLabel>
                                                            {groupedCategories.standaloneCategories.map((category) => (
                                                                <SelectItem key={category.id} value={category.id}>
                                                                    {category.name} ({category.code})
                                                                </SelectItem>
                                                            ))}
                                                        </SelectGroup>
                                                    </>
                                                )}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="md:col-span-4 space-y-2">
                                        <Label>{TEXT.quantityLabel}</Label>
                                        <Input
                                            type="number"
                                            min="1"
                                            value={row.quantity}
                                            onChange={(e) => updateRow(row.tempId, "quantity", Number(e.target.value))}
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}

                        <Button variant="outline" className="w-full border-dashed" onClick={addRow}>
                            <Plus className="h-4 w-4 mr-2" /> {TEXT.addAnotherRow}
                        </Button>
                    </div>
                </div>

                <DialogFooter className="p-4 md:p-6 border-t shrink-0 bg-background z-10 gap-2">
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                        {TEXT.cancelButton}
                    </Button>
                    <Button onClick={handleSubmit} disabled={isSubmitting} className="w-full md:w-auto">
                        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                        {TEXT.submitButton}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
