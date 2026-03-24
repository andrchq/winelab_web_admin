import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
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
                records: true, // Maybe count is enough?
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
                                    include: { category: true }
                                }
                            }
                        },
                        scannedBy: true,
                    }
                }
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
                warehouseId: warehouseId,
                condition: { not: 'DECOMMISSIONED' }
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
                data: assets.map(asset => ({
                    inventorySessionId: session.id,
                    assetId: asset.id,
                    status: InventoryStatus.EXPECTED,
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

        // 1. Find Asset
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
                product: { include: { category: true } }
            }
        });

        if (!asset) {
            throw new NotFoundException(`Asset with serial ${barcode} not found`);
        }

        // 2. Find Existing Record in this session
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
            // It was expected (or already extra)
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
            // It was NOT expected (Extra)
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
            summary: this.buildSummary(session.records),
        };
    }

    async applyAdjustments(id: string, userId: string) {
        const session = await this.findOne(id);

        if (session.status !== SessionStatus.COMPLETED) {
            throw new BadRequestException('Корректировки можно применять только после завершения инвентаризации');
        }

        if (session.adjustmentsAppliedAt) {
            throw new BadRequestException('Корректировки по этой инвентаризации уже применены');
        }

        const missingRecords = session.records.filter((record) => record.status === InventoryStatus.EXPECTED);
        const extraRecords = session.records.filter((record) => record.status === InventoryStatus.EXTRA);

        await this.prisma.$transaction(async (tx) => {
            for (const record of missingRecords) {
                await tx.asset.update({
                    where: { id: record.assetId },
                    data: {
                        warehouseId: null,
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

            await tx.inventorySession.update({
                where: { id },
                data: {
                    adjustmentsAppliedAt: new Date(),
                    adjustmentsAppliedById: userId,
                } as any,
            });
        });

        const refreshed = await this.findOne(id);
        return {
            session: refreshed,
            summary: this.buildSummary(refreshed.records),
            adjustments: {
                missingAdjusted: missingRecords.length,
                extraAdjusted: extraRecords.length,
            },
        };
    }

    private buildSummary(records: any[]) {
        const expectedCount = records.filter(r => r.status === InventoryStatus.EXPECTED).length;
        const scannedCount = records.filter(r => r.status === InventoryStatus.SCANNED).length;
        const extraCount = records.filter(r => r.status === InventoryStatus.EXTRA).length;
        const totalPlan = expectedCount + scannedCount;
        const totalFact = scannedCount + extraCount;
        const missingCount = expectedCount;

        return {
            plan: totalPlan,
            fact: totalFact,
            missing: missingCount,
            extra: extraCount,
            scanned: scannedCount,
        };
    }

    async getStats(id: string, search?: string) {
        const session = await this.findOne(id);
        const normalizedSearch = search?.trim().toLowerCase();
        const filteredRecords = normalizedSearch
            ? session.records.filter((record) =>
                record.asset.serialNumber.toLowerCase().includes(normalizedSearch) ||
                record.asset.product.name.toLowerCase().includes(normalizedSearch) ||
                record.asset.product.category?.name?.toLowerCase().includes(normalizedSearch),
            )
            : session.records;

        const summary = this.buildSummary(session.records);

        const sortedScanned = session.records
            .filter(r => r.scannedAt)
            .sort((a, b) => new Date(b.scannedAt!).getTime() - new Date(a.scannedAt!).getTime());

        const lastItem = sortedScanned[0] ? sortedScanned[0] : null;

        return {
            ...summary,
            lastItem,
            session: {
                ...session,
                records: filteredRecords,
            }
        };
    }
}
