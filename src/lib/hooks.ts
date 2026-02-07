// Data hooks for fetching from API

import { useState, useEffect, useCallback } from 'react';
import { api, getAuthToken } from './api';
import type {
    Shipment, Delivery, User, StockItem, Warehouse, WarehouseDetails, Request as ApiRequest,
    Asset, Store, Product, EquipmentCategory
} from '@/types/api';

// Categories
export function useCategories() {
    return useList<EquipmentCategory>('/categories');
}

interface UseDataOptions {
    autoFetch?: boolean;
}

interface UseDataResult<T> {
    data: T | null;
    isLoading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
}

interface UseListResult<T> extends Omit<UseDataResult<T[]>, 'data'> {
    data: T[];
}

function useData<T>(
    endpoint: string,
    options: UseDataOptions = { autoFetch: true }
): UseDataResult<T> {
    const [data, setData] = useState<T | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetch = useCallback(async () => {
        if (!getAuthToken()) return;

        setIsLoading(true);
        setError(null);
        try {
            const result = await api.get<T>(endpoint);
            setData(result);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch');
        } finally {
            setIsLoading(false);
        }
    }, [endpoint]);

    useEffect(() => {
        if (options.autoFetch) {
            fetch();
        }
    }, [fetch, options.autoFetch]);

    return { data, isLoading, error, refetch: fetch };
}

const EMPTY_LIST: any[] = [];

function useList<T>(
    endpoint: string,
    options: UseDataOptions = { autoFetch: true }
): UseListResult<T> {
    const result = useData<T[]>(endpoint, options);
    return {
        ...result,
        data: result.data || (EMPTY_LIST as T[]),
    };
}

// Users
export function useUsers() {
    return useList<User>('/users');
}

export function useUser(id: string) {
    return useData<User>(`/users/${id}`);
}


// Assets
export function useAssets() {
    const result = useList<Asset>('/assets');

    useEffect(() => {
        const handleUpdate = () => {
            if (result.refetch) result.refetch();
        };

        socket.on('asset_update', handleUpdate);
        return () => {
            socket.off('asset_update', handleUpdate);
        };
    }, [result.refetch]);

    return result;
}

export function useAsset(id: string) {
    return useData<Asset>(`/assets/${id}`);
}

// Stores
export function useStores() {
    return useList<Store>('/stores');
}

export function useStore(id: string) {
    return useData<Store>(`/stores/${id}`);
}

// Requests
export function useRequests() {
    return useList<ApiRequest>('/requests');
}

export function useRequest(id: string) {
    return useData<ApiRequest>(`/requests/${id}`);
}

// Products
export function useProducts() {
    return useList<Product>('/products');
}

export function useProduct(id: string) {
    return useData<Product>(`/products/${id}`);
}

// Shipments
export function useShipments() {
    return useList<Shipment>('/shipments');
}

export function useShipment(id: string) {
    return useData<Shipment>(`/shipments/${id}`);
}

import { socket } from './socket';

// ... (existing helper functions)

// Deliveries
export function useDeliveries() {
    const result = useList<Delivery>('/deliveries');

    useEffect(() => {
        const handleUpdate = (updatedDelivery: Delivery) => {
            // Optimistically update the list
            if (result.refetch) result.refetch();
        };

        socket.on('delivery_update', handleUpdate);
        return () => {
            socket.off('delivery_update', handleUpdate);
        };
    }, [result.refetch]);

    return result;
}

export function useDelivery(id: string) {
    const result = useData<Delivery>(`/deliveries/${id}`);

    useEffect(() => {
        const handleUpdate = (updatedDelivery: Delivery) => {
            if (updatedDelivery.id === id) {
                if (result.refetch) result.refetch();
            }
        };

        socket.on('delivery_update', handleUpdate);
        return () => {
            socket.off('delivery_update', handleUpdate);
        };
    }, [id, result.refetch]);

    return result;
}

// Stock
export function useStockItems() {
    return useList<StockItem>('/stock');
}

export function useStockItem(id: string) {
    return useData<StockItem>(`/stock/${id}`);
}

// Dashboard stats
export interface DashboardStats {
    totals: {
        assets: number;
        stores: number;
        requests: number;
        deliveries: number;
    };
    assets: {
        byCondition: Record<string, number>;
        byProcess: Record<string, number>;
    };
    requests: {
        byStatus: Record<string, number>;
        recent: any[];
    };
    deliveries: {
        byStatus: Record<string, number>;
        recent: any[];
    };
}

export function useDashboardStats() {
    const result = useData<DashboardStats>('/dashboard/stats');

    useEffect(() => {
        const handleUpdate = () => {
            if (result.refetch) result.refetch();
        };

        // Listen for both specific dashboard stats event and general delivery updates
        // Since delivery updates affect stats
        socket.on('dashboard_stats', handleUpdate);
        socket.on('delivery_update', handleUpdate);
        socket.on('asset_update', handleUpdate);

        return () => {
            socket.off('dashboard_stats', handleUpdate);
            socket.off('delivery_update', handleUpdate);
            socket.off('asset_update', handleUpdate);
        };
    }, [result.refetch]);

    return result;
}

// Warehouses
export function useWarehouses() {
    return useList<Warehouse>('/warehouses');
}

export function useWarehouse(id: string) {
    return useData<WarehouseDetails>(`/warehouses/${id}`);
}

// Receiving Sessions
import type { ReceivingSession } from '@/types/api';

export function useReceivingSessions() {
    const result = useList<ReceivingSession>('/receiving');

    useEffect(() => {
        const handleUpdate = () => {
            if (result.refetch) result.refetch();
        };

        socket.on('receiving_update', handleUpdate);
        socket.on('receiving_delete', handleUpdate);
        return () => {
            socket.off('receiving_update', handleUpdate);
            socket.off('receiving_delete', handleUpdate);
        };
    }, [result.refetch]);

    return result;
}

export function useReceivingSession(id: string) {
    const result = useData<ReceivingSession>(`/receiving/${id}`);

    useEffect(() => {
        const handleUpdate = (updatedSession: ReceivingSession) => {
            if (updatedSession.id === id) {
                if (result.refetch) result.refetch();
            }
        };

        socket.on('receiving_update', handleUpdate);
        return () => {
            socket.off('receiving_update', handleUpdate);
        };
    }, [id, result.refetch]);

    return result;
}
