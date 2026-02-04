"use client";

import { uuidv4 } from "@/lib/uuid"
import { useState, useMemo } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Loader2,
    Package,
    Search,
    ShieldAlert,
    Check,
    Plus,
    X,
    AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useStockItems, useProducts, useWarehouses } from "@/lib/hooks";
import { useAuth } from "@/contexts/AuthContext";
import {
    MANDATORY_EQUIPMENT,
    ACCESSORY_CATEGORY,
} from "@/lib/equipment-categories";
import type { EquipmentCategory, StoreEquipment, StockItem } from "@/types/api";

interface AddStoreEquipmentDialogProps {
    storeId: string;
    storeName: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
    existingEquipment?: StoreEquipment[];
}

interface EquipmentRow {
    category: EquipmentCategory;
    label: string;
    stockItemId: string;
    comment: string;
    isMandatory: boolean;
}

interface AccessoryRow {
    id: string;
    stockItemId: string;
    comment: string;
}

export function AddStoreEquipmentDialog({
    storeId,
    storeName,
    open,
    onOpenChange,
    onSuccess,
    existingEquipment = [],
}: AddStoreEquipmentDialogProps) {
    const { user } = useAuth();
    const { data: stockItems, isLoading: stockLoading } = useStockItems();
    const [loading, setLoading] = useState(false);
    const [skipInventory, setSkipInventory] = useState(false);
    const [warehouseId, setWarehouseId] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState<'mandatory' | 'accessory'>('mandatory');
    const { data: warehouses } = useWarehouses();

    // Initialize mandatory equipment rows
    const [mandatoryRows, setMandatoryRows] = useState<EquipmentRow[]>(() =>
        MANDATORY_EQUIPMENT.map(cat => ({
            category: cat.category,
            label: cat.label,
            stockItemId: '',
            comment: '',
            isMandatory: true,
        }))
    );

    // Accessory equipment rows (dynamic)
    const [accessoryRows, setAccessoryRows] = useState<AccessoryRow[]>([
        { id: uuidv4(), stockItemId: '', comment: '' }
    ]);

    // Check if user can bypass inventory
    const canBypassInventory = user?.role === 'ADMIN' || user?.role === 'MANAGER';

    // Get existing categories
    const existingCategories = useMemo(() => {
        return new Set(existingEquipment.map(e => e.category));
    }, [existingEquipment]);

    // Filter stock items based on search and warehouse
    const filteredStockItems = useMemo(() => {
        if (!stockItems || !warehouseId) return [];

        return stockItems.filter(item => {
            // Filter by warehouse
            if (item.warehouseId !== warehouseId) return false;

            // Must have available quantity (unless skipInventory is on)
            const available = item.quantity - item.reserved;
            if (!skipInventory && available <= 0) return false;

            // Filter by search query
            if (searchQuery) {
                const query = searchQuery.toLowerCase();
                const productName = item.product?.name?.toLowerCase() || '';
                const productSku = item.product?.sku?.toLowerCase() || '';
                return productName.includes(query) || productSku.includes(query);
            }

            return true;
        });
    }, [stockItems, searchQuery, skipInventory, warehouseId]);

    // Update mandatory row
    const updateMandatoryRow = (index: number, field: 'stockItemId' | 'comment', value: string) => {
        setMandatoryRows(prev => {
            const updated = [...prev];
            updated[index] = { ...updated[index], [field]: value };
            return updated;
        });
    };

    // Add accessory row
    const addAccessoryRow = () => {
        setAccessoryRows(prev => [...prev, { id: uuidv4(), stockItemId: '', comment: '' }]);
    };

    // Remove accessory row
    const removeAccessoryRow = (id: string) => {
        setAccessoryRows(prev => prev.filter(row => row.id !== id));
    };

    // Update accessory row
    const updateAccessoryRow = (id: string, field: 'stockItemId' | 'comment', value: string) => {
        setAccessoryRows(prev => prev.map(row =>
            row.id === id ? { ...row, [field]: value } : row
        ));
    };

    // Get stock item details
    const getStockItemName = (stockItemId: string): string => {
        const item = stockItems?.find(s => s.id === stockItemId);
        if (!item) return '';
        return `${item.product?.name || 'Неизвестно'} (${item.quantity - item.reserved} шт.)`;
    };

    const handleSubmit = async () => {
        // Collect all equipment to add
        const equipmentToAdd: Array<{
            category: EquipmentCategory;
            stockItemId: string;
            comment: string;
        }> = [];

        // Add mandatory equipment
        mandatoryRows.forEach(row => {
            if (row.stockItemId) {
                equipmentToAdd.push({
                    category: row.category,
                    stockItemId: row.stockItemId,
                    comment: row.comment,
                });
            }
        });

        // Add accessory equipment
        accessoryRows.forEach(row => {
            if (row.stockItemId) {
                equipmentToAdd.push({
                    category: 'ACCESSORY',
                    stockItemId: row.stockItemId,
                    comment: row.comment,
                });
            }
        });

        if (equipmentToAdd.length === 0) {
            toast.error("Выберите хотя бы одну позицию оборудования");
            return;
        }

        // Validate comments
        const invalidComment = equipmentToAdd.find(e => e.comment.length > 120);
        if (invalidComment) {
            toast.error("Комментарий не может быть длиннее 120 символов");
            return;
        }

        setLoading(true);
        try {
            await api.post(`/stores/${storeId}/equipment`, {
                equipment: equipmentToAdd,
                skipInventory,
                warehouseId,
            });

            toast.success(`Добавлено ${equipmentToAdd.length} единиц оборудования`);

            // Reset form
            setMandatoryRows(MANDATORY_EQUIPMENT.map(cat => ({
                category: cat.category,
                label: cat.label,
                stockItemId: '',
                comment: '',
                isMandatory: true,
            })));
            setAccessoryRows([{ id: uuidv4(), stockItemId: '', comment: '' }]);
            setSkipInventory(false);
            setWarehouseId('');

            onOpenChange(false);
            onSuccess();
        } catch (error: any) {
            toast.error(error.message || "Ошибка при добавлении оборудования");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        onOpenChange(false);
    };

    // Count selected items
    const selectedMandatoryCount = mandatoryRows.filter(r => r.stockItemId).length;
    const selectedAccessoryCount = accessoryRows.filter(r => r.stockItemId).length;
    const totalSelected = selectedMandatoryCount + selectedAccessoryCount;

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[700px] max-h-[90vh] flex flex-col p-0">
                <DialogHeader className="p-4 border-b">
                    <DialogTitle className="flex items-center gap-2 text-base">
                        <Package className="h-4 w-4 text-primary" />
                        Добавить оборудование
                    </DialogTitle>
                    <DialogDescription className="text-xs">
                        Магазин: <span className="font-medium text-foreground">{storeName}</span>
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-hidden flex flex-col">
                    {/* Tabs (Sticky) */}
                    <div className="px-4 py-2 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10">
                        <div className="flex gap-2">
                            <Button
                                type="button"
                                variant={activeTab === 'mandatory' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setActiveTab('mandatory')}
                                className="flex-1 h-8 text-xs"
                            >
                                Обязательное
                                {selectedMandatoryCount > 0 && (
                                    <Badge variant="secondary" className="ml-2 h-4 px-1 text-[10px]">
                                        {selectedMandatoryCount}
                                    </Badge>
                                )}
                            </Button>
                            <Button
                                type="button"
                                variant={activeTab === 'accessory' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setActiveTab('accessory')}
                                className="flex-1 h-8 text-xs"
                            >
                                Сопутствующее
                                {selectedAccessoryCount > 0 && (
                                    <Badge variant="secondary" className="ml-2 h-4 px-1 text-[10px]">
                                        {selectedAccessoryCount}
                                    </Badge>
                                )}
                            </Button>
                        </div>
                    </div>

                    {/* Scrollable Content */}
                    <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-4">
                        {/* Warehouse Selection and Controls (Now Scrollable) */}
                        <div className="space-y-3 bg-muted/30 p-3 rounded-xl border border-border/50">
                            <div className="grid gap-3 sm:grid-cols-2">
                                <div className="space-y-1.5">
                                    <Label className="text-[10px] uppercase tracking-wider text-muted-foreground ml-1">Склад списания</Label>
                                    <Select
                                        value={warehouseId}
                                        onValueChange={(value) => {
                                            setWarehouseId(value);
                                            setMandatoryRows(prev => prev.map(r => ({ ...r, stockItemId: '' })));
                                            setAccessoryRows(prev => prev.map(r => ({ ...r, stockItemId: '' })));
                                        }}
                                    >
                                        <SelectTrigger className="h-9 text-sm">
                                            <SelectValue placeholder="Выберите склад" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {warehouses?.map((w) => (
                                                <SelectItem key={w.id} value={w.id}>
                                                    {w.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-[10px] uppercase tracking-wider text-muted-foreground ml-1">Поиск</Label>
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                                        <Input
                                            placeholder="Модель, SKU..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="pl-9 h-9 text-sm"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Bypass Inventory Toggle */}
                            {canBypassInventory && (
                                <div className="flex items-center justify-between p-2.5 rounded-lg bg-amber-500/5 border border-amber-500/20">
                                    <div className="flex items-center gap-2">
                                        <ShieldAlert className="h-3.5 w-3.5 text-amber-600" />
                                        <div>
                                            <Label htmlFor="skip-inventory" className="text-xs font-medium cursor-pointer">
                                                Без учёта
                                            </Label>
                                            <p className="text-[10px] text-muted-foreground">
                                                Не вычитать из остатков склада
                                            </p>
                                        </div>
                                    </div>
                                    <Switch
                                        id="skip-inventory"
                                        className="scale-75"
                                        checked={skipInventory}
                                        onCheckedChange={setSkipInventory}
                                    />
                                </div>
                            )}
                        </div>

                        {/* Equipment List Content */}
                        {stockLoading ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                            </div>
                        ) : activeTab === 'mandatory' ? (
                            <div className="space-y-3">
                                {mandatoryRows.map((row, index) => {
                                    const hasExisting = existingCategories.has(row.category);

                                    return (
                                        <div
                                            key={row.category}
                                            className={`p-3 rounded-lg border transition-colors ${row.stockItemId
                                                ? 'border-green-500/50 bg-green-500/5'
                                                : hasExisting
                                                    ? 'border-blue-500/30 bg-blue-500/5'
                                                    : 'border-border/50 bg-card'
                                                }`}
                                        >
                                            <div className="flex items-center gap-3 mb-2">
                                                <div className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-medium ${row.stockItemId
                                                    ? 'bg-green-500 text-white'
                                                    : hasExisting
                                                        ? 'bg-blue-500 text-white'
                                                        : 'bg-muted text-muted-foreground'
                                                    }`}>
                                                    {row.stockItemId ? <Check className="h-3.5 w-3.5" /> : hasExisting ? <Check className="h-3.5 w-3.5" /> : index + 1}
                                                </div>
                                                <span className="font-medium text-sm flex-1">{row.label}</span>
                                                {hasExisting && !row.stockItemId && (
                                                    <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-600 border-blue-500/30">
                                                        Уже есть
                                                    </Badge>
                                                )}
                                            </div>

                                            <div className="grid gap-2 sm:grid-cols-2">
                                                <Select
                                                    value={row.stockItemId || "none"}
                                                    onValueChange={(value) => updateMandatoryRow(index, 'stockItemId', value === "none" ? "" : value)}
                                                    disabled={!warehouseId}
                                                >
                                                    <SelectTrigger className="h-9 text-sm">
                                                        <SelectValue placeholder={warehouseId ? "Выберите оборудование" : "Сначала выберите склад"} />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="none">— Не выбрано —</SelectItem>
                                                        {filteredStockItems.map((item) => (
                                                            <SelectItem key={item.id} value={item.id}>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="truncate">
                                                                        {item.product?.name}
                                                                    </span>
                                                                    <Badge variant="outline" className="text-[10px] shrink-0">
                                                                        {item.quantity - item.reserved} шт.
                                                                    </Badge>
                                                                </div>
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>

                                                <Input
                                                    placeholder="Комментарий (до 120 симв.)"
                                                    value={row.comment}
                                                    onChange={(e) => updateMandatoryRow(index, 'comment', e.target.value)}
                                                    maxLength={120}
                                                    className="h-9 text-sm"
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {accessoryRows.map((row, index) => (
                                    <div
                                        key={row.id}
                                        className={`p-3 rounded-lg border transition-colors ${row.stockItemId
                                            ? 'border-green-500/50 bg-green-500/5'
                                            : 'border-border/50 bg-card'
                                            }`}
                                    >
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-medium ${row.stockItemId
                                                ? 'bg-green-500 text-white'
                                                : 'bg-muted text-muted-foreground'
                                                }`}>
                                                {row.stockItemId ? <Check className="h-3.5 w-3.5" /> : index + 1}
                                            </div>
                                            <span className="font-medium text-sm flex-1">Сопутствующее #{index + 1}</span>
                                            {accessoryRows.length > 1 && (
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6"
                                                    onClick={() => removeAccessoryRow(row.id)}
                                                >
                                                    <X className="h-3.5 w-3.5" />
                                                </Button>
                                            )}
                                        </div>

                                        <div className="grid gap-2 sm:grid-cols-2">
                                            <Select
                                                value={row.stockItemId || "none"}
                                                onValueChange={(value) => updateAccessoryRow(row.id, 'stockItemId', value === "none" ? "" : value)}
                                                disabled={!warehouseId}
                                            >
                                                <SelectTrigger className="h-9 text-sm">
                                                    <SelectValue placeholder={warehouseId ? "Выберите оборудование" : "Сначала выберите склад"} />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="none">— Не выбрано —</SelectItem>
                                                    {filteredStockItems.map((item) => (
                                                        <SelectItem key={item.id} value={item.id}>
                                                            <div className="flex items-center gap-2">
                                                                <span className="truncate">
                                                                    {item.product?.name}
                                                                </span>
                                                                <Badge variant="outline" className="text-[10px] shrink-0">
                                                                    {item.quantity - item.reserved} шт.
                                                                </Badge>
                                                            </div>
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>

                                            <Input
                                                placeholder="Комментарий (до 120 симв.)"
                                                value={row.comment}
                                                onChange={(e) => updateAccessoryRow(row.id, 'comment', e.target.value)}
                                                maxLength={120}
                                                className="h-9 text-sm"
                                            />
                                        </div>
                                    </div>
                                ))}

                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={addAccessoryRow}
                                    className="w-full gap-2"
                                >
                                    <Plus className="h-4 w-4" />
                                    Добавить ещё
                                </Button>
                            </div>
                        )}
                    </div>
                </div>

                <DialogFooter className="p-4 border-t bg-muted/30">
                    <div className="flex items-center justify-between w-full gap-4">
                        <div className="text-sm text-muted-foreground">
                            {totalSelected > 0 ? (
                                <span className="text-foreground font-medium">
                                    Выбрано: {totalSelected} позиций
                                </span>
                            ) : (
                                'Выберите оборудование для добавления'
                            )}
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={handleClose} disabled={loading}>
                                Отмена
                            </Button>
                            <Button onClick={handleSubmit} disabled={loading || totalSelected === 0}>
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Добавить {totalSelected > 0 && `(${totalSelected})`}
                            </Button>
                        </div>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
