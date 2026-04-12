"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useProducts, useRequest, useStores, useWarehouses } from "@/lib/hooks";
import { Truck, FileText, Upload, Check, X, Loader2, Info, ChevronRight, ChevronsUpDown, Plus, MapPin, Package, CheckCircle2 } from "lucide-react";
import { SHIPPING_FILES, parseShippingFile, InvoiceItem } from "@/lib/file-parser";
import { toast } from "sonner";
import { shippingService } from "@/lib/shipping-service";
import { useRouter, useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type Step = "setup" | "mapping" | "review";

function getShortRequestNumber(value?: string | null) {
    return typeof value === "string" && value.length > 0 ? value.slice(0, 8) : "";
}

export default function NewShipmentPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { data: warehouses } = useWarehouses();
    const { data: stores } = useStores();
    const { data: products } = useProducts();
    const requestId = searchParams.get("requestId") || "";
    const presetStoreId = searchParams.get("storeId") || "";
    const { data: request } = useRequest(requestId);

    const [step, setStep] = useState<Step>("setup");

    // Step 1: Setup
    const [warehouseId, setWarehouseId] = useState("");
    const [destinationType, setDestinationType] = useState<"store" | "warehouse" | "other">("store");
    const [destinationId, setDestinationId] = useState(presetStoreId);
    const [manualDestination, setManualDestination] = useState(""); // For "other" type
    const [requestNumber, setRequestNumber] = useState(getShortRequestNumber(requestId));
    const [openStoreCombobox, setOpenStoreCombobox] = useState(false);

    // File Upload
    const [file, setFile] = useState<File | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    // Step 2: Mapping
    const [parsedItems, setParsedItems] = useState<InvoiceItem[]>([]);
    const [mappings, setMappings] = useState<Record<string, string>>({}); // originalName -> productId

    useEffect(() => {
        if (!request) return;

        if (request.storeId) {
            setDestinationType("store");
            setDestinationId(request.storeId);
        }

        setRequestNumber(getShortRequestNumber(request.id));

        if (!request.items?.length) {
            return;
        }

        const groupedItems = request.items.reduce((acc, item) => {
            const productId = item.asset?.product?.id;
            const originalName = item.asset?.product?.name;
            const sku = item.asset?.product?.sku || "";

            if (!productId || !originalName) {
                return acc;
            }

            const existing = acc.find((entry) => entry.productId === productId);
            if (existing) {
                existing.quantity += 1;
                return acc;
            }

            acc.push({
                productId,
                originalName,
                sku,
                quantity: 1,
            });
            return acc;
        }, [] as { productId: string; originalName: string; sku: string; quantity: number }[]);

        setParsedItems(
            groupedItems.map((item, index) => ({
                id: `request-item-${index}`,
                originalName: item.originalName,
                quantity: item.quantity,
                sku: item.sku,
            })),
        );

        setMappings(
            groupedItems.reduce((acc, item) => {
                acc[item.originalName] = item.productId;
                return acc;
            }, {} as Record<string, string>),
        );
    }, [request]);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setFile(file);
    };

    const handleNext = async () => {
        if (step === "setup") {
            if (!warehouseId) {
                toast.error("Р’С‹Р±РµСЂРёС‚Рµ СЃРєР»Р°Рґ РѕС‚РїСЂР°РІРёС‚РµР»СЊ");
                return;
            }
            if (!destinationType) {
                toast.error("Р’С‹Р±РµСЂРёС‚Рµ С‚РёРї РїРѕР»СѓС‡Р°С‚РµР»СЏ");
                return;
            }
            if (destinationType === 'store' && !destinationId) {
                toast.error("Р’С‹Р±РµСЂРёС‚Рµ РјР°РіР°Р·РёРЅ");
                return;
            }
            if (destinationType === 'warehouse' && !destinationId) {
                toast.error("Р’С‹Р±РµСЂРёС‚Рµ СЃРєР»Р°Рґ РїРѕР»СѓС‡Р°С‚РµР»СЊ");
                return;
            }
            if (destinationType === 'other' && !manualDestination) {
                toast.error("РЈРєР°Р¶РёС‚Рµ РїРѕР»СѓС‡Р°С‚РµР»СЏ");
                return;
            }

            if (file) {
                setIsProcessing(true);
                try {
                    const items = await parseShippingFile(file);
                    setParsedItems(items);

                    // Auto-mapping
                    const newMappings: Record<string, string> = {};
                    items.forEach(item => {
                        // 1. Try exact SKU match
                        if (item.sku) {
                            const exactSku = products?.find(p => p.sku === item.sku);
                            if (exactSku) {
                                newMappings[item.originalName] = exactSku.id;
                                return;
                            }
                        }
                        // 2. Try exact name match
                        const exactName = products?.find(p => p.name.toLowerCase() === item.originalName.toLowerCase());
                        if (exactName) {
                            newMappings[item.originalName] = exactName.id;
                        }
                    });
                    setMappings(newMappings);
                    setStep("mapping");
                } catch (e) {
                    const errorMessage = e instanceof Error ? e.message : "Не удалось прочитать файл";
                    toast.error(`Ошибка чтения файла: ${errorMessage}`);
                    setFile(null);
                } finally {
                    setIsProcessing(false);
                }
            } else {
                // If no file, go straight to creation (manual mode)
                handleCreateManual();
            }
        } else if (step === "mapping") {
            // Check if there are unmapped items
            const unmappedCount = parsedItems.length - Object.keys(mappings).length;
            if (unmappedCount > 0) {
                if (!confirm(`РЈ РІР°СЃ РѕСЃС‚Р°Р»РѕСЃСЊ ${unmappedCount} РЅРµСЂР°СЃРїРѕР·РЅР°РЅРЅС‹С… РїРѕР·РёС†РёР№. РћРЅРё Р±СѓРґСѓС‚ РїСЂРѕРїСѓС‰РµРЅС‹. РџСЂРѕРґРѕР»Р¶РёС‚СЊ?`)) {
                    return;
                }
            }
            setStep("review");
        }
    };

    const handleCancel = () => {
        router.push('/shipments');
    };

    const getDestinationName = () => {
        if (destinationType === 'store') return stores?.find(s => s.id === destinationId)?.name || 'РњР°РіР°Р·РёРЅ';
        if (destinationType === 'warehouse') return warehouses?.find(w => w.id === destinationId)?.name || 'РЎРєР»Р°Рґ';
        return manualDestination;
    };

    const handleCreateManual = async () => {
        try {
            const requestItems = request?.items?.reduce((acc, item) => {
                const productId = item.asset?.product?.id;
                const originalName = item.asset?.product?.name;
                const sku = item.asset?.product?.sku || "";

                if (!productId || !originalName) {
                    return acc;
                }

                const existing = acc.find((entry) => entry.productId === productId);
                if (existing) {
                    existing.quantity += 1;
                    existing.expectedQuantity += 1;
                    return acc;
                }

                acc.push({
                    id: `${productId}-${acc.length}`,
                    productId,
                    quantity: 1,
                    expectedQuantity: 1,
                    scannedQuantity: 0,
                    originalName,
                    sku,
                    scans: [],
                });
                return acc;
            }, [] as {
                id: string;
                productId: string;
                quantity: number;
                expectedQuantity: number;
                scannedQuantity: number;
                originalName: string;
                sku: string;
                scans: never[];
            }[]) || [];

            const session = await shippingService.create({
                requestId: request?.id,
                warehouseId,
                destination: getDestinationName(),
                destinationType,
                destinationId: destinationType !== 'other' ? destinationId : undefined,
                items: requestItems,
                requestNumber: requestNumber || undefined,
                invoiceNumber: undefined,
                type: 'manual'
            });
            toast.success("РЎРµСЃСЃРёСЏ РѕС‚РіСЂСѓР·РєРё СЃРѕР·РґР°РЅР°");
            router.push(`/shipments/${session.id}`);
        } catch (e) {
            console.error(e);
            toast.error("РћС€РёР±РєР° РїСЂРё СЃРѕР·РґР°РЅРёРё СЃРµСЃСЃРёРё");
        }
    };

    const handleFinish = async () => {
        try {
            const itemsForSession = parsedItems
                .filter(item => mappings[item.originalName])
                .map(item => {
                    const productId = mappings[item.originalName];
                    const product = products?.find(p => p.id === productId);
                    return {
                        id: Math.random().toString(36).substr(2, 9),
                        productId,
                        quantity: item.quantity,
                        expectedQuantity: item.quantity,
                        scannedQuantity: 0,
                        originalName: item.originalName,
                        sku: product?.sku || item.sku || '',
                        scans: []
                    };
                });

            const session = await shippingService.create({
                requestId: request?.id,
                warehouseId,
                destination: getDestinationName(),
                destinationType,
                destinationId: destinationType !== 'other' ? destinationId : undefined,
                items: itemsForSession,
                requestNumber: requestNumber || undefined,
                invoiceNumber: file?.name,
                type: 'file'
            });
            toast.success("РЎРµСЃСЃРёСЏ РѕС‚РіСЂСѓР·РєРё СЃРѕР·РґР°РЅР°");
            router.push(`/shipments/${session.id}`);
        } catch (e) {
            console.error(e);
            toast.error("РћС€РёР±РєР° РїСЂРё СЃРѕР·РґР°РЅРёРё СЃРµСЃСЃРёРё");
        }
    };

    const isFormValid = useMemo(() => {
        if (!warehouseId) return false;
        if (!destinationType) return false;

        if (destinationType === 'store' && !destinationId) return false;
        if (destinationType === 'warehouse' && !destinationId) return false;
        if (destinationType === 'other' && !manualDestination) return false;

        return true;
    }, [warehouseId, destinationType, destinationId, manualDestination]);

    return (
        <div className="h-full bg-background p-2 md:p-6">
            <div className="max-w-4xl mx-auto space-y-4 md:space-y-6">

                {/* Stepper */}
                <div className="flex items-center justify-between mb-4 md:mb-8">
                    <div className="flex items-center gap-2 md:gap-4 w-full text-xs md:text-base">
                        <div className={`flex items-center gap-1 md:gap-2 ${step === 'setup' ? 'text-primary font-bold' : 'text-green-600'}`}>
                            <div className={`w-6 h-6 md:w-8 md:h-8 rounded-full flex items-center justify-center border ${step === 'setup' ? 'border-primary bg-primary/10' : 'border-green-500 bg-green-500/10'}`}>
                                {step !== 'setup' ? <Check className="h-3 w-3" /> : '1'}
                            </div>
                            <span className="hidden sm:inline">РќР°СЃС‚СЂРѕР№РєР°</span>
                        </div>
                        <div className="h-[1px] bg-border flex-1" />
                        <div className={`flex items-center gap-1 md:gap-2 ${step === 'mapping' ? 'text-primary font-bold' : step === 'review' ? 'text-green-600' : 'text-muted-foreground'}`}>
                            <div className={`w-6 h-6 md:w-8 md:h-8 rounded-full flex items-center justify-center border ${step === 'mapping' ? 'border-primary bg-primary/10' : step === 'review' ? 'border-green-500 bg-green-500/10' : 'border-border'}`}>
                                {step === 'review' ? <Check className="h-3 w-3" /> : '2'}
                            </div>
                            <span className="hidden sm:inline">РњР°РїРїРёРЅРі</span>
                        </div>
                        <div className="h-[1px] bg-border flex-1" />
                        <div className={`flex items-center gap-1 md:gap-2 ${step === 'review' ? 'text-primary font-bold' : 'text-muted-foreground'}`}>
                            <div className={`w-6 h-6 md:w-8 md:h-8 rounded-full flex items-center justify-center border ${step === 'review' ? 'border-primary bg-primary/10' : 'border-border'}`}>3</div>
                            <span className="hidden sm:inline">РџСЂРѕРІРµСЂРєР°</span>
                        </div>
                    </div>
                </div>

                {/* Step 1: Setup */}
                {step === "setup" && (
                    <Card className="border-0 shadow-none md:border md:shadow-sm">
                        <CardHeader className="px-2 md:px-6">
                            <CardTitle className="flex items-center gap-2">
                                <Truck className="h-5 w-5 text-primary" />
                                РќРѕРІР°СЏ РѕС‚РіСЂСѓР·РєР°
                            </CardTitle>
                            <CardDescription>Р’С‹Р±РµСЂРёС‚Рµ СЃРєР»Р°Рґ, РїРѕР»СѓС‡Р°С‚РµР»СЏ Рё Р·Р°РіСЂСѓР·РёС‚Рµ Р·Р°СЏРІРєСѓ РёР»Рё СЃРѕР·РґР°Р№С‚Рµ Р±РµР· С„Р°Р№Р»Р°.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4 md:space-y-6 px-2 md:px-6">
                            {/* Warehouse */}
                            <div className="space-y-2">
                                <Label>РЎРєР»Р°Рґ РѕС‚РїСЂР°РІРёС‚РµР»СЊ</Label>
                                <Select value={warehouseId} onValueChange={setWarehouseId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Р’С‹Р±РµСЂРёС‚Рµ СЃРєР»Р°Рґ" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {warehouses?.map(w => (
                                            <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Destination Type */}
                            <div className="space-y-2">
                                <Label>РўРёРї РїРѕР»СѓС‡Р°С‚РµР»СЏ</Label>
                                <Select value={destinationType} onValueChange={(v: "store" | "warehouse" | "other") => {
                                    setDestinationType(v);
                                    setDestinationId(v === "store" && request?.storeId ? request.storeId : "");
                                    setManualDestination("");
                                }}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="store">РњР°РіР°Р·РёРЅ</SelectItem>
                                        <SelectItem value="warehouse">Р”СЂСѓРіРѕР№ СЃРєР»Р°Рґ</SelectItem>
                                        <SelectItem value="other">Р”СЂСѓРіРѕРµ</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Destination Selection */}
                            {destinationType === 'store' && (
                                <div className="space-y-2">
                                    <Label>РњР°РіР°Р·РёРЅ</Label>
                                    <Popover open={openStoreCombobox} onOpenChange={setOpenStoreCombobox}>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant="outline"
                                                role="combobox"
                                                aria-expanded={openStoreCombobox}
                                                className="w-full justify-between font-normal text-left h-10 px-3"
                                            >
                                                {destinationId
                                                    ? stores?.find((store) => store.id === destinationId)?.name
                                                    : "Р’С‹Р±РµСЂРёС‚Рµ РјР°РіР°Р·РёРЅ..."}
                                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                                            <Command>
                                                <CommandInput placeholder="РџРѕРёСЃРє РјР°РіР°Р·РёРЅР° (РЅР°Р·РІР°РЅРёРµ РёР»Рё РЅРѕРјРµСЂ)..." />
                                                <CommandList>
                                                    <CommandEmpty>РњР°РіР°Р·РёРЅ РЅРµ РЅР°Р№РґРµРЅ.</CommandEmpty>
                                                    <CommandGroup>
                                                        {stores?.map((store) => (
                                                            <CommandItem
                                                                key={store.id}
                                                                value={`${store.name} ${store.id}`} // Search by both name and id (if needed) or just name if it contains number
                                                                onSelect={() => {
                                                                    setDestinationId(store.id);
                                                                    setOpenStoreCombobox(false);
                                                                }}
                                                            >
                                                                <Check
                                                                    className={cn(
                                                                        "mr-2 h-4 w-4",
                                                                        destinationId === store.id ? "opacity-100" : "opacity-0"
                                                                    )}
                                                                />
                                                                {store.name}
                                                            </CommandItem>
                                                        ))}
                                                    </CommandGroup>
                                                </CommandList>
                                            </Command>
                                        </PopoverContent>
                                    </Popover>
                                </div>
                            )}

                            {destinationType === 'warehouse' && (
                                <div className="space-y-2">
                                    <Label>РЎРєР»Р°Рґ РїРѕР»СѓС‡Р°С‚РµР»СЊ</Label>
                                    <Select value={destinationId} onValueChange={setDestinationId}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Р’С‹Р±РµСЂРёС‚Рµ СЃРєР»Р°Рґ" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {warehouses?.filter(w => w.id !== warehouseId).map(w => (
                                                <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}

                            {destinationType === 'other' && (
                                <div className="space-y-2">
                                    <Label>РќР°Р·РІР°РЅРёРµ РїРѕР»СѓС‡Р°С‚РµР»СЏ</Label>
                                    <Input
                                        placeholder="РќР°РїСЂРёРјРµСЂ: РћС„РёСЃ"
                                        value={manualDestination}
                                        onChange={e => setManualDestination(e.target.value)}
                                    />
                                </div>
                            )}

                            {/* Request Number */}
                            <div className="space-y-2">
                                <Label>РќРѕРјРµСЂ Р·Р°СЏРІРєРё (РЅРµРѕР±СЏР·Р°С‚РµР»СЊРЅРѕ)</Label>
                                <Input
                                    placeholder="РќР°РїСЂРёРјРµСЂ, REQ-12345"
                                    value={requestNumber}
                                    onChange={e => setRequestNumber(e.target.value)}
                                    disabled={Boolean(requestId)}
                                />
                            </div>

                            {/* File Upload */}
                            <div className="space-y-2 pt-2 md:pt-4 border-t">
                                <Label className="text-base font-medium">Р¤Р°Р№Р» Р·Р°СЏРІРєРё</Label>
                                <div className="border-2 border-dashed rounded-xl p-4 md:p-8 text-center hover:bg-muted/50 transition-colors relative">
                                    <input
                                        type="file"
                                        accept={SHIPPING_FILES}
                                        onChange={handleFileUpload}
                                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                    />
                                    <div className="flex flex-col items-center gap-2 md:gap-3 pointer-events-none">
                                        <div className="p-3 md:p-4 rounded-full bg-primary/10 text-primary">
                                            <Upload className="h-6 w-6 md:h-8 md:w-8" />
                                        </div>
                                        <div className="text-sm md:text-base font-medium">
                                            {file ? file.name : "РќР°Р¶РјРёС‚Рµ РґР»СЏ Р·Р°РіСЂСѓР·РєРё С„Р°Р№Р»Р°"}
                                        </div>
                                        {!file && (
                                            <div className="text-xs md:text-sm text-muted-foreground">
                                                Excel, CSV РёР»Рё JSON
                                            </div>
                                        )}
                                    </div>
                                    {file && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="absolute top-2 right-2 z-10 hover:text-destructive"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                e.preventDefault();
                                                setFile(null);
                                            }}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter className="px-2 md:px-6 flex flex-col md:flex-row gap-3">
                            <Button
                                className="w-full md:w-auto h-10 md:h-12 order-3 md:order-1"
                                variant="ghost"
                                onClick={handleCancel}
                            >
                                РћС‚РјРµРЅР°
                            </Button>
                            <Button
                                className="w-full md:w-1/2 h-10 md:h-12 order-2"
                                variant="outline"
                                onClick={handleCreateManual}
                                disabled={isProcessing || !isFormValid}
                            >
                                <Plus className="mr-2 h-4 w-4" />
                                РћС„РѕСЂРјРёС‚СЊ Р±РµР· С„Р°Р№Р»Р°
                            </Button>
                            <Button
                                className="w-full md:w-1/2 h-10 md:h-12 order-1 md:order-3"
                                onClick={handleNext}
                                disabled={isProcessing || !isFormValid}
                            >
                                {isProcessing ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        РћР±СЂР°Р±РѕС‚РєР°...
                                    </>
                                ) : (
                                    <>
                                        Р”Р°Р»РµРµ
                                        <ChevronRight className="ml-2 h-4 w-4" />
                                    </>
                                )}
                            </Button>
                        </CardFooter>
                    </Card>
                )}

                {/* Step 2: Mapping */}
                {step === "mapping" && (
                    <Card className="border-0 shadow-none md:border md:shadow-sm">
                        <CardHeader className="px-2 md:px-6">
                            <CardTitle>РЎРѕРїРѕСЃС‚Р°РІР»РµРЅРёРµ С‚РѕРІР°СЂРѕРІ</CardTitle>
                            <CardDescription>
                                РњС‹ РЅР°С€Р»Рё {parsedItems.length} РїРѕР·РёС†РёР№. РџРѕР¶Р°Р»СѓР№СЃС‚Р°, СЃРѕРїРѕСЃС‚Р°РІСЊС‚Рµ РёС… СЃ РєР°С‚Р°Р»РѕРіРѕРј.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4 px-2 md:px-6">
                            <div className="hidden md:grid grid-cols-12 gap-4 text-sm font-medium text-muted-foreground pb-2 border-b">
                                <div className="col-span-5">РР· С„Р°Р№Р»Р°</div>
                                <div className="col-span-2 text-center">РљРѕР»-РІРѕ</div>
                                <div className="col-span-5">Р’ РєР°С‚Р°Р»РѕРіРµ</div>
                            </div>

                            <div className="space-y-4 md:space-y-2 max-h-[60vh] overflow-y-auto pr-2">
                                {parsedItems.map((item, i) => {
                                    const isMapped = !!mappings[item.originalName];
                                    return (
                                        <div key={i} className={`flex flex-col md:grid md:grid-cols-12 gap-2 md:gap-4 p-3 rounded-lg border ${!isMapped ? 'bg-orange-50/50 border-orange-200 dark:bg-orange-950/20 dark:border-orange-800' : 'bg-card'}`}>
                                            <div className="col-span-5 flex flex-col justify-center">
                                                <div className="font-medium text-sm">{item.originalName}</div>
                                                {item.sku && <div className="text-xs text-muted-foreground font-mono">{item.sku}</div>}
                                            </div>
                                            <div className="col-span-2 flex items-center justify-between md:justify-center border-t md:border-0 pt-2 md:pt-0">
                                                <span className="md:hidden text-xs text-muted-foreground">РљРѕР»-РІРѕ:</span>
                                                <Badge variant="secondary">{item.quantity} С€С‚</Badge>
                                            </div>
                                            <div className="col-span-5 pt-2 md:pt-0">
                                                <Select
                                                    value={mappings[item.originalName] || ""}
                                                    onValueChange={(val) => setMappings(prev => ({ ...prev, [item.originalName]: val }))}
                                                >
                                                    <SelectTrigger className={`h-9 ${!isMapped ? 'border-orange-300 dark:border-orange-700' : 'border-green-200 dark:border-green-800'}`}>
                                                        <SelectValue placeholder="Р’С‹Р±РµСЂРёС‚Рµ С‚РѕРІР°СЂ..." />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {products?.map(p => (
                                                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </CardContent>
                        <CardFooter className="px-2 md:px-6 flex justify-between">
                            <Button variant="ghost" onClick={() => setStep("setup")}>РќР°Р·Р°Рґ</Button>
                            <Button onClick={handleNext}>
                                Р”Р°Р»РµРµ <ChevronRight className="ml-2 h-4 w-4" />
                            </Button>
                        </CardFooter>
                    </Card>
                )}

                {/* Step 3: Review */}
                {step === "review" && (
                    <Card className="border-0 shadow-none md:border md:shadow-sm">
                        <CardHeader className="px-2 md:px-6">
                            <CardTitle>РџСЂРѕРІРµСЂРєР° РґР°РЅРЅС‹С…</CardTitle>
                            <CardDescription>РџСЂРѕРІРµСЂСЊС‚Рµ РёРЅС„РѕСЂРјР°С†РёСЋ РїРµСЂРµРґ СЃРѕР·РґР°РЅРёРµРј СЃРµСЃСЃРёРё</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6 px-2 md:px-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-1">
                                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">РћС‚РєСѓРґР°</Label>
                                    <div className="font-medium text-lg">{warehouses?.find(w => w.id === warehouseId)?.name}</div>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">РљСѓРґР°</Label>
                                    <div className="font-medium text-lg flex items-center gap-2">
                                        <MapPin className="h-4 w-4 text-primary" />
                                        {getDestinationName()}
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                        {destinationType === 'store' ? 'РњР°РіР°Р·РёРЅ' : destinationType === 'warehouse' ? 'РЎРєР»Р°Рґ' : 'РџСЂРѕС‡РµРµ'}
                                    </div>
                                </div>
                                {requestNumber && (
                                    <div className="space-y-1">
                                        <Label className="text-xs text-muted-foreground uppercase tracking-wider">РќРѕРјРµСЂ Р·Р°СЏРІРєРё</Label>
                                        <div className="font-medium">{requestNumber}</div>
                                    </div>
                                )}
                                <div className="space-y-1">
                                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">Р¤Р°Р№Р»</Label>
                                    <div className="font-medium flex items-center gap-2">
                                        <FileText className="h-4 w-4" />
                                        {file ? file.name : "Р‘РµР· С„Р°Р№Р»Р° (СЂСѓС‡РЅРѕР№ СЃР±РѕСЂ)"}
                                    </div>
                                </div>
                            </div>

                            {file && (
                                <div className="rounded-lg border bg-muted/20 p-4">
                                    <div className="flex items-center justify-between mb-4">
                                        <h4 className="font-bold flex items-center gap-2">
                                            <Package className="h-4 w-4" />
                                            РўРѕРІР°СЂС‹
                                        </h4>
                                        <Badge>{Object.keys(mappings).length} РїРѕР·РёС†РёР№</Badge>
                                    </div>
                                    <div className="space-y-2 max-h-[200px] overflow-y-auto">
                                        {parsedItems
                                            .filter(item => mappings[item.originalName])
                                            .map((item, i) => (
                                                <div key={i} className="flex justify-between text-sm py-1 border-b border-border/50 last:border-0">
                                                    <span className="truncate pr-4">{item.originalName}</span>
                                                    <span className="font-mono">{item.quantity} С€С‚</span>
                                                </div>
                                            ))}
                                    </div>
                                </div>
                            )}

                            {!file && (
                                <div className="p-4 rounded-lg bg-orange-50 border border-orange-200 text-orange-800 flex items-start gap-3">
                                    <Info className="h-5 w-5 shrink-0" />
                                    <div className="text-sm">
                                        Р’С‹ СЃРѕР·РґР°РµС‚Рµ РїСѓСЃС‚СѓСЋ РѕС‚РіСЂСѓР·РєСѓ. РўРѕРІР°СЂС‹ РЅСѓР¶РЅРѕ Р±СѓРґРµС‚ РґРѕР±Р°РІР»СЏС‚СЊ РІСЂСѓС‡РЅСѓСЋ СЃРєР°РЅРёСЂРѕРІР°РЅРёРµРј РёР»Рё РїРѕРёСЃРєРѕРј РїРѕ РєР°С‚Р°Р»РѕРіСѓ.
                                    </div>
                                </div>
                            )}
                        </CardContent>
                        <CardFooter className="px-2 md:px-6 flex justify-between">
                            <Button variant="ghost" onClick={() => setStep("mapping")}>РќР°Р·Р°Рґ</Button>
                            <Button onClick={handleFinish} className="bg-green-600 hover:bg-green-700 text-white">
                                <CheckCircle2 className="mr-2 h-4 w-4" />
                                РЎРѕР·РґР°С‚СЊ РѕС‚РіСЂСѓР·РєСѓ
                            </Button>
                        </CardFooter>
                    </Card>
                )}
            </div>
        </div>
    );
}

