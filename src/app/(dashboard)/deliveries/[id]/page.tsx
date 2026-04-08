"use client";

import { useState } from "react";
import {
    ArrowLeft,
    CheckCircle2,
    Clock,
    ExternalLink,
    Loader2,
    Mail,
    MapPin,
    Package,
    Phone,
    RefreshCw,
    Truck,
    User,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useDelivery } from "@/lib/hooks";
import { deliveryApi } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { SystemPermission } from "@/lib/permissions";
import { YandexMap } from "@/components/maps";

const statusMap: Record<string, { label: string; variant: "default" | "success" | "warning" | "destructive" | "secondary" }> = {
    CREATED: { label: "Создана", variant: "secondary" },
    COURIER_ASSIGNED: { label: "Курьер назначен", variant: "default" },
    PICKED_UP: { label: "Забрана", variant: "warning" },
    IN_TRANSIT: { label: "В пути", variant: "warning" },
    DELIVERED: { label: "Доставлена", variant: "success" },
    PROBLEM: { label: "Проблема", variant: "destructive" },
    CANCELLED: { label: "Отменена", variant: "destructive" },
};

type TimelineEvent = {
    id: string;
    time: string;
    title: string;
    status: "completed" | "current" | "pending";
    description?: string;
};

export default function DeliveryDetailPage() {
    const params = useParams();
    const id = params.id as string;
    const { hasPermission } = useAuth();
    const { data: delivery, isLoading, error, refetch } = useDelivery(id);
    const [isUpdating, setIsUpdating] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const canUpdateDelivery = hasPermission([SystemPermission.DELIVERY_UPDATE]);
    const isYandexDelivery = delivery?.provider === "YANDEX_DELIVERY";
    const shipmentLineItems = delivery?.shipment?.lines
        ?.filter((line) => Number(line.scannedQuantity || 0) > 0)
        .flatMap((line) => {
            const serializedScans = (line.scans || [])
                .filter((scan) => Number(scan.quantity || 0) > 0)
                .map((scan) => ({
                    id: `${line.id}-${scan.id}`,
                    name: line.product?.name || line.originalName || "Оборудование",
                    serialNumber: scan.code || "Без ШК",
                    quantity: scan.quantity || 1,
                }));

            if (serializedScans.length > 0) {
                return serializedScans;
            }

            return [
                {
                    id: line.id,
                    name: line.product?.name || line.originalName || "Оборудование",
                    serialNumber: line.sku || "Количественная позиция",
                    quantity: Number(line.scannedQuantity || 0),
                },
            ];
        }) || [];

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleString("ru-RU", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const buildTimeline = () => {
        if (!delivery) return [];

        const timeline: TimelineEvent[] = [
            {
                id: "1",
                time: formatDate(delivery.createdAt),
                title: "Доставка создана",
                status: "completed",
            },
        ];

        if (delivery.courierName) {
            timeline.push({
                id: "2",
                time: delivery.updatedAt ? formatDate(delivery.updatedAt) : "—",
                title: "Курьер назначен",
                description: delivery.courierName,
                status: "completed",
            });
        }

        if (["PICKED_UP", "IN_TRANSIT", "DELIVERED"].includes(delivery.status)) {
            timeline.push({
                id: "3",
                time: delivery.updatedAt ? formatDate(delivery.updatedAt) : "—",
                title: "Забрано со склада",
                status: "completed",
            });
        }

        if (["IN_TRANSIT", "DELIVERED"].includes(delivery.status)) {
            timeline.push({
                id: "4",
                time: delivery.status === "DELIVERED"
                    ? formatDate(delivery.deliveredAt || delivery.updatedAt || delivery.createdAt)
                    : "Сейчас",
                title: delivery.status === "DELIVERED" ? "Доставлено" : "В пути",
                status: delivery.status === "DELIVERED" ? "completed" : "current",
            });
        } else if (!["CANCELLED", "PROBLEM"].includes(delivery.status)) {
            timeline.push({
                id: "4",
                time: "—",
                title: "Доставка",
                status: "pending",
            });
        }

        return timeline;
    };

    const handleStatusChange = async (status: "COURIER_ASSIGNED" | "PICKED_UP" | "IN_TRANSIT" | "DELIVERED") => {
        if (!delivery) {
            return;
        }

        setIsUpdating(true);
        try {
            await deliveryApi.updateStatus(delivery.id, {
                status,
                courierName: status === "COURIER_ASSIGNED" ? delivery.courierName || "Курьер назначен" : delivery.courierName,
                courierPhone: delivery.courierPhone,
            });
            toast.success(
                status === "DELIVERED"
                    ? "Доставка завершена, заявка закрыта"
                    : status === "IN_TRANSIT"
                      ? "Доставка переведена в статус В пути"
                      : status === "PICKED_UP"
                        ? "Отмечено как забрано со склада"
                        : "Курьер назначен",
            );
            await refetch();
        } catch (updateError) {
            toast.error(updateError instanceof Error ? updateError.message : "Не удалось обновить доставку");
        } finally {
            setIsUpdating(false);
        }
    };

    const handleSyncProvider = async () => {
        if (!delivery) {
            return;
        }

        setIsSyncing(true);
        try {
            await deliveryApi.syncProvider(delivery.id);
            toast.success("Статус обновлен из Yandex Delivery");
            await refetch();
        } catch (syncError) {
            toast.error(syncError instanceof Error ? syncError.message : "Не удалось обновить статус из Yandex Delivery");
        } finally {
            setIsSyncing(false);
        }
    };

    return (
        <div className="p-6">
            <div className="mx-auto max-w-3xl space-y-6 animate-fade-in">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <Link href="/deliveries">
                        <Button variant="ghost" className="gap-2">
                            <ArrowLeft className="h-4 w-4" />
                            Назад к доставкам
                        </Button>
                    </Link>
                    <div className="flex flex-wrap items-center gap-2">
                        {delivery?.trackingUrl && (
                            <a href={delivery.trackingUrl} target="_blank" rel="noopener noreferrer">
                                <Button variant="outline" className="gap-2">
                                    <ExternalLink className="h-4 w-4" />
                                    Открыть в Яндекс.Доставка
                                </Button>
                            </a>
                        )}
                        {delivery && isYandexDelivery && (
                            <Button variant="outline" className="gap-2" onClick={handleSyncProvider} disabled={isSyncing}>
                                {isSyncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                                Обновить из Яндекса
                            </Button>
                        )}
                    </div>
                </div>

                {delivery && canUpdateDelivery && !isYandexDelivery && !["DELIVERED", "CANCELLED"].includes(delivery.status) && (
                    <Card>
                        <CardContent className="flex flex-wrap gap-2 p-4">
                            {delivery.status === "CREATED" && (
                                <Button variant="outline" disabled={isUpdating} onClick={() => handleStatusChange("COURIER_ASSIGNED")}>
                                    {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Назначить курьера"}
                                </Button>
                            )}
                            {["CREATED", "COURIER_ASSIGNED"].includes(delivery.status) && (
                                <Button variant="outline" disabled={isUpdating} onClick={() => handleStatusChange("PICKED_UP")}>
                                    {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Забрано со склада"}
                                </Button>
                            )}
                            {["COURIER_ASSIGNED", "PICKED_UP"].includes(delivery.status) && (
                                <Button variant="outline" disabled={isUpdating} onClick={() => handleStatusChange("IN_TRANSIT")}>
                                    {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : "В пути"}
                                </Button>
                            )}
                            {["COURIER_ASSIGNED", "PICKED_UP", "IN_TRANSIT"].includes(delivery.status) && (
                                <Button variant="gradient" disabled={isUpdating} onClick={() => handleStatusChange("DELIVERED")}>
                                    {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Доставлено"}
                                </Button>
                            )}
                        </CardContent>
                    </Card>
                )}

                {isLoading ? (
                    <div className="flex items-center justify-center py-24">
                        <Loader2 className="h-12 w-12 animate-spin text-primary" />
                    </div>
                ) : error ? (
                    <div className="py-24 text-center text-red-400">Ошибка загрузки: {error}</div>
                ) : !delivery ? (
                    <div className="py-24 text-center text-muted-foreground">Доставка не найдена</div>
                ) : (
                    <>
                        <Card>
                            <CardContent className="p-6">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="font-mono text-sm text-muted-foreground">
                                                {delivery.externalId || delivery.id.slice(0, 8)}
                                            </span>
                                            <Badge variant={statusMap[delivery.status]?.variant || "secondary"}>
                                                {statusMap[delivery.status]?.label || delivery.status}
                                            </Badge>
                                            <Badge variant="outline">
                                                {isYandexDelivery ? "Yandex Delivery" : delivery.provider}
                                            </Badge>
                                        </div>
                                        {delivery.store && (
                                            <Link href={`/stores/${delivery.store.id}`}>
                                                <h1 className="mt-2 flex items-center gap-2 text-2xl font-bold text-primary hover:underline">
                                                    <MapPin className="h-5 w-5" />
                                                    {delivery.store.name}
                                                </h1>
                                            </Link>
                                        )}
                                        <p className="text-muted-foreground">{delivery.store?.address}</p>
                                    </div>
                                    <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-primary/10">
                                        <Truck className="h-8 w-8 text-primary" />
                                    </div>
                                </div>

                                {delivery.courierName && (
                                    <div className="mt-6 rounded-lg border border-border/50 bg-muted/30 p-4">
                                        <p className="mb-2 text-sm text-muted-foreground">Курьер</p>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                                                    <User className="h-5 w-5 text-primary" />
                                                </div>
                                                <div>
                                                    <p className="font-medium">{delivery.courierName}</p>
                                                    {delivery.courierPhone && (
                                                        <p className="flex items-center gap-1 text-sm text-muted-foreground">
                                                            <Phone className="h-3 w-3" />
                                                            {delivery.courierPhone}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                            {delivery.courierPhone && (
                                                <a href={`tel:${delivery.courierPhone}`}>
                                                    <Button variant="outline" size="sm">
                                                        Позвонить
                                                    </Button>
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {isYandexDelivery && (
                                    <div className="mt-6 grid gap-3 rounded-lg border border-border/50 bg-muted/20 p-4 md:grid-cols-2">
                                        <div className="space-y-1">
                                            <p className="text-sm text-muted-foreground">Отправитель</p>
                                            <p className="font-medium">{delivery.sourceContactName || "Не заполнено"}</p>
                                            <p className="flex items-center gap-1 text-sm text-muted-foreground">
                                                <Phone className="h-3 w-3" />
                                                {delivery.sourceContactPhone || "Телефон не заполнен"}
                                            </p>
                                            <p className="flex items-center gap-1 text-sm text-muted-foreground">
                                                <Mail className="h-3 w-3" />
                                                {delivery.sourceContactEmail || "Email не заполнен"}
                                            </p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-sm text-muted-foreground">Получатель</p>
                                            <p className="font-medium">{delivery.recipientContactName || "Не заполнено"}</p>
                                            <p className="flex items-center gap-1 text-sm text-muted-foreground">
                                                <Phone className="h-3 w-3" />
                                                {delivery.recipientContactPhone || "Телефон не заполнен"}
                                            </p>
                                            {delivery.recipientComment && (
                                                <p className="text-sm text-muted-foreground">{delivery.recipientComment}</p>
                                            )}
                                        </div>
                                        {delivery.rawStatus && (
                                            <div className="rounded-md bg-background/80 px-3 py-2 text-sm text-muted-foreground md:col-span-2">
                                                Статус провайдера: <span className="font-mono">{delivery.rawStatus}</span>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Clock className="h-5 w-5 text-primary" />
                                    Хронология
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {buildTimeline().map((event, index, list) => (
                                        <div key={event.id} className="flex items-start gap-4">
                                            <div className="flex flex-col items-center">
                                                {event.status === "completed" ? (
                                                    <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                                                ) : event.status === "current" ? (
                                                    <div className="h-6 w-6 rounded-full border-2 border-primary bg-primary/20 animate-pulse" />
                                                ) : (
                                                    <div className="h-6 w-6 rounded-full border-2 border-muted-foreground" />
                                                )}
                                                {index < list.length - 1 && <div className="mt-1 h-8 w-0.5 bg-border" />}
                                            </div>
                                            <div className="flex-1 pb-2">
                                                <div className="flex items-center justify-between">
                                                    <p className={`font-medium ${event.status === "pending" ? "text-muted-foreground" : ""}`}>
                                                        {event.title}
                                                    </p>
                                                    <span className="text-xs text-muted-foreground">{event.time}</span>
                                                </div>
                                                {event.description && (
                                                    <p className="text-sm text-muted-foreground">{event.description}</p>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        {shipmentLineItems.length > 0 && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Package className="h-5 w-5 text-primary" />
                                        Содержимое ({shipmentLineItems.length})
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-2">
                                        {shipmentLineItems.map((item) => (
                                            <div key={item.id} className="flex items-center justify-between rounded-lg border border-border/50 p-3">
                                                <div>
                                                    <p className="font-medium">{item.name}</p>
                                                    <p className="font-mono text-sm text-muted-foreground">{item.serialNumber}</p>
                                                </div>
                                                <Badge variant="secondary">{item.quantity} шт.</Badge>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        <Card>
                            <CardContent className="h-[400px] overflow-hidden rounded-xl p-0">
                                <YandexMap
                                    height={400}
                                    zoom={10}
                                    placemarks={[
                                        {
                                            coordinates: [55.73, 37.60],
                                            title: "Склад",
                                            description: "Точка отправления",
                                        },
                                        {
                                            coordinates: [55.75, 37.62],
                                            title: delivery.store?.name || "Магазин",
                                            description: delivery.store?.address,
                                        },
                                    ]}
                                />
                            </CardContent>
                        </Card>
                    </>
                )}
            </div>
        </div>
    );
}
