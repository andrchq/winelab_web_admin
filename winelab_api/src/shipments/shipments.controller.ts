import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Role, ShipmentStatus, User } from '@prisma/client';
import { ShipmentsService } from './shipments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Shipments')
@ApiBearerAuth()
@Controller('shipments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ShipmentsController {
    constructor(private shipmentsService: ShipmentsService) { }

    @Get()
    @ApiOperation({ summary: 'Список отгрузок' })
    @ApiQuery({ name: 'status', required: false, enum: ShipmentStatus })
    async findAll(@Query('status') status?: ShipmentStatus) {
        return this.shipmentsService.findAll({ status });
    }

    @Get(':id')
    @ApiOperation({ summary: 'Получить отгрузку' })
    async findOne(@Param('id') id: string) {
        return this.shipmentsService.findById(id);
    }

    @Post()
    @Roles(Role.ADMIN, Role.MANAGER, Role.WAREHOUSE)
    @ApiOperation({ summary: 'Создать отгрузку' })
    async create(@Body() data: { requestId: string; warehouseId: string }) {
        return this.shipmentsService.create(data.requestId, data.warehouseId);
    }

    @Post(':id/items')
    @Roles(Role.ADMIN, Role.MANAGER, Role.WAREHOUSE)
    @ApiOperation({ summary: 'Добавить оборудование в отгрузку' })
    async addItem(@Param('id') id: string, @Body() data: { assetId: string }) {
        return this.shipmentsService.addItem(id, data.assetId);
    }

    @Patch('items/:itemId/pick')
    @Roles(Role.ADMIN, Role.WAREHOUSE)
    @ApiOperation({ summary: 'Отметить позицию собранной' })
    async pickItem(@Param('itemId') itemId: string) {
        return this.shipmentsService.pickItem(itemId);
    }

    @Patch(':id/status')
    @Roles(Role.ADMIN, Role.MANAGER, Role.WAREHOUSE)
    @ApiOperation({ summary: 'Обновить статус отгрузки' })
    async updateStatus(
        @Param('id') id: string,
        @Body() data: { status: ShipmentStatus },
        @CurrentUser() user: User,
    ) {
        return this.shipmentsService.updateStatus(id, data.status, user.id);
    }
}
