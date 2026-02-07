import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class StockService {
    constructor(private prisma: PrismaService) { }

    async findAll() {
        return this.prisma.stockItem.findMany({
            include: {
                product: {
                    include: { category: true }
                },
                warehouse: true,
            },
            orderBy: {
                product: {
                    name: 'asc',
                },
            },
        });
    }

    async findOne(id: string) {
        const item = await this.prisma.stockItem.findUnique({
            where: { id },
            include: {
                product: {
                    include: { category: true }
                },
                warehouse: true,
            },
        });

        if (!item) {
            throw new NotFoundException(`Stock item with ID ${id} not found`);
        }

        return item;
    }

    async create(data: { productId: string; warehouseId: string; quantity: number; minQuantity?: number }) {
        // Check if exists
        const existing = await this.prisma.stockItem.findUnique({
            where: {
                productId_warehouseId: {
                    productId: data.productId,
                    warehouseId: data.warehouseId,
                },
            },
        });

        if (existing) {
            // Update quantity if exists
            return this.prisma.stockItem.update({
                where: { id: existing.id },
                data: {
                    quantity: { increment: data.quantity },
                    minQuantity: data.minQuantity ?? existing.minQuantity,
                },
                include: {
                    product: {
                        include: { category: true }
                    },
                    warehouse: true
                },
            });
        }

        return this.prisma.stockItem.create({
            data: {
                productId: data.productId,
                warehouseId: data.warehouseId,
                quantity: data.quantity,
                minQuantity: data.minQuantity ?? 0,
            },
            include: {
                product: {
                    include: { category: true }
                },
                warehouse: true
            },
        });
    }

    async update(id: string, data: { quantity?: number; minQuantity?: number; reserved?: number }) {
        return this.prisma.stockItem.update({
            where: { id },
            data,
            include: {
                product: {
                    include: { category: true }
                },
                warehouse: true
            },
        });
    }

    async adjust(id: string, delta: number) {
        return this.prisma.stockItem.update({
            where: { id },
            data: {
                quantity: { increment: delta },
            },
            include: {
                product: {
                    include: { category: true }
                },
                warehouse: true
            },
        });
    }

    async delete(id: string) {
        return this.prisma.stockItem.delete({
            where: { id },
        });
    }
}
