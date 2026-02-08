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
                        scans: { orderBy: { timestamp: 'desc' } },
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
    async create(data: CreateSessionDto & { type?: string }, userId: string) {
        const session = await this.prisma.receivingSession.create({
            data: {
                warehouseId: data.warehouseId,
                invoiceNumber: data.invoiceNumber,
                supplier: data.supplier,
                createdById: userId,
                type: data.type || 'manual',
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

    // Update item scanned quantity (add scan)
    async updateItem(sessionId: string, itemId: string, data: UpdateItemDto & { isManual?: boolean; code?: string }) {
        // Check session exists
        const session = await this.prisma.receivingSession.findUnique({
            where: { id: sessionId },
        });

        if (!session) {
            throw new NotFoundException('Сессия приемки не найдена');
        }

        // Create scan record
        await this.prisma.receivingScan.create({
            data: {
                receivingItemId: itemId,
                quantity: data.scannedQuantity, // This is actually delta in our logic
                isManual: data.isManual || false,
                code: data.code,
            },
        });

        // Update item total
        const item = await this.prisma.receivingItem.findUnique({
            where: { id: itemId },
            include: { scans: true },
        });

        if (!item) throw new NotFoundException('Товар не найден');

        const totalScanned = item.scans.reduce((acc, scan) => acc + scan.quantity, 0);

        await this.prisma.receivingItem.update({
            where: { id: itemId },
            data: {
                scannedQuantity: totalScanned,
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

        return updatedSession;
    }

    // Remove scan
    async removeScan(sessionId: string, itemId: string, scanId: string) {
        // Verify scan belongs to item
        const scan = await this.prisma.receivingScan.findUnique({
            where: { id: scanId },
        });

        if (!scan || scan.receivingItemId !== itemId) {
            throw new NotFoundException('Запись сканирования не найдена');
        }

        // Delete scan
        await this.prisma.receivingScan.delete({
            where: { id: scanId },
        });

        // Calculate new total
        const item = await this.prisma.receivingItem.findUnique({
            where: { id: itemId },
            include: { scans: true },
        });

        if (item) {
            const totalScanned = item.scans.reduce((acc, s) => acc + s.quantity, 0);
            await this.prisma.receivingItem.update({
                where: { id: itemId },
                data: { scannedQuantity: totalScanned },
            });
        }

        // Fetch updated session
        const updatedSession = await this.findOne(sessionId);

        // Emit WebSocket event
        this.eventsGateway.server.emit('receiving_update', updatedSession);

        return updatedSession;
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
            let createdAssetsCount = 0;
            let updatedAssetsCount = 0;

            for (const item of session.items) {
                if (!item.productId || item.scannedQuantity === 0) continue;

                // 1. Process Scans to create/update Assets (Serialized Tracking)
                // We need to fetch scans for this item because session.items might not have them included in the top-level findUnique if not explicitly requested, 
                // but wait, the findUnique above INCLUDES items, but NOT scans inside items.
                // We need to fetch scans given the item structure in findAll/findOne usually includes them, but here we just did include: { items: true }.
                // Let's fetch scans for this item.
                const itemWithScans = await tx.receivingItem.findUnique({
                    where: { id: item.id },
                    include: { scans: true }
                });

                if (itemWithScans && itemWithScans.scans.length > 0) {
                    for (const scan of itemWithScans.scans) {
                        if (scan.code) {
                            // This scan has a Serial Number / Barcode
                            const existingAsset = await tx.asset.findUnique({
                                where: { serialNumber: scan.code }
                            });

                            if (existingAsset) {
                                // Asset exists -> Update its location to this warehouse
                                await tx.asset.update({
                                    where: { id: existingAsset.id },
                                    data: {
                                        warehouseId: session.warehouseId,
                                        storeId: null, // Moved to warehouse, so not in store
                                        processStatus: 'AVAILABLE', // Available in warehouse
                                        updatedAt: new Date(),
                                    }
                                });
                                // Add history record
                                await tx.assetHistory.create({
                                    data: {
                                        assetId: existingAsset.id,
                                        action: 'RECEIVED_EXISTING',
                                        location: `Warehouse: ${session.warehouseId}`,
                                        userId: session.createdById,
                                    }
                                });
                                updatedAssetsCount++;
                            } else {
                                // New Asset -> Create it
                                const newAsset = await tx.asset.create({
                                    data: {
                                        serialNumber: scan.code,
                                        productId: item.productId,
                                        warehouseId: session.warehouseId,
                                        condition: 'WORKING',
                                        processStatus: 'AVAILABLE',
                                    }
                                });
                                // Add history record
                                await tx.assetHistory.create({
                                    data: {
                                        assetId: newAsset.id,
                                        action: 'RECEIVED_NEW',
                                        location: `Warehouse: ${session.warehouseId}`,
                                        userId: session.createdById,
                                    }
                                });
                                createdAssetsCount++;
                            }
                        }
                    }
                }

                // 2. Update StockItem (Aggregate Quantity Tracking)
                const existingStock = await tx.stockItem.findUnique({
                    where: {
                        productId_warehouseId: {
                            productId: item.productId,
                            warehouseId: session.warehouseId,
                        },
                    },
                });

                if (existingStock) {
                    const updated = await tx.stockItem.update({
                        where: { id: existingStock.id },
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
                updatedStockCount: results.length,
                createdAssetsCount,
                updatedAssetsCount
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
