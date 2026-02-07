"use client";

import { Truck, Filter, Package, Clock, MapPin, AlertCircle, CheckCircle2, Timer, User2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, StatCard } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useDeliveries } from "@/lib/hooks";

import Link from "next/link";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";

const statusMap: Record<string, { label: string; variant: "default" | "success" | "warning" | "destructive" | "secondary" | "info" }> = {
    CREATED: { label: "Создана", variant: "secondary" },
    COURIER_ASSIGNED: { label: "Курьер назначен", variant: "info" },
    PICKED_UP: { label: "Забрана", variant: "warning" },
    IN_TRANSIT: { label: "В пути", variant: "warning" },
    DELIVERED: { label: "Доставлена", variant: "success" },
    PROBLEM: { label: "Проблема", variant: "destructive" },
    CANCELLED: { label: "Отменена", variant: "destructive" },
};

export function DeliveriesTab() {
    const { data: deliveries, isLoading, error } = useDeliveries();
    const [search, setSearch] = useState("");

    // Compute stats
    const stats = useMemo(() => {
        const inTransit = deliveries.filter(d => ['IN_TRANSIT', 'PICKED_UP'].includes(d.status)).length;
        const delivered = deliveries.filter(d => d.status === 'DELIVERED').length;
        const problems = deliveries.filter(d => d.status === 'PROBLEM').length;
        const created = deliveries.filter(d => ['CREATED', 'COURIER_ASSIGNED'].includes(d.status)).length;
        return { inTransit, delivered, problems, created };
    }, [deliveries]);

    // Filter deliveries
    const filteredDeliveries = useMemo(() => {
        if (!search) return deliveries;
        const s = search.toLowerCase();
        return deliveries.filter(d =>
            d.id.toLowerCase().includes(s) ||
            d.store?.name?.toLowerCase().includes(s) ||
            d.externalId?.toLowerCase().includes(s)
        );
    }, [deliveries, search]);

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h2 className="text-lg font-semibold">Доставки оборудования</h2>
                    <p className="text-sm text-muted-foreground">Управление логистикой и курьерами</p>
                </div>
            </div>

            {/* Stats */}
            <div className="grid gap-4 md:grid-cols-4 animate-stagger">
                <StatCard
                    title="Ожидают"
                    value={stats.created.toString()}
                    icon={<Timer className="h-5 w-5" />}
                    status="accent"
                />
                <StatCard
                    title="В пути"
                    value={stats.inTransit.toString()}
                    icon={<Truck className="h-5 w-5" />}
                    status="warning"
                />
                <StatCard
                    title="Доставлено"
                    value={stats.delivered.toString()}
                    icon={<CheckCircle2 className="h-5 w-5" />}
                    status="success"
                />
                <StatCard
                    title="Проблемы"
                    value={stats.problems.toString()}
                    icon={<AlertCircle className="h-5 w-5" />}
                    status="danger"
                />
            </div>

            {/* Filters */}
            <Card>
                <CardContent className="p-4">
                    <div className="flex flex-wrap gap-4 items-center">
                        <div className="flex-1 min-w-[200px] max-w-md">
                            <SearchInput
                                placeholder="Поиск по номеру или магазину..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                        <Button variant="outline" size="sm">
                            <Filter className="h-4 w-4" />
                            Фильтры
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Deliveries List */}
            <Card variant="elevated">
                <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Truck className="h-4 w-4 text-primary" />
                        </div>
                        Список доставок ({filteredDeliveries.length})
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-12 gap-3">
                            <div className="h-12 w-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
                            <p className="text-muted-foreground">Загрузка доставок...</p>
                        </div>
                    ) : error ? (
                        <div className="flex flex-col items-center justify-center py-12 gap-3">
                            <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
                                <AlertCircle className="h-6 w-6 text-destructive" />
                            </div>
                            <p className="text-destructive font-medium">Ошибка загрузки: {error}</p>
                        </div>
                    ) : filteredDeliveries.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 gap-3">
                            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                                <Truck className="h-6 w-6 text-muted-foreground" />
                            </div>
                            <p className="text-muted-foreground">{search ? "Ничего не найдено" : "Нет доставок"}</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {filteredDeliveries.map((delivery, index) => (
                                <Link key={delivery.id} href={`/deliveries/${delivery.id}`}>
                                    <div
                                        className={cn(
                                            "flex items-center justify-between rounded-xl border border-border/50 p-4 transition-all hover:bg-muted/50 hover:border-primary/30 cursor-pointer group animate-fade-in"
                                        )}
                                        style={{ animationDelay: `${index * 30}ms` }}
                                    >
                                        <div className="flex items-start gap-4">
                                            <div className={cn(
                                                "flex h-12 w-12 items-center justify-center rounded-xl transition-colors",
                                                delivery.status === 'DELIVERED' && "bg-success/10 group-hover:bg-success/20",
                                                delivery.status === 'PROBLEM' && "bg-destructive/10 group-hover:bg-destructive/20",
                                                ['IN_TRANSIT', 'PICKED_UP'].includes(delivery.status) && "bg-warning/10 group-hover:bg-warning/20",
                                                ['CREATED', 'COURIER_ASSIGNED'].includes(delivery.status) && "bg-info/10 group-hover:bg-info/20"
                                            )}>
                                                <Truck className={cn(
                                                    "h-5 w-5",
                                                    delivery.status === 'DELIVERED' && "text-success",
                                                    delivery.status === 'PROBLEM' && "text-destructive",
                                                    ['IN_TRANSIT', 'PICKED_UP'].includes(delivery.status) && "text-warning",
                                                    ['CREATED', 'COURIER_ASSIGNED'].includes(delivery.status) && "text-info"
                                                )} />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <code className="text-xs font-medium bg-muted px-1.5 py-0.5 rounded">
                                                        {delivery.externalId || delivery.id.slice(0, 8)}
                                                    </code>
                                                    <Badge variant={statusMap[delivery.status]?.variant || "secondary"} dot size="sm">
                                                        {statusMap[delivery.status]?.label || delivery.status}
                                                    </Badge>
                                                </div>
                                                <div className="flex items-center gap-1.5 mt-1.5 text-sm">
                                                    <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                                                    <span className="font-medium group-hover:text-primary transition-colors">{delivery.store?.name}</span>
                                                    <span className="text-muted-foreground">—</span>
                                                    <span className="text-muted-foreground text-xs truncate max-w-[300px]">{delivery.store?.address}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-6 text-sm text-muted-foreground">
                                            <div className="flex items-center gap-1.5">
                                                <Package className="h-4 w-4" />
                                                <span>{delivery.shipment?._count?.items || 0} ед.</span>
                                            </div>
                                            {delivery.courierName && (
                                                <div className="flex items-center gap-1.5 hidden sm:flex">
                                                    <User2 className="h-4 w-4" />
                                                    <span>{delivery.courierName}</span>
                                                </div>
                                            )}
                                            <div className="flex items-center gap-1.5 hidden md:flex">
                                                <Clock className="h-4 w-4" />
                                                <span>{formatDate(delivery.createdAt)}</span>
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
