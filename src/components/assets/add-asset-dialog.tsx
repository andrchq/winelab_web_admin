"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Loader2 } from "lucide-react";
import { useProducts, useAssets } from "@/lib/hooks";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const CONDITIONS = [
    { value: "WORKING", label: "Рабочее" },
    { value: "NEEDS_REPAIR", label: "Требует ремонта" },
    { value: "IN_REPAIR", label: "В ремонте" },
    { value: "BROKEN", label: "Сломано" },
    { value: "DECOMMISSIONED", label: "Списано" },
] as const;

export function AddAssetDialog() {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const { data: products } = useProducts();
    const { refetch } = useAssets();

    const [formData, setFormData] = useState({
        serialNumber: "",
        productId: "",
        condition: "WORKING",
        warehouseId: "main-warehouse", // Hardcoded from seed
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.serialNumber || !formData.productId) {
            toast.error("Заполните обязательные поля");
            return;
        }

        setLoading(true);
        try {
            await api.post("/assets", {
                ...formData,
                warehouseId: formData.warehouseId
            });

            toast.success("Оборудование добавлено");
            setOpen(false);
            setFormData({
                serialNumber: "",
                productId: "",
                condition: "WORKING",
                warehouseId: "main-warehouse",
            });
            // We do not need to manually refetch if socket works, but good practice to have as fallback or optimistic
            // actually socket update should handle it.

        } catch (error: any) {
            toast.error(error.message || "Ошибка при создании оборудования");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="gradient">
                    <Plus className="h-4 w-4" />
                    Добавить актив
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Добавление оборудования</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="serialNumber">Серийный номер *</Label>
                        <Input
                            id="serialNumber"
                            value={formData.serialNumber}
                            onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
                            placeholder="SN-12345678"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="product">Модель оборудования *</Label>
                        <Select
                            value={formData.productId}
                            onValueChange={(value) => setFormData({ ...formData, productId: value })}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Выберите модель" />
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
                        <Label htmlFor="condition">Состояние</Label>
                        <Select
                            value={formData.condition}
                            onValueChange={(value) => setFormData({ ...formData, condition: value })}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Выберите состояние" />
                            </SelectTrigger>
                            <SelectContent>
                                {CONDITIONS.map((c) => (
                                    <SelectItem key={c.value} value={c.value}>
                                        {c.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex justify-end pt-4">
                        <Button type="submit" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Создать
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
