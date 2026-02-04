"use client";


import {
    ArrowLeft,
    MapPin,
    Phone,
    Mail,
    Clock,
    Boxes,
    CheckCircle2,
    AlertTriangle,
    Truck,
    Plus,
    Settings,
    Wrench,
    Loader2,
    Globe,
    Server,
    FileText,
    Camera,
    Copy,
    ExternalLink,
    Trash2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useStore } from "@/lib/hooks";

import { useAuth } from "@/contexts/AuthContext";
import { useMemo, useState, useEffect } from "react";
import { YandexMap } from "@/components/maps";
import { EditStoreDialog } from "@/components/stores/edit-store-dialog";
import { AddStoreEquipmentDialog } from "@/components/stores/add-store-equipment-dialog";
import type { StoreStatus, StoreEquipment } from "@/types/api";
import { getMissingEquipment, MANDATORY_EQUIPMENT } from "@/lib/equipment-categories";

import { PingStatusResponse } from "@/types/api";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { toast } from "sonner";

const copyToClipboard = (text: string) => {
    if (!text) return;

    // Try Modern API
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text)
            .then(() => toast.success("Скопировано"))
            .catch(() => fallbackCopy(text));
    } else {
        fallbackCopy(text);
    }
};

const fallbackCopy = (text: string) => {
    try {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "fixed"; // Avoid scrolling to bottom
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();

        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);

        if (successful) {
            toast.success("Скопировано");
        } else {
            toast.error("Ошибка копирования");
        }
    } catch (err) {
        toast.error(" Не удалось скопировать");
    }
};

const conditionMap: Record<string, { label: string; variant: "success" | "warning" | "destructive" | "secondary" }> = {
    NEW: { label: "Новое", variant: "success" },
    GOOD: { label: "Хорошее", variant: "success" },
    FAIR: { label: "Удовлетворительное", variant: "warning" },
    REPAIR: { label: "На ремонте", variant: "destructive" },
};

// Helper for status display
const statusConfig: Record<StoreStatus, { label: string; variant: "success" | "warning" | "destructive" | "secondary" }> = {
    OPEN: { label: "Открыт", variant: "success" },
    CLOSED: { label: "Закрыт", variant: "destructive" },
    RECONSTRUCTION: { label: "Реконструкция", variant: "warning" },
    TECHNICAL_ISSUES: { label: "Тех. проблемы", variant: "secondary" },
};

const getStatusDisplay = (status?: StoreStatus, isActive?: boolean) => {
    if (status && statusConfig[status]) {
        return statusConfig[status];
    }
    return isActive ? { label: "Активен", variant: "success" as const } : { label: "Неактивен", variant: "secondary" as const };
};

// Completeness Logic (Duplicated from stores/page.tsx for consistency)
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

// InfoRow component with copy button and ping status
function InfoRow({
    label,
    value,
    isLink,
    pingStatus
}: {
    label: string;
    value?: string | null;
    isLink?: boolean;
    pingStatus?: boolean;
}) {
    if (!value) return null;

    const handleCopy = () => {
        if (value) copyToClipboard(value);
    };

    return (
        <div className="flex flex-wrap items-center justify-between group py-1.5 border-b border-border/30 last:border-0 gap-2">
            <span className="text-muted-foreground text-[11px] uppercase tracking-tight font-medium shrink-0">{label}</span>
            <div className="flex items-center gap-1.5 min-w-0">
                {pingStatus !== undefined && (
                    <Badge variant={pingStatus ? "success" : "destructive"} className="h-5 px-1.5 text-[10px]">
                        {pingStatus ? "Доступен" : "Недоступен"}
                    </Badge>
                )}
                <div className="flex items-center gap-1">
                    {isLink ? (
                        <a
                            href={value}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline text-xs font-mono flex items-center gap-1"
                        >
                            {value.length > 30 ? value.substring(0, 30) + '...' : value}
                            <ExternalLink className="h-3 w-3" />
                        </a>
                    ) : (
                        <span className="font-mono text-xs select-all">{value}</span>
                    )}
                    <button
                        onClick={handleCopy}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-muted rounded"
                        title="Копировать"
                    >
                        <Copy className="h-3 w-3 text-muted-foreground" />
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function StoreDetailPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;
    const { data: store, isLoading, error, refetch } = useStore(id);
    const { hasRole } = useAuth();
    const [editOpen, setEditOpen] = useState(false);
    const [addEquipmentOpen, setAddEquipmentOpen] = useState(false);
    const [pingStatus, setPingStatus] = useState<PingStatusResponse | null>(null);
    const canDelete = hasRole(['ADMIN', 'MANAGER']);

    // Missing equipment calculation
    const missingEquipment = useMemo(() => {
        // For now, treat store.assets as equipment (will be replaced with real equipment data)
        const storeEquipment: StoreEquipment[] = []; // TODO: Replace with store.equipment when API is ready
        return getMissingEquipment(storeEquipment);
    }, [store]);

    useEffect(() => {
        if (!store) return;

        const checkPing = async () => {
            try {
                const status = await api.get<PingStatusResponse>(`/stores/${id}/ping`);
                setPingStatus(status);
            } catch (err) {
                console.error('Failed to ping store IPs', err);
            }
        };

        // Initial check
        checkPing();

        const interval = setInterval(checkPing, 3000);
        return () => clearInterval(interval);
    }, [id, store]);

    // Calculate stats from assets
    const stats = useMemo(() => {
        if (!store?.assets) return { installed: 0, pending: 0, inTransit: 0 };
        const installed = store.assets.filter((a: any) => a.processStatus === 'INSTALLED').length;
        const pending = store.assets.filter((a: any) => a.processStatus === 'DELIVERED').length;
        const inTransit = store.assets.filter((a: any) => a.processStatus === 'IN_TRANSIT').length;
        return { installed, pending, inTransit };
    }, [store]);

    const completeness = useMemo(() => {
        if (!store) return { status: 'complete', missing: [] };
        return checkStoreCompleteness(store);
    }, [store]);

    return (
        <div className="p-3 sm:p-6 h-full flex flex-col overflow-hidden">
            <div className="space-y-4 sm:space-y-6 animate-fade-in flex-1 overflow-y-auto no-scrollbar">
                {/* Back & Actions */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                    <Link href="/stores">
                        <Button variant="ghost" className="gap-2 h-10 px-3 sm:px-4">
                            <ArrowLeft className="h-4 w-4" />
                            <span className="hidden xs:inline">Назад к магазинам</span>
                            <span className="xs:hidden">Назад</span>
                        </Button>
                    </Link>
                    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 sm:pb-0">
                        <Button variant="outline" size="sm" onClick={() => setEditOpen(true)} className="gap-2 h-10">
                            <Settings className="h-4 w-4" />
                            <span className="hidden sm:inline">Редактировать</span>
                        </Button>
                        {canDelete && (
                            <Button variant="destructive" size="sm" className="gap-2 h-10">
                                <Trash2 className="h-4 w-4" />
                                <span className="hidden sm:inline">Удалить</span>
                            </Button>
                        )}
                        <Button variant="gradient" size="sm" className="gap-2 h-10">
                            <Plus className="h-4 w-4" />
                            <span className="whitespace-nowrap">Создать заявку</span>
                        </Button>
                    </div>
                </div>

                {isLoading ? (
                    <div className="flex items-center justify-center py-24">
                        <Loader2 className="h-12 w-12 animate-spin text-primary" />
                    </div>
                ) : error ? (
                    <div className="text-center py-24 text-red-400">
                        Ошибка загрузки: {error}
                    </div>
                ) : !store ? (
                    <div className="text-center py-24 text-muted-foreground">
                        Магазин не найден
                    </div>
                ) : (
                    <>
                        {/* Top Section: Header & Map */}
                        <div className="grid gap-6 lg:grid-cols-3 mb-6">
                            {/* Store Header - Info & Stats */}
                            <Card className="lg:col-span-2 h-full overflow-hidden">
                                <CardContent className="p-4 sm:p-6 h-full flex flex-col justify-center">
                                    <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
                                        <div className="min-w-0 max-w-md space-y-4">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <Badge variant={getStatusDisplay(store.status, store.isActive).variant}>
                                                    {getStatusDisplay(store.status, store.isActive).label}
                                                </Badge>
                                                {completeness.missing.length > 0 && completeness.missing.map(tag => (
                                                    <Badge key={tag} variant="outline" className={cn(
                                                        "border-transparent",
                                                        completeness.status === 'error' ? "bg-red-500/10 text-red-500" : "bg-amber-500/10 text-amber-500"
                                                    )}>
                                                        {tag}
                                                    </Badge>
                                                ))}
                                            </div>
                                            <div className="flex items-center gap-2 group">
                                                <h1 className="text-3xl font-bold select-all cursor-pointer hover:text-primary transition-colors" title="Нажмите чтобы выделить">
                                                    {store.name}
                                                </h1>
                                                <button
                                                    onClick={() => copyToClipboard(store.name)}
                                                    className="opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-muted rounded-md"
                                                    title="Копировать название"
                                                >
                                                    <Copy className="h-5 w-5 text-muted-foreground" />
                                                </button>
                                            </div>
                                            <div className="space-y-2 text-muted-foreground">
                                                <div className="flex items-center gap-2 group">
                                                    <MapPin className="h-4 w-4 flex-shrink-0" />
                                                    <span className="truncate select-all text-sm font-medium">{store.address}</span>
                                                    <button
                                                        onClick={() => copyToClipboard(store.address)}
                                                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-muted rounded bg-background shadow-sm"
                                                        title="Копировать адрес"
                                                    >
                                                        <Copy className="h-3 w-3 text-muted-foreground" />
                                                    </button>
                                                </div>
                                                {store.phone && (
                                                    <div className="flex items-center gap-2 group">
                                                        <Phone className="h-4 w-4 flex-shrink-0" />
                                                        <span className="select-all text-sm font-medium cursor-pointer">
                                                            {store.phone}
                                                        </span>
                                                        <button
                                                            onClick={() => copyToClipboard(store.phone!)}
                                                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-muted rounded"
                                                            title="Копировать телефон"
                                                        >
                                                            <Copy className="h-3 w-3 text-muted-foreground" />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Stats - Compact Grid */}
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 lg:gap-4 shrink-0">
                                            <div className="flex flex-col items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-4 min-w-[90px]">
                                                <span className="text-3xl font-bold text-emerald-500">{stats.installed}</span>
                                                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mt-1">Установлено</span>
                                            </div>
                                            <div className="flex flex-col items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/20 p-4 min-w-[90px]">
                                                <span className="text-3xl font-bold text-amber-500">{stats.pending}</span>
                                                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mt-1">Ожидает</span>
                                            </div>
                                            <div className="flex flex-col items-center justify-center rounded-xl bg-blue-500/10 border border-blue-500/20 p-4 min-w-[90px]">
                                                <span className="text-3xl font-bold text-blue-500">{stats.inTransit}</span>
                                                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mt-1">В пути</span>
                                            </div>
                                            <div className="flex flex-col items-center justify-center rounded-xl bg-purple-500/10 border border-purple-500/20 p-4 min-w-[90px]">
                                                <span className="text-3xl font-bold text-purple-500">{store.cameraCount || 0}</span>
                                                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mt-1">Камер</span>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Map - Top Right */}
                            <Card className="h-full min-h-[250px] p-0 overflow-hidden relative border-none">
                                <div className="absolute inset-0">
                                    <YandexMap
                                        height="100%"
                                        width="100%"
                                        address={`${store.city || 'Москва'}, ${store.address}`}
                                        placemarks={[]}
                                    />
                                </div>
                            </Card>
                        </div>

                        <div className="grid gap-6 lg:grid-cols-3">
                            {/* Equipment Column */}
                            <div className="lg:col-span-2 space-y-6">
                                {/* Pending Installation Alert */}
                                {stats.pending > 0 && (
                                    <Card className="border-amber-500/50 bg-amber-500/5 overflow-hidden">
                                        <CardHeader className="p-4 md:p-6 pb-2 md:pb-3">
                                            <CardTitle className="flex items-center gap-2 text-amber-600 text-base md:text-lg">
                                                <AlertTriangle className="h-4 w-4 md:h-5 md:w-5" />
                                                <span className="truncate">Доставлено, но не установлено</span>
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="space-y-2">
                                                {store.assets?.filter((a: any) => a.processStatus === 'DELIVERED').map((item: any) => (
                                                    <div key={item.id} className="flex items-center justify-between rounded-lg bg-background/50 p-3">
                                                        <div>
                                                            <p className="font-medium">{item.product?.name}</p>
                                                            <p className="text-sm text-muted-foreground font-mono">{item.serialNumber}</p>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <Badge variant="warning">Ожидает</Badge>
                                                            <Button size="sm" variant="outline">Подтвердить установку</Button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </CardContent>
                                    </Card>
                                )}

                                {/* In Transit */}
                                {stats.inTransit > 0 && (
                                    <Card className="border-blue-500/30 overflow-hidden">
                                        <CardHeader className="p-4 md:p-6 pb-2 md:pb-3">
                                            <CardTitle className="flex items-center gap-2 text-blue-600 text-base md:text-lg">
                                                <Truck className="h-4 w-4 md:h-5 md:w-5" />
                                                <span className="truncate">В пути к магазину</span>
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="space-y-2">
                                                {store.assets?.filter((a: any) => a.processStatus === 'IN_TRANSIT').map((item: any) => (
                                                    <div key={item.id} className="flex items-center justify-between rounded-lg bg-blue-500/5 p-3">
                                                        <div>
                                                            <p className="font-medium">{item.product?.name}</p>
                                                            <p className="text-sm text-muted-foreground font-mono">{item.serialNumber}</p>
                                                        </div>
                                                        <Badge>В пути</Badge>
                                                    </div>
                                                ))}
                                            </div>
                                        </CardContent>
                                    </Card>
                                )}

                                {/* Missing Equipment Alert */}
                                {missingEquipment.length > 0 && (
                                    <div className="p-4 bg-amber-500/5 border border-amber-500/30 rounded-lg">
                                        <div className="flex items-center gap-2 mb-2">
                                            <AlertTriangle className="h-4 w-4 text-amber-600" />
                                            <span className="text-amber-600 text-sm font-medium">Не хватает обязательного оборудования:</span>
                                        </div>
                                        <div className="flex flex-wrap gap-1.5">
                                            {missingEquipment.map(eq => (
                                                <Badge key={eq.category} variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30 text-xs">
                                                    {eq.labelShort}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Installed Equipment */}
                                <Card className="border-border/50 shadow-sm overflow-hidden">
                                    <CardHeader className="flex flex-col xs:flex-row xs:items-center justify-between p-4 md:p-6 space-y-3 xs:space-y-0 gap-2 xs:gap-4">
                                        <div className="min-w-0">
                                            <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                                                <Boxes className="h-4 w-4 md:h-5 md:w-5 text-primary shrink-0" />
                                                <span className="truncate">Установленное оборудование</span>
                                            </CardTitle>
                                            <CardDescription className="text-xs md:text-sm">{stats.installed} единиц</CardDescription>
                                        </div>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="gap-1 h-9 px-3 shrink-0 w-full xs:w-auto justify-center"
                                            onClick={() => setAddEquipmentOpen(true)}
                                        >
                                            <Plus className="h-3.5 w-3.5" />
                                            <span>Добавить</span>
                                        </Button>
                                    </CardHeader>
                                    <CardContent>
                                        {store.assets?.filter((a: any) => a.processStatus === 'INSTALLED').length === 0 ? (
                                            <div className="text-center py-8 text-muted-foreground">
                                                Нет установленного оборудования
                                            </div>
                                        ) : (
                                            <div className="space-y-2">
                                                {store.assets?.filter((a: any) => a.processStatus === 'INSTALLED').map((item: any) => (
                                                    <Link key={item.id} href={`/assets/${item.id}`}>
                                                        <div className="flex items-center justify-between rounded-lg border border-border/50 p-3 hover:bg-accent/30 transition-colors cursor-pointer">
                                                            <div className="flex items-center gap-3">
                                                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
                                                                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                                                                </div>
                                                                <div>
                                                                    <p className="font-medium">{item.product?.name}</p>
                                                                    <p className="text-sm text-muted-foreground font-mono">{item.serialNumber}</p>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <Badge variant={conditionMap[item.condition]?.variant || "success"}>
                                                                    {conditionMap[item.condition]?.label || "Работает"}
                                                                </Badge>
                                                                <Button variant="ghost" size="icon">
                                                                    <Wrench className="h-4 w-4 text-muted-foreground" />
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    </Link>
                                                ))}
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Sidebar Info */}
                            <div className="space-y-6">


                                {/* Store Info */}
                                <Card>
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-base">Основная информация</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-1 text-sm">
                                        <InfoRow label="Код (ЦФО)" value={store.cfo} />
                                        <InfoRow label="Юр.лицо" value={store.legalEntity} />
                                        <InfoRow label="Город" value={store.city} />
                                        <InfoRow label="Регион" value={store.region} />
                                        <InfoRow label="Создан" value={new Date(store.createdAt).toLocaleDateString('ru-RU')} />
                                        {store.creator && <InfoRow label="Кем создан" value={store.creator.name} />}
                                    </CardContent>
                                </Card>

                                {/* Technical Info */}
                                <Card>
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-base flex items-center gap-2">
                                            <Server className="h-4 w-4" />
                                            Техническая информация
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-1 text-sm">
                                        <InfoRow label="Сервер IP" value={store.serverIp} />
                                        <InfoRow label="1 Провайдер IP" value={store.providerIp1} pingStatus={pingStatus?.provider1} />
                                        <InfoRow label="2 Провайдер IP" value={store.providerIp2} pingStatus={pingStatus?.provider2} />
                                        <InfoRow label="УТМ" value={store.utmUrl} isLink />
                                        <InfoRow label="Retail" value={store.retailUrl} isLink />
                                    </CardContent>
                                </Card>

                                {/* Legal Info */}
                                <Card>
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-base flex items-center gap-2">
                                            <FileText className="h-4 w-4" />
                                            Юридическая информация
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-1 text-sm">
                                        <InfoRow label="ИНН" value={store.inn} />
                                        <InfoRow label="КПП" value={store.kpp} />
                                        <InfoRow label="ФСРАР" value={store.fsrarId} />
                                    </CardContent>
                                </Card>

                                {/* Requests */}
                                {store.requests && store.requests.length > 0 && (
                                    <Card>
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-base">Заявки</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="space-y-3">
                                                {store.requests.slice(0, 5).map((request: any) => (
                                                    <Link key={request.id} href={`/requests/${request.id}`}>
                                                        <div className="border-l-2 border-border pl-3 hover:border-primary transition-colors cursor-pointer">
                                                            <p className="text-xs text-muted-foreground">
                                                                {new Date(request.createdAt).toLocaleDateString('ru-RU')}
                                                            </p>
                                                            <p className="font-medium text-sm">{request.title}</p>
                                                            <Badge variant="secondary" className="mt-1">{request.status}</Badge>
                                                        </div>
                                                    </Link>
                                                ))}
                                            </div>
                                        </CardContent>
                                    </Card>
                                )}
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Edit Store Dialog */}
            {store && (
                <EditStoreDialog
                    store={store}
                    open={editOpen}
                    onOpenChange={setEditOpen}
                    onSuccess={() => refetch()}
                />
            )}

            {/* Add Equipment Dialog */}
            {store && (
                <AddStoreEquipmentDialog
                    storeId={store.id}
                    storeName={store.name}
                    open={addEquipmentOpen}
                    onOpenChange={setAddEquipmentOpen}
                    onSuccess={() => refetch()}
                />
            )}
        </div>
    );
}
