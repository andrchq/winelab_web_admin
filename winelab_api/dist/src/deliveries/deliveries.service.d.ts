import { DeliveryStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EventsGateway } from '../events/events.gateway';
export declare class DeliveriesService {
    private prisma;
    private eventsGateway;
    constructor(prisma: PrismaService, eventsGateway: EventsGateway);
    findAll(filters?: {
        status?: DeliveryStatus;
    }): Promise<({
        store: {
            name: string;
            address: string;
        };
        shipment: {
            _count: {
                items: number;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            warehouseId: string;
            status: import(".prisma/client").$Enums.ShipmentStatus;
            requestId: string;
            assembledBy: string | null;
        };
    } & {
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
    })[]>;
    findById(id: string): Promise<{
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
        shipment: {
            request: {
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
            items: ({
                asset: {
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
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            warehouseId: string;
            status: import(".prisma/client").$Enums.ShipmentStatus;
            requestId: string;
            assembledBy: string | null;
        };
        events: {
            id: string;
            description: string | null;
            title: string;
            timestamp: Date;
            deliveryId: string;
        }[];
    } & {
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
    }>;
    create(data: {
        shipmentId: string;
        storeId: string;
        provider: string;
        externalId?: string;
    }): Promise<{
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
    }>;
    updateStatus(id: string, status: DeliveryStatus, courierName?: string, courierPhone?: string): Promise<{
        shipment: {
            items: {
                id: string;
                shipmentId: string;
                assetId: string;
                picked: boolean;
                pickedAt: Date | null;
            }[];
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            warehouseId: string;
            status: import(".prisma/client").$Enums.ShipmentStatus;
            requestId: string;
            assembledBy: string | null;
        };
    } & {
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
    }>;
    addEvent(deliveryId: string, title: string, description?: string): Promise<{
        id: string;
        description: string | null;
        title: string;
        timestamp: Date;
        deliveryId: string;
    }>;
}
