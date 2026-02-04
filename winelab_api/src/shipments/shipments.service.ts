import { Injectable, NotFoundException } from '@nestjs/common';
import { ShipmentStatus, AssetProcess } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ShipmentsService {
    constructor(private prisma: PrismaService) { }

    async findAll(filters?: { status?: ShipmentStatus }) {
        return this.prisma.shipment.findMany({
            where: filters,
            include: {
                request: { select: { id: true, title: true } },
                warehouse: { select: { name: true } },
                assembler: { select: { name: true } },
                _count: { select: { items: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    async findById(id: string) {
        const shipment = await this.prisma.shipment.findUnique({
            where: { id },
            include: {
                request: { include: { store: true } },
                warehouse: true,
                assembler: { select: { id: true, name: true } },
                items: {
                    include: {
                        asset: { include: { product: true, warehouseBin: true } },
                    },
                },
                delivery: true,
            },
        });

        if (!shipment) {
            throw new NotFoundException('Отгрузка не найдена');
        }

        return shipment;
    }

    async create(requestId: string, warehouseId: string) {
        return this.prisma.shipment.create({
            data: { requestId, warehouseId },
        });
    }

    async addItem(shipmentId: string, assetId: string) {
        await this.findById(shipmentId);

        // Резервируем актив
        await this.prisma.asset.update({
            where: { id: assetId },
            data: { processStatus: AssetProcess.RESERVED },
        });

        return this.prisma.shipmentItem.create({
            data: { shipmentId, assetId },
        });
    }

    async pickItem(itemId: string) {
        return this.prisma.shipmentItem.update({
            where: { id: itemId },
            data: { picked: true, pickedAt: new Date() },
        });
    }

    async updateStatus(id: string, status: ShipmentStatus, assembledBy?: string) {
        await this.findById(id);

        // При статусе SHIPPED обновляем статус всех активов
        if (status === ShipmentStatus.SHIPPED) {
            const shipment = await this.prisma.shipment.findUnique({
                where: { id },
                include: { items: true },
            });

            await this.prisma.asset.updateMany({
                where: { id: { in: shipment?.items.map((i) => i.assetId) || [] } },
                data: { processStatus: AssetProcess.IN_TRANSIT },
            });
        }

        return this.prisma.shipment.update({
            where: { id },
            data: { status, assembledBy },
        });
    }
}
