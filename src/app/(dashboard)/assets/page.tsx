"use client";

import { useState } from "react";
import { AssetsTab } from "@/components/assets/assets-tab";
import { InventoryView } from "@/components/inventory/inventory-view";
import { InventoryHistoryDialog } from "@/components/inventory/inventory-history-dialog";
import { inventoryApi } from "@/lib/api";
import { useWarehouses } from "@/lib/hooks";
import { toast } from "sonner";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

export default function AssetsPage() {
    const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [selectedWarehouse, setSelectedWarehouse] = useState<string>("");
    const [inventoryConflict, setInventoryConflict] = useState<{
        sessionId?: string;
        warehouseName: string;
    } | null>(null);

    const { data: warehouses } = useWarehouses();

    const handleStartInventory = async () => {
        if (!selectedWarehouse) return;

        try {
            const session = await inventoryApi.start(selectedWarehouse);
            toast.success("Инвентаризация началась");
            setIsCreateOpen(false);
            setActiveSessionId(session.id);
        } catch (error: any) {
            const message = error?.message || "Ошибка при создании инвентаризации";
            if (message.toLowerCase().includes("уже идет инвентаризация")) {
                const sessions = await inventoryApi.getAll().catch(() => []);
                const currentSession = sessions.find((session: any) =>
                    session.warehouseId === selectedWarehouse && session.status === "IN_PROGRESS",
                );
                const warehouseName = warehouses?.find((warehouse: any) => warehouse.id === selectedWarehouse)?.name || "выбранном складе";

                setIsCreateOpen(false);
                setInventoryConflict({
                    sessionId: currentSession?.id,
                    warehouseName,
                });
                return;
            }

            toast.error(message);
        }
    };

    const [isHistoryOpen, setIsHistoryOpen] = useState(false);

    const handleViewSession = (sessionId: string) => {
        setActiveSessionId(sessionId);
        setIsHistoryOpen(false);
    };

    // If session is active, show Inventory View
    if (activeSessionId) {
        return (
            <div className="p-6 h-full flex flex-col">
                <InventoryView
                    sessionId={activeSessionId}
                    onBack={() => setActiveSessionId(null)}
                />
            </div>
        );
    }

    return (
        <div className="p-6 h-full flex flex-col">
            <div className="flex flex-col gap-4 mb-6">
                <div className="flex flex-col gap-2">
                    <h1 className="text-2xl font-bold">Инвентаризация</h1>
                    <p className="text-sm text-muted-foreground">Управление оборудованием</p>
                </div>
            </div>

            <div className="flex-1 flex flex-col">
                <AssetsTab
                    onStartInventory={() => setIsCreateOpen(true)}
                    onShowHistory={() => setIsHistoryOpen(true)}
                />
            </div>

            {/* Start Inventory Dialog */}
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Новая инвентаризация</DialogTitle>
                        <DialogDescription>
                            Выберите склад для создания слепка (наша система зафиксирует план) и начала сканирования.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <label className="text-sm font-medium mb-2 block">Склад</label>
                        <Select value={selectedWarehouse} onValueChange={setSelectedWarehouse}>
                            <SelectTrigger>
                                <SelectValue placeholder="Выберите склад" />
                            </SelectTrigger>
                            <SelectContent>
                                {warehouses?.map((w: any) => (
                                    <SelectItem key={w.id} value={w.id}>
                                        {w.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                            Отмена
                        </Button>
                        <Button onClick={handleStartInventory} disabled={!selectedWarehouse}>
                            Начать
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* History Dialog */}
            <InventoryHistoryDialog
                open={isHistoryOpen}
                onOpenChange={setIsHistoryOpen}
                onViewSession={handleViewSession}
            />

            <Dialog
                open={!!inventoryConflict}
                onOpenChange={(open) => {
                    if (!open) setInventoryConflict(null);
                }}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Инвентаризация уже запущена</DialogTitle>
                        <DialogDescription>
                            На складе {inventoryConflict?.warehouseName || "с выбранным складом"} уже идет активная инвентаризация.
                            Можно сразу перейти в нее, вместо создания новой.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setInventoryConflict(null)}>
                            Закрыть
                        </Button>
                        <Button
                            onClick={() => {
                                if (!inventoryConflict?.sessionId) {
                                    setInventoryConflict(null);
                                    return;
                                }

                                setActiveSessionId(inventoryConflict.sessionId);
                                setInventoryConflict(null);
                            }}
                            disabled={!inventoryConflict?.sessionId}
                        >
                            Перейти в инвентаризацию
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
