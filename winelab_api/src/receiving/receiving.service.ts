import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface CommitItemDto {
    productId: string;
    quantity: number;
}

interface CommitSessionDto {
    warehouseId: string;
    items: CommitItemDto[];
}

@Injectable()
export class ReceivingService {
    constructor(private prisma: PrismaService) { }

    async commitSession(data: CommitSessionDto) {
        if (!data.warehouseId) throw new BadRequestException('Warehouse ID is required');
        if (!data.items || data.items.length === 0) throw new BadRequestException('Items array is empty');

        // Use transaction to ensure all stock updates happen or none
        return this.prisma.$transaction(async (tx) => {
            const results = [];

            for (const item of data.items) {
                if (!item.productId || !item.quantity) continue;

                // Check if stock item exists
                const existing = await tx.stockItem.findUnique({
                    where: {
                        productId_warehouseId: {
                            productId: item.productId,
                            warehouseId: data.warehouseId,
                        },
                    },
                });

                if (existing) {
                    const updated = await tx.stockItem.update({
                        where: { id: existing.id },
                        data: {
                            quantity: { increment: item.quantity },
                        },
                    });
                    results.push(updated);
                } else {
                    const created = await tx.stockItem.create({
                        data: {
                            productId: item.productId,
                            warehouseId: data.warehouseId,
                            quantity: item.quantity,
                            minQuantity: 0,
                        },
                    });
                    results.push(created);
                }
            }

            return {
                success: true,
                updatedCount: results.length,
            };
        });
    }
}
