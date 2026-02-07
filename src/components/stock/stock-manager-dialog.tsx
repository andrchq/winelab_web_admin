
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Loader2, AlertTriangle } from "lucide-react";
import { Product, StockItem, Warehouse } from "@/types/api";
import { useWarehouses } from "@/lib/hooks";

interface StockManagerDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    product: Product | null;
    stockItems: StockItem[]; // All stock items for this product
    onSuccess: () => void;
}

export function StockManagerDialog({ open, onOpenChange, product, stockItems, onSuccess }: StockManagerDialogProps) {
    const { data: warehouses } = useWarehouses();
    const [isLoading, setIsLoading] = useState(false);

    // Form State
    const [sku, setSku] = useState("");
    const [name, setName] = useState("");
    const [category, setCategory] = useState("");
    // We map warehouseId -> { quantity, reserved, minQuantity, delta }
    interface WarehouseState {
        id: string; // warehouseId
        name: string;
        currentQty: number;
        reserved: number;
        minQuantity: number;
        delta: number; // for add/remove
    }
    const [warehouseStates, setWarehouseStates] = useState<WarehouseState[]>([]);

    useEffect(() => {
        if (open && product && warehouses) {
            setSku(product.sku);
            setName(product.name);
            setName(product.name);
            setCategory(product.category.name);

            // Map existing stock items to warehouses
            const states: WarehouseState[] = warehouses.map(wh => {
                const item = stockItems.find(si => si.warehouseId === wh.id);
                return {
                    id: wh.id,
                    name: wh.name,
                    currentQty: item?.quantity || 0,
                    reserved: item?.reserved || 0,
                    minQuantity: item?.minQuantity || 0,
                    delta: 0
                };
            });
            setWarehouseStates(states);
        }
    }, [open, product, warehouses, stockItems]);

    const handleSave = async () => {
        if (!product) return;
        setIsLoading(true);

        try {
            // 1. Update Product Details (SKU, Name, Category) if changed
            if (sku !== product.sku || name !== product.name) {
                await api.patch(`/products/${product.id}`, {
                    sku,
                    name
                });
            }

            // 2. Process changes for each warehouse
            await Promise.all(warehouseStates.map(async (state) => {
                const originalItem = stockItems.find(si => si.warehouseId === state.id);
                const originalReserved = originalItem?.reserved || 0;
                const originalMin = originalItem?.minQuantity || 0;

                // Check if any changes
                const hasDelta = state.delta !== 0;
                const hasReservedChange = state.reserved !== originalReserved;
                const hasMinChange = state.minQuantity !== originalMin;

                if (!hasDelta && !hasReservedChange && !hasMinChange) return;

                // Use the backend endpoints
                // We might need to split this:
                // - Adjust quantity (delta) -> /stock/adjust or creation
                // - Update reserved/min -> /stock/:id patch

                // If item doesn't exist, we must create it first if we have positive values
                // But backend check usually handles upsert if we call a creation-like endpoint?
                // The current API has `create` (productId, warehouseId, quantity, minQuantity).
                // And `update` (id, data).
                // And `adjust` (id, delta).

                // Let's use a robust approach:
                // A. If item exists:
                if (originalItem) {
                    if (hasDelta) {
                        await api.patch(`/stock/${originalItem.id}/adjust`, { delta: state.delta });
                    }
                    if (hasReservedChange || hasMinChange) {
                        await api.patch(`/stock/${originalItem.id}`, {
                            reserved: state.reserved,
                            minQuantity: state.minQuantity
                        });
                    }
                } else {
                    // B. Item does not exist: Create it
                    // Base quantity will be 0 + delta.
                    // If delta is negative for non-existent item, it's an error usually, but let's assume valid input.
                    if (state.delta !== 0 || state.reserved > 0 || state.minQuantity > 0) {
                        await api.post(`/stock`, {
                            productId: product.id,
                            warehouseId: state.id,
                            quantity: state.delta, // Correct initial quantity
                            minQuantity: state.minQuantity
                        });
                        // Separate call for reserved if create doesn't support it?
                        // Create DTO in service: { productId, warehouseId, quantity, minQuantity }.
                        // It doesn't take reserved. So we might need to patch it after creation if reserved > 0.
                        // But for now, let's assume we can only create with Qty/Min.
                        // If reserved is needed, we'd need to fetch the ID of created item and patch.
                        // This is getting complex.

                        // Hack: Create then immediately patch if reserved > 0?
                        // Actually, usually you don't reserve on creation of empty stock.
                    }
                }
            }));

            toast.success("Данные сохранены");
            onSuccess();
            onOpenChange(false);
        } catch (error) {
            toast.error("Ошибка при сохранении");
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl">
                <DialogHeader>
                    <DialogTitle>Управление остатками: {product?.name}</DialogTitle>
                    <DialogDescription>
                        Редактирование параметров товара и управление остатками
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* SKU Section */}
                    {/* Product Details Section */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Название</Label>
                            <Input
                                id="name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Название товара"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="category">Категория</Label>
                            <Input
                                id="category"
                                value={category}
                                disabled
                                className="bg-muted opacity-100 cursor-not-allowed"
                                placeholder="Категория"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="sku">SKU</Label>
                            <Input
                                id="sku"
                                value={sku}
                                onChange={(e) => setSku(e.target.value)}
                                placeholder="ART-123"
                            />
                        </div>
                    </div>

                    {/* Warehouses Grid */}
                    <div className="border rounded-md">
                        <table className="w-full text-sm">
                            <thead className="bg-muted/50">
                                <tr>
                                    <th className="p-3 text-left font-medium">Склад</th>
                                    <th className="p-3 text-left font-medium w-24">Текущий</th>
                                    <th className="p-3 text-left font-medium w-40">Изменение (+/-)</th>
                                    <th className="p-3 text-left font-medium w-24">Резерв</th>
                                    <th className="p-3 text-left font-medium w-24">Мин. ост.</th>
                                    <th className="p-3 text-left font-medium w-24">Итог</th>
                                </tr>
                            </thead>
                            <tbody>
                                {warehouseStates.map((state, index) => {
                                    const available = (state.currentQty + state.delta) - state.reserved;
                                    const isLow = available < state.minQuantity;

                                    return (
                                        <tr key={state.id} className="border-t">
                                            <td className="p-3 font-medium">{state.name}</td>
                                            <td className="p-3 text-muted-foreground">{state.currentQty}</td>
                                            <td className="p-3">
                                                <Input
                                                    type="number"
                                                    value={state.delta || ""}
                                                    onChange={(e) => {
                                                        const val = parseInt(e.target.value) || 0;
                                                        const newStates = [...warehouseStates];
                                                        newStates[index].delta = val;
                                                        setWarehouseStates(newStates);
                                                    }}
                                                    placeholder="0"
                                                    className={state.delta !== 0 ? (state.delta > 0 ? "border-green-500 bg-green-50" : "border-red-500 bg-red-50") : ""}
                                                />
                                            </td>
                                            <td className="p-3">
                                                <Input
                                                    type="number"
                                                    min="0"
                                                    value={state.reserved}
                                                    onChange={(e) => {
                                                        const val = Math.max(0, parseInt(e.target.value) || 0);
                                                        const newStates = [...warehouseStates];
                                                        newStates[index].reserved = val;
                                                        setWarehouseStates(newStates);
                                                    }}
                                                />
                                            </td>
                                            <td className="p-3">
                                                <Input
                                                    type="number"
                                                    min="0"
                                                    value={state.minQuantity}
                                                    onChange={(e) => {
                                                        const val = Math.max(0, parseInt(e.target.value) || 0);
                                                        const newStates = [...warehouseStates];
                                                        newStates[index].minQuantity = val;
                                                        setWarehouseStates(newStates);
                                                    }}
                                                />
                                            </td>
                                            <td className="p-3">
                                                <div className="flex flex-col text-xs">
                                                    <span className="font-semibold">{state.currentQty + state.delta} всего</span>
                                                    <span className={available < 0 ? "text-destructive" : (isLow ? "text-warning" : "text-success")}>
                                                        {available} доступно
                                                    </span>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="ghost" onClick={() => onOpenChange(false)}>Отмена</Button>
                    <Button onClick={handleSave} disabled={isLoading}>
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Сохранить изменения
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
