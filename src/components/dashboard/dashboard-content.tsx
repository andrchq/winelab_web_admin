"use client";

import {
    Package,
    Boxes,
    Truck,
    Clock,
    MapPin,
    ClipboardList,
    BarChart3,
    Store,
    ArrowUpRight,
    Activity,
    AlertTriangle,
    ArrowRight,
    CheckCircle2,
    XCircle
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, StatCard } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useDashboardMetrics } from "@/lib/hooks/use-dashboard-metrics";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { CustomAreaChart } from "@/components/charts";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

export function DashboardContent() {
    const router = useRouter();
    const metrics = useDashboardMetrics();

    if (metrics.isLoading) {
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

    const { totals, activity, recentActivity, actionRequired } = metrics;

    const statCards = [
        {
            title: "Всего оборудования",
            value: totals.assets.toLocaleString(),
            trend: { value: totals.assetsTrend, label: "за месяц" },
            icon: <Boxes className="h-5 w-5" />,
            status: "success" as const,
            href: "/assets"
        },
        {
            title: "Активные заявки",
            value: totals.activeRequests.toLocaleString(),
            trend: { value: totals.requestsTrend, label: "новых" },
            icon: <ClipboardList className="h-5 w-5" />,
            status: (totals.activeRequests > 10 ? "warning" : "default") as any,
            href: "/requests"
        },
        {
            title: "В сборке / пути",
            value: totals.pendingShipments.toLocaleString(),
            trend: { value: totals.shipmentsTrend, label: "за неделю" },
            icon: <Truck className="h-5 w-5" />,
            status: "info" as const, // Changed to info/blue
            href: "/shipments"
        },
        {
            title: "Критические остатки",
            value: totals.lowStockItems.toLocaleString(),
            trend: { value: 0, label: "позиций" },
            icon: <AlertTriangle className="h-5 w-5" />,
            status: (totals.lowStockItems > 0 ? "destructive" : "secondary") as any,
            href: "/stock?filter=low" // Link with filter to Stock page
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
                        <span className="text-sm font-medium text-muted-foreground mr-2">
                            {new Date().toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })}
                        </span>
                        <Button variant="gradient" size="sm" onClick={() => router.push('/requests')}>
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
                                className="h-full cursor-pointer hover:border-primary/50 transition-colors"
                            />
                        </Link>
                    ))}
                </div>

                {/* Main Content Grid */}
                <div className="grid gap-6 lg:grid-cols-3">

                    {/* Activity Chart (Left 2/3) */}
                    <Card variant="elevated" className="lg:col-span-2">
                        <CardHeader className="pb-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="flex items-center gap-2">
                                        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                                            <BarChart3 className="h-4 w-4 text-primary" />
                                        </div>
                                        Активность за 7 дней
                                    </CardTitle>
                                    <CardDescription className="mt-1">Сравнение: Заявки (Вход) vs Отгрузки (Выход)</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <CustomAreaChart
                                data={activity.map(a => ({
                                    name: a.date,
                                    value: a.requests,
                                    value2: a.shipments
                                }))}
                                color="#8b5cf6" // Requests (Purple)
                                color2="#3b82f6" // Shipments (Blue)
                                height={280}
                                gradientId="activity"
                                tooltipLabels={{
                                    value: "Заявки",
                                    value2: "Отгрузки"
                                }}
                            />
                            <div className="flex items-center justify-center gap-6 mt-4 text-sm font-medium">
                                <div className="flex items-center gap-2">
                                    <div className="h-3 w-3 rounded-full bg-violet-500" />
                                    <span>Создано заявок</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="h-3 w-3 rounded-full bg-blue-500" />
                                    <span>Выполнено отгрузок</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Action Required / Notifications (Right 1/3) */}
                    <Card className={cn(
                        "flex flex-col h-full border-l-4 transition-colors",
                        actionRequired.length > 0 ? "border-l-warning/50" : "border-l-success/50"
                    )}>
                        <CardHeader>
                            <CardTitle className={cn(
                                "flex items-center gap-2 transition-colors",
                                actionRequired.length > 0 ? "text-warning" : "text-success"
                            )}>
                                {actionRequired.length > 0 ? (
                                    <>
                                        <AlertTriangle className="h-5 w-5" />
                                        Требует внимания
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle2 className="h-5 w-5" />
                                        Все отлично
                                    </>
                                )}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="flex-1 overflow-y-auto pr-2 space-y-3">
                            {actionRequired.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-muted-foreground opacity-70">
                                    <p>Все чисто!</p>
                                    <p className="text-xs">Нет срочных задач</p>
                                </div>
                            ) : (
                                actionRequired.map((action) => (
                                    <Link key={action.id} href={action.href}>
                                        <div className="p-3 rounded-lg bg-warning/5 border border-warning/20 hover:bg-warning/10 transition-colors cursor-pointer group relative">
                                            {/* Pulse effect */}
                                            <span className="absolute inset-0 rounded-lg border-2 border-warning/20 animate-pulse opacity-50 pointer-events-none"></span>

                                            <h4 className="font-semibold text-sm group-hover:text-warning transition-colors">{action.title}</h4>
                                            <p className="text-xs text-muted-foreground mt-1">{action.description}</p>
                                        </div>
                                    </Link>
                                ))
                            )}
                        </CardContent>
                    </Card>

                </div>

                {/* Recent Transactions / Feed */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                            <Activity className="h-5 w-5 text-muted-foreground" />
                            Лента событий
                        </CardTitle>
                        <Link href="/analytics">
                            <Button variant="ghost" size="sm" className="gap-1">
                                Вся аналитика <ArrowRight className="h-4 w-4" />
                            </Button>
                        </Link>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {recentActivity.map((item, index) => (
                                <Link key={`${item.type}-${item.id}`} href={item.href}>
                                    <div
                                        className="flex items-center justify-between p-3 rounded-xl border border-border/40 hover:bg-muted/30 transition-all cursor-pointer group animate-fade-in"
                                        style={{ animationDelay: `${index * 50}ms` }}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className={cn(
                                                "h-10 w-10 rounded-full flex items-center justify-center shrink-0 border",
                                                item.type === 'request' && "bg-violet-500/10 text-violet-500 border-violet-200/20",
                                                item.type === 'shipment' && "bg-blue-500/10 text-blue-500 border-blue-200/20",
                                                item.type === 'receipt' && "bg-green-500/10 text-green-500 border-green-200/20",
                                            )}>
                                                {item.type === 'request' && <ClipboardList className="h-5 w-5" />}
                                                {item.type === 'shipment' && <Truck className="h-5 w-5" />}
                                                {item.type === 'receipt' && <Package className="h-5 w-5" />}
                                            </div>
                                            <div>
                                                <p className="font-medium text-sm text-foreground group-hover:text-primary transition-colors">
                                                    {item.title}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {item.subtitle} • {item.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            <Badge variant="outline" className="text-xs font-normal">
                                                {item.status}
                                            </Badge>
                                            <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </div>
                                    </div>
                                </Link>
                            ))}
                            {recentActivity.length === 0 && (
                                <div className="text-center py-6 text-muted-foreground">
                                    Нет недавних событий
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </ProtectedRoute>
    );
}
