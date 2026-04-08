"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { AlertTriangle, ArrowLeft, Clock, Package, QrCode, Save, Search, User } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { inventoryApi } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useScanDetection } from "@/lib/use-scan-detection";
import { sounds } from "@/lib/sounds";

interface InventoryViewProps {
    sessionId: string;
    onBack: () => void;
}

export function InventoryView({ sessionId, onBack }: InventoryViewProps) {
    const [session, setSession] = useState<any>(null);
    const [stats, setStats] = useState({ plan: 0, fact: 0, missing: 0, extra: 0, scanned: 0 });
    const [lastItem, setLastItem] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    const [elapsedTime, setElapsedTime] = useState("00:00:00");
    const [searchTerm, setSearchTerm] = useState("");
    const [quantityDrafts, setQuantityDrafts] = useState<Record<string, string>>({});
    const [savingQuantityId, setSavingQuantityId] = useState<string | null>(null);

    const fetchSessionData = async (search?: string) => {
        try {
            const data = await inventoryApi.getOne(sessionId, search);
            setSession(data.session);
            setStats({
                plan: data.plan,
                fact: data.fact,
                missing: data.missing,
                extra: data.extra,
                scanned: data.scanned || 0,
            });
            setLastItem(data.lastItem);
        } catch (error) {
            console.error(error);
            toast.error("Ошибка загрузки данных инвентаризации");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        void fetchSessionData(searchTerm);
    }, [sessionId, searchTerm]);

    useEffect(() => {
        const timer = setInterval(() => {
            if (!session?.createdAt) return;
            const start = new Date(session.createdAt).getTime();
            const diff = Date.now() - start;
            const hours = Math.floor(diff / 3600000);
            const minutes = Math.floor((diff % 3600000) / 60000);
            const seconds = Math.floor((diff % 60000) / 1000);
            setElapsedTime(`${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`);
        }, 1000);

        return () => clearInterval(timer);
    }, [session?.createdAt]);

    useEffect(() => {
        if (!session?.quantityRecords) return;
        setQuantityDrafts(Object.fromEntries(session.quantityRecords.map((record: any) => [record.id, String(record.countedQuantity ?? 0)])));
    }, [session?.quantityRecords]);

    useScanDetection({
        onScan: async (code) => {
            if (isProcessing) return;
            setIsProcessing(true);
            try {
                const result = await inventoryApi.scan(sessionId, code);
                if (result.isDuplicate) {
                    sounds.warning();
                    toast.info("Этот серийный номер уже был отсканирован");
                } else if (result.relocation?.fromWarehouseName) {
                    sounds.warning();
                    toast.warning(`Этот ШК числится на складе "${result.relocation.fromWarehouseName}". После корректировки он будет перенесен на текущий склад.`);
                } else {
                    sounds.success();
                    toast.success("Оборудование успешно учтено");
                }
                await fetchSessionData(searchTerm);
            } catch (error: any) {
                sounds.error();
                const message = error?.message || "";
                toast.error(message.toLowerCase().includes("not found") ? `Оборудование с серийным номером ${code} не найдено` : message || "Ошибка сканирования");
            } finally {
                setIsProcessing(false);
            }
        },
    });

    const handleFinish = async () => {
        if (!window.confirm("Завершить инвентаризацию и зафиксировать расхождения?")) return;
        try {
            const result = await inventoryApi.finish(sessionId);
            sounds.complete();
            toast.success(`Инвентаризация завершена. Недостача: ${result?.summary?.missing ?? stats.missing}, излишек: ${result?.summary?.extra ?? stats.extra}`);
            onBack();
        } catch {
            sounds.error();
            toast.error("Не удалось завершить инвентаризацию");
        }
    };

    const handleQuantitySave = async (recordId: string) => {
        const countedQuantity = Number(quantityDrafts[recordId] ?? "0");
        if (!Number.isFinite(countedQuantity) || countedQuantity < 0) {
            sounds.error();
            toast.error("Количество должно быть неотрицательным числом");
            return;
        }

        try {
            setSavingQuantityId(recordId);
            await inventoryApi.setQuantityCount(sessionId, recordId, countedQuantity);
            sounds.success();
            toast.success("Количество обновлено");
            await fetchSessionData(searchTerm);
        } catch (error: any) {
            sounds.error();
            toast.error(error?.message || "Не удалось сохранить количество");
        } finally {
            setSavingQuantityId(null);
        }
    };

    if (isLoading) return <div className="p-10 text-center">Загрузка...</div>;
    if (!session) return <div className="p-10 text-center">Инвентаризация не найдена</div>;

    const isCompleted = session.status === "COMPLETED";
    const hasDiscrepancies = stats.missing > 0 || stats.extra > 0;
    const adjustmentsApplied = Boolean(session.adjustmentsAppliedAt);
    const serialRecords = session.records || [];
    const quantityRecords = session.quantityRecords || [];
    const modelStats = (() => {
        const acc: Record<string, { name: string; plan: number; fact: number; missing: number; extra: number }> = {};
        serialRecords.forEach((record: any) => {
            const name = record.asset.product.name;
            acc[name] ||= { name, plan: 0, fact: 0, missing: 0, extra: 0 };
            if (record.status === "EXPECTED") {
                acc[name].plan += 1;
                acc[name].missing += 1;
            } else if (record.status === "SCANNED") {
                acc[name].plan += 1;
                acc[name].fact += 1;
            } else if (record.status === "EXTRA") {
                acc[name].fact += 1;
                acc[name].extra += 1;
            }
        });
        quantityRecords.forEach((record: any) => {
            const name = record.product.name;
            const expected = Number(record.expectedQuantity || 0);
            const counted = Number(record.countedQuantity || 0);
            acc[name] ||= { name, plan: 0, fact: 0, missing: 0, extra: 0 };
            acc[name].plan += expected;
            acc[name].fact += counted;
            acc[name].missing += Math.max(expected - counted, 0);
            acc[name].extra += Math.max(counted - expected, 0);
        });
        return Object.values(acc).sort((a, b) => a.name.localeCompare(b.name));
    })();

    const renderStatBadge = (value: number, label: string, description: string, className: string) => (
        <Tooltip>
            <TooltipTrigger asChild>
                <Badge variant="outline" className={`h-7 w-7 rounded flex items-center justify-center p-0 ${className}`}>{value}</Badge>
            </TooltipTrigger>
            <TooltipContent>
                <div className="font-medium">{label}: {value}</div>
                <div className="text-xs text-muted-foreground">{description}</div>
            </TooltipContent>
        </Tooltip>
    );

    return (
        <div className="flex h-full flex-col space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="h-5 w-5" /></Button>
                    <div>
                        <h1 className="flex items-center gap-2 text-2xl font-bold">Инвентаризация: <span className="text-primary">{session.warehouse.name}</span></h1>
                        <div className="mt-1 flex items-center gap-6 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1.5"><Clock className="h-4 w-4" /><span className="font-mono">{elapsedTime}</span></div>
                            <div className="flex items-center gap-1.5"><User className="h-4 w-4" /><span>{session.createdBy.name}</span></div>
                            <Badge variant={isCompleted ? "success" : "default"}>{isCompleted ? "Завершено" : "В процессе"}</Badge>
                        </div>
                    </div>
                </div>
                {!isCompleted && <Button variant="destructive" onClick={handleFinish}>Завершить инвентаризацию</Button>}
            </div>

            {hasDiscrepancies && <Card className="border-amber-300 bg-amber-50"><CardContent className="flex items-center gap-3 p-4 text-sm text-amber-900"><AlertTriangle className="h-5 w-5 shrink-0" />По этой инвентаризации уже есть расхождения. Недостача: {stats.missing}, излишек: {stats.extra}.</CardContent></Card>}
            {adjustmentsApplied && <Card className="border-emerald-300 bg-emerald-50"><CardContent className="p-4 text-sm text-emerald-900">Корректировки по этой инвентаризации уже применены.</CardContent></Card>}

            <div className="grid grid-cols-4 gap-4">
                <Card className="border-blue-500/20 bg-blue-500/10"><CardContent className="p-6"><p className="mb-1 text-sm font-medium text-blue-600">По учету</p><p className="text-3xl font-bold text-blue-700">{stats.plan}</p></CardContent></Card>
                <Card className="border-emerald-500/20 bg-emerald-500/10"><CardContent className="p-6"><p className="mb-1 text-sm font-medium text-emerald-600">Найдено</p><p className="text-3xl font-bold text-emerald-700">{stats.fact}</p></CardContent></Card>
                <Card className="border-red-500/20 bg-red-500/10"><CardContent className="p-6"><p className="mb-1 text-sm font-medium text-red-600">Недостача</p><p className="text-3xl font-bold text-red-700">{stats.missing}</p></CardContent></Card>
                <Card className="border-amber-500/20 bg-amber-500/10"><CardContent className="p-6"><p className="mb-1 text-sm font-medium text-amber-600">Излишек</p><p className="text-3xl font-bold text-amber-700">{stats.extra}</p></CardContent></Card>
            </div>

            <div className="flex min-h-0 flex-1 gap-6">
                <div className="flex w-[400px] flex-col gap-6">
                    {lastItem ? (
                        <Card className={cn("transition-all duration-300 animate-in fade-in slide-in-from-top-4", lastItem.status === "EXTRA" ? "border-amber-500/50 bg-amber-500/5" : "border-emerald-500/50 bg-emerald-500/5")}>
                            <CardHeader className="pb-2">
                                <CardTitle className="flex items-center justify-between text-lg">Последний скан<Badge variant={lastItem.status === "EXTRA" ? "warning" : "success"}>{lastItem.status === "EXTRA" ? "Излишек" : "Найден"}</Badge></CardTitle>
                                <CardDescription>{format(new Date(lastItem.scannedAt), "HH:mm:ss", { locale: ru })}</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div><p className="text-xs uppercase tracking-wider text-muted-foreground">Модель</p><p className="mt-1 font-medium">{lastItem.asset.product.name}</p></div>
                                <div><p className="text-xs uppercase tracking-wider text-muted-foreground">Серийный номер</p><p className="mt-1 font-mono">{lastItem.asset.serialNumber}</p></div>
                                <div><p className="text-xs uppercase tracking-wider text-muted-foreground">Категория</p><p className="mt-1">{lastItem.asset.product.category?.name || "Без категории"}</p></div>
                            </CardContent>
                        </Card>
                    ) : !isCompleted && <Card className="flex h-[200px] flex-col items-center justify-center border-dashed border-2 p-6 text-center text-muted-foreground"><QrCode className="mb-2 h-8 w-8 opacity-50" /><p className="font-medium">Готов к сканированию</p><p className="mt-1 text-sm">Сканируйте серийный номер в любом месте страницы</p></Card>}

                    <Card className="flex min-h-[300px] flex-1 flex-col overflow-hidden">
                        <CardHeader className="border-b bg-muted/30 px-4 py-3"><CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Сводка по моделям</CardTitle></CardHeader>
                        <TooltipProvider><div className="overflow-y-auto p-0">{modelStats.map((stat: any) => <div key={stat.name} className="flex items-center justify-between border-b p-3 last:border-0 hover:bg-muted/50"><div className="mr-2 truncate text-sm font-medium" title={stat.name}>{stat.name}</div><div className="flex shrink-0 items-center gap-1.5">{renderStatBadge(stat.plan, "По учету", "Ожидаемое количество", "border-blue-200 bg-blue-50 text-blue-600")}{stat.fact > 0 && renderStatBadge(stat.fact, "Найдено", "Подтвержденное количество", "border-emerald-200 bg-emerald-50 text-emerald-600")}{stat.missing > 0 && renderStatBadge(stat.missing, "Недостача", "Не найдено при пересчете", "border-red-200 bg-red-50 text-red-600")}{stat.extra > 0 && renderStatBadge(stat.extra, "Излишек", "Найдено сверх учета", "border-amber-200 bg-amber-50 text-amber-600")}</div></div>)}</div></TooltipProvider>
                    </Card>
                </div>

                <div className="flex min-h-0 flex-1 flex-col gap-6">
                    <Card><CardHeader className="border-b px-6 py-4"><div className="flex items-center justify-between gap-4"><CardTitle>Позиции инвентаризации</CardTitle><div className="relative w-72"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Поиск по модели, SN, SKU или категории" className="pl-9" /></div></div></CardHeader><CardContent className="p-6"><div className="grid gap-4 md:grid-cols-3"><div className="rounded-xl border bg-muted/20 p-4"><div className="text-sm text-muted-foreground">Серийных позиций</div><div className="mt-2 text-2xl font-semibold">{serialRecords.length}</div></div><div className="rounded-xl border bg-muted/20 p-4"><div className="text-sm text-muted-foreground">Количественных позиций</div><div className="mt-2 text-2xl font-semibold">{quantityRecords.length}</div></div><div className="rounded-xl border bg-muted/20 p-4"><div className="text-sm text-muted-foreground">Подтверждено вручную</div><div className="mt-2 text-2xl font-semibold">{quantityRecords.reduce((sum: number, record: any) => sum + Number(record.countedQuantity || 0), 0)}</div></div></div></CardContent></Card>

                    <Card>
                        <CardHeader className="border-b"><CardTitle className="flex items-center gap-2"><Package className="h-5 w-5 text-primary" />Количественные товары</CardTitle><CardDescription>Фактическое количество по товарам без серийных номеров.</CardDescription></CardHeader>
                        <div className="overflow-auto">
                            <Table>
                                <TableHeader><TableRow><TableHead>Модель</TableHead><TableHead>Категория</TableHead><TableHead>По учету</TableHead><TableHead>Факт</TableHead><TableHead>Разница</TableHead><TableHead className="w-[180px]">Действие</TableHead></TableRow></TableHeader>
                                <TableBody>
                                    {quantityRecords.length === 0 ? <TableRow><TableCell colSpan={6} className="h-24 text-center text-muted-foreground">Нет количественных позиций в этой инвентаризации</TableCell></TableRow> : quantityRecords.map((record: any) => {
                                        const expected = Number(record.expectedQuantity || 0);
                                        const counted = Number(record.countedQuantity || 0);
                                        const diff = counted - expected;
                                        const draftValue = quantityDrafts[record.id] ?? String(counted);
                                        return (
                                            <TableRow key={record.id}>
                                                <TableCell className="font-medium">{record.product.name}</TableCell>
                                                <TableCell>{record.product.category?.name || "Без категории"}</TableCell>
                                                <TableCell>{expected}</TableCell>
                                                <TableCell>{isCompleted ? counted : <Input type="number" min={0} value={draftValue} onChange={(event) => setQuantityDrafts((current) => ({ ...current, [record.id]: event.target.value }))} className="w-24" />}</TableCell>
                                                <TableCell><Badge variant={diff === 0 ? "secondary" : diff > 0 ? "warning" : "destructive"}>{diff > 0 ? `+${diff}` : diff}</Badge></TableCell>
                                                <TableCell>{isCompleted ? <span className="text-sm text-muted-foreground">Завершено</span> : <Button variant="outline" size="sm" onClick={() => void handleQuantitySave(record.id)} disabled={savingQuantityId === record.id}><Save className="mr-2 h-4 w-4" />Сохранить</Button>}</TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    </Card>

                    <Card className="min-h-0 flex-1">
                        <CardHeader className="border-b"><CardTitle>Серийное оборудование</CardTitle><CardDescription>Эти позиции подтверждаются сканированием серийных номеров.</CardDescription></CardHeader>
                        <div className="overflow-auto">
                            <Table>
                                <TableHeader className="sticky top-0 z-10 bg-background"><TableRow><TableHead>Статус</TableHead><TableHead>Наименование</TableHead><TableHead>Серийный номер</TableHead><TableHead>Категория</TableHead><TableHead>Время сканирования</TableHead></TableRow></TableHeader>
                                <TableBody>
                                    {serialRecords.length === 0 ? <TableRow><TableCell colSpan={5} className="h-24 text-center text-muted-foreground">Нет серийных позиций в этой инвентаризации</TableCell></TableRow> : serialRecords.map((record: any) => <TableRow key={record.id} className={cn(record.status === "SCANNED" && "bg-emerald-500/5", record.status === "EXTRA" && "bg-amber-500/5")}><TableCell>{record.status === "EXPECTED" && <Badge variant="outline" className="text-muted-foreground">Ожидается</Badge>}{record.status === "SCANNED" && <Badge variant="success" className="border-emerald-200 bg-emerald-100 text-emerald-700">Найден</Badge>}{record.status === "EXTRA" && <Badge variant="warning" className="border-amber-200 bg-amber-100 text-amber-700">Излишек</Badge>}</TableCell><TableCell className="font-medium">{record.asset.product.name}</TableCell><TableCell className="font-mono text-xs">{record.asset.serialNumber}</TableCell><TableCell>{record.asset.product.category?.name || "Без категории"}</TableCell><TableCell className="text-xs text-muted-foreground">{record.scannedAt ? format(new Date(record.scannedAt), "HH:mm:ss") : "-"}</TableCell></TableRow>)}
                                </TableBody>
                            </Table>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}
