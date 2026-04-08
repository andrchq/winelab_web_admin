import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WarehousesService {
    constructor(private prisma: PrismaService) { }

    private isSerializedStockAsset(asset: any) {
        return (
            asset &&
            asset.storeId == null &&
            asset.condition !== 'DECOMMISSIONED' &&
            ['AVAILABLE', 'RESERVED'].includes(asset.processStatus)
        );
    }

    private mergeStockWithSerializedAssets(warehouse: any) {
        const stockItems = warehouse.stockItems || [];
        const assets = (warehouse.assets || []).filter((asset: any) => this.isSerializedStockAsset(asset));

        const serializedByProduct = assets.reduce((acc: Record<string, any>, asset: any) => {
            const productId = asset.productId;
            if (!productId) {
                return acc;
            }

            if (!acc[productId]) {
                acc[productId] = {
                    id: `asset-aggregate-${warehouse.id}-${productId}`,
                    productId,
                    warehouseId: warehouse.id,
                    quantity: 0,
                    reserved: 0,
                    minQuantity: 0,
                    createdAt: asset.createdAt,
                    updatedAt: asset.updatedAt,
                    product: asset.product,
                    source: 'ASSET_AGGREGATE',
                };
            }

            acc[productId].quantity += 1;
            if (asset.processStatus === 'RESERVED') {
                acc[productId].reserved += 1;
            }

            return acc;
        }, {});

        const stockByProduct = stockItems.reduce((acc: Record<string, any>, item: any) => {
            acc[item.productId] = {
                ...item,
                source: 'STOCK_ITEM',
            };
            return acc;
        }, {});

        for (const [productId, aggregate] of Object.entries(serializedByProduct)) {
            if (stockByProduct[productId]) {
                stockByProduct[productId] = {
                    ...stockByProduct[productId],
                    quantity: Number(stockByProduct[productId].quantity || 0) + Number((aggregate as any).quantity || 0),
                    reserved: Number(stockByProduct[productId].reserved || 0) + Number((aggregate as any).reserved || 0),
                    product: stockByProduct[productId].product || (aggregate as any).product,
                    source: 'MIXED',
                };
            } else {
                stockByProduct[productId] = aggregate;
            }
        }

        return Object.values(stockByProduct).sort((a: any, b: any) =>
            (a.product?.name || '').localeCompare(b.product?.name || ''),
        );
    }

    async findAll() {
        const warehouses = await this.prisma.warehouse.findMany({
            where: { isActive: true },
            include: {
                stockItems: {
                    include: {
                        product: {
                            include: { category: true },
                        },
                    },
                },
                assets: {
                    where: {
                        storeId: null,
                        condition: { not: 'DECOMMISSIONED' },
                        processStatus: { in: ['AVAILABLE', 'RESERVED'] as any },
                    },
                    include: {
                        product: {
                            include: { category: true },
                        },
                    },
                },
            },
        });

        return warehouses.map((warehouse) => ({
            ...warehouse,
            stockItems: this.mergeStockWithSerializedAssets(warehouse),
        }));
    }

    async findById(id: string) {
        return this.prisma.warehouse.findUnique({
            where: { id },
        });
    }

    async create(data: { name: string; address?: string; contactName?: string; phone?: string; email?: string }) {
        return this.prisma.warehouse.create({
            data,
        });
    }

    async update(id: string, data: { name?: string; address?: string; contactName?: string; phone?: string; email?: string }) {
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
        const warehouse = await this.prisma.warehouse.findUnique({
            where: { id },
            include: {
                stockItems: {
                    include: {
                        product: {
                            include: { category: true },
                        },
                    },
                },
                assets: {
                    where: {
                        storeId: null,
                        condition: { not: 'DECOMMISSIONED' },
                        processStatus: { in: ['AVAILABLE', 'RESERVED'] as any },
                    },
                    include: {
                        product: {
                            include: { category: true },
                        },
                    },
                },
            },
        });

        if (!warehouse) {
            throw new NotFoundException('Склад не найден');
        }

        const mergedStockItems = this.mergeStockWithSerializedAssets(warehouse);

        const recentRequests = await this.prisma.shipment.findMany({
            where: {
                warehouseId: id,
                request: {
                    creator: {
                        role: { name: 'SUPPORT' },
                    },
                },
            },
            take: 10,
            orderBy: { createdAt: 'desc' },
            include: {
                request: {
                    include: {
                        creator: true,
                        store: true,
                    },
                },
                items: {
                    include: {
                        asset: {
                            include: {
                                product: true,
                            },
                        },
                    },
                },
            },
        });

        const recentInstallations = await this.prisma.delivery.findMany({
            where: {
                shipment: {
                    warehouseId: id,
                },
                status: 'DELIVERED',
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
                                        product: true,
                                    },
                                },
                            },
                        },
                    },
                },
            },
        });

        const newStores = await this.prisma.store.findMany({
            where: {
                deliveries: {
                    some: {
                        shipment: {
                            warehouseId: id,
                        },
                    },
                },
            },
            take: 10,
            orderBy: { createdAt: 'desc' },
            include: {
                _count: {
                    select: { assets: true },
                },
            },
        });

        const totalItems = mergedStockItems.reduce((acc: number, item: any) => acc + Number(item.quantity || 0), 0);
        const lowStockItems = mergedStockItems.filter(
            (item: any) => Number(item.quantity || 0) - Number(item.reserved || 0) <= Number(item.minQuantity || 0),
        ).length;

        return {
            ...warehouse,
            stockItems: mergedStockItems,
            stats: {
                totalDetails: totalItems,
                lowStockPositions: lowStockItems,
            },
            recentRequests: recentRequests
                .filter((request) => request.request)
                .map((request) => ({
                    id: request.id,
                    date: request.createdAt,
                    engineer: request.request!.creator,
                    store: request.request!.store,
                    itemsCount: request.items.length,
                })),
            recentInstallations: recentInstallations.map((delivery) => ({
                id: delivery.id,
                date: delivery.deliveredAt || delivery.createdAt,
                store: delivery.store,
                items: delivery.shipment.items.map((item) => item.asset.product.name),
            })),
            newStores,
        };
    }
}
