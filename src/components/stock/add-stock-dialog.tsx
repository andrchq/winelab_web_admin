"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useProducts, useWarehouses } from "@/lib/hooks";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface AddStockDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

export function AddStockDialog({ open, onOpenChange, onSuccess }: AddStockDialogProps) {
    const { data: products } = useProducts();
    const { data: warehouses } = useWarehouses();
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        productId: "",
        warehouseId: "",
        quantity: "0",
        minQuantity: "0"
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            await api.post('/stock', {
                productId: formData.productId,
                warehouseId: formData.warehouseId,
                quantity: parseInt(formData.quantity) || 0,
                minQuantity: parseInt(formData.minQuantity) || 0
            });
            toast.success("Позиция добавлена");
            onSuccess();
            onOpenChange(false);
            setFormData({ productId: "", warehouseId: "", quantity: "0", minQuantity: "0" });
        } catch (error) {
            toast.error("Ошибка при создании позиции");
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Добавить позицию на склад</DialogTitle>
                    <DialogDescription>
                        Привяжите продукт к складу для начала учета остатков.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label>Товар</Label>
                        <Select
                            value={formData.productId}
                            onValueChange={(value: string) => setFormData({ ...formData, productId: value })}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Выберите товар" />
                            </SelectTrigger>
                            <SelectContent>
                                {products?.map((product) => (
                                    <SelectItem key={product.id} value={product.id}>
                                        {product.name} ({product.sku})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Склад</Label>
                        <Select
                            value={formData.warehouseId}
                            onValueChange={(value: string) => setFormData({ ...formData, warehouseId: value })}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Выберите склад" />
                            </SelectTrigger>
                            <SelectContent>
                                {warehouses?.map((warehouse) => (
                                    <SelectItem key={warehouse.id} value={warehouse.id}>
                                        {warehouse.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Начальное кол-во</Label>
                            <Input
                                type="number"
                                value={formData.quantity}
                                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Минимальный остаток</Label>
                            <Input
                                type="number"
                                value={formData.minQuantity}
                                onChange={(e) => setFormData({ ...formData, minQuantity: e.target.value })}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                            Отмена
                        </Button>
                        <Button type="submit" disabled={isLoading || !formData.productId || !formData.warehouseId}>
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Создать
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
