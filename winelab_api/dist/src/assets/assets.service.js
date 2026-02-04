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
exports.AssetsService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
const events_gateway_1 = require("../events/events.gateway");
let AssetsService = class AssetsService {
    constructor(prisma, eventsGateway) {
        this.prisma = prisma;
        this.eventsGateway = eventsGateway;
    }
    async findAll(filters) {
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
    async findById(id) {
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
            throw new common_1.NotFoundException('Оборудование не найдено');
        }
        return asset;
    }
    async findBySerialNumber(serialNumber) {
        return this.prisma.asset.findUnique({
            where: { serialNumber },
            include: {
                product: true,
                store: true,
                warehouse: true,
            },
        });
    }
    async create(data) {
        try {
            const asset = await this.prisma.asset.create({
                data: {
                    ...data,
                    processStatus: client_1.AssetProcess.AVAILABLE,
                },
            });
            await this.addHistory(asset.id, 'Оприходовано', data.warehouseId || 'Склад');
            this.eventsGateway.emitDashboardStats({});
            try {
                this.eventsGateway.server.emit('asset_update', asset);
                this.eventsGateway.emitDashboardStats({});
            }
            catch (e) {
                new common_1.Logger('AssetsService').error('Failed to emit events', e);
            }
            return asset;
        }
        catch (error) {
            new common_1.Logger('AssetsService').error('Create asset error', error);
            if (error.code === 'P2002') {
                throw new common_1.ConflictException('Оборудование с таким серийным номером уже существует');
            }
            if (error.code === 'P2003') {
                throw new common_1.BadRequestException('Указанный склад (main-warehouse) или продукт не найден. Проверьте, выполнен ли сидинг базы.');
            }
            throw new common_1.BadRequestException(`Ошибка сервера: ${error.message}`);
        }
    }
    async updateStatus(id, data) {
        await this.findById(id);
        return this.prisma.asset.update({
            where: { id },
            data,
        });
    }
    async moveToStore(id, storeId) {
        const asset = await this.findById(id);
        await this.prisma.asset.update({
            where: { id },
            data: {
                storeId,
                warehouseId: null,
                warehouseBinId: null,
                processStatus: client_1.AssetProcess.DELIVERED,
            },
        });
        await this.addHistory(id, 'Доставлено в магазин', storeId);
        return { message: 'Оборудование перемещено' };
    }
    async markInstalled(id) {
        await this.findById(id);
        await this.prisma.asset.update({
            where: { id },
            data: { processStatus: client_1.AssetProcess.INSTALLED },
        });
        await this.addHistory(id, 'Установлено');
        return { message: 'Оборудование установлено' };
    }
    async addHistory(assetId, action, location) {
        await this.prisma.assetHistory.create({
            data: { assetId, action, location },
        });
    }
    async delete(id) {
        await this.findById(id);
        await this.prisma.assetHistory.deleteMany({
            where: { assetId: id }
        });
        return this.prisma.asset.delete({
            where: { id },
        });
    }
};
exports.AssetsService = AssetsService;
exports.AssetsService = AssetsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        events_gateway_1.EventsGateway])
], AssetsService);
//# sourceMappingURL=assets.service.js.map