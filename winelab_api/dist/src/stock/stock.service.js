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
exports.StockService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let StockService = class StockService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll() {
        return this.prisma.stockItem.findMany({
            include: {
                product: true,
                warehouse: true,
            },
            orderBy: {
                product: {
                    name: 'asc',
                },
            },
        });
    }
    async findOne(id) {
        const item = await this.prisma.stockItem.findUnique({
            where: { id },
            include: {
                product: true,
                warehouse: true,
            },
        });
        if (!item) {
            throw new common_1.NotFoundException(`Stock item with ID ${id} not found`);
        }
        return item;
    }
    async create(data) {
        const existing = await this.prisma.stockItem.findUnique({
            where: {
                productId_warehouseId: {
                    productId: data.productId,
                    warehouseId: data.warehouseId,
                },
            },
        });
        if (existing) {
            return this.prisma.stockItem.update({
                where: { id: existing.id },
                data: {
                    quantity: { increment: data.quantity },
                    minQuantity: data.minQuantity ?? existing.minQuantity,
                },
                include: { product: true, warehouse: true },
            });
        }
        return this.prisma.stockItem.create({
            data: {
                productId: data.productId,
                warehouseId: data.warehouseId,
                quantity: data.quantity,
                minQuantity: data.minQuantity ?? 0,
            },
            include: { product: true, warehouse: true },
        });
    }
    async update(id, data) {
        return this.prisma.stockItem.update({
            where: { id },
            data,
            include: { product: true, warehouse: true },
        });
    }
    async adjust(id, delta) {
        return this.prisma.stockItem.update({
            where: { id },
            data: {
                quantity: { increment: delta },
            },
            include: { product: true, warehouse: true },
        });
    }
    async delete(id) {
        return this.prisma.stockItem.delete({
            where: { id },
        });
    }
};
exports.StockService = StockService;
exports.StockService = StockService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], StockService);
//# sourceMappingURL=stock.service.js.map