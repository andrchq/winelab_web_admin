"use client";

import { useEffect, useState, useMemo } from "react";
import {
    ArrowLeft,
    Package,
    Truck,
    CheckCircle2,
    Circle,
    Printer,
    MapPin,
    User,
    Clock,
    ClipboardCheck,
    Plus,
    Search,
    Trash2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { shippingService, ShippingSession, ShippingItem } from "@/lib/shipping-service";
import { useProducts, useWarehouses } from "@/lib/hooks";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter
} from "@/components/ui/dialog";

const statusMap: Record<string, { label: string; variant: "default" | "warning" | "success" | "secondary" | "info" }> = {
    draft: { label: "Черновик", variant: "secondary" },
    picking: { label: "Сборка", variant: "warning" },
    packed: { label: "Собрано", variant: "info" },
    shipped: { label: "Отправлено", variant: "success" },
};

export default function ShipmentDetailPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;

    // Hooks
    const { data: products } = useProducts();
    const { data: warehouses } = useWarehouses();

    // State
    const [session, setSession] = useState<ShippingSession | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isAddItemOpen, setIsAddItemOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [scanCode, setScanCode] = useState("");

    // Load Session
    useEffect(() => {
        const loadSession = () => {
            const data = shippingService.getById(id);
            if (data) {
                setSession(data);
            } else {
                toast.error("Сессия не найдена");
                router.push('/shipments');
            }
            setIsLoading(false);
        };
        loadSession();
        // Poll for updates or just wait for local interactions
        // For local storage, we manually update state
    }, [id, router]);

    const refreshSession = () => {
        const data = shippingService.getById(id);
        if (data) setSession(data);
    };

    const warehouseName = warehouses?.find(w => w.id === session?.warehouseId)?.name || session?.warehouseId;

    // Actions
    const handleAddItem = (productId: string) => {
        if (!session) return;

        const product = products?.find(p => p.id === productId);
        if (!product) return;

        // Check if item already exists
        const existingItem = session.items.find(i => i.productId === productId);
        if (existingItem) {
            // Already added, maybe just increment quantity or show toast
            toast.info("Товар уже в списке, увеличьте количество при сканировании");
        } else {
            // Add new item to session items list
            // We need to update service to support adding item to item list if not present
            // The current service `create` takes initial items.
            // We didn't add `addItem` to service. Let's do it manually here and save.
            const newItem: ShippingItem = {
                id: Math.random().toString(36).substr(2, 9),
                productId: product.id,
                originalName: product.name,
                sku: product.sku,
                quantity: 0, // Target quantity (if request based) or 0 if free picking
                scannedQuantity: 0,
                scans: []
            };

            const updatedSession = { ...session, items: [...session.items, newItem] };
            shippingService.save(updatedSession);
            setSession(updatedSession);
            toast.success("Товар добавлен в список");
        }
        setIsAddItemOpen(false);
    };

    const handleScan = (e: React.FormEvent) => {
        e.preventDefault();
        if (!session || !scanCode) return;

        // Find product by SKU or Barcode
        const product = products?.find(p => p.sku === scanCode || p.barcode === scanCode);
        if (!product) {
            toast.error("Товар не найден");
            setScanCode("");
            return;
        }

        // Find item in session
        let item = session.items.find(i => i.productId === product.id);
        if (!item) {
            // Auto-add if not present?
            // Let's ask user to add it first or auto-add
            // Auto-add for now to be fast
            const newItem: ShippingItem = {
                id: Math.random().toString(36).substr(2, 9),
                productId: product.id,
                originalName: product.name,
                sku: product.sku,
                quantity: 0,
                scannedQuantity: 0,
                scans: []
            };
            // Need to save this new item first, then update it
            const tempSession = { ...session, items: [...session.items, newItem] };
            shippingService.save(tempSession);
            // Now update item
            shippingService.updateItem(session.id, newItem.id, 1, true, scanCode);
            refreshSession();
            toast.success(`Добавлен: ${product.name}`);
        } else {
            shippingService.updateItem(session.id, item.id, 1, true, scanCode);
            refreshSession();
            toast.success(`+1 ${product.name}`);
        }
        setScanCode("");
    };

    const handleUpdateQuantity = (itemId: string, delta: number) => {
        if (!session) return;
        shippingService.updateItem(session.id, itemId, delta, true);
        refreshSession();
    };

    const handleCommit = async () => {
        if (!session) return;
        if (session.items.length === 0 || session.items.reduce((s, i) => s + i.scannedQuantity, 0) === 0) {
            toast.error("Список пуст");
            return;
        }

        if (confirm("Завершить отгрузку? Остатки будут списаны со склада.")) {
            try {
                await shippingService.commit(session.id);
                refreshSession();
                toast.success("Отгрузка завершена");
            } catch (e) {
                toast.error("Ошибка при завершении");
                console.error(e);
            }
        }
    };

    const handleDeleteSession = () => {
        if (confirm("Удалить черновик отгрузки?")) {
            shippingService.delete(session!.id);
            router.push('/shipments');
        }
    };

    const filteredProducts = products?.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchTerm.toLowerCase())
    ).slice(0, 10) || [];

    if (isLoading || !session) {
        return <div className="p-6">Загрузка...</div>;
    }

    return (
        <div className="p-2 md:p-6 pb-24 md:pb-6">
            <div className="mx-auto max-w-4xl space-y-4 md:space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <Link href="/shipments">
                            <Button variant="ghost" size="icon">
                                <ArrowLeft className="h-5 w-5" />
                            </Button>
                        </Link>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-xl font-bold">{session.id}</h1>
                                <Badge variant={statusMap[session.status]?.variant || "secondary"}>
                                    {statusMap[session.status]?.label || session.status}
                                </Badge>
                            </div>
                            <div className="text-sm text-muted-foreground flex items-center gap-4 mt-1">
                                <span className="flex items-center gap-1">
                                    <MapPin className="h-3 w-3" /> {warehouseName} &rarr; {session.destination}
                                </span>
                            </div>
                        </div>
                    </div>
                    {session.status !== 'shipped' && (
                        <div className="flex gap-2">
                            <Button variant="destructive" size="sm" onClick={handleDeleteSession}>
                                <Trash2 className="h-4 w-4 md:mr-2" />
                                <span className="hidden md:inline">Удалить</span>
                            </Button>
                            <Button variant="default" onClick={handleCommit}>
                                <CheckCircle2 className="h-4 w-4 md:mr-2" />
                                <span className="hidden md:inline">Завершить</span>
                                <span className="md:hidden">ОК</span>
                            </Button>
                        </div>
                    )}
                </div>

                {/* Scan Input (if not shipped) */}
                {session.status !== 'shipped' && (
                    <Card>
                        <CardContent className="p-4">
                            <form onSubmit={handleScan} className="flex gap-2">
                                <Input
                                    autoFocus
                                    placeholder="Сканировать SKU или Штрихкод..."
                                    value={scanCode}
                                    onChange={e => setScanCode(e.target.value)}
                                    className="text-lg h-12"
                                />
                                <Button type="submit" size="lg" className="h-12 px-6">OK</Button>
                            </form>
                        </CardContent>
                    </Card>
                )}

                {/* Items List */}
                <Card>
                    <CardHeader className="pb-3 flex flex-row items-center justify-between">
                        <CardTitle>Товары ({session.items.length})</CardTitle>
                        {session.status !== 'shipped' && (
                            <Dialog open={isAddItemOpen} onOpenChange={setIsAddItemOpen}>
                                <DialogTrigger asChild>
                                    <Button variant="outline" size="sm">
                                        <Plus className="h-4 w-4 mr-2" />
                                        Добавить
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-md">
                                    <DialogHeader>
                                        <DialogTitle>Добавить товар в отгрузку</DialogTitle>
                                        <DialogDescription>
                                            Выберите товар из каталога для добавления в список.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <div className="space-y-4 py-4">
                                        <div className="flex items-center gap-2 border rounded-md px-3 py-2">
                                            <Search className="h-4 w-4 text-muted-foreground" />
                                            <input
                                                className="flex-1 bg-transparent outline-none text-sm"
                                                placeholder="Поиск по названию или SKU..."
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
                                                    Ничего не найдено
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </DialogContent>
                            </Dialog>
                        )}
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {session.items.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                Список пуст. Сканируйте товары или добавьте вручную.
                            </div>
                        ) : (
                            session.items.map(item => (
                                <div key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg border bg-card">
                                    <div>
                                        <div className="font-medium">{item.originalName}</div>
                                        <div className="text-xs text-muted-foreground font-mono">{item.sku}</div>
                                    </div>
                                    <div className="flex items-center gap-4 self-end sm:self-auto">
                                        <div className="text-sm font-medium">
                                            {item.scannedQuantity} шт.
                                        </div>
                                        {session.status !== 'shipped' && (
                                            <div className="flex items-center gap-1">
                                                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleUpdateQuantity(item.id, -1)}>
                                                    -
                                                </Button>
                                                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleUpdateQuantity(item.id, 1)}>
                                                    +
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
