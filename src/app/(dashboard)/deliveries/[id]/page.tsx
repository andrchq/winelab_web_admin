"use client";

import {
    ArrowLeft,
    ExternalLink,
    Loader2,
    MapPin,
    Truck,
    Package,
    CheckCircle2,
    Clock,
    Phone,
    User
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useDelivery } from "@/lib/hooks";
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

export default function DeliveryDetailPage() {
    const params = useParams();
    const id = params.id as string;
    const { data: delivery, isLoading, error } = useDelivery(id);

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Build timeline from delivery data
    const buildTimeline = () => {
        if (!delivery) return [];
        const timeline = [];

        timeline.push({
            id: '1',
            time: formatDate(delivery.createdAt),
            title: 'Доставка создана',
            status: 'completed'
        });

        if (delivery.courierName) {
            timeline.push({
                id: '2',
                time: delivery.pickedUpAt ? formatDate(delivery.pickedUpAt) : '—',
                title: 'Курьер назначен',
                description: delivery.courierName,
                status: 'completed'
            });
        }

        if (['PICKED_UP', 'IN_TRANSIT', 'DELIVERED'].includes(delivery.status)) {
            timeline.push({
                id: '3',
                time: delivery.pickedUpAt ? formatDate(delivery.pickedUpAt) : '—',
                title: 'Забрано со склада',
                status: 'completed'
            });
        }

        if (['IN_TRANSIT', 'DELIVERED'].includes(delivery.status)) {
            timeline.push({
                id: '4',
                time: delivery.status === 'DELIVERED' ? formatDate(delivery.deliveredAt || delivery.updatedAt || delivery.createdAt) : 'Сейчас',
                title: delivery.status === 'DELIVERED' ? 'Доставлено' : 'В пути',
                status: delivery.status === 'DELIVERED' ? 'completed' : 'current'
            });
        } else if (!['CANCELLED', 'PROBLEM'].includes(delivery.status)) {
            timeline.push({
                id: '4',
                time: '—',
                title: 'Доставка',
                status: 'pending'
            });
        }

        return timeline;
    };

    return (
        <div className="p-6">
            <div className="mx-auto max-w-3xl space-y-6 animate-fade-in">
                {/* Back Button */}
                <div className="flex items-center justify-between">
                    <Link href="/deliveries">
                        <Button variant="ghost" className="gap-2">
                            <ArrowLeft className="h-4 w-4" />
                            Назад к доставкам
                        </Button>
                    </Link>
                    {delivery?.trackingUrl && (
                        <a href={delivery.trackingUrl} target="_blank" rel="noopener noreferrer">
                            <Button variant="outline" className="gap-2">
                                <ExternalLink className="h-4 w-4" />
                                Открыть в Яндекс.Доставка
                            </Button>
                        </a>
                    )}
                </div>

                {isLoading ? (
                    <div className="flex items-center justify-center py-24">
                        <Loader2 className="h-12 w-12 animate-spin text-primary" />
                    </div>
                ) : error ? (
                    <div className="text-center py-24 text-red-400">
                        Ошибка загрузки: {error}
                    </div>
                ) : !delivery ? (
                    <div className="text-center py-24 text-muted-foreground">
                        Доставка не найдена
                    </div>
                ) : (
                    <>
                        {/* Delivery Header */}
                        <Card>
                            <CardContent className="p-6">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-mono text-sm text-muted-foreground">
                                                {delivery.externalId || delivery.id.slice(0, 8)}
                                            </span>
                                            <Badge variant={statusMap[delivery.status]?.variant || "secondary"}>
                                                {statusMap[delivery.status]?.label || delivery.status}
                                            </Badge>
                                        </div>
                                        {delivery.store && (
                                            <Link href={`/stores/${delivery.store.id}`}>
                                                <h1 className="mt-2 text-2xl font-bold text-primary hover:underline flex items-center gap-2">
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

                                {/* Courier Info */}
                                {delivery.courierName && (
                                    <div className="mt-6 p-4 rounded-lg bg-muted/30 border border-border/50">
                                        <p className="text-sm text-muted-foreground mb-2">Курьер</p>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                                                    <User className="h-5 w-5 text-primary" />
                                                </div>
                                                <div>
                                                    <p className="font-medium">{delivery.courierName}</p>
                                                    {delivery.courierPhone && (
                                                        <p className="text-sm text-muted-foreground flex items-center gap-1">
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
                            </CardContent>
                        </Card>

                        {/* Timeline */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Clock className="h-5 w-5 text-primary" />
                                    Хронология
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {buildTimeline().map((event, index) => (
                                        <div key={event.id} className="flex items-start gap-4">
                                            <div className="flex flex-col items-center">
                                                {event.status === 'completed' ? (
                                                    <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                                                ) : event.status === 'current' ? (
                                                    <div className="h-6 w-6 rounded-full border-2 border-primary bg-primary/20 animate-pulse" />
                                                ) : (
                                                    <div className="h-6 w-6 rounded-full border-2 border-muted-foreground" />
                                                )}
                                                {index < buildTimeline().length - 1 && (
                                                    <div className="h-8 w-0.5 bg-border mt-1" />
                                                )}
                                            </div>
                                            <div className="flex-1 pb-2">
                                                <div className="flex items-center justify-between">
                                                    <p className={`font-medium ${event.status === 'pending' ? 'text-muted-foreground' : ''}`}>
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

                        {/* Shipment Items */}
                        {delivery.shipment?.items && delivery.shipment.items.length > 0 && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Package className="h-5 w-5 text-primary" />
                                        Содержимое ({delivery.shipment.items.length})
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-2">
                                        {delivery.shipment.items.map((item: any) => (
                                            <Link key={item.id} href={`/assets/${item.asset?.id}`}>
                                                <div className="flex items-center justify-between rounded-lg border border-border/50 p-3 hover:bg-accent/30 transition-colors cursor-pointer">
                                                    <div>
                                                        <p className="font-medium">{item.asset?.product?.name}</p>
                                                        <p className="text-sm text-muted-foreground font-mono">{item.asset?.serialNumber}</p>
                                                    </div>
                                                    <Badge variant="secondary">{item.quantity} шт.</Badge>
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Map Route */}
                        <Card>
                            <CardContent className="p-0 overflow-hidden rounded-xl h-[400px]">
                                <YandexMap
                                    height={400}
                                    zoom={10}
                                    placemarks={[
                                        {
                                            coordinates: [55.73, 37.60],
                                            title: "Склад",
                                            description: "Точка отправления"
                                        },
                                        {
                                            coordinates: [55.75, 37.62],
                                            title: delivery.store?.name || "Магазин",
                                            description: delivery.store?.address
                                        }
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
