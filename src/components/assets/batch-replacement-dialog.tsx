"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Wrench } from "lucide-react";
import { toast } from "sonner";

import { api } from "@/lib/api";
import { useWarehouses } from "@/lib/hooks";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface BatchReplacementDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    storeId: string;
    selectedAssetIds: string[];
    onSuccess: () => void;
}

export function BatchReplacementDialog({
    open,
    onOpenChange,
    storeId: _storeId,
    selectedAssetIds,
    onSuccess,
}: BatchReplacementDialogProps) {
    const router = useRouter();
    const { data: warehouses, isLoading: isLoadingWarehouses } = useWarehouses();
    const [warehouseId, setWarehouseId] = useState<string>("");
    const [reason, setReason] = useState("");
    const [deliveryContactName, setDeliveryContactName] = useState("");
    const [deliveryContactPhone, setDeliveryContactPhone] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const availableWarehouses = warehouses || [];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!warehouseId) {
            toast.error("Выберите склад");
            return;
        }

        if (!reason.trim()) {
            toast.error("Укажите причину замены");
            return;
        }

        if (!deliveryContactPhone.trim()) {
            toast.error("Укажите телефон получателя для доставки");
            return;
        }

        setIsSubmitting(true);
        try {
            const response = await api.post<{ requestId?: string }>(`/assets/batch-replacement-request`, {
                assetIds: selectedAssetIds,
                warehouseId,
                reason: reason.trim(),
                deliveryContactName: deliveryContactName.trim() || undefined,
                deliveryContactPhone: deliveryContactPhone.trim(),
                deliveryComment: reason.trim(),
            });

            toast.success(`Пакетная заявка на замену успешно создана (${selectedAssetIds.length} шт.)`);
            onSuccess();
            onOpenChange(false);
            if (response.requestId) {
                router.push(`/requests/${response.requestId}`);
            }

            setReason("");
            setWarehouseId("");
            setDeliveryContactName("");
            setDeliveryContactPhone("");
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || "Не удалось создать заявку на замену");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Wrench className="h-5 w-5 text-warning" />
                            Пакетная замена оборудования
                        </DialogTitle>
                        <DialogDescription>
                            Выбрано для замены: <span className="font-bold text-foreground">{selectedAssetIds.length} шт.</span>
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="warehouse">Целевой склад <span className="text-destructive">*</span></Label>
                            <Select
                                value={warehouseId}
                                onValueChange={setWarehouseId}
                                disabled={isLoadingWarehouses || isSubmitting}
                            >
                                <SelectTrigger id="warehouse">
                                    <SelectValue placeholder="Выберите склад..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {availableWarehouses.map((warehouse: any) => (
                                        <SelectItem key={warehouse.id} value={warehouse.id}>
                                            {warehouse.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="reason">Причина замены <span className="text-destructive">*</span></Label>
                            <Textarea
                                id="reason"
                                placeholder="Опишите общую причину замены для выбранных устройств..."
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                disabled={isSubmitting}
                                rows={4}
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="delivery-contact-name">Контакт получателя</Label>
                            <Input
                                id="delivery-contact-name"
                                placeholder="Имя сотрудника магазина"
                                value={deliveryContactName}
                                onChange={(e) => setDeliveryContactName(e.target.value)}
                                disabled={isSubmitting}
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="delivery-contact-phone">Телефон получателя <span className="text-destructive">*</span></Label>
                            <Input
                                id="delivery-contact-phone"
                                placeholder="+7 900 000-00-00"
                                value={deliveryContactPhone}
                                onChange={(e) => setDeliveryContactPhone(e.target.value)}
                                disabled={isSubmitting}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={isSubmitting}
                        >
                            Отмена
                        </Button>
                        <Button
                            type="submit"
                            disabled={isSubmitting || !warehouseId || !reason.trim() || !deliveryContactPhone.trim()}
                            className="bg-warning hover:bg-warning/90 text-warning-foreground"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Создание...
                                </>
                            ) : (
                                "Оформить заявку"
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
