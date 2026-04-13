"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Plus, Search, Calendar, AlertCircle, FileText, ArrowRight, Check, MapPin, AlertTriangle, Loader2, FileSpreadsheet, Keyboard, Truck, Send, Package, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useWarehouses } from "@/lib/hooks";
import { shippingService, ShippingSession } from "@/lib/shipping-service";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { toast } from "sonner";

type ShipmentBadgeVariant = "secondary" | "default" | "info" | "success" | "outline";

export default function ShipmentsPage() {
    const router = useRouter();
    const { data: warehouses } = useWarehouses();
    const { hasRole } = useAuth();
    const isAdmin = hasRole(['ADMIN']);
    const [sessions, setSessions] = useState<ShippingSession[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);

    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [warehouseFilter, setWarehouseFilter] = useState<string>('all');
    const [typeFilter, setTypeFilter] = useState<'all' | 'manual' | 'file'>('all');
    const [problemsOnly, setProblemsOnly] = useState(false);

    useEffect(() => {
        const load = async () => {
            try {
                const data = await shippingService.getAll();
                setSessions(data);
                setLoadError(null);
            } catch (error) {
                console.error("Failed to load shipments", error);
                setLoadError(error instanceof Error ? error.message : "Не удалось загрузить отгрузки");
            } finally {
                setIsLoading(false);
            }
        };
        void load();
        const interval = setInterval(() => {
            void load();
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    const handleDelete = async (e: React.MouseEvent, sessionId: string) => {
        e.stopPropagation();
        if (!confirm('Удалить отгрузку? Это действие нельзя отменить.')) return;
        try {
            await api.delete(`/shipments/${sessionId}`);
            setSessions((current) => current.filter((session) => session.id !== sessionId));
            toast.success('Отгрузка удалена');
        } catch (error) {
            toast.error('Не удалось удалить отгрузку');
            console.error(error);
        }
    };

    const getWarehouseName = useCallback((id?: string) => {
        if (!id) return "Склад не указан";
        return warehouses?.find(w => w.id === id)?.name || id;
    }, [warehouses]);

    const getStatusColor = (status: string): ShipmentBadgeVariant => {
        switch (status) {
            case 'draft': return "secondary";
            case 'picking': return "default";
            case 'packed': return "info";
            case 'shipped': return "success";
            default: return "outline";
        }
    };

    const getStatusText = (status: string) => {
        switch (status) {
            case 'draft': return "Черновик";
            case 'picking': return "Сборка";
            case 'packed': return "Собрано";
            case 'shipped': return "Отправлено";
            default: return status;
        }
    };

    const filteredSessions = useMemo(() => {
        return (sessions || []).filter(session => {
            const warehouseName = getWarehouseName(session.warehouseId);
            const matchesSearch =
                warehouseName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                session.destination?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                session.requestNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                session.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                session.id.toLowerCase().includes(searchTerm.toLowerCase());

            const matchesStatus = statusFilter === 'all' || session.status === statusFilter;
            const matchesWarehouse = warehouseFilter === 'all' || session.warehouseId === warehouseFilter;

            const matchesType = typeFilter === 'all' ||
                (typeFilter === 'file' && session.type === 'file') ||
                (typeFilter === 'manual' && session.type === 'manual');

            // Discrepancies only for file-based shipments
            const isFileBased = session.type === 'file';
            const hasExcess = isFileBased && session.items.some(item => item.scannedQuantity > item.expectedQuantity);
            const hasShortage = isFileBased && session.status === 'shipped' && session.items.some(item => item.scannedQuantity < item.expectedQuantity);
            const hasProblems = hasExcess || hasShortage;
            const matchesProblems = !problemsOnly || hasProblems;

            return matchesSearch && matchesStatus && matchesWarehouse && matchesType && matchesProblems;
        });
    }, [sessions, searchTerm, statusFilter, warehouseFilter, typeFilter, problemsOnly, getWarehouseName]);

    const statusOptions = [
        { value: 'all', label: 'Все', count: sessions.length },
        { value: 'picking', label: 'Сборка', count: sessions.filter(s => s.status === 'picking').length },
        { value: 'shipped', label: 'Отправлено', count: sessions.filter(s => s.status === 'shipped').length },
        { value: 'draft', label: 'Черновик', count: sessions.filter(s => s.status === 'draft').length },
    ] as const;

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="p-3 md:p-6 min-h-full bg-muted/5">
            <div className="space-y-4 md:space-y-6">
                {/* Page Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-xl md:text-2xl font-bold tracking-tight">Отгрузки</h1>
                        <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
                            Сборка и отправка оборудования со складов
                        </p>
                    </div>
                    <Button onClick={() => router.push('/shipments/new')} className="gap-2 h-11 md:h-10 font-medium shadow-sm transition-all hover:shadow-md active:scale-95 w-full sm:w-auto">
                        <Plus className="h-4 w-4" />
                        Новая отгрузка
                    </Button>
                </div>

                {/* Search & Filter Section */}
                <Card className="border-border/50 shadow-sm overflow-hidden bg-card/30 backdrop-blur-sm">
                    <CardContent className="p-3 md:p-5 space-y-4 md:space-y-5">
                        {/* Search Bar */}
                        <div className="relative group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                            <Input
                                placeholder="Поиск по получателю, накладной или ID..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-11 h-12 md:h-14 rounded-2xl bg-muted/20 border-border/50 focus-visible:ring-1 focus-visible:ring-primary/30 text-base md:text-lg font-medium transition-all shadow-inner"
                            />
                        </div>

                        <div className="flex flex-col md:flex-row gap-4">
                            {/* Problems Toggle */}
                            <div className="w-full md:w-auto">
                                <button
                                    onClick={() => setProblemsOnly(!problemsOnly)}
                                    className={`flex items-center justify-center gap-3 px-5 h-full w-full md:w-auto rounded-2xl border-2 transition-all duration-300 group ${problemsOnly
                                        ? 'border-red-500/50 bg-red-500/5 text-red-500'
                                        : 'border-dashed border-border/40 hover:border-emerald-500/30 hover:bg-emerald-500/5 text-muted-foreground/70'
                                        }`}
                                >
                                    <div className={`p-1.5 rounded-lg transition-colors ${problemsOnly ? 'bg-red-500 text-white' : 'bg-muted/50 group-hover:bg-emerald-500/10 group-hover:text-emerald-500'}`}>
                                        <AlertTriangle className="h-4 w-4" />
                                    </div>
                                    <span className="text-sm font-bold tracking-tight whitespace-nowrap">Расхождения</span>
                                </button>
                            </div>

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

                            {/* Type Filter */}
                            <div className="w-full md:w-48">
                                <Select value={typeFilter} onValueChange={(v: "all" | "manual" | "file") => setTypeFilter(v)}>
                                    <SelectTrigger className="h-12 md:h-14 rounded-2xl bg-muted/20 border-border/50 text-left px-4 hover:bg-muted/30 transition-all font-semibold">
                                        <div className="flex items-center gap-2 truncate">
                                            {typeFilter === 'manual' ? <Keyboard className="h-4 w-4 shrink-0 text-primary/70" /> :
                                                typeFilter === 'file' ? <FileSpreadsheet className="h-4 w-4 shrink-0 text-primary/70" /> :
                                                    <FileText className="h-4 w-4 shrink-0 text-primary/70" />}
                                            <div className="flex flex-col items-start leading-none overflow-hidden">
                                                <span className="text-[10px] uppercase tracking-widest opacity-60 mb-0.5">Тип</span>
                                                <SelectValue placeholder="Все типы" />
                                            </div>
                                        </div>
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl">
                                        <SelectItem value="all">Все типы</SelectItem>
                                        <SelectItem value="file">По файлу</SelectItem>
                                        <SelectItem value="manual">Вручную</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Status Filters */}
                            <div className="flex-1 min-w-0 bg-muted/5 rounded-2xl p-1.5 border border-border/20 flex items-center">
                                <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-1.5 md:gap-2 w-full">
                                    {statusOptions.map((opt) => (
                                        <button
                                            key={opt.value}
                                            onClick={() => setStatusFilter(opt.value)}
                                            className={`flex items-center justify-center gap-2 px-3 md:px-4 py-2.5 rounded-xl text-[13px] md:text-sm font-bold transition-all duration-300 ${statusFilter === opt.value
                                                ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/20 scale-[1.02]'
                                                : 'bg-transparent text-muted-foreground/80 hover:bg-muted/50 hover:text-foreground'
                                                }`}
                                        >
                                            <span className="truncate">{opt.label}</span>
                                            <span className={`flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full text-[10px] tabular-nums font-medium ${statusFilter === opt.value
                                                ? 'bg-white/20 text-white'
                                                : 'bg-muted-foreground/10 text-muted-foreground'
                                                }`}>
                                                {opt.count}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Sessions List */}
                <div className="grid gap-3 md:gap-4">
                    {loadError && (
                        <Card className="border-destructive/30 bg-destructive/5">
                            <CardContent className="flex items-start gap-3 p-4 text-sm">
                                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                                <div>
                                    <p className="font-medium text-foreground">Не удалось загрузить список отгрузок</p>
                                    <p className="text-muted-foreground">{loadError}</p>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                    {filteredSessions.map((session) => {
                        const isFileBased = session.type === 'file';
                        const totalExpected = session.items.reduce((s, i) => s + (i.expectedQuantity || 0), 0);
                        const totalScanned = session.items.reduce((s, i) => s + i.scannedQuantity, 0);
                        const totalItems = session.items.length;

                        const hasExcess = isFileBased && session.items.some(item => item.scannedQuantity > item.expectedQuantity);
                        const hasShortage = isFileBased && session.status === 'shipped' && session.items.some(item => item.scannedQuantity < item.expectedQuantity);

                        let progressColor = 'bg-primary';
                        if (session.status === 'shipped') {
                            if (hasExcess) progressColor = 'bg-red-500';
                            else if (hasShortage) progressColor = 'bg-yellow-500';
                            else progressColor = 'bg-green-500';
                        } else if (hasExcess) {
                            progressColor = 'bg-red-500';
                        }

                        const statusIcon = session.status === 'shipped' ? Send :
                            session.status === 'picking' || session.status === 'packed' ? Package :
                                Truck;
                        const StatusIcon = statusIcon;

                        return (
                            <Card
                                key={session.id}
                                className="group hover:shadow-lg hover:border-primary/20 transition-all duration-300 cursor-pointer overflow-hidden relative border-border/50"
                                onClick={() => router.push(`/shipments/${session.id}`)}
                            >
                                <CardContent className="p-4 md:p-6">
                                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 md:gap-6">
                                        {/* Status & Info */}
                                        <div className="flex items-start gap-4 flex-1 min-w-0">
                                            <div className={`p-3 rounded-2xl shrink-0 transition-colors ${session.status === 'shipped' ? 'bg-green-500/10 text-green-500' :
                                                session.status === 'picking' || session.status === 'packed' ? 'bg-primary/10 text-primary' :
                                                    'bg-muted/50 text-muted-foreground'
                                                }`}>
                                                <StatusIcon className="h-6 w-6" />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                                    <div className="flex items-center gap-2 group/title" title={`Склад: ${getWarehouseName(session.warehouseId)} → ${session.destination}`}>
                                                        <span className="font-bold text-lg md:text-xl tracking-tight text-foreground/90 group-hover/title:text-primary transition-colors">
                                                            {getWarehouseName(session.warehouseId)}
                                                        </span>
                                                        <ArrowRight className="h-4 w-4 text-muted-foreground/40" />
                                                        <span className="font-bold text-lg md:text-xl tracking-tight text-foreground/90 group-hover/title:text-primary transition-colors">
                                                            {session.destination}
                                                        </span>
                                                    </div>
                                                    <Badge className="font-bold text-[10px] uppercase tracking-wider ml-1" variant={getStatusColor(session.status)}>{getStatusText(session.status)}</Badge>
                                                    {hasShortage && (
                                                        <Badge className="font-bold text-[10px] uppercase tracking-wider ml-1 bg-orange-500 hover:bg-orange-600 text-white border-none shadow-sm">Недосбор</Badge>
                                                    )}
                                                    {hasExcess && (
                                                        <Badge className="font-bold text-[10px] uppercase tracking-wider ml-1" variant="destructive">Пересорт</Badge>
                                                    )}
                                                    {session.destinationType === 'warehouse' && session.linkedReceivingId && session.status === 'shipped' && (
                                                        <Badge className="font-bold text-[10px] uppercase tracking-wider ml-1 bg-blue-500/10 text-blue-600 border-blue-500/20" variant="outline">Приемка создана</Badge>
                                                    )}
                                                    {session.destinationType === 'store' && session.delivery && session.status === 'shipped' && (
                                                        <Badge className="font-bold text-[10px] uppercase tracking-wider ml-1 bg-blue-500/10 text-blue-600 border-blue-500/20" variant="outline">
                                                            {session.delivery.provider === 'YANDEX_DELIVERY' ? 'Доставка создана' : 'Доставка'}
                                                        </Badge>
                                                    )}
                                                </div>

                                                {/* Info Block */}
                                                <div className="bg-muted/30 rounded-lg p-2.5 space-y-2 border border-border/50">
                                                    <div className="flex items-center gap-2 text-sm font-bold text-foreground/90">
                                                        <div className="h-2 w-2 rounded-full bg-primary shrink-0" />
                                                        <span className="uppercase text-[10px] tracking-widest opacity-60 font-bold mr-1 shrink-0">ID:</span>
                                                        <span className="truncate font-mono text-xs">{session.invoiceNumber || session.requestNumber || session.id}</span>
                                                    </div>

                                                    <div className="flex items-center gap-4 flex-wrap text-[11px] font-mono font-medium text-muted-foreground">
                                                        <div className="flex items-center gap-1.5 bg-background/50 px-2 py-0.5 rounded border border-border/30">
                                                            <Calendar className="h-3 w-3 opacity-60" />
                                                            <span>Старт: {new Date(session.createdAt).toLocaleDateString()} {new Date(session.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                        </div>
                                                        {session.completedAt && (
                                                            <div className="flex items-center gap-1.5 bg-green-500/5 text-green-600/80 px-2 py-0.5 rounded border border-green-500/10">
                                                                <Check className="h-3 w-3 opacity-80" />
                                                                <span>Финиш: {new Date(session.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                            </div>
                                                        )}
                                                        <div className="flex items-center gap-1.5 bg-background/50 px-2 py-0.5 rounded border border-border/30">
                                                            {session.type === 'file' ? <FileSpreadsheet className="h-3 w-3 opacity-60" /> : <Keyboard className="h-3 w-3 opacity-60" />}
                                                            <span>{session.type === 'file' ? 'По файлу' : 'Вручную'}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Progress / Count */}
                                        <div className="flex items-center gap-4 lg:gap-6 min-w-full lg:min-w-[240px] pt-4 lg:pt-0 border-t lg:border-t-0 border-border/10">
                                            <div className="flex-1">
                                                {isFileBased && totalExpected > 0 ? (
                                                    <>
                                                        <div className="flex justify-between items-end mb-1.5">
                                                            <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground opacity-60">Прогресс</span>
                                                            <div className="text-xl font-black font-mono">
                                                                {totalScanned} <span className="text-muted-foreground text-xs font-normal">/ {totalExpected}</span>
                                                            </div>
                                                        </div>
                                                        <div className="w-full bg-muted/50 h-2.5 rounded-full overflow-hidden p-0.5 border border-muted/10">
                                                            <div
                                                                className={`h-full rounded-full transition-all duration-700 shadow-sm ${progressColor}`}
                                                                style={{ width: `${Math.min(100, (totalScanned / (totalExpected || 1)) * 100)}%` }}
                                                            />
                                                        </div>
                                                    </>
                                                ) : (
                                                    <div className="flex justify-between items-end">
                                                        <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground opacity-60">Собрано</span>
                                                        <div className="text-xl font-black font-mono">
                                                            {totalScanned} <span className="text-muted-foreground text-xs font-normal">шт / {totalItems} поз.</span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                            <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                                            {isAdmin && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                                                    onClick={(e) => handleDelete(e, session.id)}
                                                    title="Удалить отгрузку"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                                {['picking', 'packed'].includes(session.status) && (
                                    <div className="absolute top-0 left-0 w-1 h-full bg-primary/40" />
                                )}
                            </Card>
                        );
                    })}

                    {filteredSessions.length === 0 && (
                        <Card className="border-dashed py-12 bg-muted/5">
                            <CardContent className="flex flex-col items-center justify-center text-muted-foreground">
                                <Search className="h-10 w-10 mb-4 opacity-20" />
                                <h3 className="text-lg font-bold text-foreground/70">Ничего не найдено</h3>
                                <p className="text-sm max-w-[240px] text-center mt-1">Измените параметры поиска или создайте новую отгрузку</p>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
}
