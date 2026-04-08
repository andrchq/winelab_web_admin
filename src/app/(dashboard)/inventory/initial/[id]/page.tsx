"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Barcode, CheckCircle2, Package2, Plus, ScanLine, Search, ShieldAlert, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { initialInventoryApi } from "@/lib/api";
import { useCategories, useProducts } from "@/lib/hooks";
import { sounds } from "@/lib/sounds";
import { useScanDetection } from "@/lib/use-scan-detection";
import { cn } from "@/lib/utils";
import type { InitialInventoryEntry, InitialInventorySession, Product } from "@/types/api";

const QUICK_QUANTITY_VALUES = [1, 5, 10, 20];

const conflictLabel: Record<string, string> = {
    STORE_ASSET: "Числится на магазине",
    OTHER_WAREHOUSE: "Числится на другом складе",
    PROCESS_CONFLICT: "В активном процессе",
};

const filterProducts = (list: Product[], query: string) => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return list;

    return list.filter((product) =>
        [product.name, product.sku, product.category?.name]
            .filter(Boolean)
            .some((value) => value!.toLowerCase().includes(normalized)),
    );
};

const groupProductsByCategory = (list: Product[], categories: Array<{ id: string; name: string }>) =>
    categories
        .map((category) => ({
            category,
            products: list.filter((product) => product.categoryId === category.id),
        }))
        .filter((group) => group.products.length > 0);

export default function InitialInventorySessionPage() {
    const params = useParams();
    const router = useRouter();
    const sessionId = params?.id as string;
    const { data: products } = useProducts();
    const { data: categories } = useCategories();

    const [session, setSession] = useState<InitialInventorySession | null>(null);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [activeEntryId, setActiveEntryId] = useState<string | null>(null);
    const [pendingScan, setPendingScan] = useState("");
    const [manualScanCode, setManualScanCode] = useState("");
    const [assignDialogOpen, setAssignDialogOpen] = useState(false);
    const [assignProductId, setAssignProductId] = useState("");
    const [assignSearch, setAssignSearch] = useState("");
    const [quantityDialogOpen, setQuantityDialogOpen] = useState(false);
    const [quantityProductId, setQuantityProductId] = useState("");
    const [quantitySearch, setQuantitySearch] = useState("");
    const [quantityValue, setQuantityValue] = useState("1");
    const [quantityDrafts, setQuantityDrafts] = useState<Record<string, string>>({});

    const deferredAssignSearch = useDeferredValue(assignSearch);
    const deferredQuantitySearch = useDeferredValue(quantitySearch);

    useEffect(() => {
        const loadSession = async () => {
            try {
                const data = await initialInventoryApi.getOne(sessionId);
                setSession(data);
            } catch (error) {
                console.error(error);
                sounds.error();
                toast.error("Не удалось загрузить первичную инвентаризацию");
                router.push("/warehouses");
            } finally {
                setLoading(false);
            }
        };

        void loadSession();
    }, [router, sessionId]);

    useEffect(() => {
        if (!session) return;

        setQuantityDrafts(
            session.entries.reduce<Record<string, string>>((acc, entry) => {
                acc[entry.id] = String(entry.quantity);
                return acc;
            }, {}),
        );

        if (!activeEntryId) {
            const firstEntry = session.entries.find((entry) => entry.product.accountingType !== "QUANTITY");
            if (firstEntry) {
                setActiveEntryId(firstEntry.id);
            }
        }
    }, [session, activeEntryId]);

    const catalogProducts = useMemo(() => {
        const allowedCategoryIds = new Set(categories.map((category) => category.id));

        return [...products]
            .filter((product) => product.categoryId && allowedCategoryIds.has(product.categoryId))
            .sort((left, right) => {
                const leftIndex = categories.findIndex((category) => category.id === left.categoryId);
                const rightIndex = categories.findIndex((category) => category.id === right.categoryId);
                if (leftIndex !== rightIndex) {
                    return leftIndex - rightIndex;
                }
                return left.name.localeCompare(right.name, "ru");
            });
    }, [categories, products]);

    const serialProducts = useMemo(
        () => catalogProducts.filter((product) => product.accountingType !== "QUANTITY"),
        [catalogProducts],
    );
    const quantityProducts = useMemo(
        () => catalogProducts.filter((product) => product.accountingType === "QUANTITY"),
        [catalogProducts],
    );
    const filteredSerialProducts = useMemo(
        () => filterProducts(serialProducts, deferredAssignSearch),
        [deferredAssignSearch, serialProducts],
    );
    const filteredQuantityProducts = useMemo(
        () => filterProducts(quantityProducts, deferredQuantitySearch),
        [deferredQuantitySearch, quantityProducts],
    );
    const filteredSerialGroups = useMemo(
        () => groupProductsByCategory(filteredSerialProducts, categories),
        [categories, filteredSerialProducts],
    );
    const filteredQuantityGroups = useMemo(
        () => groupProductsByCategory(filteredQuantityProducts, categories),
        [categories, filteredQuantityProducts],
    );

    const activeEntry = session?.entries.find((entry) => entry.id === activeEntryId) || null;
    const serializedScansCount =
        session?.entries
            .filter((entry) => entry.product.accountingType !== "QUANTITY")
            .reduce((sum, entry) => sum + entry.scans.length, 0) || 0;
    const quantityItemsCount =
        session?.entries
            .filter((entry) => entry.product.accountingType === "QUANTITY")
            .reduce((sum, entry) => sum + entry.quantity, 0) || 0;
    const countedEntries =
        session?.entries.filter((entry) =>
            entry.product.accountingType === "QUANTITY" ? entry.quantity > 0 : entry.scans.length > 0,
        ) || [];
    const conflictingScans =
        session?.entries.flatMap((entry) =>
            entry.scans.filter((scan) => scan.requiresReview).map((scan) => ({ entry, scan })),
        ) || [];
    const unresolvedConflicts = conflictingScans.filter(({ scan }) => !scan.reviewedAt);
    const hasCountedItems = countedEntries.length > 0;
    const hasUnresolvedConflicts = unresolvedConflicts.length > 0;

    const entryLabels = useMemo(() => {
        const occurrences: Record<string, number> = {};
        const labels: Record<string, string> = {};

        (session?.entries || []).forEach((entry) => {
            occurrences[entry.productId] = (occurrences[entry.productId] || 0) + 1;
            labels[entry.id] = occurrences[entry.productId] > 1
                ? `${entry.product.name} / блок ${occurrences[entry.productId]}`
                : entry.product.name;
        });

        return labels;
    }, [session?.entries]);

    const applySessionUpdate = (updatedSession: InitialInventorySession) => {
        setSession(updatedSession);
        if (activeEntryId && !updatedSession.entries.find((entry) => entry.id === activeEntryId)) {
            setActiveEntryId(null);
        }
    };

    const createEntryAndFindTarget = async (productId: string) => {
        const result = await initialInventoryApi.createEntry(sessionId, productId);
        if (!result?.entry || !result?.session) {
            throw new Error("Не удалось создать блок оборудования");
        }
        applySessionUpdate(result.session);
        return result.entry as InitialInventoryEntry;
    };

    const selectEntry = (entryId: string) => {
        setActiveEntryId(entryId);
        sounds.info();
    };

    const openAssignDialogForCode = (code: string) => {
        setPendingScan(code);
        setAssignSearch("");
        setAssignDialogOpen(true);
        sounds.info();
    };

    const handleDirectScan = async (entryId: string, code: string) => {
        setProcessing(true);
        try {
            const result = await initialInventoryApi.addScan(sessionId, entryId, code);
            applySessionUpdate(result.session);
            if (result.scan?.requiresReview) {
                sounds.warning();
                toast.warning("ШК добавлен, но требует подтверждения в review-блоке");
            } else {
                sounds.success();
                toast.success("ШК добавлен в блок");
            }
        } catch (error: any) {
            sounds.error();
            toast.error(error?.message || "Не удалось добавить ШК");
        } finally {
            setProcessing(false);
        }
    };

    const handleScannedCode = async (code: string) => {
        if (!session || processing || session.status !== "IN_PROGRESS") return;

        const cleanCode = code.trim();
        if (!cleanCode) {
            sounds.warning();
            toast.error("Пустой ШК нельзя добавить");
            return;
        }

        if (activeEntry && activeEntry.product.accountingType !== "QUANTITY") {
            await handleDirectScan(activeEntry.id, cleanCode);
            return;
        }

        openAssignDialogForCode(cleanCode);
    };

    useScanDetection({
        onScan: async (code) => {
            await handleScannedCode(code);
        },
    });

    const handleManualScanSubmit = async () => {
        await handleScannedCode(manualScanCode);
        setManualScanCode("");
    };

    const handleAssignScannedCode = async () => {
        if (!assignProductId || !pendingScan) {
            sounds.warning();
            return;
        }

        setProcessing(true);
        try {
            const targetEntry = await createEntryAndFindTarget(assignProductId);
            const result = await initialInventoryApi.addScan(sessionId, targetEntry.id, pendingScan);
            applySessionUpdate(result.session);
            setActiveEntryId(targetEntry.id);
            setAssignDialogOpen(false);
            setAssignProductId("");
            setPendingScan("");

            if (result.scan?.requiresReview) {
                sounds.warning();
                toast.warning("ШК привязан к модели, но требует подтверждения в review-блоке");
            } else {
                sounds.success();
                toast.success("ШК привязан к выбранной модели");
            }
        } catch (error: any) {
            sounds.error();
            toast.error(error?.message || "Не удалось привязать ШК");
        } finally {
            setProcessing(false);
        }
    };

    const handleAddQuantityBlock = async () => {
        if (!quantityProductId) {
            sounds.warning();
            return;
        }

        const parsedQuantity = parseInt(quantityValue, 10);
        if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
            sounds.warning();
            toast.error("Количество должно быть больше 0");
            return;
        }

        setProcessing(true);
        try {
            const targetEntry = await createEntryAndFindTarget(quantityProductId);
            const updatedSession = await initialInventoryApi.setQuantity(sessionId, targetEntry.id, parsedQuantity);
            sounds.success();
            applySessionUpdate(updatedSession);
            setQuantityDialogOpen(false);
            setQuantityProductId("");
            setQuantityValue("1");
            toast.success("Количественный блок создан");
        } catch (error: any) {
            sounds.error();
            toast.error(error?.message || "Не удалось добавить количество");
        } finally {
            setProcessing(false);
        }
    };

    const handleSaveQuantity = async (entryId: string) => {
        const nextQuantity = parseInt(quantityDrafts[entryId] || "0", 10);
        if (!Number.isFinite(nextQuantity) || nextQuantity < 0) {
            sounds.warning();
            toast.error("Количество должно быть 0 или больше");
            return;
        }

        setProcessing(true);
        try {
            const updatedSession = await initialInventoryApi.setQuantity(sessionId, entryId, nextQuantity);
            sounds.success();
            applySessionUpdate(updatedSession);
            toast.success("Количество обновлено");
        } catch (error: any) {
            sounds.error();
            toast.error(error?.message || "Не удалось обновить количество");
        } finally {
            setProcessing(false);
        }
    };

    const handleResolveScanConflict = async (entryId: string, scanId: string) => {
        setProcessing(true);
        try {
            const updatedSession = await initialInventoryApi.resolveScanConflict(sessionId, entryId, scanId);
            sounds.success();
            applySessionUpdate(updatedSession);
            toast.success("Конфликтный ШК подтвержден");
        } catch (error: any) {
            sounds.error();
            toast.error(error?.message || "Не удалось подтвердить ШК");
        } finally {
            setProcessing(false);
        }
    };

    const handleDeleteScan = async (entryId: string, scanId: string) => {
        setProcessing(true);
        try {
            const updatedSession = await initialInventoryApi.deleteScan(sessionId, entryId, scanId);
            sounds.warning();
            applySessionUpdate(updatedSession);
            toast.success("Скан удален");
        } catch (error: any) {
            sounds.error();
            toast.error(error?.message || "Не удалось удалить скан");
        } finally {
            setProcessing(false);
        }
    };

    const handleDeleteEntry = async (entryId: string) => {
        if (!window.confirm("Удалить весь блок оборудования?")) return;

        setProcessing(true);
        try {
            const updatedSession = await initialInventoryApi.deleteEntry(sessionId, entryId);
            sounds.warning();
            applySessionUpdate(updatedSession);
            toast.success("Блок удален");
        } catch (error: any) {
            sounds.error();
            toast.error(error?.message || "Не удалось удалить блок");
        } finally {
            setProcessing(false);
        }
    };

    const handleApply = async () => {
        if (!window.confirm("Занести все собранные позиции на склад и завершить первичную инвентаризацию?")) return;

        setProcessing(true);
        try {
            await initialInventoryApi.apply(sessionId);
            sounds.complete();
            toast.success("Первичная инвентаризация завершена, данные занесены на склад");
            router.push(`/warehouses/${session?.warehouseId}`);
        } catch (error: any) {
            sounds.error();
            toast.error(error?.message || "Не удалось завершить первичную инвентаризацию");
        } finally {
            setProcessing(false);
        }
    };

    if (loading) return <div className="p-8">Загрузка...</div>;
    if (!session) return null;

    return (
        <main className="flex-1 overflow-y-auto p-4 pb-28 sm:p-6 sm:pb-6">
            <div className="mx-auto flex max-w-7xl flex-col gap-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex items-start gap-4">
                        <Button variant="ghost" size="icon" onClick={() => router.push(`/warehouses/${session.warehouseId}`)}>
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                        <div>
                            <h1 className="text-2xl font-bold">Первичная инвентаризация</h1>
                            <p className="mt-1 text-sm text-muted-foreground">
                                Склад: <span className="font-medium text-foreground">{session.warehouse.name}</span>
                            </p>
                            <p className="text-xs text-muted-foreground">
                                Можно создавать несколько блоков одной и той же модели. Конфликтные ШК нужно подтвердить перед занесением.
                            </p>
                        </div>
                    </div>
                    <div className="hidden flex-wrap gap-2 md:flex">
                        <Button
                            variant="outline"
                            onClick={() => {
                                setQuantitySearch("");
                                setQuantityDialogOpen(true);
                                sounds.info();
                            }}
                            disabled={processing || session.status !== "IN_PROGRESS"}
                        >
                            <Plus className="mr-2 h-4 w-4" />
                            Добавить количеством
                        </Button>
                        <Button
                            onClick={handleApply}
                            disabled={processing || !hasCountedItems || hasUnresolvedConflicts || session.status !== "IN_PROGRESS"}
                        >
                            Занести на склад
                        </Button>
                    </div>
                </div>

                <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
                    <Card><CardHeader className="pb-2"><CardDescription>Блоков моделей</CardDescription><CardTitle>{session.entries.length}</CardTitle></CardHeader></Card>
                    <Card><CardHeader className="pb-2"><CardDescription>Серийных ШК</CardDescription><CardTitle>{serializedScansCount}</CardTitle></CardHeader></Card>
                    <Card><CardHeader className="pb-2"><CardDescription>Товар количеством</CardDescription><CardTitle>{quantityItemsCount}</CardTitle></CardHeader></Card>
                    <Card><CardHeader className="pb-2"><CardDescription>Конфликтных ШК</CardDescription><CardTitle>{unresolvedConflicts.length}</CardTitle></CardHeader></Card>
                </div>

                <div className="md:hidden sticky bottom-4 z-20">
                    <Card className="border-primary/20 bg-background/95 shadow-xl backdrop-blur">
                        <CardContent className="grid grid-cols-1 gap-3 p-3">
                            <Button
                                variant="outline"
                                className="h-11 justify-center"
                                onClick={() => {
                                    setQuantitySearch("");
                                    setQuantityDialogOpen(true);
                                    sounds.info();
                                }}
                                disabled={processing || session.status !== "IN_PROGRESS"}
                            >
                                <Plus className="mr-2 h-4 w-4" />
                                Добавить количеством
                            </Button>
                            <Button
                                className="h-11 justify-center"
                                onClick={handleApply}
                                disabled={processing || !hasCountedItems || hasUnresolvedConflicts || session.status !== "IN_PROGRESS"}
                            >
                                Занести на склад
                            </Button>
                        </CardContent>
                    </Card>
                </div>

                {hasUnresolvedConflicts && (
                    <Card className="border-amber-500/30 bg-amber-500/5">
                        <CardContent className="flex items-start gap-3 p-4 text-sm">
                            <ShieldAlert className="mt-0.5 h-5 w-5 text-amber-500" />
                            <div>
                                <div className="font-medium text-foreground">Есть неподтвержденные конфликтные ШК</div>
                                <div className="text-muted-foreground">
                                    До завершения первичной инвентаризации нужно подтвердить {unresolvedConflicts.length} конфликтных сканов или удалить их.
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                <Card className={cn("border-2", activeEntry ? "border-primary/40 bg-primary/5" : "border-dashed")}>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <ScanLine className="h-5 w-5" />
                            {activeEntry ? `Активный блок: ${entryLabels[activeEntry.id]}` : "Активный блок не выбран"}
                        </CardTitle>
                        <CardDescription>
                            {activeEntry ? "Все следующие сканы будут добавляться в этот блок." : "Если блок не выбран, следующий скан откроет выбор модели и создаст новый блок."}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-5 p-4 sm:p-6">
                        {activeEntry ? (
                            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                                <div className="flex flex-wrap gap-2">
                                    <Badge variant="outline" className="min-h-8 px-3 text-sm">{activeEntry.product.sku}</Badge>
                                    <Badge variant="secondary" className="min-h-8 px-3 text-sm">{activeEntry.quantity} шт.</Badge>
                                    <Badge variant="outline" className="min-h-8 px-3 text-sm">{activeEntry.product.category?.name || "Без категории"}</Badge>
                                </div>
                                {activeEntry.scans.some((scan) => scan.requiresReview && !scan.reviewedAt) && <Badge variant="warning">Нужен review</Badge>}
                                <Button className="h-12 w-full justify-center px-4 text-sm sm:h-10 sm:w-auto" variant="outline" onClick={() => { setActiveEntryId(null); sounds.warning(); }}>
                                    Остановить сканирование в этот блок
                                </Button>
                            </div>
                        ) : (
                            <div className="text-sm text-muted-foreground">
                                После первого скана можно выбрать модель и продолжить сканировать ее блоком.
                            </div>
                        )}
                        <div className="flex flex-col gap-3 md:flex-row md:items-end">
                            <div className="w-full md:max-w-md">
                                <Label htmlFor="manual-scan" className="mb-2 block text-sm">Ручной ввод ШК</Label>
                                <Input className="h-12 text-base sm:h-10 sm:text-sm" id="manual-scan" value={manualScanCode} onChange={(event) => setManualScanCode(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); void handleManualScanSubmit(); } }} placeholder="Введите или вставьте штрихкод" disabled={processing || session.status !== "IN_PROGRESS"} />
                            </div>
                            <Button className="h-12 w-full justify-center text-sm md:w-auto md:px-6" variant="outline" onClick={() => void handleManualScanSubmit()} disabled={processing || !manualScanCode.trim() || session.status !== "IN_PROGRESS"}>
                                <Barcode className="mr-2 h-4 w-4" />
                                Добавить ШК
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <div className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
                    <div className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Блоки оборудования</CardTitle>
                                <CardDescription>Откройте блок, чтобы досканировать, отредактировать количество или удалить данные.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {session.entries.length === 0 ? (
                                    <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">Пока нет ни одного блока. Начните со сканирования ШК или добавьте товар количеством.</div>
                                ) : (
                                    session.entries.map((entry) => {
                                        const unresolvedEntryConflicts = entry.scans.filter((scan) => scan.requiresReview && !scan.reviewedAt).length;
                                        return (
                                            <button key={entry.id} type="button" onClick={() => selectEntry(entry.id)} className={cn("w-full rounded-xl border p-4 text-left transition-colors min-h-[88px]", activeEntryId === entry.id ? "border-primary bg-primary/5" : "border-border hover:bg-muted/40")}>
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="min-w-0">
                                                        <div className="font-medium">{entryLabels[entry.id]}</div>
                                                        <div className="text-xs text-muted-foreground">{entry.product.sku}</div>
                                                        <div className="text-xs text-muted-foreground">{entry.product.category?.name || "Без категории"}</div>
                                                    </div>
                                                    <Badge variant={entry.product.accountingType === "QUANTITY" ? "secondary" : "outline"}>{entry.quantity} шт.</Badge>
                                                </div>
                                                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                                    {entry.product.accountingType === "QUANTITY" ? <Package2 className="h-3.5 w-3.5" /> : <Barcode className="h-3.5 w-3.5" />}
                                                    <span>{entry.product.accountingType === "QUANTITY" ? "Количественный блок" : `${entry.scans.length} отсканированных ШК`}</span>
                                                    {unresolvedEntryConflicts > 0 && <Badge variant="warning">{unresolvedEntryConflicts} конфликт</Badge>}
                                                </div>
                                            </button>
                                        );
                                    })
                                )}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Проверка перед занесением</CardTitle>
                                <CardDescription>На склад попадут только блоки, где есть хотя бы один скан или ненулевое количество.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {!hasCountedItems ? (
                                    <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">Пока нет данных для занесения.</div>
                                ) : (
                                    countedEntries.map((entry) => (
                                        <div key={entry.id} className="rounded-lg border p-3">
                                            <div className="flex items-start justify-between gap-3">
                                                <div>
                                                    <div className="font-medium">{entryLabels[entry.id]}</div>
                                                    <div className="text-xs text-muted-foreground">{entry.product.category?.name || "Без категории"}</div>
                                                </div>
                                                <Badge variant="outline">{entry.product.accountingType === "QUANTITY" ? `${entry.quantity} шт.` : `${entry.scans.length} ШК`}</Badge>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </CardContent>
                        </Card>

                        {conflictingScans.length > 0 && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>Review конфликтов</CardTitle>
                                    <CardDescription>Подтвердите перенос конфликтных ШК или удалите их из сессии.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    {conflictingScans.map(({ entry, scan }) => (
                                        <div key={scan.id} className="rounded-lg border p-3">
                                            <div className="flex items-start justify-between gap-3">
                                                <div>
                                                    <div className="font-medium">{scan.code}</div>
                                                    <div className="text-xs text-muted-foreground">{entryLabels[entry.id]}</div>
                                                    <div className="text-xs text-muted-foreground">{conflictLabel[scan.conflictType || ""] || "Требует проверки"}</div>
                                                </div>
                                                {scan.reviewedAt ? (
                                                    <Badge variant="success">Подтвержден</Badge>
                                                ) : (
                                                        <Button className="w-full sm:w-auto" size="sm" variant="outline" disabled={processing || session.status !== "IN_PROGRESS"} onClick={() => void handleResolveScanConflict(entry.id, scan.id)}>
                                                            <CheckCircle2 className="mr-2 h-4 w-4" />
                                                            Подтвердить
                                                        </Button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>
                        )}
                    </div>

                    <div className="space-y-6">
                        {session.entries.map((entry) => (
                            <Card key={entry.id} className={cn(activeEntryId === entry.id && "border-primary/40")}>
                                <CardHeader>
                                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                        <div>
                                            <CardTitle className="text-lg">{entryLabels[entry.id]}</CardTitle>
                                            <CardDescription className="mt-1">{entry.product.sku}{entry.product.category ? ` • ${entry.product.category.name}` : ""}</CardDescription>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {entry.product.accountingType !== "QUANTITY" && <Button variant={activeEntryId === entry.id ? "secondary" : "outline"} size="sm" onClick={() => selectEntry(entry.id)}>{activeEntryId === entry.id ? "Активный блок" : "Сканировать сюда"}</Button>}
                                            <Button variant="ghost" size="icon" onClick={() => void handleDeleteEntry(entry.id)} disabled={processing || session.status !== "IN_PROGRESS"}><Trash2 className="h-4 w-4" /></Button>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {entry.product.accountingType === "QUANTITY" ? (
                                        <>
                                            <div className="flex flex-wrap gap-2">
                                                {QUICK_QUANTITY_VALUES.map((value) => <Button key={value} variant="outline" size="sm" disabled={processing || session.status !== "IN_PROGRESS"} onClick={() => setQuantityDrafts((prev) => ({ ...prev, [entry.id]: String((Number(prev[entry.id] ?? entry.quantity) || 0) + value) }))}>+{value}</Button>)}
                                            </div>
                                            <div className="flex flex-col gap-3 md:flex-row md:items-end">
                                                <div className="w-full md:max-w-[200px] space-y-1">
                                                    <Label>Количество</Label>
                                                    <Input type="number" min={0} value={quantityDrafts[entry.id] ?? String(entry.quantity)} disabled={processing || session.status !== "IN_PROGRESS"} onChange={(event) => setQuantityDrafts((prev) => ({ ...prev, [entry.id]: event.target.value }))} />
                                                </div>
                                                <Button variant="outline" onClick={() => void handleSaveQuantity(entry.id)} disabled={processing || session.status !== "IN_PROGRESS"}>Сохранить количество</Button>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="space-y-2">
                                            {entry.scans.length === 0 ? (
                                                <div className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">В этом блоке пока нет ни одного ШК.</div>
                                            ) : (
                                                entry.scans.map((scan) => (
                                                    <div key={scan.id} className="rounded-lg border p-3">
                                                        <div className="flex items-start justify-between gap-3">
                                                            <div>
                                                                <div className="font-mono text-sm">{scan.code}</div>
                                                                {scan.requiresReview && (
                                                                    <div className="mt-2 flex flex-wrap items-center gap-2">
                                                                        <Badge variant={scan.reviewedAt ? "success" : "warning"}>{scan.reviewedAt ? "Подтвержден" : "Нужен review"}</Badge>
                                                                        <span className="text-xs text-muted-foreground">{conflictLabel[scan.conflictType || ""] || "Требует проверки"}</span>
                                                                    </div>
                                                                )}
                                                                {scan.sourceProcessStatus && <div className="mt-1 text-xs text-muted-foreground">Исходный статус: {scan.sourceProcessStatus}</div>}
                                                            </div>
                                                            <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
                                                                {scan.requiresReview && !scan.reviewedAt && <Button className="w-full sm:w-auto" variant="outline" size="sm" disabled={processing || session.status !== "IN_PROGRESS"} onClick={() => void handleResolveScanConflict(entry.id, scan.id)}>Подтвердить</Button>}
                                                                <Button variant="ghost" size="icon" disabled={processing || session.status !== "IN_PROGRESS"} onClick={() => void handleDeleteScan(entry.id, scan.id)}><Trash2 className="h-4 w-4" /></Button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            </div>

            <Dialog open={assignDialogOpen} onOpenChange={(open) => { setAssignDialogOpen(open); if (!open) { setAssignProductId(""); setAssignSearch(""); } }}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>К какой модели привязать ШК?</DialogTitle>
                        <DialogDescription>Отсканирован код <span className="font-mono text-foreground">{pendingScan}</span>. Ниже весь каталог серийных моделей из категорий.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3">
                        <div className="space-y-2">
                            <Label htmlFor="assign-search">Поиск модели</Label>
                            <div className="relative">
                                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input id="assign-search" value={assignSearch} onChange={(event) => setAssignSearch(event.target.value)} placeholder="Название, SKU или категория" className="pl-9" />
                            </div>
                        </div>
                        <div className="max-h-[320px] space-y-3 overflow-y-auto rounded-xl border p-2">
                            {filteredSerialGroups.length === 0 ? (
                                <div className="p-4 text-sm text-muted-foreground">По вашему запросу модели не найдены.</div>
                            ) : (
                                filteredSerialGroups.map((group) => (
                                    <div key={group.category.id} className="space-y-2">
                                        <div className="px-2 pt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                            {group.category.name}
                                        </div>
                                        {group.products.map((product) => (
                                            <button
                                                key={product.id}
                                                type="button"
                                                onClick={() => {
                                                    setAssignProductId(product.id);
                                                    sounds.info();
                                                }}
                                                className={cn(
                                                    "w-full rounded-lg border p-3 text-left transition-colors",
                                                    assignProductId === product.id
                                                        ? "border-primary bg-primary/5"
                                                        : "border-border hover:bg-muted/50",
                                                )}
                                            >
                                                <div className="flex items-start justify-between gap-3">
                                                    <div>
                                                        <div className="font-medium">{product.name}</div>
                                                        <div className="text-xs text-muted-foreground">{product.sku}</div>
                                                    </div>
                                                    <Badge variant="outline">{group.category.name}</Badge>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>Отмена</Button>
                        <Button onClick={() => void handleAssignScannedCode()} disabled={!assignProductId || processing}>Привязать</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={quantityDialogOpen} onOpenChange={(open) => { setQuantityDialogOpen(open); if (!open) { setQuantityProductId(""); setQuantitySearch(""); } }}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Добавить количеством</DialogTitle>
                        <DialogDescription>Используйте этот режим для сопутствующих и других количественных товаров из каталога.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="quantity-search">Поиск модели</Label>
                            <div className="relative">
                                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input id="quantity-search" value={quantitySearch} onChange={(event) => setQuantitySearch(event.target.value)} placeholder="Название, SKU или категория" className="pl-9" />
                            </div>
                        </div>
                        <div className="max-h-[260px] space-y-3 overflow-y-auto rounded-xl border p-2">
                            {filteredQuantityGroups.length === 0 ? (
                                <div className="p-4 text-sm text-muted-foreground">Количественные модели не найдены.</div>
                            ) : (
                                filteredQuantityGroups.map((group) => (
                                    <div key={group.category.id} className="space-y-2">
                                        <div className="px-2 pt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                            {group.category.name}
                                        </div>
                                        {group.products.map((product) => (
                                            <button
                                                key={product.id}
                                                type="button"
                                                onClick={() => {
                                                    setQuantityProductId(product.id);
                                                    sounds.info();
                                                }}
                                                className={cn(
                                                    "w-full rounded-lg border p-3 text-left transition-colors",
                                                    quantityProductId === product.id
                                                        ? "border-primary bg-primary/5"
                                                        : "border-border hover:bg-muted/50",
                                                )}
                                            >
                                                <div className="flex items-start justify-between gap-3">
                                                    <div>
                                                        <div className="font-medium">{product.name}</div>
                                                        <div className="text-xs text-muted-foreground">{product.sku}</div>
                                                    </div>
                                                    <Badge variant="secondary">{group.category.name}</Badge>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                ))
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label>Количество</Label>
                            <div className="flex flex-wrap gap-2">
                                {QUICK_QUANTITY_VALUES.map((value) => <Button key={value} type="button" variant="outline" size="sm" onClick={() => setQuantityValue(String(value))}>{value} шт.</Button>)}
                            </div>
                            <Input type="number" min={1} value={quantityValue} onChange={(event) => setQuantityValue(event.target.value)} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setQuantityDialogOpen(false)}>Отмена</Button>
                        <Button onClick={() => void handleAddQuantityBlock()} disabled={!quantityProductId || processing}>Добавить</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </main>
    );
}
