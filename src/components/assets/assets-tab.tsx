"use client";

import { Boxes, Filter, QrCode, MapPin, Wrench, AlertCircle, HardDrive, CheckCircle2, Truck, History } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, StatCard } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAssets } from "@/lib/hooks";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AddAssetDialog } from "@/components/assets/add-asset-dialog";
import { EditAssetDialog } from "@/components/assets/edit-asset-dialog";
import { cn } from "@/lib/utils";
import { Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Asset } from "@/types/api";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";

const processStatusMap: Record<string, { label: string; variant: "default" | "success" | "warning" | "destructive" | "secondary" | "info" }> = {
    AVAILABLE: { label: "Свободно", variant: "success" },
    RESERVED: { label: "Резерв", variant: "warning" },
    IN_TRANSIT: { label: "В доставке", variant: "info" },
    DELIVERED: { label: "Доставлено", variant: "success" },
    INSTALLED: { label: "Установлено", variant: "success" },
};

const conditionMap: Record<string, { label: string; variant: "success" | "warning" | "destructive" | "secondary" | "default" | "outline" }> = {
    WORKING: { label: "Рабочее", variant: "success" },
    NEEDS_REPAIR: { label: "Требует ремонта", variant: "warning" },
    IN_REPAIR: { label: "В ремонте", variant: "default" }, // purple-ish usually default or custom
    UNKNOWN: { label: "Неизвестно", variant: "secondary" },
    DECOMMISSIONED: { label: "Списано", variant: "outline" },
};

interface AssetsTabProps {
    onStartInventory?: () => void;
    onShowHistory?: () => void;
}

export function AssetsTab({ onStartInventory, onShowHistory }: AssetsTabProps) {
    const { data: assets, isLoading, error, refetch } = useAssets();
    const { hasRole } = useAuth();
    const router = useRouter();

    // Filters State
    const [search, setSearch] = useState("");
    const [selectedModels, setSelectedModels] = useState<string[]>([]);
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [installFilter, setInstallFilter] = useState<string>("all"); // all, installed, not_installed
    const [openModel, setOpenModel] = useState(false);

    const [deleteItem, setDeleteItem] = useState<Asset | null>(null);

    // Compute stats from real data
    const stats = useMemo(() => {
        const available = assets.filter(a => a.processStatus === 'AVAILABLE').length;
        const installed = assets.filter(a => a.processStatus === 'INSTALLED').length;
        const inTransit = assets.filter(a => a.processStatus === 'IN_TRANSIT').length;
        const repair = assets.filter(a => a.condition === 'IN_REPAIR' || a.condition === 'NEEDS_REPAIR').length;
        return { available, installed, inTransit, repair };
    }, [assets]);

    // Derived Data
    const uniqueModels = useMemo(() => {
        const models = new Set(assets.map(a => a.product?.name).filter((n): n is string => Boolean(n)));
        return Array.from(models).sort();
    }, [assets]);

    // Filter assets
    const filteredAssets = useMemo(() => {
        return assets.filter(a => {
            // 1. Search
            if (search) {
                const s = search.toLowerCase();
                if (!a.serialNumber.toLowerCase().includes(s) && !a.product?.name?.toLowerCase().includes(s)) {
                    return false;
                }
            }

            // 2. Models (Multi-select)
            if (selectedModels.length > 0) {
                if (!a.product?.name || !selectedModels.includes(a.product.name)) {
                    return false;
                }
            }

            // 3. Status
            if (statusFilter !== "all") {
                if (a.processStatus !== statusFilter) return false;
            }

            // 4. Installed / Not Installed
            if (installFilter !== "all") {
                const isInstalled = a.processStatus === 'INSTALLED';
                if (installFilter === 'installed' && !isInstalled) return false;
                if (installFilter === 'not_installed' && isInstalled) return false;
            }

            return true;
        });
    }, [assets, search, selectedModels, statusFilter, installFilter]);

    const confirmDelete = async () => {
        if (!deleteItem) return;
        try {
            await api.delete(`/assets/${deleteItem.id}`);
            toast.success("Оборудование удалено");
            refetch();
            setDeleteItem(null);
        } catch (error) {
            toast.error("Ошибка при удалении");
            console.error(error);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header removed as per request */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-end">
                <div className="grid grid-cols-2 gap-3 w-full md:w-auto md:flex md:items-center md:gap-2">
                    <Button
                        variant="outline"
                        className="w-full md:w-auto h-12 md:h-10 px-2"
                        onClick={() => {
                            if (onStartInventory) {
                                onStartInventory();
                            } else {
                                toast.info("Функционал инвентаризации в разработке");
                            }
                        }}
                    >
                        <QrCode className="h-4 w-4 mr-2 shrink-0" />
                        <span className="truncate">Начать</span>
                    </Button>
                    <Button
                        variant="outline"
                        className="w-full md:w-auto h-12 md:h-10"
                        onClick={onShowHistory}
                    >
                        <History className="h-4 w-4 mr-2 shrink-0" />
                        <span className="truncate">История</span>
                    </Button>
                    {/* Add Asset button removed */}
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4 animate-stagger">
                <StatCard
                    title="Свободно"
                    value={stats.available.toString()}
                    icon={<Boxes className="h-5 w-5" />}
                    status="success"
                />
                <StatCard
                    title="Установлено"
                    value={stats.installed.toString()}
                    icon={<CheckCircle2 className="h-5 w-5" />}
                    status="accent"
                />
                <StatCard
                    title="В доставке"
                    value={stats.inTransit.toString()}
                    icon={<Truck className="h-5 w-5" />}
                    status="default"
                />
                <StatCard
                    title="В ремонте"
                    value={stats.repair.toString()}
                    icon={<Wrench className="h-5 w-5" />}
                    status="danger"
                />
            </div>

            {/* Filters */}
            <Card>
                <CardContent className="p-4">
                    <div className="flex flex-col xl:flex-row gap-4">
                        <div className="flex-1 min-w-[200px]">
                            <SearchInput
                                placeholder="Поиск по серийному номеру..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>

                        {/* Filters Group */}
                        <div className="flex flex-wrap gap-2 items-center">
                            {/* Model Multi-Select */}
                            <Popover open={openModel} onOpenChange={setOpenModel}>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" role="combobox" aria-expanded={openModel} className="min-w-[180px] justify-between">
                                        {selectedModels.length === 0
                                            ? "Модель"
                                            : `Выбрано: ${selectedModels.length}`}
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[250px] p-0">
                                    <Command>
                                        <CommandInput placeholder="Поиск модели..." />
                                        <CommandList>
                                            <CommandEmpty>Модель не найдена.</CommandEmpty>
                                            <CommandGroup>
                                                {uniqueModels.map((model) => (
                                                    <CommandItem
                                                        key={model}
                                                        value={model}
                                                        onSelect={() => {
                                                            setSelectedModels(prev =>
                                                                prev.includes(model)
                                                                    ? prev.filter(m => m !== model)
                                                                    : [...prev, model]
                                                            );
                                                        }}
                                                    >
                                                        <Check
                                                            className={cn(
                                                                "mr-2 h-4 w-4",
                                                                selectedModels.includes(model) ? "opacity-100" : "opacity-0"
                                                            )}
                                                        />
                                                        {model}
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>

                            {/* Status Filter */}
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger className="w-[180px]">
                                    <SelectValue placeholder="Статус" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Все статусы</SelectItem>
                                    {Object.entries(processStatusMap).map(([key, { label }]) => (
                                        <SelectItem key={key} value={key}>{label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            {/* Installation Filter */}
                            <Select value={installFilter} onValueChange={setInstallFilter}>
                                <SelectTrigger className="w-[180px]">
                                    <SelectValue placeholder="Установка" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Все</SelectItem>
                                    <SelectItem value="installed">Установлено</SelectItem>
                                    <SelectItem value="not_installed">Не установлено</SelectItem>
                                </SelectContent>
                            </Select>

                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                    setSearch("");
                                    setSelectedModels([]);
                                    setStatusFilter("all");
                                    setInstallFilter("all");
                                }}
                                title="Сбросить фильтры"
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Assets Table */}
            <Card variant="elevated">
                <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                            <HardDrive className="h-4 w-4 text-primary" />
                        </div>
                        Список оборудования ({filteredAssets.length})
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-12 gap-3">
                            <div className="h-12 w-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
                            <p className="text-muted-foreground">Загрузка оборудования...</p>
                        </div>
                    ) : error ? (
                        <div className="flex flex-col items-center justify-center py-12 gap-3">
                            <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
                                <AlertCircle className="h-6 w-6 text-destructive" />
                            </div>
                            <p className="text-destructive font-medium">Ошибка загрузки: {error}</p>
                        </div>
                    ) : filteredAssets.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 gap-3">
                            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                                <Boxes className="h-6 w-6 text-muted-foreground" />
                            </div>
                            <p className="text-muted-foreground">{search ? "Ничего не найдено" : "Нет оборудования"}</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Серийный номер</th>
                                        <th>Модель</th>
                                        <th>Локация</th>
                                        <th>Статус</th>
                                        <th>Состояние</th>
                                        <th>Действия</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredAssets.map((asset, index) => (
                                        <tr
                                            key={asset.id}
                                            className="animate-fade-in group cursor-pointer hover:bg-muted/50"
                                            style={{ animationDelay: `${index * 20}ms` }}
                                            onClick={() => router.push(`/assets/${asset.id}`)}
                                        >
                                            <td>
                                                <span className="font-mono text-sm font-medium text-primary">
                                                    {asset.serialNumber}
                                                </span>
                                            </td>
                                            <td className="font-medium">{asset.product?.name || '-'}</td>
                                            <td className="text-muted-foreground text-sm">
                                                <div className="flex items-center gap-1.5">
                                                    <MapPin className="h-3.5 w-3.5" />
                                                    {asset.store?.name || asset.warehouse?.name || 'Не указано'}
                                                </div>
                                            </td>
                                            <td>
                                                <Badge variant={processStatusMap[asset.processStatus]?.variant || "secondary"}>
                                                    {processStatusMap[asset.processStatus]?.label || asset.processStatus}
                                                </Badge>
                                            </td>
                                            <td>
                                                <Badge variant={conditionMap[asset.condition]?.variant || "secondary"} className="cursor-pointer">
                                                    {conditionMap[asset.condition]?.label || asset.condition}
                                                </Badge>
                                            </td>
                                            <td>
                                                {hasRole(['ADMIN', 'MANAGER']) && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 w-8 p-0"
                                                        onClick={(e) => { e.stopPropagation(); setDeleteItem(asset); }}
                                                        title="Удалить"
                                                    >
                                                        <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive transition-colors" />
                                                    </Button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>



            <Dialog open={!!deleteItem} onOpenChange={(open) => !open && setDeleteItem(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Удалить оборудование?</DialogTitle>
                        <DialogDescription>
                            Вы уверены, что хотите удалить оборудование с серийным номером
                            <span className="font-mono font-bold text-foreground mx-1">
                                {deleteItem?.serialNumber}
                            </span>?
                            <br />
                            Вся история перемещений этого оборудования также будет удалена.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setDeleteItem(null)}>
                            Отмена
                        </Button>
                        <Button variant="destructive" onClick={confirmDelete}>
                            Удалить
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
