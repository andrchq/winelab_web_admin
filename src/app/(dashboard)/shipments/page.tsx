"use client";

import { useState, useEffect, useMemo } from "react";
import { Truck, Plus, Filter, Package, CheckCircle2, Clock, ArrowRight, Warehouse, Send, PackageCheck, Loader2, AlertCircle, Calendar, MapPin, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useWarehouses } from "@/lib/hooks";
import { shippingService, ShippingSession } from "@/lib/shipping-service";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRouter } from "next/navigation";

const statusMap: Record<string, { label: string; variant: "default" | "success" | "warning" | "info" | "secondary" | "destructive"; icon: any }> = {
    draft: { label: "Черновик", variant: "secondary", icon: Package },
    picking: { label: "Сборка", variant: "warning", icon: Package },
    packed: { label: "Собрано", variant: "info", icon: PackageCheck },
    shipped: { label: "Отправлено", variant: "success", icon: Send },
};

export default function ShipmentsPage() {
    const router = useRouter();
    const { data: warehouses } = useWarehouses();
    const [sessions, setSessions] = useState<ShippingSession[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [warehouseFilter, setWarehouseFilter] = useState<string>('all');

    useEffect(() => {
        // Load from local shippingService
        const load = () => {
            const data = shippingService.getAll();
            setSessions(data);
            setIsLoading(false);
        };
        load();

        // Listen for storage events or similar if needed, but for now just load on mount
        const interval = setInterval(load, 2000); // Poll for updates
        return () => clearInterval(interval);
    }, []);

    const getWarehouseName = (id?: string) => {
        if (!id) return "Склад не указан";
        return warehouses?.find(w => w.id === id)?.name || id;
    };

    // Filtering
    const filteredShipments = useMemo(() => {
        return sessions.filter(s => {
            const matchesSearch =
                s.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                s.destination?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                s.requestNumber?.toLowerCase().includes(searchTerm.toLowerCase());

            const matchesStatus = statusFilter === 'all' || s.status === statusFilter;
            const matchesWarehouse = warehouseFilter === 'all' || s.warehouseId === warehouseFilter;

            return matchesSearch && matchesStatus && matchesWarehouse;
        });
    }, [sessions, searchTerm, statusFilter, warehouseFilter]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    const statusOptions = [
        { value: 'all', label: 'Все', count: sessions.length },
        { value: 'draft', label: 'Черновики', count: sessions.filter(s => s.status === 'draft').length },
        { value: 'picking', label: 'На сборке', count: sessions.filter(s => s.status === 'picking').length },
        { value: 'shipped', label: 'Отправлено', count: sessions.filter(s => s.status === 'shipped').length },
    ];

    return (
        <div className="p-3 md:p-6 min-h-full bg-muted/5">
            <div className="max-w-7xl mx-auto space-y-4 md:space-y-6">
                {/* Page Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-xl md:text-2xl font-bold tracking-tight">Отгрузки</h1>
                        <p className="text-xs md:text-sm text-muted-foreground mt-0.5">Сборка и отправка оборудования (ТСД)</p>
                    </div>
                    <Button onClick={() => router.push('/shipments/new')} className="gap-2 h-11 md:h-10 font-medium shadow-sm transition-all hover:shadow-md active:scale-95 w-full sm:w-auto">
                        <Plus className="h-4 w-4" />
                        Создать отгрузку
                    </Button>
                </div>

                {/* Search & Filter Section */}
                <Card className="border-border/50 shadow-sm overflow-hidden bg-card/30 backdrop-blur-sm">
                    <CardContent className="p-3 md:p-5 space-y-4 md:space-y-5">
                        <div className="relative group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                            <Input
                                placeholder="Поиск по номеру или получателю..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-11 h-12 md:h-14 rounded-2xl bg-muted/20 border-border/50 focus-visible:ring-1 focus-visible:ring-primary/30 text-base md:text-lg font-medium transition-all shadow-inner"
                            />
                        </div>

                        <div className="flex flex-col md:flex-row gap-4">
                            {/* Warehouse Filter */}
                            <div className="w-full md:w-56">
                                <Select value={warehouseFilter} onValueChange={setWarehouseFilter}>
                                    <SelectTrigger className="h-12 md:h-14 rounded-2xl bg-muted/20 border-border/50 text-left px-4 hover:bg-muted/30 transition-all font-semibold">
                                        <div className="flex items-center gap-2 truncate">
                                            <MapPin className="h-4 w-4 shrink-0 text-primary/70" />
                                            <div className="flex flex-col items-start leading-none overflow-hidden">
                                                <span className="text-[10px] uppercase tracking-widest opacity-60 mb-0.5">Склад</span>
                                                <SelectValue placeholder="Все склады" />
                                            </div>
                                        </div>
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl">
                                        <SelectItem value="all">Все склады</SelectItem>
                                        {warehouses?.map(w => (
                                            <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Status Filter Tabs */}
                            <div className="flex-1 min-w-0 bg-muted/5 rounded-2xl p-1.5 border border-border/20 flex items-center">
                                <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-1.5 md:gap-2 w-full">
                                    {statusOptions.map((opt) => (
                                        <button
                                            key={opt.value}
                                            onClick={() => setStatusFilter(opt.value)}
                                            className={cn(
                                                "flex items-center justify-center gap-2 px-3 md:px-4 py-2.5 rounded-xl text-[13px] md:text-sm font-bold transition-all duration-300",
                                                statusFilter === opt.value
                                                    ? "bg-gradient-to-br from-primary to-primary/80 text-white shadow-lg shadow-primary/20 scale-[1.02]"
                                                    : "bg-transparent text-muted-foreground/80 hover:bg-muted/50 hover:text-foreground"
                                            )}
                                        >
                                            <span className="truncate">{opt.label}</span>
                                            <span className={cn(
                                                "flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full text-[10px] tabular-nums font-medium",
                                                statusFilter === opt.value
                                                    ? "bg-white/20 text-white"
                                                    : "bg-muted-foreground/10 text-muted-foreground"
                                            )}>
                                                {opt.count}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Shipments List */}
                <div className="grid gap-3 md:gap-4">
                    {filteredShipments.length === 0 ? (
                        <Card className="border-dashed py-12 bg-muted/5">
                            <CardContent className="flex flex-col items-center justify-center text-muted-foreground">
                                <Search className="h-10 w-10 mb-4 opacity-20" />
                                <h3 className="text-lg font-bold text-foreground/70">Ничего не найдено</h3>
                                <p className="text-sm max-w-[240px] text-center mt-1">Измените параметры поиска или создайте новую отгрузку</p>
                            </CardContent>
                        </Card>
                    ) : (
                        filteredShipments.map((shipment) => {
                            const statusConfig = statusMap[shipment.status] || statusMap.draft;
                            const StatusIcon = statusConfig.icon;
                            const dateStr = new Date(shipment.createdAt).toLocaleDateString('ru-RU');
                            const timeStr = new Date(shipment.createdAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

                            const totalItems = shipment.items.length;
                            const scannedItems = shipment.items.reduce((acc, item) => acc + (item.scannedQuantity > 0 ? 1 : 0), 0); // Count lines with quantity

                            return (
                                <Card
                                    key={shipment.id}
                                    className="group hover:shadow-lg hover:border-primary/20 transition-all duration-300 cursor-pointer overflow-hidden relative border-border/50"
                                    onClick={() => router.push(`/shipments/${shipment.id}`)}
                                >
                                    <CardContent className="p-4 md:p-6">
                                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 md:gap-6">
                                            {/* Main Info */}
                                            <div className="flex items-start gap-4 flex-1 min-w-0">
                                                <div className={cn(
                                                    "p-3 rounded-2xl shrink-0 transition-colors",
                                                    statusConfig.variant === 'warning' && "bg-warning/10 text-warning",
                                                    statusConfig.variant === 'info' && "bg-info/10 text-info",
                                                    statusConfig.variant === 'success' && "bg-success/10 text-success",
                                                    statusConfig.variant === 'secondary' && "bg-muted text-muted-foreground",
                                                    statusConfig.variant === 'default' && "bg-primary/10 text-primary"
                                                )}>
                                                    <StatusIcon className="h-6 w-6" />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center gap-2 flex-wrap mb-1">
                                                        <span className="font-bold text-lg tracking-tight truncate">{shipment.id}</span>
                                                        <Badge variant={statusConfig.variant} className="font-bold text-[10px] uppercase tracking-wider">{statusConfig.label}</Badge>
                                                    </div>

                                                    {/* Request & Destination */}
                                                    <div className="text-xs md:text-sm text-muted-foreground flex items-center gap-x-3 gap-y-1 flex-wrap mb-2">
                                                        <span className="flex items-center gap-1.5 min-w-0">
                                                            <Package className="h-3.5 w-3.5 shrink-0 opacity-70" />
                                                            <span className="truncate">{shipment.requestNumber || "Без заявки"}</span>
                                                        </span>
                                                        {shipment.destination && (
                                                            <span className="flex items-center gap-1.5 font-medium text-foreground/80">
                                                                <ArrowRight className="h-3.5 w-3.5 shrink-0 opacity-70" />
                                                                <span className="truncate">{shipment.destination}</span>
                                                            </span>
                                                        )}
                                                    </div>

                                                    {/* Warehouse Info */}
                                                    <div className="bg-muted/30 rounded-lg p-2.5 space-y-2 border border-border/50 mt-2">
                                                        <div className="flex items-center gap-2 text-sm font-bold text-foreground/90">
                                                            <div className="h-2 w-2 rounded-full bg-primary shrink-0" />
                                                            <span className="uppercase text-[10px] tracking-widest opacity-60 font-bold mr-1 shrink-0">Склад:</span>
                                                            <span className="truncate">{getWarehouseName(shipment.warehouseId)}</span>
                                                        </div>
                                                        <div className="flex items-center gap-4 flex-wrap text-[11px] font-mono font-medium text-muted-foreground">
                                                            <div className="flex items-center gap-1.5 bg-background/50 px-2 py-0.5 rounded border border-border/30">
                                                                <Calendar className="h-3 w-3 opacity-60" />
                                                                <span>{dateStr} {timeStr}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Action / Arrow */}
                                            <div className="flex items-center justify-end">
                                                <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                                            </div>
                                        </div>
                                    </CardContent>
                                    {/* Left Border Status Indicator */}
                                    {['picking', 'packed'].includes(shipment.status) && (
                                        <div className="absolute top-0 left-0 w-1 h-full bg-primary/40" />
                                    )}
                                </Card>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
}
