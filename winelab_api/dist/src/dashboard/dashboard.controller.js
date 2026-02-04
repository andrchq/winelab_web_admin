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
exports.DashboardController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const prisma_service_1 = require("../prisma/prisma.service");
let DashboardController = class DashboardController {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getStats() {
        const [totalAssets, totalStores, totalRequests, totalDeliveries, assetsByCondition, assetsByProcess, requestsByStatus, deliveriesByStatus, recentRequests, recentDeliveries,] = await Promise.all([
            this.prisma.asset.count(),
            this.prisma.store.count(),
            this.prisma.request.count(),
            this.prisma.delivery.count(),
            this.prisma.asset.groupBy({
                by: ['condition'],
                _count: true,
            }),
            this.prisma.asset.groupBy({
                by: ['processStatus'],
                _count: true,
            }),
            this.prisma.request.groupBy({
                by: ['status'],
                _count: true,
            }),
            this.prisma.delivery.groupBy({
                by: ['status'],
                _count: true,
            }),
            this.prisma.request.findMany({
                take: 5,
                orderBy: { createdAt: 'desc' },
                include: { store: true, creator: { select: { name: true } } },
            }),
            this.prisma.delivery.findMany({
                take: 5,
                orderBy: { createdAt: 'desc' },
                include: { store: true },
            }),
        ]);
        const conditionStats = Object.fromEntries(assetsByCondition.map(g => [g.condition, g._count]));
        const processStats = Object.fromEntries(assetsByProcess.map(g => [g.processStatus, g._count]));
        const requestStats = Object.fromEntries(requestsByStatus.map(g => [g.status, g._count]));
        const deliveryStats = Object.fromEntries(deliveriesByStatus.map(g => [g.status, g._count]));
        return {
            totals: {
                assets: totalAssets,
                stores: totalStores,
                requests: totalRequests,
                deliveries: totalDeliveries,
            },
            assets: {
                byCondition: conditionStats,
                byProcess: processStats,
            },
            requests: {
                byStatus: requestStats,
                recent: recentRequests,
            },
            deliveries: {
                byStatus: deliveryStats,
                recent: recentDeliveries,
            },
        };
    }
};
exports.DashboardController = DashboardController;
__decorate([
    (0, common_1.Get)('stats'),
    (0, swagger_1.ApiOperation)({ summary: 'Статистика для дашборда' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], DashboardController.prototype, "getStats", null);
exports.DashboardController = DashboardController = __decorate([
    (0, swagger_1.ApiTags)('Dashboard'),
    (0, common_1.Controller)('dashboard'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], DashboardController);
//# sourceMappingURL=dashboard.controller.js.map