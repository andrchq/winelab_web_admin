import { WarehousesService } from './warehouses.service';
export declare class WarehousesController {
    private warehousesService;
    constructor(warehousesService: WarehousesService);
    findAll(): Promise<({
        stockItems: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            warehouseId: string;
            quantity: number;
            productId: string;
            reserved: number;
            minQuantity: number;
        }[];
    } & {
        id: string;
        name: string;
        isActive: boolean;
        createdAt: Date;
        address: string | null;
    })[]>;
    findOne(id: string): Promise<{
        stats: {
            totalDetails: number;
            lowStockPositions: number;
        };
        recentRequests: {
            id: string;
            date: Date;
            engineer: {
                id: string;
                email: string;
                password: string;
                name: string;
                phone: string | null;
                role: import(".prisma/client").$Enums.Role;
                isActive: boolean;
                createdAt: Date;
                updatedAt: Date;
            };
            store: {
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
            };
            itemsCount: number;
        }[];
        recentInstallations: {
            id: string;
            date: Date;
            store: {
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
            };
            items: string[];
        }[];
        newStores: ({
            _count: {
                assets: number;
            };
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
        })[];
        stockItems: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            warehouseId: string;
            quantity: number;
            productId: string;
            reserved: number;
            minQuantity: number;
        }[];
        id: string;
        name: string;
        isActive: boolean;
        createdAt: Date;
        address: string | null;
    } | null>;
    create(data: {
        name: string;
        address?: string;
    }): Promise<{
        id: string;
        name: string;
        isActive: boolean;
        createdAt: Date;
        address: string | null;
    }>;
    update(id: string, data: {
        name?: string;
        address?: string;
    }): Promise<{
        id: string;
        name: string;
        isActive: boolean;
        createdAt: Date;
        address: string | null;
    }>;
    delete(id: string): Promise<{
        id: string;
        name: string;
        isActive: boolean;
        createdAt: Date;
        address: string | null;
    }>;
}
