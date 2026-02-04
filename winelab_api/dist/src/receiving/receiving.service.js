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
exports.ReceivingService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let ReceivingService = class ReceivingService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async commitSession(data) {
        if (!data.warehouseId)
            throw new common_1.BadRequestException('Warehouse ID is required');
        if (!data.items || data.items.length === 0)
            throw new common_1.BadRequestException('Items array is empty');
        return this.prisma.$transaction(async (tx) => {
            const results = [];
            for (const item of data.items) {
                if (!item.productId || !item.quantity)
                    continue;
                const existing = await tx.stockItem.findUnique({
                    where: {
                        productId_warehouseId: {
                            productId: item.productId,
                            warehouseId: data.warehouseId,
                        },
                    },
                });
                if (existing) {
                    const updated = await tx.stockItem.update({
                        where: { id: existing.id },
                        data: {
                            quantity: { increment: item.quantity },
                        },
                    });
                    results.push(updated);
                }
                else {
                    const created = await tx.stockItem.create({
                        data: {
                            productId: item.productId,
                            warehouseId: data.warehouseId,
                            quantity: item.quantity,
                            minQuantity: 0,
                        },
                    });
                    results.push(created);
                }
            }
            return {
                success: true,
                updatedCount: results.length,
            };
        });
    }
};
exports.ReceivingService = ReceivingService;
exports.ReceivingService = ReceivingService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ReceivingService);
//# sourceMappingURL=receiving.service.js.map