"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useParams, useRouter } from "next/navigation";
import { receivingService, ReceivingSession, ReceivingItem } from "@/lib/receiving-service";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, AlertTriangle, ArrowLeft, ArrowRight, PackageCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useScanDetection } from "@/lib/use-scan-detection";
import { useTSDMode } from "@/contexts/TSDModeContext";

export default function ReceivingDashboard() {
    const params = useParams();
    const router = useRouter();
    const id = params?.id as string;
    const { isTSDMode } = useTSDMode();

    const [session, setSession] = useState<ReceivingSession | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            if (id) {
                try {
                    const data = await receivingService.getById(id);
                    if (data) {
                        setSession(data);
                    } else {
                        toast.error("Сессия не найдена");
                        router.push('/receiving');
                    }
                } catch (error) {
                    console.error(error);
                    toast.error("Ошибка загрузки");
                } finally {
                    setLoading(false);
                }
            }
        };
        loadData();
    }, [id, router]);

    const handleCardClick = (item: ReceivingItem) => {
        router.push(`/receiving/${id}/scan/${item.id}`);
    };

    useScanDetection({
        onScan: (code) => {
            if (!session) return;
            const cleanCode = code.trim();
            const foundItem = session.items.find(i =>
                (i.sku && i.sku.toLowerCase() === cleanCode.toLowerCase()) ||
                (i.name && i.name.toLowerCase() === cleanCode.toLowerCase())
            );

            if (foundItem) {
                toast.success(`Товар найден: ${foundItem.name}`);
                router.push(`/receiving/${id}/scan/${foundItem.id}`);
            } else {
                toast.error(`Товар со штрихкодом "${cleanCode}" не найден в накладной`);
            }
        }
    });

    const handleCompleteSession = async () => {
        if (!session) return;

        if (!confirm("Вы уверены, что хотите завершить приемку и обновить остатки?")) return;

        try {
            await receivingService.commit(id);
            toast.success("Приемка завершена, остатки обновлены!");
            router.push('/receiving');
        } catch (error: any) {
            console.error(error);
            const msg = error?.message || "Неизвестная ошибка";
            toast.error(`Ошибка: ${msg}`);
        }
    };

    const getStatusColor = (current: number, total: number) => {
        if (current === 0) return "bg-gray-100 border-gray-200 text-gray-500";
        if (current === total) return "bg-green-100 border-green-200 text-green-700";
        if (current > total) return "bg-red-100 border-red-200 text-red-700";
        return "bg-yellow-50 border-yellow-200 text-yellow-700";
    };

    const handleDeleteSession = async () => {
        if (!confirm("Вы уверены, что хотите УДАЛИТЬ эту приемку? Все данные будут потеряны.")) return;
        try {
            await receivingService.delete(id);
            toast.success("Приемка удалена");
            router.push('/receiving');
        } catch (error) {
            console.error(error);
            toast.error("Ошибка при удалении");
        }
    };

    if (loading) return <div className="p-8 flex justify-center">Загрузка...</div>;
    if (!session) return null;

    const totalScanned = session.items.reduce((acc, i) => acc + (i.scannedQuantity || 0), 0);
    const totalExpected = session.items.reduce((acc, i) => acc + i.expectedQuantity, 0);
    const progressPercent = Math.min(100, Math.round((totalScanned / totalExpected) * 100));

    return (
        <div className="flex flex-col h-full">
            <main className={`flex-1 overflow-y-auto ${isTSDMode ? 'p-2' : 'p-4'} bg-muted/10`}>
                <div className="space-y-6">

                    {/* Top Bar */}
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                            <Button variant="ghost" size="sm" onClick={() => router.push('/receiving')}>
                                <ArrowLeft className="mr-2 h-4 w-4" /> Назад
                            </Button>
                            <div className="text-right">
                                <div className="text-xs text-muted-foreground font-mono mb-1">{session.invoiceNumber || session.id}</div>
                                <div className="font-bold text-lg flex items-center justify-end gap-2">
                                    <span>{session.supplier || "Поставщик"}</span>
                                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                                    <span>{session.warehouse?.name || "Склад"}</span>
                                </div>
                                <div className="text-xs text-muted-foreground">
                                    {session.status === 'DRAFT' ? 'Черновик' :
                                        session.status === 'IN_PROGRESS' ? 'В процессе' :
                                            session.status === 'COMPLETED' ? 'Завершено' : session.status}
                                </div>
                            </div>
                        </div>

                        {/* Progress Card */}
                        <Card>
                            <CardContent className="p-4 flex flex-col gap-2">
                                <div className="flex justify-between items-end">
                                    <div>
                                        <div className="text-sm font-medium text-muted-foreground">Прогресс приемки</div>
                                        <div className="text-3xl font-bold font-mono">
                                            {totalScanned} <span className="text-lg text-muted-foreground font-normal">/ {totalExpected}</span>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <Badge variant={progressPercent === 100 ? "success" : "secondary"}>
                                            {progressPercent}%
                                        </Badge>
                                    </div>
                                </div>
                                <div className="h-3 bg-secondary rounded-full overflow-hidden w-full">
                                    <div
                                        className={`h-full transition-all duration-500 ${progressPercent >= 100 ? 'bg-green-500' : 'bg-primary'
                                            }`}
                                        style={{ width: `${progressPercent}%` }}
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pb-20">
                        {session.items.map((item) => {
                            const current = item.scannedQuantity || 0;
                            const total = item.expectedQuantity;
                            const statusClass = getStatusColor(current, total);

                            return (
                                <button
                                    key={item.id}
                                    onClick={() => handleCardClick(item)}
                                    className={`
                                    relative flex flex-col text-left p-4 rounded-xl border-2 transition-all active:scale-95
                                    min-h-[140px] justify-between shadow-sm hover:shadow-md
                                    ${statusClass}
                                `}
                                >
                                    <div>
                                        <div className="font-medium line-clamp-2 leading-tight mb-1" title={item.name}>
                                            {item.name}
                                        </div>
                                        {item.sku && <div className="text-xs opacity-70 font-mono">{item.sku}</div>}
                                    </div>

                                    <div className="mt-4 flex items-end justify-between w-full">
                                        <div className="text-xs font-medium uppercase tracking-wider opacity-60">
                                            {current === 0 ? "Ожидание" : current < total ? "В процессе" : "Готово"}
                                        </div>
                                        <div className="text-2xl font-bold font-mono">
                                            {current}/{total}
                                        </div>
                                    </div>

                                    {/* Status Icon Overlay */}
                                    {current === total && (
                                        <div className="absolute top-2 right-2">
                                            <Badge className="bg-green-500/20 text-green-700 hover:bg-green-500/20 border-0">
                                                <Check className="h-3 w-3 mr-1" /> OK
                                            </Badge>
                                        </div>
                                    )}
                                    {current > total && (
                                        <div className="absolute top-2 right-2">
                                            <Badge variant="destructive" className="animate-pulse">
                                                <AlertTriangle className="h-3 w-3 mr-1" /> +{current - total}
                                            </Badge>
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </main>

            {/* Fixed Footer Action */}
            <div className="border-t bg-background p-4 flex justify-between items-center gap-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={handleDeleteSession} title="Удалить приемку">
                    <Trash2 className="h-5 w-5" />
                </Button>
                <div className="text-sm text-muted-foreground hidden sm:block flex-1">
                    Нажмите на карточку для сканирования
                </div>
                <Button size="lg" className="w-full sm:w-auto" disabled={totalScanned === 0} onClick={handleCompleteSession}>
                    <PackageCheck className="mr-2 h-5 w-5" />
                    Завершить приемку
                </Button>
            </div>
        </div>
    );
}
