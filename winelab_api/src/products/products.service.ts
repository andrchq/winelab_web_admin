import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProductAccountingType } from '@prisma/client';

@Injectable()
export class ProductsService {
    constructor(private prisma: PrismaService) { }

    private async resolveAccountingType(categoryId?: string, fallback?: ProductAccountingType) {
        if (!categoryId) {
            return fallback || ProductAccountingType.SERIALIZED;
        }

        const category = await this.prisma.equipmentCategory.findUnique({
            where: { id: categoryId },
            select: { code: true, parent: { select: { code: true } } },
        });

        const categoryCodes = [category?.code, category?.parent?.code].filter(Boolean);
        if (categoryCodes.includes('ACCESSORY')) {
            return ProductAccountingType.QUANTITY;
        }

        return fallback || ProductAccountingType.SERIALIZED;
    }

    async findAll(categoryCode?: string) {
        const where: any = { isActive: true };

        if (categoryCode) {
            where.category = { code: categoryCode };
        }

        const products = await this.prisma.product.findMany({
            where,
            include: {
                category: true,
                stockItems: {
                    select: {
                        quantity: true,
                        reserved: true,
                    },
                },
                assets: {
                    where: {
                        condition: { not: 'DECOMMISSIONED' },
                        storeId: null,
                        warehouseId: { not: null },
                        processStatus: { in: ['AVAILABLE', 'RESERVED'] as any },
                    },
                    select: {
                        processStatus: true,
                    },
                },
            },
            orderBy: { name: 'asc' },
        });

        return products.map(product => {
            const stockItemsTotal = product.stockItems.reduce((sum, item) => sum + item.quantity, 0);
            const stockItemsReserved = product.stockItems.reduce((sum, item) => sum + item.reserved, 0);

            const assetsStock = product.assets.length;
            const assetsReserved = product.assets.filter(a => a.processStatus === 'RESERVED').length;

            const totalStock = product.accountingType === ProductAccountingType.QUANTITY ? stockItemsTotal : assetsStock;
            const totalReserved = product.accountingType === ProductAccountingType.QUANTITY ? stockItemsReserved : assetsReserved;
            const totalAvailable = totalStock - totalReserved;
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
        const { category, ...rest } = data as any;
        if ('categoryId' in rest) {
            delete rest.categoryId;
        }

        const accountingType = await this.resolveAccountingType(category);

        try {
            return await this.prisma.product.create({
                data: {
                    ...rest,
                    accountingType,
                    category: {
                        connect: { id: category }
                    }
                }
            });
        } catch (error: any) {
            console.error('Error creating product:', error);
            // Log full error details for debugging
            if (error.code) console.error('Prisma Error Code:', error.code);
            if (error.meta) console.error('Prisma Error Meta:', error.meta);
            throw error; // Re-throw to let NestJS handle it (Internal Server Error is default)
        }
    }

    async update(id: string, data: { name?: string; category?: string; description?: string }) {
        const existing = await this.findById(id);
        const { category, ...rest } = data as any;

        if ('categoryId' in rest) {
            delete rest.categoryId;
        }

        const accountingType = category
            ? await this.resolveAccountingType(category, existing.accountingType)
            : existing.accountingType;

        return this.prisma.product.update({
            where: { id },
            data: {
                ...rest,
                accountingType,
                ...(category && {
                    category: {
                        connect: { id: category }
                    }
                })
            },
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
