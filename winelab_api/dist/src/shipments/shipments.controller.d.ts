import { ShipmentStatus, User } from '@prisma/client';
import { ShipmentsService } from './shipments.service';
export declare class ShipmentsController {
    private shipmentsService;
    constructor(shipmentsService: ShipmentsService);
    findAll(status?: ShipmentStatus): Promise<({
        warehouse: {
            name: string;
        };
        _count: {
            items: number;
        };
        request: {
            id: string;
            title: string;
        };
        assembler: {
            name: string;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        warehouseId: string;
        status: import(".prisma/client").$Enums.ShipmentStatus;
        requestId: string;
        assembledBy: string | null;
    })[]>;
    findOne(id: string): Promise<{
        warehouse: {
            id: string;
            name: string;
            isActive: boolean;
            createdAt: Date;
            address: string | null;
        };
        request: {
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
        } & {
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
        };
        delivery: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            status: import(".prisma/client").$Enums.DeliveryStatus;
            storeId: string;
            shipmentId: string;
            provider: string;
            externalId: string | null;
            courierName: string | null;
            courierPhone: string | null;
            eta: Date | null;
            deliveredAt: Date | null;
        } | null;
        items: ({
            asset: {
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
            };
        } & {
            id: string;
            shipmentId: string;
            assetId: string;
            picked: boolean;
            pickedAt: Date | null;
        })[];
        assembler: {
            id: string;
            name: string;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        warehouseId: string;
        status: import(".prisma/client").$Enums.ShipmentStatus;
        requestId: string;
        assembledBy: string | null;
    }>;
    create(data: {
        requestId: string;
        warehouseId: string;
    }): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        warehouseId: string;
        status: import(".prisma/client").$Enums.ShipmentStatus;
        requestId: string;
        assembledBy: string | null;
    }>;
    addItem(id: string, data: {
        assetId: string;
    }): Promise<{
        id: string;
        shipmentId: string;
        assetId: string;
        picked: boolean;
        pickedAt: Date | null;
    }>;
    pickItem(itemId: string): Promise<{
        id: string;
        shipmentId: string;
        assetId: string;
        picked: boolean;
        pickedAt: Date | null;
    }>;
    updateStatus(id: string, data: {
        status: ShipmentStatus;
    }, user: User): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        warehouseId: string;
        status: import(".prisma/client").$Enums.ShipmentStatus;
        requestId: string;
        assembledBy: string | null;
    }>;
}
