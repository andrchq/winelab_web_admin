import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Role, AssetCondition, AssetProcess } from '@prisma/client';
import { AssetsService } from './assets.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Assets')
@ApiBearerAuth()
@Controller('assets')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AssetsController {
    constructor(private assetsService: AssetsService) { }

    @Get()
    @ApiOperation({ summary: 'Список оборудования' })
    @ApiQuery({ name: 'condition', required: false, enum: AssetCondition })
    @ApiQuery({ name: 'processStatus', required: false, enum: AssetProcess })
    async findAll(
        @Query('condition') condition?: AssetCondition,
        @Query('processStatus') processStatus?: AssetProcess,
    ) {
        return this.assetsService.findAll({ condition, processStatus });
    }

    @Get(':id')
    @ApiOperation({ summary: 'Получить оборудование' })
    async findOne(@Param('id') id: string) {
        return this.assetsService.findById(id);
    }

    @Get('serial/:sn')
    @ApiOperation({ summary: 'Найти по серийному номеру' })
    async findBySerial(@Param('sn') sn: string) {
        return this.assetsService.findBySerialNumber(sn);
    }

    @Post()
    @Roles(Role.ADMIN, Role.MANAGER, Role.WAREHOUSE)
    @ApiOperation({ summary: 'Создать оборудование' })
    async create(@Body() data: { serialNumber: string; productId: string; warehouseId?: string }) {
        return this.assetsService.create(data);
    }

    @Patch(':id/status')
    @Roles(Role.ADMIN, Role.MANAGER, Role.WAREHOUSE)
    @ApiOperation({ summary: 'Обновить статус' })
    async updateStatus(@Param('id') id: string, @Body() data: { condition?: AssetCondition; processStatus?: AssetProcess }) {
        return this.assetsService.updateStatus(id, data);
    }

    @Patch(':id/install')
    @Roles(Role.ADMIN, Role.MANAGER, Role.SUPPORT)
    @ApiOperation({ summary: 'Отметить установленным' })
    async markInstalled(@Param('id') id: string) {
        return this.assetsService.markInstalled(id);
    }
    @Delete(':id')
    @Roles(Role.ADMIN, Role.MANAGER)
    @ApiOperation({ summary: 'Удалить оборудование' })
    async delete(@Param('id') id: string) {
        return this.assetsService.delete(id);
    }
}
