import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AssetCondition, AssetProcess, ProductAccountingType } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

type InitialInventoryConflictType =
    | 'STORE_ASSET'
    | 'OTHER_WAREHOUSE'
    | 'PROCESS_CONFLICT'
    | null;

@Injectable()
export class InitialInventoryService {
    constructor(private prisma: PrismaService) { }

    private getSessionInclude() {
        return {
            warehouse: {
                select: {
                    id: true,
                    name: true,
                    initialInventoryCompletedAt: true,
                },
            },
            createdBy: {
                select: {
                    id: true,
                    name: true,
                },
            },
            entries: {
                include: {
                    product: {
                        select: {
                            id: true,
                            name: true,
                            sku: true,
                            accountingType: true,
                            category: {
                                select: {
                                    id: true,
                                    code: true,
                                    name: true,
                                    parentId: true,
                                    isMandatory: true,
                                },
                            },
                        },
                    },
                    scans: {
                        orderBy: {
                            createdAt: 'asc' as const,
                        },
                    },
                },
                orderBy: {
                    createdAt: 'asc' as const,
                },
            },
        };
    }

    private ensureSessionEditable(status: string) {
        if (status !== 'IN_PROGRESS') {
            throw new BadRequestException('Сессию нельзя изменять после завершения');
        }
    }

    private normalizeCode(code: string) {
        return code.trim().toLowerCase();
    }

    private cleanCode(code: string) {
        return code.trim();
    }

    private handleSchemaError(error: any): never {
        if (error?.code === 'P2002') {
            throw new BadRequestException('База данных еще не обновлена под новые блоки первичной инвентаризации. Примените миграции.');
        }

        if (error?.code === 'P2022') {
            throw new BadRequestException('В базе данных не хватает новых полей первичной инвентаризации. Примените миграции.');
        }

        throw error;
    }

    private classifyAssetConflict(asset: any, warehouseId: string): InitialInventoryConflictType {
        if (!asset) {
            return null;
        }

        if (asset.storeId) {
            return 'STORE_ASSET';
        }

        if (asset.warehouseId && asset.warehouseId !== warehouseId) {
            return 'OTHER_WAREHOUSE';
        }

        if (['RESERVED', 'IN_TRANSIT', 'DELIVERED', 'INSTALLED'].includes(asset.processStatus)) {
            return 'PROCESS_CONFLICT';
        }

        return null;
    }

    async findOne(id: string) {
        const session = await this.prisma.initialInventorySession.findUnique({
            where: { id },
            include: this.getSessionInclude(),
        });

        if (!session) {
            throw new NotFoundException('Сессия первичной инвентаризации не найдена');
        }

        return session;
    }

    async findActiveByWarehouse(warehouseId: string) {
        return this.prisma.initialInventorySession.findFirst({
            where: {
                warehouseId,
                status: 'IN_PROGRESS',
            },
            include: this.getSessionInclude(),
        });
    }

    async startSession(userId: string, warehouseId: string) {
        const warehouse = await this.prisma.warehouse.findUnique({
            where: { id: warehouseId },
        });

        if (!warehouse) {
            throw new NotFoundException('Склад не найден');
        }

        const activeSession = await this.findActiveByWarehouse(warehouseId);
        if (activeSession) {
            return activeSession;
        }

        if (warehouse.initialInventoryCompletedAt) {
            throw new BadRequestException('Первичная инвентаризация для этого склада уже завершена');
        }

        return this.prisma.initialInventorySession.create({
            data: {
                warehouseId,
                createdById: userId,
            },
            include: this.getSessionInclude(),
        });
    }

    async createEntry(sessionId: string, productId: string) {
        const session = await this.findOne(sessionId);
        this.ensureSessionEditable(session.status);

        const product = await this.prisma.product.findUnique({
            where: { id: productId },
            include: {
                category: true,
            },
        });

        if (!product) {
            throw new NotFoundException('Модель оборудования не найдена');
        }

        let entry;
        try {
            entry = await this.prisma.initialInventoryEntry.create({
                data: {
                    sessionId,
                    productId,
                    quantity: 0,
                },
                include: {
                    product: {
                        include: {
                            category: true,
                        },
                    },
                    scans: {
                        orderBy: {
                            createdAt: 'asc',
                        },
                    },
                },
            });
        } catch (error: any) {
            this.handleSchemaError(error);
        }

        return {
            session: await this.findOne(sessionId),
            entry,
        };
    }

    async addScan(sessionId: string, entryId: string, code: string) {
        const session = await this.findOne(sessionId);
        this.ensureSessionEditable(session.status);

        const entry = await this.prisma.initialInventoryEntry.findFirst({
            where: {
                id: entryId,
                sessionId,
            },
            include: {
                product: true,
                scans: true,
            },
        });

        if (!entry) {
            throw new NotFoundException('Блок оборудования не найден');
        }

        if (entry.product.accountingType === ProductAccountingType.QUANTITY) {
            throw new BadRequestException('Для этой модели нужно добавлять количество, а не сканировать ШК');
        }

        const normalizedCode = this.normalizeCode(code);
        if (!normalizedCode) {
            throw new BadRequestException('Пустой ШК нельзя добавить');
        }

        const duplicateInSession = await this.prisma.initialInventoryScan.findFirst({
            where: {
                entry: {
                    sessionId,
                },
                code: {
                    equals: normalizedCode,
                    mode: 'insensitive',
                },
            },
        });

        if (duplicateInSession) {
            throw new BadRequestException('Этот ШК уже добавлен в текущую первичную инвентаризацию');
        }

        const existingAsset = await this.prisma.asset.findFirst({
            where: {
                serialNumber: {
                    equals: normalizedCode,
                    mode: 'insensitive',
                },
            },
        });

        if (existingAsset && existingAsset.productId !== entry.productId) {
            throw new BadRequestException('Этот ШК уже принадлежит другой модели оборудования');
        }

        const conflictType = this.classifyAssetConflict(existingAsset, session.warehouseId);
        let scan;
        try {
            scan = await this.prisma.initialInventoryScan.create({
                data: {
                    entryId,
                    code: this.cleanCode(code),
                    linkedAssetId: existingAsset?.id || null,
                    conflictType,
                    sourceWarehouseId: existingAsset?.warehouseId || null,
                    sourceStoreId: existingAsset?.storeId || null,
                    sourceProcessStatus: existingAsset?.processStatus || null,
                    requiresReview: Boolean(conflictType),
                    reviewedAt: conflictType ? null : new Date(),
                },
            });
        } catch (error: any) {
            this.handleSchemaError(error);
        }

        await this.prisma.initialInventoryEntry.update({
            where: { id: entryId },
            data: {
                quantity: {
                    increment: 1,
                },
            },
        });

        return {
            session: await this.findOne(sessionId),
            scan,
        };
    }

    async resolveScanConflict(sessionId: string, entryId: string, scanId: string) {
        const session = await this.findOne(sessionId);
        this.ensureSessionEditable(session.status);

        const scan = await this.prisma.initialInventoryScan.findFirst({
            where: {
                id: scanId,
                entryId,
                entry: {
                    sessionId,
                },
            },
        });

        if (!scan) {
            throw new NotFoundException('Скан не найден');
        }

        if (!scan.requiresReview) {
            throw new BadRequestException('Для этого ШК не требуется подтверждение');
        }

        await this.prisma.initialInventoryScan.update({
            where: { id: scanId },
            data: {
                reviewedAt: new Date(),
            },
        });

        return this.findOne(sessionId);
    }

    async deleteScan(sessionId: string, entryId: string, scanId: string) {
        const session = await this.findOne(sessionId);
        this.ensureSessionEditable(session.status);

        const entry = await this.prisma.initialInventoryEntry.findFirst({
            where: {
                id: entryId,
                sessionId,
            },
            include: {
                scans: true,
            },
        });

        if (!entry) {
            throw new NotFoundException('Блок оборудования не найден');
        }

        const scan = entry.scans.find((item) => item.id === scanId);
        if (!scan) {
            throw new NotFoundException('Скан не найден');
        }

        await this.prisma.initialInventoryScan.delete({
            where: { id: scanId },
        });

        await this.prisma.initialInventoryEntry.update({
            where: { id: entryId },
            data: {
                quantity: Math.max(entry.quantity - 1, 0),
            },
        });

        return this.findOne(sessionId);
    }

    async setQuantity(sessionId: string, entryId: string, quantity: number) {
        const session = await this.findOne(sessionId);
        this.ensureSessionEditable(session.status);

        const entry = await this.prisma.initialInventoryEntry.findFirst({
            where: {
                id: entryId,
                sessionId,
            },
            include: {
                product: true,
            },
        });

        if (!entry) {
            throw new NotFoundException('Блок оборудования не найден');
        }

        if (entry.product.accountingType !== ProductAccountingType.QUANTITY) {
            throw new BadRequestException('Для серийной модели количество меняется через сканирование');
        }

        if (quantity < 0) {
            throw new BadRequestException('Количество не может быть отрицательным');
        }

        await this.prisma.initialInventoryEntry.update({
            where: { id: entryId },
            data: { quantity },
        });

        return this.findOne(sessionId);
    }

    async deleteEntry(sessionId: string, entryId: string) {
        const session = await this.findOne(sessionId);
        this.ensureSessionEditable(session.status);

        const entry = await this.prisma.initialInventoryEntry.findFirst({
            where: {
                id: entryId,
                sessionId,
            },
        });

        if (!entry) {
            throw new NotFoundException('Блок оборудования не найден');
        }

        await this.prisma.initialInventoryEntry.delete({
            where: { id: entryId },
        });

        return this.findOne(sessionId);
    }

    async applySession(sessionId: string, userId: string) {
        const session = await this.findOne(sessionId);
        this.ensureSessionEditable(session.status);

        if (session.entries.length === 0) {
            throw new BadRequestException('Нельзя завершить пустую первичную инвентаризацию');
        }

        const hasAnyCountedItems = session.entries.some((entry) =>
            entry.product.accountingType === ProductAccountingType.QUANTITY
                ? entry.quantity > 0
                : entry.scans.length > 0,
        );

        if (!hasAnyCountedItems) {
            throw new BadRequestException('Добавьте хотя бы одну отсканированную единицу или количество перед завершением');
        }

        const unresolvedConflicts = session.entries.flatMap((entry) =>
            entry.scans.filter((scan) => scan.requiresReview && !scan.reviewedAt),
        );

        if (unresolvedConflicts.length > 0) {
            throw new BadRequestException(`Есть неподтвержденные конфликтные ШК: ${unresolvedConflicts.length}`);
        }

        await this.prisma.$transaction(async (tx) => {
            const currentWarehouseAssets = await tx.asset.findMany({
                where: {
                    warehouseId: session.warehouseId,
                    condition: { not: AssetCondition.DECOMMISSIONED },
                },
            });

            const currentQuantityStockItems = await tx.stockItem.findMany({
                where: {
                    warehouseId: session.warehouseId,
                    product: {
                        accountingType: ProductAccountingType.QUANTITY,
                    },
                },
            });

            const scannedCodes = new Set(
                session.entries
                    .filter((entry) => entry.product.accountingType === ProductAccountingType.SERIALIZED)
                    .flatMap((entry) => entry.scans.map((scan) => this.normalizeCode(scan.code))),
            );
            const countedQuantityProductIds = new Set(
                session.entries
                    .filter((entry) => entry.product.accountingType === ProductAccountingType.QUANTITY)
                    .map((entry) => entry.productId),
            );

            for (const entry of session.entries) {
                if (entry.product.accountingType === ProductAccountingType.SERIALIZED) {
                    if (entry.scans.length === 0) {
                        continue;
                    }

                    for (const scan of entry.scans) {
                        const existingAsset = scan.linkedAssetId
                            ? await tx.asset.findUnique({ where: { id: scan.linkedAssetId } })
                            : await tx.asset.findFirst({
                                where: {
                                    serialNumber: {
                                        equals: scan.code,
                                        mode: 'insensitive',
                                    },
                                },
                            });

                        if (existingAsset) {
                            if (existingAsset.productId !== entry.productId) {
                                throw new BadRequestException(`ШК "${scan.code}" уже привязан к другой модели`);
                            }

                            const previousLocation = existingAsset.storeId
                                ? `Store: ${existingAsset.storeId}`
                                : existingAsset.warehouseId
                                    ? `Warehouse: ${existingAsset.warehouseId}`
                                    : 'Unknown';

                            await tx.asset.update({
                                where: { id: existingAsset.id },
                                data: {
                                    warehouseId: session.warehouseId,
                                    warehouseBinId: null,
                                    storeId: null,
                                    processStatus: AssetProcess.AVAILABLE,
                                },
                            });

                            await tx.assetHistory.create({
                                data: {
                                    assetId: existingAsset.id,
                                    action: 'INITIAL_INVENTORY',
                                    location: `Warehouse: ${session.warehouseId}`,
                                    details: `Первичная инвентаризация склада ${session.warehouse.name}. Перенесено с ${previousLocation}`,
                                    fromStatus: existingAsset.processStatus,
                                    toStatus: AssetProcess.AVAILABLE,
                                    userId,
                                },
                            });
                        } else {
                            const createdAsset = await tx.asset.create({
                                data: {
                                    serialNumber: scan.code,
                                    productId: entry.productId,
                                    warehouseId: session.warehouseId,
                                    condition: AssetCondition.WORKING,
                                    processStatus: AssetProcess.AVAILABLE,
                                },
                            });

                            await tx.assetHistory.create({
                                data: {
                                    assetId: createdAsset.id,
                                    action: 'INITIAL_INVENTORY',
                                    location: `Warehouse: ${session.warehouseId}`,
                                    details: `Создано первичной инвентаризацией склада ${session.warehouse.name}`,
                                    toStatus: AssetProcess.AVAILABLE,
                                    userId,
                                },
                            });
                        }
                    }
                } else {
                    const existingStockItem = await tx.stockItem.findUnique({
                        where: {
                            productId_warehouseId: {
                                productId: entry.productId,
                                warehouseId: session.warehouseId,
                            },
                        },
                    });

                    if (existingStockItem) {
                        await tx.stockItem.update({
                            where: { id: existingStockItem.id },
                            data: {
                                quantity: entry.quantity,
                                reserved: Math.min(existingStockItem.reserved, entry.quantity),
                            },
                        });
                    } else if (entry.quantity > 0) {
                        await tx.stockItem.create({
                            data: {
                                productId: entry.productId,
                                warehouseId: session.warehouseId,
                                quantity: entry.quantity,
                                minQuantity: 0,
                            },
                        });
                    }
                }
            }

            for (const asset of currentWarehouseAssets) {
                if (scannedCodes.has(this.normalizeCode(asset.serialNumber))) {
                    continue;
                }

                await tx.asset.update({
                    where: { id: asset.id },
                    data: {
                        warehouseId: null,
                        warehouseBinId: null,
                        storeId: null,
                        processStatus: AssetProcess.UNSERVICED,
                    },
                });

                await tx.assetHistory.create({
                    data: {
                        assetId: asset.id,
                        action: 'INITIAL_INVENTORY_MISSING',
                        location: `Warehouse: ${session.warehouseId}`,
                        details: `Не подтверждено первичной инвентаризацией склада ${session.warehouse.name}`,
                        fromStatus: asset.processStatus,
                        toStatus: AssetProcess.UNSERVICED,
                        userId,
                    },
                });
            }

            for (const stockItem of currentQuantityStockItems) {
                if (countedQuantityProductIds.has(stockItem.productId)) {
                    continue;
                }

                await tx.stockItem.update({
                    where: { id: stockItem.id },
                    data: {
                        quantity: 0,
                        reserved: 0,
                    },
                });
            }

            await tx.initialInventorySession.update({
                where: { id: sessionId },
                data: {
                    status: 'COMPLETED',
                    completedAt: new Date(),
                },
            });

            await tx.warehouse.update({
                where: { id: session.warehouseId },
                data: {
                    initialInventoryCompletedAt: new Date(),
                },
            });
        });

        return this.findOne(sessionId);
    }
}
