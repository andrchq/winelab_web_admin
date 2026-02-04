import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('Dashboard')
@Controller('dashboard')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DashboardController {
    constructor(private prisma: PrismaService) { }

    @Get('stats')
    @ApiOperation({ summary: 'Статистика для дашборда' })
    async getStats() {
        // Параллельно получаем все данные
        const [
            totalAssets,
            totalStores,
            totalRequests,
            totalDeliveries,
            assetsByCondition,
            assetsByProcess,
            requestsByStatus,
            deliveriesByStatus,
            recentRequests,
            recentDeliveries,
        ] = await Promise.all([
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

        // Преобразуем группировки в объекты
        const conditionStats = Object.fromEntries(
            assetsByCondition.map(g => [g.condition, g._count])
        );
        const processStats = Object.fromEntries(
            assetsByProcess.map(g => [g.processStatus, g._count])
        );
        const requestStats = Object.fromEntries(
            requestsByStatus.map(g => [g.status, g._count])
        );
        const deliveryStats = Object.fromEntries(
            deliveriesByStatus.map(g => [g.status, g._count])
        );

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
}
