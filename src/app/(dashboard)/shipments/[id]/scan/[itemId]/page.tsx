"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useParams, useRouter } from "next/navigation";
import { shippingService, ShippingSession, ShippingItem } from "@/lib/shipping-service";
import { useScanDetection } from "@/lib/use-scan-detection";
import { ArrowLeft, Box, Trash2, Plus, Minus, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useTSDMode } from "@/contexts/TSDModeContext";
import { sounds } from "@/lib/sounds";

export default function ShipmentScanningPage() {
    const params = useParams();
    const router = useRouter();
    const sessionId = params?.id as string;
    const itemId = params?.itemId as string;
    const { isTSDMode } = useTSDMode();

    const [session, setSession] = useState<ShippingSession | null>(null);
    const [item, setItem] = useState<ShippingItem | null>(null);

    // Modes
    const [isBoxMode, setIsBoxMode] = useState(false);
    const [boxMultiplier, setBoxMultiplier] = useState<number>(10);
    const [isManualMode, setIsManualMode] = useState(false);

    // Box Configuration Dialog
    const [showBoxConfig, setShowBoxConfig] = useState(false);
    const [tempBoxQty, setTempBoxQty] = useState<string>("10");

    // Manual Entry
    const [manualQty, setManualQty] = useState<string>("");

    // Duplicate scan confirmation
    const [duplicateScanPending, setDuplicateScanPending] = useState<{ code: string; qty: number } | null>(null);
    const [assetSuggestion, setAssetSuggestion] = useState<{
        code: string;
        asset: NonNullable<Awaited<ReturnType<typeof shippingService.findAssetBySerial>>>;
    } | null>(null);

    const normalizeScanCode = (value?: string | null) => value?.replace(/^BOX:\s*/i, "").trim().toLowerCase() || "";

    const loadData = async () => {
        const s = await shippingService.getById(sessionId);
        if (s) {
            setSession(s);
            const i = s.items.find(x => x.id === itemId);
            if (i) setItem(i);
            else {
                toast.error("Товар не найден");
                router.push(`/shipments/${sessionId}`);
            }
        } else {
            router.push('/shipments');
        }
    };

    useEffect(() => {
        void loadData();
    }, [sessionId, itemId]);

    const handleUpdate = async (qty: number, isManual = false, code?: string, targetItemId?: string) => {
        const activeItemId = targetItemId || itemId;
        if (!activeItemId || !sessionId) return;

        try {
            await shippingService.updateItem(sessionId, activeItemId, qty, isManual, code);
            await loadData();
            const msg = isManual ? `Ручной ввод: ${qty}` : `Скан: +${qty}`;
            sounds.success();
            toast.success(msg);
        } catch (error: any) {
            const message = error?.message || "Ошибка обновления";
            if (message.toLowerCase().includes("уже был отсканирован")) {
                sounds.warning();
                toast.warning(message);
                return;
            }

            sounds.error();
            toast.error(message);
        }
    };

    const handleDelete = async (scanId: string) => {
        if (!itemId || !sessionId) return;
        const result = await shippingService.removeScan(sessionId, itemId, scanId);
        if (result) {
            await loadData();
            sounds.info();
            toast.info("Запись удалена");
        } else {
            sounds.error();
            toast.error("Ошибка удаления");
        }
    };

    const wasBarcodeScannedBefore = (code: string): boolean => {
        if (!session?.items) return false;
        const normalizedCode = normalizeScanCode(code);
        return session.items.some((sessionItem) =>
            sessionItem.scans?.some((scan) => normalizeScanCode(scan.code) === normalizedCode),
        );
    };

    const handleConfirmDuplicate = async () => {
        if (!duplicateScanPending) return;
        await handleUpdate(duplicateScanPending.qty, false, duplicateScanPending.code);
        setDuplicateScanPending(null);
    };

    const handleSerializedScan = async (code: string) => {
        if (!session || !item) return;

        const cleanCode = code.trim();
        if (!cleanCode) return;

        if (wasBarcodeScannedBefore(cleanCode)) {
            sounds.warning();
            toast.warning("Этот ШК уже был отсканирован в текущей отгрузке");
            return;
        }

        try {
            const asset = await shippingService.findAssetBySerial(cleanCode);
            if (!asset) {
                sounds.error();
                toast.error("Этот ШК не найден в системе. Новые ШК можно добавлять только через инвентаризацию.");
                return;
            }

            if (asset.warehouse?.id !== session.warehouseId) {
                sounds.error();
                toast.error("Этот товар числится на другом складе и не может быть добавлен в текущую отгрузку.");
                return;
            }

            if (asset.processStatus !== "AVAILABLE") {
                sounds.error();
                toast.error("Этот товар сейчас недоступен для отгрузки.");
                return;
            }

            if (asset.productId !== item.productId) {
                sounds.error();
                setAssetSuggestion({
                    code: asset.serialNumber,
                    asset,
                });
                return;
            }

            await handleUpdate(1, false, asset.serialNumber);
        } catch (error: any) {
            sounds.error();
            toast.error(error?.message || "Не удалось проверить ШК перед добавлением в отгрузку");
        }
    };

    const handleAddSuggestedAsset = async () => {
        if (!assetSuggestion || !session) return;

        try {
            let targetItem = session.items.find((entry) => entry.productId === assetSuggestion.asset.productId);

            if (!targetItem) {
                targetItem = await shippingService.addItem(sessionId, {
                    productId: assetSuggestion.asset.productId,
                    originalName: assetSuggestion.asset.product?.name || assetSuggestion.asset.serialNumber,
                    sku: assetSuggestion.asset.product?.sku || "",
                    accountingType: "SERIALIZED",
                    quantity: 1,
                    expectedQuantity: 1,
                });
            }

            await handleUpdate(1, false, assetSuggestion.code, targetItem.id);
            setAssetSuggestion(null);
            await loadData();

            router.push(`/shipments/${sessionId}/scan/${targetItem.id}`);
        } catch (error: any) {
            sounds.error();
            toast.error(error?.message || "Не удалось добавить товар в отгрузку");
        }
    };

    // Scanner Hook
    useScanDetection({
        onScan: async (code) => {
            if (showBoxConfig || isManualMode || duplicateScanPending || assetSuggestion) return;

            const cleanCode = code.trim();
            if (!cleanCode) return;

            if (item?.accountingType !== "QUANTITY") {
                await handleSerializedScan(cleanCode);
                return;
            }

            const qty = isBoxMode ? boxMultiplier : 1;
            const scanCode = isBoxMode ? `BOX: ${cleanCode}` : cleanCode;

            // Check for duplicate
            if (wasBarcodeScannedBefore(cleanCode)) {
                sounds.warning();
                setDuplicateScanPending({ code: scanCode, qty });
                return;
            }

            await handleUpdate(qty, false, scanCode);
        }
    });

    const handleBoxConfigSubmit = () => {
        if (item?.accountingType !== "QUANTITY") {
            sounds.warning();
            toast.warning("Для этой модели доступно только сканирование серийных номеров.");
            setShowBoxConfig(false);
            setIsBoxMode(false);
            return;
        }

        const qty = parseInt(tempBoxQty);
        if (qty > 0) {
            setBoxMultiplier(qty);
            setIsBoxMode(true);
            setShowBoxConfig(false);
        }
    };

    const toggleBoxMode = (checked: boolean) => {
        if (item?.accountingType !== "QUANTITY") {
            sounds.warning();
            toast.warning("Для этой модели доступно только сканирование серийных номеров.");
            setIsBoxMode(false);
            return;
        }

        if (checked) {
            setTempBoxQty(boxMultiplier.toString());
            setShowBoxConfig(true);
        } else {
            setIsBoxMode(false);
        }
    };

    const handleManualSubmit = async () => {
        if (item?.accountingType !== "QUANTITY") {
            sounds.warning();
            toast.warning("Для этой модели ручной ввод недоступен. Используйте сканирование ШК.");
            setManualQty("");
            setIsManualMode(false);
            return;
        }

        const qty = parseInt(manualQty);
        if (!isNaN(qty) && qty !== 0) {
            await handleUpdate(qty, true);
            setManualQty("");
            setIsManualMode(false);
        }
    };

    if (!session || !item) return <div className="p-8">Загрузка...</div>;

    const isSerializedItem = item.accountingType !== "QUANTITY";
    const isFileBased = session.type === 'file';
    const hasExpected = isFileBased && (item.expectedQuantity || 0) > 0;
    const progress = hasExpected ? Math.min(100, Math.round(((item.scannedQuantity || 0) / item.expectedQuantity) * 100)) : 0;
    const isOver = hasExpected && (item.scannedQuantity || 0) > item.expectedQuantity;
    const suggestedLine = assetSuggestion
        ? session.items.find((entry) => entry.productId === assetSuggestion.asset.productId)
        : null;

    return (
        <div className="flex flex-col h-full bg-background">
            <main className={`flex-1 overflow-y-auto ${isTSDMode ? 'p-2' : 'p-4'} bg-muted/10 relative`}>
                <div className="max-w-2xl mx-auto space-y-6 pb-20">

                    {/* Header Navigation */}
                    <div className="flex items-center gap-3">
                        <Button variant="ghost" size="icon" onClick={() => router.push(`/shipments/${sessionId}`)} className="h-10 w-10 shrink-0">
                            <ArrowLeft className="h-6 w-6" />
                        </Button>
                        <div className="min-w-0 flex-1">
                            <h2 className="text-lg md:text-xl font-bold leading-tight truncate px-1">{item.originalName}</h2>
                            <p className="text-xs md:text-sm text-muted-foreground px-1 truncate">{item.sku || "Без артикула"}</p>
                        </div>
                    </div>

                    {/* Main Counter */}
                    <Card className={`border-2 shadow-md transition-colors duration-300 ${isOver
                        ? 'border-red-500/50 bg-red-500/5'
                        : hasExpected && item.scannedQuantity === item.expectedQuantity
                            ? 'border-green-500/50 bg-green-500/5'
                            : 'border-primary/50 bg-primary/5'
                        }`}>
                        <CardContent className="p-4 md:p-6 text-center">
                            <div className="text-[10px] md:text-sm uppercase tracking-wider text-muted-foreground mb-1 md:mb-2 font-bold opacity-80">
                                {hasExpected ? 'Собрано / Ожидается' : 'Собрано'}
                            </div>
                            <div className="flex justify-center items-baseline gap-2">
                                <span className={`text-6xl md:text-7xl font-black font-mono tracking-tighter drop-shadow-sm ${isOver ? 'text-red-500' : 'text-primary'
                                    }`}>
                                    {item.scannedQuantity || 0}
                                </span>
                                {hasExpected && (
                                    <span className="text-2xl md:text-3xl text-muted-foreground/60 font-medium font-mono">
                                        / {item.expectedQuantity}
                                    </span>
                                )}
                            </div>
                            {hasExpected && (
                                <div className="mt-4 h-3 md:h-4 bg-muted/30 rounded-full overflow-hidden p-0.5 border border-muted/20">
                                    <div
                                        className={`h-full rounded-full transition-all duration-500 shadow-sm ${isOver ? 'bg-red-500' : 'bg-green-500'
                                            }`}
                                        style={{ width: `${progress}%` }}
                                    />
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Controls */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                        {/* Box Mode Toggle */}
                        <Card className={`transition-all duration-200 ${isBoxMode ? "border-blue-500 bg-blue-50/50 ring-1 ring-blue-500/20" : ""}`}>
                            <CardContent className="p-3 md:p-4 flex items-center justify-between gap-3">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className={`p-2 rounded-xl shrink-0 ${isBoxMode ? 'bg-blue-200 text-blue-700' : 'bg-muted text-muted-foreground'}`}>
                                        <Box className="h-5 w-5 md:h-6 md:w-6" />
                                    </div>
                                    <div className="min-w-0">
                                        <div className="font-bold text-sm md:text-base flex items-center gap-1.5 flex-wrap">
                                            <span className="truncate">Коробки</span>
                                            {isBoxMode && <Badge variant="secondary" className="px-1.5 h-5 text-[10px] font-bold">x{boxMultiplier}</Badge>}
                                        </div>
                                        <div className="text-[10px] md:text-xs text-muted-foreground truncate leading-tight">Множитель при скане</div>
                                    </div>
                                </div>
                                <Switch checked={isBoxMode} onCheckedChange={toggleBoxMode} className="shrink-0" />
                            </CardContent>
                        </Card>

                        {/* Manual Entry Button */}
                        <Button
                            variant="outline"
                            className="h-auto min-h-[64px] md:min-h-[80px] p-0 overflow-hidden border-2 hover:bg-muted/50 transition-colors"
                            onClick={() => {
                                if (isSerializedItem) {
                                    sounds.warning();
                                    toast.warning("Для этой модели ручной ввод недоступен. Используйте сканирование ШК.");
                                    return;
                                }
                                setIsManualMode(true);
                            }}
                        >
                            <div className="flex items-center gap-3 px-3 md:px-4 w-full">
                                <div className="p-2 rounded-xl bg-muted text-muted-foreground shrink-0">
                                    <Plus className="h-5 w-5 md:h-6 md:w-6" />
                                </div>
                                <div className="text-left min-w-0 flex-1">
                                    <div className="font-bold text-sm md:text-base truncate">Ввод вручную</div>
                                    <div className="text-[10px] md:text-xs text-muted-foreground truncate leading-tight">Корректировка числа</div>
                                </div>
                            </div>
                        </Button>
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
                                            <div className={`font-black text-lg ${scan.quantity > 0 ? 'text-green-500' : 'text-red-500'}`}>
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

            {/* Box Config Dialog */}
            <Dialog open={showBoxConfig} onOpenChange={(open) => {
                if (!open) {
                    setShowBoxConfig(false);
                    if (!isBoxMode) setIsBoxMode(false);
                }
            }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Настройка режима коробок</DialogTitle>
                        <DialogDescription>
                            Укажите количество единиц в одной коробке. Это число будет добавляться при каждом сканировании.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <div className="flex items-center gap-4">
                            <Button variant="outline" size="icon" onClick={() => setTempBoxQty(q => String(Math.max(1, parseInt(q || "0") - 1)))}>
                                <Minus className="h-4 w-4" />
                            </Button>
                            <Input
                                className="text-center text-2xl font-bold h-14"
                                value={tempBoxQty}
                                onChange={(e) => setTempBoxQty(e.target.value)}
                                type="number"
                            />
                            <Button variant="outline" size="icon" onClick={() => setTempBoxQty(q => String(parseInt(q || "0") + 1))}>
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
                        <Button variant="ghost" onClick={() => { setShowBoxConfig(false); setIsBoxMode(false); }}>Отмена</Button>
                        <Button onClick={handleBoxConfigSubmit}>Применить и включить</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Manual Entry Dialog */}
            <Dialog open={isManualMode} onOpenChange={setIsManualMode}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Ручной ввод</DialogTitle>
                        <DialogDescription>
                            Введите количество. Используйте отрицательное число для уменьшения.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Input
                            autoFocus
                            className="text-center text-3xl font-bold h-16"
                            placeholder="0"
                            value={manualQty}
                            onChange={(e) => setManualQty(e.target.value)}
                            type="number"
                            onKeyDown={(e) => { if (e.key === 'Enter') handleManualSubmit(); }}
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsManualMode(false)}>Отмена</Button>
                        <Button onClick={handleManualSubmit}>Применить</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={!!assetSuggestion} onOpenChange={(open) => {
                if (!open) setAssetSuggestion(null);
            }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-orange-600">
                            <AlertTriangle className="h-5 w-5" />
                            Другая модель
                        </DialogTitle>
                        <DialogDescription>
                            Этот ШК относится к другой модели. Можно добавить ее в текущую отгрузку отдельной позицией.
                        </DialogDescription>
                    </DialogHeader>
                    {assetSuggestion && (
                        <div className="py-4">
                            <div className="p-4 rounded-xl border border-orange-500/20 bg-orange-500/5 space-y-3">
                                <div>
                                    <div className="text-xs text-muted-foreground uppercase tracking-wider">Отсканировано</div>
                                    <div className="font-mono text-sm mt-1">{assetSuggestion.code}</div>
                                </div>
                                <div>
                                    <div className="text-xs text-muted-foreground uppercase tracking-wider">Модель</div>
                                    <div className="font-bold text-lg mt-1">{assetSuggestion.asset.product?.name || "Неизвестная модель"}</div>
                                </div>
                                <div className="grid grid-cols-2 gap-3 text-sm">
                                    <div>
                                        <div className="text-muted-foreground">Артикул</div>
                                        <div className="font-medium">{assetSuggestion.asset.product?.sku || "Без артикула"}</div>
                                    </div>
                                    <div>
                                        <div className="text-muted-foreground">Позиция в отгрузке</div>
                                        <div className="font-medium">
                                            {suggestedLine ? "Уже есть" : "Будет добавлена"}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                    <DialogFooter className="flex gap-2 sm:gap-0">
                        <Button variant="ghost" onClick={() => setAssetSuggestion(null)}>
                            Отменить
                        </Button>
                        <Button onClick={handleAddSuggestedAsset}>
                            {suggestedLine ? "Добавить в существующую позицию" : "Добавить в отгрузку"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Duplicate Scan Confirmation Dialog */}
            <Dialog open={!!duplicateScanPending} onOpenChange={(open) => {
                if (!open) setDuplicateScanPending(null);
            }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-orange-600">
                            <AlertTriangle className="h-5 w-5" />
                            Повторное сканирование
                        </DialogTitle>
                        <DialogDescription>
                            Этот штрихкод уже был отсканирован ранее для данного товара. Добавить ещё?
                        </DialogDescription>
                    </DialogHeader>
                    {duplicateScanPending && (
                        <div className="py-4">
                            <div className="p-4 rounded-xl border border-orange-500/20 bg-orange-500/5">
                                <div className="font-bold text-lg text-orange-500">{item?.originalName}</div>
                                <div className="text-sm text-muted-foreground font-mono mt-1 opacity-80">ШК: {duplicateScanPending.code}</div>
                                <div className="space-y-2 mt-4">
                                    <div className="text-sm font-medium flex items-center justify-between">
                                        <span className="text-muted-foreground">Текущее количество:</span>
                                        <span className="font-mono bg-muted px-2 py-0.5 rounded text-foreground">{item?.scannedQuantity || 0} шт</span>
                                    </div>
                                    <div className="text-sm font-bold flex items-center justify-between border-t border-orange-500/10 pt-2">
                                        <span className="text-orange-500/70">Будет добавлено:</span>
                                        <span className="text-green-500 bg-green-500/10 px-2 py-0.5 rounded">+{duplicateScanPending.qty} шт</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                    <DialogFooter className="flex gap-2 sm:gap-0">
                        <Button variant="ghost" onClick={() => setDuplicateScanPending(null)}>
                            Отменить
                        </Button>
                        <Button variant="default" onClick={handleConfirmDuplicate}>
                            Да, добавить
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
