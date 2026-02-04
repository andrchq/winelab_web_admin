"use client";

import { useState, useMemo, Fragment } from "react";

import { Warehouse, Plus, Filter, AlertTriangle, TrendingDown, Package, Edit2, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, StatCard } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useStockItems } from "@/lib/hooks";
import { AddStockDialog } from "@/components/stock/add-stock-dialog";
import { StockManagerDialog } from "@/components/stock/stock-manager-dialog";
import { StockItem, Product } from "@/types/api";
import { api } from "@/lib/api";
import { toast } from "sonner"; // Assuming sonner is installed or will be fixed if not
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";

interface GroupedStock {
    product: Product;
    items: StockItem[];
    totalQuantity: number;
    totalReserved: number;
    totalMin: number;
    available: number;
    status: 'ok' | 'low' | 'out';
}

export default function StockPage() {
    const { data: stockItems, isLoading, refetch } = useStockItems();
    const { hasRole } = useAuth();
    const [searchTerm, setSearchTerm] = useState("");
    const [categoryFilter, setCategoryFilter] = useState<string>("all");
    const [showLowStock, setShowLowStock] = useState(false);
    const [expandedGroup, setExpandedGroup] = useState<string | null>(null);

    // Dialog states
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [managerState, setManagerState] = useState<{ open: boolean; product: Product | null; items: StockItem[] }>({
        open: false,
        product: null,
        items: []
    });

    // Grouping Logic
    const groupedItmes = useMemo(() => {
        if (!stockItems) return [];

        const groups: Record<string, GroupedStock> = {};

        stockItems.forEach(item => {
            const pid = item.product?.id;
            if (!pid || !item.product) return;

            if (!groups[pid]) {
                groups[pid] = {
                    product: item.product,
                    items: [],
                    totalQuantity: 0,
                    totalReserved: 0,
                    totalMin: 0,
                    available: 0,
                    status: 'ok'
                };
            }

            groups[pid].items.push(item);
            groups[pid].totalQuantity += item.quantity;
            groups[pid].totalReserved += item.reserved;
            groups[pid].totalMin += item.minQuantity;
        });

        // Calculate final status per group
        return Object.values(groups).map(g => {
            g.available = g.totalQuantity - g.totalReserved;
            if (g.available <= 0 && g.totalQuantity === 0) g.status = 'out';
            else if (g.available <= g.totalMin) g.status = 'low';
            else g.status = 'ok';
            return g;
        });
    }, [stockItems]);

    const categories = useMemo(() => {
        const cats = new Set(groupedItmes.map(g => g.product.category));
        return Array.from(cats).sort();
    }, [groupedItmes]);

    // Filtering
    const filteredGroups = useMemo(() => {
        return groupedItmes.filter(g => {
            const matchesSearch =
                g.product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                g.product.sku.toLowerCase().includes(searchTerm.toLowerCase());

            const matchesCategory = categoryFilter === "all" || g.product.category === categoryFilter;
            const matchesLow = showLowStock ? g.status === 'low' || g.status === 'out' : true;

            return matchesSearch && matchesCategory && matchesLow;
        });
    }, [groupedItmes, searchTerm, categoryFilter, showLowStock]);

    // Stats
    const totalProducts = groupedItmes.length;
    const lowStockCount = groupedItmes.filter(g => g.status === 'low' || g.status === 'out').length;
    const totalReservedGlobal = groupedItmes.reduce((acc, g) => acc + g.totalReserved, 0);


    const handleEditClick = (group: GroupedStock) => {
        setManagerState({
            open: true,
            product: group.product,
            items: group.items
        });
    };

    return (
        <div className="p-6 h-full">
            <div className="space-y-6">
                {/* Page Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">Расходные материалы</h1>
                        <p className="text-sm text-muted-foreground mt-1">Количественный учёт расходников</p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="gradient" onClick={() => setIsAddOpen(true)}>
                            <Plus className="h-4 w-4" />
                            Новая позиция
                        </Button>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid gap-4 md:grid-cols-3">
                    <StatCard
                        title="Всего товаров"
                        value={totalProducts.toLocaleString()}
                        icon={<Package className="h-5 w-5" />}
                        status="success"
                    />
                    <StatCard
                        title="В резерве (всего)"
                        value={totalReservedGlobal.toLocaleString()}
                        icon={<Warehouse className="h-5 w-5" />}
                        status="warning"
                    />
                    <StatCard
                        title="Низкий остаток"
                        value={lowStockCount.toString()}
                        subtitle={lowStockCount > 0 ? "требует внимания" : "всё в норме"}
                        icon={<AlertTriangle className="h-5 w-5" />}
                        status={lowStockCount > 0 ? "danger" : "success"}
                    />
                </div>

                {/* Filters */}
                <Card>
                    <CardContent className="p-4">
                        <div className="flex flex-wrap gap-4 items-center">
                            <div className="flex-1 min-w-[200px] max-w-md">
                                <SearchInput
                                    placeholder="Поиск по названию или SKU..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <div className="w-[200px]">
                                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Категория" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Все категории</SelectItem>
                                        {categories.map(cat => (
                                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <Button
                                variant={showLowStock ? "default" : "outline"}
                                size="sm"
                                onClick={() => setShowLowStock(!showLowStock)}
                            >
                                <Filter className="h-4 w-4" />
                                Только низкий остаток
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                    setSearchTerm("");
                                    setCategoryFilter("all");
                                    setShowLowStock(false);
                                }}
                                className="ml-auto"
                            >
                                Сбросить
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Stock Table */}
                <Card variant="elevated">
                    <CardHeader className="pb-4">
                        <CardTitle className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                                <Warehouse className="h-4 w-4 text-primary" />
                            </div>
                            Остатки материалов
                        </CardTitle>
                        <CardDescription>Актуальные остатки на всех складах</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Наименование</th>
                                        <th>SKU</th>
                                        <th>На складе (всего)</th>
                                        <th>Резерв</th>
                                        <th>Доступно</th>
                                        <th>Мин. остаток</th>
                                        <th>Статус</th>
                                        <th>Действия</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {isLoading ? (
                                        <tr>
                                            <td colSpan={8} className="text-center py-4 text-muted-foreground">
                                                Загрузка данных...
                                            </td>
                                        </tr>
                                    ) : filteredGroups.length === 0 ? (
                                        <tr>
                                            <td colSpan={8} className="text-center py-4 text-muted-foreground">
                                                Позиции не найдены
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredGroups.map((group, index) => {
                                            const fillPercent = Math.min(100, (group.available / (group.totalMin || 1)) * 100);
                                            const isExpanded = expandedGroup === group.product.id;

                                            return (
                                                <Fragment key={group.product.id}>
                                                    <tr
                                                        className={`group cursor-pointer hover:bg-muted/50 transition-colors ${isExpanded ? "bg-muted/50" : ""} ${group.status === 'out' ? "opacity-75 bg-destructive/5" : ""}`}
                                                        onClick={() => setExpandedGroup(isExpanded ? null : group.product.id)}
                                                    >
                                                        <td className="font-medium">
                                                            <div className="flex items-center gap-2">
                                                                {group.product.name}
                                                                <Info className={`h-4 w-4 text-muted-foreground transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                                                            </div>
                                                        </td>
                                                        <td>
                                                            <code className="text-xs bg-muted px-2 py-1 rounded">
                                                                {group.product.sku}
                                                            </code>
                                                        </td>
                                                        <td>
                                                            <span className="font-semibold">{group.totalQuantity} шт</span>
                                                        </td>
                                                        <td className="text-warning">{group.totalReserved} шт</td>
                                                        <td>
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-16 h-2 rounded-full bg-muted overflow-hidden">
                                                                    <div
                                                                        className={`h-full rounded-full transition-all ${group.status !== 'ok' ? 'bg-destructive' : 'bg-success'
                                                                            }`}
                                                                        style={{ width: `${fillPercent}%` }}
                                                                    />
                                                                </div>
                                                                <span className="font-medium">{group.available} шт</span>
                                                            </div>
                                                        </td>
                                                        <td className="text-muted-foreground">{group.totalMin} шт</td>
                                                        <td>
                                                            <div className="flex items-center gap-3">
                                                                <div className="flex gap-[3px]">
                                                                    {Array.from({ length: 10 }).map((_, i) => {
                                                                        let percentage = 0;
                                                                        if (group.totalMin > 0) {
                                                                            if (group.available <= 0) percentage = 0;
                                                                            else if (group.available <= group.totalMin) {
                                                                                percentage = (group.available / group.totalMin) * 30;
                                                                            } else {
                                                                                const surplus = group.available - group.totalMin;
                                                                                const maxSurplus = group.totalMin * 2;
                                                                                percentage = 30 + (Math.min(surplus, maxSurplus) / maxSurplus) * 70;
                                                                            }
                                                                        } else {
                                                                            percentage = group.available > 0 ? 100 : 0;
                                                                        }

                                                                        const filled = i < (percentage / 10);
                                                                        const colorClass = group.status === 'out'
                                                                            ? 'bg-destructive shadow-[0_0_8px_rgba(239,68,68,0.6)]'
                                                                            : group.status === 'low'
                                                                                ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]'
                                                                                : 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]';

                                                                        return (
                                                                            <div
                                                                                key={i}
                                                                                className={`w-1.5 h-6 rounded-full transition-all duration-300 ${filled ? colorClass : 'bg-secondary/40'
                                                                                    }`}
                                                                            />
                                                                        );
                                                                    })}
                                                                </div>
                                                                <div className="flex flex-col min-w-[90px]">
                                                                    <span className={`text-sm font-bold leading-none ${group.status === 'out' ? 'text-destructive' :
                                                                        group.status === 'low' ? 'text-red-500' :
                                                                            'text-emerald-500'
                                                                        }`}>
                                                                        {group.status === 'out' ? 'Нет в наличии' :
                                                                            group.status === 'low' ? 'Мало' :
                                                                                'В норме'}
                                                                    </span>
                                                                    <span className="text-[10px] text-muted-foreground font-mono mt-1">
                                                                        {group.available > 0 && group.totalMin > 0
                                                                            ? `${Math.round((group.available / (group.totalMin * 3)) * 100)}%`
                                                                            : group.available <= 0 ? '0%'
                                                                                : '100%'}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td onClick={(e) => e.stopPropagation()}>
                                                            {hasRole(['ADMIN', 'MANAGER', 'WAREHOUSE']) && (
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="h-8 w-8 p-0"
                                                                    onClick={() => handleEditClick(group)}
                                                                    title="Редактировать"
                                                                >
                                                                    <Edit2 className="h-4 w-4 text-muted-foreground hover:text-primary transition-colors" />
                                                                </Button>
                                                            )}
                                                        </td>
                                                    </tr>
                                                    {isExpanded && (
                                                        <tr className="bg-muted/30 animate-fade-in">
                                                            <td colSpan={8} className="p-4">
                                                                <div className="rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden">
                                                                    <div className="p-3 bg-muted/50 border-b text-xs font-semibold text-muted-foreground grid grid-cols-6 gap-4">
                                                                        <div className="col-span-2">Склад</div>
                                                                        <div className="text-right">Всего</div>
                                                                        <div className="text-right">Резерв</div>
                                                                        <div className="text-right">Мин. остаток</div>
                                                                        <div className="text-right">Статус</div>
                                                                    </div>
                                                                    <div className="divide-y">
                                                                        {group.items.map(item => {
                                                                            const itemAvail = item.quantity - item.reserved;
                                                                            const itemStatus = itemAvail <= item.minQuantity ? 'low' : 'ok';
                                                                            return (
                                                                                <div key={item.id} className="p-3 text-sm grid grid-cols-6 gap-4 items-center">
                                                                                    <div className="col-span-2 font-medium flex items-center gap-2">
                                                                                        <Warehouse className="h-3 w-3 text-muted-foreground" />
                                                                                        {item.warehouse?.name}
                                                                                    </div>
                                                                                    <div className="text-right font-mono">{item.quantity} шт</div>
                                                                                    <div className="text-right font-mono text-warning/90">{item.reserved} шт</div>
                                                                                    <div className="text-right font-mono text-muted-foreground">{item.minQuantity} шт</div>
                                                                                    <div className="text-right">
                                                                                        {itemStatus === 'low' ? (
                                                                                            <span className="text-xs text-destructive font-medium bg-destructive/10 px-2 py-1 rounded">Мало</span>
                                                                                        ) : (
                                                                                            <span className="text-xs text-success font-medium bg-success/10 px-2 py-1 rounded">OK</span>
                                                                                        )}
                                                                                    </div>
                                                                                </div>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    )}
                                                </Fragment>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>

    );
}

