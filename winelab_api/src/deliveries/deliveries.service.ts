import { Injectable, NotFoundException } from '@nestjs/common';
import { DeliveryStatus, AssetProcess } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EventsGateway } from '../events/events.gateway';

@Injectable()
export class DeliveriesService {
    constructor(
        private prisma: PrismaService,
        private eventsGateway: EventsGateway,
    ) { }

    async findAll(filters?: { status?: DeliveryStatus }) {
        return this.prisma.delivery.findMany({
            where: filters,
            include: {
                store: { select: { name: true, address: true } },
                shipment: {
                    include: {
                        _count: { select: { items: true } },
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    async findById(id: string) {
        const delivery = await this.prisma.delivery.findUnique({
            where: { id },
            include: {
                store: true,
                shipment: {
                    include: {
                        request: true,
                        items: { include: { asset: { include: { product: true } } } },
                    },
                },
                events: { orderBy: { timestamp: 'asc' } },
            },
        });

        if (!delivery) {
            throw new NotFoundException('Доставка не найдена');
        }

        return delivery;
    }

    async create(data: { shipmentId: string; storeId: string; provider: string; externalId?: string }) {
        const delivery = await this.prisma.delivery.create({ data });

        await this.addEvent(delivery.id, 'Заказ доставки создан');

        // Emit event
        this.eventsGateway.emitDeliveryUpdate({ ...delivery, event: 'CREATED' });

        return delivery;
    }

    async updateStatus(id: string, status: DeliveryStatus, courierName?: string, courierPhone?: string) {
        await this.findById(id);

        const delivery = await this.prisma.delivery.update({
            where: { id },
            data: { status, courierName, courierPhone },
            include: { shipment: { include: { items: true } } },
        });

        // При статусе DELIVERED обновляем статус активов
        if (status === DeliveryStatus.DELIVERED) {
            await this.prisma.delivery.update({
                where: { id },
                data: { deliveredAt: new Date() },
            });

            const assetIds = delivery.shipment.items.map((i) => i.assetId);
            await this.prisma.asset.updateMany({
                where: { id: { in: assetIds } },
                data: {
                    processStatus: AssetProcess.DELIVERED,
                    storeId: delivery.storeId,
                    warehouseId: null,
                    warehouseBinId: null,
                },
            });

            await this.addEvent(id, 'Доставлено');
        } else {
            const statusLabels: Record<DeliveryStatus, string> = {
                CREATED: 'Создано',
                COURIER_ASSIGNED: 'Курьер назначен',
                PICKED_UP: 'Забрано со склада',
                IN_TRANSIT: 'В пути',
                DELIVERED: 'Доставлено',
                PROBLEM: 'Проблема с доставкой',
                CANCELLED: 'Отменено',
            };
            await this.addEvent(id, statusLabels[status] || status);
        }

        // Emit real-time update
        this.eventsGateway.emitDeliveryUpdate(delivery);

        return delivery;
    }

    async addEvent(deliveryId: string, title: string, description?: string) {
        return this.prisma.deliveryEvent.create({
            data: { deliveryId, title, description },
        });
    }
}
