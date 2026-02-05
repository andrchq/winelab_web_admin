import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventsGateway } from '../events/events.gateway';

interface CreateSessionDto {
    warehouseId: string;
    invoiceNumber?: string;
    supplier?: string;
    items: {
        name: string;
        sku?: string;
        expectedQuantity: number;
        productId?: string;
    }[];
}

interface UpdateItemDto {
    scannedQuantity: number;
}

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
    constructor(
        private prisma: PrismaService,
        private eventsGateway: EventsGateway,
    ) { }

    // Get all sessions
    async findAll() {
        return this.prisma.receivingSession.findMany({
            include: {
                warehouse: { select: { id: true, name: true } },
                createdBy: { select: { id: true, name: true } },
                items: true,
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    // Get session by ID
    async findOne(id: string) {
        const session = await this.prisma.receivingSession.findUnique({
            where: { id },
            include: {
                warehouse: { select: { id: true, name: true } },
                createdBy: { select: { id: true, name: true } },
                items: {
                    include: {
                        product: { select: { id: true, name: true, sku: true } },
                    },
                },
            },
        });

        if (!session) {
            throw new NotFoundException('Сессия приемки не найдена');
        }

        return session;
    }

    // Create new session
    async create(data: CreateSessionDto, userId: string) {
        const session = await this.prisma.receivingSession.create({
            data: {
                warehouseId: data.warehouseId,
                invoiceNumber: data.invoiceNumber,
                supplier: data.supplier,
                createdById: userId,
                items: {
                    create: data.items.map(item => ({
                        name: item.name,
                        sku: item.sku,
                        expectedQuantity: item.expectedQuantity,
                        productId: item.productId,
                        scannedQuantity: 0,
                    })),
                },
            },
            include: {
                warehouse: { select: { id: true, name: true } },
                createdBy: { select: { id: true, name: true } },
                items: true,
            },
        });

        // Emit WebSocket event
        this.eventsGateway.server.emit('receiving_update', session);

        return session;
    }

    // Update item scanned quantity
    async updateItem(sessionId: string, itemId: string, data: UpdateItemDto) {
        // Check session exists
        const session = await this.prisma.receivingSession.findUnique({
            where: { id: sessionId },
        });

        if (!session) {
            throw new NotFoundException('Сессия приемки не найдена');
        }

        // Update item
        const item = await this.prisma.receivingItem.update({
            where: { id: itemId },
            data: {
                scannedQuantity: data.scannedQuantity,
            },
        });

        // Update session status to IN_PROGRESS if it was DRAFT
        if (session.status === 'DRAFT') {
            await this.prisma.receivingSession.update({
                where: { id: sessionId },
                data: { status: 'IN_PROGRESS' },
            });
        }

        // Fetch updated session
        const updatedSession = await this.findOne(sessionId);

        // Emit WebSocket event
        this.eventsGateway.server.emit('receiving_update', updatedSession);

        return item;
    }

    // Complete session (commit to stock)
    async complete(sessionId: string) {
        const session = await this.prisma.receivingSession.findUnique({
            where: { id: sessionId },
            include: { items: true },
        });

        if (!session) {
            throw new NotFoundException('Сессия приемки не найдена');
        }

        if (session.status === 'COMPLETED') {
            throw new BadRequestException('Сессия уже завершена');
        }

        // Use transaction to ensure all stock updates happen or none
        return this.prisma.$transaction(async (tx) => {
            const results = [];

            for (const item of session.items) {
                if (!item.productId || item.scannedQuantity === 0) continue;

                // Check if stock item exists
                const existing = await tx.stockItem.findUnique({
                    where: {
                        productId_warehouseId: {
                            productId: item.productId,
                            warehouseId: session.warehouseId,
                        },
                    },
                });

                if (existing) {
                    const updated = await tx.stockItem.update({
                        where: { id: existing.id },
                        data: {
                            quantity: { increment: item.scannedQuantity },
                        },
                    });
                    results.push(updated);
                } else {
                    const created = await tx.stockItem.create({
                        data: {
                            productId: item.productId,
                            warehouseId: session.warehouseId,
                            quantity: item.scannedQuantity,
                            minQuantity: 0,
                        },
                    });
                    results.push(created);
                }
            }

            // Mark session as completed
            const completedSession = await tx.receivingSession.update({
                where: { id: sessionId },
                data: {
                    status: 'COMPLETED',
                    completedAt: new Date(),
                },
                include: {
                    warehouse: { select: { id: true, name: true } },
                    createdBy: { select: { id: true, name: true } },
                    items: true,
                },
            });

            // Emit WebSocket event
            this.eventsGateway.server.emit('receiving_update', completedSession);

            return {
                success: true,
                session: completedSession,
                updatedCount: results.length,
            };
        });
    }

    // Delete session
    async delete(id: string) {
        const session = await this.prisma.receivingSession.findUnique({
            where: { id },
        });

        if (!session) {
            throw new NotFoundException('Сессия приемки не найдена');
        }

        if (session.status === 'COMPLETED') {
            throw new BadRequestException('Невозможно удалить завершенную сессию');
        }

        await this.prisma.receivingSession.delete({
            where: { id },
        });

        // Emit WebSocket event
        this.eventsGateway.server.emit('receiving_delete', { id });

        return { success: true };
    }

    // Legacy commit method (for backward compatibility)
    async commitSession(data: CommitSessionDto) {
        if (!data.warehouseId) throw new BadRequestException('Warehouse ID is required');
        if (!data.items || data.items.length === 0) throw new BadRequestException('Items array is empty');

        return this.prisma.$transaction(async (tx) => {
            const results = [];

            for (const item of data.items) {
                if (!item.productId || !item.quantity) continue;

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
