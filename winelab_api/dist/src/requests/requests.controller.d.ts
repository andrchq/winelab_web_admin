import { RequestStatus, RequestPriority, User } from '@prisma/client';
import { RequestsService } from './requests.service';
export declare class RequestsController {
    private requestsService;
    constructor(requestsService: RequestsService);
    findAll(status?: RequestStatus, priority?: RequestPriority): Promise<({
        creator: {
            name: string;
        };
        store: {
            name: string;
        };
        _count: {
            comments: number;
            items: number;
        };
        assignee: {
            name: string;
        } | null;
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
    })[]>;
    findOne(id: string): Promise<{
        shipments: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            warehouseId: string;
            status: import(".prisma/client").$Enums.ShipmentStatus;
            requestId: string;
            assembledBy: string | null;
        }[];
        comments: ({
            user: {
                name: string;
                role: import(".prisma/client").$Enums.Role;
            };
        } & {
            id: string;
            createdAt: Date;
            requestId: string;
            userId: string;
            text: string;
        })[];
        creator: {
            id: string;
            email: string;
            name: string;
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
            notes: string | null;
            requestId: string;
            assetId: string;
        })[];
        assignee: {
            id: string;
            email: string;
            name: string;
        } | null;
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
    }>;
    create(data: {
        title: string;
        description?: string;
        storeId: string;
        priority?: RequestPriority;
    }, user: User): Promise<{
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
    }>;
    updateStatus(id: string, data: {
        status: RequestStatus;
        assigneeId?: string;
    }): Promise<{
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
    }>;
    addComment(id: string, data: {
        text: string;
    }, user: User): Promise<{
        user: {
            name: string;
            role: import(".prisma/client").$Enums.Role;
        };
    } & {
        id: string;
        createdAt: Date;
        requestId: string;
        userId: string;
        text: string;
    }>;
    addAsset(id: string, data: {
        assetId: string;
        notes?: string;
    }): Promise<{
        id: string;
        notes: string | null;
        requestId: string;
        assetId: string;
    }>;
}
