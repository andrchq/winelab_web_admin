"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useWarehouses, useStores } from "@/lib/hooks";
import { shippingService } from "@/lib/shipping-service";
import { useRouter } from "next/navigation";
import { Loader2, ArrowRight } from "lucide-react";
import { toast } from "sonner";

export default function NewShipmentPage() {
    const router = useRouter();
    const { data: warehouses, isLoading: isWarehousesLoading } = useWarehouses();
    const { data: stores, isLoading: isStoresLoading } = useStores();

    const [warehouseId, setWarehouseId] = useState<string>("");
    const [destinationType, setDestinationType] = useState<"store" | "warehouse" | "other">("store");
    const [destinationId, setDestinationId] = useState<string>("");
    const [manualDestination, setManualDestination] = useState<string>("");
    const [requestNumber, setRequestNumber] = useState<string>("");
    const [isLoading, setIsLoading] = useState(false);

    const handleCreateSession = () => {
        if (!warehouseId) {
            toast.error("Выберите склад отправитель");
            return;
        }

        let finalDestination = "";
        if (destinationType === 'store') {
            const store = stores?.find(s => s.id.toString() === destinationId);
            finalDestination = store ? store.name : "Unknown Store";
        } else if (destinationType === 'warehouse') {
            const warehouse = warehouses?.find(w => w.id === destinationId);
            finalDestination = warehouse ? warehouse.name : "Unknown Warehouse";
        } else {
            finalDestination = manualDestination;
        }

        if (!finalDestination) {
            toast.error("Укажите получателя");
            return;
        }

        setIsLoading(true);
        try {
            const session = shippingService.create({
                warehouseId,
                destination: finalDestination,
                items: [], // Start empty, add items in detail view
                requestNumber,
                type: requestNumber ? 'request' : 'manual'
            });
            toast.success("Сессия отгрузки создана");
            router.push(`/shipments/${session.id}`);
        } catch (e) {
            console.error(e);
            toast.error("Ошибка при создании сессии");
            setIsLoading(false);
        }
    };

    return (
        <div className="h-full bg-background p-4 md:p-6 flex items-center justify-center">
            <Card className="w-full max-w-lg">
                <CardHeader>
                    <CardTitle>Новая отгрузка</CardTitle>
                    <CardDescription>Создание новой сессии сбора и отправки.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label>Склад отправитель</Label>
                        <Select value={warehouseId} onValueChange={setWarehouseId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Выберите склад" />
                            </SelectTrigger>
                            <SelectContent>
                                {warehouses?.map(w => (
                                    <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Тип получателя</Label>
                        <Select value={destinationType} onValueChange={(v: "store" | "warehouse" | "other") => {
                            setDestinationType(v);
                            setDestinationId("");
                            setManualDestination("");
                        }}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="store">Магазин</SelectItem>
                                <SelectItem value="warehouse">Другой склад</SelectItem>
                                <SelectItem value="other">Другое</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {destinationType === 'store' && (
                        <div className="space-y-2">
                            <Label>Магазин</Label>
                            <Select value={destinationId} onValueChange={setDestinationId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Выберите магазин" />
                                </SelectTrigger>
                                <SelectContent className="max-h-[200px]">
                                    {stores?.map(s => (
                                        <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    {destinationType === 'warehouse' && (
                        <div className="space-y-2">
                            <Label>Склад получатель</Label>
                            <Select value={destinationId} onValueChange={setDestinationId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Выберите склад" />
                                </SelectTrigger>
                                <SelectContent>
                                    {warehouses?.filter(w => w.id !== warehouseId).map(w => (
                                        <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    {destinationType === 'other' && (
                        <div className="space-y-2">
                            <Label>Получатель (название)</Label>
                            <Input
                                placeholder="Введите название получателя"
                                value={manualDestination}
                                onChange={e => setManualDestination(e.target.value)}
                            />
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label>Номер заявки (необязательно)</Label>
                        <Input
                            placeholder="Например, REQ-12345"
                            value={requestNumber}
                            onChange={e => setRequestNumber(e.target.value)}
                        />
                    </div>
                </CardContent>
                <CardFooter className="flex justify-between">
                    <Button variant="ghost" onClick={() => router.back()}>Отмена</Button>
                    <Button onClick={handleCreateSession} disabled={isLoading || !warehouseId || (destinationType !== 'other' && !destinationId) || (destinationType === 'other' && !manualDestination)}>
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRight className="mr-2 h-4 w-4" />}
                        Создать
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
