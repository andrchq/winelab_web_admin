"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeliveriesService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
const events_gateway_1 = require("../events/events.gateway");
let DeliveriesService = class DeliveriesService {
    constructor(prisma, eventsGateway) {
        this.prisma = prisma;
        this.eventsGateway = eventsGateway;
    }
    async findAll(filters) {
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
    async findById(id) {
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
            throw new common_1.NotFoundException('Доставка не найдена');
        }
        return delivery;
    }
    async create(data) {
        const delivery = await this.prisma.delivery.create({ data });
        await this.addEvent(delivery.id, 'Заказ доставки создан');
        this.eventsGateway.emitDeliveryUpdate({ ...delivery, event: 'CREATED' });
        return delivery;
    }
    async updateStatus(id, status, courierName, courierPhone) {
        await this.findById(id);
        const delivery = await this.prisma.delivery.update({
            where: { id },
            data: { status, courierName, courierPhone },
            include: { shipment: { include: { items: true } } },
        });
        if (status === client_1.DeliveryStatus.DELIVERED) {
            await this.prisma.delivery.update({
                where: { id },
                data: { deliveredAt: new Date() },
            });
            const assetIds = delivery.shipment.items.map((i) => i.assetId);
            await this.prisma.asset.updateMany({
                where: { id: { in: assetIds } },
                data: {
                    processStatus: client_1.AssetProcess.DELIVERED,
                    storeId: delivery.storeId,
                    warehouseId: null,
                    warehouseBinId: null,
                },
            });
            await this.addEvent(id, 'Доставлено');
        }
        else {
            const statusLabels = {
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
        this.eventsGateway.emitDeliveryUpdate(delivery);
        return delivery;
    }
    async addEvent(deliveryId, title, description) {
        return this.prisma.deliveryEvent.create({
            data: { deliveryId, title, description },
        });
    }
};
exports.DeliveriesService = DeliveriesService;
exports.DeliveriesService = DeliveriesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        events_gateway_1.EventsGateway])
], DeliveriesService);
//# sourceMappingURL=deliveries.service.js.map