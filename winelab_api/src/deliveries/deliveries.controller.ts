import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { DeliveryStatus } from '@prisma/client';
import { DeliveriesService } from './deliveries.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { SystemPermission } from '../auth/permissions';

@ApiTags('Deliveries')
@ApiBearerAuth()
@Controller('deliveries')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class DeliveriesController {
    constructor(private deliveriesService: DeliveriesService) { }

    @Get()
    @RequirePermissions(SystemPermission.DELIVERY_READ)
    @ApiOperation({ summary: 'Список доставок' })
    @ApiQuery({ name: 'status', required: false, enum: DeliveryStatus })
    async findAll(@Query('status') status?: DeliveryStatus) {
        return this.deliveriesService.findAll({ status });
    }

    @Get(':id')
    @RequirePermissions(SystemPermission.DELIVERY_READ)
    @ApiOperation({ summary: 'Получить доставку' })
    async findOne(@Param('id') id: string) {
        return this.deliveriesService.findById(id);
    }

    @Post()
    @RequirePermissions(SystemPermission.DELIVERY_UPDATE)
    @ApiOperation({ summary: 'Создать доставку' })
    async create(@Body() data: { shipmentId: string; storeId: string; provider: string; externalId?: string }) {
        return this.deliveriesService.create(data);
    }

    @Patch(':id/status')
    @RequirePermissions(SystemPermission.DELIVERY_UPDATE)
    @ApiOperation({ summary: 'Обновить статус доставки' })
    async updateStatus(
        @Param('id') id: string,
        @Body() data: { status: DeliveryStatus; courierName?: string; courierPhone?: string },
    ) {
        return this.deliveriesService.updateStatus(id, data.status, data.courierName, data.courierPhone);
    }

    @Post(':id/events')
    @RequirePermissions(SystemPermission.DELIVERY_UPDATE)
    @ApiOperation({ summary: 'Добавить событие' })
    async addEvent(@Param('id') id: string, @Body() data: { title: string; description?: string }) {
        return this.deliveriesService.addEvent(id, data.title, data.description);
    }
}
