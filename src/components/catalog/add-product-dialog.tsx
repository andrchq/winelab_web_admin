"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";

interface AddProductDialogProps {
    onSuccess?: () => void;
}

import { useCategories } from "@/lib/hooks";

export function AddProductDialog({ onSuccess }: AddProductDialogProps) {
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        sku: "",
        category: "",
        description: ""
    });

    const { data: categories, isLoading: isCategoriesLoading } = useCategories();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            await api.post('/products', {
                ...formData,
                categoryId: formData.category // Send categoryId
            });
            toast.success("Модель добавлена");
            setOpen(false);
            setFormData({ name: "", sku: "", category: "", description: "" });
            onSuccess?.();
        } catch (error) {
            toast.error("Ошибка при создании модели");
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="gradient">
                    <Plus className="h-4 w-4" />
                    Добавить модель
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Новая модель</DialogTitle>
                    <DialogDescription>
                        Добавьте новую модель оборудования в справочник
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Название</Label>
                        <Input
                            id="name"
                            placeholder="Например, Роутер Mikrotik hAP ac2"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            required
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="sku">SKU / Код</Label>
                            <Input
                                id="sku"
                                placeholder="RTR-HAP-AC2"
                                value={formData.sku}
                                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="category">Категория</Label>
                            <Select
                                value={formData.category}
                                onValueChange={(value) => setFormData({ ...formData, category: value })}
                                required
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Выберите" />
                                </SelectTrigger>
                                <SelectContent className="max-h-[300px]">
                                    {categories?.map((cat) => (
                                        <SelectItem key={cat.id} value={cat.id}>
                                            <div className="flex items-center gap-2">
                                                <span>{cat.name}</span>
                                                {cat.isMandatory && (
                                                    <span className="text-xs text-muted-foreground">(Обязательное)</span>
                                                )}
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="description">Описание (необязательно)</Label>
                        <Input
                            id="description"
                            placeholder="Краткое описание характеристик"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        />
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                            Отмена
                        </Button>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading ? "Создание..." : "Создать"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
