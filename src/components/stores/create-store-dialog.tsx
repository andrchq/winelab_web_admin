"use client";

import { useState } from "react";
import { Loader2, MapPin, Plus } from "lucide-react";
import { toast } from "sonner";

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { YandexMap } from "@/components/maps";
import { StoreStatus } from "@/types/api";
import { cn } from "@/lib/utils";

interface CreateStoreDialogProps {
    onSuccess?: () => void;
}

interface StoreFormData {
    name: string;
    status: StoreStatus;
    address: string;
    city: string;
    region: string;
    cfo: string;
    phone: string;
    email: string;
    manager: string;
    serverIp: string;
    providerIp1: string;
    providerIp2: string;
    utmUrl: string;
    retailUrl: string;
    legalEntity: string;
    inn: string;
    kpp: string;
    fsrarId: string;
    cctvSystem: string;
    cameraCount: string;
}

const statusOptions: { value: StoreStatus; label: string; color: string }[] = [
    { value: "OPEN", label: "Открыт", color: "text-emerald-500" },
    { value: "CLOSED", label: "Закрыт", color: "text-red-500" },
    { value: "RECONSTRUCTION", label: "Реконструкция", color: "text-amber-500" },
    { value: "TECHNICAL_ISSUES", label: "Тех. проблемы", color: "text-orange-500" },
];

const initialFormData: StoreFormData = {
    name: "",
    status: "OPEN",
    address: "",
    city: "",
    region: "",
    cfo: "",
    phone: "",
    email: "",
    manager: "",
    serverIp: "",
    providerIp1: "",
    providerIp2: "",
    utmUrl: "",
    retailUrl: "",
    legalEntity: "",
    inn: "",
    kpp: "",
    fsrarId: "",
    cctvSystem: "",
    cameraCount: "",
};

export function CreateStoreDialog({ onSuccess }: CreateStoreDialogProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [confirmationOpen, setConfirmationOpen] = useState(false);
    const [formData, setFormData] = useState<StoreFormData>(initialFormData);
    const [missingMandatory, setMissingMandatory] = useState<string[]>([]);

    const handleChange = (field: keyof StoreFormData, value: string) => {
        setFormData((prev) => {
            const next = { ...prev, [field]: value };

            if (field === "serverIp") {
                const normalizedIp = value.trim();
                if (normalizedIp) {
                    next.utmUrl = `http://${normalizedIp}:8080`;
                    next.retailUrl = `http://${normalizedIp}:8090`;
                } else {
                    next.utmUrl = "";
                    next.retailUrl = "";
                }
            }

            return next;
        });
    };

    const resetForm = () => {
        setFormData(initialFormData);
        setMissingMandatory([]);
    };

    const checkMandatoryFields = () => {
        const missing: string[] = [];

        if (!formData.name.trim()) missing.push("Название (SAP код)");
        if (!formData.address.trim()) missing.push("Адрес");
        if (!formData.city.trim()) missing.push("Город");
        if (!formData.region.trim()) missing.push("Регион");
        if (!formData.cfo.trim()) missing.push("ЦФО");
        if (!formData.serverIp.trim()) missing.push("IP сервера");
        if (!formData.providerIp1.trim() && !formData.providerIp2.trim()) missing.push("Хотя бы один IP провайдера");
        if (!formData.legalEntity.trim()) missing.push("Юр. лицо");

        return missing;
    };

    const handleSubmit = async () => {
        setLoading(true);

        try {
            const token = localStorage.getItem("accessToken");
            const normalizedPayload = {
                name: formData.name.trim(),
                status: formData.status,
                address: formData.address.trim(),
                city: formData.city.trim() || undefined,
                region: formData.region.trim() || undefined,
                cfo: formData.cfo.trim() || undefined,
                phone: formData.phone.trim() || undefined,
                email: formData.email.trim() || undefined,
                manager: formData.manager.trim() || undefined,
                serverIp: formData.serverIp.trim() || undefined,
                providerIp1: formData.providerIp1.trim() || undefined,
                providerIp2: formData.providerIp2.trim() || undefined,
                utmUrl: formData.utmUrl.trim() || undefined,
                retailUrl: formData.retailUrl.trim() || undefined,
                legalEntity: formData.legalEntity.trim() || undefined,
                inn: formData.inn.trim() || undefined,
                kpp: formData.kpp.trim() || undefined,
                fsrarId: formData.fsrarId.trim() || undefined,
                cctvSystem: formData.cctvSystem.trim() || undefined,
                cameraCount: formData.cameraCount ? Number.parseInt(formData.cameraCount, 10) : null,
            };
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api"}/stores`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(normalizedPayload),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || "Ошибка создания магазина");
            }

            toast.success("Магазин создан");
            setOpen(false);
            setConfirmationOpen(false);
            resetForm();
            onSuccess?.();
        } catch (error: unknown) {
            console.error(error);
            toast.error(error instanceof Error ? error.message : "Не удалось создать магазин");
        } finally {
            setLoading(false);
        }
    };

    const handlePreSubmit = () => {
        const missing = checkMandatoryFields();
        if (missing.length > 0) {
            setMissingMandatory(missing);
            setConfirmationOpen(true);
            return;
        }

        void handleSubmit();
    };

    return (
        <>
            <Dialog
                open={open}
                onOpenChange={(nextOpen) => {
                    setOpen(nextOpen);
                    if (!nextOpen) {
                        setConfirmationOpen(false);
                        resetForm();
                    }
                }}
            >
                <DialogTrigger asChild>
                    <Button variant="gradient">
                        <Plus className="mr-2 h-4 w-4" />
                        Новый магазин
                    </Button>
                </DialogTrigger>
                <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[1000px]">
                    <DialogHeader>
                        <DialogTitle>Новый магазин</DialogTitle>
                        <DialogDescription>
                            Заполните данные магазина. Обязательные поля помечены звездочкой.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid grid-cols-1 gap-8 py-4 lg:grid-cols-2">
                        <div className="space-y-6">
                            <div className="space-y-4">
                                <h3 className="border-b pb-1 text-sm font-medium text-muted-foreground">Основная информация</h3>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="name" className="after:ml-0.5 after:text-red-500 after:content-['*']">
                                            Название (SAP код)
                                        </Label>
                                        <Input
                                            id="name"
                                            value={formData.name}
                                            onChange={(e) => handleChange("name", e.target.value)}
                                            placeholder="A000"
                                            className={cn(!formData.name && "border-primary/50")}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="status" className="after:ml-0.5 after:text-red-500 after:content-['*']">
                                            Статус
                                        </Label>
                                        <Select value={formData.status} onValueChange={(value: StoreStatus) => handleChange("status", value)}>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {statusOptions.map((option) => (
                                                    <SelectItem key={option.value} value={option.value}>
                                                        <span className={option.color}>{option.label}</span>
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="address" className="after:ml-0.5 after:text-red-500 after:content-['*']">
                                        Адрес
                                    </Label>
                                    <Input
                                        id="address"
                                        value={formData.address}
                                        onChange={(e) => handleChange("address", e.target.value)}
                                        placeholder="Введите адрес"
                                    />
                                </div>

                                <div className="grid grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="city" className="after:ml-0.5 after:text-red-500 after:content-['*']">
                                            Город
                                        </Label>
                                        <Input id="city" value={formData.city} onChange={(e) => handleChange("city", e.target.value)} />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="cfo" className="after:ml-0.5 after:text-red-500 after:content-['*']">
                                            ЦФО
                                        </Label>
                                        <Input id="cfo" value={formData.cfo} onChange={(e) => handleChange("cfo", e.target.value)} />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="region" className="after:ml-0.5 after:text-red-500 after:content-['*']">
                                            Регион
                                        </Label>
                                        <Input id="region" value={formData.region} onChange={(e) => handleChange("region", e.target.value)} />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="phone">Телефон</Label>
                                        <Input id="phone" value={formData.phone} onChange={(e) => handleChange("phone", e.target.value)} />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="manager">Менеджер</Label>
                                        <Input id="manager" value={formData.manager} onChange={(e) => handleChange("manager", e.target.value)} />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="email">Email</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => handleChange("email", e.target.value)}
                                        placeholder="store@example.com"
                                    />
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h3 className="border-b pb-1 text-sm font-medium text-muted-foreground">Техническая информация</h3>

                                <div className="grid grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="serverIp" className="after:ml-0.5 after:text-red-500 after:content-['*']">
                                            IP сервера
                                        </Label>
                                        <Input
                                            id="serverIp"
                                            value={formData.serverIp}
                                            onChange={(e) => handleChange("serverIp", e.target.value)}
                                            placeholder="10.x.x.x"
                                        />
                                    </div>

                                    <div className="col-span-2 space-y-2">
                                        <Label className="after:ml-0.5 after:text-red-500 after:content-['*']">IP провайдеров (мин. 1)</Label>
                                        <div className="grid grid-cols-2 gap-2">
                                            <Input
                                                placeholder="Провайдер 1"
                                                value={formData.providerIp1}
                                                onChange={(e) => handleChange("providerIp1", e.target.value)}
                                            />
                                            <Input
                                                placeholder="Провайдер 2"
                                                value={formData.providerIp2}
                                                onChange={(e) => handleChange("providerIp2", e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="utmUrl">Ссылка УТМ</Label>
                                        <Input id="utmUrl" value={formData.utmUrl} readOnly className="bg-muted" />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="retailUrl">Ссылка Retail</Label>
                                        <Input id="retailUrl" value={formData.retailUrl} readOnly className="bg-muted" />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h3 className="border-b pb-1 text-sm font-medium text-muted-foreground">Юридическая информация</h3>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="legalEntity" className="after:ml-0.5 after:text-red-500 after:content-['*']">
                                            Юр. лицо
                                        </Label>
                                        <Input
                                            id="legalEntity"
                                            value={formData.legalEntity}
                                            onChange={(e) => handleChange("legalEntity", e.target.value)}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="fsrarId">ФСРАР</Label>
                                        <Input id="fsrarId" value={formData.fsrarId} onChange={(e) => handleChange("fsrarId", e.target.value)} />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="inn">ИНН</Label>
                                        <Input id="inn" value={formData.inn} onChange={(e) => handleChange("inn", e.target.value)} />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="kpp">КПП</Label>
                                        <Input id="kpp" value={formData.kpp} onChange={(e) => handleChange("kpp", e.target.value)} />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h3 className="border-b pb-1 text-sm font-medium text-muted-foreground">Видеонаблюдение</h3>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="cctvSystem">Система</Label>
                                        <Input
                                            id="cctvSystem"
                                            value={formData.cctvSystem}
                                            onChange={(e) => handleChange("cctvSystem", e.target.value)}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="cameraCount">Кол-во камер</Label>
                                        <Input
                                            id="cameraCount"
                                            type="number"
                                            min="0"
                                            value={formData.cameraCount}
                                            onChange={(e) => handleChange("cameraCount", e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col gap-4">
                            <div className="sticky top-0">
                                <Label className="mb-2 block">Расположение на карте</Label>
                                <div className="relative h-[400px] overflow-hidden rounded-xl border border-border shadow-md">
                                    <YandexMap
                                        height="100%"
                                        width="100%"
                                        address={formData.city && formData.address ? `${formData.city}, ${formData.address}` : undefined}
                                        placemarks={[]}
                                        zoom={15}
                                    />
                                    <div className="absolute right-2 top-2 flex gap-2">
                                        <Button size="sm" variant="secondary" className="pointer-events-none opacity-90 shadow-sm">
                                            <MapPin className="mr-2 h-4 w-4" />
                                            Автопоиск по адресу
                                        </Button>
                                    </div>
                                </div>

                                <div className="mt-4 rounded-lg border border-border/50 bg-muted/30 p-4 text-sm text-muted-foreground">
                                    <p>Карта обновляется автоматически при вводе города и адреса.</p>
                                    <p className="mt-2">
                                        Поля со звездочкой обязательны. Если они не заполнены, система попросит подтверждение перед созданием
                                        магазина.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                            Отмена
                        </Button>
                        <Button type="button" onClick={handlePreSubmit} disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            <Plus className="mr-2 h-4 w-4" />
                            Создать магазин
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AlertDialog open={confirmationOpen} onOpenChange={setConfirmationOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Неполные данные</AlertDialogTitle>
                        <div className="space-y-4 text-sm text-muted-foreground">
                            <p>Следующие обязательные поля не заполнены:</p>
                            <ul className="list-inside list-disc font-medium text-red-500">
                                {missingMandatory.map((field) => (
                                    <li key={field}>{field}</li>
                                ))}
                            </ul>
                            <p>
                                Вы уверены, что хотите создать магазин с неполными данными? Он будет помечен как
                                {" "}
                                &quot;Не заполнен&quot;.
                            </p>
                        </div>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setConfirmationOpen(false)}>Отмена</AlertDialogCancel>
                        <AlertDialogAction onClick={() => void handleSubmit()} className="bg-red-500 hover:bg-red-600">
                            Создать все равно
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
