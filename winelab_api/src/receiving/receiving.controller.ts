import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ReceivingService } from './receiving.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { SystemPermission } from '../auth/permissions';

@Controller('receiving')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ReceivingController {
    constructor(private readonly receivingService: ReceivingService) { }

    @Get()
    @RequirePermissions(SystemPermission.RECEIVING_READ)
    async findAll() {
        return this.receivingService.findAll();
    }

    @Get(':id')
    @RequirePermissions(SystemPermission.RECEIVING_READ)
    async findOne(@Param('id') id: string) {
        return this.receivingService.findOne(id);
    }

    @Post()
    @RequirePermissions(SystemPermission.RECEIVING_CREATE)
    async create(
        @Body() body: {
            warehouseId: string;
            invoiceNumber?: string;
            supplier?: string;
            items: {
                name: string;
                sku?: string;
                expectedQuantity: number;
                productId?: string;
            }[];
        },
        @Request() req: any,
    ) {
        return this.receivingService.create(body, req.user.id);
    }

    @Patch(':sessionId/items/:itemId')
    @RequirePermissions(SystemPermission.RECEIVING_UPDATE)
    async updateItem(
        @Param('sessionId') sessionId: string,
        @Param('itemId') itemId: string,
        @Body() body: { scannedQuantity: number; isManual?: boolean; code?: string },
    ) {
        return this.receivingService.updateItem(sessionId, itemId, body);
    }

    @Delete(':sessionId/items/:itemId/scans/:scanId')
    @RequirePermissions(SystemPermission.RECEIVING_UPDATE)
    async removeScan(
        @Param('sessionId') sessionId: string,
        @Param('itemId') itemId: string,
        @Param('scanId') scanId: string,
    ) {
        return this.receivingService.removeScan(sessionId, itemId, scanId);
    }

    @Post(':id/complete')
    @RequirePermissions(SystemPermission.RECEIVING_UPDATE)
    async complete(
        @Param('id') id: string,
        @Request() req: any
    ) {
        return this.receivingService.complete(id, req.user?.id);
    }


    @Delete(':id')
    @RequirePermissions(SystemPermission.RECEIVING_UPDATE)
    async delete(@Param('id') id: string) {
        return this.receivingService.delete(id);
    }

    // Legacy endpoint for backward compatibility
    @Post('commit')
    @RequirePermissions(SystemPermission.RECEIVING_UPDATE)
    async commitSession(@Body() body: { warehouseId: string; items: { productId: string; quantity: number }[] }) {
        return this.receivingService.commitSession(body);
    }
}
