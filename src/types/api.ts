// API Types for WineLab Admin

export interface User {
    id: string;
    email: string;
    name: string;
    phone?: string;
    role: string | { name: string; id: string; description?: string } | null;
    warehouse?: {
        id: string;
        name: string;
    } | null;
    permissions: string[];
    isActive: boolean;
    createdAt: string;
}

export interface Permission {
    id: string;
    code: string;
    description: string;
}

export interface Role {
    id: string;
    name: string;
    description?: string;
    isSystem: boolean;
    permissions: { permission: Permission }[];
    _count?: {
        users: number;
    };
}

export interface AuthTokens {
    accessToken: string;
    refreshToken: string;
}

export interface LoginResponse {
    user: User;
    accessToken: string;
    refreshToken: string;
}

export interface BootstrapStatus {
    requiresSetup: boolean;
    userCount: number;
}

export interface EquipmentCategory {
    id: string;
    code: string;
    name: string;
    isMandatory: boolean;
    parentId?: string;
    parent?: EquipmentCategory;
    children?: EquipmentCategory[];
}

export interface Product {
    id: string;
    name: string;
    sku: string;
    barcode?: string;
    accountingType?: 'SERIALIZED' | 'QUANTITY';
    categoryId: string;
    category: EquipmentCategory;
    description?: string;
    isActive: boolean;
    createdAt: string;
    _count?: {
        assets: number;
    };
    stats?: {
        stock: number;
        reserved: number;
        available: number;
    };
}

export interface AssetHistory {
    id: string;
    assetId: string;
    action: string;
    details?: string;
    fromStatus?: string;
    toStatus?: string;
    location?: string;
    userId?: string;
    createdAt: string;
    user?: {
        name: string;
        role: string;
    };
    // Helper to support legacy/mapped usage if needed, or we just switch to 'action'
}

export interface Asset {
    id: string;
    serialNumber: string;
    isUnidentified?: boolean;
    installationConfirmed?: boolean;
    productId: string;
    storeId?: string;
    warehouseId?: string;
    condition: 'WORKING' | 'NEEDS_REPAIR' | 'DECOMMISSIONED' | 'IN_REPAIR' | 'UNKNOWN';
    processStatus: 'AVAILABLE' | 'RESERVED' | 'IN_TRANSIT' | 'LOST_IN_TRANSIT' | 'DELIVERED' | 'INSTALLED' | 'UNSERVICED';
    createdAt: string;
    notes?: string;
    history?: AssetHistory[]; // New field for history/comments
    movements?: any[];
    product?: {
        id: string;
        name: string;
        sku: string;
        category: string;
    };
    store?: {
        id: string;
        name: string;
    };
    warehouse?: {
        id: string;
        name: string;
    };
}

export type StoreStatus = 'OPEN' | 'CLOSED' | 'RECONSTRUCTION' | 'TECHNICAL_ISSUES';

export interface Store {
    id: string;
    name: string;
    address: string;
    externalId?: string;
    city?: string;
    cfo?: string;
    region?: string;
    phone?: string;
    email?: string;
    manager?: string;
    status?: StoreStatus;
    // Technical Info
    serverIp?: string;
    providerIp1?: string;
    providerIp2?: string;
    utmUrl?: string;
    retailUrl?: string;
    // Legal Info
    legalEntity?: string;
    inn?: string;
    kpp?: string;
    fsrarId?: string;
    // CCTV
    cctvSystem?: string;
    cameraCount?: number;
    isActive: boolean;
    createdAt: string;
    _count?: {
        assets: number;
        requests: number;
    };
    stats?: {
        installed: number;
        pending: number;
        inTransit: number;
    };
    assets?: any[];
    requests?: any[];
    equipment?: StoreEquipment[];
    creator?: {
        name: string;
    };
}

export interface Request {
    id: string;
    title: string;
    description?: string;
    deliveryContactName?: string;
    deliveryContactPhone?: string;
    deliveryComment?: string;
    status: 'NEW' | 'IN_PROGRESS' | 'READY' | 'SHIPPED' | 'COMPLETED' | 'CANCELLED';
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    storeId: string;
    creatorId: string;
    assigneeId?: string;
    updatedAt?: string;
    createdAt: string;
    store?: {
        id: string;
        name: string;
    };
    creator?: {
        id: string;
        name: string;
    };
    assignee?: {
        id: string;
        name: string;
        email?: string;
    };
    items?: RequestItem[];
    comments?: Comment[];
    shipments?: Shipment[];
    _count?: {
        comments: number;
        items: number;
    };
}

export interface Comment {
    id: string;
    text: string;
    userId: string;
    requestId: string;
    createdAt: string;
    user?: {
        name: string;
        role: string | { name: string; id: string; description?: string } | null;
    };
}

export interface RequestItem {
    id: string;
    requestId: string;
    assetId: string;
    notes?: string;
    asset?: Asset & {
        product?: {
            id: string;
            name: string;
            sku: string;
            category?: EquipmentCategory;
        };
    };
}

export interface Shipment {
    id: string;
    requestId?: string;
    warehouseId: string;
    destination: string;
    destinationName?: string;
    destinationType: 'store' | 'warehouse' | 'other';
    destinationId?: string;
    status: 'draft' | 'picking' | 'packed' | 'shipped' | 'DRAFT' | 'PICKING' | 'READY' | 'SHIPPED' | 'DELIVERED';
    assembledBy?: string;
    createdAt: string;
    completedAt?: string;
    requestNumber?: string;
    invoiceNumber?: string;
    supplier?: string;
    type: 'manual' | 'file';
    linkedReceivingId?: string;
    items: {
        id: string;
        productId: string;
        originalName: string;
        sku: string;
        accountingType?: 'SERIALIZED' | 'QUANTITY';
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
    }[];
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
    warehouse?: {
        name: string;
    };
    assembler?: {
        name: string;
    };
    _count?: {
        items: number;
    };
}

export interface Delivery {
    id: string;
    shipmentId: string;
    storeId: string;
    provider: string;
    externalId?: string;
    externalVersion?: number;
    rawStatus?: string;
    status: 'CREATED' | 'COURIER_ASSIGNED' | 'PICKED_UP' | 'IN_TRANSIT' | 'DELIVERED' | 'PROBLEM' | 'CANCELLED';
    courierName?: string;
    courierPhone?: string;
    sourceContactName?: string;
    sourceContactPhone?: string;
    sourceContactEmail?: string;
    recipientContactName?: string;
    recipientContactPhone?: string;
    recipientComment?: string;
    deliveredAt?: string;
    confirmedAt?: string;
    lastSyncAt?: string;
    createdAt: string;
    trackingUrl?: string;
    pickedUpAt?: string;
    updatedAt?: string;
    store?: {
        id: string;
        name: string;
        address: string;
    };
    shipment?: {
        id?: string;
        request?: {
            id: string;
            status?: string;
        };
        items?: any[];
        lines?: {
            id: string;
            originalName?: string;
            sku?: string | null;
            scannedQuantity: number;
            expectedQuantity?: number;
            product?: Product;
            scans?: {
                id: string;
                code?: string | null;
                quantity: number;
            }[];
        }[];
        _count?: {
            items?: number;
            lines?: number;
        };
    };
    events?: DeliveryEvent[];
}

export interface DeliveryEvent {
    id: string;
    deliveryId: string;
    title: string;
    description?: string;
    timestamp: string;
}

export interface ApiError {
    message: string;
    statusCode: number;
    error?: string;
}

export interface StockItem {
    id: string;
    productId: string;
    warehouseId: string;
    quantity: number;
    reserved: number;
    minQuantity: number;
    createdAt: string;
    updatedAt: string;
    product?: Product;
    warehouse?: {
        id?: string;
        name: string;
    };
    source?: 'STOCK_ITEM' | 'ASSET_AGGREGATE' | 'MIXED';
}

export interface Warehouse {
    id: string;
    name: string;
    address?: string;
    contactName?: string;
    phone?: string;
    email?: string;
    isActive: boolean;
    initialInventoryCompletedAt?: string | null;
    stockItems?: StockItem[];
}

export interface WarehouseDetails extends Warehouse {
    stockItems?: StockItem[];
    stats: {
        totalDetails: number;
        lowStockPositions: number;
    };
    recentRequests: {
        id: string;
        date: string;
        engineer: User;
        store: Store;
        itemsCount: number;
    }[];
    recentInstallations: {
        id: string;
        date: string;
        store: Store;
        items: string[];
    }[];
    newStores: Store[];
}

export interface InitialInventoryScan {
    id: string;
    code: string;
    linkedAssetId?: string | null;
    conflictType?: 'STORE_ASSET' | 'OTHER_WAREHOUSE' | 'PROCESS_CONFLICT' | null;
    sourceWarehouseId?: string | null;
    sourceStoreId?: string | null;
    sourceProcessStatus?: string | null;
    requiresReview?: boolean;
    reviewedAt?: string | null;
    createdAt: string;
}

export type NotificationScope = 'GLOBAL' | 'ROLE' | 'USER';
export type NotificationType = 'SYSTEM' | 'REQUEST' | 'DELIVERY' | 'RECEIVING' | 'SHIPMENT' | 'STORE' | 'INVENTORY' | 'SECURITY';

export interface NotificationItem {
    id: string;
    title: string;
    message: string;
    type: NotificationType;
    link?: string | null;
    meta?: Record<string, unknown> | null;
    createdAt: string;
    isRead: boolean;
    audience: {
        scope: NotificationScope;
        roles: string[];
        userId?: string | null;
        warehouseId?: string | null;
    };
}

export interface NotificationsResponse {
    items: NotificationItem[];
    unreadCount: number;
    stats: {
        total: number;
        unread: number;
        personalUnread: number;
        roleUnread: number;
        globalUnread: number;
    };
}

export interface InitialInventoryEntry {
    id: string;
    sessionId: string;
    productId: string;
    quantity: number;
    createdAt: string;
    updatedAt: string;
    product: Product;
    scans: InitialInventoryScan[];
}

export interface InitialInventorySession {
    id: string;
    warehouseId: string;
    createdById: string;
    status: 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
    createdAt: string;
    updatedAt: string;
    completedAt?: string | null;
    warehouse: {
        id: string;
        name: string;
        initialInventoryCompletedAt?: string | null;
    };
    createdBy: {
        id: string;
        name: string;
    };
    entries: InitialInventoryEntry[];
}

export interface PingStatusResponse {
    server: { success: boolean; time?: string };
    provider1: { success: boolean; time?: string };
    provider2: { success: boolean; time?: string };
}



export interface StoreEquipment {
    id: string;
    storeId: string;
    assetId?: string;      // Связь с серийным оборудованием (если есть)
    category: EquipmentCategory;
    productName: string;   // Название модели
    serialNumber?: string;
    comment?: string;      // Комментарий (max 120 символов)
    skipInventory: boolean; // Добавлено без списания со склада
    installationConfirmed?: boolean;
    createdAt: string;
    createdBy?: string;
}

// Receiving Types
export type ReceivingStatus = 'DRAFT' | 'IN_PROGRESS' | 'COMPLETED';
export type ReceivingSourceType = 'INTERNAL' | 'EXTERNAL';

export interface ReceivingItem {
    id: string;
    sessionId: string;
    linkedAssetId?: string;
    name: string;
    sku?: string;
    expectedQuantity: number;
    scannedQuantity: number;
    productId?: string;
    createdAt: string;
    updatedAt: string;
    product?: {
        id: string;
        name: string;
        sku: string;
        accountingType?: 'SERIALIZED' | 'QUANTITY';
    };
    linkedAsset?: {
        id: string;
        serialNumber: string;
        isUnidentified: boolean;
        productId: string;
        condition: string;
        processStatus: string;
    };
}

export interface ReceivingSession {
    id: string;
    warehouseId: string;
    status: ReceivingStatus;
    invoiceNumber?: string;
    supplier?: string;
    sourceType?: ReceivingSourceType;
    hasDiscrepancy?: boolean;
    discrepancyDetails?: string | null;
    createdById: string;
    createdAt: string;
    updatedAt: string;
    completedAt?: string;
    warehouse?: {
        id: string;
        name: string;
    };
    createdBy?: {
        id: string;
        name: string;
    };
    completedBy?: {
        id: string;
        name: string;
    };
    items: ReceivingItem[];

}
