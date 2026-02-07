import { InvoiceItem } from "./file-parser";

export interface ShippingItem extends InvoiceItem {
    productId: string; // ID from product catalog (required for shipping)
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
    warehouseId: string; // Source warehouse
    destination: string; // Destination (e.g., Store name or Warehouse name)
    items: ShippingItem[];
    status: 'draft' | 'picking' | 'packed' | 'shipped';
    createdAt: string;
    completedAt?: string;
    requestNumber?: string; // Zayavka
    type?: 'manual' | 'request';
}

const STORAGE_KEY = 'winelab_shipping_sessions';

export const shippingService = {
    getAll: (): ShippingSession[] => {
        if (typeof window === 'undefined') return [];
        const data = localStorage.getItem(STORAGE_KEY);
        return data ? JSON.parse(data) : [];
    },

    getById: (id: string): ShippingSession | undefined => {
        if (typeof window === 'undefined') return undefined;
        const sessions = shippingService.getAll();
        return sessions.find(s => s.id === id);
    },

    save: (session: ShippingSession) => {
        const sessions = shippingService.getAll();
        const index = sessions.findIndex(s => s.id === session.id);
        if (index >= 0) {
            sessions[index] = session;
        } else {
            sessions.push(session);
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
    },

    delete: (sessionId: string) => {
        const sessions = shippingService.getAll();
        const filtered = sessions.filter(s => s.id !== sessionId);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    },

    create: (data: Omit<ShippingSession, 'id' | 'createdAt' | 'status' | 'items'> & { items: ShippingItem[] }): ShippingSession => {
        const session: ShippingSession = {
            id: `SHP-${Date.now().toString().slice(-6)}`,
            warehouseId: data.warehouseId,
            destination: data.destination,
            status: 'draft',
            createdAt: new Date().toISOString(),
            items: data.items.map(item => ({
                ...item,
                scannedQuantity: 0,
                scans: []
            })),
            requestNumber: data.requestNumber,
            type: data.type
        };
        shippingService.save(session);
        return session;
    },

    updateItem: (sessionId: string, itemId: string, delta: number, isManual = false, code?: string) => {
        const session = shippingService.getById(sessionId);
        if (!session) return null;

        const itemIndex = session.items.findIndex(i => i.id === itemId);
        if (itemIndex === -1) return null;

        const item = session.items[itemIndex];

        // Add scan record
        if (!item.scans) item.scans = [];
        item.scans.unshift({ // Add to beginning
            id: Math.random().toString(36).substr(2, 9),
            timestamp: Date.now(),
            quantity: delta,
            isManual,
            code
        });

        // Update total
        item.scannedQuantity = item.scans.reduce((acc, s) => acc + s.quantity, 0);

        // Update session status if started
        if (session.status === 'draft') session.status = 'picking';

        shippingService.save(session);
        return session;
    },

    removeScan: (sessionId: string, itemId: string, scanId: string) => {
        const session = shippingService.getById(sessionId);
        if (!session) return null;

        const itemIndex = session.items.findIndex(i => i.id === itemId);
        if (itemIndex === -1) return null;

        const item = session.items[itemIndex];
        if (!item.scans) return session;

        item.scans = item.scans.filter(s => s.id !== scanId);
        item.scannedQuantity = item.scans.reduce((acc, s) => acc + s.quantity, 0);

        shippingService.save(session);
        return session;
    },

    commit: async (sessionId: string) => {
        const session = shippingService.getById(sessionId);
        if (!session) throw new Error("Session not found");

        const itemsToCommit = session.items
            .filter(item => (item.scannedQuantity || 0) !== 0)
            .map(item => ({
                productId: item.productId,
                quantity: item.scannedQuantity
            }));

        if (itemsToCommit.length === 0) {
            throw new Error("No items to commit");
        }

        try {
            const { api } = await import('@/lib/api');
            await api.post('/shipments/commit', {
                warehouseId: session.warehouseId,
                destination: session.destination,
                items: itemsToCommit
            });

            session.status = 'shipped';
            session.completedAt = new Date().toISOString();
            shippingService.save(session);
            return true;
        } catch (e) {
            console.error(e);
            throw e;
        }
    }
};
