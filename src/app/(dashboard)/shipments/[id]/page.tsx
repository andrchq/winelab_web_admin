import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import {
    ArrowLeft,
    Package,
    Truck,
    CheckCircle2,
    Circle,
    Printer,
    MapPin,
    User,
    Clock,
    ClipboardCheck
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

// Мок данные
const shipment = {
    id: "SHP-2024-0089",
    request: "REQ-2024-0142",
    store: {
        id: 89,
        name: "Магазин #89 - ТРК Атриум",
        address: "ул. Атриум, д. 15"
    },
    status: "READY",
    createdAt: "2024-01-27 10:30",
    assembledBy: "Петров Владимир",
    warehouse: "Склад А",
};

const items = [
    {
        id: 1,
        sn: "RTR-X500-002345",
        model: "Роутер X500",
        bin: "A-12-3",
        picked: true,
        pickedAt: "10:45"
    },
    {
        id: 2,
        sn: "CBL-ETH-10M-009",
        model: "Кабель Ethernet 10м",
        bin: "B-05-1",
        picked: true,
        pickedAt: "10:48"
    },
    {
        id: 3,
        sn: "PWR-ADP-12V-023",
        model: "Блок питания 12V",
        bin: "C-01-2",
        picked: true,
        pickedAt: "10:50"
    },
];

const statusMap: Record<string, { label: string; variant: "default" | "warning" | "success" | "secondary" }> = {
    DRAFT: { label: "Черновик", variant: "secondary" },
    PICKING: { label: "Сборка", variant: "warning" },
    READY: { label: "Готова", variant: "success" },
    SHIPPED: { label: "Отправлена", variant: "success" },
};

export default function ShipmentDetailPage() {
    const allPicked = items.every(item => item.picked);

    return (
        <div className="flex h-screen bg-background">
            <Sidebar />
            <div className="flex flex-1 flex-col overflow-hidden">
                <Header />
                <main className="flex-1 overflow-y-auto p-6">
                    <div className="mx-auto max-w-4xl space-y-6 animate-fade-in">
                        {/* Back */}
                        <div className="flex items-center justify-between">
                            <Link href="/shipments">
                                <Button variant="ghost" className="gap-2">
                                    <ArrowLeft className="h-4 w-4" />
                                    Назад к отгрузкам
                                </Button>
                            </Link>
                            <div className="flex gap-2">
                                <Button variant="outline">
                                    <Printer className="h-4 w-4" />
                                    Печать накладной
                                </Button>
                                {shipment.status === "READY" && (
                                    <Button variant="gradient">
                                        <Truck className="h-4 w-4" />
                                        Создать доставку
                                    </Button>
                                )}
                            </div>
                        </div>

                        {/* Shipment Header */}
                        <Card>
                            <CardContent className="p-6">
                                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-mono text-lg font-bold">{shipment.id}</span>
                                            <Badge variant={statusMap[shipment.status]?.variant || "default"}>
                                                {statusMap[shipment.status]?.label}
                                            </Badge>
                                        </div>
                                        <div className="mt-3 space-y-2 text-sm">
                                            <p className="flex items-center gap-2">
                                                <Package className="h-4 w-4 text-muted-foreground" />
                                                <span className="text-muted-foreground">Заявка:</span>
                                                <Link href={`/requests/${shipment.request}`} className="text-primary hover:underline">
                                                    {shipment.request}
                                                </Link>
                                            </p>
                                            <p className="flex items-center gap-2">
                                                <MapPin className="h-4 w-4 text-muted-foreground" />
                                                <span className="text-muted-foreground">Получатель:</span>
                                                <Link href={`/stores/${shipment.store.id}`} className="text-primary hover:underline">
                                                    {shipment.store.name}
                                                </Link>
                                            </p>
                                            <p className="flex items-center gap-2">
                                                <User className="h-4 w-4 text-muted-foreground" />
                                                <span className="text-muted-foreground">Собрал:</span>
                                                <span>{shipment.assembledBy}</span>
                                            </p>
                                        </div>
                                    </div>

                                    {/* Stats */}
                                    <div className="flex gap-4">
                                        <div className="text-center">
                                            <p className="text-3xl font-bold text-emerald-500">{items.filter(i => i.picked).length}</p>
                                            <p className="text-xs text-muted-foreground">Собрано</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-3xl font-bold">{items.length}</p>
                                            <p className="text-xs text-muted-foreground">Всего</p>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Progress */}
                        {allPicked && (
                            <div className="flex items-center gap-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-4">
                                <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                                <div>
                                    <p className="font-medium text-emerald-500">Сборка завершена</p>
                                    <p className="text-sm text-muted-foreground">Все позиции собраны, можно передавать в доставку</p>
                                </div>
                            </div>
                        )}

                        {/* Picking List */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <ClipboardCheck className="h-5 w-5 text-primary" />
                                    Лист сборки
                                </CardTitle>
                                <CardDescription>Склад: {shipment.warehouse}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    {items.map((item) => (
                                        <div
                                            key={item.id}
                                            className={`flex items-center justify-between rounded-lg border p-4 transition-all ${item.picked
                                                    ? "border-emerald-500/30 bg-emerald-500/5"
                                                    : "border-border hover:bg-accent/30"
                                                }`}
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${item.picked ? "bg-emerald-500/10" : "bg-muted"
                                                    }`}>
                                                    {item.picked ? (
                                                        <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                                                    ) : (
                                                        <Circle className="h-5 w-5 text-muted-foreground" />
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="font-medium">{item.model}</p>
                                                    <p className="text-sm text-muted-foreground font-mono">{item.sn}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <div className="text-right">
                                                    <p className="text-sm font-medium">Ячейка: {item.bin}</p>
                                                    {item.picked && (
                                                        <p className="text-xs text-muted-foreground flex items-center gap-1 justify-end">
                                                            <Clock className="h-3 w-3" />
                                                            {item.pickedAt}
                                                        </p>
                                                    )}
                                                </div>
                                                {!item.picked && (
                                                    <Button size="sm" variant="outline">
                                                        Собрано
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </main>
            </div>
        </div>
    );
}
