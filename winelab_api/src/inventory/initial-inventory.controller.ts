import { Body, Controller, Delete, Get, Param, Patch, Post, Request, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { InitialInventoryService } from './initial-inventory.service';

@Controller('inventory/initial')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InitialInventoryController {
    constructor(private readonly initialInventoryService: InitialInventoryService) { }

    @Post('start')
    @Roles('ADMIN', 'MANAGER', 'WAREHOUSE')
    async start(@Body() body: { warehouseId: string }, @Request() req: any) {
        return this.initialInventoryService.startSession(req.user.id, body.warehouseId);
    }

    @Get(':id')
    @Roles('ADMIN', 'MANAGER', 'WAREHOUSE')
    async findOne(@Param('id') id: string) {
        return this.initialInventoryService.findOne(id);
    }

    @Post(':id/entries')
    @Roles('ADMIN', 'MANAGER', 'WAREHOUSE')
    async createEntry(@Param('id') id: string, @Body() body: { productId: string }) {
        return this.initialInventoryService.createEntry(id, body.productId);
    }

    @Post(':id/entries/:entryId/scans')
    @Roles('ADMIN', 'MANAGER', 'WAREHOUSE')
    async addScan(
        @Param('id') id: string,
        @Param('entryId') entryId: string,
        @Body() body: { code: string },
    ) {
        return this.initialInventoryService.addScan(id, entryId, body.code);
    }

    @Patch(':id/entries/:entryId/scans/:scanId/review')
    @Roles('ADMIN', 'MANAGER', 'WAREHOUSE')
    async resolveScanConflict(
        @Param('id') id: string,
        @Param('entryId') entryId: string,
        @Param('scanId') scanId: string,
    ) {
        return this.initialInventoryService.resolveScanConflict(id, entryId, scanId);
    }

    @Delete(':id/entries/:entryId/scans/:scanId')
    @Roles('ADMIN', 'MANAGER', 'WAREHOUSE')
    async deleteScan(
        @Param('id') id: string,
        @Param('entryId') entryId: string,
        @Param('scanId') scanId: string,
    ) {
        return this.initialInventoryService.deleteScan(id, entryId, scanId);
    }

    @Patch(':id/entries/:entryId/quantity')
    @Roles('ADMIN', 'MANAGER', 'WAREHOUSE')
    async setQuantity(
        @Param('id') id: string,
        @Param('entryId') entryId: string,
        @Body() body: { quantity: number },
    ) {
        return this.initialInventoryService.setQuantity(id, entryId, body.quantity);
    }

    @Delete(':id/entries/:entryId')
    @Roles('ADMIN', 'MANAGER', 'WAREHOUSE')
    async deleteEntry(@Param('id') id: string, @Param('entryId') entryId: string) {
        return this.initialInventoryService.deleteEntry(id, entryId);
    }

    @Post(':id/apply')
    @Roles('ADMIN', 'MANAGER', 'WAREHOUSE')
    async apply(@Param('id') id: string, @Request() req: any) {
        return this.initialInventoryService.applySession(id, req.user.id);
    }
}
