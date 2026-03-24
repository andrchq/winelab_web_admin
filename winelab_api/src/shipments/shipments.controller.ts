import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ShipmentStatus, User } from '@prisma/client';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { SystemPermission } from '../auth/permissions';
import { ShipmentsService } from './shipments.service';

@ApiTags('Shipments')
@ApiBearerAuth()
@Controller('shipments')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ShipmentsController {
  constructor(private shipmentsService: ShipmentsService) {}

  @Get()
  @RequirePermissions(SystemPermission.SHIPMENT_READ)
  @ApiOperation({ summary: 'List shipments' })
  @ApiQuery({ name: 'status', required: false, enum: ShipmentStatus })
  async findAll(@Query('status') status?: ShipmentStatus) {
    return this.shipmentsService.findAll({ status });
  }

  @Get(':id')
  @RequirePermissions(SystemPermission.SHIPMENT_READ)
  @ApiOperation({ summary: 'Get shipment' })
  async findOne(@Param('id') id: string) {
    return this.shipmentsService.findById(id);
  }

  @Post()
  @RequirePermissions(SystemPermission.SHIPMENT_CREATE)
  @ApiOperation({ summary: 'Create shipment' })
  async create(
    @Body()
    data: {
      requestId?: string;
      warehouseId: string;
      destinationType: 'store' | 'warehouse' | 'other';
      destinationId?: string;
      destination: string;
      items?: {
        productId?: string;
        originalName: string;
        sku?: string;
        quantity?: number;
        expectedQuantity?: number;
        scannedQuantity?: number;
      }[];
      requestNumber?: string;
      invoiceNumber?: string;
      supplier?: string;
      type: 'manual' | 'file';
    },
  ) {
    return this.shipmentsService.create(data);
  }

  @Post(':id/lines')
  @RequirePermissions(SystemPermission.SHIPMENT_UPDATE)
  @ApiOperation({ summary: 'Add shipment line' })
  async addLine(
    @Param('id') id: string,
    @Body()
    data: {
      productId?: string;
      originalName: string;
      sku?: string;
      quantity?: number;
      expectedQuantity?: number;
    },
  ) {
    return this.shipmentsService.addLine(id, data);
  }

  @Post(':id/lines/:lineId/scans')
  @RequirePermissions(SystemPermission.SHIPMENT_UPDATE)
  @ApiOperation({ summary: 'Add scan to shipment line' })
  async addScan(
    @Param('id') id: string,
    @Param('lineId') lineId: string,
    @Body() data: { quantity: number; isManual?: boolean; code?: string },
  ) {
    return this.shipmentsService.addScan(id, lineId, data.quantity, data.isManual, data.code);
  }

  @Delete(':id/lines/:lineId/scans/:scanId')
  @RequirePermissions(SystemPermission.SHIPMENT_UPDATE)
  @ApiOperation({ summary: 'Delete shipment scan' })
  async removeScan(
    @Param('id') id: string,
    @Param('lineId') lineId: string,
    @Param('scanId') scanId: string,
  ) {
    return this.shipmentsService.removeScan(id, lineId, scanId);
  }

  @Post(':id/consumables')
  @RequirePermissions(SystemPermission.SHIPMENT_UPDATE)
  @ApiOperation({ summary: 'Add consumables to shipment' })
  async addConsumables(
    @Param('id') id: string,
    @Body() data: { productId: string; quantity: number; warehouseId: string },
  ) {
    return this.shipmentsService.addConsumables(id, data.productId, data.quantity, data.warehouseId);
  }

  @Get(':id/store-delivery-preview')
  @RequirePermissions(SystemPermission.SHIPMENT_READ)
  @ApiOperation({ summary: 'Preview store delivery in Yandex Delivery' })
  async getStoreDeliveryPreview(@Param('id') id: string) {
    return this.shipmentsService.getStoreDeliveryPreview(id);
  }

  @Post(':id/confirm-store-delivery')
  @RequirePermissions(SystemPermission.SHIPMENT_UPDATE)
  @ApiOperation({ summary: 'Confirm shipment to store and create Yandex Delivery claim' })
  async confirmStoreDelivery(@Param('id') id: string, @CurrentUser() user: User) {
    return this.shipmentsService.confirmStoreDelivery(id, user.id);
  }

  @Patch('items/:itemId/pick')
  @RequirePermissions(SystemPermission.SHIPMENT_UPDATE)
  @ApiOperation({ summary: 'Legacy pick endpoint compatibility' })
  async pickItem(@Param('itemId') itemId: string) {
    return { success: true, itemId };
  }

  @Post(':id/commit')
  @RequirePermissions(SystemPermission.SHIPMENT_UPDATE)
  @ApiOperation({ summary: 'Commit shipment' })
  async commitShipment(@Param('id') id: string, @CurrentUser() user: User) {
    return this.shipmentsService.commitShipment(id, user.id);
  }

  @Patch(':id/status')
  @RequirePermissions(SystemPermission.SHIPMENT_UPDATE)
  @ApiOperation({ summary: 'Update shipment status' })
  async updateStatus(
    @Param('id') id: string,
    @Body() data: { status: ShipmentStatus },
    @CurrentUser() user: User,
  ) {
    return this.shipmentsService.updateStatus(id, data.status, user.id);
  }

  @Delete(':id')
  @RequirePermissions(SystemPermission.SHIPMENT_DELETE)
  @ApiOperation({ summary: 'Delete shipment' })
  async deleteShipment(@Param('id') id: string) {
    return this.shipmentsService.deleteShipment(id);
  }
}
