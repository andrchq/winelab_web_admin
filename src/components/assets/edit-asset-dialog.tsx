import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Asset, AssetHistory, Warehouse } from "@/types/api";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Loader2, Trash2, ArrowRightLeft, User, MessageSquare, Activity, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";

interface EditAssetDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    asset: Asset;
    onSuccess: () => void;
}

const conditionOptions = [
    { value: "WORKING", label: "Рабочее", color: "text-emerald-500" },
    { value: "NEEDS_REPAIR", label: "Требует замены", color: "text-amber-500" },
];

const conditionMap: Record<string, { label: string; variant: "success" | "warning" | "destructive" | "secondary" }> = {
    WORKING: { label: "Рабочее", variant: "success" },
    NEEDS_REPAIR: { label: "Требует замены", variant: "warning" },
    IN_REPAIR: { label: "В ремонте", variant: "destructive" },
    DECOMMISSIONED: { label: "Списано", variant: "secondary" },
    UNKNOWN: { label: "Неизвестно", variant: "secondary" },
    // Legacy support
    NEW: { label: "Новое", variant: "success" },
    GOOD: { label: "Хорошее", variant: "success" },
    FAIR: { label: "Удовлетворительное", variant: "warning" },
    REPAIR: { label: "На ремонте", variant: "destructive" },
};

export function EditAssetDialog({ open, onOpenChange, asset, onSuccess }: EditAssetDialogProps) {
    const router = useRouter();
    const { hasRole } = useAuth();
    const canDismantle = hasRole(['ADMIN', 'MANAGER']);

    const [isLoading, setIsLoading] = useState(false);

    // Status can only be changed if it's currently WORKING.
    // If it's already NEEDS_REPAIR, make read-only for status.
    const isAlreadyNeedsRepair = asset.condition === 'NEEDS_REPAIR';

    const [condition, setCondition] = useState<Asset['condition']>(
        isAlreadyNeedsRepair ? 'NEEDS_REPAIR' : asset.condition === 'WORKING' ? 'WORKING' : 'WORKING'
    );
    const [note, setNote] = useState("");
    const [reason, setReason] = useState("");
    const [warehouseId, setWarehouseId] = useState("");
    const [deliveryContactName, setDeliveryContactName] = useState("");
    const [deliveryContactPhone, setDeliveryContactPhone] = useState("");
    const [warehouses, setWarehouses] = useState<Warehouse[]>([]);

    const [history, setHistory] = useState<AssetHistory[]>(asset.history || []);

    const fetchHistory = async () => {
        try {
            const assetData = await api.get<Asset>(`/assets/${asset.id}`);
            setHistory(assetData.history || []);
        } catch (e) {
            console.error("Failed to fetch asset history", e);
        }
    };

    const fetchWarehouses = async () => {
        try {
            const data = await api.get<Warehouse[]>('/warehouses');
            setWarehouses(data);
        } catch (e) {
            console.error("Failed to fetch warehouses", e);
        }
    }

    // Reset state when asset changes
    useEffect(() => {
        if (open) {
            setCondition(isAlreadyNeedsRepair ? 'NEEDS_REPAIR' : asset.condition === 'WORKING' ? 'WORKING' : 'WORKING');
            setNote("");
            setReason("");
            setWarehouseId("");
            setDeliveryContactName("");
            setDeliveryContactPhone("");
            fetchHistory();
            fetchWarehouses();
        }
    }, [open, asset, isAlreadyNeedsRepair]);

    const isCreatingRequest = !isAlreadyNeedsRepair && condition === 'NEEDS_REPAIR';

    const handleSave = async () => {
        if (isCreatingRequest) {
            if (!warehouseId) {
                toast.error("Пожалуйста, выберите склад для заявки на замену.");
                return;
            }
            if (!reason.trim()) {
                toast.error("Пожалуйста, укажите причину замены.");
                return;
            }
            if (!deliveryContactPhone.trim()) {
                toast.error("Укажите телефон получателя для доставки.");
                return;
            }
        }

        setIsLoading(true);
        try {
            if (isCreatingRequest) {
                const response = await api.post<{ requestId?: string }>(`/assets/batch-replacement-request`, {
                    assetIds: [asset.id],
                    warehouseId,
                    reason,
                    deliveryContactName: deliveryContactName.trim() || undefined,
                    deliveryContactPhone: deliveryContactPhone.trim(),
                    deliveryComment: reason.trim(),
                });
                toast.success("Заявка на замену отправлена");
                if (response.requestId) {
                    router.push(`/requests/${response.requestId}`);
                }
            } else {
                // If isAlreadyNeedsRepair, we shouldn't send condition, since it shouldn't be changed here
                await api.patch(`/assets/${asset.id}`, {
                    condition: isAlreadyNeedsRepair ? undefined : condition,
                    notes: note
                });
                toast.success("Изменения сохранены");
            }

            setNote("");
            setReason("");
            setDeliveryContactName("");
            setDeliveryContactPhone("");
            fetchHistory();
            onSuccess();
            if (isCreatingRequest) {
                onOpenChange(false);
            }
        } catch (error: any) {
            toast.error(error.message || "Ошибка при сохранении");
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDismantle = async () => {
        if (!confirm("Вы уверены, что хотите демонтировать это оборудование?")) return;
        setIsLoading(true);
        try {
            await api.post(`/assets/${asset.id}/dismantle`);
            toast.success("Оборудование демонтировано");
            onSuccess();
            onOpenChange(false);
        } catch (error: any) {
            toast.error("Ошибка при демонтаже");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Редактирование оборудования</DialogTitle>
                    <DialogDescription>
                        {asset.product?.name} ({asset.serialNumber})
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Read-only Serial Number */}
                    <div className="space-y-2">
                        <Label>Серийный номер</Label>
                        <div className="p-3 rounded-md bg-muted/50 font-mono text-sm border">
                            {asset.serialNumber}
                        </div>
                    </div>

                    {/* Condition Selector */}
                    <div className="space-y-2">
                        <Label>Состояние</Label>
                        <Select
                            value={condition}
                            onValueChange={(v) => setCondition(v as any)}
                            disabled={isAlreadyNeedsRepair}
                        >
                            <SelectTrigger className="border-primary/20 bg-primary/5 focus:ring-primary/20">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {conditionOptions.map((opt) => (
                                    <SelectItem key={opt.value} value={opt.value}>
                                        <span className={opt.color}>{opt.label}</span>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Dynamic Fields for Replacement Request */}
                    {isCreatingRequest && (
                        <div className="space-y-4 p-4 rounded-md border border-amber-500/30 bg-amber-500/5 mt-4">
                            <div className="space-y-2">
                                <Label className="text-amber-600 font-medium">Склад для накладной на замену <span className="text-red-500">*</span></Label>
                                <Select value={warehouseId} onValueChange={setWarehouseId}>
                                    <SelectTrigger className="bg-background">
                                        <SelectValue placeholder="Выберите склад" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {warehouses.map((w) => (
                                            <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-amber-600 font-medium">Причина замены <span className="text-red-500">*</span></Label>
                                <Textarea
                                    placeholder="Обязательно укажите причину замены. Эта информация будет выделена в комментариях и передана на склад."
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    className="min-h-[80px] resize-none bg-background focus-visible:ring-amber-500/20"
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-amber-600 font-medium">Контакт получателя</Label>
                                <Input
                                    placeholder="Имя сотрудника магазина"
                                    value={deliveryContactName}
                                    onChange={(e) => setDeliveryContactName(e.target.value)}
                                    className="bg-background"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-amber-600 font-medium">Телефон получателя <span className="text-red-500">*</span></Label>
                                <Input
                                    placeholder="+7 900 000-00-00"
                                    value={deliveryContactPhone}
                                    onChange={(e) => setDeliveryContactPhone(e.target.value)}
                                    className="bg-background"
                                />
                            </div>
                        </div>
                    )}

                    {/* Notes (Normal edit mode or already needs repair) */}
                    {(!isCreatingRequest) && (
                        <div className="space-y-2">
                            <Label>Заметки / Комментарии</Label>
                            <Textarea
                                placeholder="Дополнительная информация (комментарий)..."
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                className="min-h-[100px] resize-none border-primary/20 bg-primary/5 focus-visible:ring-primary/20"
                            />
                        </div>
                    )}

                    {/* History */}
                    {history.length > 0 && (
                        <div className="space-y-2">
                            <Label>История изменений</Label>
                            <ScrollArea className="h-[200px] rounded-md border p-4 bg-muted/20">
                                <div className="space-y-4">
                                    {history.map((record, i) => {
                                        const isReplacementReason = record.action === 'REPLACEMENT_REQUEST';
                                        return (
                                            <div key={i} className={`flex gap-3 text-sm ${isReplacementReason ? 'bg-amber-500/10 p-2 rounded-md border border-amber-500/20' : ''}`}>
                                                <div className="mt-0.5">
                                                    {isReplacementReason ? (
                                                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                                                    ) : record.action === 'COMMENT' ? (
                                                        <MessageSquare className="h-4 w-4 text-blue-500" />
                                                    ) : (
                                                        <Activity className="h-4 w-4 text-amber-500" />
                                                    )}
                                                </div>
                                                <div className="flex-1 space-y-1">
                                                    <div className="flex items-center justify-between">
                                                        <span className={`font-medium ${isReplacementReason ? 'text-amber-600' : 'text-foreground'}`}>
                                                            {record.user?.name || (record.userId ? "Пользователь" : "Система")}
                                                        </span>
                                                        <span className="text-xs text-muted-foreground">
                                                            {new Intl.DateTimeFormat('ru-RU', {
                                                                day: 'numeric',
                                                                month: 'short',
                                                                year: 'numeric',
                                                                hour: '2-digit',
                                                                minute: '2-digit'
                                                            }).format(new Date(record.createdAt))}
                                                        </span>
                                                    </div>
                                                    <p className={isReplacementReason ? 'text-amber-700 font-medium' : 'text-muted-foreground'}>
                                                        {isReplacementReason && <span className="font-bold mr-1">Причина замены:</span>}
                                                        {record.details || (
                                                            record.action === 'STATUS_CHANGE'
                                                                ? `Состояние изменено c ${conditionMap[record.fromStatus || '']?.label || record.fromStatus} на ${conditionMap[record.toStatus || '']?.label || record.toStatus}`
                                                                : record.action
                                                        )}
                                                    </p>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </ScrollArea>
                        </div>
                    )}
                </div>

                <DialogFooter className="flex justify-between sm:justify-between gap-2">
                    <div className="flex gap-2">
                        {canDismantle && (
                            <Button
                                variant="destructive"
                                onClick={handleDismantle}
                                disabled={isLoading}
                            >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Демонтировать
                            </Button>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <Button variant="ghost" onClick={() => onOpenChange(false)}>
                            Отмена
                        </Button>
                        <Button
                            onClick={handleSave}
                            disabled={isLoading}
                            className={isCreatingRequest ? "bg-amber-600 hover:bg-amber-700 text-white" : "bg-emerald-600 hover:bg-emerald-700 text-white"}
                        >
                            {isCreatingRequest ? "Отправить заявку" : "Сохранить"}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
