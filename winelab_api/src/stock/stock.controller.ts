import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { StockService } from './stock.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Stock')
@ApiBearerAuth()
@Controller('stock')
@UseGuards(JwtAuthGuard, RolesGuard)
export class StockController {
    constructor(private stockService: StockService) { }

    @Get()
    @ApiOperation({ summary: 'Список всех позиций на складе' })
    async findAll() {
        return this.stockService.findAll();
    }

    @Get(':id')
    @ApiOperation({ summary: 'Получить позицию' })
    async findOne(@Param('id') id: string) {
        return this.stockService.findOne(id);
    }

    @Post()
    @Roles(Role.ADMIN, Role.MANAGER, Role.WAREHOUSE)
    @ApiOperation({ summary: 'Создать позицию или добавить количество' })
    async create(@Body() data: { productId: string; warehouseId: string; quantity: number; minQuantity?: number }) {
        return this.stockService.create(data);
    }

    @Patch(':id')
    @Roles(Role.ADMIN, Role.MANAGER, Role.WAREHOUSE)
    @ApiOperation({ summary: 'Обновить параметры позиции' })
    async update(@Param('id') id: string, @Body() data: { minQuantity?: number }) {
        return this.stockService.update(id, data);
    }

    @Patch(':id/adjust')
    @Roles(Role.ADMIN, Role.MANAGER, Role.WAREHOUSE)
    @ApiOperation({ summary: 'Изменить количество (+/-)' })
    async adjust(@Param('id') id: string, @Body() data: { delta: number }) {
        return this.stockService.adjust(id, data.delta);
    }

    @Delete(':id')
    @Roles(Role.ADMIN, Role.MANAGER)
    @ApiOperation({ summary: 'Удалить позицию' })
    async delete(@Param('id') id: string) {
        return this.stockService.delete(id);
    }
}
