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
                        role: { name: 'SUPPORT' }
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
        const recentInstallations = await this.prisma.delivery.findMany({
            where: {
                shipment: {
                    warehouseId: id
                },
                status: 'DELIVERED'
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
