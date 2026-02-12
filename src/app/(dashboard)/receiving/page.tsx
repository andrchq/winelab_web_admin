"use client";

import { useState, useEffect } from "react";

import { Button } from "@/components/ui/button";
import { Plus, Search, Calendar, PackageCheck, AlertCircle, FileText, ArrowRight, Check, MapPin, AlertTriangle, Loader2, FileSpreadsheet, Keyboard } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useWarehouses } from "@/lib/hooks";
import { receivingService, ReceivingSession } from "@/lib/receiving-service";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ReceivingStatus } from "@/types/api";

export default function ReceivingPage() {
    const router = useRouter();
    const [sessions, setSessions] = useState<ReceivingSession[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        const loadSessions = async () => {
            try {
                const data = await receivingService.getAll();
                setSessions(data);
            } catch (err) {
                setError("Failed to load sessions");
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        };
        loadSessions();
    }, []);
    const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'in_progress' | 'completed'>('all');
    const [warehouseFilter, setWarehouseFilter] = useState<string>('all');
    const [typeFilter, setTypeFilter] = useState<'all' | 'manual' | 'file'>('all');
    const [problemsOnly, setProblemsOnly] = useState(false);
    const { data: warehouses } = useWarehouses();

    const getWarehouseName = (session: ReceivingSession) => {
        return session.warehouse?.name || warehouses?.find(w => w.id === session.warehouseId)?.name || session.warehouseId;
    };

    const getStatusColor = (status: string) => {
        switch (status.toLowerCase()) {
            case 'draft': return "secondary";
            case 'in_progress': return "default";
            case 'completed': return "success";
            default: return "outline";
        }
    };

    const getStatusText = (status: string) => {
        switch (status.toLowerCase()) {
            case 'draft': return "Черновик";
            case 'in_progress': return "В процессе";
            case 'completed': return "Завершено";
            default: return status;
        }
    };

    const filteredSessions = (sessions || []).filter(session => {
        const warehouseName = getWarehouseName(session);
        const matchesSearch =
            warehouseName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            session.warehouseId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            session.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            session.id.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus = statusFilter === 'all' || session.status.toLowerCase() === statusFilter;
        const matchesWarehouse = warehouseFilter === 'all' || session.warehouseId === warehouseFilter;

        // Type filtering
        const isManual = session.type === 'manual' || (!session.type && session.invoiceNumber?.includes('Manual_Invoice'));
        const matchesType = typeFilter === 'all' ||
            (typeFilter === 'manual' && isManual) ||
            (typeFilter === 'file' && !isManual);

        const hasExcess = session.items.some(item => item.scannedQuantity > item.expectedQuantity);
        // Shortage is only a problem if the session is marked as COMPLETED
        const hasShortage = session.status === 'COMPLETED' && session.items.some(item => item.scannedQuantity < item.expectedQuantity);

        const hasProblems = hasExcess || hasShortage;
        const matchesProblems = !problemsOnly || hasProblems;

        return matchesSearch && matchesStatus && matchesWarehouse && matchesProblems && matchesType;
    });

    const statusOptions = [
        { value: 'all', label: 'Все', count: (sessions || []).length },
        { value: 'in_progress', label: 'В процессе', count: (sessions || []).filter(s => s.status.toLowerCase() === 'in_progress').length },
        { value: 'completed', label: 'Завершено', count: (sessions || []).filter(s => s.status.toLowerCase() === 'completed').length },
        { value: 'draft', label: 'Черновик', count: (sessions || []).filter(s => s.status.toLowerCase() === 'draft').length },
    ] as const;

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }
    // ... (lines 104-235 omitted) ...
    return (
        <div className="p-3 md:p-6 min-h-full bg-muted/5">
            <div className="space-y-4 md:space-y-6">
                {/* Page Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-xl md:text-2xl font-bold tracking-tight">Приемка товара</h1>
                        <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
                            Управление поступлениями на склады
                        </p>
                    </div>
                    <Button onClick={() => router.push('/receiving/new')} className="gap-2 h-11 md:h-10 font-medium shadow-sm transition-all hover:shadow-md active:scale-95 w-full sm:w-auto">
                        <Plus className="h-4 w-4" />
                        Новая приемка
                    </Button>
                </div>

                {/* Search & Filter Section */}
                <Card className="border-border/50 shadow-sm overflow-hidden bg-card/30 backdrop-blur-sm">
                    <CardContent className="p-3 md:p-5 space-y-4 md:space-y-5">
                        {/* 1. Search Bar */}
                        <div className="relative group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                            <Input
                                placeholder="Поиск по названию или накладной..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-11 h-12 md:h-14 rounded-2xl bg-muted/20 border-border/50 focus-visible:ring-1 focus-visible:ring-primary/30 text-base md:text-lg font-medium transition-all shadow-inner"
                            />
                        </div>

                        <div className="flex flex-col md:flex-row gap-4">
                            {/* 4. Problems Toggle */}
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

                            {/* 2. Warehouse Filter */}
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
                                <Select value={typeFilter} onValueChange={(v: any) => setTypeFilter(v)}>
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

                            {/* 3. Status Filters */}
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
                    {filteredSessions.map((session) => {
                        const totalItems = session.items.reduce((s, i) => s + i.expectedQuantity, 0);
                        const scannedItems = session.items.reduce((s, i) => s + i.scannedQuantity, 0);

                        const hasExcess = session.items.some(item => item.scannedQuantity > item.expectedQuantity);
                        const hasShortage = session.status === 'COMPLETED' && session.items.some(item => item.scannedQuantity < item.expectedQuantity);

                        let progressColor = 'bg-primary';
                        if (session.status === 'COMPLETED') {
                            if (hasExcess) progressColor = 'bg-red-500';
                            else if (hasShortage) progressColor = 'bg-yellow-500';
                            else progressColor = 'bg-green-500';
                        } else if (hasExcess) {
                            progressColor = 'bg-red-500';
                        }

                        return (
                            <Card
                                key={session.id}
                                className="group hover:shadow-lg hover:border-primary/20 transition-all duration-300 cursor-pointer overflow-hidden relative border-border/50"
                                onClick={() => router.push(`/receiving/${session.id}`)}
                            >
                                <CardContent className="p-4 md:p-6">
                                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 md:gap-6">
                                        {/* Status & ID */}
                                        <div className="flex items-start gap-4 flex-1 min-w-0">
                                            <div className={`p-3 rounded-2xl shrink-0 transition-colors ${session.status === 'completed' ? 'bg-green-500/10 text-green-500' :
                                                session.status === 'in_progress' ? 'bg-primary/10 text-primary' :
                                                    'bg-muted/50 text-muted-foreground'
                                                }`}>
                                                <PackageCheck className="h-6 w-6" />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                                    <div className="flex items-center gap-2 group/title" title={`Поставщик: ${session.supplier} -> Склад: ${getWarehouseName(session)}`}>
                                                        <span className="font-bold text-lg md:text-xl tracking-tight text-foreground/90 group-hover/title:text-primary transition-colors">
                                                            {session.supplier || "Неизвестный"}
                                                        </span>
                                                        <ArrowRight className="h-4 w-4 text-muted-foreground/40" />
                                                        <span className="font-bold text-lg md:text-xl tracking-tight text-foreground/90 group-hover/title:text-primary transition-colors">
                                                            {getWarehouseName(session)}
                                                        </span>
                                                    </div>
                                                    <Badge className="font-bold text-[10px] uppercase tracking-wider ml-1" variant={getStatusColor(session.status)}>{getStatusText(session.status)}</Badge>
                                                    {hasShortage && (
                                                        <Badge className="font-bold text-[10px] uppercase tracking-wider ml-1 bg-orange-500 hover:bg-orange-600 text-white border-none shadow-sm">Недостача</Badge>
                                                    )}
                                                    {hasExcess && (
                                                        <Badge className="font-bold text-[10px] uppercase tracking-wider ml-1" variant="destructive">Излишек</Badge>
                                                    )}
                                                </div>

                                                {/* Warehouse & Timing */}
                                                <div className="bg-muted/30 rounded-lg p-2.5 space-y-2 border border-border/50">
                                                    <div className="flex items-center gap-2 text-sm font-bold text-foreground/90">
                                                        <div className="h-2 w-2 rounded-full bg-primary shrink-0" />
                                                        <span className="uppercase text-[10px] tracking-widest opacity-60 font-bold mr-1 shrink-0">ID:</span>
                                                        <span className="truncate font-mono text-xs">{session.invoiceNumber || session.id}</span>
                                                    </div>

                                                    <div className="flex items-center gap-4 flex-wrap text-[11px] font-mono font-medium text-muted-foreground">
                                                        <div className="flex items-center gap-1.5 bg-background/50 px-2 py-0.5 rounded border border-border/30">
                                                            <Calendar className="h-3 w-3 opacity-60" />
                                                            <span>Старт: {new Date(session.createdAt).toLocaleDateString()} {new Date(session.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                        </div>
                                                        {(session.completedAt || session.status === 'completed') && (
                                                            <div className="flex items-center gap-1.5 bg-green-500/5 text-green-600/80 px-2 py-0.5 rounded border border-green-500/10">
                                                                <Check className="h-3 w-3 opacity-80" />
                                                                <span>Финиш: {session.completedAt
                                                                    ? new Date(session.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                                                    : "Завершено"}
                                                                    {session.completedBy && (
                                                                        <span className="opacity-75 font-normal ml-1 border-l border-green-500/20 pl-1.5">
                                                                            {session.completedBy.name}
                                                                        </span>
                                                                    )}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Progress */}
                                        <div className="flex items-center gap-4 lg:gap-6 min-w-full lg:min-w-[240px] pt-4 lg:pt-0 border-t lg:border-t-0 border-border/10">
                                            <div className="flex-1">
                                                <div className="flex justify-between items-end mb-1.5">
                                                    <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground opacity-60">Прогресс</span>
                                                    <div className="text-xl font-black font-mono">
                                                        {scannedItems} <span className="text-muted-foreground text-xs font-normal">/ {totalItems}</span>
                                                    </div>
                                                </div>
                                                <div className="w-full bg-muted/50 h-2.5 rounded-full overflow-hidden p-0.5 border border-muted/10">
                                                    <div
                                                        className={`h-full rounded-full transition-all duration-700 shadow-sm ${progressColor}`}
                                                        style={{ width: `${(scannedItems / (totalItems || 1)) * 100}%` }}
                                                    />
                                                </div>
                                            </div>
                                            <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                                        </div>
                                    </div>
                                </CardContent>
                                {
                                    session.status === 'in_progress' && (
                                        <div className="absolute top-0 left-0 w-1 h-full bg-primary/40" />
                                    )
                                }
                            </Card>
                        )
                    })}

                    {filteredSessions.length === 0 && (
                        <Card className="border-dashed py-12 bg-muted/5">
                            <CardContent className="flex flex-col items-center justify-center text-muted-foreground">
                                <Search className="h-10 w-10 mb-4 opacity-20" />
                                <h3 className="text-lg font-bold text-foreground/70">Ничего не найдено</h3>
                                <p className="text-sm max-w-[240px] text-center mt-1">Попробуйте изменить параметры поиска или создать новую приемку</p>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
}

