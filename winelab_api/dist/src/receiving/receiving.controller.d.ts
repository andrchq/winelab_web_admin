import { ReceivingService } from './receiving.service';
export declare class ReceivingController {
    private readonly receivingService;
    constructor(receivingService: ReceivingService);
    commitSession(body: {
        warehouseId: string;
        items: {
            productId: string;
            quantity: number;
        }[];
    }): Promise<{
        success: boolean;
        updatedCount: number;
    }>;
}
