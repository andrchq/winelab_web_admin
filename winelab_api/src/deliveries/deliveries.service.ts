import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AssetProcess, DeliveryStatus, Prisma } from '@prisma/client';

import { EventsGateway } from '../events/events.gateway';
import { PrismaService } from '../prisma/prisma.service';
import { YandexDeliveryService } from './yandex-delivery.service';

type DeliveryTx = Prisma.TransactionClient | PrismaService;

@Injectable()
export class DeliveriesService {
    constructor(
        private prisma: PrismaService,
        private eventsGateway: EventsGateway,
        private yandexDeliveryService: YandexDeliveryService,
    ) {}

    private mapYandexStatus(status?: string | null): DeliveryStatus {
        switch (status) {
            case 'performer_found':
            case 'performer_lookup':
            case 'pickup_arrived':
                return DeliveryStatus.COURIER_ASSIGNED;
            case 'ready_for_pickup_confirmation':
            case 'picked_up':
                return DeliveryStatus.PICKED_UP;
            case 'delivery_arrived':
            case 'ready_for_delivery_confirmation':
            case 'delivering':
                return DeliveryStatus.IN_TRANSIT;
            case 'delivered':
                return DeliveryStatus.DELIVERED;
            case 'cancelled':
            case 'cancelled_with_items_on_hands':
                return DeliveryStatus.CANCELLED;
            case 'failed':
                return DeliveryStatus.PROBLEM;
            case 'ready_for_approval':
            case 'accepted':
            case 'new':
            default:
                return DeliveryStatus.CREATED;
        }
    }

    private async syncRequestStatusForDelivery(
        tx: DeliveryTx,
        shipmentId: string,
        deliveryStatus: DeliveryStatus,
    ) {
        const shipment = await tx.shipment.findUnique({
            where: { id: shipmentId },
            select: { requestId: true },
        });

        if (!shipment?.requestId) {
            return;
        }

        const request = await tx.request.findUnique({
            where: { id: shipment.requestId },
            select: { id: true, status: true },
        });

        if (!request || request.status === 'CANCELLED') {
            return;
        }

        let nextStatus = request.status;

        if (deliveryStatus === DeliveryStatus.DELIVERED) {
            nextStatus = 'COMPLETED';
        } else if (
            deliveryStatus === DeliveryStatus.CREATED ||
            deliveryStatus === DeliveryStatus.COURIER_ASSIGNED ||
            deliveryStatus === DeliveryStatus.PICKED_UP ||
            deliveryStatus === DeliveryStatus.IN_TRANSIT
        ) {
            nextStatus = request.status === 'NEW' ? 'SHIPPED' : request.status;
        }

        if (nextStatus !== request.status) {
            await tx.request.update({
                where: { id: shipment.requestId },
                data: { status: nextStatus },
            });
        }
    }

    private async finalizeDeliveredState(
        tx: DeliveryTx,
        deliveryId: string,
        shipmentId: string,
        storeId: string,
    ) {
        const shipment = await tx.shipment.findUnique({
            where: { id: shipmentId },
            include: {
                items: true,
            },
        });

        if (!shipment) {
            throw new NotFoundException('Отгрузка не найдена');
        }

        const assetIds = shipment.items.map((item) => item.assetId);
        if (assetIds.length > 0) {
            await tx.asset.updateMany({
                where: { id: { in: assetIds } },
                data: {
                    processStatus: AssetProcess.DELIVERED,
                    storeId,
                    warehouseId: null,
                    warehouseBinId: null,
                },
            });
        }

        await tx.shipment.update({
            where: { id: shipmentId },
            data: { status: 'DELIVERED' },
        });

        await tx.deliveryEvent.create({
            data: {
                deliveryId,
                title: 'Доставлено',
            },
        });
    }

    private async addStatusEvent(
        tx: DeliveryTx,
        deliveryId: string,
        status: DeliveryStatus,
        rawStatus?: string | null,
    ) {
        const statusLabels: Record<DeliveryStatus, string> = {
            CREATED: 'Создано',
            COURIER_ASSIGNED: 'Курьер назначен',
            PICKED_UP: 'Забрано со склада',
            IN_TRANSIT: 'В пути',
            DELIVERED: 'Доставлено',
            PROBLEM: 'Проблема с доставкой',
            CANCELLED: 'Отменено',
        };

        await tx.deliveryEvent.create({
            data: {
                deliveryId,
                title: statusLabels[status] || status,
                description: rawStatus ? `Статус провайдера: ${rawStatus}` : undefined,
            },
        });
    }

    async findAll(filters?: { status?: DeliveryStatus }) {
        return this.prisma.delivery.findMany({
            where: filters,
            include: {
                store: { select: { id: true, name: true, address: true } },
                shipment: {
                    include: {
                        _count: { select: { items: true } },
                        request: { select: { id: true, status: true } },
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
        await this.syncRequestStatusForDelivery(this.prisma, delivery.shipmentId, delivery.status);

        this.eventsGateway.emitDeliveryUpdate({ ...delivery, event: 'CREATED' });
        return delivery;
    }

    async createYandexDelivery(data: {
        shipmentId: string;
        storeId: string;
        externalId: string;
        externalVersion?: number;
        rawStatus?: string | null;
        sourceContactName: string;
        sourceContactPhone: string;
        sourceContactEmail: string;
        recipientContactName: string;
        recipientContactPhone: string;
        recipientComment?: string;
    }) {
        const status = this.mapYandexStatus(data.rawStatus);

        const delivery = await this.prisma.delivery.create({
            data: {
                shipmentId: data.shipmentId,
                storeId: data.storeId,
                provider: 'YANDEX_DELIVERY',
                externalId: data.externalId,
                externalVersion: data.externalVersion,
                rawStatus: data.rawStatus || status,
                sourceContactName: data.sourceContactName,
                sourceContactPhone: data.sourceContactPhone,
                sourceContactEmail: data.sourceContactEmail,
                recipientContactName: data.recipientContactName,
                recipientContactPhone: data.recipientContactPhone,
                recipientComment: data.recipientComment,
                status,
                confirmedAt: new Date(),
                lastSyncAt: new Date(),
            },
        });

        await this.addEvent(
            delivery.id,
            'Заявка отправлена в Yandex Delivery',
            data.externalId,
        );
        await this.syncRequestStatusForDelivery(this.prisma, delivery.shipmentId, delivery.status);

        this.eventsGateway.emitDeliveryUpdate(delivery);
        return delivery;
    }

    async syncProviderState(id: string) {
        const delivery = await this.findById(id);

        if (delivery.provider !== 'YANDEX_DELIVERY') {
            throw new BadRequestException('Синхронизация доступна только для Yandex Delivery');
        }

        if (!delivery.externalId) {
            throw new BadRequestException('У доставки нет внешнего идентификатора провайдера');
        }

        const claim = await this.yandexDeliveryService.findClaim(delivery.externalId);
        if (!claim) {
            throw new NotFoundException('Заказ не найден в Yandex Delivery');
        }

        const mappedStatus = this.mapYandexStatus(claim.status);

        const updatedDelivery = await this.prisma.$transaction(async (tx) => {
            const nextDelivery = await tx.delivery.update({
                where: { id },
                data: {
                    rawStatus: claim.status,
                    externalVersion: claim.version ?? delivery.externalVersion,
                    courierName: claim.performer_info?.name || delivery.courierName,
                    courierPhone: claim.performer_info?.phone || delivery.courierPhone,
                    status: mappedStatus,
                    lastSyncAt: new Date(),
                    deliveredAt:
                        mappedStatus === DeliveryStatus.DELIVERED
                            ? delivery.deliveredAt || new Date()
                            : delivery.deliveredAt,
                },
            });

            if (mappedStatus === DeliveryStatus.DELIVERED && delivery.status !== DeliveryStatus.DELIVERED) {
                await this.finalizeDeliveredState(tx, id, delivery.shipmentId, delivery.storeId);
            } else if (mappedStatus !== delivery.status) {
                await this.addStatusEvent(tx, id, mappedStatus, claim.status);
            }

            await this.syncRequestStatusForDelivery(tx, delivery.shipmentId, mappedStatus);
            return nextDelivery;
        });

        this.eventsGateway.emitDeliveryUpdate(updatedDelivery);
        return this.findById(id);
    }

    async updateStatus(id: string, status: DeliveryStatus, courierName?: string, courierPhone?: string) {
        const currentDelivery = await this.findById(id);
        if (currentDelivery.provider === 'YANDEX_DELIVERY') {
            throw new BadRequestException('Для Yandex Delivery статусы обновляются только через провайдера');
        }

        const delivery = await this.prisma.$transaction(async (tx) => {
            const updatedDelivery = await tx.delivery.update({
                where: { id },
                data: {
                    status,
                    courierName,
                    courierPhone,
                    deliveredAt: status === DeliveryStatus.DELIVERED ? new Date() : undefined,
                },
            });

            if (status === DeliveryStatus.DELIVERED) {
                await this.finalizeDeliveredState(tx, id, currentDelivery.shipmentId, currentDelivery.storeId);
            } else {
                await this.addStatusEvent(tx, id, status);
            }

            await this.syncRequestStatusForDelivery(tx, currentDelivery.shipmentId, status);
            return updatedDelivery;
        });

        this.eventsGateway.emitDeliveryUpdate(delivery);
        return delivery;
    }

    async addEvent(deliveryId: string, title: string, description?: string) {
        return this.prisma.deliveryEvent.create({
            data: { deliveryId, title, description },
        });
    }
}
