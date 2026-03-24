"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Box, Minus, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { receivingService, ReceivingItem, ReceivingSession } from "@/lib/receiving-service";
import { useScanDetection } from "@/lib/use-scan-detection";
import { useTSDMode } from "@/contexts/TSDModeContext";
import { sounds } from "@/lib/sounds";

export default function ScanningPage() {
    const params = useParams();
    const router = useRouter();
    const sessionId = params?.id as string;
    const itemId = params?.itemId as string;
    const { isTSDMode } = useTSDMode();

    const [session, setSession] = useState<ReceivingSession | null>(null);
    const [item, setItem] = useState<ReceivingItem | null>(null);
    const [isBoxMode, setIsBoxMode] = useState(false);
    const [boxMultiplier, setBoxMultiplier] = useState(10);
    const [showBoxConfig, setShowBoxConfig] = useState(false);
    const [tempBoxQty, setTempBoxQty] = useState("10");

    const loadData = async () => {
        try {
            const data = await receivingService.getById(sessionId);
            if (!data) {
                router.push("/receiving");
                return;
            }

            setSession(data);
            const currentItem = data.items.find((entry) => entry.id === itemId);
            if (!currentItem) {
                sounds.error();
                toast.error("Товар не найден");
                router.push(`/receiving/${sessionId}`);
                return;
            }

            setItem(currentItem);
        } catch (error: any) {
            sounds.error();
            console.error(error);
            toast.error(error?.message || "Ошибка загрузки");
        }
    };

    useEffect(() => {
        void loadData();
    }, [sessionId, itemId]);

    const handleUpdate = async (qty: number, isManual = false, code?: string) => {
        if (!itemId || !sessionId) return;

        try {
            await receivingService.updateItem(sessionId, itemId, qty, isManual, code);
            await loadData();
            const message = isManual ? `Ручной ввод: ${qty}` : `Скан: +${qty}`;
            sounds.success();
            toast.success(message);
        } catch (error: any) {
            const message = error?.message || "";
            if (message.toLowerCase().includes("уже был отсканирован")) {
                sounds.warning();
                toast.warning("Этот штрихкод уже был отсканирован в этой приемке");
                return;
            }

            if (
                message.toLowerCase().includes("не был отправлен") ||
                message.toLowerCase().includes("другой модели") ||
                message.toLowerCase().includes("не найден в системе") ||
                message.toLowerCase().includes("статусе перемещения") ||
                message.toLowerCase().includes("только по одной единице") ||
                message.toLowerCase().includes("ручной ввод недоступен")
            ) {
                sounds.warning();
                toast.warning(message);
                return;
            }

            sounds.error();
            console.error(error);
            toast.error(message || "Ошибка обновления");
        }
    };

    const handleDelete = async (scanId: string) => {
        if (!itemId || !sessionId) return;

        try {
            await receivingService.removeScan(sessionId, itemId, scanId);
            await loadData();
            sounds.info();
            toast.info("Запись удалена");
        } catch (error: any) {
            sounds.error();
            console.error(error);
            toast.error(error?.message || "Ошибка удаления");
        }
    };

    useScanDetection({
        onScan: async (code) => {
            if (showBoxConfig) return;

            if (isBoxMode) {
                await handleUpdate(boxMultiplier, false, `BOX: ${code}`);
                return;
            }

            await handleUpdate(1, false, code);
        },
    });

    const handleBoxConfigSubmit = () => {
        const qty = parseInt(tempBoxQty, 10);
        if (qty > 0) {
            setBoxMultiplier(qty);
            setIsBoxMode(true);
            setShowBoxConfig(false);
            sounds.info();
        }
    };

    const toggleBoxMode = (checked: boolean) => {
        if (checked) {
            setTempBoxQty(boxMultiplier.toString());
            setShowBoxConfig(true);
        } else {
            setIsBoxMode(false);
        }
    };

    const isConsumable = () => item?.product?.category?.code === "ACCESSORY";

    if (!session || !item) return <div className="p-8">Загрузка...</div>;

    const progress = Math.min(100, Math.round(((item.scannedQuantity || 0) / item.expectedQuantity) * 100));
    const isOver = (item.scannedQuantity || 0) > item.expectedQuantity;

    return (
        <div className="flex flex-col h-full bg-background">
            <main className={`flex-1 overflow-y-auto ${isTSDMode ? "p-2" : "p-4"} bg-muted/10 relative`}>
                <div className="max-w-2xl mx-auto space-y-6 pb-20">
                    <div className="flex items-center gap-3">
                        <Button variant="ghost" size="icon" onClick={() => router.push(`/receiving/${sessionId}`)} className="h-10 w-10 shrink-0">
                            <ArrowLeft className="h-6 w-6" />
                        </Button>
                        <div className="min-w-0 flex-1">
                            <h2 className="text-lg md:text-xl font-bold leading-tight truncate px-1">{item.name}</h2>
                            <p className="text-xs md:text-sm text-muted-foreground px-1 truncate">{item.sku || "Без артикула"}</p>
                        </div>
                    </div>

                    <Card
                        className={`border-2 shadow-md transition-colors duration-300 ${isOver
                            ? "border-red-500/50 bg-red-500/5"
                            : item.scannedQuantity === item.expectedQuantity
                                ? "border-green-500/50 bg-green-500/5"
                                : "border-primary/50 bg-primary/5"
                            }`}
                    >
                        <CardContent className="p-4 md:p-6 text-center">
                            <div className="text-[10px] md:text-sm uppercase tracking-wider text-muted-foreground mb-1 md:mb-2 font-bold opacity-80">
                                Принято / Ожидается
                            </div>
                            <div className="flex justify-center items-baseline gap-2">
                                <span className={`text-6xl md:text-7xl font-black font-mono tracking-tighter drop-shadow-sm ${isOver ? "text-red-500" : "text-primary"}`}>
                                    {item.scannedQuantity || 0}
                                </span>
                                <span className="text-2xl md:text-3xl text-muted-foreground/60 font-medium font-mono">
                                    / {item.expectedQuantity}
                                </span>
                            </div>
                            <div className="mt-4 h-3 md:h-4 bg-muted/30 rounded-full overflow-hidden p-0.5 border border-muted/20">
                                <div
                                    className={`h-full rounded-full transition-all duration-500 shadow-sm ${isOver ? "bg-red-500" : "bg-green-500"}`}
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    <div className="w-full">
                        {isConsumable() && (
                            <Card
                                className={`group relative overflow-hidden transition-all duration-500 border-2 w-full cursor-pointer shadow-sm ${isBoxMode
                                    ? "border-primary/50 bg-primary/[0.03] ring-1 ring-primary/20 shadow-[0_0_20px_rgba(59,130,246,0.1)]"
                                    : "border-border hover:border-primary/30 hover:bg-muted/30"
                                    }`}
                                onClick={() => {
                                    if (!isBoxMode) toggleBoxMode(true);
                                    else toggleBoxMode(false);
                                }}
                            >
                                <CardContent className="p-5 flex flex-col gap-5 pointer-events-none relative z-10">
                                    <div className="flex items-center justify-between gap-4">
                                        <div className="flex items-center gap-4 min-w-0 flex-1">
                                            <div className={`p-3.5 rounded-2xl shrink-0 transition-all duration-500 ${isBoxMode
                                                ? "bg-primary text-primary-foreground shadow-[0_5px_15px_rgba(59,130,246,0.4)] scale-110 rotate-3"
                                                : "bg-muted text-muted-foreground"
                                                }`}>
                                                <Box className="h-6 w-6" />
                                            </div>
                                            <div className="min-w-0">
                                                <div className="font-black text-2xl flex items-center gap-3 tracking-tight">
                                                    <span className={isBoxMode ? "text-primary" : ""}>Коробки</span>
                                                    {isBoxMode && (
                                                        <Badge className="px-2.5 py-1 text-xs font-black bg-primary text-primary-foreground border-none shadow-sm h-fit">
                                                            x{boxMultiplier}
                                                        </Badge>
                                                    )}
                                                </div>
                                                <div className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-[0.2em] mt-1 italic">
                                                    Множитель при скане
                                                </div>
                                            </div>
                                        </div>
                                        <div className="pointer-events-auto">
                                            <Switch
                                                checked={isBoxMode}
                                                onCheckedChange={toggleBoxMode}
                                                className="scale-125 transition-all duration-300 data-[state=checked]:bg-primary"
                                            />
                                        </div>
                                    </div>

                                    <div className={`flex gap-4 items-center p-4 rounded-2xl border transition-all duration-700 ${isBoxMode
                                        ? "bg-amber-500/[0.08] border-amber-500/20 text-amber-900 dark:text-amber-200 shadow-inner"
                                        : "bg-muted/40 border-border/40 text-muted-foreground/50 opacity-50"
                                        }`}>
                                        <div className={`shrink-0 flex items-center justify-center w-8 h-8 rounded-xl transition-colors duration-500 ${isBoxMode ? "bg-amber-500/20 text-amber-600" : "bg-muted"}`}>
                                            <span className="text-sm">!</span>
                                        </div>
                                        <div className="flex-1 text-[13px] leading-snug">
                                            <span className="font-black block uppercase tracking-wider text-[11px] mb-1">Важно</span>
                                            <span className="font-medium opacity-90">Этот режим доступен только для расходников.</span>
                                        </div>
                                    </div>
                                </CardContent>

                                {isBoxMode && (
                                    <div className="absolute -right-8 -bottom-8 opacity-[0.05] pointer-events-none transition-all duration-1000 animate-pulse">
                                        <Box className="h-32 w-32 rotate-12" />
                                    </div>
                                )}
                            </Card>
                        )}
                    </div>

                    <div className="pt-4 px-1">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 px-1">История сканирований</h3>
                        <div className="space-y-2">
                            {item.scans && item.scans.length > 0 ? (
                                item.scans.map((scan) => (
                                    <div key={scan.id} className="flex items-center justify-between p-3 rounded-xl bg-card/50 border border-border/50 shadow-sm animate-in slide-in-from-top-2 duration-300">
                                        <div className="flex flex-col gap-0.5">
                                            <div className="font-mono text-[10px] text-muted-foreground/70 font-medium">
                                                {new Date(scan.timestamp).toLocaleTimeString()}
                                            </div>
                                            <div className="font-bold text-sm tracking-tight text-foreground">
                                                {scan.isManual ? (
                                                    <span className="text-orange-500/90 italic">Ручной ввод</span>
                                                ) : (
                                                    <span className="font-mono text-primary-foreground bg-primary/20 px-1.5 py-0.5 rounded text-xs select-all">
                                                        {scan.code || "Скан"}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className={`font-black text-lg ${scan.quantity > 0 ? "text-green-500" : "text-red-500"}`}>
                                                {scan.quantity > 0 ? `+${scan.quantity}` : scan.quantity}
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-9 w-9 text-destructive/40 hover:text-destructive hover:bg-destructive/10 transition-colors"
                                                onClick={() => handleDelete(scan.id)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-10 text-muted-foreground text-sm border-2 border-dashed rounded-xl border-border/30 bg-muted/5">
                                    История пуста
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>

            <Dialog
                open={showBoxConfig}
                onOpenChange={(open) => {
                    if (!open) {
                        setShowBoxConfig(false);
                        if (!isBoxMode) setIsBoxMode(false);
                    }
                }}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Настройка режима коробок</DialogTitle>
                        <DialogDescription>
                            Укажите количество единиц в одной коробке. Это число будет добавляться при каждом сканировании.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <div className="flex items-center gap-4">
                            <Button variant="outline" size="icon" onClick={() => setTempBoxQty((value) => String(Math.max(1, parseInt(value || "0", 10) - 1)))}>
                                <Minus className="h-4 w-4" />
                            </Button>
                            <Input
                                className="text-center text-2xl font-bold h-14"
                                value={tempBoxQty}
                                onChange={(event) => setTempBoxQty(event.target.value)}
                                type="number"
                            />
                            <Button variant="outline" size="icon" onClick={() => setTempBoxQty((value) => String(parseInt(value || "0", 10) + 1))}>
                                <Plus className="h-4 w-4" />
                            </Button>
                        </div>
                        <div className="flex justify-center gap-2 mt-4">
                            <Button variant="secondary" size="sm" onClick={() => setTempBoxQty("6")}>6</Button>
                            <Button variant="secondary" size="sm" onClick={() => setTempBoxQty("10")}>10</Button>
                            <Button variant="secondary" size="sm" onClick={() => setTempBoxQty("12")}>12</Button>
                            <Button variant="secondary" size="sm" onClick={() => setTempBoxQty("20")}>20</Button>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => { setShowBoxConfig(false); setIsBoxMode(false); }}>
                            Отмена
                        </Button>
                        <Button onClick={handleBoxConfigSubmit}>Применить и включить</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
