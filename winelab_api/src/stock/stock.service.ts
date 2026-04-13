import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ProductAccountingType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class StockService {
    constructor(private prisma: PrismaService) { }

    private validateSnapshot(quantity: number, reserved: number, minQuantity: number) {
        if (quantity < 0) {
            throw new BadRequestException('РљРѕР»РёС‡РµСЃС‚РІРѕ РЅРµ РјРѕР¶РµС‚ Р±С‹С‚СЊ РѕС‚СЂРёС†Р°С‚РµР»СЊРЅС‹Рј');
        }
        if (reserved < 0) {
            throw new BadRequestException('Р РµР·РµСЂРІ РЅРµ РјРѕР¶РµС‚ Р±С‹С‚СЊ РѕС‚СЂРёС†Р°С‚РµР»СЊРЅС‹Рј');
        }
        if (minQuantity < 0) {
            throw new BadRequestException('РњРёРЅРёРјР°Р»СЊРЅС‹Р№ РѕСЃС‚Р°С‚РѕРє РЅРµ РјРѕР¶РµС‚ Р±С‹С‚СЊ РѕС‚СЂРёС†Р°С‚РµР»СЊРЅС‹Рј');
        }
        if (reserved > quantity) {
            throw new BadRequestException('Р РµР·РµСЂРІ РЅРµ РјРѕР¶РµС‚ РїСЂРµРІС‹С€Р°С‚СЊ РєРѕР»РёС‡РµСЃС‚РІРѕ РЅР° СЃРєР»Р°РґРµ');
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
            throw new BadRequestException('Р СѓС‡РЅРѕРµ РІРЅРµСЃРµРЅРёРµ РєРѕР»РёС‡РµСЃС‚РІР° Рё СЂРµР·РµСЂРІР° РѕС‚РєР»СЋС‡РµРЅРѕ. РСЃРїРѕР»СЊР·СѓР№С‚Рµ РїСЂРёРµРјРєСѓ, РёРЅРІРµРЅС‚Р°СЂРёР·Р°С†РёСЋ Рё РѕС‚РіСЂСѓР·РєРё.');
        }

        const product = await this.prisma.product.findUnique({
            where: { id: data.productId },
            select: { accountingType: true },
        });

        if (!product) {
            throw new NotFoundException(`Product with ID ${data.productId} not found`);
        }

        if (product.accountingType !== ProductAccountingType.QUANTITY) {
            throw new BadRequestException('Р СѓС‡РЅР°СЏ РїСЂРёРІСЏР·РєР° РґРѕСЃС‚СѓРїРЅР° С‚РѕР»СЊРєРѕ РґР»СЏ РєРѕР»РёС‡РµСЃС‚РІРµРЅРЅС‹С… РїРѕР·РёС†РёР№.');
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
            throw new BadRequestException('РџРѕР·РёС†РёСЏ СѓР¶Рµ РїСЂРёРІСЏР·Р°РЅР° Рє СЌС‚РѕРјСѓ СЃРєР»Р°РґСѓ.');
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

        if (data.quantity !== undefined) {
            throw new BadRequestException('Ручное изменение количества отключено. Менять можно только резерв и минимальный остаток.');
        }

        const nextQuantity = existing.quantity;
        const nextReserved = data.reserved ?? existing.reserved;
        const nextMinQuantity = data.minQuantity ?? existing.minQuantity;

        this.validateSnapshot(nextQuantity, nextReserved, nextMinQuantity);

        return this.prisma.stockItem.update({
            where: { id },
            data: {
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

    async adjust(id: string, delta: number) {
        throw new BadRequestException('Р СѓС‡РЅРѕРµ РёР·РјРµРЅРµРЅРёРµ РєРѕР»РёС‡РµСЃС‚РІР° РѕС‚РєР»СЋС‡РµРЅРѕ. РСЃРїРѕР»СЊР·СѓР№С‚Рµ РїСЂРёРµРјРєСѓ, РёРЅРІРµРЅС‚Р°СЂРёР·Р°С†РёСЋ Рё РѕС‚РіСЂСѓР·РєРё.');
    }

    async delete(id: string) {
        const existing = await this.findOne(id);

        if (existing.quantity !== 0 || existing.reserved !== 0) {
            throw new BadRequestException('РќРµР»СЊР·СЏ СѓРґР°Р»РёС‚СЊ СЃРєР»Р°РґСЃРєСѓСЋ РїРѕР·РёС†РёСЋ СЃ РЅРµРЅСѓР»РµРІС‹Рј РѕСЃС‚Р°С‚РєРѕРј РёР»Рё СЂРµР·РµСЂРІРѕРј.');
        }

        return this.prisma.stockItem.delete({
            where: { id },
        });
    }
}

