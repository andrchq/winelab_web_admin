"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useParams, useRouter } from "next/navigation";
import { shippingService, ShippingSession, ShippingItem, StoreDeliveryPreview } from "@/lib/shipping-service";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, AlertTriangle, ArrowLeft, ArrowRight, PackageCheck, Trash2, Plus, Search, Loader2, Phone, Mail, Truck } from "lucide-react";
import { toast } from "sonner";
import { useScanDetection } from "@/lib/use-scan-detection";
import { useTSDMode } from "@/contexts/TSDModeContext";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useProducts, useWarehouses, useCategories } from "@/lib/hooks";
import { AddConsumablesDialog } from "@/components/shipments/add-consumables-dialog";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "@/components/ui/dialog";
import { sounds } from "@/lib/sounds";

export default function ShipmentDashboard() {
    const params = useParams();
    const router = useRouter();
    const id = params?.id as string;
    const { isTSDMode } = useTSDMode();
    const { hasRole } = useAuth();
    const isPrivileged = hasRole(['ADMIN', 'MANAGER']);

    const { data: products } = useProducts();
    const { data: warehouses } = useWarehouses();
    const { data: categories } = useCategories();

    const [session, setSession] = useState<ShippingSession | null>(null);
    const [loading, setLoading] = useState(true);
    const [isAddItemOpen, setIsAddItemOpen] = useState(false);
    const [isAddConsumablesOpen, setIsAddConsumablesOpen] = useState(false);
    const [isStoreDeliveryDialogOpen, setIsStoreDeliveryDialogOpen] = useState(false);
    const [storeDeliveryPreview, setStoreDeliveryPreview] = useState<StoreDeliveryPreview | null>(null);
    const [isLoadingStoreDeliveryPreview, setIsLoadingStoreDeliveryPreview] = useState(false);
    const [isConfirmingStoreDelivery, setIsConfirmingStoreDelivery] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");

    // Duplicate scan confirmation
    const [duplicateScanPending, setDuplicateScanPending] = useState<{ code: string; item: ShippingItem } | null>(null);

    // Unknown barcode РІвЂ вЂ™ product mapping
    const [unknownBarcode, setUnknownBarcode] = useState<string | null>(null);
    const [selectedProductForBarcode, setSelectedProductForBarcode] = useState<string>("");
    const [barcodeProductSearch, setBarcodeProductSearch] = useState("");

    const loadData = async () => {
        if (id) {
            const data = await shippingService.getById(id);
            if (data) {
                setSession(data);
            } else {
                toast.error("Р РЋР ВµРЎРѓРЎРѓР С‘РЎРЏ Р Р…Р Вµ Р Р…Р В°Р в„–Р Т‘Р ВµР Р…Р В°");
                router.push('/shipments');
            }
            setLoading(false);
        }
    };

    useEffect(() => {
        void loadData();
    }, [id, router]);

    const warehouseName = warehouses?.find(w => w.id === session?.warehouseId)?.name || session?.warehouseId || "Р РЋР С”Р В»Р В°Р Т‘";

    const handleCardClick = (item: ShippingItem) => {
        router.push(`/shipments/${id}/scan/${item.id}`);
    };

    // Check if this barcode was already scanned (exists in any item's scans)
    const findExistingItemByBarcode = (code: string): ShippingItem | null => {
        if (!session) return null;
        for (const item of session.items) {
            if (item.scans?.some(s => s.code === code || s.code === `BOX: ${code}`)) {
                return item;
            }
        }
        return null;
    };

    // Handle confirmed duplicate scan
    const handleConfirmDuplicate = () => {
        if (!duplicateScanPending) return;
        sounds.info();
        toast.success(`Р СћР С•Р Р†Р В°РЎР‚ Р Р…Р В°Р в„–Р Т‘Р ВµР Р…: Р С—Р С•Р Р†РЎвЂљР С•РЎР‚Р Р…Р С•Р Вµ РЎРѓР С”Р В°Р Р…Р С‘РЎР‚Р С•Р Р†Р В°Р Р…Р С‘Р Вµ`);
        router.push(`/shipments/${id}/scan/${duplicateScanPending.item.id}`);
        setDuplicateScanPending(null);
    };

    // Handle unknown barcode РІвЂ вЂ™ map to product and add
    const handleMapBarcodeToProduct = async () => {
        if (!unknownBarcode || !selectedProductForBarcode || !session) return;

        const product = products?.find(p => p.id === selectedProductForBarcode);
        if (!product) return;

        try {
            const existingItem = session.items.find(i => i.productId === product.id);

            if (existingItem) {
                await shippingService.updateItem(id, existingItem.id, 1, false, unknownBarcode);
                await loadData();
                sounds.success();
                toast.success(`ШК привязан и отсканирован: ${product.name}`);
            } else {
                const newItem = await shippingService.addItem(id, {
                    productId: product.id,
                    originalName: product.name,
                    sku: product.sku,
                    quantity: 0,
                    expectedQuantity: 0,
                });
                await shippingService.updateItem(id, newItem.id, 1, false, unknownBarcode);
                await loadData();
                sounds.success();
                toast.success(`Новый товар добавлен и отсканирован: ${product.name}`);
            }

            setUnknownBarcode(null);
            setSelectedProductForBarcode('');
            setBarcodeProductSearch('');
        } catch (error) {
            sounds.error();
            toast.error(error instanceof Error ? error.message : 'РќРµ СѓРґР°Р»РѕСЃСЊ РїСЂРёРІСЏР·Р°С‚СЊ С€С‚СЂРёС…РєРѕРґ');
        }
    };
    // Scan detection on overview page
    useScanDetection({
        onScan: async (code) => {
            if (!session || !products) return;
            if (duplicateScanPending || unknownBarcode) return; // Dialog is open
            const cleanCode = code.trim();

            // Find matching product by SKU or barcode
            const product = products.find(p =>
                p.sku.toLowerCase() === cleanCode.toLowerCase() ||
                p.barcode?.toLowerCase() === cleanCode.toLowerCase()
            );

            if (product) {
                // Find item in session
                const item = session.items.find(i => i.productId === product.id);

                if (item) {
                    // Check for duplicate scan
                    const existingScanned = findExistingItemByBarcode(cleanCode);
                    if (existingScanned && existingScanned.id === item.id) {
                        // This exact barcode was already scanned for this item
                        sounds.warning();
                        setDuplicateScanPending({ code: cleanCode, item });
                        return;
                    }

                    sounds.info();
                    toast.success(`Р СћР С•Р Р†Р В°РЎР‚ Р Р…Р В°Р в„–Р Т‘Р ВµР Р…: ${product.name}`);
                    router.push(`/shipments/${id}/scan/${item.id}`);
                } else {
                    // Product exists in DB but not in session РІР‚вЂќ check duplicate first
                    const existingScanned = findExistingItemByBarcode(cleanCode);
                    if (existingScanned) {
                        sounds.warning();
                        setDuplicateScanPending({ code: cleanCode, item: existingScanned });
                        return;
                    }

                    // Auto-add for manual sessions
                    if (session.type === 'manual') {
                        const newItem = await shippingService.addItem(id, {
                            productId: product.id,
                            originalName: product.name,
                            sku: product.sku,
                            quantity: 0,
                            expectedQuantity: 0,
                        });
                        await shippingService.updateItem(id, newItem.id, 1, false, cleanCode);
                        await loadData();
                        sounds.success();
                        toast.success(`Р вЂќР С•Р В±Р В°Р Р†Р В»Р ВµР Р… Р С‘ Р С•РЎвЂљРЎРѓР С”Р В°Р Р…Р С‘РЎР‚Р С•Р Р†Р В°Р Р…: ${product.name}`);
                    } else {
                        sounds.error();
                        toast.error(`Р СћР С•Р Р†Р В°РЎР‚ "${product.name}" Р Р…Р Вµ Р Р†РЎвЂ¦Р С•Р Т‘Р С‘РЎвЂљ Р Р† Р Р…Р В°Р С”Р В»Р В°Р Т‘Р Р…РЎС“РЎР‹ Р С•РЎвЂљР С–РЎР‚РЎС“Р В·Р С”Р С‘`);
                    }
                }
            } else {
                // Barcode not found in product database at all
                // Check duplicate first
                const existingScanned = findExistingItemByBarcode(cleanCode);
                if (existingScanned) {
                    sounds.warning();
                    setDuplicateScanPending({ code: cleanCode, item: existingScanned });
                    return;
                }

                // Ask user to assign this barcode to a product
                sounds.warning();
                setUnknownBarcode(cleanCode);
            }
        }
    });

    const handleAddItem = async (productId: string) => {
        if (!session) return;
        const product = products?.find(p => p.id === productId);
        if (!product) return;

        const existing = session.items.find(i => i.productId === productId);
        if (existing) {
            toast.info("Р СћР С•Р Р†Р В°РЎР‚ РЎС“Р В¶Р Вµ Р Р† РЎРѓР С—Р С‘РЎРѓР С”Р Вµ");
            setIsAddItemOpen(false);
            return;
        }

        await shippingService.addItem(id, {
            productId: product.id,
            originalName: product.name,
            sku: product.sku,
            quantity: 0,
            expectedQuantity: 0,
        });
        await loadData();
        toast.success("Р СћР С•Р Р†Р В°РЎР‚ Р Т‘Р С•Р В±Р В°Р Р†Р В»Р ВµР Р… Р Р† РЎРѓР С—Р С‘РЎРѓР С•Р С”");
        setIsAddItemOpen(false);
    };

    const openStoreDeliveryDialog = async () => {
        if (!session) return;

        setIsLoadingStoreDeliveryPreview(true);
        setIsStoreDeliveryDialogOpen(true);
        try {
            const preview = await shippingService.getStoreDeliveryPreview(session.id);
            setStoreDeliveryPreview(preview);
        } catch (error) {
            setIsStoreDeliveryDialogOpen(false);
            setStoreDeliveryPreview(null);
            toast.error(error instanceof Error ? error.message : "Р СњР Вµ РЎС“Р Т‘Р В°Р В»Р С•РЎРѓРЎРЉ Р С—Р С•Р Т‘Р С–Р С•РЎвЂљР С•Р Р†Р С‘РЎвЂљРЎРЉ Р Т‘Р С•РЎРѓРЎвЂљР В°Р Р†Р С”РЎС“ Р Р† Р Р‡Р Р…Р Т‘Р ВµР С”РЎРѓ");
        } finally {
            setIsLoadingStoreDeliveryPreview(false);
        }
    };

    const handleConfirmStoreDelivery = async () => {
        if (!session) return;

        setIsConfirmingStoreDelivery(true);
        try {
            await shippingService.confirmStoreDelivery(session.id);
            await loadData();
            sounds.complete();
            toast.success("Р С›РЎвЂљР С–РЎР‚РЎС“Р В·Р С”Р В° Р С—Р С•Р Т‘РЎвЂљР Р†Р ВµРЎР‚Р В¶Р Т‘Р ВµР Р…Р В° Р С‘ Р С•РЎвЂљР С—РЎР‚Р В°Р Р†Р В»Р ВµР Р…Р В° Р Р† Yandex Delivery");
            setIsStoreDeliveryDialogOpen(false);
            setStoreDeliveryPreview(null);
        } catch (error) {
            sounds.error();
            toast.error(error instanceof Error ? error.message : "Р СњР Вµ РЎС“Р Т‘Р В°Р В»Р С•РЎРѓРЎРЉ РЎРѓР С•Р В·Р Т‘Р В°РЎвЂљРЎРЉ Р Т‘Р С•РЎРѓРЎвЂљР В°Р Р†Р С”РЎС“ Р Р† Р Р‡Р Р…Р Т‘Р ВµР С”РЎРѓ");
        } finally {
            setIsConfirmingStoreDelivery(false);
        }
    };

    const handleCompleteSession = async () => {
        if (!session) return;
        const totalScanned = session.items.reduce((acc, i) => acc + (i.scannedQuantity || 0), 0);
        if (totalScanned === 0) {
            sounds.error();
            toast.error("Р СњР ВµРЎвЂљ РЎРѓР С•Р В±РЎР‚Р В°Р Р…Р Р…РЎвЂ№РЎвЂ¦ РЎвЂљР С•Р Р†Р В°РЎР‚Р С•Р Р†");
            return;
        }

        if (session.destinationType === 'store') {
            await openStoreDeliveryDialog();
            return;
        }

        const confirmMsg = session.destinationType === 'warehouse'
            ? "Р вЂ”Р В°Р Р†Р ВµРЎР‚РЎв‚¬Р С‘РЎвЂљРЎРЉ Р С•РЎвЂљР С–РЎР‚РЎС“Р В·Р С”РЎС“? Р С›РЎРѓРЎвЂљР В°РЎвЂљР С”Р С‘ Р В±РЎС“Р Т‘РЎС“РЎвЂљ РЎРѓР С—Р С‘РЎРѓР В°Р Р…РЎвЂ№ РЎРѓР С• РЎРѓР С”Р В»Р В°Р Т‘Р В° Р С‘ РЎРѓР С•Р В·Р Т‘Р В°Р Р…Р В° Р С—РЎР‚Р С‘Р ВµР СР С”Р В° Р Р…Р В° РЎРѓР С”Р В»Р В°Р Т‘Р Вµ-Р С—Р С•Р В»РЎС“РЎвЂЎР В°РЎвЂљР ВµР В»Р Вµ."
            : "Р вЂ”Р В°Р Р†Р ВµРЎР‚РЎв‚¬Р С‘РЎвЂљРЎРЉ Р С•РЎвЂљР С–РЎР‚РЎС“Р В·Р С”РЎС“? Р С›РЎРѓРЎвЂљР В°РЎвЂљР С”Р С‘ Р В±РЎС“Р Т‘РЎС“РЎвЂљ РЎРѓР С—Р С‘РЎРѓР В°Р Р…РЎвЂ№ РЎРѓР С• РЎРѓР С”Р В»Р В°Р Т‘Р В°.";

        if (!confirm(confirmMsg)) return;

        try {
            await shippingService.commit(id);
            await loadData();
            sounds.complete();
            toast.success("Р С›РЎвЂљР С–РЎР‚РЎС“Р В·Р С”Р В° Р В·Р В°Р Р†Р ВµРЎР‚РЎв‚¬Р ВµР Р…Р В°");
        } catch (error: any) {
            console.error(error);
            sounds.error();
            toast.error(`Р С›РЎв‚¬Р С‘Р В±Р С”Р В°: ${error?.message || "Р СњР ВµР С‘Р В·Р Р†Р ВµРЎРѓРЎвЂљР Р…Р В°РЎРЏ Р С•РЎв‚¬Р С‘Р В±Р С”Р В°"}`);
        }
    };

    const handleDeleteSession = async () => {
        if (!confirm("Р Р€Р Т‘Р В°Р В»Р С‘РЎвЂљРЎРЉ РЎРЊРЎвЂљРЎС“ Р С•РЎвЂљР С–РЎР‚РЎС“Р В·Р С”РЎС“? Р вЂ™РЎРѓР Вµ Р Т‘Р В°Р Р…Р Р…РЎвЂ№Р Вµ Р В±РЎС“Р Т‘РЎС“РЎвЂљ Р С—Р С•РЎвЂљР ВµРЎР‚РЎРЏР Р…РЎвЂ№.")) return;
        try {
            await api.delete(`/shipments/${id}`).catch(() => { });
        } catch (_) { }
        router.push('/shipments');
        toast.success("Р С›РЎвЂљР С–РЎР‚РЎС“Р В·Р С”Р В° РЎС“Р Т‘Р В°Р В»Р ВµР Р…Р В°");
    };

    const getStatusColor = (current: number, total: number, isFileBased: boolean) => {
        if (current === 0) return "bg-gray-100 border-gray-200 text-gray-500";
        if (!isFileBased) return "bg-green-100 border-green-200 text-green-700";
        if (current === total) return "bg-green-100 border-green-200 text-green-700";
        if (current > total) return "bg-red-100 border-red-200 text-red-700";
        return "bg-yellow-50 border-yellow-200 text-yellow-700";
    };

    const filteredProducts = products?.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchTerm.toLowerCase())
    ).slice(0, 10) || [];

    const barcodeFilteredProducts = products?.filter(p =>
        p.name.toLowerCase().includes(barcodeProductSearch.toLowerCase()) ||
        p.sku.toLowerCase().includes(barcodeProductSearch.toLowerCase())
    ).slice(0, 10) || [];

    if (loading) return <div className="p-8 flex justify-center">Р вЂ”Р В°Р С–РЎР‚РЎС“Р В·Р С”Р В°...</div>;
    if (!session) return null;

    const isFileBased = session.type === 'file';
    const totalScanned = session.items.reduce((acc, i) => acc + (i.scannedQuantity || 0), 0);
    const totalExpected = isFileBased ? session.items.reduce((acc, i) => acc + (i.expectedQuantity || 0), 0) : 0;
    const progressPercent = isFileBased && totalExpected > 0 ? Math.min(100, Math.round((totalScanned / totalExpected) * 100)) : 0;
    const isCompleted = session.status === 'shipped';

    return (
        <div className="flex flex-col h-full">
            <main className={`flex-1 overflow-y-auto ${isTSDMode ? 'p-2' : 'p-4'} bg-muted/10`}>
                <div className="space-y-6">

                    {/* Top Bar */}
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                            <Button variant="ghost" size="sm" onClick={() => router.push('/shipments')}>
                                <ArrowLeft className="mr-2 h-4 w-4" /> Р СњР В°Р В·Р В°Р Т‘
                            </Button>

                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setIsAddConsumablesOpen(true)}
                                    disabled={!session || isCompleted}
                                >
                                    Р вЂќР С•Р В±Р В°Р Р†Р С‘РЎвЂљРЎРЉ РЎР‚Р В°РЎРѓРЎвЂ¦Р С•Р Т‘Р Р…Р С‘Р С”Р С‘
                                </Button>
                            </div>

                            <div className="text-right">
                                <div className="text-xs text-muted-foreground font-mono mb-1">{session.invoiceNumber || session.requestNumber || session.id}</div>
                                <div className="font-bold text-lg flex items-center justify-end gap-2">
                                    <span>{warehouseName}</span>
                                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                                    <span>{session.destination}</span>
                                </div>
                                <div className="text-xs text-muted-foreground flex items-center justify-end gap-1">
                                    <Badge variant={
                                        session.status === 'shipped' ? 'success' :
                                            session.status === 'picking' ? 'default' :
                                                session.status === 'packed' ? 'info' : 'secondary'
                                    } className="text-[10px]">
                                        {session.status === 'draft' ? 'Р В§Р ВµРЎР‚Р Р…Р С•Р Р†Р С‘Р С”' :
                                            session.status === 'picking' ? 'Р РЋР В±Р С•РЎР‚Р С”Р В°' :
                                                session.status === 'packed' ? 'Р РЋР С•Р В±РЎР‚Р В°Р Р…Р С•' :
                                                    session.status === 'shipped' ? 'Р С›РЎвЂљР С—РЎР‚Р В°Р Р†Р В»Р ВµР Р…Р С•' : session.status}
                                    </Badge>
                                    {session.destinationType === 'warehouse' && session.linkedReceivingId && (
                                        <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-600 border-blue-200">
                                            Р СџРЎР‚Р С‘Р ВµР СР С”Р В° РЎРѓР С•Р В·Р Т‘Р В°Р Р…Р В°
                                        </Badge>
                                    )}
                                    {session.destinationType === 'store' && session.delivery && (
                                        <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-600 border-blue-200">
                                            {session.delivery.provider === 'YANDEX_DELIVERY' ? 'Р вЂќР С•РЎРѓРЎвЂљР В°Р Р†Р С”Р В° РЎРѓР С•Р В·Р Т‘Р В°Р Р…Р В°' : 'Р вЂќР С•РЎРѓРЎвЂљР В°Р Р†Р С”Р В°'}
                                        </Badge>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Progress Card */}
                        <Card>
                            <CardContent className="p-4 flex flex-col gap-2">
                                <div className="flex justify-between items-end">
                                    <div>
                                        <div className="text-sm font-medium text-muted-foreground">
                                            {isFileBased ? 'Р СџРЎР‚Р С•Р С–РЎР‚Р ВµРЎРѓРЎРѓ РЎРѓР В±Р С•РЎР‚Р С”Р С‘' : 'Р РЋР С•Р В±РЎР‚Р В°Р Р…Р С•'}
                                        </div>
                                        <div className="text-3xl font-bold font-mono">
                                            {totalScanned}
                                            {isFileBased && (
                                                <span className="text-lg text-muted-foreground font-normal"> / {totalExpected}</span>
                                            )}
                                            <span className="text-lg text-muted-foreground font-normal"> РЎв‚¬РЎвЂљ</span>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        {isFileBased ? (
                                            <Badge variant={progressPercent === 100 ? "success" : "secondary"}>
                                                {progressPercent}%
                                            </Badge>
                                        ) : (
                                            <Badge variant="secondary">
                                                {session.items.length} Р С—Р С•Р В·.
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                                {isFileBased && (
                                    <div className="h-3 bg-secondary rounded-full overflow-hidden w-full">
                                        <div
                                            className={`h-full transition-all duration-500 ${progressPercent >= 100 ? 'bg-green-500' :
                                                totalScanned > totalExpected ? 'bg-red-500' : 'bg-primary'
                                                }`}
                                            style={{ width: `${progressPercent}%` }}
                                        />
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Add Item Button (for manual mode, not shipped) */}
                    {!isCompleted && session.type === 'manual' && (
                        <Dialog open={isAddItemOpen} onOpenChange={setIsAddItemOpen}>
                            <DialogTrigger asChild>
                                <Button variant="outline" className="w-full h-12 border-dashed border-2">
                                    <Plus className="mr-2 h-5 w-5" />
                                    Р вЂќР С•Р В±Р В°Р Р†Р С‘РЎвЂљРЎРЉ РЎвЂљР С•Р Р†Р В°РЎР‚ Р Р†РЎР‚РЎС“РЎвЂЎР Р…РЎС“РЎР‹
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-md">
                                <DialogHeader>
                                    <DialogTitle>Р вЂќР С•Р В±Р В°Р Р†Р С‘РЎвЂљРЎРЉ РЎвЂљР С•Р Р†Р В°РЎР‚ Р Р† Р С•РЎвЂљР С–РЎР‚РЎС“Р В·Р С”РЎС“</DialogTitle>
                                    <DialogDescription>
                                        Р вЂ™РЎвЂ№Р В±Р ВµРЎР‚Р С‘РЎвЂљР Вµ РЎвЂљР С•Р Р†Р В°РЎР‚ Р С‘Р В· Р С”Р В°РЎвЂљР В°Р В»Р С•Р С–Р В° Р Т‘Р В»РЎРЏ Р Т‘Р С•Р В±Р В°Р Р†Р В»Р ВµР Р…Р С‘РЎРЏ Р Р† РЎРѓР С—Р С‘РЎРѓР С•Р С”.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                    <div className="flex items-center gap-2 border rounded-md px-3 py-2">
                                        <Search className="h-4 w-4 text-muted-foreground" />
                                        <input
                                            className="flex-1 bg-transparent outline-none text-sm"
                                            placeholder="Р СџР С•Р С‘РЎРѓР С” Р С—Р С• Р Р…Р В°Р В·Р Р†Р В°Р Р…Р С‘РЎР‹ Р С‘Р В»Р С‘ SKU..."
                                            value={searchTerm}
                                            onChange={e => setSearchTerm(e.target.value)}
                                        />
                                    </div>
                                    <div className="max-h-[300px] overflow-y-auto space-y-2">
                                        {filteredProducts.map(product => (
                                            <div
                                                key={product.id}
                                                className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                                                onClick={() => handleAddItem(product.id)}
                                            >
                                                <div>
                                                    <div className="font-medium text-sm">{product.name}</div>
                                                    <div className="text-xs text-muted-foreground">{product.sku}</div>
                                                </div>
                                                <Plus className="h-4 w-4 text-primary" />
                                            </div>
                                        ))}
                                        {filteredProducts.length === 0 && (
                                            <div className="text-center text-sm text-muted-foreground py-4">
                                                Р СњР С‘РЎвЂЎР ВµР С–Р С• Р Р…Р Вµ Р Р…Р В°Р в„–Р Т‘Р ВµР Р…Р С•
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </DialogContent>
                        </Dialog>
                    )}

                    {/* Grid of Items */}
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pb-20">
                        {session.items.map((item) => {
                            const current = item.scannedQuantity || 0;
                            const total = item.expectedQuantity || 0;
                            const statusClass = getStatusColor(current, total, isFileBased);

                            return (
                                <button
                                    key={item.id}
                                    onClick={() => handleCardClick(item)}
                                    disabled={isCompleted}
                                    className={`
                                    relative flex flex-col text-left p-4 rounded-xl border-2 transition-all active:scale-95
                                    min-h-[140px] justify-between shadow-sm hover:shadow-md
                                    ${isCompleted ? 'opacity-70 cursor-default' : 'cursor-pointer'}
                                    ${statusClass}
                                `}
                                >
                                    <div>
                                        <div className="font-medium line-clamp-2 leading-tight mb-1" title={item.originalName}>
                                            {item.originalName}
                                        </div>
                                        {item.sku && <div className="text-xs opacity-70 font-mono">{item.sku}</div>}
                                    </div>

                                    <div className="mt-4 flex items-end justify-between w-full">
                                        <div className="text-xs font-medium uppercase tracking-wider opacity-60">
                                            {current === 0 ? "Р С›Р В¶Р С‘Р Т‘Р В°Р Р…Р С‘Р Вµ" :
                                                isFileBased ? (current < total ? "Р вЂ™ Р С—РЎР‚Р С•РЎвЂ Р ВµРЎРѓРЎРѓР Вµ" : current === total ? "Р вЂњР С•РЎвЂљР С•Р Р†Р С•" : "Р ВР В·Р В»Р С‘РЎв‚¬Р ВµР С”") :
                                                    "Р РЋР С•Р В±РЎР‚Р В°Р Р…Р С•"}
                                        </div>
                                        <div className="text-2xl font-bold font-mono">
                                            {current}
                                            {isFileBased && total > 0 && <span className="text-sm font-normal">/{total}</span>}
                                        </div>
                                    </div>

                                    {isFileBased && current === total && total > 0 && (
                                        <div className="absolute top-2 right-2">
                                            <Badge className="bg-green-500/20 text-green-700 hover:bg-green-500/20 border-0">
                                                <Check className="h-3 w-3 mr-1" /> OK
                                            </Badge>
                                        </div>
                                    )}
                                    {isFileBased && current > total && (
                                        <div className="absolute top-2 right-2">
                                            <Badge variant="destructive" className="animate-pulse">
                                                <AlertTriangle className="h-3 w-3 mr-1" /> +{current - total}
                                            </Badge>
                                        </div>
                                    )}
                                </button>
                            );
                        })}

                        {session.items.length === 0 && (
                            <div className="col-span-full text-center py-12 text-muted-foreground">
                                <div className="text-lg font-medium mb-1">Р РЋР С—Р С‘РЎРѓР С•Р С” Р С—РЎС“РЎРѓРЎвЂљ</div>
                                <div className="text-sm">Р РЋР С”Р В°Р Р…Р С‘РЎР‚РЎС“Р в„–РЎвЂљР Вµ РЎвЂљР С•Р Р†Р В°РЎР‚РЎвЂ№ Р С‘Р В»Р С‘ Р Т‘Р С•Р В±Р В°Р Р†РЎРЉРЎвЂљР Вµ Р Р†РЎР‚РЎС“РЎвЂЎР Р…РЎС“РЎР‹</div>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* Fixed Footer Action РІР‚вЂќ always visible */}
            <div className="border-t bg-background p-4 flex justify-between items-center gap-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
                <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={handleDeleteSession}
                    title="Р Р€Р Т‘Р В°Р В»Р С‘РЎвЂљРЎРЉ Р С•РЎвЂљР С–РЎР‚РЎС“Р В·Р С”РЎС“"
                    style={{ visibility: isPrivileged ? 'visible' : 'hidden' }}
                >
                    <Trash2 className="h-5 w-5" />
                </Button>
                <div className="text-sm text-muted-foreground hidden sm:block flex-1">
                    {isCompleted
                        ? 'Р С›РЎвЂљР С–РЎР‚РЎС“Р В·Р С”Р В° Р В·Р В°Р Р†Р ВµРЎР‚РЎв‚¬Р ВµР Р…Р В°'
                        : session.destinationType === 'store'
                          ? 'Р СџРЎР‚Р С•Р Р†Р ВµРЎР‚РЎРЉРЎвЂљР Вµ Р СР В°Р С–Р В°Р В·Р С‘Р Р… Р С‘ Р С—Р С•Р Т‘РЎвЂљР Р†Р ВµРЎР‚Р Т‘Р С‘РЎвЂљР Вµ Р С•РЎвЂљР С—РЎР‚Р В°Р Р†Р С”РЎС“ Р Р† Р Р‡Р Р…Р Т‘Р ВµР С”РЎРѓ'
                          : 'Р СњР В°Р В¶Р СР С‘РЎвЂљР Вµ Р Р…Р В° Р С”Р В°РЎР‚РЎвЂљР С•РЎвЂЎР С”РЎС“ Р Т‘Р В»РЎРЏ РЎРѓР С”Р В°Р Р…Р С‘РЎР‚Р С•Р Р†Р В°Р Р…Р С‘РЎРЏ'}
                </div>
                <Button
                    size="lg"
                    className="w-full sm:w-auto"
                    disabled={isCompleted || totalScanned === 0}
                    onClick={handleCompleteSession}
                >
                    <PackageCheck className="mr-2 h-5 w-5" />
                    {isCompleted
                        ? 'Р вЂ”Р В°Р Р†Р ВµРЎР‚РЎв‚¬Р ВµР Р…Р С•'
                        : session.destinationType === 'store'
                          ? 'Р СџР С•Р Т‘РЎвЂљР Р†Р ВµРЎР‚Р Т‘Р С‘РЎвЂљРЎРЉ Р Т‘Р С•РЎРѓРЎвЂљР В°Р Р†Р С”РЎС“'
                          : 'Р вЂ”Р В°Р Р†Р ВµРЎР‚РЎв‚¬Р С‘РЎвЂљРЎРЉ Р С•РЎвЂљР С–РЎР‚РЎС“Р В·Р С”РЎС“'}
                </Button>
            </div>

            <Dialog
                open={isStoreDeliveryDialogOpen}
                onOpenChange={(open) => {
                    setIsStoreDeliveryDialogOpen(open);
                    if (!open) {
                        setStoreDeliveryPreview(null);
                    }
                }}
            >
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Truck className="h-5 w-5 text-primary" />
                            Р СџР С•Р Т‘РЎвЂљР Р†Р ВµРЎР‚Р В¶Р Т‘Р ВµР Р…Р С‘Р Вµ Р Т‘Р С•РЎРѓРЎвЂљР В°Р Р†Р С”Р С‘ Р Р† Yandex Delivery
                        </DialogTitle>
                        <DialogDescription>
                            Р СџР ВµРЎР‚Р ВµР Т‘ Р С•РЎвЂљР С—РЎР‚Р В°Р Р†Р С”Р С•Р в„– Р С—РЎР‚Р С•Р Р†Р ВµРЎР‚РЎРЉРЎвЂљР Вµ Р СР В°Р С–Р В°Р В·Р С‘Р Р…, Р С”Р С•Р Р…РЎвЂљР В°Р С”РЎвЂљРЎвЂ№ Р С‘ РЎРѓР С•РЎРѓРЎвЂљР В°Р Р† Р С•РЎвЂљР С–РЎР‚РЎС“Р В·Р С”Р С‘.
                        </DialogDescription>
                    </DialogHeader>

                    {isLoadingStoreDeliveryPreview ? (
                        <div className="flex items-center justify-center py-16">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : storeDeliveryPreview ? (
                        <div className="space-y-4 py-2">
                            {storeDeliveryPreview.warnings.length > 0 && (
                                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                                    <div className="font-medium mb-2">Р В§РЎвЂљР С• Р Р…РЎС“Р В¶Р Р…Р С• Р В·Р В°Р С—Р С•Р В»Р Р…Р С‘РЎвЂљРЎРЉ Р С—Р ВµРЎР‚Р ВµР Т‘ Р С•РЎвЂљР С—РЎР‚Р В°Р Р†Р С”Р С•Р в„–</div>
                                    <div className="space-y-1">
                                        {storeDeliveryPreview.warnings.map((warning) => (
                                            <div key={warning}>{warning}</div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {!storeDeliveryPreview.yandexConfigured && (
                                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                                    Р вЂ™ backend Р Р…Р Вµ Р Р…Р В°РЎРѓРЎвЂљРЎР‚Р С•Р ВµР Р… РЎвЂљР С•Р С”Р ВµР Р… Yandex Delivery.
                                </div>
                            )}

                            <div className="grid gap-4 md:grid-cols-2">
                                <Card>
                                    <CardContent className="space-y-2 p-4">
                                        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Р С›РЎвЂљР С—РЎР‚Р В°Р Р†Р С‘РЎвЂљР ВµР В»РЎРЉ</div>
                                        <div className="font-semibold">{storeDeliveryPreview.source.name}</div>
                                        <div className="text-sm text-muted-foreground">{storeDeliveryPreview.source.address || "Р С’Р Т‘РЎР‚Р ВµРЎРѓ Р Р…Р Вµ Р В·Р В°Р С—Р С•Р В»Р Р…Р ВµР Р…"}</div>
                                        <div className="text-sm">{storeDeliveryPreview.source.contactName || "Р С™Р С•Р Р…РЎвЂљР В°Р С”РЎвЂљ Р Р…Р Вµ Р В·Р В°Р С—Р С•Р В»Р Р…Р ВµР Р…"}</div>
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <Phone className="h-4 w-4" />
                                            {storeDeliveryPreview.source.phone || "Р СћР ВµР В»Р ВµРЎвЂћР С•Р Р… Р Р…Р Вµ Р В·Р В°Р С—Р С•Р В»Р Р…Р ВµР Р…"}
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <Mail className="h-4 w-4" />
                                            {storeDeliveryPreview.source.email || "Email Р Р…Р Вµ Р В·Р В°Р С—Р С•Р В»Р Р…Р ВµР Р…"}
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardContent className="space-y-2 p-4">
                                        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Р СџР С•Р В»РЎС“РЎвЂЎР В°РЎвЂљР ВµР В»РЎРЉ</div>
                                        <div className="font-semibold">{storeDeliveryPreview.destination.name}</div>
                                        <div className="text-sm text-muted-foreground">{storeDeliveryPreview.destination.address || "Р С’Р Т‘РЎР‚Р ВµРЎРѓ Р Р…Р Вµ Р В·Р В°Р С—Р С•Р В»Р Р…Р ВµР Р…"}</div>
                                        <div className="text-sm">{storeDeliveryPreview.destination.contactName || "Р С™Р С•Р Р…РЎвЂљР В°Р С”РЎвЂљ Р Р…Р Вµ Р В·Р В°Р С—Р С•Р В»Р Р…Р ВµР Р…"}</div>
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <Phone className="h-4 w-4" />
                                            {storeDeliveryPreview.destination.phone || "Р СћР ВµР В»Р ВµРЎвЂћР С•Р Р… Р Р…Р Вµ Р В·Р В°Р С—Р С•Р В»Р Р…Р ВµР Р…"}
                                        </div>
                                        {storeDeliveryPreview.destination.comment && (
                                            <div className="rounded-lg bg-muted/40 p-3 text-sm text-muted-foreground">
                                                {storeDeliveryPreview.destination.comment}
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </div>

                            <Card>
                                <CardContent className="space-y-3 p-4">
                                    <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Р РЋР С•РЎРѓРЎвЂљР В°Р Р† Р С•РЎвЂљР С—РЎР‚Р В°Р Р†Р С”Р С‘</div>
                                    <div className="space-y-2">
                                        {storeDeliveryPreview.items.map((item) => (
                                            <div key={item.id} className="flex items-center justify-between rounded-lg border border-border/50 px-3 py-2">
                                                <div>
                                                    <div className="font-medium">{item.name}</div>
                                                    {item.sku && <div className="text-xs text-muted-foreground">{item.sku}</div>}
                                                </div>
                                                <Badge variant="secondary">{item.quantity} РЎв‚¬РЎвЂљ.</Badge>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    ) : null}

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setIsStoreDeliveryDialogOpen(false);
                                setStoreDeliveryPreview(null);
                            }}
                            disabled={isConfirmingStoreDelivery}
                        >
                            Р С›РЎвЂљР СР ВµР Р…Р В°
                        </Button>
                        <Button
                            onClick={handleConfirmStoreDelivery}
                            disabled={
                                isConfirmingStoreDelivery ||
                                isLoadingStoreDeliveryPreview ||
                                !storeDeliveryPreview?.canConfirm
                            }
                        >
                            {isConfirmingStoreDelivery ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Р С›РЎвЂљР С—РЎР‚Р В°Р Р†Р С”Р В°...
                                </>
                            ) : (
                                "Р СџР С•Р Т‘РЎвЂљР Р†Р ВµРЎР‚Р Т‘Р С‘РЎвЂљРЎРЉ Р С‘ Р С•РЎвЂљР С—РЎР‚Р В°Р Р†Р С‘РЎвЂљРЎРЉ Р Р† Р Р‡Р Р…Р Т‘Р ВµР С”РЎРѓ"
                            )}
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
                            Р СџР С•Р Р†РЎвЂљР С•РЎР‚Р Р…Р С•Р Вµ РЎРѓР С”Р В°Р Р…Р С‘РЎР‚Р С•Р Р†Р В°Р Р…Р С‘Р Вµ
                        </DialogTitle>
                        <DialogDescription>
                            Р В­РЎвЂљР С•РЎвЂљ РЎв‚¬РЎвЂљРЎР‚Р С‘РЎвЂ¦Р С”Р С•Р Т‘ РЎС“Р В¶Р Вµ Р В±РЎвЂ№Р В» Р С•РЎвЂљРЎРѓР С”Р В°Р Р…Р С‘РЎР‚Р С•Р Р†Р В°Р Р… РЎР‚Р В°Р Р…Р ВµР Вµ Р Т‘Р В»РЎРЏ РЎвЂљР С•Р Р†Р В°РЎР‚Р В°:
                        </DialogDescription>
                    </DialogHeader>
                    {duplicateScanPending && (
                        <div className="py-4">
                            <div className="p-4 rounded-xl border border-orange-500/20 bg-orange-500/5">
                                <div className="font-bold text-lg text-orange-500">{duplicateScanPending.item.originalName}</div>
                                <div className="text-sm text-muted-foreground font-mono mt-1 opacity-80">Р РЃР С™: {duplicateScanPending.code}</div>
                                <div className="text-sm font-medium mt-3 flex items-center justify-between">
                                    <span className="text-muted-foreground">Р Р€Р В¶Р Вµ Р С•РЎвЂљРЎРѓР С”Р В°Р Р…Р С‘РЎР‚Р С•Р Р†Р В°Р Р…Р С•:</span>
                                    <span className="font-mono bg-orange-500/10 px-2 py-0.5 rounded text-orange-600 dark:text-orange-400">{duplicateScanPending.item.scannedQuantity} РЎв‚¬РЎвЂљ</span>
                                </div>
                            </div>
                        </div>
                    )}
                    <DialogFooter className="flex gap-2 sm:gap-0">
                        <Button variant="ghost" onClick={() => setDuplicateScanPending(null)}>
                            Р С›РЎвЂљР СР ВµР Р…Р С‘РЎвЂљРЎРЉ
                        </Button>
                        <Button variant="default" onClick={handleConfirmDuplicate}>
                            Р вЂќР В°, Р С—Р ВµРЎР‚Р ВµР в„–РЎвЂљР С‘ Р С” РЎвЂљР С•Р Р†Р В°РЎР‚РЎС“
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Unknown Barcode РІвЂ вЂ™ Product Mapping Dialog */}
            <Dialog open={!!unknownBarcode} onOpenChange={(open) => {
                if (!open) {
                    setUnknownBarcode(null);
                    setSelectedProductForBarcode("");
                    setBarcodeProductSearch("");
                }
            }}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-blue-600">
                            <Search className="h-5 w-5" />
                            Р СњР ВµР С‘Р В·Р Р†Р ВµРЎРѓРЎвЂљР Р…РЎвЂ№Р в„– РЎв‚¬РЎвЂљРЎР‚Р С‘РЎвЂ¦Р С”Р С•Р Т‘
                        </DialogTitle>
                        <DialogDescription>
                            Р РЃРЎвЂљРЎР‚Р С‘РЎвЂ¦Р С”Р С•Р Т‘ Р Р…Р Вµ Р Р…Р В°Р в„–Р Т‘Р ВµР Р… Р Р† Р В±Р В°Р В·Р Вµ. Р вЂ™РЎвЂ№Р В±Р ВµРЎР‚Р С‘РЎвЂљР Вµ, Р С” Р С”Р В°Р С”Р С•Р СРЎС“ РЎвЂљР С•Р Р†Р В°РЎР‚РЎС“ Р С•Р Р… Р С•РЎвЂљР Р…Р С•РЎРѓР С‘РЎвЂљРЎРѓРЎРЏ.
                        </DialogDescription>
                    </DialogHeader>
                    {unknownBarcode && (
                        <div className="space-y-4 py-4">
                            <div className="p-4 rounded-xl border border-blue-500/20 bg-blue-500/5 text-center">
                                <div className="text-xs uppercase tracking-widest text-muted-foreground mb-1 font-bold opacity-70">Р С›РЎвЂљРЎРѓР С”Р В°Р Р…Р С‘РЎР‚Р С•Р Р†Р В°Р Р…Р Р…РЎвЂ№Р в„– Р РЃР С™</div>
                                <div className="font-mono text-2xl font-black text-blue-500 select-all tracking-tight">{unknownBarcode}</div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">Р вЂ™РЎвЂ№Р В±Р ВµРЎР‚Р С‘РЎвЂљР Вµ РЎвЂљР С•Р Р†Р В°РЎР‚ Р Т‘Р В»РЎРЏ Р С—РЎР‚Р С‘Р Р†РЎРЏР В·Р С”Р С‘</Label>
                                <div className="flex items-center gap-2 border-2 rounded-xl px-3 py-2.5 bg-muted/30 focus-within:border-primary/50 transition-colors">
                                    <Search className="h-4 w-4 text-muted-foreground" />
                                    <input
                                        className="flex-1 bg-transparent outline-none text-sm font-medium"
                                        placeholder="Р СџР С•Р С‘РЎРѓР С” Р С—Р С• Р Р…Р В°Р В·Р Р†Р В°Р Р…Р С‘РЎР‹ Р С‘Р В»Р С‘ Р В°РЎР‚РЎвЂљР С‘Р С”РЎС“Р В»РЎС“..."
                                        value={barcodeProductSearch}
                                        onChange={e => setBarcodeProductSearch(e.target.value)}
                                        autoFocus
                                    />
                                </div>
                                <div className="max-h-[250px] overflow-y-auto space-y-1">
                                    {barcodeFilteredProducts.map(product => (
                                        <div
                                            key={product.id}
                                            className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${selectedProductForBarcode === product.id
                                                ? 'bg-primary/10 border-primary'
                                                : 'hover:bg-muted/50'
                                                }`}
                                            onClick={() => setSelectedProductForBarcode(product.id)}
                                        >
                                            <div>
                                                <div className="font-medium text-sm">{product.name}</div>
                                                <div className="text-xs text-muted-foreground">{product.sku}</div>
                                            </div>
                                            {selectedProductForBarcode === product.id && (
                                                <Check className="h-4 w-4 text-primary" />
                                            )}
                                        </div>
                                    ))}
                                    {barcodeFilteredProducts.length === 0 && (
                                        <div className="text-center text-sm text-muted-foreground py-4">
                                            Р СњР С‘РЎвЂЎР ВµР С–Р С• Р Р…Р Вµ Р Р…Р В°Р в„–Р Т‘Р ВµР Р…Р С•
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                    <DialogFooter className="flex gap-2 sm:gap-0">
                        <Button variant="ghost" onClick={() => {
                            setUnknownBarcode(null);
                            setSelectedProductForBarcode("");
                            setBarcodeProductSearch("");
                        }}>
                            Р С›РЎвЂљР СР ВµР Р…Р С‘РЎвЂљРЎРЉ
                        </Button>
                        <Button onClick={handleMapBarcodeToProduct} disabled={!selectedProductForBarcode}>
                            Р СџРЎР‚Р С‘Р Р†РЎРЏР В·Р В°РЎвЂљРЎРЉ Р С‘ Р Т‘Р С•Р В±Р В°Р Р†Р С‘РЎвЂљРЎРЉ
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Add Consumables Dialog */}
            {session && (
                <AddConsumablesDialog
                    open={isAddConsumablesOpen}
                    onOpenChange={setIsAddConsumablesOpen}
                    shipmentId={session.id}
                    warehouseId={session.warehouseId}
                    categories={categories || []}
                    products={products || []}
                    onSuccess={(data) => {
                        // After successfully adding consumables from backend
                        // Ideally we should sync shippingService state or hard refresh
                        // For now we can reload data via shippingService
                        void loadData();
                        toast.success("Р С›РЎвЂљР С–РЎР‚РЎС“Р В·Р С”Р В° Р С•Р В±Р Р…Р С•Р Р†Р В»Р ВµР Р…Р В°: Р Т‘Р С•Р В±Р В°Р Р†Р В»Р ВµР Р…РЎвЂ№ РЎР‚Р В°РЎРѓРЎвЂ¦Р С•Р Т‘Р Р…Р С‘Р С”Р С‘");
                    }}
                />
            )}
        </div>
    );
}
