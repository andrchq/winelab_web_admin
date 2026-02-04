"use client";


import { Boxes, Filter, QrCode, MapPin, Wrench, AlertCircle, HardDrive, CheckCircle2, Truck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, StatCard } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAssets } from "@/lib/hooks";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AddAssetDialog } from "@/components/assets/add-asset-dialog";
import { cn } from "@/lib/utils";
import { Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Asset } from "@/types/api";

const processStatusMap: Record<string, { label: string; variant: "default" | "success" | "warning" | "destructive" | "secondary" | "info" }> = {
    AVAILABLE: { label: "Свободно", variant: "success" },
    RESERVED: { label: "Резерв", variant: "warning" },
    IN_TRANSIT: { label: "В доставке", variant: "info" },
    DELIVERED: { label: "Доставлено", variant: "success" },
    INSTALLED: { label: "Установлено", variant: "success" },
};

const conditionMap: Record<string, { label: string; variant: "success" | "warning" | "destructive" | "secondary" }> = {
    WORKING: { label: "Рабочее", variant: "success" },
    NEEDS_REPAIR: { label: "Требует ремонта", variant: "warning" },
    IN_REPAIR: { label: "В ремонте", variant: "destructive" },
    BROKEN: { label: "Сломано", variant: "destructive" },
    DECOMMISSIONED: { label: "Списано", variant: "secondary" },
};

export default function AssetsPage() {
    const { data: assets, isLoading, error, refetch } = useAssets();
    const [search, setSearch] = useState("");
    const [deleteItem, setDeleteItem] = useState<Asset | null>(null);

    // Compute stats from real data
    const stats = useMemo(() => {
        const available = assets.filter(a => a.processStatus === 'AVAILABLE').length;
        const installed = assets.filter(a => a.processStatus === 'INSTALLED').length;
        const inTransit = assets.filter(a => a.processStatus === 'IN_TRANSIT').length;
        const repair = assets.filter(a => a.condition === 'REPAIR').length;
        return { available, installed, inTransit, repair };
    }, [assets]);

    // Filter assets by search
    const filteredAssets = useMemo(() => {
        if (!search) return assets;
        const s = search.toLowerCase();
        return assets.filter(a =>
            a.serialNumber.toLowerCase().includes(s) ||
            a.product?.name?.toLowerCase().includes(s)
        );
    }, [assets, search]);

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
        <div className="p-6 h-full">
            <div className="space-y-6">
                {/* Page Header */}
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">Серийное оборудование</h1>
                        <p className="text-sm text-muted-foreground mt-1">Учёт оборудования по серийным номерам</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <Button variant="outline" className="w-full sm:w-auto">
                            <QrCode className="h-4 w-4 mr-2" />
                            Сканировать SN
                        </Button>
                        <AddAssetDialog />
                    </div>
                </div>

                {/* Stats */}
                <div className="grid gap-4 md:grid-cols-4 animate-stagger">
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
                        <div className="flex flex-wrap gap-4 items-center">
                            <div className="flex-1 min-w-[200px] max-w-md">
                                <SearchInput
                                    placeholder="Поиск по серийному номеру..."
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
                                                className="animate-fade-in group"
                                                style={{ animationDelay: `${index * 20}ms` }}
                                            >
                                                <td>
                                                    <Link href={`/assets/${asset.id}`} className="font-mono text-sm font-medium text-primary hover:underline">
                                                        {asset.serialNumber}
                                                    </Link>
                                                </td>
                                                <td className="font-medium">{asset.product?.name || '-'}</td>
                                                <td className="text-muted-foreground text-sm">
                                                    <div className="flex items-center gap-1.5">
                                                        <MapPin className="h-3.5 w-3.5" />
                                                        {asset.store?.name || asset.warehouse?.name || 'Не указано'}
                                                    </div>
                                                </td>
                                                <td>
                                                    <Badge variant={processStatusMap[asset.processStatus]?.variant || "secondary"} dot>
                                                        {processStatusMap[asset.processStatus]?.label || asset.processStatus}
                                                    </Badge>
                                                </td>
                                                <td>
                                                    <Badge variant={conditionMap[asset.condition]?.variant || "secondary"} size="sm">
                                                        {conditionMap[asset.condition]?.label || asset.condition}
                                                    </Badge>
                                                </td>
                                                <td>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 w-8 p-0"
                                                        onClick={() => setDeleteItem(asset)}
                                                        title="Удалить"
                                                    >
                                                        <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive transition-colors" />
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

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
