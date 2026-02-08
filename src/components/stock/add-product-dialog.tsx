"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Pencil, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

interface AddProductDialogProps {
    onSuccess?: () => void;
}

import { useCategories, useProducts } from "@/lib/hooks";
import type { Product } from "@/types/api";

export function AddProductDialog({ onSuccess }: AddProductDialogProps) {
    const { hasRole } = useAuth();
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [search, setSearch] = useState("");
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [formData, setFormData] = useState({
        name: "",
        sku: "",
        category: "",
        description: ""
    });

    const { data: categories } = useCategories();
    const { data: products, refetch: refreshProducts } = useProducts();

    const canManageModels = hasRole(['ADMIN', 'MANAGER', 'WAREHOUSE']);

    const filteredProducts = products?.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.sku.toLowerCase().includes(search.toLowerCase())
    ) || [];

    const resetForm = () => {
        setFormData({ name: "", sku: "", category: "", description: "" });
        setEditingProduct(null);
    };

    const handleEdit = (product: Product) => {
        setEditingProduct(product);
        setFormData({
            name: product.name,
            sku: product.sku,
            category: product.category?.id || "",
            description: product.description || ""
        });
    };

    const handleDelete = async (productId: string) => {
        if (!confirm("Удалить эту модель?")) return;

        try {
            await api.delete(`/products/${productId}`);
            toast.success("Модель удалена");
            refreshProducts();
            onSuccess?.();
        } catch (error) {
            toast.error("Ошибка при удалении модели");
            console.error(error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            if (editingProduct) {
                await api.patch(`/products/${editingProduct.id}`, {
                    ...formData,
                    categoryId: formData.category
                });
                toast.success("Модель обновлена");
            } else {
                await api.post('/products', {
                    ...formData,
                    categoryId: formData.category
                });
                toast.success("Модель добавлена");
            }
            setOpen(false);
            resetForm();
            setSearch("");
            refreshProducts();
            onSuccess?.();
        } catch (error) {
            toast.error(editingProduct ? "Ошибка при обновлении модели" : "Ошибка при создании модели");
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
                    Управление моделями
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle>Справочник моделей</DialogTitle>
                    <DialogDescription>
                        Проверьте наличие модели в списке перед созданием новой
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
                    {/* Left Column: List */}
                    <div className="flex flex-col gap-3 min-h-[300px] md:border-r md:pr-6">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
                            <Input
                                placeholder="Поиск модели..."
                                className="pl-9 focus-visible:ring-1 focus-visible:ring-offset-0"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-2">
                            {filteredProducts.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground text-sm">
                                    {search ? "Ничего не найдено" : "Список пуст"}
                                </div>
                            ) : (
                                filteredProducts.map(product => (
                                    <div key={product.id} className="p-3 rounded-lg border bg-muted/30 text-sm hover:bg-muted/50 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="flex-1 min-w-0">
                                                <div className="font-medium truncate">{product.name}</div>
                                                <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                                                    <span className="bg-muted px-1.5 py-0.5 rounded border">{product.sku}</span>
                                                    <span className="bg-muted/50 px-1.5 py-0.5 rounded border">{product.category?.name}</span>
                                                </div>
                                            </div>
                                            {canManageModels && (
                                                <div className="flex items-center gap-1 shrink-0">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8"
                                                        onClick={() => handleEdit(product)}
                                                        title="Редактировать"
                                                    >
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-destructive hover:text-destructive"
                                                        onClick={() => handleDelete(product.id)}
                                                        title="Удалить"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Right Column: Create/Edit Form */}
                    <div className="flex flex-col gap-4 overflow-y-auto">
                        <div className="flex items-center justify-between h-10 px-3 rounded-lg border bg-background">
                            <div className="font-semibold flex items-center gap-2 text-primary text-sm">
                                {editingProduct ? (
                                    <>
                                        <Pencil className="h-4 w-4" />
                                        Редактирование
                                    </>
                                ) : (
                                    <>
                                        <Plus className="h-4 w-4" />
                                        Добавление новой модели
                                    </>
                                )}
                            </div>
                            {editingProduct && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={resetForm}
                                    className="h-6 px-2 text-xs"
                                >
                                    Отмена
                                </Button>
                            )}
                        </div>

                        <form id="create-product-form" onSubmit={handleSubmit} className="space-y-4">
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
                                        <SelectContent className="max-h-[200px]">
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
                        </form>
                    </div>
                </div>

                <DialogFooter>
                    <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                        Отмена
                    </Button>
                    <Button type="submit" form="create-product-form" disabled={isLoading}>
                        {isLoading
                            ? (editingProduct ? "Сохранение..." : "Создание...")
                            : (editingProduct ? "Сохранить" : "Создать")
                        }
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
