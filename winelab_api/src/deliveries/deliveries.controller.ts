import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { DeliveryStatus } from '@prisma/client';

import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { SystemPermission } from '../auth/permissions';
import { DeliveriesService } from './deliveries.service';

@ApiTags('Deliveries')
@ApiBearerAuth()
@Controller('deliveries')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class DeliveriesController {
    constructor(private deliveriesService: DeliveriesService) {}

    @Post('provider/yandex/webhook')
    @Public()
    @ApiOperation({ summary: 'Yandex Delivery webhook callback' })
    async yandexWebhook(@Body() payload: any) {
        return this.deliveriesService.syncYandexCallback(payload);
    }

    @Get()
    @RequirePermissions(SystemPermission.DELIVERY_READ)
    @ApiOperation({ summary: 'List deliveries' })
    @ApiQuery({ name: 'status', required: false, enum: DeliveryStatus })
    async findAll(@Query('status') status?: DeliveryStatus) {
        return this.deliveriesService.findAll({ status });
    }

    @Get(':id')
    @RequirePermissions(SystemPermission.DELIVERY_READ)
    @ApiOperation({ summary: 'Get delivery' })
    async findOne(@Param('id') id: string) {
        return this.deliveriesService.findById(id);
    }

    @Post()
    @RequirePermissions(SystemPermission.DELIVERY_UPDATE)
    @ApiOperation({ summary: 'Create delivery' })
    async create(@Body() data: { shipmentId: string; storeId: string; provider: string; externalId?: string }) {
        return this.deliveriesService.create(data);
    }

    @Patch(':id/status')
    @RequirePermissions(SystemPermission.DELIVERY_UPDATE)
    @ApiOperation({ summary: 'Update delivery status' })
    async updateStatus(
        @Param('id') id: string,
        @Body() data: { status: DeliveryStatus; courierName?: string; courierPhone?: string },
    ) {
        return this.deliveriesService.updateStatus(id, data.status, data.courierName, data.courierPhone);
    }

    @Post(':id/sync-provider')
    @RequirePermissions(SystemPermission.DELIVERY_UPDATE)
    @ApiOperation({ summary: 'Sync delivery status from provider' })
    async syncProvider(@Param('id') id: string) {
        return this.deliveriesService.syncProviderState(id);
    }

    @Post(':id/events')
    @RequirePermissions(SystemPermission.DELIVERY_UPDATE)
    @ApiOperation({ summary: 'Add delivery event' })
    async addEvent(@Param('id') id: string, @Body() data: { title: string; description?: string }) {
        return this.deliveriesService.addEvent(id, data.title, data.description);
    }
}
