import { api } from "./api";
import { Asset, Shipment } from "@/types/api";

export interface ShippingItem {
    id: string;
    productId: string;
    originalName: string;
    sku: string;
    accountingType?: "SERIALIZED" | "QUANTITY";
    quantity: number;
    expectedQuantity: number;
    scannedQuantity: number;
    scans?: {
        id: string;
        timestamp: number;
        quantity: number;
        isManual: boolean;
        code?: string;
    }[];
}

export interface ShippingSession {
    id: string;
    warehouseId: string;
    destination: string;
    destinationType: "store" | "warehouse" | "other";
    destinationId?: string;
    items: ShippingItem[];
    status: "draft" | "picking" | "packed" | "shipped";
    createdAt: string;
    completedAt?: string;
    requestNumber?: string;
    invoiceNumber?: string;
    supplier?: string;
    type: "manual" | "file";
    linkedReceivingId?: string;
    request?: {
        id: string;
        title: string;
        deliveryContactName?: string;
        deliveryContactPhone?: string;
        deliveryComment?: string;
    };
    delivery?: {
        id: string;
        status: string;
        provider?: string;
    };
}

export interface StoreDeliveryPreview {
    shipmentId: string;
    provider: string;
    canConfirm: boolean;
    yandexConfigured: boolean;
    warnings: string[];
    source: {
        warehouseId: string;
        name: string;
        address?: string;
        contactName?: string;
        phone?: string;
        email?: string;
    };
    destination: {
        storeId: string;
        name: string;
        address?: string;
        contactName?: string;
        phone?: string;
        comment?: string;
    };
    items: {
        id: string;
        name: string;
        sku?: string | null;
        quantity: number;
    }[];
}

type CreateShippingSessionInput = {
    requestId?: string;
    warehouseId: string;
    destination: string;
    destinationType: "store" | "warehouse" | "other";
    destinationId?: string;
    items: ShippingItem[];
    requestNumber?: string;
    invoiceNumber?: string;
    supplier?: string;
    type: "manual" | "file";
};

function normalizeShipment(payload: Shipment | ShippingSession): ShippingSession {
    if ("destination" in payload && "items" in payload) {
        return payload as ShippingSession;
    }

    throw new Error("Unsupported shipment payload");
}

export const shippingService = {
    async getAll(): Promise<ShippingSession[]> {
        const response = await api.get<ShippingSession[]>("/shipments");
        return response.map((item) => normalizeShipment(item));
    },

    async getById(id: string): Promise<ShippingSession | undefined> {
        try {
            const response = await api.get<ShippingSession>(`/shipments/${id}`);
            return normalizeShipment(response);
        } catch {
            return undefined;
        }
    },

    async delete(sessionId: string) {
        await api.delete(`/shipments/${sessionId}`);
    },

    async create(data: CreateShippingSessionInput): Promise<ShippingSession> {
        const response = await api.post<ShippingSession>("/shipments", data);
        return normalizeShipment(response);
    },

    async addItem(sessionId: string, item: Omit<ShippingItem, "id" | "scannedQuantity" | "scans">): Promise<ShippingItem> {
        return api.post<ShippingItem>(`/shipments/${sessionId}/lines`, {
            productId: item.productId,
            originalName: item.originalName,
            sku: item.sku,
            quantity: item.quantity,
            expectedQuantity: item.expectedQuantity,
        });
    },

    async updateItem(sessionId: string, itemId: string, delta: number, isManual = false, code?: string): Promise<ShippingSession> {
        const response = await api.post<ShippingSession>(`/shipments/${sessionId}/lines/${itemId}/scans`, {
            quantity: delta,
            isManual,
            code,
        });
        return normalizeShipment(response);
    },

    async removeScan(sessionId: string, itemId: string, scanId: string): Promise<ShippingSession> {
        const response = await api.delete<ShippingSession>(`/shipments/${sessionId}/lines/${itemId}/scans/${scanId}`);
        return normalizeShipment(response);
    },

    async commit(sessionId: string): Promise<ShippingSession> {
        const response = await api.post<ShippingSession>(`/shipments/${sessionId}/commit`);
        return normalizeShipment(response);
    },

    async getStoreDeliveryPreview(sessionId: string): Promise<StoreDeliveryPreview> {
        return api.get<StoreDeliveryPreview>(`/shipments/${sessionId}/store-delivery-preview`);
    },

    async confirmStoreDelivery(sessionId: string): Promise<ShippingSession> {
        const response = await api.post<ShippingSession>(`/shipments/${sessionId}/confirm-store-delivery`);
        return normalizeShipment(response);
    },

    async findAssetBySerial(serial: string): Promise<Asset | null> {
        const response = await api.get<Asset | null>(`/assets/serial/${encodeURIComponent(serial)}`);
        return response;
    },
};
