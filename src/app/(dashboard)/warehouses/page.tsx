
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Warehouse, MapPin, Trash2, Building2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/input";
import { useWarehouses } from "@/lib/hooks";
import { AddWarehouseDialog } from "@/components/warehouses/add-warehouse-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Warehouse as WarehouseType } from "@/types/api";
import { api } from "@/lib/api";
import { toast } from "sonner";

export default function WarehousesPage() {
    const router = useRouter();
    const { data: warehouses, isLoading, refetch } = useWarehouses();
    const [search, setSearch] = useState("");
    const [deleteWarehouse, setDeleteWarehouse] = useState<WarehouseType | null>(null);

    const filteredWarehouses = warehouses?.filter(w =>
        w.name.toLowerCase().includes(search.toLowerCase()) ||
        w.address?.toLowerCase().includes(search.toLowerCase())
    ) || [];

    const confirmDelete = async () => {
        if (!deleteWarehouse) return;
        try {
            await api.delete(`/warehouses/${deleteWarehouse.id}`);
            toast.success("Склад удален");
            refetch();
            setDeleteWarehouse(null);
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
                        <h1 className="text-2xl font-bold">Склады</h1>
                        <p className="text-sm text-muted-foreground mt-1">Управление местами хранения оборудования</p>
                    </div>
                    <AddWarehouseDialog onSuccess={refetch} />
                </div>

                {/* Search */}
                <Card>
                    <CardContent className="p-4">
                        <div className="max-w-md">
                            <SearchInput
                                placeholder="Поиск по названию или адресу..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Warehouses Grid */}
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-3">
                        <div className="h-12 w-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
                        <p className="text-muted-foreground">Загрузка складов...</p>
                    </div>
                ) : filteredWarehouses.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                        Склады не найдены
                    </div>
                ) : (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {filteredWarehouses.map((warehouse) => (
                            <Card
                                key={warehouse.id}
                                variant="elevated"
                                className="group cursor-pointer hover:border-primary/50 transition-colors"
                                onClick={() => router.push(`/warehouses/${warehouse.id}`)}
                            >
                                <CardHeader className="pb-4">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                                <Warehouse className="h-5 w-5 text-primary" />
                                            </div>
                                            <div>
                                                <CardTitle className="text-base">{warehouse.name}</CardTitle>
                                                {warehouse.address && (
                                                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1">
                                                        <MapPin className="h-3.5 w-3.5" />
                                                        {warehouse.address}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon-sm"
                                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setDeleteWarehouse(warehouse);
                                            }}
                                        >
                                            <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive transition-colors" />
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-2 gap-4 pt-2">
                                        <div className="bg-muted/50 rounded-lg p-3">
                                            <div className="text-sm text-muted-foreground mb-1">Позиций</div>
                                            <div className="text-xl font-semibold">
                                                {(warehouse as any).stockItems?.length || 0}
                                            </div>
                                        </div>
                                        <div className="bg-muted/50 rounded-lg p-3">
                                            <div className="text-sm text-muted-foreground mb-1">Общий объем</div>
                                            <div className="text-xl font-semibold">
                                                {(warehouse as any).stockItems?.reduce((acc: number, item: any) => acc + item.quantity, 0) || 0}
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>

            <Dialog open={!!deleteWarehouse} onOpenChange={(open: boolean) => !open && setDeleteWarehouse(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Удалить склад?</DialogTitle>
                        <DialogDescription>
                            Вы уверены, что хотите удалить склад
                            <span className="font-bold text-foreground mx-1">
                                {deleteWarehouse?.name}
                            </span>?
                            <br />
                            Это действие пометит склад как неактивный.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setDeleteWarehouse(null)}>
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
