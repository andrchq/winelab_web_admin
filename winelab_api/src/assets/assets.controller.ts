import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AssetCondition, AssetProcess } from '@prisma/client';
import { AssetsService } from './assets.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { SystemPermission } from '../auth/permissions';

@ApiTags('Assets')
@ApiBearerAuth()
@Controller('assets')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AssetsController {
    constructor(private assetsService: AssetsService) { }

    @Get()
    @RequirePermissions(SystemPermission.ASSET_READ)
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
    @RequirePermissions(SystemPermission.ASSET_READ)
    @ApiOperation({ summary: 'Получить оборудование' })
    async findOne(@Param('id') id: string) {
        return this.assetsService.findById(id);
    }

    @Get('serial/:sn')
    @RequirePermissions(SystemPermission.ASSET_READ)
    @ApiOperation({ summary: 'Найти по серийному номеру' })
    async findBySerial(@Param('sn') sn: string) {
        return this.assetsService.findBySerialNumber(sn);
    }

    @Post()
    @RequirePermissions(SystemPermission.ASSET_CREATE)
    @ApiOperation({ summary: 'Создать оборудование' })
    async create(@Body() data: { serialNumber: string; productId: string; warehouseId?: string }) {
        return this.assetsService.create(data);
    }

    @Patch(':id/status')
    @RequirePermissions(SystemPermission.ASSET_UPDATE)
    @ApiOperation({ summary: 'Обновить статус' })
    async updateStatus(@Param('id') id: string, @Body() data: { condition?: AssetCondition; processStatus?: AssetProcess }) {
        return this.assetsService.updateStatus(id, data);
    }

    @Patch(':id/install')
    @RequirePermissions(SystemPermission.ASSET_UPDATE)
    @ApiOperation({ summary: 'Отметить установленным' })
    async markInstalled(@Param('id') id: string) {
        return this.assetsService.markInstalled(id);
    }

    @Delete(':id')
    @RequirePermissions(SystemPermission.ASSET_DELETE)
    @ApiOperation({ summary: 'Удалить оборудование' })
    async delete(@Param('id') id: string) {
        return this.assetsService.delete(id);
    }
}
