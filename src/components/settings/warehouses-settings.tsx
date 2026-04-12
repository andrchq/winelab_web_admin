"use client";

import { useMemo, useState } from "react";
import { AlertCircle, MapPin, Trash2, Warehouse } from "lucide-react";
import { toast } from "sonner";

import { AddWarehouseDialog } from "@/components/warehouses/add-warehouse-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SearchInput } from "@/components/ui/input";
import { api } from "@/lib/api";
import { useWarehouses } from "@/lib/hooks";
import type { Warehouse as WarehouseType } from "@/types/api";

const TEXT = {
    title: "\u0421\u043a\u043b\u0430\u0434\u044b",
    description: "\u0417\u0434\u0435\u0441\u044c \u043d\u0430\u0441\u0442\u0440\u0430\u0438\u0432\u0430\u0435\u0442\u0441\u044f \u0442\u043e\u043f\u043e\u043b\u043e\u0433\u0438\u044f \u0441\u043a\u043b\u0430\u0434\u043e\u0432 \u0438 \u0438\u0445 \u0431\u0430\u0437\u043e\u0432\u044b\u0435 \u0440\u0430\u0431\u043e\u0447\u0438\u0435 \u043f\u0430\u0440\u0430\u043c\u0435\u0442\u0440\u044b.",
    searchPlaceholder: "\u041f\u043e\u0438\u0441\u043a \u043f\u043e \u043d\u0430\u0437\u0432\u0430\u043d\u0438\u044e \u0438\u043b\u0438 \u0430\u0434\u0440\u0435\u0441\u0443...",
    total: "\u0412\u0441\u0435\u0433\u043e",
    initialized: "\u0418\u043d\u0438\u0446\u0438\u0430\u043b\u0438\u0437\u0438\u0440\u043e\u0432\u0430\u043d\u044b",
    pending: "\u0411\u0435\u0437 \u043f\u0435\u0440\u0432\u0438\u0447\u043d\u043e\u0439 \u0438\u043d\u0432\u0435\u043d\u0442\u0430\u0440\u0438\u0437\u0430\u0446\u0438\u0438",
    loading: "\u0417\u0430\u0433\u0440\u0443\u0437\u043a\u0430 \u0441\u043a\u043b\u0430\u0434\u043e\u0432...",
    empty: "\u0421\u043a\u043b\u0430\u0434\u044b \u043d\u0435 \u043d\u0430\u0439\u0434\u0435\u043d\u044b",
    deleteConfirm: "\u0423\u0434\u0430\u043b\u0438\u0442\u044c \u044d\u0442\u043e\u0442 \u0441\u043a\u043b\u0430\u0434?",
    deleteSuccess: "\u0421\u043a\u043b\u0430\u0434 \u0443\u0434\u0430\u043b\u0435\u043d",
    deleteError: "\u041e\u0448\u0438\u0431\u043a\u0430 \u043f\u0440\u0438 \u0443\u0434\u0430\u043b\u0435\u043d\u0438\u0438 \u0441\u043a\u043b\u0430\u0434\u0430",
    initializedBadge: "\u0418\u043d\u0438\u0446\u0438\u0430\u043b\u0438\u0437\u0438\u0440\u043e\u0432\u0430\u043d",
    pendingBadge: "\u041d\u0443\u0436\u043d\u0430 \u043f\u0435\u0440\u0432\u0438\u0447\u043d\u0430\u044f \u0438\u043d\u0432\u0435\u043d\u0442\u0430\u0440\u0438\u0437\u0430\u0446\u0438\u044f",
    stockPositions: "\u041f\u043e\u0437\u0438\u0446\u0438\u0439",
    totalVolume: "\u041e\u0431\u0449\u0438\u0439 \u043e\u0431\u044a\u0435\u043c",
    loadError: "\u041e\u0448\u0438\u0431\u043a\u0430 \u0437\u0430\u0433\u0440\u0443\u0437\u043a\u0438",
};

export function WarehousesSettings() {
    const { data: warehouses, isLoading, error, refetch } = useWarehouses();
    const [search, setSearch] = useState("");

    const filteredWarehouses = useMemo(() => {
        const normalizedSearch = search.toLowerCase();
        return warehouses.filter((warehouse) =>
            warehouse.name.toLowerCase().includes(normalizedSearch) ||
            warehouse.address?.toLowerCase().includes(normalizedSearch),
        );
    }, [search, warehouses]);

    const stats = useMemo(() => {
        const initialized = warehouses.filter((warehouse) => warehouse.initialInventoryCompletedAt).length;

        return {
            total: warehouses.length,
            initialized,
            pending: warehouses.length - initialized,
        };
    }, [warehouses]);

    const handleDelete = async (warehouse: WarehouseType) => {
        if (!confirm(TEXT.deleteConfirm)) {
            return;
        }

        try {
            await api.delete(`/warehouses/${warehouse.id}`);
            toast.success(TEXT.deleteSuccess);
            await refetch();
        } catch (deleteError) {
            console.error("Failed to delete warehouse", deleteError);
            toast.error(TEXT.deleteError);
        }
    };

    return (
        <Card variant="elevated">
            <CardHeader className="pb-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                                <Warehouse className="h-4 w-4 text-primary" />
                            </div>
                            {TEXT.title}
                        </CardTitle>
                        <CardDescription className="mt-2">{TEXT.description}</CardDescription>
                    </div>
                    <AddWarehouseDialog onSuccess={refetch} />
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">{TEXT.total}: {stats.total}</Badge>
                    <Badge variant="success">{TEXT.initialized}: {stats.initialized}</Badge>
                    <Badge variant="warning">{TEXT.pending}: {stats.pending}</Badge>
                </div>

                <div className="max-w-md">
                    <SearchInput
                        placeholder={TEXT.searchPlaceholder}
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                    />
                </div>

                {isLoading ? (
                    <div className="flex flex-col items-center justify-center gap-3 py-12">
                        <div className="h-12 w-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
                        <p className="text-sm text-muted-foreground">{TEXT.loading}</p>
                    </div>
                ) : error ? (
                    <div className="flex flex-col items-center justify-center gap-3 py-12">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                            <AlertCircle className="h-6 w-6 text-destructive" />
                        </div>
                        <p className="font-medium text-destructive">{TEXT.loadError}: {error}</p>
                    </div>
                ) : filteredWarehouses.length === 0 ? (
                    <div className="py-12 text-center text-muted-foreground">{TEXT.empty}</div>
                ) : (
                    <div className="grid gap-4 xl:grid-cols-2">
                        {filteredWarehouses.map((warehouse) => {
                            const positionsCount = warehouse.stockItems?.length || 0;
                            const totalVolume = warehouse.stockItems?.reduce((sum, item) => sum + item.quantity, 0) || 0;

                            return (
                                <Card key={warehouse.id} variant="outline" className="h-full">
                                    <CardContent className="p-5">
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                                                        <Warehouse className="h-5 w-5 text-primary" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="truncate font-medium">{warehouse.name}</p>
                                                        {warehouse.address && (
                                                            <div className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                                                                <MapPin className="h-3.5 w-3.5 shrink-0" />
                                                                <span className="truncate">{warehouse.address}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="icon-sm"
                                                className="text-muted-foreground hover:text-destructive"
                                                onClick={() => handleDelete(warehouse)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>

                                        <div className="mt-4 flex flex-wrap gap-2">
                                            {warehouse.initialInventoryCompletedAt ? (
                                                <Badge variant="success">{TEXT.initializedBadge}</Badge>
                                            ) : (
                                                <Badge variant="warning">{TEXT.pendingBadge}</Badge>
                                            )}
                                        </div>

                                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                                            <div className="rounded-lg bg-muted/40 p-3">
                                                <div className="text-xs text-muted-foreground">{TEXT.stockPositions}</div>
                                                <div className="mt-1 text-xl font-semibold">{positionsCount}</div>
                                            </div>
                                            <div className="rounded-lg bg-muted/40 p-3">
                                                <div className="text-xs text-muted-foreground">{TEXT.totalVolume}</div>
                                                <div className="mt-1 text-xl font-semibold">{totalVolume}</div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
