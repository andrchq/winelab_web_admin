import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ReceivingService } from './receiving.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('receiving')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'MANAGER', 'WAREHOUSE')
export class ReceivingController {
    constructor(private readonly receivingService: ReceivingService) { }

    @Get()
    async findAll() {
        return this.receivingService.findAll();
    }

    @Get(':id')
    async findOne(@Param('id') id: string) {
        return this.receivingService.findOne(id);
    }

    @Post()
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
    async updateItem(
        @Param('sessionId') sessionId: string,
        @Param('itemId') itemId: string,
        @Body() body: { scannedQuantity: number },
    ) {
        return this.receivingService.updateItem(sessionId, itemId, body);
    }

    @Post(':id/complete')
    async complete(@Param('id') id: string) {
        return this.receivingService.complete(id);
    }

    @Delete(':id')
    async delete(@Param('id') id: string) {
        return this.receivingService.delete(id);
    }

    // Legacy endpoint for backward compatibility
    @Post('commit')
    async commitSession(@Body() body: { warehouseId: string; items: { productId: string; quantity: number }[] }) {
        return this.receivingService.commitSession(body);
    }
}
