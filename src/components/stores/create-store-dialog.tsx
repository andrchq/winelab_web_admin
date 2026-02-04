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
    DialogTrigger,
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
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2, Plus, MapPin, Search } from "lucide-react";
import { toast } from "sonner";
import { StoreStatus } from "@/types/api";
import { YandexMap } from "@/components/maps";
import { cn } from "@/lib/utils";

interface CreateStoreDialogProps {
    onSuccess?: () => void;
}

const statusOptions: { value: StoreStatus; label: string; color: string }[] = [
    { value: 'OPEN', label: 'Открыт', color: 'text-emerald-500' },
    { value: 'CLOSED', label: 'Закрыт', color: 'text-red-500' },
    { value: 'RECONSTRUCTION', label: 'Реконструкция', color: 'text-amber-500' },
    { value: 'TECHNICAL_ISSUES', label: 'Технические проблемы', color: 'text-orange-500' },
];

export function CreateStoreDialog({ onSuccess }: CreateStoreDialogProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [confirmationOpen, setConfirmationOpen] = useState(false);

    // Form Data
    const [formData, setFormData] = useState({
        name: '',
        status: 'OPEN' as StoreStatus,
        address: '',
        city: '',
        region: '',
        cfo: '',
        phone: '',
        email: '',
        manager: '',

        // Tech
        serverIp: '',
        providerIp1: '',
        providerIp2: '',
        utmUrl: '',
        retailUrl: '',

        // Legal
        legalEntity: '',
        inn: '',
        kpp: '',
        fsrarId: '',

        // CCTV
        cctvSystem: '',
        cameraCount: '',
    });

    // Validation State
    const [missingMandatory, setMissingMandatory] = useState<string[]>([]);

    const handleChange = (field: string, value: string) => {
        setFormData(prev => {
            const next = { ...prev, [field]: value };

            // Auto-fill Logic for URLs
            if (field === 'serverIp') {
                if (value.trim()) {
                    next.utmUrl = `http://${value.trim()}:8080`;
                    next.retailUrl = `http://${value.trim()}:8090`;
                } else {
                    next.utmUrl = '';
                    next.retailUrl = '';
                }
            }

            return next;
        });
    };

    // Mandatory fields list according to requirements
    // "Mandatory: SAP, Status, Address, City, Region, CFO, Server IP, Provider IP (>=1), Legal Entity"
    const checkMandatoryFields = () => {
        const missing: string[] = [];
        if (!formData.name) missing.push("Название (SAP)");
        if (!formData.address) missing.push("Адрес");
        if (!formData.city) missing.push("Город");
        if (!formData.region) missing.push("Регион");
        if (!formData.cfo) missing.push("ЦФО");
        if (!formData.serverIp) missing.push("IP Сервера");
        if (!formData.providerIp1 && !formData.providerIp2) missing.push("Хотя бы один IP провайдера");
        if (!formData.legalEntity) missing.push("Юр. лицо");

        return missing;
    };

    const handlePreSubmit = () => {
        const missing = checkMandatoryFields();
        if (missing.length > 0) {
            setMissingMandatory(missing);
            setConfirmationOpen(true);
        } else {
            handleSubmit();
        }
    };

    const handleSubmit = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('accessToken');
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/stores`, {
                method: 'POST',
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
                throw new Error(errorData.message || 'Ошибка создания');
            }

            toast.success("Магазин создан");
            setOpen(false);
            setConfirmationOpen(false);
            resetForm();
            if (onSuccess) onSuccess();
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || "Ошибка при создании");
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setFormData({
            name: '',
            status: 'OPEN',
            address: '',
            city: '',
            region: '',
            cfo: '',
            phone: '',
            email: '',
            manager: '',
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
        setMissingMandatory([]);
    };

    return (
        <>
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                    <Button variant="gradient">
                        <Plus className="h-4 w-4 mr-2" />
                        Новый магазин
                    </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[1000px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Новый магазин</DialogTitle>
                        <DialogDescription>
                            Заполните данные магазина. Обязательные поля помечены *.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 py-4">
                        {/* LEFT COLUMN: FORM */}
                        <div className="space-y-6">
                            {/* Basic Info */}
                            <div className="space-y-4">
                                <h3 className="font-medium text-sm text-muted-foreground border-b pb-1">Основная информация</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="name" className="after:content-['*'] after:ml-0.5 after:text-red-500">
                                            Название (SAP код)
                                        </Label>
                                        <Input
                                            id="name"
                                            value={formData.name}
                                            onChange={(e) => handleChange('name', e.target.value)}
                                            placeholder="A000"
                                            className={cn(!formData.name && "border-primary/50")}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="status" className="after:content-['*'] after:ml-0.5 after:text-red-500">
                                            Статус
                                        </Label>
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
                                    <Label htmlFor="address" className="after:content-['*'] after:ml-0.5 after:text-red-500">
                                        Адрес
                                    </Label>
                                    <Input
                                        id="address"
                                        value={formData.address}
                                        onChange={(e) => handleChange('address', e.target.value)}
                                        placeholder="Введите адрес"
                                    />
                                </div>
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="city" className="after:content-['*'] after:ml-0.5 after:text-red-500">
                                            Город
                                        </Label>
                                        <Input
                                            id="city"
                                            value={formData.city}
                                            onChange={(e) => handleChange('city', e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="cfo" className="after:content-['*'] after:ml-0.5 after:text-red-500">
                                            ЦФО
                                        </Label>
                                        <Input
                                            id="cfo"
                                            value={formData.cfo}
                                            onChange={(e) => handleChange('cfo', e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="region" className="after:content-['*'] after:ml-0.5 after:text-red-500">
                                            Регион
                                        </Label>
                                        <Input
                                            id="region"
                                            value={formData.region}
                                            onChange={(e) => handleChange('region', e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="phone">Телефон</Label>
                                        <Input
                                            id="phone"
                                            value={formData.phone}
                                            onChange={(e) => handleChange('phone', e.target.value)}
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

                            {/* Tech Info */}
                            <div className="space-y-4">
                                <h3 className="font-medium text-sm text-muted-foreground border-b pb-1">Техническая информация</h3>
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="serverIp" className="after:content-['*'] after:ml-0.5 after:text-red-500">
                                            IP Сервера
                                        </Label>
                                        <Input
                                            id="serverIp"
                                            value={formData.serverIp}
                                            onChange={(e) => handleChange('serverIp', e.target.value)}
                                            placeholder="10.x.x.x"
                                        />
                                    </div>
                                    <div className="space-y-2 col-span-2">
                                        <Label className="after:content-['*'] after:ml-0.5 after:text-red-500">
                                            IP Провайдеров (мин. 1)
                                        </Label>
                                        <div className="grid grid-cols-2 gap-2">
                                            <Input
                                                placeholder="Провайдер 1"
                                                value={formData.providerIp1}
                                                onChange={(e) => handleChange('providerIp1', e.target.value)}
                                            />
                                            <Input
                                                placeholder="Провайдер 2"
                                                value={formData.providerIp2}
                                                onChange={(e) => handleChange('providerIp2', e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="utmUrl">УТМ ссылка</Label>
                                        <Input
                                            id="utmUrl"
                                            value={formData.utmUrl}
                                            onChange={(e) => handleChange('utmUrl', e.target.value)}
                                            readOnly
                                            className="bg-muted"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="retailUrl">Retail ссылка</Label>
                                        <Input
                                            id="retailUrl"
                                            value={formData.retailUrl}
                                            onChange={(e) => handleChange('retailUrl', e.target.value)}
                                            readOnly
                                            className="bg-muted"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Legal Info */}
                            <div className="space-y-4">
                                <h3 className="font-medium text-sm text-muted-foreground border-b pb-1">Юридическая информация</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="legalEntity" className="after:content-['*'] after:ml-0.5 after:text-red-500">
                                            Юр. лицо
                                        </Label>
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
                                <h3 className="font-medium text-sm text-muted-foreground border-b pb-1">Видео (СВН)</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="cctvSystem">Система</Label>
                                        <Input
                                            id="cctvSystem"
                                            value={formData.cctvSystem}
                                            onChange={(e) => handleChange('cctvSystem', e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="cameraCount">Кол-во камер</Label>
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

                        {/* RIGHT COLUMN: MAP */}
                        <div className="flex flex-col gap-4">
                            <div className="sticky top-0">
                                <Label className="mb-2 block">Расположение на карте</Label>
                                <div className="rounded-xl overflow-hidden border border-border h-[400px] relative shadow-md">
                                    <YandexMap
                                        height="100%"
                                        width="100%"
                                        address={formData.city && formData.address ? `${formData.city}, ${formData.address}` : undefined}
                                        placemarks={[]}
                                        zoom={15}
                                    />
                                    {/* Overlay for "Find on map" hint if needed, or button */}
                                    <div className="absolute top-2 right-2 flex gap-2">
                                        <Button size="sm" variant="secondary" className="shadow-sm opacity-90 hover:opacity-100 pointer-events-none">
                                            <MapPin className="h-4 w-4 mr-2" />
                                            Авто-поиск по адресу
                                        </Button>
                                    </div>
                                </div>
                                <div className="mt-4 p-4 bg-muted/30 rounded-lg border border-border/50 text-sm text-muted-foreground">
                                    <p>Карта обновляется автоматически при вводе города и адреса.</p>
                                    <p className="mt-2">
                                        Поля, отмеченные <span className="text-red-500">*</span>, обязательны для заполнения.
                                        Если они не заполнены, потребуется подтверждение.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setOpen(false)}>
                            Отмена
                        </Button>
                        <Button onClick={handlePreSubmit} disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            <Plus className="mr-2 h-4 w-4" />
                            Создать магазин
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Confirmation Dialog for Missing Fields */}
            <AlertDialog open={confirmationOpen} onOpenChange={setConfirmationOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Неполные данные</AlertDialogTitle>
                        <AlertDialogDescription>
                            Следующие обязательные поля не заполнены:
                            <ul className="list-disc list-inside mt-2 text-red-500 font-medium">
                                {missingMandatory.map(field => (
                                    <li key={field}>{field}</li>
                                ))}
                            </ul>
                            <p className="mt-4">
                                Вы уверены, что хотите создать магазин с неполными данными?
                                Он будет помечен как "Не заполнен".
                            </p>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setConfirmationOpen(false)}>Отмена</AlertDialogCancel>
                        <AlertDialogAction onClick={handleSubmit} className="bg-red-500 hover:bg-red-600">
                            Создать всё равно
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
