"use client";

import { useState, useMemo } from "react";

import { Package, Filter, MoreHorizontal, Grid, List, Box, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useProducts } from "@/lib/hooks";
import { AddProductDialog } from "@/components/catalog/add-product-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Product } from "@/types/api";
import { api } from "@/lib/api";
import { toast } from "sonner";

const categoryColors: Record<string, string> = {
    "Сетевое": "bg-info/10 text-info",
    "Торговое": "bg-success/10 text-success",
    "Безопасность": "bg-warning/10 text-warning",
    "Компьютерное": "bg-primary/10 text-primary",
    "Периферия": "bg-secondary/10 text-secondary-foreground",
    "Расходные материалы": "bg-destructive/10 text-destructive",
};

export default function CatalogPage() {
    const { data: products, isLoading, refetch } = useProducts();
    const [search, setSearch] = useState("");
    const [deleteProduct, setDeleteProduct] = useState<Product | null>(null);

    const filteredProducts = useMemo(() => {
        if (!products) return [];
        if (!search) return products;
        const s = search.toLowerCase();
        return products.filter(p =>
            p.name.toLowerCase().includes(s) ||
            p.sku.toLowerCase().includes(s)
        );
    }, [products, search]);

    const confirmDelete = async () => {
        if (!deleteProduct) return;
        try {
            await api.delete(`/products/${deleteProduct.id}`);
            toast.success("Модель удалена");
            refetch();
            setDeleteProduct(null);
        } catch (error) {
            toast.error("Ошибка при удалении");
            console.error(error);
        }
    };

    return (
        <div className="p-6 h-full">
            <div className="space-y-6">
                {/* Page Header */}
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">Каталог оборудования</h1>
                        <p className="text-sm text-muted-foreground mt-1">Управление моделями и типами оборудования</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <AddProductDialog onSuccess={refetch} />
                    </div>
                </div>

                {/* Filters */}
                <Card>
                    <CardContent className="p-4">
                        <div className="flex flex-wrap gap-4 items-center">
                            <div className="flex-1 min-w-[200px] max-w-md">
                                <SearchInput
                                    placeholder="Поиск по названию или SKU..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <Button variant="outline" size="sm">
                                    <Filter className="h-4 w-4" />
                                    Фильтры
                                </Button>
                                <div className="h-6 w-px bg-border" />
                                <Button variant="ghost" size="icon-sm">
                                    <Grid className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon-sm">
                                    <List className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Products Table */}
                <Card variant="elevated">
                    <CardHeader className="pb-4">
                        <CardTitle className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                                <Package className="h-4 w-4 text-primary" />
                            </div>
                            Модели оборудования ({filteredProducts.length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center py-12 gap-3">
                                <div className="h-12 w-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
                                <p className="text-muted-foreground">Загрузка каталога...</p>
                            </div>
                        ) : filteredProducts.length === 0 ? (
                            <div className="text-center py-12 text-muted-foreground">
                                Модели не найдены
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Название</th>
                                            <th>SKU</th>
                                            <th>Категория</th>
                                            <th>На складе</th>
                                            <th>Резерв</th>
                                            <th>Доступно</th>
                                            <th></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredProducts.map((product, index) => {
                                            const available = product.stats?.available || 0;
                                            const stock = product.stats?.stock || 0;
                                            const reserved = product.stats?.reserved || 0;

                                            return (
                                                <tr
                                                    key={product.id}
                                                    className="animate-fade-in group"
                                                    style={{ animationDelay: `${index * 30}ms` }}
                                                >
                                                    <td>
                                                        <div className="flex items-center gap-3">
                                                            <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                                                                <Box className="h-5 w-5 text-muted-foreground" />
                                                            </div>
                                                            <span className="font-medium">{product.name}</span>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <code className="text-xs bg-muted px-2 py-1 rounded">
                                                            {product.sku}
                                                        </code>
                                                    </td>
                                                    <td>
                                                        <Badge variant="secondary" className={categoryColors[product.category] || "bg-secondary/10"}>
                                                            {product.category}
                                                        </Badge>
                                                    </td>
                                                    <td className="font-medium">{stock}</td>
                                                    <td className="text-warning">{reserved}</td>
                                                    <td>
                                                        <Badge variant={available > 0 ? "success" : "secondary"} dot>
                                                            {available}
                                                        </Badge>
                                                    </td>
                                                    <td>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon-sm"
                                                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                                                            onClick={() => setDeleteProduct(product)}
                                                        >
                                                            <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive transition-colors" />
                                                        </Button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            <Dialog open={!!deleteProduct} onOpenChange={(open) => !open && setDeleteProduct(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Удалить модель?</DialogTitle>
                        <DialogDescription>
                            Вы уверены, что хотите удалить модель
                            <span className="font-bold text-foreground mx-1">
                                {deleteProduct?.name}
                            </span>?
                            <br />
                            Это действие пометит модель как неактивную.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setDeleteProduct(null)}>
                            Отмена
                        </Button>
                        <Button variant="destructive" onClick={confirmDelete}>
                            Удалить
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
