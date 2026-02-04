"use client";

import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useParams, useRouter } from "next/navigation";
import { receivingService, ReceivingSession, ReceivingItem } from "@/lib/receiving-service";
import { useScanDetection } from "@/lib/use-scan-detection";
import { ArrowLeft, Box, X, Delete, Trash2, Plus, Minus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useTSDMode } from "@/contexts/TSDModeContext";

export default function ScanningPage() {
    const params = useParams();
    const router = useRouter();
    const sessionId = params?.id as string;
    const itemId = params?.itemId as string;
    const { isTSDMode } = useTSDMode();

    const [session, setSession] = useState<ReceivingSession | null>(null);
    const [item, setItem] = useState<ReceivingItem | null>(null);

    // Modes
    const [isBoxMode, setIsBoxMode] = useState(false);
    const [boxMultiplier, setBoxMultiplier] = useState<number>(10);
    const [isManualMode, setIsManualMode] = useState(false);

    // Box Configuration Dialog
    const [showBoxConfig, setShowBoxConfig] = useState(false);
    const [tempBoxQty, setTempBoxQty] = useState<string>("10");

    // Manual Entry
    const [manualQty, setManualQty] = useState<string>("");

    const loadData = () => {
        const s = receivingService.getById(sessionId);
        if (s) {
            setSession(s);
            const i = s.items.find(x => x.id === itemId);
            if (i) setItem(i);
            else {
                toast.error("Товар не найден");
                router.push(`/receiving/${sessionId}`);
            }
        } else {
            router.push('/receiving');
        }
    };

    useEffect(() => {
        loadData();
    }, [sessionId, itemId]);

    const handleUpdate = (qty: number, isManual = false, code?: string) => {
        if (!itemId || !sessionId) return;

        receivingService.updateItem(sessionId, itemId, qty, isManual, code);
        loadData(); // Reload to get updated scans list

        const msg = isManual ? `Ручной ввод: ${qty}` : `Скан: +${qty}`;
        toast.success(msg);
    };

    const handleDelete = (scanId: string) => {
        if (!itemId || !sessionId) return;
        if (confirm("Удалить эту запись?")) {
            receivingService.removeScan(sessionId, itemId, scanId);
            loadData();
            toast.info("Запись удалена");
        }
    };

    // Scanner Hook
    useScanDetection({
        onScan: (code) => {
            if (showBoxConfig || isManualMode) return;

            if (isBoxMode) {
                // Auto-apply multiplier
                handleUpdate(boxMultiplier, false, `BOX: ${code}`);
            } else {
                handleUpdate(1, false, code);
            }
        }
    });

    const handleBoxConfigSubmit = () => {
        const qty = parseInt(tempBoxQty);
        if (qty > 0) {
            setBoxMultiplier(qty);
            setIsBoxMode(true);
            setShowBoxConfig(false);
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

    const handleManualSubmit = () => {
        const qty = parseInt(manualQty);
        if (!isNaN(qty) && qty !== 0) {
            handleUpdate(qty, true);
            setManualQty("");
            setIsManualMode(false);
        }
    };

    if (!session || !item) return <div className="p-8">Загрузка...</div>;

    const progress = Math.min(100, Math.round(((item.scannedQuantity || 0) / item.quantity) * 100));
    const isOver = (item.scannedQuantity || 0) > item.quantity;

    return (
        <div className="flex flex-col h-full bg-background">
            <main className={`flex-1 overflow-y-auto ${isTSDMode ? 'p-2' : 'p-4'} bg-muted/10 relative`}>
                <div className="max-w-2xl mx-auto space-y-6 pb-20">

                    {/* Header Navigation */}
                    <div className="flex items-center gap-3">
                        <Button variant="ghost" size="icon" onClick={() => router.push(`/receiving/${sessionId}`)} className="h-10 w-10 shrink-0">
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
                        : item.scannedQuantity === item.quantity
                            ? 'border-green-500/50 bg-green-500/5'
                            : 'border-primary/50 bg-primary/5'
                        }`}>
                        <CardContent className="p-4 md:p-6 text-center">
                            <div className="text-[10px] md:text-sm uppercase tracking-wider text-muted-foreground mb-1 md:mb-2 font-bold opacity-80">
                                Принято / Ожидается
                            </div>
                            <div className="flex justify-center items-baseline gap-2">
                                <span className={`text-6xl md:text-7xl font-black font-mono tracking-tighter drop-shadow-sm ${isOver ? 'text-red-500' : 'text-primary'
                                    }`}>
                                    {item.scannedQuantity || 0}
                                </span>
                                <span className="text-2xl md:text-3xl text-muted-foreground/60 font-medium font-mono">
                                    / {item.quantity}
                                </span>
                            </div>
                            <div className="mt-4 h-3 md:h-4 bg-muted/30 rounded-full overflow-hidden p-0.5 border border-muted/20">
                                <div
                                    className={`h-full rounded-full transition-all duration-500 shadow-sm ${isOver ? 'bg-red-500' : 'bg-green-500'
                                        }`}
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
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
                            onClick={() => setIsManualMode(true)}
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
                                                        {(scan as any).code || "Скан"}
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
                if (!open && !isBoxMode) setShowBoxConfig(false); // Just close
                if (!open && isBoxMode) setShowBoxConfig(false); // Closing existing config
                if (!open && !isBoxMode && tempBoxQty) setIsBoxMode(false); // Cancelled activation
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

        </div>
    );
}
