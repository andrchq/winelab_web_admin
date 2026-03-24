"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { AlertTriangle, ArrowLeft, Clock, QrCode, Search, User } from "lucide-react";
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
            const now = Date.now();
            const diff = now - start;
            const hours = Math.floor(diff / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);

            setElapsedTime(
                `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`,
            );
        }, 1000);

        return () => clearInterval(timer);
    }, [session?.createdAt]);

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
                    toast.warning(
                        `Этот ШК числится на складе "${result.relocation.fromWarehouseName}". После применения корректировок он будет перенесен на текущий склад.`,
                    );
                } else {
                    sounds.success();
                    toast.success("Оборудование успешно учтено");
                }

                await fetchSessionData(searchTerm);
            } catch (error: any) {
                sounds.error();
                const message = error?.message || "";
                if (message.toLowerCase().includes("not found")) {
                    toast.error(`Оборудование с серийным номером ${code} не найдено`);
                } else {
                    console.error(error);
                    toast.error(message || "Ошибка сканирования");
                }
            } finally {
                setIsProcessing(false);
            }
        },
    });

    const handleFinish = async () => {
        if (!window.confirm("Завершить инвентаризацию и зафиксировать расхождения?")) return;

        try {
            const result = await inventoryApi.finish(sessionId);
            const missing = result?.summary?.missing ?? stats.missing;
            const extra = result?.summary?.extra ?? stats.extra;
            sounds.complete();
            toast.success(`Инвентаризация завершена. Недостача: ${missing}, излишек: ${extra}`);
            onBack();
        } catch (error) {
            sounds.error();
            toast.error("Не удалось завершить инвентаризацию");
        }
    };

    if (isLoading) return <div className="p-10 text-center">Загрузка...</div>;
    if (!session) return <div className="p-10 text-center">Инвентаризация не найдена</div>;

    const isCompleted = session.status === "COMPLETED";
    const hasDiscrepancies = stats.missing > 0 || stats.extra > 0;
    const adjustmentsApplied = Boolean(session.adjustmentsAppliedAt);
    const modelStats = Object.values(
        (session.records || []).reduce((acc: Record<string, { name: string; plan: number; fact: number; missing: number; extra: number }>, record: any) => {
            const modelName = record.asset.product.name;
            if (!acc[modelName]) {
                acc[modelName] = { name: modelName, plan: 0, fact: 0, missing: 0, extra: 0 };
            }

            if (record.status === "EXPECTED" || record.status === "MISSING") {
                acc[modelName].plan += 1;
                acc[modelName].missing += 1;
            } else if (record.status === "SCANNED") {
                acc[modelName].plan += 1;
                acc[modelName].fact += 1;
            } else if (record.status === "EXTRA") {
                acc[modelName].fact += 1;
                acc[modelName].extra += 1;
            }

            return acc;
        }, {}),
    ).sort((a: any, b: any) => a.name.localeCompare(b.name));

    const renderStatBadge = (
        value: number,
        label: string,
        description: string,
        className: string,
    ) => (
        <Tooltip>
            <TooltipTrigger asChild>
                <Badge variant="outline" className={`w-7 h-7 rounded flex items-center justify-center p-0 ${className}`}>
                    {value}
                </Badge>
            </TooltipTrigger>
            <TooltipContent>
                <div className="font-medium">{label}: {value}</div>
                <div className="text-xs text-muted-foreground">{description}</div>
            </TooltipContent>
        </Tooltip>
    );

    return (
        <div className="flex flex-col h-full space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={onBack}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            Инвентаризация: <span className="text-primary">{session.warehouse.name}</span>
                        </h1>
                        <div className="flex items-center gap-6 text-sm text-muted-foreground mt-1">
                            <div className="flex items-center gap-1.5">
                                <Clock className="h-4 w-4" />
                                <span className="font-mono">{elapsedTime}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <User className="h-4 w-4" />
                                <span>{session.createdBy.name}</span>
                            </div>
                            <Badge variant={isCompleted ? "success" : "default"}>
                                {isCompleted ? "Завершено" : "В процессе"}
                            </Badge>
                        </div>
                    </div>
                </div>
                {!isCompleted && (
                    <Button variant="destructive" onClick={handleFinish}>
                        Завершить инвентаризацию
                    </Button>
                )}
                {isCompleted && hasDiscrepancies && !adjustmentsApplied && (
                    <Button
                        variant="outline"
                        onClick={async () => {
                            if (!window.confirm("Применить корректировки по результатам этой инвентаризации?")) return;
                            try {
                                const result = await inventoryApi.applyAdjustments(sessionId);
                                sounds.complete();
                                toast.success(
                                    `Корректировки применены. Недостача: ${result.adjustments.missingAdjusted}, излишек: ${result.adjustments.extraAdjusted}`,
                                );
                                await fetchSessionData(searchTerm);
                            } catch (error: any) {
                                sounds.error();
                                toast.error(error?.message || "Не удалось применить корректировки");
                            }
                        }}
                    >
                        Применить корректировки
                    </Button>
                )}
            </div>

            {hasDiscrepancies && (
                <Card className="border-amber-300 bg-amber-50">
                    <CardContent className="p-4 text-sm text-amber-900 flex items-center gap-3">
                        <AlertTriangle className="h-5 w-5 shrink-0" />
                        <span>
                            По этой инвентаризации уже есть расхождения. Недостача: {stats.missing}, излишек: {stats.extra}.
                        </span>
                    </CardContent>
                </Card>
            )}

            {adjustmentsApplied && (
                <Card className="border-emerald-300 bg-emerald-50">
                    <CardContent className="p-4 text-sm text-emerald-900">
                        Корректировки по этой инвентаризации уже применены.
                    </CardContent>
                </Card>
            )}

            <div className="grid grid-cols-4 gap-4">
                <Card className="bg-blue-500/10 border-blue-500/20">
                    <CardContent className="p-6">
                        <p className="text-sm font-medium text-blue-600 mb-1">По учету</p>
                        <p className="text-3xl font-bold text-blue-700">{stats.plan}</p>
                    </CardContent>
                </Card>
                <Card className="bg-emerald-500/10 border-emerald-500/20">
                    <CardContent className="p-6">
                        <p className="text-sm font-medium text-emerald-600 mb-1">Найдено</p>
                        <p className="text-3xl font-bold text-emerald-700">{stats.fact}</p>
                    </CardContent>
                </Card>
                <Card className="bg-red-500/10 border-red-500/20">
                    <CardContent className="p-6">
                        <p className="text-sm font-medium text-red-600 mb-1">Недостача</p>
                        <p className="text-3xl font-bold text-red-700">{stats.missing}</p>
                    </CardContent>
                </Card>
                <Card className="bg-amber-500/10 border-amber-500/20">
                    <CardContent className="p-6">
                        <p className="text-sm font-medium text-amber-600 mb-1">Излишек</p>
                        <p className="text-3xl font-bold text-amber-700">{stats.extra}</p>
                    </CardContent>
                </Card>
            </div>

            <div className="flex gap-6 flex-1 min-h-0">
                <div className="w-[400px] flex flex-col gap-6">
                    {lastItem ? (
                        <Card className={cn(
                            "transition-all duration-300 animate-in fade-in slide-in-from-top-4",
                            lastItem.status === "EXTRA" ? "border-amber-500/50 bg-amber-500/5" : "border-emerald-500/50 bg-emerald-500/5",
                        )}>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-lg flex items-center justify-between">
                                    Последний скан
                                    <Badge variant={lastItem.status === "EXTRA" ? "warning" : "success"}>
                                        {lastItem.status === "EXTRA" ? "Излишек" : "Найден"}
                                    </Badge>
                                </CardTitle>
                                <CardDescription>
                                    {format(new Date(lastItem.scannedAt), "HH:mm:ss", { locale: ru })}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Модель</p>
                                    <p className="text-lg font-medium leading-tight mt-1">{lastItem.asset.product.name}</p>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-xs text-muted-foreground uppercase tracking-wider">Категория</p>
                                        <p className="font-medium mt-1">{lastItem.asset.product.category.name}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground uppercase tracking-wider">Серийный номер</p>
                                        <p className="font-mono mt-1">{lastItem.asset.serialNumber}</p>
                                    </div>
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Отсканировал</p>
                                    <p className="text-sm mt-1 flex items-center gap-2">
                                        <User className="h-3 w-3" />
                                        {lastItem.scannedBy?.name}
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    ) : (
                        !isCompleted && (
                            <Card className="border-dashed border-2 flex flex-col items-center justify-center p-6 text-center h-[200px] text-muted-foreground">
                                <QrCode className="h-8 w-8 mb-2 opacity-50" />
                                <p className="font-medium">Готов к сканированию</p>
                                <p className="text-sm mt-1">Сканируйте серийный номер в любом месте страницы</p>
                            </Card>
                        )
                    )}

                    <Card className="flex-1 overflow-hidden flex flex-col min-h-[300px]">
                        <CardHeader className="py-3 px-4 border-b bg-muted/30">
                            <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                                Сводка по моделям
                            </CardTitle>
                        </CardHeader>
                        <TooltipProvider>
                            <div className="overflow-y-auto p-0">
                                {modelStats.map((stat: any) => (
                                    <div key={stat.name} className="p-3 border-b last:border-0 hover:bg-muted/50 transition-colors flex items-center justify-between">
                                        <div className="font-medium text-sm mr-2 truncate" title={stat.name}>{stat.name}</div>
                                        <div className="flex items-center gap-1.5 shrink-0">
                                            {renderStatBadge(
                                                stat.plan,
                                                "По учету",
                                                "Сколько единиц этой модели система ожидает на складе по базе.",
                                                "text-blue-600 bg-blue-50 border-blue-200",
                                            )}
                                            {stat.fact > 0 && renderStatBadge(
                                                stat.fact,
                                                "Найдено",
                                                "Сколько единиц этой модели уже подтверждено сканированием в этой инвентаризации.",
                                                "text-emerald-600 bg-emerald-50 border-emerald-200",
                                            )}
                                            {stat.missing > 0 && renderStatBadge(
                                                stat.missing,
                                                "Недостача",
                                                "Сколько единиц этой модели ожидалось, но пока не найдено при пересчете.",
                                                "text-red-600 bg-red-50 border-red-200",
                                            )}
                                            {stat.extra > 0 && renderStatBadge(
                                                stat.extra,
                                                "Излишек",
                                                "Сколько единиц этой модели найдено сверх того, что числится по базе на этом складе.",
                                                "text-amber-600 bg-amber-50 border-amber-200",
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </TooltipProvider>
                    </Card>
                </div>

                <Card className="flex-1 flex flex-col min-h-0">
                    <CardHeader className="px-6 py-4 border-b">
                        <div className="flex items-center justify-between gap-4">
                            <CardTitle>Список оборудования</CardTitle>
                            <div className="relative w-72">
                                <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    value={searchTerm}
                                    onChange={(event) => setSearchTerm(event.target.value)}
                                    placeholder="Поиск по модели, SN или категории"
                                    className="pl-9"
                                />
                            </div>
                        </div>
                    </CardHeader>
                    <div className="flex-1 overflow-auto">
                        <Table>
                            <TableHeader className="sticky top-0 bg-background z-10">
                                <TableRow>
                                    <TableHead>Статус</TableHead>
                                    <TableHead>Наименование</TableHead>
                                    <TableHead>Серийный номер</TableHead>
                                    <TableHead>Категория</TableHead>
                                    <TableHead>Время сканирования</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {session.records.map((record: any) => (
                                    <TableRow
                                        key={record.id}
                                        className={cn(
                                            record.status === "SCANNED" && "bg-emerald-500/5",
                                            record.status === "EXTRA" && "bg-amber-500/5",
                                        )}
                                    >
                                        <TableCell>
                                            {record.status === "EXPECTED" && <Badge variant="outline" className="text-muted-foreground">Ожидается</Badge>}
                                            {record.status === "SCANNED" && <Badge variant="success" className="bg-emerald-100 text-emerald-700 border-emerald-200">Найден</Badge>}
                                            {record.status === "EXTRA" && <Badge variant="warning" className="bg-amber-100 text-amber-700 border-amber-200">Излишек</Badge>}
                                        </TableCell>
                                        <TableCell className="font-medium">{record.asset.product.name}</TableCell>
                                        <TableCell className="font-mono text-xs">{record.asset.serialNumber}</TableCell>
                                        <TableCell>{record.asset.product.category.name}</TableCell>
                                        <TableCell className="text-muted-foreground text-xs">
                                            {record.scannedAt ? format(new Date(record.scannedAt), "HH:mm:ss") : "-"}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </Card>
            </div>
        </div>
    );
}
