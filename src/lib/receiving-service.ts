import { InvoiceItem } from "./file-parser";

export interface ReceivingItem extends InvoiceItem {
    mappedProductId?: string; // ID from product catalog
    scannedQuantity: number;
    // We can track individual scans here too if needed
    scans?: {
        id: string;
        timestamp: number;
        quantity: number;
        isManual: boolean;
    }[];
}

export interface ReceivingSession {
    id: string;
    warehouseId: string;
    items: ReceivingItem[];
    status: 'draft' | 'in_progress' | 'completed';
    createdAt: string;
    completedAt?: string;
    invoiceNumber?: string;
    supplier?: string;
}

const STORAGE_KEY = 'winelab_receiving_sessions';

export const receivingService = {
    getAll: (): ReceivingSession[] => {
        if (typeof window === 'undefined') return [];
        const data = localStorage.getItem(STORAGE_KEY);
        return data ? JSON.parse(data) : [];
    },

    getById: (id: string): ReceivingSession | undefined => {
        if (typeof window === 'undefined') return undefined;
        const sessions = receivingService.getAll();
        return sessions.find(s => s.id === id);
    },

    save: (session: ReceivingSession) => {
        const sessions = receivingService.getAll();
        const index = sessions.findIndex(s => s.id === session.id);
        if (index >= 0) {
            sessions[index] = session;
        } else {
            sessions.push(session);
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
    },

    delete: (sessionId: string) => {
        const sessions = receivingService.getAll();
        const filtered = sessions.filter(s => s.id !== sessionId);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    },

    create: (data: Omit<ReceivingSession, 'id' | 'createdAt' | 'status' | 'items'> & { items: InvoiceItem[], mapping: Record<string, string> }): ReceivingSession => {
        const session: ReceivingSession = {
            id: `REC-${Date.now().toString().slice(-6)}`,
            warehouseId: data.warehouseId,
            status: 'draft',
            createdAt: new Date().toISOString(),
            items: data.items.map(item => ({
                ...item,
                mappedProductId: data.mapping[item.id],
                scannedQuantity: 0,
                scans: []
            })),
            invoiceNumber: data.invoiceNumber
        };
        receivingService.save(session);
        return session;
    },

    updateItem: (sessionId: string, itemId: string, delta: number, isManual = false, code?: string) => {
        const session = receivingService.getById(sessionId);
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
            // @ts-ignore
            code
        });

        // Update total
        item.scannedQuantity = item.scans.reduce((acc, s) => acc + s.quantity, 0);

        // Update session status if started
        if (session.status === 'draft') session.status = 'in_progress';

        receivingService.save(session);
        return session;
    },

    removeScan: (sessionId: string, itemId: string, scanId: string) => {
        const session = receivingService.getById(sessionId);
        if (!session) return null;

        const itemIndex = session.items.findIndex(i => i.id === itemId);
        if (itemIndex === -1) return null;

        const item = session.items[itemIndex];
        if (!item.scans) return session;

        item.scans = item.scans.filter(s => s.id !== scanId);
        item.scannedQuantity = item.scans.reduce((acc, s) => acc + s.quantity, 0);

        receivingService.save(session);
        return session;
    },

    commit: async (sessionId: string) => {
        const session = receivingService.getById(sessionId);
        if (!session) throw new Error("Session not found");

        const itemsToCommit = session.items
            .filter(item => item.mappedProductId && (item.scannedQuantity || 0) !== 0)
            .map(item => ({
                productId: item.mappedProductId!,
                quantity: item.scannedQuantity
            }));

        if (itemsToCommit.length === 0) {
            throw new Error("No items to commit");
        }

        try {
            // Import api dynamically to avoid cycle if any, or just use fetch
            // Using standard fetch for simplicity in this specific service pattern or assuming global api
            // Let's use the local api util
            // We need to import it at top of file, but let's assume it's available or use window.fetch
            const { api } = await import('@/lib/api');
            await api.post('/receiving/commit', {
                warehouseId: session.warehouseId,
                items: itemsToCommit
            });

            session.status = 'completed';
            session.completedAt = new Date().toISOString();
            receivingService.save(session);
            return true;
        } catch (e) {
            console.error(e);
            throw e;
        }
    }
};
