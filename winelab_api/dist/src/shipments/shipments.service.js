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
exports.ShipmentsService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
let ShipmentsService = class ShipmentsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll(filters) {
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
    async findById(id) {
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
            throw new common_1.NotFoundException('Отгрузка не найдена');
        }
        return shipment;
    }
    async create(requestId, warehouseId) {
        return this.prisma.shipment.create({
            data: { requestId, warehouseId },
        });
    }
    async addItem(shipmentId, assetId) {
        await this.findById(shipmentId);
        await this.prisma.asset.update({
            where: { id: assetId },
            data: { processStatus: client_1.AssetProcess.RESERVED },
        });
        return this.prisma.shipmentItem.create({
            data: { shipmentId, assetId },
        });
    }
    async pickItem(itemId) {
        return this.prisma.shipmentItem.update({
            where: { id: itemId },
            data: { picked: true, pickedAt: new Date() },
        });
    }
    async updateStatus(id, status, assembledBy) {
        await this.findById(id);
        if (status === client_1.ShipmentStatus.SHIPPED) {
            const shipment = await this.prisma.shipment.findUnique({
                where: { id },
                include: { items: true },
            });
            await this.prisma.asset.updateMany({
                where: { id: { in: shipment?.items.map((i) => i.assetId) || [] } },
                data: { processStatus: client_1.AssetProcess.IN_TRANSIT },
            });
        }
        return this.prisma.shipment.update({
            where: { id },
            data: { status, assembledBy },
        });
    }
};
exports.ShipmentsService = ShipmentsService;
exports.ShipmentsService = ShipmentsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ShipmentsService);
//# sourceMappingURL=shipments.service.js.map