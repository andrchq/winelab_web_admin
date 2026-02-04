
import { Truck, Plus, Filter, Package, CheckCircle2, Clock, ArrowRight, Warehouse, Send, PackageCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, StatCard } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const shipments = [
    {
        id: "SHP-2024-0089",
        request: "REQ-2024-0142",
        destination: "Магазин #42 - ТЦ Мега",
        warehouse: "Склад А",
        status: "PICKING",
        items: 3,
        picker: "Кладовщик Петров",
        createdAt: "2024-01-27 11:00"
    },
    {
        id: "SHP-2024-0088",
        request: "REQ-2024-0139",
        destination: "Магазин #127 - НОВЫЙ",
        warehouse: "Склад А",
        status: "READY",
        items: 15,
        picker: "Кладовщик Сидоров",
        createdAt: "2024-01-27 09:30"
    },
    {
        id: "SHP-2024-0087",
        request: "REQ-2024-0141",
        destination: "Магазин #89 - ТРК Атриум",
        warehouse: "Склад Б",
        status: "SHIPPED",
        items: 2,
        picker: "Кладовщик Иванов",
        createdAt: "2024-01-26 16:00"
    },
    {
        id: "SHP-2024-0086",
        request: "REQ-2024-0138",
        destination: "Магазин #55 - ТЦ Европа",
        warehouse: "Склад А",
        status: "DELIVERED",
        items: 1,
        picker: "Кладовщик Петров",
        createdAt: "2024-01-25 14:00"
    },
];

const statusMap: Record<string, { label: string; variant: "default" | "success" | "warning" | "info" | "secondary"; icon: typeof Package }> = {
    PICKING: { label: "Сборка", variant: "warning", icon: Package },
    READY: { label: "Готово", variant: "info", icon: PackageCheck },
    SHIPPED: { label: "Отправлено", variant: "secondary", icon: Send },
    DELIVERED: { label: "Доставлено", variant: "success", icon: CheckCircle2 },
};

export default function ShipmentsPage() {
    return (
        <div className="p-6 h-full">
            <div className="space-y-6">
                {/* Page Header */}
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">Отгрузки</h1>
                        <p className="text-sm text-muted-foreground mt-1">Сборка и отправка оборудования</p>
                    </div>
                    <Button variant="gradient" className="w-full sm:w-auto">
                        <Plus className="h-4 w-4 mr-2" />
                        Создать отгрузку
                    </Button>
                </div>

                {/* Stats */}
                <div className="grid gap-4 md:grid-cols-4 animate-stagger">
                    <StatCard
                        title="На сборке"
                        value="4"
                        icon={<Package className="h-5 w-5" />}
                        status="warning"
                    />
                    <StatCard
                        title="Готово к отправке"
                        value="7"
                        icon={<PackageCheck className="h-5 w-5" />}
                        status="accent"
                    />
                    <StatCard
                        title="В пути"
                        value="12"
                        icon={<Truck className="h-5 w-5" />}
                        status="default"
                    />
                    <StatCard
                        title="Доставлено (месяц)"
                        value="156"
                        icon={<CheckCircle2 className="h-5 w-5" />}
                        status="success"
                    />
                </div>

                {/* Filters */}
                <Card>
                    <CardContent className="p-4">
                        <div className="flex flex-wrap gap-4 items-center">
                            <div className="flex-1 min-w-[200px] max-w-md">
                                <SearchInput placeholder="Поиск по номеру отгрузки..." />
                            </div>
                            <Button variant="outline" size="sm">
                                <Filter className="h-4 w-4" />
                                Фильтры
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Shipments List */}
                <Card variant="elevated">
                    <CardHeader className="pb-4">
                        <CardTitle className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                                <Truck className="h-4 w-4 text-primary" />
                            </div>
                            Список отгрузок
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {shipments.map((shipment, index) => {
                                const StatusIcon = statusMap[shipment.status]?.icon || Package;
                                const statusConfig = statusMap[shipment.status];

                                return (
                                    <div
                                        key={shipment.id}
                                        className={cn(
                                            "flex items-center justify-between rounded-xl border border-border/50 p-4 transition-all hover:bg-muted/50 hover:border-primary/30 cursor-pointer group animate-fade-in"
                                        )}
                                        style={{ animationDelay: `${index * 30}ms` }}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className={cn(
                                                "flex h-12 w-12 items-center justify-center rounded-xl transition-colors",
                                                statusConfig?.variant === 'warning' && "bg-warning/10 group-hover:bg-warning/20",
                                                statusConfig?.variant === 'info' && "bg-info/10 group-hover:bg-info/20",
                                                statusConfig?.variant === 'success' && "bg-success/10 group-hover:bg-success/20",
                                                statusConfig?.variant === 'secondary' && "bg-muted group-hover:bg-muted/80",
                                                !statusConfig && "bg-primary/10"
                                            )}>
                                                <StatusIcon className={cn(
                                                    "h-5 w-5",
                                                    statusConfig?.variant === 'warning' && "text-warning",
                                                    statusConfig?.variant === 'info' && "text-info",
                                                    statusConfig?.variant === 'success' && "text-success",
                                                    statusConfig?.variant === 'secondary' && "text-muted-foreground",
                                                    !statusConfig && "text-primary"
                                                )} />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <code className="text-xs font-medium bg-muted px-1.5 py-0.5 rounded">
                                                        {shipment.id}
                                                    </code>
                                                    <ArrowRight className="h-3 w-3 text-muted-foreground" />
                                                    <span className="text-xs text-muted-foreground">{shipment.request}</span>
                                                </div>
                                                <p className="font-medium mt-1 group-hover:text-primary transition-colors">{shipment.destination}</p>
                                                <p className="text-sm text-muted-foreground flex items-center gap-2">
                                                    <Warehouse className="h-3 w-3" />
                                                    {shipment.warehouse}
                                                    <span className="text-muted-foreground/50">•</span>
                                                    {shipment.items} позиций
                                                    <span className="text-muted-foreground/50">•</span>
                                                    {shipment.picker}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <Badge variant={statusConfig?.variant || "secondary"} dot>
                                                {statusConfig?.label || shipment.status}
                                            </Badge>
                                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                <Clock className="h-3.5 w-3.5" />
                                                {shipment.createdAt}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
