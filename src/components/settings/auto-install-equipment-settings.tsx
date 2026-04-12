"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { useProducts, useStoreAutoInstallEquipment } from "@/lib/hooks";
import { Loader2, PackageCheck, Save, Search } from "lucide-react";
import { toast } from "sonner";

export function AutoInstallEquipmentSettings() {
    const { data: products, isLoading: productsLoading } = useProducts();
    const { data: selectedProducts, isLoading: settingsLoading, refetch } = useStoreAutoInstallEquipment();
    const [search, setSearch] = useState("");
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        setSelectedIds(selectedProducts.map((product) => product.id));
    }, [selectedProducts]);

    const availableProducts = products
        .filter((product) => product.categoryId)
        .filter((product) => {
            if (!search.trim()) return true;
            const query = search.toLowerCase();
            return (
                product.name.toLowerCase().includes(query) ||
                product.sku.toLowerCase().includes(query) ||
                product.category?.name?.toLowerCase().includes(query)
            );
        })
        .sort((a, b) => {
            const categoryCompare = (a.category?.name || "").localeCompare(b.category?.name || "", "ru");
            if (categoryCompare !== 0) return categoryCompare;
            return a.name.localeCompare(b.name, "ru");
        });

    const toggleProduct = (productId: string) => {
        setSelectedIds((current) =>
            current.includes(productId)
                ? current.filter((id) => id !== productId)
                : [...current, productId],
        );
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await api.patch("/settings/store-auto-install-equipment", { productIds: selectedIds });
            await refetch();
            toast.success("Перечень автоустановки обновлен");
        } catch (error) {
            console.error(error);
            toast.error("Не удалось сохранить перечень автоустановки");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Card variant="elevated">
            <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <PackageCheck className="h-4 w-4 text-primary" />
                    </div>
                    Перечень оборудования автоустановки
                </CardTitle>
                <CardDescription>
                    Выбранные модели будут автоматически добавляться на новый магазин и при массовой загрузке новых магазинов.
                    Позиции создаются как legacy-оборудование без ШК и с меткой неподтвержденной установки.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex flex-col gap-3 sm:flex-row">
                    <div className="relative flex-1">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Поиск по модели, SKU или категории"
                            className="pl-9"
                        />
                    </div>
                    <Button onClick={handleSave} disabled={isSaving || productsLoading || settingsLoading}>
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Сохранить
                    </Button>
                </div>

                <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">Выбрано: {selectedIds.length}</Badge>
                    <Badge variant="outline">Модели берутся только из каталога с привязанной категорией</Badge>
                </div>

                {productsLoading || settingsLoading ? (
                    <div className="flex justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                ) : availableProducts.length === 0 ? (
                    <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                        Нет моделей для выбора
                    </div>
                ) : (
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                        {availableProducts.map((product) => {
                            const checked = selectedIds.includes(product.id);

                            return (
                                <div
                                    key={product.id}
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => toggleProduct(product.id)}
                                    onKeyDown={(event) => {
                                        if (event.key === "Enter" || event.key === " ") {
                                            event.preventDefault();
                                            toggleProduct(product.id);
                                        }
                                    }}
                                    className={`rounded-xl border p-4 text-left transition-all cursor-pointer ${
                                        checked
                                            ? "border-primary bg-primary/5 shadow-sm"
                                            : "border-border/60 hover:border-primary/40 hover:bg-accent/20"
                                    }`}
                                >
                                    <div className="flex items-start gap-3">
                                        <Checkbox
                                            checked={checked}
                                            onClick={(event) => event.stopPropagation()}
                                            onCheckedChange={() => toggleProduct(product.id)}
                                            className="mt-0.5 h-5 w-5"
                                        />
                                        <div className="min-w-0 space-y-2">
                                            <div className="space-y-1">
                                                <p className="font-medium leading-tight">{product.name}</p>
                                                <p className="text-xs text-muted-foreground font-mono">{product.sku}</p>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {product.category?.name && (
                                                    <Badge variant="outline">{product.category.name}</Badge>
                                                )}
                                                <Badge variant={product.accountingType === "QUANTITY" ? "secondary" : "default"}>
                                                    {product.accountingType === "QUANTITY" ? "Количество" : "Серийное"}
                                                </Badge>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
