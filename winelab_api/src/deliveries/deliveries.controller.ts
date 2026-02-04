import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Role, DeliveryStatus } from '@prisma/client';
import { DeliveriesService } from './deliveries.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Deliveries')
@ApiBearerAuth()
@Controller('deliveries')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DeliveriesController {
    constructor(private deliveriesService: DeliveriesService) { }

    @Get()
    @ApiOperation({ summary: 'Список доставок' })
    @ApiQuery({ name: 'status', required: false, enum: DeliveryStatus })
    async findAll(@Query('status') status?: DeliveryStatus) {
        return this.deliveriesService.findAll({ status });
    }

    @Get(':id')
    @ApiOperation({ summary: 'Получить доставку' })
    async findOne(@Param('id') id: string) {
        return this.deliveriesService.findById(id);
    }

    @Post()
    @Roles(Role.ADMIN, Role.MANAGER, Role.WAREHOUSE)
    @ApiOperation({ summary: 'Создать доставку' })
    async create(@Body() data: { shipmentId: string; storeId: string; provider: string; externalId?: string }) {
        return this.deliveriesService.create(data);
    }

    @Patch(':id/status')
    @Roles(Role.ADMIN, Role.MANAGER, Role.WAREHOUSE)
    @ApiOperation({ summary: 'Обновить статус доставки' })
    async updateStatus(
        @Param('id') id: string,
        @Body() data: { status: DeliveryStatus; courierName?: string; courierPhone?: string },
    ) {
        return this.deliveriesService.updateStatus(id, data.status, data.courierName, data.courierPhone);
    }

    @Post(':id/events')
    @Roles(Role.ADMIN, Role.MANAGER)
    @ApiOperation({ summary: 'Добавить событие' })
    async addEvent(@Param('id') id: string, @Body() data: { title: string; description?: string }) {
        return this.deliveriesService.addEvent(id, data.title, data.description);
    }
}
