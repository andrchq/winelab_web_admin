"use client";

import {
    Package,
    Boxes,
    Truck,
    TrendingUp,
    TrendingDown,
    Clock,
    CheckCircle2,
    MapPin,
    Loader2,
    ClipboardList,
    BarChart3,
    PieChart,
    Store,
    ArrowUpRight,
    Activity,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, StatCard } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useDashboardStats } from "@/lib/hooks";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { CustomAreaChart, CustomPieChart, CustomBarChart } from "@/components/charts";
import Link from "next/link";
import { useMemo } from "react";
import { cn } from "@/lib/utils";

const statusMap: Record<string, { label: string; variant: "default" | "success" | "warning" | "destructive" | "secondary" }> = {
    CREATED: { label: "Создана", variant: "secondary" },
    IN_TRANSIT: { label: "В пути", variant: "warning" },
    DELIVERED: { label: "Доставлена", variant: "success" },
    NEW: { label: "Новая", variant: "default" },
    IN_PROGRESS: { label: "В работе", variant: "warning" },
    COMPLETED: { label: "Выполнена", variant: "success" },
};

export function DashboardContent() {
    const { data: stats, isLoading, error } = useDashboardStats();

    // Generate mock trend data based on current stats
    const trendData = useMemo(() => {
        const baseAssets = stats?.totals?.assets || 100;
        const days = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
        return days.map((name, i) => ({
            name,
            value: Math.round(baseAssets * (0.85 + Math.random() * 0.3)),
            value2: Math.round((stats?.totals?.deliveries || 10) * (0.7 + Math.random() * 0.6))
        }));
    }, [stats]);

    // Asset condition distribution
    const conditionData = useMemo(() => {
        const byCondition = stats?.assets?.byCondition || {};
        return [
            { name: 'Новое', value: byCondition.NEW || 0, color: '#10b981' },
            { name: 'Хорошее', value: byCondition.GOOD || 0, color: '#3b82f6' },
            { name: 'Среднее', value: byCondition.FAIR || 0, color: '#f59e0b' },
            { name: 'Ремонт', value: byCondition.REPAIR || 0, color: '#ef4444' },
        ].filter(item => item.value > 0);
    }, [stats]);

    // Request status data
    const requestData = useMemo(() => {
        const byStatus = stats?.requests?.byStatus || {};
        return [
            { name: 'Новые', value: byStatus.NEW || 0, color: '#8b5cf6' },
            { name: 'В работе', value: byStatus.IN_PROGRESS || 0, color: '#f59e0b' },
            { name: 'Ожидает', value: byStatus.PENDING || 0, color: '#6b7280' },
            { name: 'Готово', value: byStatus.COMPLETED || 0, color: '#10b981' },
        ].filter(item => item.value > 0);
    }, [stats]);

    // Delivery status data  
    const deliveryData = useMemo(() => {
        const byStatus = stats?.deliveries?.byStatus || {};
        return [
            { name: 'Создана', value: byStatus.CREATED || 0, color: '#6b7280' },
            { name: 'В пути', value: byStatus.IN_TRANSIT || 0, color: '#3b82f6' },
            { name: 'Доставлена', value: byStatus.DELIVERED || 0, color: '#10b981' },
        ].filter(item => item.value > 0);
    }, [stats]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-24">
                <div className="flex flex-col items-center gap-4">
                    <div className="relative">
                        <div className="h-16 w-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
                        <Activity className="h-6 w-6 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                    </div>
                    <p className="text-muted-foreground animate-pulse">Загрузка данных...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
                <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
                    <span className="text-3xl">⚠️</span>
                </div>
                <p className="text-destructive font-medium">Ошибка загрузки данных</p>
                <p className="text-sm text-muted-foreground">{error}</p>
            </div>
        );
    }

    const totals = stats?.totals || { assets: 0, stores: 0, requests: 0, deliveries: 0 };
    const assetStats = stats?.assets || { byCondition: {}, byProcess: {} };
    const requestStats = stats?.requests || { byStatus: {}, recent: [] };
    const deliveryStats = stats?.deliveries || { byStatus: {}, recent: [] };

    const statCards = [
        {
            title: "Всего оборудования",
            value: totals.assets.toLocaleString(),
            trend: { value: 12, label: "за месяц" },
            icon: <Boxes className="h-5 w-5" />,
            status: "success" as const,
            href: "/assets"
        },
        {
            title: "Магазины",
            value: totals.stores.toLocaleString(),
            trend: { value: 3, label: "новых" },
            icon: <Store className="h-5 w-5" />,
            status: "accent" as const,
            href: "/stores"
        },
        {
            title: "Активные заявки",
            value: totals.requests.toLocaleString(),
            trend: { value: -5, label: "за неделю" },
            icon: <ClipboardList className="h-5 w-5" />,
            status: "warning" as const,
            href: "/requests"
        },
        {
            title: "Доставки",
            value: totals.deliveries.toLocaleString(),
            trend: { value: 8, label: "за неделю" },
            icon: <Truck className="h-5 w-5" />,
            status: "default" as const,
            href: "/deliveries"
        },
    ];

    return (
        <ProtectedRoute>
            <div className="space-y-6">
                {/* Page Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">Дашборд</h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            Обзор состояния оборудования и логистики
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm">
                            <Clock className="h-4 w-4 mr-2" />
                            Сегодня
                        </Button>
                        <Button variant="gradient" size="sm">
                            <Package className="h-4 w-4 mr-2" />
                            Новая заявка
                        </Button>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 animate-stagger">
                    {statCards.map((stat) => (
                        <Link key={stat.title} href={stat.href}>
                            <StatCard
                                title={stat.title}
                                value={stat.value}
                                trend={stat.trend}
                                icon={stat.icon}
                                status={stat.status}
                                className="h-full cursor-pointer"
                            />
                        </Link>
                    ))}
                </div>

                {/* Charts Row */}
                <div className="grid gap-6 lg:grid-cols-3">
                    {/* Activity Chart */}
                    <Card variant="elevated" className="lg:col-span-2">
                        <CardHeader className="pb-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="flex items-center gap-2">
                                        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                                            <BarChart3 className="h-4 w-4 text-primary" />
                                        </div>
                                        Активность за неделю
                                    </CardTitle>
                                    <CardDescription className="mt-1">Оборудование и доставки</CardDescription>
                                </div>
                                <div className="flex items-center gap-4 text-xs">
                                    <div className="flex items-center gap-1.5">
                                        <div className="h-2.5 w-2.5 rounded-full bg-primary" />
                                        <span className="text-muted-foreground">Оборудование</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <div className="h-2.5 w-2.5 rounded-full bg-info" />
                                        <span className="text-muted-foreground">Доставки</span>
                                    </div>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <CustomAreaChart
                                data={trendData}
                                color="#10b981"
                                color2="#8b5cf6"
                                height={250}
                                gradientId="weeklyActivity"
                            />
                        </CardContent>
                    </Card>

                    {/* Asset Condition Pie */}
                    <Card variant="elevated">
                        <CardHeader className="pb-4">
                            <CardTitle className="flex items-center gap-2">
                                <div className="h-8 w-8 rounded-lg bg-accent/10 flex items-center justify-center">
                                    <PieChart className="h-4 w-4 text-accent" />
                                </div>
                                Состояние активов
                            </CardTitle>
                            <CardDescription>По категориям качества</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {conditionData.length > 0 ? (
                                <CustomPieChart data={conditionData} height={220} />
                            ) : (
                                <div className="flex items-center justify-center h-[220px] text-muted-foreground">
                                    Нет данных
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Status Charts Row */}
                <div className="grid gap-6 md:grid-cols-2">
                    {/* Request Status */}
                    <Card>
                        <CardHeader className="pb-4">
                            <CardTitle className="flex items-center gap-2">
                                <div className="h-8 w-8 rounded-lg bg-warning/10 flex items-center justify-center">
                                    <ClipboardList className="h-4 w-4 text-warning" />
                                </div>
                                Статусы заявок
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {requestData.length > 0 ? (
                                <CustomBarChart data={requestData} height={180} horizontal />
                            ) : (
                                <div className="flex items-center justify-center h-[180px] text-muted-foreground">
                                    Нет данных
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Delivery Status */}
                    <Card>
                        <CardHeader className="pb-4">
                            <CardTitle className="flex items-center gap-2">
                                <div className="h-8 w-8 rounded-lg bg-info/10 flex items-center justify-center">
                                    <Truck className="h-4 w-4 text-info" />
                                </div>
                                Статусы доставок
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {deliveryData.length > 0 ? (
                                <CustomBarChart data={deliveryData} height={180} horizontal />
                            ) : (
                                <div className="flex items-center justify-center h-[180px] text-muted-foreground">
                                    Нет данных
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Main Content Grid */}
                <div className="grid gap-6 lg:grid-cols-3">
                    {/* Recent Deliveries */}
                    <Card className="lg:col-span-2">
                        <CardHeader className="flex flex-row items-center justify-between pb-4">
                            <div>
                                <CardTitle>Последние доставки</CardTitle>
                                <CardDescription>Статус активных доставок</CardDescription>
                            </div>
                            <Link href="/deliveries">
                                <Button variant="ghost" size="sm" className="gap-1">
                                    Все доставки
                                    <ArrowUpRight className="h-4 w-4" />
                                </Button>
                            </Link>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {deliveryStats.recent?.length === 0 ? (
                                    <div className="text-center py-8 text-muted-foreground">
                                        <Truck className="h-12 w-12 mx-auto mb-3 opacity-20" />
                                        <p>Нет активных доставок</p>
                                    </div>
                                ) : (
                                    deliveryStats.recent?.map((delivery: any, index: number) => (
                                        <Link key={delivery.id} href={`/deliveries/${delivery.id}`}>
                                            <div
                                                className={cn(
                                                    "flex items-center justify-between rounded-xl border border-border/50 p-4 transition-all hover:bg-muted/50 hover:border-primary/30 cursor-pointer group",
                                                    "animate-fade-in"
                                                )}
                                                style={{ animationDelay: `${index * 50}ms` }}
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-info/10 group-hover:bg-info/20 transition-colors">
                                                        <MapPin className="h-5 w-5 text-info" />
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-sm">{delivery.store?.name}</p>
                                                        <p className="text-xs text-muted-foreground">
                                                            ID: {delivery.id.slice(0, 8)}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <Badge variant={statusMap[delivery.status]?.variant || "secondary"} dot>
                                                        {statusMap[delivery.status]?.label || delivery.status}
                                                    </Badge>
                                                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                                        <Clock className="h-3.5 w-3.5" />
                                                        {new Date(delivery.createdAt).toLocaleDateString('ru-RU')}
                                                    </div>
                                                </div>
                                            </div>
                                        </Link>
                                    ))
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Recent Requests */}
                    <Card>
                        <CardHeader className="pb-4">
                            <CardTitle className="flex items-center gap-2">
                                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                                    <ClipboardList className="h-4 w-4 text-primary" />
                                </div>
                                Последние заявки
                            </CardTitle>
                            <CardDescription>
                                Новые заявки на оборудование
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                {requestStats.recent?.length === 0 ? (
                                    <div className="text-center py-8 text-muted-foreground">
                                        <ClipboardList className="h-12 w-12 mx-auto mb-3 opacity-20" />
                                        <p>Нет заявок</p>
                                    </div>
                                ) : (
                                    requestStats.recent?.map((request: any, index: number) => (
                                        <Link key={request.id} href={`/requests/${request.id}`}>
                                            <div
                                                className="flex items-center justify-between rounded-lg bg-muted/30 border border-transparent p-3 cursor-pointer hover:bg-muted/50 hover:border-border/50 transition-all animate-fade-in"
                                                style={{ animationDelay: `${index * 50}ms` }}
                                            >
                                                <div className="min-w-0 flex-1">
                                                    <p className="font-medium text-sm truncate">{request.title}</p>
                                                    <p className="text-xs text-muted-foreground truncate">{request.store?.name}</p>
                                                </div>
                                                <Badge variant={statusMap[request.status]?.variant || "secondary"} size="sm" dot>
                                                    {statusMap[request.status]?.label || request.status}
                                                </Badge>
                                            </div>
                                        </Link>
                                    ))
                                )}
                            </div>
                            <Link href="/requests">
                                <Button variant="outline" className="w-full mt-4 gap-2">
                                    Все заявки
                                    <ArrowUpRight className="h-4 w-4" />
                                </Button>
                            </Link>
                        </CardContent>
                    </Card>
                </div>

                {/* Quick Actions */}
                <Card>
                    <CardHeader className="pb-4">
                        <CardTitle>Быстрые действия</CardTitle>
                        <CardDescription>Часто используемые операции</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                            <Link href="/requests">
                                <Button variant="gradient" className="h-auto flex-col gap-3 py-5 w-full group">
                                    <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                                        <Package className="h-5 w-5" />
                                    </div>
                                    <span>Новая заявка</span>
                                </Button>
                            </Link>
                            <Link href="/shipments">
                                <Button variant="outline" className="h-auto flex-col gap-3 py-5 w-full group hover:border-primary/50">
                                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                                        <Truck className="h-5 w-5 text-primary" />
                                    </div>
                                    <span>Создать отгрузку</span>
                                </Button>
                            </Link>
                            <Link href="/assets">
                                <Button variant="outline" className="h-auto flex-col gap-3 py-5 w-full group hover:border-primary/50">
                                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                                        <Boxes className="h-5 w-5 text-primary" />
                                    </div>
                                    <span>Оборудование</span>
                                </Button>
                            </Link>
                            <Link href="/stores">
                                <Button variant="outline" className="h-auto flex-col gap-3 py-5 w-full group hover:border-primary/50">
                                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                                        <Store className="h-5 w-5 text-primary" />
                                    </div>
                                    <span>Магазины</span>
                                </Button>
                            </Link>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </ProtectedRoute>
    );
}
