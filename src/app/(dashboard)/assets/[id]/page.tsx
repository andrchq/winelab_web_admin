"use client";

import {
    ArrowLeft,
    QrCode,
    MapPin,
    Clock,
    Wrench,
    History,
    Package,
    AlertTriangle,
    CheckCircle2,
    Loader2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAsset } from "@/lib/hooks";

const conditionMap: Record<string, { label: string; variant: "success" | "warning" | "destructive" | "secondary" }> = {
    NEW: { label: "Новое", variant: "success" },
    GOOD: { label: "Хорошее", variant: "success" },
    FAIR: { label: "Удовлетворительное", variant: "warning" },
    REPAIR: { label: "На ремонте", variant: "destructive" },
    DECOMMISSIONED: { label: "Списан", variant: "secondary" },
};

const processMap: Record<string, { label: string; color: string }> = {
    AVAILABLE: { label: "Свободен", color: "text-emerald-500" },
    RESERVED: { label: "Зарезервирован", color: "text-violet-500" },
    IN_TRANSIT: { label: "В доставке", color: "text-blue-500" },
    DELIVERED: { label: "Доставлен", color: "text-amber-500" },
    INSTALLED: { label: "Установлен", color: "text-emerald-500" },
};

export default function AssetDetailPage() {
    const params = useParams();
    const id = params.id as string;
    const { data: asset, isLoading, error } = useAsset(id);

    return (
        <div className="p-6">
            <div className="mx-auto max-w-4xl space-y-6 animate-fade-in">
                {/* Back */}
                <div className="flex items-center justify-between">
                    <Link href="/assets">
                        <Button variant="ghost" className="gap-2">
                            <ArrowLeft className="h-4 w-4" />
                            Назад к серийникам
                        </Button>
                    </Link>
                    <div className="flex gap-2">
                        <Button variant="outline">
                            <Wrench className="h-4 w-4" />
                            Создать заявку на ремонт
                        </Button>
                        <Button variant="outline">Редактировать</Button>
                    </div>
                </div>

                {isLoading ? (
                    <div className="flex items-center justify-center py-24">
                        <Loader2 className="h-12 w-12 animate-spin text-primary" />
                    </div>
                ) : error ? (
                    <div className="text-center py-24 text-red-400">
                        Ошибка загрузки: {error}
                    </div>
                ) : !asset ? (
                    <div className="text-center py-24 text-muted-foreground">
                        Актив не найден
                    </div>
                ) : (
                    <>
                        {/* Asset Header */}
                        <Card>
                            <CardContent className="p-6">
                                <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
                                    <div className="flex items-start gap-4">
                                        {/* QR Code placeholder */}
                                        <div className="flex h-24 w-24 items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted/30">
                                            <QrCode className="h-12 w-12 text-muted-foreground" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <Badge variant={conditionMap[asset.condition]?.variant || "secondary"}>
                                                    {conditionMap[asset.condition]?.label || asset.condition}
                                                </Badge>
                                                <span className={processMap[asset.processStatus]?.color || "text-muted-foreground"}>
                                                    {processMap[asset.processStatus]?.label || asset.processStatus}
                                                </span>
                                            </div>
                                            <h1 className="mt-2 text-2xl font-bold font-mono">{asset.serialNumber}</h1>
                                            <p className="text-lg text-muted-foreground">{asset.product?.name}</p>
                                            <p className="text-sm text-muted-foreground">{asset.product?.category}</p>
                                        </div>
                                    </div>

                                    {/* Location */}
                                    {(asset.store || asset.warehouse) && (
                                        <div className="rounded-lg bg-primary/5 border border-primary/20 p-4">
                                            <p className="text-xs text-muted-foreground">Текущее местоположение</p>
                                            {asset.store ? (
                                                <Link href={`/stores/${asset.store.id}`} className="flex items-center gap-2 mt-1 text-primary hover:underline">
                                                    <MapPin className="h-4 w-4" />
                                                    <span className="font-medium">{asset.store.name}</span>
                                                </Link>
                                            ) : (
                                                <div className="flex items-center gap-2 mt-1">
                                                    <Package className="h-4 w-4" />
                                                    <span className="font-medium">{asset.warehouse?.name}</span>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        <div className="grid gap-6 md:grid-cols-2">
                            {/* Details */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Package className="h-5 w-5 text-primary" />
                                        Характеристики
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Модель</span>
                                        <span className="font-medium">{asset.product?.name}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Артикул</span>
                                        <span>{asset.product?.sku}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Категория</span>
                                        <span>{asset.product?.category}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Создан</span>
                                        <span>{new Date(asset.createdAt).toLocaleDateString('ru-RU')}</span>
                                    </div>
                                    {asset.notes && (
                                        <div className="pt-2 border-t">
                                            <span className="text-sm text-muted-foreground">Примечания:</span>
                                            <p className="text-sm mt-1">{asset.notes}</p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Quick Actions */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base">Действия</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-2">
                                    <Button variant="outline" className="w-full justify-start gap-2">
                                        <Wrench className="h-4 w-4" />
                                        Отправить на ремонт
                                    </Button>
                                    <Button variant="outline" className="w-full justify-start gap-2">
                                        <Package className="h-4 w-4" />
                                        Переместить на склад
                                    </Button>
                                    <Button variant="outline" className="w-full justify-start gap-2 text-destructive">
                                        <AlertTriangle className="h-4 w-4" />
                                        Списать
                                    </Button>
                                </CardContent>
                            </Card>
                        </div>

                        {/* History */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <History className="h-5 w-5 text-primary" />
                                    История перемещений
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {asset.movements && asset.movements.length > 0 ? (
                                    <div className="space-y-4">
                                        {asset.movements.map((item: any, index: number) => (
                                            <div key={index} className="flex items-start gap-4">
                                                <div className="flex flex-col items-center">
                                                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                                                        <Clock className="h-4 w-4 text-primary" />
                                                    </div>
                                                    {index < (asset.movements?.length || 0) - 1 && (
                                                        <div className="h-8 w-0.5 bg-border" />
                                                    )}
                                                </div>
                                                <div className="flex-1 pb-4">
                                                    <div className="flex items-center justify-between">
                                                        <p className="font-medium">{item.action}</p>
                                                        <span className="text-xs text-muted-foreground">
                                                            {new Date(item.createdAt).toLocaleDateString('ru-RU')}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-muted-foreground">{item.location}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-8 text-muted-foreground">
                                        История перемещений пока пуста
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </>
                )}
            </div>
        </div>
    );
}
