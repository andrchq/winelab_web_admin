import { PrismaService } from '../prisma/prisma.service';
export declare class DashboardController {
    private prisma;
    constructor(prisma: PrismaService);
    getStats(): Promise<{
        totals: {
            assets: number;
            stores: number;
            requests: number;
            deliveries: number;
        };
        assets: {
            byCondition: {
                [k: string]: number;
            };
            byProcess: {
                [k: string]: number;
            };
        };
        requests: {
            byStatus: {
                [k: string]: number;
            };
            recent: ({
                creator: {
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
            })[];
        };
        deliveries: {
            byStatus: {
                [k: string]: number;
            };
            recent: ({
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
                status: import(".prisma/client").$Enums.DeliveryStatus;
                storeId: string;
                shipmentId: string;
                provider: string;
                externalId: string | null;
                courierName: string | null;
                courierPhone: string | null;
                eta: Date | null;
                deliveredAt: Date | null;
            })[];
        };
    }>;
}
