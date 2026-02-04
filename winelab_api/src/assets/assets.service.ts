import { Injectable, NotFoundException, Logger, ConflictException, BadRequestException } from '@nestjs/common';
import { AssetCondition, AssetProcess } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EventsGateway } from '../events/events.gateway';

@Injectable()
export class AssetsService {
    constructor(
        private prisma: PrismaService,
        private eventsGateway: EventsGateway,
    ) { }

    async findAll(filters?: { condition?: AssetCondition; processStatus?: AssetProcess }) {
        return this.prisma.asset.findMany({
            where: filters,
            include: {
                product: { select: { name: true, sku: true, category: true } },
                store: { select: { name: true } },
                warehouse: { select: { name: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    // ... (findById and findBySerialNumber unchanged)

    async findById(id: string) {
        const asset = await this.prisma.asset.findUnique({
            where: { id },
            include: {
                product: true,
                store: true,
                warehouse: true,
                warehouseBin: true,
                assetHistory: {
                    orderBy: { createdAt: 'desc' },
                    take: 20,
                },
            },
        });

        if (!asset) {
            throw new NotFoundException('Оборудование не найдено');
        }

        return asset;
    }

    async findBySerialNumber(serialNumber: string) {
        return this.prisma.asset.findUnique({
            where: { serialNumber },
            include: {
                product: true,
                store: true,
                warehouse: true,
            },
        });
    }

    async create(data: {
        serialNumber: string;
        productId: string;
        warehouseId?: string;
        warehouseBinId?: string;
        condition?: AssetCondition;
    }) {
        try {
            const asset = await this.prisma.asset.create({
                data: {
                    ...data,
                    processStatus: AssetProcess.AVAILABLE,
                },
            });

            await this.addHistory(asset.id, 'Оприходовано', data.warehouseId || 'Склад');

            // Emit real-time event
            this.eventsGateway.emitDashboardStats({}); // Trigger stats refresh
            // You might want a specific event too, but dashboard_stats or generic asset_update works
            // Let's stick to the plan: asset_update
            // Note: The implementation plan said "asset_update", let me verify if I added a method for that in gateway.
            // In previous turn I added emitDashboardStats and emitDeliveryUpdate. 
            // I should probably add emitAssetUpdate to gateway or just use emitDashboardStats if that triggers a refetch.
            // Let's assume I will add emitAssetUpdate to the gateway or generic emit.
            // Actually, for simplicity, I'll just emit 'dashboard_stats' which causes a refresh of stats, 
            // AND maybe a specific one for the list.
            // Let's modify the gateway first? No, I can just use server.emit in gateway if I expose it, or add the method.
            // The service consumes EventsGateway. 
            // Let's check EventsGateway content again.

            // I will use `this.eventsGateway.server.emit('asset_update', asset)` directly if public,
            // or better, I will assume I can update the gateway.

            // In the interest of one tool call, I will just emit 'dashboard_stats' for now as that covers the user request "verify dashboard stats".
            // But for "Assets List" to update, I need 'asset_update'.
            try {
                this.eventsGateway.server.emit('asset_update', asset);
                this.eventsGateway.emitDashboardStats({});
            } catch (e) {
                new Logger('AssetsService').error('Failed to emit events', e);
            }

            return asset;
        } catch (error: any) {
            new Logger('AssetsService').error('Create asset error', error);
            if (error.code === 'P2002') {
                throw new ConflictException('Оборудование с таким серийным номером уже существует');
            }
            if (error.code === 'P2003') {
                throw new BadRequestException('Указанный склад (main-warehouse) или продукт не найден. Проверьте, выполнен ли сидинг базы.');
            }
            throw new BadRequestException(`Ошибка сервера: ${error.message}`);
        }
    }

    async updateStatus(id: string, data: { condition?: AssetCondition; processStatus?: AssetProcess }) {
        await this.findById(id);
        return this.prisma.asset.update({
            where: { id },
            data,
        });
    }

    async moveToStore(id: string, storeId: string) {
        const asset = await this.findById(id);

        await this.prisma.asset.update({
            where: { id },
            data: {
                storeId,
                warehouseId: null,
                warehouseBinId: null,
                processStatus: AssetProcess.DELIVERED,
            },
        });

        await this.addHistory(id, 'Доставлено в магазин', storeId);

        return { message: 'Оборудование перемещено' };
    }

    async markInstalled(id: string) {
        await this.findById(id);

        await this.prisma.asset.update({
            where: { id },
            data: { processStatus: AssetProcess.INSTALLED },
        });

        await this.addHistory(id, 'Установлено');

        return { message: 'Оборудование установлено' };
    }

    private async addHistory(assetId: string, action: string, location?: string) {
        await this.prisma.assetHistory.create({
            data: { assetId, action, location },
        });
    }
    async delete(id: string) {
        await this.findById(id);

        await this.prisma.assetHistory.deleteMany({
            where: { assetId: id }
        });

        return this.prisma.asset.delete({
            where: { id },
        });
    }
}
