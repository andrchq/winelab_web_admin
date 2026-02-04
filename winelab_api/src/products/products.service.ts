import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AssetProcess } from '@prisma/client';

@Injectable()
export class ProductsService {
    constructor(private prisma: PrismaService) { }

    async findAll() {
        const products = await this.prisma.product.findMany({
            where: { isActive: true },
            include: {
                stockItems: {
                    select: {
                        quantity: true,
                        reserved: true,
                    },
                },
                assets: {
                    where: {
                        NOT: {
                            condition: 'DECOMMISSIONED',
                            processStatus: { in: ['INSTALLED', 'DELIVERED'] }
                        }
                    },
                    select: {
                        processStatus: true,
                    },
                },
            },
            orderBy: { name: 'asc' },
        });

        return products.map(product => {
            // Calculate totals from StockItems (Consumables)
            const stockItemsTotal = product.stockItems.reduce((sum, item) => sum + item.quantity, 0);
            const stockItemsReserved = product.stockItems.reduce((sum, item) => sum + item.reserved, 0);

            // Calculate totals from Assets (Serialized)
            // Available assets are those in warehouse (AVAILABLE)
            // Reserved assets are those in warehouse (RESERVED)
            // In transit are technically stock but moving, let's count them as stock but not available?
            // For simplicity: Stock = Available + Reserved + In Transit
            const assetsStock = product.assets.length;
            const assetsReserved = product.assets.filter(a => a.processStatus === 'RESERVED').length;

            const totalStock = stockItemsTotal + assetsStock;
            const totalReserved = stockItemsReserved + assetsReserved;
            const totalAvailable = totalStock - totalReserved;

            // Remove large relation arrays from response to keep it light
            const { stockItems, assets, ...rest } = product;

            return {
                ...rest,
                stats: {
                    stock: totalStock,
                    reserved: totalReserved,
                    available: totalAvailable
                }
            };
        });
    }

    async findById(id: string) {
        const product = await this.prisma.product.findUnique({
            where: { id },
            include: {
                assets: {
                    take: 10,
                    orderBy: { createdAt: 'desc' },
                },
            },
        });

        if (!product) {
            throw new NotFoundException('Продукт не найден');
        }

        return product;
    }

    async create(data: { name: string; sku: string; category: string; description?: string }) {
        return this.prisma.product.create({ data });
    }

    async update(id: string, data: { name?: string; category?: string; description?: string }) {
        await this.findById(id);
        return this.prisma.product.update({
            where: { id },
            data,
        });
    }

    async delete(id: string) {
        await this.findById(id);
        await this.prisma.product.update({
            where: { id },
            data: { isActive: false },
        });
        return { message: 'Продукт удален' };
    }
}
