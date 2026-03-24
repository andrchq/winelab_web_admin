import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class StockService {
    constructor(private prisma: PrismaService) { }

    private validateSnapshot(quantity: number, reserved: number, minQuantity: number) {
        if (quantity < 0) {
            throw new BadRequestException('Количество не может быть отрицательным');
        }
        if (reserved < 0) {
            throw new BadRequestException('Резерв не может быть отрицательным');
        }
        if (minQuantity < 0) {
            throw new BadRequestException('Минимальный остаток не может быть отрицательным');
        }
        if (reserved > quantity) {
            throw new BadRequestException('Резерв не может превышать количество на складе');
        }
    }

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

    async create(data: { productId: string; warehouseId: string; quantity: number; minQuantity?: number; reserved?: number }) {
        const minQuantity = data.minQuantity ?? 0;
        const reserved = data.reserved ?? 0;

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
            const nextQuantity = existing.quantity + data.quantity;
            const nextReserved = data.reserved ?? existing.reserved;
            const nextMinQuantity = data.minQuantity ?? existing.minQuantity;

            this.validateSnapshot(nextQuantity, nextReserved, nextMinQuantity);

            // Update quantity if exists
            return this.prisma.stockItem.update({
                where: { id: existing.id },
                data: {
                    quantity: { increment: data.quantity },
                    reserved: nextReserved,
                    minQuantity: nextMinQuantity,
                },
                include: {
                    product: {
                        include: { category: true }
                    },
                    warehouse: true
                },
            });
        }

        this.validateSnapshot(data.quantity, reserved, minQuantity);

        return this.prisma.stockItem.create({
            data: {
                productId: data.productId,
                warehouseId: data.warehouseId,
                quantity: data.quantity,
                reserved,
                minQuantity,
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
        const existing = await this.findOne(id);
        const nextQuantity = data.quantity ?? existing.quantity;
        const nextReserved = data.reserved ?? existing.reserved;
        const nextMinQuantity = data.minQuantity ?? existing.minQuantity;

        this.validateSnapshot(nextQuantity, nextReserved, nextMinQuantity);

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
        const existing = await this.findOne(id);
        const nextQuantity = existing.quantity + delta;

        this.validateSnapshot(nextQuantity, existing.reserved, existing.minQuantity);

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
