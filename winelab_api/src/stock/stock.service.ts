import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ProductAccountingType } from '@prisma/client';
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

        if (data.quantity !== 0 || reserved !== 0) {
            throw new BadRequestException('Ручное внесение количества и резерва отключено. Используйте приемку, инвентаризацию и отгрузки.');
        }

        const product = await this.prisma.product.findUnique({
            where: { id: data.productId },
            select: { accountingType: true },
        });

        if (!product) {
            throw new NotFoundException(`Product with ID ${data.productId} not found`);
        }

        if (product.accountingType !== ProductAccountingType.QUANTITY) {
            throw new BadRequestException('Ручная привязка доступна только для количественных позиций.');
        }

        const existing = await this.prisma.stockItem.findUnique({
            where: {
                productId_warehouseId: {
                    productId: data.productId,
                    warehouseId: data.warehouseId,
                },
            },
        });

        if (existing) {
            throw new BadRequestException('Позиция уже привязана к этому складу.');
        }

        this.validateSnapshot(0, 0, minQuantity);

        return this.prisma.stockItem.create({
            data: {
                productId: data.productId,
                warehouseId: data.warehouseId,
                quantity: 0,
                reserved: 0,
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

        if (data.quantity !== undefined || data.reserved !== undefined) {
            throw new BadRequestException('Ручное изменение количества и резерва отключено. Можно менять только минимальный остаток.');
        }

        const nextQuantity = existing.quantity;
        const nextReserved = existing.reserved;
        const nextMinQuantity = data.minQuantity ?? existing.minQuantity;

        this.validateSnapshot(nextQuantity, nextReserved, nextMinQuantity);

        return this.prisma.stockItem.update({
            where: { id },
            data: { minQuantity: nextMinQuantity },
            include: {
                product: {
                    include: { category: true }
                },
                warehouse: true
            },
        });
    }

    async adjust(id: string, delta: number) {
        throw new BadRequestException('Ручное изменение количества отключено. Используйте приемку, инвентаризацию и отгрузки.');
    }

    async delete(id: string) {
        const existing = await this.findOne(id);

        if (existing.quantity !== 0 || existing.reserved !== 0) {
            throw new BadRequestException('Нельзя удалить складскую позицию с ненулевым остатком или резервом.');
        }

        return this.prisma.stockItem.delete({
            where: { id },
        });
    }
}
