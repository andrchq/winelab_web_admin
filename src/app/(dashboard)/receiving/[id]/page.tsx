"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AlertTriangle, ArrowLeft, ArrowRight, Check, PackageCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/contexts/AuthContext";
import { useScanDetection } from "@/lib/use-scan-detection";
import { useTSDMode } from "@/contexts/TSDModeContext";
import { receivingService, ReceivingItem, ReceivingSession } from "@/lib/receiving-service";
import { sounds } from "@/lib/sounds";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function ReceivingDashboard() {
    const params = useParams();
    const router = useRouter();
    const id = params?.id as string;
    const { isTSDMode } = useTSDMode();
    const { hasRole } = useAuth();
    const isPrivileged = hasRole(["ADMIN", "MANAGER"]);

    const [session, setSession] = useState<ReceivingSession | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            if (!id) return;

            try {
                const data = await receivingService.getById(id);
                if (!data) {
                    toast.error("Сессия приемки не найдена");
                    router.push("/receiving");
                    return;
                }

                setSession(data);
            } catch (error) {
                console.error(error);
                toast.error("Ошибка загрузки");
            } finally {
                setLoading(false);
            }
        };

        void loadData();
    }, [id, router]);

    const handleCardClick = (item: ReceivingItem) => {
        router.push(`/receiving/${id}/scan/${item.id}`);
    };

    useScanDetection({
        onScan: (code) => {
            if (!session) return;

            const cleanCode = code.trim();
            const foundItem = session.items.find((item) =>
                (item.sku && item.sku.toLowerCase() === cleanCode.toLowerCase()) ||
                (item.name && item.name.toLowerCase() === cleanCode.toLowerCase()),
            );

            if (foundItem) {
                toast.success(`Товар найден: ${foundItem.name}`);
                router.push(`/receiving/${id}/scan/${foundItem.id}`);
                return;
            }

            toast.error(`Товар со штрихкодом "${cleanCode}" не найден в накладной`);
        },
    });

    const handleCompleteSession = async () => {
        if (!session) return;

        if (!confirm("Вы уверены, что хотите завершить приемку и обновить остатки?")) return;

        try {
            await receivingService.commit(id);
            toast.success("Приемка завершена, остатки обновлены");
            router.push("/receiving");
        } catch (error: any) {
            console.error(error);
            toast.error(`Ошибка: ${error?.message || "Неизвестная ошибка"}`);
        }
    };

    const handleDeleteSession = async () => {
        if (!confirm("Вы уверены, что хотите удалить эту приемку? Все данные будут потеряны.")) return;

        try {
            await receivingService.delete(id);
            toast.success("Приемка удалена");
            router.push("/receiving");
        } catch (error) {
            console.error(error);
            toast.error("Ошибка при удалении");
        }
    };

    const getStatusColor = (current: number, total: number) => {
        if (current === 0) return "bg-gray-100 border-gray-200 text-gray-500";
        if (current === total) return "bg-green-100 border-green-200 text-green-700";
        if (current > total) return "bg-red-100 border-red-200 text-red-700";
        return "bg-yellow-50 border-yellow-200 text-yellow-700";
    };

    if (loading) return <div className="p-8 flex justify-center">Загрузка...</div>;
    if (!session) return null;

    const totalScanned = session.items.reduce((acc, item) => acc + (item.scannedQuantity || 0), 0);
    const totalExpected = session.items.reduce((acc, item) => acc + item.expectedQuantity, 0);
    const progressPercent = Math.min(100, Math.round((totalScanned / Math.max(totalExpected, 1)) * 100));
    const unmappedScannedItems = session.items.filter((item) => !item.productId && item.scannedQuantity > 0);
    const hasBlockingIssues = unmappedScannedItems.length > 0;
    const pendingBindingItems = session.items.filter((item) => item.linkedAsset?.isUnidentified && item.scannedQuantity === 0);
    const regularItems = session.items.filter((item) => !(item.linkedAsset?.isUnidentified && item.scannedQuantity === 0));

    const renderItemCard = (item: ReceivingItem) => {
        const current = item.scannedQuantity || 0;
        const total = item.expectedQuantity;
        const statusClass = getStatusColor(current, total);
        const needsBinding = Boolean(item.linkedAsset?.isUnidentified);

        return (
            <button
                key={item.id}
                onClick={() => handleCardClick(item)}
                className={`
                    relative flex min-h-[140px] flex-col justify-between rounded-xl border-2 p-4 text-left shadow-sm transition-all active:scale-95 hover:shadow-md
                    ${statusClass}
                `}
            >
                <div>
                    <div className="mb-1 line-clamp-2 font-medium leading-tight" title={item.name}>
                        {item.name}
                    </div>
                    {item.sku && <div className="text-xs font-mono opacity-70">{item.sku}</div>}
                    {needsBinding && (
                        <Badge variant="outline" className="mt-2 border-amber-500/30 bg-amber-500/10 text-amber-700">
                            {current > 0 ? "ШК считан, будет привязан" : "Требует привязки ШК"}
                        </Badge>
                    )}
                </div>

                <div className="mt-4 flex w-full items-end justify-between">
                    <div className="text-xs font-medium uppercase tracking-wider opacity-60">
                        {current === 0 ? "Ожидание" : current < total ? "В процессе" : "Готово"}
                    </div>
                    <div className="text-2xl font-bold font-mono">
                        {current}/{total}
                    </div>
                </div>

                {current === total && (
                    <div className="absolute right-2 top-2">
                        <Badge className="border-0 bg-green-500/20 text-green-700 hover:bg-green-500/20">
                            <Check className="mr-1 h-3 w-3" /> OK
                        </Badge>
                    </div>
                )}
                {current > total && (
                    <div className="absolute right-2 top-2">
                        <Badge variant="destructive" className="animate-pulse">
                            <AlertTriangle className="mr-1 h-3 w-3" /> +{current - total}
                        </Badge>
                    </div>
                )}
            </button>
        );
    };

    return (
        <div className="flex h-full flex-col">
            <main className={`flex-1 overflow-y-auto bg-muted/10 ${isTSDMode ? "p-2" : "p-4"}`}>
                <div className="space-y-6">
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                            <Button variant="ghost" size="sm" onClick={() => router.push("/receiving")}>
                                <ArrowLeft className="mr-2 h-4 w-4" /> Назад
                            </Button>
                            <div className="text-right">
                                <div className="mb-1 font-mono text-xs text-muted-foreground">{session.invoiceNumber || session.id}</div>
                                <div className="flex items-center justify-end gap-2 text-lg font-bold">
                                    <span>{session.supplier || "Поставщик"}</span>
                                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                                    <span>{session.warehouse?.name || "Склад"}</span>
                                </div>
                                <div className="text-xs text-muted-foreground">
                                    {session.status === "DRAFT"
                                        ? "Черновик"
                                        : session.status === "IN_PROGRESS"
                                            ? "В процессе"
                                            : session.status === "COMPLETED"
                                                ? session.hasDiscrepancy ? "Завершено со спором" : "Завершено"
                                                : session.status}
                                </div>
                            </div>
                        </div>

                        <Card>
                            <CardContent className="flex flex-col gap-2 p-4">
                                <div className="flex items-end justify-between">
                                    <div>
                                        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                                            Прогресс приемки
                                            {session.completedBy && (
                                                <Badge variant="outline" className="h-5 border-green-500/20 bg-green-50 text-[10px] font-normal text-green-700">
                                                    Принял: {session.completedBy.name}
                                                </Badge>
                                            )}
                                        </div>
                                        <div className="text-3xl font-bold font-mono">
                                            {totalScanned} <span className="text-lg font-normal text-muted-foreground">/ {totalExpected}</span>
                                        </div>
                                    </div>
                                    <Badge variant={progressPercent === 100 ? "success" : "secondary"}>{progressPercent}%</Badge>
                                </div>
                                <div className="h-3 w-full overflow-hidden rounded-full bg-secondary">
                                    <div
                                        className={`h-full transition-all duration-500 ${progressPercent >= 100 ? "bg-green-500" : "bg-primary"}`}
                                        style={{ width: `${progressPercent}%` }}
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        {hasBlockingIssues && (
                            <Card className="border-orange-300 bg-orange-50">
                                <CardContent className="p-4 text-sm text-orange-900">
                                    В этой приемке есть принятые позиции без привязки к товару. Завершение будет доступно только после исправления таких позиций.
                                </CardContent>
                            </Card>
                        )}

                        {pendingBindingItems.length > 0 && (
                            <Card className="border-amber-300 bg-amber-50">
                                <CardContent className="p-4 text-sm text-amber-900">
                                    В блоке ниже есть legacy-оборудование без реального ШК. Открой позицию и отсканируй фактический ШК устройства. После завершения приемки он будет привязан к этому asset и позиция станет обычной.
                                </CardContent>
                            </Card>
                        )}

                        {session.hasDiscrepancy && (
                            <Card className="border-red-300 bg-red-50">
                                <CardContent className="p-4 text-sm text-red-900">
                                    Приемка завершена со спорным случаем.
                                    {session.discrepancyDetails ? ` ${session.discrepancyDetails}` : ""}
                                </CardContent>
                            </Card>
                        )}
                    </div>

                    {pendingBindingItems.length > 0 && (
                        <section className="space-y-3">
                            <div className="flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4 text-amber-600" />
                                <h3 className="text-sm font-semibold text-amber-700">Требуют привязки реального ШК</h3>
                            </div>
                            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                                {pendingBindingItems.map(renderItemCard)}
                            </div>
                        </section>
                    )}

                    <section className="space-y-3 pb-20">
                        {pendingBindingItems.length > 0 && (
                            <div className="flex items-center gap-2">
                                <h3 className="text-sm font-semibold text-foreground">Остальные позиции</h3>
                            </div>
                        )}
                        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                            {regularItems.map(renderItemCard)}
                        </div>
                    </section>
                </div>
            </main>

            <div className="flex items-center justify-between gap-4 border-t bg-background p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
                <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={handleDeleteSession}
                    title="Удалить приемку"
                    style={{ visibility: isPrivileged ? "visible" : "hidden" }}
                >
                    <Trash2 className="h-5 w-5" />
                </Button>
                <div className="hidden flex-1 text-sm text-muted-foreground sm:block">
                    Нажмите на карточку для сканирования
                </div>
                <Button size="lg" className="w-full sm:w-auto" disabled={totalScanned === 0 || hasBlockingIssues} onClick={handleCompleteSession}>
                    <PackageCheck className="mr-2 h-5 w-5" />
                    Завершить приемку
                </Button>
            </div>
        </div>
    );
}
