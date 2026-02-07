"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useMemo } from "react";
import { useWarehouse, useProducts } from "@/lib/hooks";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, StatCard } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Warehouse, MapPin, Package, AlertTriangle, User as UserIcon, Store as StoreIcon, Activity } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { YandexMap } from "@/components/maps";

export default function WarehouseDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const id = params?.id as string;

    const [showAllCritical, setShowAllCritical] = useState(false);
    const [showAllSufficient, setShowAllSufficient] = useState(false);

    const { data: warehouse, isLoading, error } = useWarehouse(id);
    const { data: products } = useProducts();

    const categoryOrder = [
        "Сервер",
        "Маршрутизатор",
        "Коммутатор",
        "Фискальный регистратор",
        "Касса",
        "Денежный ящик",
        "Монитор для кассы",
        "Компьютер",
        "Монитор для ПК",
        "МФУ",
        "ТСД",
        "Термопринтер",
        "Точка WiFi",
        "Сканер"
    ];

    const productsMap = useMemo(() => {
        if (!products) return new Map();
        return new Map(products.map(p => [p.id, p]));
    }, [products]);

    const getCategoryIndex = (name: string) => {
        const index = categoryOrder.findIndex(cat => name.toLowerCase().includes(cat.toLowerCase()));
        return index === -1 ? 999 : index;
    };

    const criticalItems = useMemo(() => {
        if (!warehouse?.stockItems) return [];
        return warehouse.stockItems
            .filter(item => item.quantity <= item.minQuantity)
            .map(item => ({
                ...item,
                product: productsMap.get(item.productId) || item.product
            }))
            .sort((a, b) => {
                // First sort by quantity (ascending)
                if (a.quantity !== b.quantity) return a.quantity - b.quantity;

                // Then by category priority
                const catA = a.product?.category?.name || "";
                const catB = b.product?.category?.name || "";
                const indexA = getCategoryIndex(catA);
                const indexB = getCategoryIndex(catB);

                if (indexA !== indexB) return indexA - indexB;

                // Finally by product name
                return (a.product?.name || "").localeCompare(b.product?.name || "");
            });
    }, [warehouse, productsMap]);

    const sufficientItems = useMemo(() => {
        if (!warehouse?.stockItems) return [];
        return warehouse.stockItems
            .filter(item => item.quantity > item.minQuantity)
            .map(item => ({
                ...item,
                product: productsMap.get(item.productId) || item.product
            }))
            .sort((a, b) => {
                const catA = a.product?.category?.name || "";
                const catB = b.product?.category?.name || "";
                const indexA = getCategoryIndex(catA);
                const indexB = getCategoryIndex(catB);

                if (indexA !== indexB) return indexA - indexB;
                return (a.product?.name || "").localeCompare(b.product?.name || "");
            });
    }, [warehouse, productsMap]);

    const formatDate = (dateString: string) => {
        if (!dateString) return "";
        return new Date(dateString).toLocaleDateString('ru-RU', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const formatDateOnly = (dateString: string) => {
        if (!dateString) return "";
        return new Date(dateString).toLocaleDateString('ru-RU', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    };

    if (isLoading) {
        return (
            <div className="flex flex-1 items-center justify-center p-6">
                <div className="flex flex-col items-center gap-4">
                    <div className="h-12 w-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
                    <p className="text-muted-foreground">Загрузка информации о складе...</p>
                </div>
            </div>
        );
    }

    if (error || !warehouse) {
        return (
            <div className="flex flex-1 items-center justify-center p-6">
                <div className="flex flex-col items-center gap-4 max-w-md text-center">
                    <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center text-destructive mb-2">
                        <AlertTriangle className="h-6 w-6" />
                    </div>
                    <h2 className="text-xl font-bold">Ошибка загрузки</h2>
                    <p className="text-muted-foreground">Не удалось загрузить информацию о складе. Возможно, он был удален или у вас нет доступа.</p>
                    <Button onClick={() => router.back()} className="mt-4">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Вернуться назад
                    </Button>
                </div>
            </div>
        );
    }





    const visibleCriticalItems = showAllCritical ? criticalItems : criticalItems.slice(0, 4);
    const visibleSufficientItems = showAllSufficient ? sufficientItems : sufficientItems.slice(0, 4);

    return (
        <main className="flex-1 overflow-y-auto p-6">
            <div className="space-y-6 max-w-7xl mx-auto">
                {/* Header & Map Section */}
                <div className="grid gap-6 lg:grid-cols-3">
                    <Card className="lg:col-span-2 h-full border-none shadow-none bg-transparent">
                        <div className="flex flex-col justify-center h-full">
                            <div className="flex items-center gap-4 mb-6">
                                <Button variant="ghost" size="icon" onClick={() => router.back()}>
                                    <ArrowLeft className="h-4 w-4" />
                                </Button>
                                <div>
                                    <h1 className="text-2xl font-bold flex items-center gap-2">
                                        <Warehouse className="h-6 w-6 text-primary" />
                                        {warehouse.name}
                                    </h1>
                                    {warehouse.address && (
                                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1">
                                            <MapPin className="h-3.5 w-3.5" />
                                            {warehouse.address}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Stats Cards */}
                            <div className="grid gap-4 md:grid-cols-2">
                                <StatCard
                                    title="Всего позиций"
                                    value={warehouse.stats?.totalDetails?.toLocaleString() || "0"}
                                    icon={<Package className="h-5 w-5" />}
                                    status="default"
                                />
                                <StatCard
                                    title="Критические остатки"
                                    value={criticalItems.length.toString()}
                                    icon={<AlertTriangle className="h-5 w-5" />}
                                    status={criticalItems.length > 0 ? "danger" : "success"}
                                    subtitle={criticalItems.length > 0 ? "Требует пополнения" : "В норме"}
                                />
                            </div>
                        </div>
                    </Card>

                    {/* Map */}
                    <Card className="h-[250px] lg:h-full min-h-[200px] p-0 overflow-hidden relative border-none rounded-xl">
                        <div className="absolute inset-0">
                            <YandexMap
                                height="100%"
                                width="100%"
                                address={warehouse.address || 'Москва'}
                                placemarks={[]}
                            />
                        </div>
                    </Card>
                </div>

                {/* Stock Lists */}
                <div className="grid gap-6 lg:grid-cols-2">
                    {/* Critical Stock */}
                    <Card className="h-full border-red-500/20 bg-red-500/5">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-red-500">
                                <AlertTriangle className="h-5 w-5" />
                                Критические остатки
                            </CardTitle>
                            <CardDescription>Необходимо закупить ({criticalItems.length})</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {criticalItems.length === 0 ? (
                                    <p className="text-sm text-muted-foreground text-center py-8">Критических позиций нет</p>
                                ) : (
                                    <>
                                        {visibleCriticalItems.map((item) => (
                                            <div key={item.id} className="flex items-center justify-between p-3 rounded-lg bg-background/60 border border-red-200/20">
                                                <div className="flex items-center gap-3 min-w-0 flex-1 mr-4">
                                                    <div className="font-medium text-sm truncate max-w-[200px]" title={item.product?.name}>
                                                        {item.product?.name || "Неизвестный товар"}
                                                    </div>
                                                    <Badge variant="secondary" className="text-[10px] h-5 px-1.5 shrink-0 bg-muted-foreground/10 text-muted-foreground hover:bg-muted-foreground/20 font-normal">
                                                        {item.product?.category?.name || "Без категории"}
                                                    </Badge>
                                                    <div className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
                                                        Мин: <span className="font-medium text-foreground">{item.minQuantity}</span>
                                                    </div>
                                                </div>
                                                <div className="text-right shrink-0">
                                                    <Badge variant="destructive" className="font-mono">
                                                        {item.quantity} шт.
                                                    </Badge>
                                                </div>
                                            </div>
                                        ))}
                                        {criticalItems.length > 4 && (
                                            <Button
                                                variant="ghost"
                                                className="w-full text-xs text-muted-foreground hover:text-red-500"
                                                onClick={() => setShowAllCritical(!showAllCritical)}
                                            >
                                                {showAllCritical ? "Скрыть" : "ЕЩЕ"}
                                            </Button>
                                        )}
                                    </>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Sufficient Stock */}
                    <Card className="h-full border-green-500/20 bg-green-500/5">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-green-500">
                                <Package className="h-5 w-5" />
                                Достаточно на складе
                            </CardTitle>
                            <CardDescription>В наличии ({sufficientItems.length})</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {sufficientItems.length === 0 ? (
                                    <p className="text-sm text-muted-foreground text-center py-8">Нет данных</p>
                                ) : (
                                    <>
                                        {visibleSufficientItems.map((item) => (
                                            <div key={item.id} className="flex items-center justify-between p-3 rounded-lg bg-background/60 border border-green-200/20">
                                                <div className="flex items-center gap-3 min-w-0 flex-1 mr-4">
                                                    <div className="font-medium text-sm truncate max-w-[200px]" title={item.product?.name}>
                                                        {item.product?.name || "Неизвестный товар"}
                                                    </div>
                                                    <Badge variant="secondary" className="text-[10px] h-5 px-1.5 shrink-0 bg-muted-foreground/10 text-muted-foreground hover:bg-muted-foreground/20 font-normal">
                                                        {item.product?.category?.name || "Без категории"}
                                                    </Badge>
                                                    <div className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
                                                        Мин: <span className="font-medium text-foreground">{item.minQuantity}</span>
                                                    </div>
                                                </div>
                                                <div className="text-right shrink-0">
                                                    <Badge variant="outline" className="font-mono bg-green-500/10 text-green-600 border-green-500/30">
                                                        {item.quantity} шт.
                                                    </Badge>
                                                </div>
                                            </div>
                                        ))}
                                        {sufficientItems.length > 4 && (
                                            <Button
                                                variant="ghost"
                                                className="w-full text-xs text-muted-foreground hover:text-green-500"
                                                onClick={() => setShowAllSufficient(!showAllSufficient)}
                                            >
                                                {showAllSufficient ? "Скрыть" : "ЕЩЕ"}
                                            </Button>
                                        )}
                                    </>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                    {/* Recent Requests */}
                    <Card className="h-full">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <UserIcon className="h-5 w-5 text-blue-500" />
                                Последние заявки инженеров
                            </CardTitle>
                            <CardDescription>Кто запрашивал оборудование с этого склада</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {(!warehouse.recentRequests || warehouse.recentRequests.length === 0) ? (
                                    <p className="text-sm text-muted-foreground text-center py-8">Нет недавних заявок</p>
                                ) : (
                                    warehouse.recentRequests.map((req) => (
                                        <div key={req.id} className="flex items-center justify-between border-b last:border-0 pb-3 last:pb-0">
                                            <div className="flex items-center gap-3">
                                                <div className="h-8 w-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-600 font-semibold text-xs">
                                                    {req.engineer?.name?.[0] || "?"}
                                                </div>
                                                <div>
                                                    <div className="font-medium text-sm">{req.engineer?.name || "Неизвестный"}</div>
                                                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                                                        <StoreIcon className="h-3 w-3" />
                                                        {req.store?.name || "Без магазина"}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-sm font-semibold">{req.itemsCount} поз.</div>
                                                <div className="text-xs text-muted-foreground">
                                                    {formatDate(req.date)}
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Recent Installations */}
                    <Card className="h-full">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Activity className="h-5 w-5 text-green-500" />
                                Последние установки
                            </CardTitle>
                            <CardDescription>Установки оборудования в магазины</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {(!warehouse.recentInstallations || warehouse.recentInstallations.length === 0) ? (
                                    <p className="text-sm text-muted-foreground text-center py-8">Нет недавних установок</p>
                                ) : (
                                    warehouse.recentInstallations.map((inst) => (
                                        <div key={inst.id} className="flex items-start justify-between border-b last:border-0 pb-3 last:pb-0">
                                            <div>
                                                <div className="font-medium text-sm flex items-center gap-2">
                                                    <StoreIcon className="h-4 w-4 text-green-600" />
                                                    {inst.store?.name}
                                                </div>
                                                <div className="text-xs text-muted-foreground mt-1 max-w-[250px] truncate">
                                                    {inst.items.join(", ")}
                                                </div>
                                            </div>
                                            <div className="text-xs text-muted-foreground whitespace-nowrap">
                                                {formatDate(inst.date)}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* New Stores */}
                    <Card className="h-full lg:col-span-2">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <StoreIcon className="h-5 w-5 text-purple-500" />
                                Новые магазины
                            </CardTitle>
                            <CardDescription>Магазины, открытые при участии этого склада</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
                                {(!warehouse.newStores || warehouse.newStores.length === 0) ? (
                                    <div className="col-span-full text-center py-8 text-muted-foreground">
                                        Нет данных о новых магазинах
                                    </div>
                                ) : (
                                    warehouse.newStores.map((store) => (
                                        <div key={store.id} className="flex items-start gap-3 p-3 rounded-lg border bg-card/50 hover:bg-muted/50 transition-colors">
                                            <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0">
                                                <StoreIcon className="h-5 w-5 text-purple-600" />
                                            </div>
                                            <div className="min-w-0">
                                                <div className="font-medium text-sm truncate" title={store.name}>{store.name}</div>
                                                <div className="text-xs text-muted-foreground truncate" title={store.address}>{store.address}</div>
                                                <div className="flex items-center gap-2 mt-2 text-xs">
                                                    <Badge variant="outline" className="h-5 px-1.5 font-normal">
                                                        {formatDateOnly(store.createdAt)}
                                                    </Badge>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </main>
    );
}
