import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import { EventsGateway } from '../events/events.gateway';
import { PrismaService } from '../prisma/prisma.service';

interface CreateSessionDto {
    warehouseId: string;
    invoiceNumber?: string;
    supplier?: string;
    type?: string;
    items: {
        name: string;
        sku?: string;
        expectedQuantity: number;
        productId?: string;
        linkedAssetId?: string;
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

    private normalizeScanCode(code?: string | null) {
        if (!code) return null;
        return code.replace(/^BOX:\s*/i, '').trim().toLowerCase();
    }

    private cleanScanCode(code: string) {
        return code.replace(/^BOX:\s*/i, '').trim();
    }

    private getReceivingItemInclude() {
        return {
            linkedAsset: {
                select: {
                    id: true,
                    serialNumber: true,
                    isUnidentified: true,
                    productId: true,
                    condition: true,
                    processStatus: true,
                },
            },
            product: {
                select: {
                    id: true,
                    name: true,
                    sku: true,
                    accountingType: true,
                    category: { select: { code: true, name: true } },
                },
            },
            scans: { orderBy: { timestamp: 'desc' as const } },
        };
    }

    private getReceivingSessionInclude() {
        return {
            warehouse: { select: { id: true, name: true } },
            createdBy: { select: { id: true, name: true } },
            completedBy: { select: { id: true, name: true } },
            items: {
                include: this.getReceivingItemInclude(),
            },
        };
    }

    private async findAssetBySerial(serialNumber: string) {
        return this.prisma.asset.findFirst({
            where: {
                serialNumber: {
                    equals: serialNumber,
                    mode: 'insensitive',
                },
            },
            include: {
                warehouse: { select: { id: true, name: true } },
                store: { select: { id: true, name: true } },
                product: {
                    select: {
                        id: true,
                        name: true,
                        sku: true,
                        accountingType: true,
                    },
                },
            },
        });
    }

    private async findLinkedShipment(sessionId: string) {
        return this.prisma.shipment.findFirst({
            where: { linkedReceivingId: sessionId },
            include: {
                lines: {
                    include: {
                        scans: true,
                    },
                },
            },
        });
    }

    private validateLinkedShipmentScan(linkedShipment: Awaited<ReturnType<ReceivingService['findLinkedShipment']>>, productId: string | undefined, normalizedCode: string) {
        if (!linkedShipment) return;

        const isPartOfShipment = linkedShipment.lines.some((line) =>
            line.productId === productId &&
            line.scans.some((scan) => this.normalizeScanCode(scan.code) === normalizedCode),
        );

        if (!isPartOfShipment) {
            throw new BadRequestException('Этот ШК не был отправлен в этой отгрузке');
        }
    }

    async findAll() {
        return this.prisma.receivingSession.findMany({
            include: this.getReceivingSessionInclude(),
            orderBy: { createdAt: 'desc' },
        });
    }

    async findOne(id: string) {
        const session = await this.prisma.receivingSession.findUnique({
            where: { id },
            include: this.getReceivingSessionInclude(),
        });

        if (!session) {
            throw new NotFoundException('Сессия приемки не найдена');
        }

        return session;
    }

    async create(data: CreateSessionDto, userId: string) {
        const session = await this.prisma.receivingSession.create({
            data: {
                warehouseId: data.warehouseId,
                invoiceNumber: data.invoiceNumber,
                supplier: data.supplier,
                createdById: userId,
                type: data.type || 'manual',
                items: {
                    create: data.items.map((item) => ({
                        name: item.name,
                        sku: item.sku,
                        expectedQuantity: item.expectedQuantity,
                        productId: item.productId,
                        linkedAssetId: item.linkedAssetId,
                        scannedQuantity: 0,
                    })),
                },
            },
            include: this.getReceivingSessionInclude(),
        });

        this.eventsGateway.server.emit('receiving_update', session);
        return session;
    }

    async updateItem(sessionId: string, itemId: string, data: UpdateItemDto & { isManual?: boolean; code?: string }) {
        const session = await this.prisma.receivingSession.findUnique({
            where: { id: sessionId },
        });

        if (!session) {
            throw new NotFoundException('Сессия приемки не найдена');
        }

        if (session.status === 'COMPLETED') {
            throw new BadRequestException('Нельзя менять уже завершенную приемку');
        }

        const item = await this.prisma.receivingItem.findFirst({
            where: { id: itemId, sessionId },
            include: {
                linkedAsset: {
                    select: {
                        id: true,
                        serialNumber: true,
                        isUnidentified: true,
                        productId: true,
                    },
                },
                product: {
                    select: {
                        id: true,
                        name: true,
                        accountingType: true,
                    },
                },
            },
        });

        if (!item) {
            throw new NotFoundException('Товар не найден');
        }

        if (data.scannedQuantity === 0) {
            throw new BadRequestException('Изменение на 0 не допускается');
        }

        const linkedShipment = await this.findLinkedShipment(sessionId);
        const isSerialized = item.product?.accountingType !== 'QUANTITY';
        const canBindUnidentifiedAsset = Boolean(item.linkedAssetId && item.linkedAsset?.isUnidentified);
        let storedCode = data.code;

        if (data.code) {
            const normalizedCode = this.normalizeScanCode(data.code);
            const sessionScans = await this.prisma.receivingScan.findMany({
                where: {
                    receivingItem: {
                        sessionId,
                    },
                },
            });

            const duplicate = sessionScans.find((scan) => this.normalizeScanCode(scan.code) === normalizedCode);
            if (duplicate) {
                throw new BadRequestException('Этот штрихкод уже был отсканирован в текущей приемке');
            }
        }

        if (isSerialized) {
            if (data.isManual) {
                throw new BadRequestException('Для серийного товара ручной ввод недоступен');
            }

            if (!data.code) {
                throw new BadRequestException('Для серийного товара нужно сканировать ШК');
            }

            if (data.scannedQuantity !== 1) {
                throw new BadRequestException('Серийный товар можно принимать только по одной единице');
            }

            const normalizedCode = this.normalizeScanCode(data.code);
            if (!normalizedCode) {
                throw new BadRequestException('Пустой ШК нельзя принять');
            }

            const existingAsset = await this.findAssetBySerial(normalizedCode);
            if (!existingAsset) {
                if (!canBindUnidentifiedAsset) {
                    throw new BadRequestException('Этот ШК не найден в системе. Новые ШК можно добавлять только через инвентаризацию или привязку legacy-оборудования в приемке');
                }

                storedCode = this.cleanScanCode(data.code);
            } else {
                if (canBindUnidentifiedAsset && existingAsset.id !== item.linkedAssetId) {
                    throw new BadRequestException('Этот ШК уже принадлежит другому оборудованию в системе');
                }

                if (item.productId && existingAsset.productId !== item.productId) {
                    throw new BadRequestException(`Этот ШК относится к модели "${existingAsset.product.name}", а не к "${item.name}"`);
                }

                if (linkedShipment && session.type !== 'RETURN') {
                    this.validateLinkedShipmentScan(linkedShipment, item.productId ?? undefined, normalizedCode);

                    if (existingAsset.processStatus !== 'IN_TRANSIT') {
                        throw new BadRequestException('Этот товар не находится в статусе перемещения');
                    }
                }

                storedCode = existingAsset.serialNumber;
            }
        } else if (linkedShipment) {
            const existingScans = await this.prisma.receivingScan.findMany({
                where: { receivingItemId: itemId },
            });
            const projectedScanned = existingScans.reduce((acc, scan) => acc + scan.quantity, 0) + data.scannedQuantity;

            if (projectedScanned > item.expectedQuantity) {
                throw new BadRequestException('Нельзя принять больше, чем было отправлено в этой отгрузке');
            }
        }

        await this.prisma.receivingScan.create({
            data: {
                receivingItemId: itemId,
                quantity: data.scannedQuantity,
                isManual: data.isManual || false,
                code: storedCode,
            },
        });

        const scans = await this.prisma.receivingScan.findMany({
            where: { receivingItemId: itemId },
        });
        const totalScanned = scans.reduce((acc, scan) => acc + scan.quantity, 0);

        if (totalScanned < 0) {
            throw new BadRequestException('Нельзя уменьшить количество ниже 0');
        }

        await this.prisma.receivingItem.update({
            where: { id: itemId },
            data: {
                scannedQuantity: totalScanned,
            },
        });

        if (session.status === 'DRAFT' || session.status === 'IN_TRANSIT') {
            await this.prisma.receivingSession.update({
                where: { id: sessionId },
                data: { status: 'IN_PROGRESS' },
            });
        }

        const updatedSession = await this.findOne(sessionId);
        this.eventsGateway.server.emit('receiving_update', updatedSession);
        return updatedSession;
    }

    async removeScan(sessionId: string, itemId: string, scanId: string) {
        const scan = await this.prisma.receivingScan.findUnique({
            where: { id: scanId },
        });

        if (!scan || scan.receivingItemId !== itemId) {
            throw new NotFoundException('Запись сканирования не найдена');
        }

        await this.prisma.receivingScan.delete({
            where: { id: scanId },
        });

        const item = await this.prisma.receivingItem.findUnique({
            where: { id: itemId },
            include: { scans: true },
        });

        if (item) {
            const totalScanned = item.scans.reduce((acc, current) => acc + current.quantity, 0);
            await this.prisma.receivingItem.update({
                where: { id: itemId },
                data: { scannedQuantity: totalScanned },
            });
        }

        const scannedItemsCount = await this.prisma.receivingItem.count({
            where: {
                sessionId,
                scannedQuantity: { gt: 0 },
            },
        });

        if (scannedItemsCount === 0) {
            await this.prisma.receivingSession.update({
                where: { id: sessionId },
                data: { status: 'DRAFT' },
            });
        }

        const updatedSession = await this.findOne(sessionId);
        this.eventsGateway.server.emit('receiving_update', updatedSession);
        return updatedSession;
    }

    async complete(sessionId: string, userId?: string) {
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

        const unmappedScannedItems = session.items.filter((item) => !item.productId && item.scannedQuantity > 0);
        if (unmappedScannedItems.length > 0) {
            throw new BadRequestException('Нельзя завершить приемку: есть принятые позиции без привязки к товару');
        }

        const linkedShipment = await this.findLinkedShipment(sessionId);
        const missingReturnItems = session.type === 'RETURN'
            ? session.items.filter((item) => item.linkedAssetId && item.expectedQuantity > 0 && item.scannedQuantity === 0)
            : [];

        return this.prisma.$transaction(async (tx) => {
            const results = [];
            let updatedAssetsCount = 0;

            for (const item of session.items) {
                if (!item.productId || item.scannedQuantity === 0) continue;

                const itemWithScans = await tx.receivingItem.findUnique({
                    where: { id: item.id },
                    include: {
                        scans: true,
                        linkedAsset: true,
                    },
                });

                const product = await tx.product.findUnique({
                    where: { id: item.productId },
                    select: { accountingType: true, name: true },
                });

                const isSerialized = product?.accountingType !== 'QUANTITY';

                if (isSerialized && itemWithScans && itemWithScans.scans.length > 0) {
                    for (const scan of itemWithScans.scans) {
                        if (!scan.code) {
                            throw new BadRequestException(`Для "${item.name}" не хватает серийного номера`);
                        }

                        if (itemWithScans.linkedAssetId) {
                            const linkedAsset = await tx.asset.findUnique({
                                where: { id: itemWithScans.linkedAssetId },
                            });

                            if (!linkedAsset) {
                                throw new NotFoundException('Связанное оборудование не найдено');
                            }

                            if (linkedAsset.productId !== item.productId) {
                                throw new BadRequestException(`ШК "${scan.code}" относится к другой модели`);
                            }

                            if (linkedAsset.isUnidentified) {
                                const duplicateAsset = await tx.asset.findFirst({
                                    where: {
                                        serialNumber: {
                                            equals: scan.code,
                                            mode: 'insensitive',
                                        },
                                    },
                                });

                                if (duplicateAsset && duplicateAsset.id !== linkedAsset.id) {
                                    throw new BadRequestException('Этот ШК уже привязан к другому оборудованию');
                                }

                                await tx.asset.update({
                                    where: { id: linkedAsset.id },
                                    data: {
                                        serialNumber: scan.code,
                                        isUnidentified: false,
                                        warehouseId: session.warehouseId,
                                        storeId: null,
                                        processStatus: session.type === 'RETURN' ? 'UNSERVICED' : 'AVAILABLE',
                                        updatedAt: new Date(),
                                    },
                                });

                                await tx.assetHistory.create({
                                    data: {
                                        assetId: linkedAsset.id,
                                        action: 'ASSET_IDENTIFIED',
                                        location: `Warehouse: ${session.warehouseId}`,
                                        details: `Привязка реального ШК "${scan.code}" в приемке ${session.id}`,
                                        userId: userId || session.createdById,
                                    },
                                });

                                await tx.assetHistory.create({
                                    data: {
                                        assetId: linkedAsset.id,
                                        action: session.type === 'RETURN' ? 'RECEIVED_RETURN' : 'RECEIVED_EXISTING',
                                        location: `Warehouse: ${session.warehouseId}`,
                                        details: session.type === 'RETURN'
                                            ? `Возврат на склад по приемке ${session.id}`
                                            : `Принято по приемке ${session.id}`,
                                        userId: userId || session.createdById,
                                    },
                                });

                                updatedAssetsCount++;
                                continue;
                            }

                            const existingAsset = await tx.asset.findFirst({
                                where: {
                                    serialNumber: {
                                        equals: scan.code,
                                        mode: 'insensitive',
                                    },
                                },
                            });

                            if (!existingAsset || existingAsset.id !== linkedAsset.id) {
                                throw new BadRequestException('Отсканированный ШК не совпадает с привязанным оборудованием');
                            }

                            await tx.asset.update({
                                where: { id: linkedAsset.id },
                                data: {
                                    warehouseId: session.warehouseId,
                                    storeId: null,
                                    processStatus: session.type === 'RETURN' ? 'UNSERVICED' : 'AVAILABLE',
                                    updatedAt: new Date(),
                                },
                            });

                            await tx.assetHistory.create({
                                data: {
                                    assetId: linkedAsset.id,
                                    action: session.type === 'RETURN' ? 'RECEIVED_RETURN' : 'RECEIVED_EXISTING',
                                    location: `Warehouse: ${session.warehouseId}`,
                                    details: session.type === 'RETURN'
                                        ? `Возврат на склад по приемке ${session.id}`
                                        : `Принято по приемке ${session.id}`,
                                    userId: userId || session.createdById,
                                },
                            });

                            updatedAssetsCount++;
                            continue;
                        }

                        const existingAsset = await tx.asset.findFirst({
                            where: {
                                serialNumber: {
                                    equals: scan.code,
                                    mode: 'insensitive',
                                },
                            },
                        });

                        if (!existingAsset) {
                            throw new BadRequestException('Новые ШК нельзя создавать через приемку. Используйте инвентаризацию');
                        }

                        if (existingAsset.productId !== item.productId) {
                            throw new BadRequestException(`ШК "${scan.code}" относится к другой модели`);
                        }

                        if (linkedShipment && session.type !== 'RETURN') {
                            this.validateLinkedShipmentScan(
                                linkedShipment,
                                item.productId ?? undefined,
                                this.normalizeScanCode(scan.code) || '',
                            );
                        }

                        await tx.asset.update({
                            where: { id: existingAsset.id },
                            data: {
                                warehouseId: session.warehouseId,
                                storeId: null,
                                processStatus: session.type === 'RETURN' ? 'UNSERVICED' : 'AVAILABLE',
                                updatedAt: new Date(),
                            },
                        });

                        await tx.assetHistory.create({
                            data: {
                                assetId: existingAsset.id,
                                action: linkedShipment && session.type !== 'RETURN' ? 'RECEIVED_TRANSFER' : 'RECEIVED_EXISTING',
                                location: `Warehouse: ${session.warehouseId}`,
                                details: linkedShipment && session.type !== 'RETURN'
                                    ? `Принято по отгрузке ${linkedShipment.id}`
                                    : `Принято по приемке ${session.id}`,
                                userId: userId || session.createdById,
                            },
                        });

                        updatedAssetsCount++;
                    }
                }

                if (!isSerialized) {
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
            }

            if (missingReturnItems.length > 0) {
                const missingDetails = missingReturnItems
                    .map((item) => `${item.name}${item.sku ? ` (${item.sku})` : ''}`)
                    .join(', ');

                for (const missingItem of missingReturnItems) {
                    if (!missingItem.linkedAssetId) continue;

                    await tx.asset.update({
                        where: { id: missingItem.linkedAssetId },
                        data: {
                            processStatus: 'LOST_IN_TRANSIT',
                            updatedAt: new Date(),
                        },
                    });

                    await tx.assetHistory.create({
                        data: {
                            assetId: missingItem.linkedAssetId,
                            action: 'LOST_IN_TRANSIT',
                            location: `Warehouse: ${session.warehouseId}`,
                            details: `Не доехало по возвратной приемке ${session.id}`,
                            fromStatus: 'IN_TRANSIT',
                            toStatus: 'LOST_IN_TRANSIT',
                            userId: userId || session.createdById,
                        },
                    });
                }

                await tx.receivingSession.update({
                    where: { id: sessionId },
                    data: {
                        hasDiscrepancy: true,
                        discrepancyDetails: `Не доехали позиции: ${missingDetails}`,
                    },
                });
            }

            if (linkedShipment && session.type !== 'RETURN') {
                await tx.shipment.update({
                    where: { id: linkedShipment.id },
                    data: {
                        status: 'DELIVERED',
                    },
                });
            }

            const completedSession = await tx.receivingSession.update({
                where: { id: sessionId },
                data: {
                    status: 'COMPLETED',
                    completedAt: new Date(),
                    completedById: userId || undefined,
                    hasDiscrepancy: missingReturnItems.length > 0,
                    discrepancyDetails: missingReturnItems.length > 0 ? undefined : null,
                },
                include: this.getReceivingSessionInclude(),
            });

            this.eventsGateway.server.emit('receiving_update', completedSession);

            return {
                success: true,
                session: completedSession,
                updatedStockCount: results.length,
                createdAssetsCount: 0,
                updatedAssetsCount,
            };
        });
    }

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

        this.eventsGateway.server.emit('receiving_delete', { id });
        return { success: true };
    }

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
