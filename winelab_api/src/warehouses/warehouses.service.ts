import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WarehousesService {
    constructor(private prisma: PrismaService) { }

    async findAll() {
        return this.prisma.warehouse.findMany({
            where: { isActive: true },
            include: {
                stockItems: true,
            },
        });
    }
    async findById(id: string) {
        return this.prisma.warehouse.findUnique({
            where: { id },
        });
    }

    async create(data: { name: string; address?: string }) {
        return this.prisma.warehouse.create({
            data,
        });
    }

    async update(id: string, data: { name?: string; address?: string }) {
        return this.prisma.warehouse.update({
            where: { id },
            data,
        });
    }

    async delete(id: string) {
        return this.prisma.warehouse.update({
            where: { id },
            data: { isActive: false },
        });
    }

    async getDetails(id: string) {
        // 1. Get Warehouse Info
        const warehouse = await this.prisma.warehouse.findUnique({
            where: { id },
            include: {
                stockItems: true,
            }
        });

        if (!warehouse) return null;

        // 2. Recent TP engineer requests (Shipments -> Requests created by Support)
        // Assuming "Engineer requests" means shipments from this warehouse linked to requests created by users with role SUPPORT or similar,
        // OR just any recent shipments from this warehouse.
        // The prompt says: "какие инженеры тп последние делали какие то заявки на доставку оборудования"
        // This implies looking at Shipments from this warehouse, checking the Request creator.
        const recentRequests = await this.prisma.shipment.findMany({
            where: {
                warehouseId: id,
                request: {
                    creator: {
                        role: 'SUPPORT' // Assuming TP engineers have SUPPORT role, adjust if needed
                    }
                }
            },
            take: 10,
            orderBy: { createdAt: 'desc' },
            include: {
                request: {
                    include: {
                        creator: true,
                        store: true
                    }
                },
                items: {
                    include: {
                        asset: {
                            include: {
                                product: true
                            }
                        }
                    }
                }
            }
        });

        // 3. Last 10 installations (Shipments -> Deliveries to Stores)
        // "на какие последние 10 магазинов были установки оборудования с этого склада"
        const recentInstallations = await this.prisma.delivery.findMany({
            where: {
                shipment: {
                    warehouseId: id
                },
                status: 'DELIVERED' // Identifying completed installations
            },
            take: 10,
            orderBy: { createdAt: 'desc' },
            include: {
                store: true,
                shipment: {
                    include: {
                        items: {
                            include: {
                                asset: {
                                    include: {
                                        product: true
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });

        // 4. Last 10 new stores opened from this warehouse
        // "какие последние 10 новые магазины были открыты с этого склада"
        // This is tricky. Stores aren't "opened from a warehouse" directly in the schema usually.
        // Maybe it means stores that received their FIRST shipment/installation from this warehouse?
        // OR stores that have assets linked to this warehouse?
        // Let's assume it means stores that had their *first* delivery processed from this warehouse.
        // Alternatively, if there's no direct link, we might just show recent stores that received *any* delivery from here, 
        // but the prompt says "new stores were opened".
        // Let's interpret "Opened form this warehouse" as: Stores created recently that received equipment from this warehouse.
        // Or simpler: Deliveries to stores that were created recently.
        // Let's try to find stores where the *first* shipment they ever received came from this warehouse.

        // Strategy: Find recent deliveries from this warehouse, then check if the store is "new" (created recently)
        // OR: Find stores that received a shipment from this warehouse, ordered by store.createdAt desc.
        const newStores = await this.prisma.store.findMany({
            where: {
                deliveries: {
                    some: {
                        shipment: {
                            warehouseId: id
                        }
                    }
                }
            },
            take: 10,
            orderBy: { createdAt: 'desc' },
            include: {
                _count: {
                    select: { assets: true }
                }
            }
        });

        // 5. Additional Stats
        const totalItems = warehouse.stockItems.reduce((acc, item) => acc + item.quantity, 0);
        const lowStockItems = warehouse.stockItems.filter(item => item.quantity <= item.minQuantity).length;

        return {
            ...warehouse,
            stats: {
                totalDetails: totalItems,
                lowStockPositions: lowStockItems,
                // totalValue: ... if we had price
            },
            recentRequests: recentRequests.map(r => ({
                id: r.id,
                date: r.createdAt,
                engineer: r.request.creator,
                store: r.request.store,
                itemsCount: r.items.length
            })),
            recentInstallations: recentInstallations.map(d => ({
                id: d.id,
                date: d.deliveredAt || d.createdAt,
                store: d.store,
                items: d.shipment.items.map(i => i.asset.product.name)
            })),
            newStores: newStores
        };
    }
}
