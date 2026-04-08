import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export const InventoryStatus = {
    EXPECTED: 'EXPECTED',
    SCANNED: 'SCANNED',
    EXTRA: 'EXTRA',
};

export const SessionStatus = {
    IN_PROGRESS: 'IN_PROGRESS',
    COMPLETED: 'COMPLETED',
    CANCELLED: 'CANCELLED',
};

@Injectable()
export class InventoryService {
    constructor(private prisma: PrismaService) { }

    async findAll() {
        return this.prisma.inventorySession.findMany({
            include: {
                warehouse: true,
                createdBy: true,
                records: true,
                quantityRecords: true,
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
    }

    async findOne(id: string) {
        const session = await this.prisma.inventorySession.findUnique({
            where: { id },
            include: {
                warehouse: true,
                createdBy: true,
                records: {
                    include: {
                        asset: {
                            include: {
                                warehouse: true,
                                store: true,
                                product: {
                                    include: { category: true },
                                },
                            },
                        },
                        scannedBy: true,
                    },
                },
                quantityRecords: {
                    include: {
                        product: {
                            include: { category: true },
                        },
                    },
                },
            },
        });

        if (!session) {
            throw new NotFoundException(`Inventory session ${id} not found`);
        }

        return session;
    }

    async startSession(userId: string, warehouseId: string) {
        const activeSession = await this.prisma.inventorySession.findFirst({
            where: {
                warehouseId,
                status: SessionStatus.IN_PROGRESS,
            },
        });

        if (activeSession) {
            throw new BadRequestException('На этом складе уже идет инвентаризация');
        }

        const assets = await this.prisma.asset.findMany({
            where: {
                warehouseId,
                condition: { not: 'DECOMMISSIONED' },
            },
        });

        const quantityItems = await this.prisma.stockItem.findMany({
            where: {
                warehouseId,
                product: {
                    accountingType: 'QUANTITY' as any,
                },
            },
            include: {
                product: true,
            },
        });

        const session = await this.prisma.inventorySession.create({
            data: {
                warehouseId,
                createdById: userId,
                status: SessionStatus.IN_PROGRESS,
            },
        });

        if (assets.length > 0) {
            await this.prisma.inventoryRecord.createMany({
                data: assets.map((asset) => ({
                    inventorySessionId: session.id,
                    assetId: asset.id,
                    status: InventoryStatus.EXPECTED,
                })),
            });
        }

        if (quantityItems.length > 0) {
            await this.prisma.inventoryQuantityRecord.createMany({
                data: quantityItems.map((item) => ({
                    inventorySessionId: session.id,
                    productId: item.productId,
                    expectedQuantity: item.quantity,
                    countedQuantity: 0,
                })),
            });
        }

        return session;
    }

    async scanItem(sessionId: string, barcode: string, userId: string) {
        const session = await this.prisma.inventorySession.findUnique({
            where: { id: sessionId },
        });

        if (!session) throw new NotFoundException('Session not found');
        if (session.status !== SessionStatus.IN_PROGRESS) {
            throw new BadRequestException('Session is not in progress');
        }

        const asset = await this.prisma.asset.findFirst({
            where: {
                serialNumber: {
                    equals: barcode,
                    mode: 'insensitive',
                },
            },
            include: {
                warehouse: true,
                store: true,
                product: { include: { category: true } },
            },
        });

        if (!asset) {
            throw new NotFoundException(`Asset with serial ${barcode} not found`);
        }

        const existingRecord = await this.prisma.inventoryRecord.findUnique({
            where: {
                inventorySessionId_assetId: {
                    inventorySessionId: sessionId,
                    assetId: asset.id,
                },
            },
        });

        let record;

        if (existingRecord) {
            if (existingRecord.status === InventoryStatus.SCANNED) {
                return {
                    record: existingRecord,
                    asset,
                    isDuplicate: true,
                    relocation: asset.warehouseId && asset.warehouseId !== session.warehouseId
                        ? {
                            fromWarehouseId: asset.warehouseId,
                            fromWarehouseName: asset.warehouse?.name,
                            toWarehouseId: session.warehouseId,
                        }
                        : null,
                };
            }

            record = await this.prisma.inventoryRecord.update({
                where: { id: existingRecord.id },
                data: {
                    status: InventoryStatus.SCANNED,
                    scannedAt: new Date(),
                    scannedById: userId,
                },
            });
        } else {
            record = await this.prisma.inventoryRecord.create({
                data: {
                    inventorySessionId: sessionId,
                    assetId: asset.id,
                    status: InventoryStatus.EXTRA,
                    scannedAt: new Date(),
                    scannedById: userId,
                },
            });
        }

        return {
            record,
            asset,
            isDuplicate: false,
            relocation: asset.warehouseId && asset.warehouseId !== session.warehouseId
                ? {
                    fromWarehouseId: asset.warehouseId,
                    fromWarehouseName: asset.warehouse?.name,
                    toWarehouseId: session.warehouseId,
                }
                : null,
        };
    }

    async setQuantityCount(sessionId: string, recordId: string, countedQuantity: number) {
        const session = await this.prisma.inventorySession.findUnique({
            where: { id: sessionId },
        });

        if (!session) throw new NotFoundException('Session not found');
        if (session.status !== SessionStatus.IN_PROGRESS) {
            throw new BadRequestException('Session is not in progress');
        }
        if (countedQuantity < 0) {
            throw new BadRequestException('Counted quantity cannot be negative');
        }

        const record = await this.prisma.inventoryQuantityRecord.findFirst({
            where: {
                id: recordId,
                inventorySessionId: sessionId,
            },
        });

        if (!record) {
            throw new NotFoundException('Quantity record not found');
        }

        return this.prisma.inventoryQuantityRecord.update({
            where: { id: recordId },
            data: { countedQuantity },
            include: {
                product: {
                    include: { category: true },
                },
            },
        });
    }

    async finishSession(id: string) {
        const session: any = await this.findOne(id);
        if (session.status !== SessionStatus.IN_PROGRESS) {
            throw new BadRequestException('Инвентаризация уже завершена');
        }

        const updated = await this.prisma.inventorySession.update({
            where: { id },
            data: {
                status: SessionStatus.COMPLETED,
                completedAt: new Date(),
            },
        });

        return {
            session: updated,
            summary: this.buildSummary(session.records, session.quantityRecords || []),
        };
    }

    async applyAdjustments(id: string, userId: string) {
        const session: any = await this.findOne(id);

        if (session.status !== SessionStatus.COMPLETED) {
            throw new BadRequestException('Корректировки можно применять только после завершения инвентаризации');
        }

        if (session.adjustmentsAppliedAt) {
            throw new BadRequestException('Корректировки по этой инвентаризации уже применены');
        }

        const missingRecords = session.records.filter((record: any) => record.status === InventoryStatus.EXPECTED);
        const extraRecords = session.records.filter((record: any) => record.status === InventoryStatus.EXTRA);
        const quantityRecords = session.quantityRecords || [];

        await this.prisma.$transaction(async (tx) => {
            for (const record of missingRecords) {
                await tx.asset.update({
                    where: { id: record.assetId },
                    data: {
                        warehouseId: null,
                        warehouseBinId: null,
                        processStatus: 'UNSERVICED' as any,
                    },
                });

                await tx.assetHistory.create({
                    data: {
                        assetId: record.assetId,
                        action: 'INVENTORY_MISSING',
                        location: `Warehouse: ${session.warehouseId}`,
                        details: `Корректировка по инвентаризации ${session.id}`,
                        fromStatus: record.asset.processStatus,
                        toStatus: 'UNSERVICED',
                        userId,
                    },
                });
            }

            for (const record of extraRecords) {
                const previousLocation = record.asset.warehouse?.name || record.asset.store?.name || null;

                await tx.asset.update({
                    where: { id: record.assetId },
                    data: {
                        warehouseId: session.warehouseId,
                        warehouseBinId: null,
                        storeId: null,
                        processStatus: 'AVAILABLE' as any,
                    },
                });

                await tx.assetHistory.create({
                    data: {
                        assetId: record.assetId,
                        action: 'INVENTORY_EXTRA',
                        location: `Warehouse: ${session.warehouseId}`,
                        details: previousLocation
                            ? `Корректировка по инвентаризации ${session.id}. Перенесено с "${previousLocation}"`
                            : `Корректировка по инвентаризации ${session.id}`,
                        fromStatus: record.asset.processStatus,
                        toStatus: 'AVAILABLE',
                        userId,
                    },
                });
            }

            for (const quantityRecord of quantityRecords) {
                const existingStockItem = await tx.stockItem.findUnique({
                    where: {
                        productId_warehouseId: {
                            productId: quantityRecord.productId,
                            warehouseId: session.warehouseId,
                        },
                    },
                });

                if (existingStockItem) {
                    await tx.stockItem.update({
                        where: { id: existingStockItem.id },
                        data: {
                            quantity: quantityRecord.countedQuantity,
                            reserved: Math.min(existingStockItem.reserved, quantityRecord.countedQuantity),
                        },
                    });
                } else if (quantityRecord.countedQuantity > 0) {
                    await tx.stockItem.create({
                        data: {
                            productId: quantityRecord.productId,
                            warehouseId: session.warehouseId,
                            quantity: quantityRecord.countedQuantity,
                            reserved: 0,
                            minQuantity: 0,
                        },
                    });
                }
            }

            await tx.inventorySession.update({
                where: { id },
                data: {
                    adjustmentsAppliedAt: new Date(),
                    adjustmentsAppliedById: userId,
                } as any,
            });
        });

        const refreshed: any = await this.findOne(id);
        const quantityAdjusted = quantityRecords.filter(
            (record: any) => record.expectedQuantity !== record.countedQuantity,
        ).length;

        return {
            session: refreshed,
            summary: this.buildSummary(refreshed.records, refreshed.quantityRecords || []),
            adjustments: {
                missingAdjusted: missingRecords.length,
                extraAdjusted: extraRecords.length,
                quantityAdjusted,
            },
        };
    }

    private buildSummary(records: any[], quantityRecords: any[] = []) {
        const expectedCount = records.filter((record) => record.status === InventoryStatus.EXPECTED).length;
        const scannedCount = records.filter((record) => record.status === InventoryStatus.SCANNED).length;
        const extraCount = records.filter((record) => record.status === InventoryStatus.EXTRA).length;

        const quantityPlan = quantityRecords.reduce(
            (sum, record) => sum + Number(record.expectedQuantity || 0),
            0,
        );
        const quantityFact = quantityRecords.reduce(
            (sum, record) => sum + Number(record.countedQuantity || 0),
            0,
        );
        const quantityMissing = quantityRecords.reduce(
            (sum, record) => sum + Math.max(Number(record.expectedQuantity || 0) - Number(record.countedQuantity || 0), 0),
            0,
        );
        const quantityExtra = quantityRecords.reduce(
            (sum, record) => sum + Math.max(Number(record.countedQuantity || 0) - Number(record.expectedQuantity || 0), 0),
            0,
        );

        const totalPlan = expectedCount + scannedCount + quantityPlan;
        const totalFact = scannedCount + extraCount + quantityFact;
        const missingCount = expectedCount + quantityMissing;
        const totalExtra = extraCount + quantityExtra;

        return {
            plan: totalPlan,
            fact: totalFact,
            missing: missingCount,
            extra: totalExtra,
            scanned: scannedCount + quantityFact,
        };
    }

    async getStats(id: string, search?: string) {
        const session: any = await this.findOne(id);
        const normalizedSearch = search?.trim().toLowerCase();

        const filteredRecords = normalizedSearch
            ? session.records.filter((record: any) =>
                record.asset.serialNumber.toLowerCase().includes(normalizedSearch) ||
                record.asset.product.name.toLowerCase().includes(normalizedSearch) ||
                record.asset.product.sku?.toLowerCase().includes(normalizedSearch) ||
                record.asset.product.category?.name?.toLowerCase().includes(normalizedSearch),
            )
            : session.records;

        const filteredQuantityRecords = normalizedSearch
            ? session.quantityRecords.filter((record: any) =>
                record.product.name.toLowerCase().includes(normalizedSearch) ||
                record.product.sku?.toLowerCase().includes(normalizedSearch) ||
                record.product.category?.name?.toLowerCase().includes(normalizedSearch),
            )
            : session.quantityRecords;

        const summary = this.buildSummary(session.records, session.quantityRecords || []);

        const sortedScanned = session.records
            .filter((record: any) => record.scannedAt)
            .sort((a: any, b: any) => new Date(b.scannedAt).getTime() - new Date(a.scannedAt).getTime());

        const lastItem = sortedScanned[0] ? sortedScanned[0] : null;

        return {
            ...summary,
            lastItem,
            session: {
                ...session,
                records: filteredRecords,
                quantityRecords: filteredQuantityRecords,
            },
        };
    }
}
