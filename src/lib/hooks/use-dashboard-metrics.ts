
import { useState, useEffect, useMemo } from "react";
import { useRequests, useAssets, useReceivingSessions, useStockItems } from "@/lib/hooks";
import { shippingService, ShippingSession } from "@/lib/shipping-service";

export interface DashboardMetrics {
    totals: {
        assets: number;
        assetsTrend: number;
        activeRequests: number;
        requestsTrend: number;
        pendingShipments: number;
        shipmentsTrend: number;
        lowStockItems: number;
    };
    activity: {
        date: string;
        requests: number;
        shipments: number;
    }[];
    recentActivity: {
        id: string;
        type: 'request' | 'shipment' | 'receipt';
        title: string;
        subtitle?: string;
        status: string;
        date: Date;
        href: string;
    }[];
    actionRequired: {
        id: string;
        title: string;
        description: string;
        type: 'warning' | 'critical';
        href: string;
    }[];
    isLoading: boolean;
}

export function useDashboardMetrics(): DashboardMetrics {
    const { data: requests, isLoading: isRequestsLoading } = useRequests();
    const { data: assets, isLoading: isAssetsLoading } = useAssets();
    const { data: receipts, isLoading: isReceiptsLoading } = useReceivingSessions();
    const { data: stockItems, isLoading: isStockLoading } = useStockItems();

    const [shipments, setShipments] = useState<ShippingSession[]>([]);

    // Poll for shipments (LocalStorage)
    useEffect(() => {
        const loadShipments = () => {
            setShipments(shippingService.getAll());
        };
        loadShipments();
        const interval = setInterval(loadShipments, 2000);
        return () => clearInterval(interval);
    }, []);

    const metrics = useMemo(() => {
        // 1. Totals
        const totalAssets = assets?.length || 0;

        const activeRequests = requests?.filter(r =>
            ['NEW', 'IN_PROGRESS', 'PENDING', 'APPROVED'].includes(r.status)
        ).length || 0;

        const pendingShipments = shipments?.filter(s =>
            ['picking', 'packed'].includes(s.status)
        ).length || 0;

        // Calculate Low Stock Items (Grouped by Product)
        let lowStockItems = 0;
        if (stockItems) {
            const groups: Record<string, { totalQuantity: number, totalReserved: number, totalMin: number }> = {};

            stockItems.forEach(item => {
                if (!item.product) return;
                const pid = item.product.id;

                if (!groups[pid]) {
                    groups[pid] = { totalQuantity: 0, totalReserved: 0, totalMin: 0 };
                }

                groups[pid].totalQuantity += item.quantity;
                groups[pid].totalReserved += item.reserved;
                groups[pid].totalMin += item.minQuantity;
            });

            lowStockItems = Object.values(groups).filter(g => {
                const available = g.totalQuantity - g.totalReserved;
                // Status logic matches StockPage
                if (available <= 0 && g.totalQuantity === 0) return true; // 'out'
                if (available <= g.totalMin) return true; // 'low'
                return false;
            }).length;
        }

        // 2. Activity Chart (Last 7 days)
        const days = Array.from({ length: 7 }, (_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - (6 - i));
            return d;
        });

        const activity = days.map(day => {
            const dateStr = day.toISOString().split('T')[0];
            const dayRequests = requests?.filter(r => r.createdAt.startsWith(dateStr)).length || 0;
            const dayShipments = shipments?.filter(s => s.createdAt.startsWith(dateStr)).length || 0;

            return {
                date: day.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' }),
                requests: dayRequests,
                shipments: dayShipments
            };
        });

        // 3. Recent Activity (Unified Stream)
        const recentRequests = (requests || []).map(r => ({
            id: r.id,
            type: 'request' as const,
            title: `Заявка: ${r.title}`,
            subtitle: r.store?.name,
            status: r.status,
            date: new Date(r.createdAt),
            href: `/requests/${r.id}`
        }));

        const recentShipments = shipments.map(s => ({
            id: s.id,
            type: 'shipment' as const,
            title: `Отгрузка ${s.requestNumber ? `по заявке ${s.requestNumber}` : ''}`,
            subtitle: s.destination,
            status: s.status,
            date: new Date(s.createdAt),
            href: `/shipments/${s.id}`
        }));

        const recentReceipts = (receipts || []).map(r => ({
            id: r.id,
            type: 'receipt' as const,
            title: `Приемка: ${r.invoiceNumber || 'Без номера'}`,
            subtitle: r.warehouse?.name || r.supplier || 'Склад',
            status: r.status,
            date: new Date(r.createdAt),
            href: `/receiving/${r.id}`
        }));

        const allActivity = [...recentRequests, ...recentShipments, ...recentReceipts]
            .sort((a, b) => b.date.getTime() - a.date.getTime())
            .slice(0, 10);

        // 4. Action Required
        // Example logic: Requests > 2 days in NEW status
        const criticalRequests = (requests || [])
            .filter(r => r.status === 'NEW' && (Date.now() - new Date(r.createdAt).getTime() > 172800000))
            .map(r => ({
                id: r.id,
                title: "Заявка требует внимания",
                description: `${r.store?.name || 'Магазин'} ждет обработки (>${Math.floor((Date.now() - new Date(r.createdAt).getTime()) / 86400000)}д)`,
                type: 'warning' as const,
                href: `/requests/${r.id}`
            }));

        // Example logic: Shipments in Picking for > 1 day
        const stuckShipments = shipments
            .filter(s => s.status === 'picking' && (Date.now() - new Date(s.createdAt).getTime() > 86400000))
            .map(s => ({
                id: s.id,
                title: "Зависла сборка",
                description: `Отгрузка ${s.id} собирается более суток`,
                type: 'warning' as const,
                href: `/shipments/${s.id}`
            }));

        const actionRequired = [...criticalRequests, ...stuckShipments].slice(0, 5);

        // Calculate Trends
        // Assets: % Growth over last 30 days
        let assetsTrend = 0;
        if (assets && assets.length > 0) {
            const now = new Date();
            const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            const oldAssets = assets.filter(a => new Date(a.createdAt) < thirtyDaysAgo).length;
            if (oldAssets > 0) {
                assetsTrend = Math.round(((assets.length - oldAssets) / oldAssets) * 100);
            } else {
                assetsTrend = 100; // All new if no old assets
            }
        }

        // Requests: This week vs Last week
        let requestsTrend = 0;
        if (requests && requests.length > 0) {
            const now = new Date();
            const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

            const newRequestsLastWeek = requests.filter(r => {
                const d = new Date(r.createdAt);
                return d >= oneWeekAgo;
            }).length;

            const newRequestsPrevWeek = requests.filter(r => {
                const d = new Date(r.createdAt);
                return d >= twoWeeksAgo && d < oneWeekAgo;
            }).length;

            if (newRequestsPrevWeek > 0) {
                requestsTrend = Math.round(((newRequestsLastWeek - newRequestsPrevWeek) / newRequestsPrevWeek) * 100);
            } else {
                requestsTrend = newRequestsLastWeek > 0 ? 100 : 0;
            }
        }

        // Shipments: This week vs Last week
        let shipmentsTrend = 0;
        if (shipments && shipments.length > 0) {
            const now = new Date();
            const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

            const shipmentsLastWeek = shipments.filter(s => {
                const d = new Date(s.createdAt);
                return d >= oneWeekAgo;
            }).length;

            const shipmentsPrevWeek = shipments.filter(s => {
                const d = new Date(s.createdAt);
                return d >= twoWeeksAgo && d < oneWeekAgo;
            }).length;

            if (shipmentsPrevWeek > 0) {
                shipmentsTrend = Math.round(((shipmentsLastWeek - shipmentsPrevWeek) / shipmentsPrevWeek) * 100);
            } else {
                shipmentsTrend = shipmentsLastWeek > 0 ? 100 : 0;
            }
        }


        return {
            totals: {
                assets: totalAssets,
                assetsTrend,
                activeRequests,
                requestsTrend,
                pendingShipments,
                shipmentsTrend,
                lowStockItems
            },
            activity,
            recentActivity: allActivity,
            actionRequired,
            isLoading: isRequestsLoading || isAssetsLoading || isReceiptsLoading || isStockLoading
        };
    }, [requests, assets, receipts, shipments, stockItems]);

    return metrics;
}
