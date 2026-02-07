"use client";


import { Store, Plus, Filter, MapPin, Boxes, AlertTriangle, CheckCircle2, Loader2, ArrowUpRight, Building2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, StatCard } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useStores } from "@/lib/hooks";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ImportStoresDialog } from "@/components/stores/import-stores-dialog";
import { CreateStoreDialog } from "@/components/stores/create-store-dialog";
import type { StoreStatus, StoreEquipment } from "@/types/api";
import { cn } from "@/lib/utils";
import { getMissingEquipment } from "@/lib/equipment-categories";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

// Helper for status display
const statusConfig: Record<StoreStatus, { label: string; variant: "success" | "warning" | "destructive" | "secondary" }> = {
    OPEN: { label: "Открыт", variant: "success" },
    CLOSED: { label: "Закрыт", variant: "secondary" },
    RECONSTRUCTION: { label: "Реконструкция", variant: "warning" },
    TECHNICAL_ISSUES: { label: "Тех. проблемы", variant: "destructive" },
};

const getStatusDisplay = (status?: StoreStatus, isActive?: boolean) => {
    if (status && statusConfig[status]) {
        return statusConfig[status];
    }
    // Fallback to isActive for legacy data
    return isActive ? { label: "Активен", variant: "success" as const } : { label: "Неактивен", variant: "secondary" as const };
};

// Completeness Logic
const checkStoreCompleteness = (store: any) => {
    const missingMandatory: string[] = [];
    const missingRecommended: string[] = [];

    // Mandatory: SAP, Status, Address, City, Region, CFO, Server IP, Legal Entity, Provider IP (>=1)
    if (!store.name) missingMandatory.push("SAP");
    if (!store.status) missingMandatory.push("Статус");
    if (!store.address) missingMandatory.push("Адрес");
    if (!store.city) missingMandatory.push("Город");
    if (!store.cfo) missingMandatory.push("ЦФО");
    if (!store.serverIp) missingMandatory.push("IP Сервера");
    if (!store.legalEntity) missingMandatory.push("Юр. лицо");
    if (!store.providerIp1 && !store.providerIp2) missingMandatory.push("IP Провайдера");

    // Check for missing mandatory equipment
    const storeEquipment: StoreEquipment[] = store.equipment || [];
    const missingEquipment = getMissingEquipment(storeEquipment);
    if (missingEquipment.length > 0) {
        // Add a summary indicator instead of listing all 14 items
        missingMandatory.push(`Оборуд. (${missingEquipment.length})`);
    }

    // Recommended: Phone, FSRAR, INN, KPP
    if (!store.phone) missingRecommended.push("Телефон");
    if (!store.fsrarId) missingRecommended.push("ФСРАР");
    if (!store.inn) missingRecommended.push("ИНН");
    if (!store.kpp) missingRecommended.push("КПП");

    if (missingMandatory.length > 0) {
        return { status: 'error', missing: missingMandatory };
    }
    if (missingRecommended.length > 0) {
        return { status: 'warning', missing: missingRecommended };
    }
    return { status: 'complete', missing: [] };
};

export default function StoresPage() {
    const { data: stores, isLoading, error } = useStores();
    const [search, setSearch] = useState("");
    const [regionFilter, setRegionFilter] = useState<string>("all");
    const [statusFilter, setStatusFilter] = useState<StoreStatus | "ALL">("ALL");
    const [onlyProblems, setOnlyProblems] = useState(false);

    // Compute stats
    const stats = useMemo(() => {
        const open = stores.filter(s => s.status === 'OPEN').length;
        const closed = stores.filter(s => s.status === 'CLOSED').length;
        const reconstruction = stores.filter(s => s.status === 'RECONSTRUCTION').length;
        const issues = stores.filter(s => s.status === 'TECHNICAL_ISSUES').length;
        return { open, closed, reconstruction, issues };
    }, [stores]);

    // Get unique regions
    const regions = useMemo(() => {
        const unique = new Set(stores.map(s => s.region).filter(Boolean));
        return Array.from(unique).sort();
    }, [stores]);

    // Filter stores
    const filteredStores = useMemo(() => {
        return stores.filter(store => {
            // Search
            if (search) {
                const s = search.toLowerCase();
                const matchesSearch =
                    store.name.toLowerCase().includes(s) ||
                    store.address.toLowerCase().includes(s) ||
                    store.region?.toLowerCase().includes(s);
                if (!matchesSearch) return false;
            }

            // Region
            if (regionFilter !== "all" && store.region !== regionFilter) return false;

            // Status
            if (statusFilter !== "ALL" && store.status !== statusFilter) return false;

            // Problems (e.g. Technical Issues or has pending items > 0)
            if (onlyProblems) {
                const hasIssues = store.status === 'TECHNICAL_ISSUES' || (store.stats?.pending || 0) > 0;
                if (!hasIssues) return false;
            }

            return true;
        });
    }, [stores, search, regionFilter, statusFilter, onlyProblems]);

    return (
        <div className="p-6">
            <div className="space-y-6">

                {/* Page Header */}
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">Магазины</h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            Управление точками и установленным оборудованием
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <ImportStoresDialog onSuccess={() => window.location.reload()} />
                        <CreateStoreDialog onSuccess={() => window.location.reload()} />
                    </div>
                </div>

                {/* Stats */}
                <div className="grid gap-4 md:grid-cols-4 animate-stagger">
                    <StatCard
                        title="Открытые"
                        value={stats.open.toString()}
                        icon={<CheckCircle2 className="h-5 w-5" />}
                        status="success"
                        onClick={() => setStatusFilter(statusFilter === 'OPEN' ? 'ALL' : 'OPEN')}
                        className={cn("cursor-pointer transition-all hover:scale-[1.02]", statusFilter === 'OPEN' && "ring-2 ring-emerald-500")}
                    />
                    <StatCard
                        title="Закрытые"
                        value={stats.closed.toString()}
                        icon={<Store className="h-5 w-5" />}
                        status="default"
                        onClick={() => setStatusFilter(statusFilter === 'CLOSED' ? 'ALL' : 'CLOSED')}
                        className={cn("cursor-pointer transition-all hover:scale-[1.02]", statusFilter === 'CLOSED' && "ring-2 ring-muted-foreground")}
                    />
                    <StatCard
                        title="На реконструкции"
                        value={stats.reconstruction.toString()}
                        icon={<MapPin className="h-5 w-5" />}
                        status="warning"
                        onClick={() => setStatusFilter(statusFilter === 'RECONSTRUCTION' ? 'ALL' : 'RECONSTRUCTION')}
                        className={cn("cursor-pointer transition-all hover:scale-[1.02]", statusFilter === 'RECONSTRUCTION' && "ring-2 ring-amber-500")}
                    />
                    <StatCard
                        title="Тех. проблемы"
                        value={stats.issues.toString()}
                        icon={<AlertTriangle className="h-5 w-5" />}
                        status="danger"
                        onClick={() => setStatusFilter(statusFilter === 'TECHNICAL_ISSUES' ? 'ALL' : 'TECHNICAL_ISSUES')}
                        className={cn("cursor-pointer transition-all hover:scale-[1.02]", statusFilter === 'TECHNICAL_ISSUES' && "ring-2 ring-destructive")}
                    />
                </div>

                {/* Filters */}
                <Card className="border-border/50 shadow-sm overflow-hidden bg-card/10 backdrop-blur-sm">
                    <CardContent className="p-3 md:p-5 space-y-4">
                        <div className="flex flex-col xl:flex-row gap-4">
                            {/* Search */}
                            <div className="flex-1 min-w-0">
                                <SearchInput
                                    placeholder="Поиск по названию или адресу..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="h-12 md:h-14 rounded-2xl bg-muted/20 border-border/50 focus-visible:ring-1 focus-visible:ring-primary/30 text-base font-medium transition-all"
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 xl:flex items-stretch gap-3">
                                {/* Region Select */}
                                <Select value={regionFilter} onValueChange={setRegionFilter}>
                                    <SelectTrigger className="h-12 md:h-14 w-full xl:w-[240px] rounded-2xl bg-muted/20 border-border/50 text-left px-4 hover:bg-muted/30 transition-all font-semibold">
                                        <div className="flex items-center gap-2 truncate">
                                            <MapPin className="h-4 w-4 shrink-0 text-primary/70" />
                                            <div className="flex flex-col items-start leading-none overflow-hidden">
                                                <span className="text-[10px] uppercase tracking-widest opacity-60 mb-0.5">Регион</span>
                                                <SelectValue placeholder="Все регионы" />
                                            </div>
                                        </div>
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl">
                                        <SelectItem value="all">Все регионы</SelectItem>
                                        {regions.map(region => (
                                            <SelectItem key={region} value={region as string}>{region}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                {/* Problems Toggle */}
                                <Button
                                    variant={onlyProblems ? "destructive" : "outline"}
                                    onClick={() => setOnlyProblems(!onlyProblems)}
                                    className={cn(
                                        "h-12 md:h-14 px-6 rounded-2xl border-2 transition-all duration-300 gap-3 font-bold tracking-tight",
                                        onlyProblems
                                            ? "border-destructive/50 bg-destructive/5 text-destructive"
                                            : "border-dashed border-border/40 hover:border-primary/30 hover:bg-primary/5 text-muted-foreground/70"
                                    )}
                                >
                                    <div className={cn(
                                        "p-1.5 rounded-lg transition-colors",
                                        onlyProblems ? "bg-destructive text-white" : "bg-muted/50 text-muted-foreground"
                                    )}>
                                        <AlertTriangle className="h-4 w-4" />
                                    </div>
                                    <span>Проблемные</span>
                                </Button>
                            </div>
                        </div>

                        {/* Status Filters - No Scroll, Wrapping Grid */}
                        <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-1.5 p-1.5 bg-muted/10 rounded-2xl border border-border/20">
                            <button
                                onClick={() => setStatusFilter('ALL')}
                                className={cn(
                                    "flex items-center justify-center px-4 py-2.5 rounded-xl text-[13px] font-bold transition-all duration-300",
                                    statusFilter === 'ALL'
                                        ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/20'
                                        : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                                )}
                            >
                                Все
                            </button>
                            {Object.entries(statusConfig).map(([status, config]) => (
                                <button
                                    key={status}
                                    onClick={() => setStatusFilter(status as StoreStatus)}
                                    className={cn(
                                        "flex items-center justify-center px-4 py-2.5 rounded-xl text-[13px] font-bold transition-all duration-300 whitespace-nowrap",
                                        statusFilter === status
                                            ? "bg-card text-foreground shadow-md border border-border/50 scale-[1.02]"
                                            : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                                    )}
                                >
                                    {config.label}
                                </button>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Stores Grid */}
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-3">
                        <div className="h-12 w-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
                        <p className="text-muted-foreground">Загрузка магазинов...</p>
                    </div>
                ) : error ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-3">
                        <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
                            <AlertTriangle className="h-6 w-6 text-destructive" />
                        </div>
                        <p className="text-destructive font-medium">Ошибка загрузки: {error}</p>
                    </div>
                ) : filteredStores.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-3">
                        <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                            <Store className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <p className="text-muted-foreground">{search ? "Ничего не найдено" : "Нет магазинов"}</p>
                    </div>
                ) : (
                    <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
                        {filteredStores.map((store, index) => {
                            const completeness = checkStoreCompleteness(store);
                            const isError = completeness.status === 'error';
                            const isWarning = completeness.status === 'warning';

                            return (
                                <Link key={store.id} href={`/stores/${store.id}`}>
                                    <Card
                                        variant="elevated"
                                        interactive
                                        className={cn(
                                            "h-full animate-fade-in relative overflow-hidden transition-all duration-300",
                                            // Warmer, softer colors for states
                                            isError && "border-rose-500/30 bg-rose-500/[0.02] shadow-sm hover:border-rose-500/50",
                                            isWarning && "border-orange-500/30 bg-orange-500/[0.02] shadow-sm hover:border-orange-500/50"
                                        )}
                                        style={{ animationDelay: `${index * 20}ms` }}
                                    >
                                        {/* Status Strip - Thinner and warmer */}
                                        {(isError || isWarning) && (
                                            <div className={cn(
                                                "absolute left-0 top-0 bottom-0 w-[3px]",
                                                isError ? "bg-rose-500/80" : "bg-orange-500/80"
                                            )} />
                                        )}

                                        <CardHeader className="p-3 pb-1">
                                            <div className="flex items-center justify-between gap-2">
                                                <Badge variant={getStatusDisplay(store.status, store.isActive).variant} dot className="text-[10px] px-1.5 py-0">
                                                    {getStatusDisplay(store.status, store.isActive).label}
                                                </Badge>

                                                {(isError || isWarning) && (
                                                    <div className="flex gap-1 h-5 overflow-hidden">
                                                        <Badge variant="outline" className={cn(
                                                            "text-[9px] px-1 border-transparent font-medium",
                                                            isError ? "bg-rose-500/10 text-rose-600" : "bg-orange-500/10 text-orange-600"
                                                        )}>
                                                            <AlertTriangle className="h-2.5 w-2.5 mr-0.5" />
                                                            {completeness.missing.length}
                                                        </Badge>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="mt-2 flex items-center gap-2">
                                                <div className={cn(
                                                    "shrink-0 rounded-lg flex items-center justify-center h-8 w-8 transition-colors",
                                                    isError ? "bg-rose-500/10" : isWarning ? "bg-orange-500/10" : "bg-primary/10"
                                                )}>
                                                    <Building2 className={cn(
                                                        "h-4 w-4",
                                                        isError ? "text-rose-500" : isWarning ? "text-orange-500" : "text-primary"
                                                    )} />
                                                </div>
                                                <CardTitle className="text-base font-bold tracking-tight truncate">
                                                    {store.name}
                                                </CardTitle>
                                            </div>
                                            <CardDescription className="flex items-center gap-1.5 text-muted-foreground mt-1 text-[11px] leading-tight">
                                                <MapPin className="shrink-0 h-3 w-3" />
                                                <span className="truncate">{store.address}</span>
                                            </CardDescription>
                                        </CardHeader>

                                        <CardContent className="p-3 pt-2">
                                            <div className="flex items-center justify-between border-t border-border/50 pt-2">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex items-center gap-1 text-success/80">
                                                        <CheckCircle2 className="h-3.5 w-3.5" />
                                                        <span className="font-bold text-xs">{store.stats?.installed || 0}</span>
                                                    </div>
                                                    {(store.stats?.pending || 0) > 0 && (
                                                        <div className="flex items-center gap-1 text-warning/80">
                                                            <AlertTriangle className="h-3.5 w-3.5" />
                                                            <span className="font-bold text-xs">{store.stats?.pending || 0}</span>
                                                        </div>
                                                    )}
                                                    {(store.stats?.inTransit || 0) > 0 && (
                                                        <div className="flex items-center gap-1 text-info/80">
                                                            <Boxes className="h-3.5 w-3.5" />
                                                            <span className="font-bold text-xs">{store.stats?.inTransit || 0}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            {store.region && (
                                                <p className="mt-2 text-muted-foreground truncate font-medium text-xs">{store.region}</p>
                                            )}
                                            {store.creator && (
                                                <p className="text-[9px] text-muted-foreground mt-1 truncate">
                                                    Создал: {store.creator.name}
                                                </p>
                                            )}
                                        </CardContent>
                                    </Card>
                                </Link>
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
