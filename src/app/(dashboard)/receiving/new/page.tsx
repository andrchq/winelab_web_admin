"use client";

import { useState, useMemo } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { parseInvoiceFile, InvoiceItem } from "@/lib/file-parser";
import { useWarehouses, useProducts } from "@/lib/hooks";
import { receivingService } from "@/lib/receiving-service";
import { useRouter } from "next/navigation";
import { Loader2, ArrowRight, Upload, Check, AlertTriangle, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { ManualInvoiceDialog } from "@/components/receiving/ManualInvoiceDialog";
import { PlusCircle } from "lucide-react";

export default function NewReceivingPage() {
    const router = useRouter();
    const { data: warehouses, isLoading: isWarehousesLoading } = useWarehouses();
    const { data: products, isLoading: isProductsLoading } = useProducts();

    const [step, setStep] = useState<"upload" | "mapping" | "review">("upload");
    const [warehouseId, setWarehouseId] = useState<string>("");
    const [file, setFile] = useState<File | null>(null);
    const [parsedItems, setParsedItems] = useState<InvoiceItem[]>([]);
    const [isParsing, setIsParsing] = useState(false);
    const [isManualDialogOpen, setIsManualDialogOpen] = useState(false);
    const [supplier, setSupplier] = useState<string>("");
    const [creationMethod, setCreationMethod] = useState<'file' | 'manual'>('file');

    // Mapping: invoiceItemId -> productId
    const [mapping, setMapping] = useState<Record<string, string>>({});

    // Step 1: Handle File Upload
    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (!selectedFile) return;
        setFile(selectedFile);
        setCreationMethod('file');
        setSupplier("");
        setIsParsing(true);
        try {
            const items = await parseInvoiceFile(selectedFile);
            setParsedItems(items);

            // Auto-mapping attempt
            if (products) {
                const newMapping: Record<string, string> = {};
                items.forEach(item => {
                    const match = products.find(p =>
                        p.name.toLowerCase() === item.originalName.toLowerCase() ||
                        p.sku.toLowerCase() === item.sku?.toLowerCase() ||
                        p.name.toLowerCase().includes(item.originalName.toLowerCase())
                    );
                    if (match) {
                        newMapping[item.id] = match.id;
                    }
                });
                setMapping(newMapping);
            }
            toast.success(`Файл загружен: найдено ${items.length} позиций`);
        } catch (error) {
            console.error(error);
            toast.error("Ошибка при чтении файла");
            setFile(null);
        } finally {
            setIsParsing(false);
        }
    };

    const handleContinueToMapping = () => {
        if (!warehouseId) {
            toast.error("Выберите склад");
            return;
        }
        if (parsedItems.length === 0) {
            toast.error("Список товаров пуст");
            return;
        }
        setStep("mapping");
    };

    // Step 2: Mapping Logic
    const handleProductSelect = (itemId: string, productId: string) => {
        setMapping(prev => ({ ...prev, [itemId]: productId }));
    };

    const mappedCount = parsedItems.filter(item => mapping[item.id]).length;
    const progress = Math.round((mappedCount / parsedItems.length) * 100);

    const handleContinueToReview = () => {
        setStep("review");
    };

    // Step 3: Create Session (Mock)
    const handleCreateSession = async () => {
        try {
            const session = await receivingService.create({
                warehouseId,
                items: parsedItems,
                mapping,
                invoiceNumber: creationMethod === 'file' ? file?.name : undefined,
                supplier: supplier, // Pass supplier
                type: creationMethod
            });
            toast.success("Сессия приемки создана");
            router.push(`/receiving/${session.id}`);
        } catch (e) {
            console.error(e);
            toast.error("Ошибка при создании сессии");
        }
    };
    const handleManualSubmit = (items: InvoiceItem[], manualMapping: Record<string, string>, source: string) => {
        setParsedItems(items);
        setMapping(manualMapping);
        setSupplier(source); // Capture supplier from manual dialog
        setCreationMethod('manual');

        // Use a dummy file object so the rest of the UI thinks a file is loaded (for steps logic)
        // Or better, adjust the logic to not strictly require 'file' if parsedItems exist
        // But for minimal friction, let's inject a "virtual" file
        const virtualFile = new File([""], `Manual_Invoice_${source.replace(/[^a-z0-9]/gi, '_')}.json`, { type: "application/json" });
        setFile(virtualFile);

        toast.success(`Список сформирован: ${items.length} позиций`);
        // Go straight to mapping (which will be auto-completed) or review
        // Since we mapped everything manually, let's go to Review to be safe and clear
        setStep("review");
    };

    return (
        <div className="h-full bg-background p-2 md:p-6">
            <div className="max-w-4xl mx-auto space-y-4 md:space-y-6">

                {/* Stepper */}
                <div className="flex items-center justify-between mb-4 md:mb-8">
                    <div className="flex items-center gap-2 md:gap-4 w-full text-xs md:text-base">
                        <div className={`flex items-center gap-1 md:gap-2 ${step === 'upload' ? 'text-primary font-bold' : 'text-muted-foreground'}`}>
                            <div className={`w-6 h-6 md:w-8 md:h-8 rounded-full flex items-center justify-center border ${step === 'upload' ? 'border-primary bg-primary/10' : 'border-border'}`}>1</div>
                            <span className="hidden sm:inline">Загрузка</span>
                        </div>
                        <div className="h-[1px] bg-border flex-1" />
                        <div className={`flex items-center gap-1 md:gap-2 ${step === 'mapping' ? 'text-primary font-bold' : 'text-muted-foreground'}`}>
                            <div className={`w-6 h-6 md:w-8 md:h-8 rounded-full flex items-center justify-center border ${step === 'mapping' ? 'border-primary bg-primary/10' : 'border-border'}`}>2</div>
                            <span className="hidden sm:inline">Маппинг</span>
                        </div>
                        <div className="h-[1px] bg-border flex-1" />
                        <div className={`flex items-center gap-1 md:gap-2 ${step === 'review' ? 'text-primary font-bold' : 'text-muted-foreground'}`}>
                            <div className={`w-6 h-6 md:w-8 md:h-8 rounded-full flex items-center justify-center border ${step === 'review' ? 'border-primary bg-primary/10' : 'border-border'}`}>3</div>
                            <span className="hidden sm:inline">Проверка</span>
                        </div>
                    </div>
                </div>

                {step === "upload" && (
                    <Card className="border-0 shadow-none md:border md:shadow-sm">
                        <CardHeader className="px-2 md:px-6">
                            <CardTitle>Новая приемка</CardTitle>
                            <CardDescription>Загрузите накладную и выберите склад для начала.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4 md:space-y-6 px-2 md:px-6">
                            <div className="space-y-2">
                                <Label>Склад приемки</Label>
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
                                <Label>Файл накладной (Excel, CSV, JSON)</Label>
                                <div className="border-2 border-dashed border-input hover:border-primary/50 transition-colors rounded-lg p-4 md:p-8 flex flex-col items-center justify-center gap-4 bg-muted/20">
                                    {file ? (
                                        <div className="flex items-center gap-4">
                                            <FileSpreadsheet className="h-10 w-10 text-green-600" />
                                            <div className="text-center">
                                                <div className="font-medium">{file.name}</div>
                                                <div className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</div>
                                            </div>
                                            <Button variant="ghost" size="sm" onClick={() => { setFile(null); setParsedItems([]); }}>
                                                Сменить
                                            </Button>
                                        </div>
                                    ) : (
                                        <>
                                            <Upload className="h-10 w-10 text-muted-foreground" />
                                            <div className="text-center">
                                                <div className="font-medium">Перетащите файл сюда или нажмите для выбора</div>
                                                <div className="text-xs text-muted-foreground mt-1">Поддерживаются .xlsx, .csv, .json</div>
                                            </div>
                                            <Input
                                                type="file"
                                                className="hidden"
                                                id="file-upload"
                                                accept=".xlsx,.xls,.csv,.json,.txt"
                                                onChange={handleFileChange}
                                            />
                                            <Button variant="outline" onClick={() => document.getElementById('file-upload')?.click()}>
                                                Выбрать файл
                                            </Button>
                                        </>
                                    )}
                                </div>
                            </div>

                            <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                    <span className="w-full border-t" />
                                </div>
                                <div className="relative flex justify-center text-xs uppercase">
                                    <span className="bg-background px-2 text-muted-foreground">Или</span>
                                </div>
                            </div>

                            <Button
                                variant="secondary"
                                className="w-full h-12 dashed border-2"
                                onClick={() => setIsManualDialogOpen(true)}
                                disabled={!warehouseId}
                                title={!warehouseId ? "Сначала выберите склад" : ""}
                            >
                                <PlusCircle className="mr-2 h-5 w-5" />
                                Создать накладную вручную
                            </Button>

                            {parsedItems.length > 0 && (
                                <div className="rounded-md border p-4 bg-card/50">
                                    <div className="text-sm font-medium mb-2 flex items-center gap-2">
                                        <Check className="h-4 w-4 text-green-500" />
                                        Распознано позиций: {parsedItems.length}
                                    </div>
                                    <div className="text-xs text-muted-foreground max-h-[100px] overflow-y-auto">
                                        {parsedItems.slice(0, 5).map((item, i) => (
                                            <div key={i} className="flex justify-between py-1 border-b last:border-0 border-border/50">
                                                <span>{item.originalName}</span>
                                                <span className="font-mono">{item.quantity} шт</span>
                                            </div>
                                        ))}
                                        {parsedItems.length > 5 && <div className="pt-1 italic">...и еще {parsedItems.length - 5}</div>}
                                    </div>
                                </div>
                            )}
                        </CardContent>
                        <CardFooter>
                            <Button className="w-full" onClick={handleContinueToMapping} disabled={!warehouseId || !file || parsedItems.length === 0}>
                                Продолжить <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        </CardFooter>
                    </Card>
                )}

                {step === "mapping" && (
                    <Card className="flex flex-col h-[calc(100vh-200px)]">
                        <CardHeader>
                            <CardTitle>Сопоставление товаров</CardTitle>
                            <CardDescription>
                                Свяжите позиции из накладной с товарами в каталоге.
                                <div className="mt-2 flex items-center gap-2">
                                    <div className="h-2 flex-1 bg-secondary rounded-full overflow-hidden">
                                        <div className="h-full bg-primary transition-all duration-300" style={{ width: `${progress}%` }} />
                                    </div>
                                    <span className="text-xs font-mono">{progress}%</span>
                                </div>
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="flex-1 overflow-hidden p-0">
                            <div className="h-full overflow-y-auto p-6 space-y-4">
                                {parsedItems.map((item) => {
                                    const isMapped = !!mapping[item.id];
                                    return (
                                        <div key={item.id} className={`p-4 rounded-lg border flex flex-col gap-3 transition-colors ${isMapped ? 'bg-background/50 border-border' : 'bg-orange-500/5 border-orange-200'}`}>
                                            <div className="flex justify-between items-start">
                                                <div className="font-medium text-sm">{item.originalName}</div>
                                                <Badge variant="outline">{item.quantity} шт</Badge>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="flex-1">
                                                    <Select
                                                        value={mapping[item.id] || "unmapped"}
                                                        onValueChange={(val: string) => handleProductSelect(item.id, val)}
                                                    >
                                                        <SelectTrigger className={!isMapped ? "border-orange-300 ring-orange-200" : ""}>
                                                            <SelectValue placeholder="Выберите товар из каталога..." />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="unmapped" disabled>Не выбрано</SelectItem>
                                                            {products?.map(p => (
                                                                <SelectItem key={p.id} value={p.id}>{p.name} ({p.sku})</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                {isMapped ? (
                                                    <Check className="h-5 w-5 text-green-500" />
                                                ) : (
                                                    <AlertTriangle className="h-5 w-5 text-orange-400" />
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </CardContent>
                        <CardFooter className="border-t pt-4">
                            <div className="flex justify-between w-full gap-4">
                                <Button variant="outline" onClick={() => setStep('upload')}>Назад</Button>
                                <Button onClick={handleContinueToReview} disabled={mappedCount === 0}>
                                    {mappedCount < parsedItems.length ? `Продолжить с ${parsedItems.length - mappedCount} нецелевыми?` : "Продолжить"}
                                </Button>
                            </div>
                        </CardFooter>
                    </Card>
                )}

                {step === "review" && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Проверка данных</CardTitle>
                            <CardDescription>Перед созданием сессии убедитесь в правильности данных.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 rounded-lg border bg-muted/20">
                                    <div className="text-sm text-muted-foreground">Склад</div>
                                    <div className="font-medium text-lg">{warehouses?.find(w => w.id === warehouseId)?.name || "Неизвестно"}</div>
                                </div>
                                <div className="p-4 rounded-lg border bg-muted/20">
                                    <div className="text-sm text-muted-foreground">Всего позиций</div>
                                    <div className="font-medium text-lg">{parsedItems.length}</div>
                                </div>
                                <div className="p-4 rounded-lg border bg-muted/20">
                                    <div className="text-sm text-muted-foreground">Сопоставлено</div>
                                    <div className="font-medium text-lg text-green-600">{mappedCount}</div>
                                </div>
                                <div className="p-4 rounded-lg border bg-muted/20">
                                    <div className="text-sm text-muted-foreground">Без привязки</div>
                                    <div className="font-medium text-lg text-orange-600">{parsedItems.length - mappedCount}</div>
                                </div>
                            </div>

                            {parsedItems.length - mappedCount > 0 && (
                                <div className="bg-orange-50 text-orange-800 p-4 rounded-lg text-sm flex gap-2 items-start">
                                    <AlertTriangle className="h-5 w-5 shrink-0" />
                                    <div>
                                        Внимание: {parsedItems.length - mappedCount} позиций не привязаны к товарам каталога.
                                        Вы сможете привязать их вручную в процессе приемки, или они будут пропущены.
                                    </div>
                                </div>
                            )}
                        </CardContent>
                        <CardFooter className="flex justify-between gap-4">
                            <Button variant="outline" onClick={() => setStep('mapping')}>Назад</Button>
                            <Button className="w-full" onClick={handleCreateSession}>
                                <Check className="mr-2 h-4 w-4" />
                                Создать сессию приемки
                            </Button>
                        </CardFooter>
                    </Card>
                )}

            </div>

            <ManualInvoiceDialog
                open={isManualDialogOpen}
                onOpenChange={setIsManualDialogOpen}
                onSubmit={handleManualSubmit}
            />
        </div >
    );
}
