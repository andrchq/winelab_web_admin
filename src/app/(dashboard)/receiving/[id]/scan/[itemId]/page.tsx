"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AlertTriangle, ArrowLeft, Box, Minus, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { useScanDetection } from "@/lib/use-scan-detection";
import { useTSDMode } from "@/contexts/TSDModeContext";
import { receivingService, ReceivingSession } from "@/lib/receiving-service";
import { sounds } from "@/lib/sounds";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

export default function ScanningPage() {
    const params = useParams();
    const router = useRouter();
    const sessionId = params?.id as string;
    const itemId = params?.itemId as string;
    const { isTSDMode } = useTSDMode();

    const [session, setSession] = useState<ReceivingSession | null>(null);
    const [isBoxMode, setIsBoxMode] = useState(false);
    const [boxMultiplier, setBoxMultiplier] = useState(10);
    const [showBoxConfig, setShowBoxConfig] = useState(false);
    const [tempBoxQty, setTempBoxQty] = useState("10");

    const item = session?.items.find((entry) => entry.id === itemId) || null;
    const needsBinding = Boolean(item?.linkedAsset?.isUnidentified);
    const canRegisterNewBarcode = session?.sourceType === "EXTERNAL" && item?.product?.accountingType !== "QUANTITY";

    const loadData = async () => {
        try {
            const data = await receivingService.getById(sessionId);
            if (!data) {
                router.push("/receiving");
                return;
            }

            const currentItem = data.items.find((entry) => entry.id === itemId);
            if (!currentItem) {
                sounds.error();
                toast.error("Товар не найден");
                router.push(`/receiving/${sessionId}`);
                return;
            }

            setSession(data);
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
            sounds.success();
            toast.success(
                isManual
                    ? `Ручной ввод: ${qty}`
                    : needsBinding
                        ? "ШК считан. Он будет привязан к equipment после завершения приемки"
                        : `Скан: +${qty}`,
            );
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
                message.toLowerCase().includes("ручной ввод недоступен") ||
                message.toLowerCase().includes("принадлежит другому оборудованию")
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

    const progress = Math.min(100, Math.round(((item.scannedQuantity || 0) / Math.max(item.expectedQuantity, 1)) * 100));
    const isOver = (item.scannedQuantity || 0) > item.expectedQuantity;

    return (
        <div className="flex h-full flex-col bg-background">
            <main className={`relative flex-1 overflow-y-auto bg-muted/10 ${isTSDMode ? "p-2" : "p-4"}`}>
                <div className="mx-auto max-w-2xl space-y-6 pb-20">
                    <div className="flex items-center gap-3">
                        <Button variant="ghost" size="icon" onClick={() => router.push(`/receiving/${sessionId}`)} className="h-10 w-10 shrink-0">
                            <ArrowLeft className="h-6 w-6" />
                        </Button>
                        <div className="min-w-0 flex-1">
                            <h2 className="truncate px-1 text-lg font-bold leading-tight md:text-xl">{item.name}</h2>
                            <p className="truncate px-1 text-xs text-muted-foreground md:text-sm">{item.sku || "Без артикула"}</p>
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
                        <CardContent className="p-4 text-center md:p-6">
                            <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground opacity-80 md:mb-2 md:text-sm">
                                Принято / Ожидается
                            </div>
                            <div className="flex justify-center items-baseline gap-2">
                                <span className={`font-mono text-6xl font-black tracking-tighter drop-shadow-sm md:text-7xl ${isOver ? "text-red-500" : "text-primary"}`}>
                                    {item.scannedQuantity || 0}
                                </span>
                                <span className="font-mono text-2xl font-medium text-muted-foreground/60 md:text-3xl">
                                    / {item.expectedQuantity}
                                </span>
                            </div>
                            <div className="mt-4 h-3 overflow-hidden rounded-full border border-muted/20 bg-muted/30 p-0.5 md:h-4">
                                <div
                                    className={`h-full rounded-full shadow-sm transition-all duration-500 ${isOver ? "bg-red-500" : "bg-green-500"}`}
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {needsBinding && (
                        <Card className="border-amber-300 bg-amber-50">
                            <CardContent className="p-4 text-sm text-amber-900">
                                Это legacy-оборудование без реального ШК в системе. Отсканируй фактический штрихкод устройства.
                                После завершения приемки он будет привязан к текущему asset, и позиция станет обычной.
                            </CardContent>
                        </Card>
                    )}

                    {canRegisterNewBarcode && !needsBinding && (
                        <Card className="border-blue-300 bg-blue-50">
                            <CardContent className="p-4 text-sm text-blue-900">
                                Это внешняя приемка. Если ШК еще не существует в системе, просто отсканируй его: при завершении приемки будет создана новая единица оборудования с этим кодом.
                            </CardContent>
                        </Card>
                    )}

                    {isConsumable() && (
                        <Card
                            className={`group relative w-full cursor-pointer overflow-hidden border-2 shadow-sm transition-all duration-500 ${isBoxMode
                                ? "border-primary/50 bg-primary/[0.03] ring-1 ring-primary/20 shadow-[0_0_20px_rgba(59,130,246,0.1)]"
                                : "border-border hover:border-primary/30 hover:bg-muted/30"
                                }`}
                            onClick={() => {
                                if (!isBoxMode) {
                                    toggleBoxMode(true);
                                } else {
                                    toggleBoxMode(false);
                                }
                            }}
                        >
                            <CardContent className="pointer-events-none relative z-10 flex flex-col gap-5 p-5">
                                <div className="flex items-center justify-between gap-4">
                                    <div className="flex min-w-0 flex-1 items-center gap-4">
                                        <div className={`shrink-0 rounded-2xl p-3.5 transition-all duration-500 ${isBoxMode
                                            ? "scale-110 rotate-3 bg-primary text-primary-foreground shadow-[0_5px_15px_rgba(59,130,246,0.4)]"
                                            : "bg-muted text-muted-foreground"
                                            }`}>
                                            <Box className="h-6 w-6" />
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-3 text-2xl font-black tracking-tight">
                                                <span className={isBoxMode ? "text-primary" : ""}>Коробки</span>
                                                {isBoxMode && (
                                                    <Badge className="h-fit border-none bg-primary px-2.5 py-1 text-xs font-black text-primary-foreground shadow-sm">
                                                        x{boxMultiplier}
                                                    </Badge>
                                                )}
                                            </div>
                                            <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60 italic">
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

                                <div className={`flex items-center gap-4 rounded-2xl border p-4 transition-all duration-700 ${isBoxMode
                                    ? "border-amber-500/20 bg-amber-500/[0.08] text-amber-900 shadow-inner dark:text-amber-200"
                                    : "border-border/40 bg-muted/40 text-muted-foreground/50 opacity-50"
                                    }`}>
                                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-colors duration-500 ${isBoxMode ? "bg-amber-500/20 text-amber-600" : "bg-muted"}`}>
                                        <span className="text-sm">!</span>
                                    </div>
                                    <div className="flex-1 text-[13px] leading-snug">
                                        <span className="mb-1 block text-[11px] font-black uppercase tracking-wider">Важно</span>
                                        <span className="font-medium opacity-90">Этот режим доступен только для расходников.</span>
                                    </div>
                                </div>
                            </CardContent>

                            {isBoxMode && (
                                <div className="pointer-events-none absolute -bottom-8 -right-8 opacity-[0.05] transition-all duration-1000 animate-pulse">
                                    <Box className="h-32 w-32 rotate-12" />
                                </div>
                            )}
                        </Card>
                    )}

                    <div className="px-1 pt-4">
                        <h3 className="mb-3 px-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">История сканирований</h3>
                        <div className="space-y-2">
                            {item.scans && item.scans.length > 0 ? (
                                item.scans.map((scan) => (
                                    <div key={scan.id} className="animate-in slide-in-from-top-2 flex items-center justify-between rounded-xl border border-border/50 bg-card/50 p-3 shadow-sm duration-300">
                                        <div className="flex flex-col gap-0.5">
                                            <div className="font-mono text-[10px] font-medium text-muted-foreground/70">
                                                {new Date(scan.timestamp).toLocaleTimeString()}
                                            </div>
                                            <div className="text-sm font-bold tracking-tight text-foreground">
                                                {scan.isManual ? (
                                                    <span className="italic text-orange-500/90">Ручной ввод</span>
                                                ) : (
                                                    <span className="rounded bg-primary/20 px-1.5 py-0.5 font-mono text-xs text-primary-foreground select-all">
                                                        {scan.code || "Скан"}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className={`text-lg font-black ${scan.quantity > 0 ? "text-green-500" : "text-red-500"}`}>
                                                {scan.quantity > 0 ? `+${scan.quantity}` : scan.quantity}
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-9 w-9 text-destructive/40 transition-colors hover:bg-destructive/10 hover:text-destructive"
                                                onClick={() => handleDelete(scan.id)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="rounded-xl border-2 border-dashed border-border/30 bg-muted/5 py-10 text-center text-sm text-muted-foreground">
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
                            Укажи количество единиц в одной коробке. Это число будет добавляться при каждом сканировании.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <div className="flex items-center gap-4">
                            <Button variant="outline" size="icon" onClick={() => setTempBoxQty((value) => String(Math.max(1, parseInt(value || "0", 10) - 1)))}>
                                <Minus className="h-4 w-4" />
                            </Button>
                            <Input
                                className="h-14 text-center text-2xl font-bold"
                                value={tempBoxQty}
                                onChange={(event) => setTempBoxQty(event.target.value)}
                                type="number"
                            />
                            <Button variant="outline" size="icon" onClick={() => setTempBoxQty((value) => String(parseInt(value || "0", 10) + 1))}>
                                <Plus className="h-4 w-4" />
                            </Button>
                        </div>
                        <div className="mt-4 flex justify-center gap-2">
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
