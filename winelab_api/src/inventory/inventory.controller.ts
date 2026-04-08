import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('inventory')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InventoryController {
    constructor(private readonly inventoryService: InventoryService) { }

    @Get()
    @Roles('ADMIN', 'MANAGER', 'WAREHOUSE')
    async findAll() {
        return this.inventoryService.findAll();
    }

    @Get(':id')
    @Roles('ADMIN', 'MANAGER', 'WAREHOUSE')
    async findOne(@Param('id') id: string, @Query('search') search?: string) {
        return this.inventoryService.getStats(id, search);
    }

    @Post('start')
    @Roles('ADMIN', 'MANAGER', 'WAREHOUSE')
    async startSession(@Body() body: { warehouseId: string }, @Request() req: any) {
        return this.inventoryService.startSession(req.user.id, body.warehouseId);
    }

    @Post(':id/scan')
    @Roles('ADMIN', 'MANAGER', 'WAREHOUSE')
    async scanItem(
        @Param('id') id: string,
        @Body() body: { barcode: string },
        @Request() req: any
    ) {
        return this.inventoryService.scanItem(id, body.barcode, req.user.id);
    }

    @Patch(':id/quantity/:recordId')
    @Roles('ADMIN', 'MANAGER', 'WAREHOUSE')
    async setQuantityCount(
        @Param('id') id: string,
        @Param('recordId') recordId: string,
        @Body() body: { countedQuantity: number },
    ) {
        return this.inventoryService.setQuantityCount(id, recordId, body.countedQuantity);
    }

    @Post(':id/finish')
    @Roles('ADMIN', 'MANAGER', 'WAREHOUSE')
    async finishSession(@Param('id') id: string) {
        return this.inventoryService.finishSession(id);
    }

    @Post(':id/apply-adjustments')
    @Roles('ADMIN', 'MANAGER', 'WAREHOUSE')
    async applyAdjustments(@Param('id') id: string, @Request() req: any) {
        return this.inventoryService.applyAdjustments(id, req.user.id);
    }
}
