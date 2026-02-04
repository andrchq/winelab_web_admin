import { StoresService } from './stores.service';
export declare class StoresController {
    private storesService;
    constructor(storesService: StoresService);
    import(file: any): Promise<{
        message: string;
        stats: {
            created: number;
            updated: number;
            total: number;
        };
        errors: string[] | undefined;
    }>;
    findAll(): Promise<{
        stats: {
            installed: number;
            pending: number;
            inTransit: number;
        };
        creator: {
            name: string;
        } | null;
        _count: {
            requests: number;
            assets: number;
        };
        id: string;
        email: string | null;
        name: string;
        phone: string | null;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        address: string;
        city: string | null;
        cfo: string | null;
        serverIp: string | null;
        providerIp1: string | null;
        providerIp2: string | null;
        utmUrl: string | null;
        retailUrl: string | null;
        legalEntity: string | null;
        inn: string | null;
        kpp: string | null;
        fsrarId: string | null;
        cctvSystem: string | null;
        cameraCount: number | null;
        region: string | null;
        manager: string | null;
        status: import(".prisma/client").$Enums.StoreStatus;
        createdById: string | null;
    }[]>;
    findOne(id: string): Promise<{
        requests: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            description: string | null;
            status: import(".prisma/client").$Enums.RequestStatus;
            title: string;
            storeId: string;
            priority: import(".prisma/client").$Enums.RequestPriority;
            creatorId: string;
            assigneeId: string | null;
        }[];
        assets: ({
            product: {
                name: string;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            warehouseId: string | null;
            productId: string;
            condition: import(".prisma/client").$Enums.AssetCondition;
            processStatus: import(".prisma/client").$Enums.AssetProcess;
            serialNumber: string;
            purchaseDate: Date | null;
            warrantyUntil: Date | null;
            notes: string | null;
            warehouseBinId: string | null;
            storeId: string | null;
        })[];
    } & {
        id: string;
        email: string | null;
        name: string;
        phone: string | null;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        address: string;
        city: string | null;
        cfo: string | null;
        serverIp: string | null;
        providerIp1: string | null;
        providerIp2: string | null;
        utmUrl: string | null;
        retailUrl: string | null;
        legalEntity: string | null;
        inn: string | null;
        kpp: string | null;
        fsrarId: string | null;
        cctvSystem: string | null;
        cameraCount: number | null;
        region: string | null;
        manager: string | null;
        status: import(".prisma/client").$Enums.StoreStatus;
        createdById: string | null;
    }>;
    create(data: {
        name: string;
        address: string;
        region?: string;
    }, req: any): Promise<{
        id: string;
        email: string | null;
        name: string;
        phone: string | null;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        address: string;
        city: string | null;
        cfo: string | null;
        serverIp: string | null;
        providerIp1: string | null;
        providerIp2: string | null;
        utmUrl: string | null;
        retailUrl: string | null;
        legalEntity: string | null;
        inn: string | null;
        kpp: string | null;
        fsrarId: string | null;
        cctvSystem: string | null;
        cameraCount: number | null;
        region: string | null;
        manager: string | null;
        status: import(".prisma/client").$Enums.StoreStatus;
        createdById: string | null;
    }>;
    update(id: string, data: {
        name?: string;
        address?: string;
    }): Promise<{
        id: string;
        email: string | null;
        name: string;
        phone: string | null;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        address: string;
        city: string | null;
        cfo: string | null;
        serverIp: string | null;
        providerIp1: string | null;
        providerIp2: string | null;
        utmUrl: string | null;
        retailUrl: string | null;
        legalEntity: string | null;
        inn: string | null;
        kpp: string | null;
        fsrarId: string | null;
        cctvSystem: string | null;
        cameraCount: number | null;
        region: string | null;
        manager: string | null;
        status: import(".prisma/client").$Enums.StoreStatus;
        createdById: string | null;
    }>;
    ping(id: string): Promise<{
        server: boolean;
        provider1: boolean;
        provider2: boolean;
    }>;
    delete(id: string): Promise<{
        message: string;
    }>;
    addEquipment(id: string, data: {
        equipment: Array<{
            category: string;
            stockItemId: string;
            comment: string;
        }>;
        skipInventory: boolean;
        warehouseId: string;
    }): Promise<{
        message: string;
        equipment: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            warehouseId: string | null;
            productId: string;
            condition: import(".prisma/client").$Enums.AssetCondition;
            processStatus: import(".prisma/client").$Enums.AssetProcess;
            serialNumber: string;
            purchaseDate: Date | null;
            warrantyUntil: Date | null;
            notes: string | null;
            warehouseBinId: string | null;
            storeId: string | null;
        }[];
    }>;
}
