import { PrismaService } from '../prisma/prisma.service';
interface CommitItemDto {
    productId: string;
    quantity: number;
}
interface CommitSessionDto {
    warehouseId: string;
    items: CommitItemDto[];
}
export declare class ReceivingService {
    private prisma;
    constructor(prisma: PrismaService);
    commitSession(data: CommitSessionDto): Promise<{
        success: boolean;
        updatedCount: number;
    }>;
}
export {};
