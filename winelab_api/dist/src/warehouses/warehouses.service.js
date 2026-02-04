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
exports.WarehousesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let WarehousesService = class WarehousesService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll() {
        return this.prisma.warehouse.findMany({
            where: { isActive: true },
            include: {
                stockItems: true,
            },
        });
    }
    async findById(id) {
        return this.prisma.warehouse.findUnique({
            where: { id },
        });
    }
    async create(data) {
        return this.prisma.warehouse.create({
            data,
        });
    }
    async update(id, data) {
        return this.prisma.warehouse.update({
            where: { id },
            data,
        });
    }
    async delete(id) {
        return this.prisma.warehouse.update({
            where: { id },
            data: { isActive: false },
        });
    }
    async getDetails(id) {
        const warehouse = await this.prisma.warehouse.findUnique({
            where: { id },
            include: {
                stockItems: true,
            }
        });
        if (!warehouse)
            return null;
        const recentRequests = await this.prisma.shipment.findMany({
            where: {
                warehouseId: id,
                request: {
                    creator: {
                        role: 'SUPPORT'
                    }
                }
            },
            take: 10,
            orderBy: { createdAt: 'desc' },
            include: {
                request: {
                    include: {
                        creator: true,
                        store: true
                    }
                },
                items: {
                    include: {
                        asset: {
                            include: {
                                product: true
                            }
                        }
                    }
                }
            }
        });
        const recentInstallations = await this.prisma.delivery.findMany({
            where: {
                shipment: {
                    warehouseId: id
                },
                status: 'DELIVERED'
            },
            take: 10,
            orderBy: { createdAt: 'desc' },
            include: {
                store: true,
                shipment: {
                    include: {
                        items: {
                            include: {
                                asset: {
                                    include: {
                                        product: true
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });
        const newStores = await this.prisma.store.findMany({
            where: {
                deliveries: {
                    some: {
                        shipment: {
                            warehouseId: id
                        }
                    }
                }
            },
            take: 10,
            orderBy: { createdAt: 'desc' },
            include: {
                _count: {
                    select: { assets: true }
                }
            }
        });
        const totalItems = warehouse.stockItems.reduce((acc, item) => acc + item.quantity, 0);
        const lowStockItems = warehouse.stockItems.filter(item => item.quantity <= item.minQuantity).length;
        return {
            ...warehouse,
            stats: {
                totalDetails: totalItems,
                lowStockPositions: lowStockItems,
            },
            recentRequests: recentRequests.map(r => ({
                id: r.id,
                date: r.createdAt,
                engineer: r.request.creator,
                store: r.request.store,
                itemsCount: r.items.length
            })),
            recentInstallations: recentInstallations.map(d => ({
                id: d.id,
                date: d.deliveredAt || d.createdAt,
                store: d.store,
                items: d.shipment.items.map(i => i.asset.product.name)
            })),
            newStores: newStores
        };
    }
};
exports.WarehousesService = WarehousesService;
exports.WarehousesService = WarehousesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], WarehousesService);
//# sourceMappingURL=warehouses.service.js.map