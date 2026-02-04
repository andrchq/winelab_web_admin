"use client";

import { useState, useEffect } from "react";
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import type { Store, StoreStatus } from "@/types/api";

interface EditStoreDialogProps {
    store: Store;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
}

const statusOptions: { value: StoreStatus; label: string; color: string }[] = [
    { value: 'OPEN', label: 'Открыт', color: 'text-emerald-500' },
    { value: 'CLOSED', label: 'Закрыт', color: 'text-red-500' },
    { value: 'RECONSTRUCTION', label: 'Реконструкция', color: 'text-amber-500' },
    { value: 'TECHNICAL_ISSUES', label: 'Технические проблемы', color: 'text-orange-500' },
];

export function EditStoreDialog({ store, open, onOpenChange, onSuccess }: EditStoreDialogProps) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        address: '',
        city: '',
        cfo: '',
        region: '',
        phone: '',
        email: '',
        manager: '',
        status: 'OPEN' as StoreStatus,
        serverIp: '',
        providerIp1: '',
        providerIp2: '',
        utmUrl: '',
        retailUrl: '',
        legalEntity: '',
        inn: '',
        kpp: '',
        fsrarId: '',
        cctvSystem: '',
        cameraCount: '',
    });

    // Initialize form data when store changes
    useEffect(() => {
        if (store) {
            setFormData({
                name: store.name || '',
                address: store.address || '',
                city: store.city || '',
                cfo: store.cfo || '',
                region: store.region || '',
                phone: store.phone || '',
                email: store.email || '',
                manager: store.manager || '',
                status: store.status || 'OPEN',
                serverIp: store.serverIp || '',
                providerIp1: store.providerIp1 || '',
                providerIp2: store.providerIp2 || '',
                utmUrl: store.utmUrl || '',
                retailUrl: store.retailUrl || '',
                legalEntity: store.legalEntity || '',
                inn: store.inn || '',
                kpp: store.kpp || '',
                fsrarId: store.fsrarId || '',
                cctvSystem: store.cctvSystem || '',
                cameraCount: store.cameraCount?.toString() || '',
            });
        }
    }, [store]);

    const handleChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('accessToken');
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/stores/${store.id}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ...formData,
                    cameraCount: formData.cameraCount ? parseInt(formData.cameraCount) : null,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Ошибка сохранения');
            }

            toast.success("Магазин обновлен");
            onOpenChange(false);
            if (onSuccess) onSuccess();
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || "Ошибка при сохранении");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Редактирование магазина</DialogTitle>
                    <DialogDescription>
                        Измените данные магазина и нажмите Сохранить.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-6 py-4">
                    {/* Basic Info */}
                    <div className="space-y-4">
                        <h3 className="font-medium text-sm text-muted-foreground">Основная информация</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Название (SAP код)</Label>
                                <Input
                                    id="name"
                                    value={formData.name}
                                    onChange={(e) => handleChange('name', e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="status">Статус</Label>
                                <Select value={formData.status} onValueChange={(v: StoreStatus) => handleChange('status', v)}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {statusOptions.map(opt => (
                                            <SelectItem key={opt.value} value={opt.value}>
                                                <span className={opt.color}>{opt.label}</span>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="address">Адрес</Label>
                            <Input
                                id="address"
                                value={formData.address}
                                onChange={(e) => handleChange('address', e.target.value)}
                            />
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="city">Город</Label>
                                <Input
                                    id="city"
                                    value={formData.city}
                                    onChange={(e) => handleChange('city', e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="cfo">ЦФО</Label>
                                <Input
                                    id="cfo"
                                    value={formData.cfo}
                                    onChange={(e) => handleChange('cfo', e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="region">Регион</Label>
                                <Input
                                    id="region"
                                    value={formData.region}
                                    onChange={(e) => handleChange('region', e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="phone">Телефон</Label>
                                <Input
                                    id="phone"
                                    value={formData.phone}
                                    onChange={(e) => handleChange('phone', e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => handleChange('email', e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="manager">Менеджер</Label>
                                <Input
                                    id="manager"
                                    value={formData.manager}
                                    onChange={(e) => handleChange('manager', e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Technical Info */}
                    <div className="space-y-4">
                        <h3 className="font-medium text-sm text-muted-foreground">Техническая информация</h3>
                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="serverIp">IP Сервера</Label>
                                <Input
                                    id="serverIp"
                                    value={formData.serverIp}
                                    onChange={(e) => handleChange('serverIp', e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="providerIp1">IP Провайдер 1</Label>
                                <Input
                                    id="providerIp1"
                                    value={formData.providerIp1}
                                    onChange={(e) => handleChange('providerIp1', e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="providerIp2">IP Провайдер 2</Label>
                                <Input
                                    id="providerIp2"
                                    value={formData.providerIp2}
                                    onChange={(e) => handleChange('providerIp2', e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="utmUrl">УТМ ссылка</Label>
                                <Input
                                    id="utmUrl"
                                    value={formData.utmUrl}
                                    onChange={(e) => handleChange('utmUrl', e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="retailUrl">Retail ссылка</Label>
                                <Input
                                    id="retailUrl"
                                    value={formData.retailUrl}
                                    onChange={(e) => handleChange('retailUrl', e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Legal Info */}
                    <div className="space-y-4">
                        <h3 className="font-medium text-sm text-muted-foreground">Юридическая информация</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="legalEntity">Юр. лицо</Label>
                                <Input
                                    id="legalEntity"
                                    value={formData.legalEntity}
                                    onChange={(e) => handleChange('legalEntity', e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="fsrarId">ФСРАР</Label>
                                <Input
                                    id="fsrarId"
                                    value={formData.fsrarId}
                                    onChange={(e) => handleChange('fsrarId', e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="inn">ИНН</Label>
                                <Input
                                    id="inn"
                                    value={formData.inn}
                                    onChange={(e) => handleChange('inn', e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="kpp">КПП</Label>
                                <Input
                                    id="kpp"
                                    value={formData.kpp}
                                    onChange={(e) => handleChange('kpp', e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    {/* CCTV Info */}
                    <div className="space-y-4">
                        <h3 className="font-medium text-sm text-muted-foreground">Видеонаблюдение (СВН)</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="cctvSystem">Система СВН</Label>
                                <Input
                                    id="cctvSystem"
                                    value={formData.cctvSystem}
                                    onChange={(e) => handleChange('cctvSystem', e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="cameraCount">Количество камер</Label>
                                <Input
                                    id="cameraCount"
                                    type="number"
                                    value={formData.cameraCount}
                                    onChange={(e) => handleChange('cameraCount', e.target.value)}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Отмена
                    </Button>
                    <Button onClick={handleSubmit} disabled={loading}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        <Save className="mr-2 h-4 w-4" />
                        Сохранить
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
