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
exports.ProductsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let ProductsService = class ProductsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll() {
        const products = await this.prisma.product.findMany({
            where: { isActive: true },
            include: {
                stockItems: {
                    select: {
                        quantity: true,
                        reserved: true,
                    },
                },
                assets: {
                    where: {
                        NOT: {
                            condition: 'DECOMMISSIONED',
                            processStatus: { in: ['INSTALLED', 'DELIVERED'] }
                        }
                    },
                    select: {
                        processStatus: true,
                    },
                },
            },
            orderBy: { name: 'asc' },
        });
        return products.map(product => {
            const stockItemsTotal = product.stockItems.reduce((sum, item) => sum + item.quantity, 0);
            const stockItemsReserved = product.stockItems.reduce((sum, item) => sum + item.reserved, 0);
            const assetsStock = product.assets.length;
            const assetsReserved = product.assets.filter(a => a.processStatus === 'RESERVED').length;
            const totalStock = stockItemsTotal + assetsStock;
            const totalReserved = stockItemsReserved + assetsReserved;
            const totalAvailable = totalStock - totalReserved;
            const { stockItems, assets, ...rest } = product;
            return {
                ...rest,
                stats: {
                    stock: totalStock,
                    reserved: totalReserved,
                    available: totalAvailable
                }
            };
        });
    }
    async findById(id) {
        const product = await this.prisma.product.findUnique({
            where: { id },
            include: {
                assets: {
                    take: 10,
                    orderBy: { createdAt: 'desc' },
                },
            },
        });
        if (!product) {
            throw new common_1.NotFoundException('Продукт не найден');
        }
        return product;
    }
    async create(data) {
        return this.prisma.product.create({ data });
    }
    async update(id, data) {
        await this.findById(id);
        return this.prisma.product.update({
            where: { id },
            data,
        });
    }
    async delete(id) {
        await this.findById(id);
        await this.prisma.product.update({
            where: { id },
            data: { isActive: false },
        });
        return { message: 'Продукт удален' };
    }
};
exports.ProductsService = ProductsService;
exports.ProductsService = ProductsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ProductsService);
//# sourceMappingURL=products.service.js.map