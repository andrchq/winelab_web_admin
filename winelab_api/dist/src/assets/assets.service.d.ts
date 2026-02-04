import { AssetCondition, AssetProcess } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EventsGateway } from '../events/events.gateway';
export declare class AssetsService {
    private prisma;
    private eventsGateway;
    constructor(prisma: PrismaService, eventsGateway: EventsGateway);
    findAll(filters?: {
        condition?: AssetCondition;
        processStatus?: AssetProcess;
    }): Promise<({
        warehouse: {
            name: string;
        } | null;
        product: {
            name: string;
            sku: string;
            category: string;
        };
        store: {
            name: string;
        } | null;
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
    })[]>;
    findById(id: string): Promise<{
        warehouse: {
            id: string;
            name: string;
            isActive: boolean;
            createdAt: Date;
            address: string | null;
        } | null;
        warehouseBin: {
            id: string;
            warehouseId: string;
            code: string;
            description: string | null;
        } | null;
        product: {
            id: string;
            name: string;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            description: string | null;
            sku: string;
            category: string;
            imageUrl: string | null;
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
        } | null;
        assetHistory: {
            id: string;
            createdAt: Date;
            assetId: string;
            action: string;
            location: string | null;
            userId: string | null;
        }[];
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
    }>;
    findBySerialNumber(serialNumber: string): Promise<({
        warehouse: {
            id: string;
            name: string;
            isActive: boolean;
            createdAt: Date;
            address: string | null;
        } | null;
        product: {
            id: string;
            name: string;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            description: string | null;
            sku: string;
            category: string;
            imageUrl: string | null;
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
        } | null;
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
    }) | null>;
    create(data: {
        serialNumber: string;
        productId: string;
        warehouseId?: string;
        warehouseBinId?: string;
        condition?: AssetCondition;
    }): Promise<{
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
    }>;
    updateStatus(id: string, data: {
        condition?: AssetCondition;
        processStatus?: AssetProcess;
    }): Promise<{
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
    }>;
    moveToStore(id: string, storeId: string): Promise<{
        message: string;
    }>;
    markInstalled(id: string): Promise<{
        message: string;
    }>;
    private addHistory;
    delete(id: string): Promise<{
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
    }>;
}
