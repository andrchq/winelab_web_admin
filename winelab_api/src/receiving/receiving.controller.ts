import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ReceivingService } from './receiving.service';

// Add guards if authentication is required (e.g. JwtAuthGuard)
// import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('receiving')
export class ReceivingController {
    constructor(private readonly receivingService: ReceivingService) { }

    @Post('commit')
    async commitSession(@Body() body: { warehouseId: string; items: { productId: string; quantity: number }[] }) {
        return this.receivingService.commitSession(body);
    }
}
