import { api } from "./api";
import { InvoiceItem } from "./file-parser";

export interface ReceivingItem {
    id: string;
    name: string;
    sku?: string;
    expectedQuantity: number;
    scannedQuantity: number;
    productId?: string;
    scans?: {
        id: string;
        timestamp: number | string;
        quantity: number;
        isManual: boolean;
        code?: string;
    }[];
}

export interface ReceivingSession {
    id: string;
    warehouseId: string;
    items: ReceivingItem[];
    status: 'draft' | 'in_progress' | 'completed' | 'DRAFT' | 'IN_PROGRESS' | 'COMPLETED'; // Handle both casing
    createdAt: string;
    completedAt?: string;
    invoiceNumber?: string;
    supplier?: string;
    type?: 'manual' | 'file';
    warehouse?: { id: string; name: string };
    createdBy?: { id: string; name: string };
}

export const receivingService = {
    getAll: async (): Promise<ReceivingSession[]> => {
        try {
            return await api.get<ReceivingSession[]>('/receiving');
        } catch (error) {
            console.error('Failed to fetch sessions:', error);
            return [];
        }
    },

    getById: async (id: string): Promise<ReceivingSession | null> => {
        try {
            return await api.get<ReceivingSession>(`/receiving/${id}`);
        } catch (error) {
            console.error(`Failed to fetch session ${id}:`, error);
            return null;
        }
    },

    create: async (data: {
        warehouseId: string;
        items: InvoiceItem[];
        mapping: Record<string, string>;
        invoiceNumber?: string;
        supplier?: string;
        type?: 'manual' | 'file';
    }) => {
        // Map frontend data structure to backend expected DTO
        const payload = {
            warehouseId: data.warehouseId,
            invoiceNumber: data.invoiceNumber,
            supplier: data.supplier,
            type: data.type,
            items: data.items.map(item => ({
                name: item.originalName,
                sku: item.sku,
                expectedQuantity: item.quantity,
                productId: data.mapping[item.id]
            }))
        };

        return await api.post<ReceivingSession>('/receiving', payload);
    },

    updateItem: async (sessionId: string, itemId: string, delta: number, isManual = false, code?: string) => {
        return await api.patch<ReceivingSession>(`/receiving/${sessionId}/items/${itemId}`, {
            scannedQuantity: delta,
            isManual,
            code
        });
    },

    removeScan: async (sessionId: string, itemId: string, scanId: string) => {
        return await api.delete<ReceivingSession>(`/receiving/${sessionId}/items/${itemId}/scans/${scanId}`);
    },

    commit: async (sessionId: string) => {
        return await api.post<{ success: true }>(`/receiving/${sessionId}/complete`);
    },

    delete: async (sessionId: string) => {
        return await api.delete<{ success: true }>(`/receiving/${sessionId}`);
    }
};

