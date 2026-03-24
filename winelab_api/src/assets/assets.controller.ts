import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { AssetCondition, AssetProcess } from '@prisma/client';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { SystemPermission } from '../auth/permissions';
import { AssetsService } from './assets.service';

@ApiTags('Assets')
@ApiBearerAuth()
@Controller('assets')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AssetsController {
    constructor(private assetsService: AssetsService) {}

    @Get()
    @RequirePermissions(SystemPermission.ASSET_READ)
    @ApiOperation({ summary: 'List assets' })
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
    @ApiOperation({ summary: 'Get asset' })
    async findOne(@Param('id') id: string) {
        return this.assetsService.findById(id);
    }

    @Get('serial/:sn')
    @RequirePermissions(SystemPermission.ASSET_READ)
    @ApiOperation({ summary: 'Find asset by serial number' })
    async findBySerial(@Param('sn') sn: string) {
        return this.assetsService.findBySerialNumber(sn);
    }

    @Post()
    @RequirePermissions(SystemPermission.ASSET_CREATE)
    @ApiOperation({ summary: 'Create asset' })
    async create(@Body() data: { serialNumber: string; productId: string; warehouseId?: string }) {
        return this.assetsService.create(data);
    }

    @Patch(':id')
    @RequirePermissions(SystemPermission.ASSET_UPDATE)
    @ApiOperation({ summary: 'Update asset' })
    async update(
        @Param('id') id: string,
        @Body() data: { condition?: AssetCondition; processStatus?: AssetProcess; notes?: string; serialNumber?: string },
        @Request() req: any,
    ) {
        return this.assetsService.update(id, data, req.user?.id);
    }

    @Post('batch-replacement-request')
    @RequirePermissions(SystemPermission.ASSET_UPDATE)
    @ApiOperation({ summary: 'Create replacement request for assets' })
    async createBatchReplacementRequest(
        @Body()
        data: {
            assetIds: string[];
            warehouseId: string;
            reason: string;
            deliveryContactName?: string;
            deliveryContactPhone?: string;
            deliveryComment?: string;
        },
        @Request() req: any,
    ) {
        return this.assetsService.createBatchReplacementRequest(
            data.assetIds,
            data.warehouseId,
            data.reason,
            req.user?.id,
            {
                deliveryContactName: data.deliveryContactName,
                deliveryContactPhone: data.deliveryContactPhone,
                deliveryComment: data.deliveryComment,
            },
        );
    }

    @Patch(':id/status')
    @RequirePermissions(SystemPermission.ASSET_UPDATE)
    @ApiOperation({ summary: 'Update asset status' })
    async updateStatus(@Param('id') id: string, @Body() data: { condition?: AssetCondition; processStatus?: AssetProcess }) {
        return this.assetsService.updateStatus(id, data);
    }

    @Patch(':id/install')
    @RequirePermissions(SystemPermission.ASSET_UPDATE)
    @ApiOperation({ summary: 'Mark asset installed' })
    async markInstalled(@Param('id') id: string) {
        return this.assetsService.markInstalled(id);
    }

    @Delete(':id')
    @RequirePermissions(SystemPermission.ASSET_DELETE)
    @ApiOperation({ summary: 'Delete asset' })
    async delete(@Param('id') id: string) {
        return this.assetsService.delete(id);
    }
}
