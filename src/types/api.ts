// API Types for WineLab Admin

export interface User {
    id: string;
    email: string;
    name: string;
    phone?: string;
    role: string | { name: string; id: string; description?: string } | null;
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

export interface Asset {
    id: string;
    serialNumber: string;
    productId: string;
    storeId?: string;
    warehouseId?: string;
    condition: 'NEW' | 'GOOD' | 'FAIR' | 'REPAIR' | 'DECOMMISSIONED';
    processStatus: 'AVAILABLE' | 'RESERVED' | 'IN_TRANSIT' | 'DELIVERED' | 'INSTALLED';
    createdAt: string;
    notes?: string;
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
    status: 'NEW' | 'IN_PROGRESS' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED';
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
    storeId: string;
    creatorId: string;
    assigneeId?: string;
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
    };
    items?: any[];
    comments?: any[];
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
        role: string;
    };
}

export interface Shipment {
    id: string;
    requestId: string;
    warehouseId: string;
    status: 'PENDING' | 'PICKING' | 'PACKED' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
    assembledBy?: string;
    createdAt: string;
    request?: {
        id: string;
        title: string;
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
    status: 'CREATED' | 'COURIER_ASSIGNED' | 'PICKED_UP' | 'IN_TRANSIT' | 'DELIVERED' | 'PROBLEM' | 'CANCELLED';
    courierName?: string;
    courierPhone?: string;
    deliveredAt?: string;
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
        items?: any[];
        _count?: {
            items: number;
        };
    };
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
        name: string;
    };
}

export interface Warehouse {
    id: string;
    name: string;
    address?: string;
    isActive: boolean;
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
    createdAt: string;
    createdBy?: string;
}

// Receiving Types
export type ReceivingStatus = 'DRAFT' | 'IN_PROGRESS' | 'COMPLETED';

export interface ReceivingItem {
    id: string;
    sessionId: string;
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
    };
}

export interface ReceivingSession {
    id: string;
    warehouseId: string;
    status: ReceivingStatus;
    invoiceNumber?: string;
    supplier?: string;
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
