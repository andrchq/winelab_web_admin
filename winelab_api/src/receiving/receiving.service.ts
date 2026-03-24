import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
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

    private normalizeScanCode(code?: string | null) {
        if (!code) return null;
        return code.replace(/^BOX:\s*/i, '').trim().toLowerCase();
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

    async findAll() {
        return this.prisma.receivingSession.findMany({
            include: {
                warehouse: { select: { id: true, name: true } },
                createdBy: { select: { id: true, name: true } },
                completedBy: { select: { id: true, name: true } },
                items: {
                    include: {
                        product: {
                            select: {
                                id: true,
                                name: true,
                                sku: true,
                                accountingType: true,
                                category: { select: { code: true, name: true } },
                            },
                        },
                        scans: { orderBy: { timestamp: 'desc' } },
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    async findOne(id: string) {
        const session = await this.prisma.receivingSession.findUnique({
            where: { id },
            include: {
                warehouse: { select: { id: true, name: true } },
                createdBy: { select: { id: true, name: true } },
                completedBy: { select: { id: true, name: true } },
                items: {
                    include: {
                        product: {
                            select: {
                                id: true,
                                name: true,
                                sku: true,
                                accountingType: true,
                                category: { select: { code: true, name: true } },
                            },
                        },
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

    async create(data: CreateSessionDto & { type?: string }, userId: string) {
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
                        scannedQuantity: 0,
                    })),
                },
            },
            include: {
                warehouse: { select: { id: true, name: true } },
                createdBy: { select: { id: true, name: true } },
                items: {
                    include: {
                        product: {
                            select: {
                                id: true,
                                name: true,
                                sku: true,
                                accountingType: true,
                                category: { select: { code: true, name: true } },
                            },
                        },
                        scans: { orderBy: { timestamp: 'desc' } },
                    },
                },
            },
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

            const asset = await this.findAssetBySerial(normalizedCode);
            if (!asset) {
                throw new BadRequestException('Этот ШК не найден в системе. Новые ШК можно добавлять только через инвентаризацию');
            }

            if (item.productId && asset.productId !== item.productId) {
                throw new BadRequestException(`Этот ШК относится к модели "${asset.product.name}", а не к "${item.name}"`);
            }

            if (linkedShipment) {
                const isPartOfShipment = linkedShipment.lines.some((line) =>
                    line.productId === item.productId &&
                    line.scans.some((scan) => this.normalizeScanCode(scan.code) === normalizedCode),
                );

                if (!isPartOfShipment) {
                    throw new BadRequestException('Этот ШК не был отправлен в этой отгрузке');
                }

                if (asset.processStatus !== 'IN_TRANSIT') {
                    throw new BadRequestException('Этот товар не находится в статусе перемещения');
                }
            }

            storedCode = asset.serialNumber;
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

        return this.prisma.$transaction(async (tx) => {
            const results = [];
            let updatedAssetsCount = 0;

            for (const item of session.items) {
                if (!item.productId || item.scannedQuantity === 0) continue;

                const itemWithScans = await tx.receivingItem.findUnique({
                    where: { id: item.id },
                    include: { scans: true },
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

                        if (linkedShipment) {
                            const isPartOfShipment = linkedShipment.lines.some((line) =>
                                line.productId === item.productId &&
                                line.scans.some((shipmentScan) => this.normalizeScanCode(shipmentScan.code) === this.normalizeScanCode(scan.code)),
                            );

                            if (!isPartOfShipment) {
                                throw new BadRequestException('В приемку можно принять только те ШК, которые были отсканированы в отгрузке');
                            }
                        }

                        await tx.asset.update({
                            where: { id: existingAsset.id },
                            data: {
                                warehouseId: session.warehouseId,
                                storeId: null,
                                processStatus: 'AVAILABLE',
                                updatedAt: new Date(),
                            },
                        });

                        await tx.assetHistory.create({
                            data: {
                                assetId: existingAsset.id,
                                action: linkedShipment ? 'RECEIVED_TRANSFER' : 'RECEIVED_EXISTING',
                                location: `Warehouse: ${session.warehouseId}`,
                                details: linkedShipment
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

            if (linkedShipment) {
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
                },
                include: {
                    warehouse: { select: { id: true, name: true } },
                    createdBy: { select: { id: true, name: true } },
                    completedBy: { select: { id: true, name: true } },
                    items: {
                        include: {
                            product: {
                                select: {
                                    id: true,
                                    name: true,
                                    sku: true,
                                    accountingType: true,
                                    category: { select: { code: true, name: true } },
                                },
                            },
                            scans: { orderBy: { timestamp: 'desc' } },
                        },
                    },
                },
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
