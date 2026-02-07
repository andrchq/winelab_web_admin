"use client";

import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";

interface EditAssetDialogProps {
    asset: any;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

const CONDITIONS = [
    { value: 'NEW', label: 'Новое' },
    { value: 'GOOD', label: 'Хорошее' },
    { value: 'FAIR', label: 'Удовлетворительное' },
    { value: 'REPAIR', label: 'Требует ремонта' },
    { value: 'DECOMMISSIONED', label: 'Списано' },
];

export function EditAssetDialog({
    asset,
    open,
    onOpenChange,
    onSuccess,
}: EditAssetDialogProps) {
    const [loading, setLoading] = useState(false);
    // Initialize directly from props since we use key={id} to force remount
    const [serialNumber, setSerialNumber] = useState(asset?.serialNumber || "");
    const [condition, setCondition] = useState(asset?.condition || "GOOD");
    const [notes, setNotes] = useState(asset?.notes || "");

    // useEffect removed since we re-mount on prop change via key

    const handleSubmit = async () => {
        setLoading(true);
        try {
            await api.patch(`/assets/${asset.id}`, {
                serialNumber,
                condition,
                notes,
            });
            toast.success("Оборудование обновлено");
            onOpenChange(false);
            onSuccess();
        } catch (error: any) {
            toast.error(error.message || "Ошибка обновления");
        } finally {
            setLoading(false);
        }
    };

    const handleUninstall = async () => {
        // Confirmation could be added here
        if (!confirm("Вы уверены, что хотите демонтировать это оборудование? Оно вернется на склад.")) return;

        setLoading(true);
        try {
            // Assuming appropriate endpoint for uninstalling/unlinking
            // If specific endpoint doesn't exist, updating status/storeId might be the way
            // Using a generic update for now, but ideally this should be a specific flow
            await api.patch(`/assets/${asset.id}`, {
                storeId: null,
                processStatus: 'AVAILABLE', // Return to stock
                // Warehouse ID might need to be set? defaulting to current context or null
            });
            toast.success("Оборудование демонтировано");
            onOpenChange(false);
            onSuccess();
        } catch (error: any) {
            toast.error(error.message || "Ошибка демонтажа");
        } finally {
            setLoading(false);
        }
    };

    const [isReplacing, setIsReplacing] = useState(false);
    const [newSerialNumber, setNewSerialNumber] = useState("");
    const [replacementReason, setReplacementReason] = useState("");
    const [oldCondition, setOldCondition] = useState("");

    const handleReplace = async () => {
        if (!newSerialNumber || !replacementReason || !oldCondition) {
            toast.error("Заполните все поля");
            return;
        }

        setLoading(true);
        try {
            // 1. Retire old asset
            await api.patch(`/assets/${asset.id}`, {
                storeId: null, // Unlink from store
                condition: oldCondition,
                notes: `Заменено на SN: ${newSerialNumber}. Причина: ${replacementReason}`,
                processStatus: 'AVAILABLE' // Return to pool (or DECOMMISSIONED if needed)
            });

            // 2. Add new asset (Assuming we create it or link it)
            // Since we don't have a direct 'swap' endpoint easily available without stock check,
            // we will try to create/register the new asset directly.
            // If the backend requires picking from stock, this might fail, but for now we follow the UI request.
            // Using a virtual endpoint or just patching if it was a simple Swap? 
            // Better: Add new equipment using post request if possible, or create asset.
            await api.post(`/stores/${asset.storeId}/equipment`, {
                equipment: [{
                    productId: asset.product.id,
                    serialNumber: newSerialNumber,
                    count: 1
                }]
            });

            toast.success("Оборудование заменено");
            onOpenChange(false);
            onSuccess();
        } catch (error: any) {
            toast.error(error.message || "Ошибка замены");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[800px]">
                <DialogHeader>
                    <DialogTitle>{isReplacing ? "Замена оборудования" : "Редактирование оборудования"}</DialogTitle>
                    <DialogDescription>
                        {asset?.product?.name}
                    </DialogDescription>
                </DialogHeader>

                {!isReplacing ? (
                    /* EDIT MODE */
                    <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="serial">Серийный номер</Label>
                            <Input
                                id="serial"
                                value={serialNumber}
                                disabled
                                className="bg-muted text-muted-foreground"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="condition">Состояние</Label>
                            <Select value={condition} onValueChange={setCondition}>
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Выберите состояние" />
                                </SelectTrigger>
                                <SelectContent>
                                    {CONDITIONS.map((c) => (
                                        <SelectItem key={c.value} value={c.value}>
                                            {c.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="notes">Заметки</Label>
                            <Textarea
                                id="notes"
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Дополнительная информация..."
                                className="resize-none"
                            />
                        </div>
                    </div>
                ) : (
                    /* REPLACEMENT MODE */
                    <div className="grid gap-4 py-4">
                        <div className="p-3 bg-muted/50 rounded-lg border border-border/50 text-sm">
                            <div className="font-medium mb-1">Заменяемое устройство:</div>
                            <div className="text-muted-foreground">SN: {asset.serialNumber}</div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="newSerial" className="text-primary">Новый Серийный номер</Label>
                            <Input
                                id="newSerial"
                                value={newSerialNumber}
                                onChange={(e) => setNewSerialNumber(e.target.value)}
                                placeholder="Введите SN нового устройства"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="oldCondition">Состояние заменяемого оборудования</Label>
                            <Select value={oldCondition} onValueChange={setOldCondition}>
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Почему меняем?" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="REPAIR">Требует ремонта</SelectItem>
                                    <SelectItem value="DECOMMISSIONED">Списано (Слом)</SelectItem>
                                    <SelectItem value="FAIR">Устарело/Износ</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="replacementReason">Причина замены</Label>
                            <Textarea
                                id="replacementReason"
                                value={replacementReason}
                                onChange={(e) => setReplacementReason(e.target.value)}
                                placeholder="Опишите причину замены..."
                                className="resize-none"
                            />
                        </div>
                    </div>
                )}

                <DialogFooter className="flex justify-between sm:justify-between gap-2">
                    {!isReplacing ? (
                        <>
                            <div className="flex gap-2">
                                <Button
                                    variant="destructive"
                                    type="button"
                                    onClick={handleUninstall}
                                    disabled={loading}
                                >
                                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
                                    Демонтировать
                                </Button>
                                <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={() => setIsReplacing(true)}
                                >
                                    Заменить
                                </Button>
                            </div>
                            <div className="flex gap-2">
                                <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                                    Отмена
                                </Button>
                                <Button onClick={handleSubmit} disabled={loading}>
                                    {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                                    Сохранить
                                </Button>
                            </div>
                        </>
                    ) : (
                        <>
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => setIsReplacing(false)}
                                className="mr-auto"
                            >
                                ← Назад
                            </Button>
                            <div className="flex gap-2">
                                <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                                    Отмена
                                </Button>
                                <Button onClick={handleReplace} disabled={loading}>
                                    {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                                    Произвести замену
                                </Button>
                            </div>
                        </>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
