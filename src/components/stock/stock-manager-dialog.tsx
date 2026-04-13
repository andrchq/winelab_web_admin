
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Product, StockItem } from "@/types/api";
import { useWarehouses } from "@/lib/hooks";
import { useAuth } from "@/contexts/AuthContext";

interface StockManagerDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    product: Product | null;
    stockItems: StockItem[]; // All stock items for this product
    onSuccess: () => void;
}

export function StockManagerDialog({ open, onOpenChange, product, stockItems, onSuccess }: StockManagerDialogProps) {
    const { data: warehouses } = useWarehouses();
    const { hasPermission, hasRole } = useAuth();
    const [isLoading, setIsLoading] = useState(false);

    const canEditSettings = hasPermission(['STOCK_UPDATE']) || hasRole(['ADMIN', 'MANAGER', 'WAREHOUSE']);


    // Form State
    const [sku, setSku] = useState("");
    const [name, setName] = useState("");
    const [category, setCategory] = useState("");
    interface WarehouseState {
        id: string;
        name: string;
        currentQty: number;
        reserved: number;
        minQuantity: number;
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
                };
            });
            setWarehouseStates(states);
        }
    }, [open, product, warehouses, stockItems]);

    const handleSave = async () => {
        if (!product) return;
        setIsLoading(true);

        try {
            if (sku !== product.sku || name !== product.name) {
                await api.patch(`/products/${product.id}`, {
                    sku,
                    name
                });
            }

            await Promise.all(warehouseStates.map(async (state) => {
                const originalItem = stockItems.find((si) => si.warehouseId === state.id && si.source !== 'ASSET_AGGREGATE');
                const originalReserved = originalItem?.reserved || 0;
                const originalMin = originalItem?.minQuantity || 0;
                const hasReservedChange = state.reserved !== originalReserved;
                const hasMinChange = state.minQuantity !== originalMin;

                if (!hasReservedChange && !hasMinChange) return;

                if (originalItem) {
                    await api.patch(`/stock/${originalItem.id}`, {
                        reserved: state.reserved,
                        minQuantity: state.minQuantity
                    });
                } else {
                    if (state.minQuantity > 0) {
                        await api.post(`/stock`, {
                            productId: product.id,
                            warehouseId: state.id,
                            quantity: 0,
                            minQuantity: state.minQuantity
                        });
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
                        На этом экране можно менять только справочные параметры позиции и минимальный остаток. Фактическое количество и резерв формируются учетными операциями.
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
                                    <th className="p-3 text-left font-medium w-24">Резерв</th>
                                    <th className="p-3 text-left font-medium w-24">Мин. ост.</th>
                                    <th className="p-3 text-left font-medium w-24">Доступно</th>
                                </tr>
                            </thead>
                            <tbody>
                                {warehouseStates.map((state, index) => {
                                    const available = state.currentQty - state.reserved;

                                    return (
                                        <tr key={state.id} className="border-t">
                                            <td className="p-3 font-medium">{state.name}</td>
                                            <td className="p-3 text-muted-foreground">{state.currentQty}</td>
                                            <td className="p-3">
                                                <Input
                                                    type="number"
                                                    min="0"
                                                    value={state.reserved}
                                                    disabled={!canEditSettings}
                                                    className={!canEditSettings ? "bg-muted" : undefined}
                                                    onChange={(e) => {
                                                        const val = Math.max(0, parseInt(e.target.value) || 0);
                                                        const newStates = [...warehouseStates];
                                                        newStates[index].reserved = Math.min(val, state.currentQty);
                                                        setWarehouseStates(newStates);
                                                    }}
                                                />
                                            </td>
                                            <td className="p-3">
                                                <Input
                                                    type="number"
                                                    min="0"
                                                    value={state.minQuantity}
                                                    disabled={!canEditSettings}
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
                                                    <span className="font-semibold">{available}</span>
                                                    <span className={available < state.minQuantity ? "text-warning" : "text-success"}>
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
