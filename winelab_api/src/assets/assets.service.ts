import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { AssetCondition, AssetProcess } from '@prisma/client';

import { EventsGateway } from '../events/events.gateway';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AssetsService {
  constructor(
    private prisma: PrismaService,
    private eventsGateway: EventsGateway,
  ) {}

  async findAll(filters?: { condition?: AssetCondition; processStatus?: AssetProcess }) {
    return this.prisma.asset.findMany({
      where: filters,
      include: {
        product: { select: { name: true, sku: true, category: true } },
        store: { select: { name: true } },
        warehouse: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string) {
    const asset = await this.prisma.asset.findUnique({
      where: { id },
      include: {
        product: true,
        store: true,
        warehouse: true,
        warehouseBin: true,
        assetHistory: {
          orderBy: { createdAt: 'desc' },
          take: 20,
          include: {
            user: { select: { name: true, role: true } },
          },
        },
      },
    });

    if (!asset) {
      throw new NotFoundException('Оборудование не найдено');
    }

    const { assetHistory, ...rest } = asset;
    return {
      ...rest,
      history: assetHistory,
    };
  }

  async findBySerialNumber(serialNumber: string) {
    return this.prisma.asset.findFirst({
      where: {
        serialNumber: {
          equals: serialNumber,
          mode: 'insensitive',
        },
      },
      include: {
        product: true,
        store: true,
        warehouse: true,
      },
    });
  }

  async create(data: {
    serialNumber: string;
    productId: string;
    warehouseId?: string;
    warehouseBinId?: string;
    condition?: AssetCondition;
  }) {
    try {
      const asset = await this.prisma.asset.create({
        data: {
          ...data,
          processStatus: AssetProcess.AVAILABLE,
        },
      });

      await this.addHistory(asset.id, 'Оприходовано', data.warehouseId || 'Склад');

      try {
        this.eventsGateway.server.emit('asset_update', asset);
        this.eventsGateway.emitDashboardStats({});
      } catch (error) {
        new Logger('AssetsService').error('Failed to emit asset events', error);
      }

      return asset;
    } catch (error: any) {
      new Logger('AssetsService').error('Create asset error', error);

      if (error.code === 'P2002') {
        throw new ConflictException('Оборудование с таким серийным номером уже существует');
      }

      if (error.code === 'P2003') {
        throw new BadRequestException('Указанный склад или продукт не найден');
      }

      throw new BadRequestException(`Ошибка сервера: ${error.message}`);
    }
  }

  async updateStatus(id: string, data: { condition?: AssetCondition; processStatus?: AssetProcess }) {
    await this.findById(id);
    return this.prisma.asset.update({
      where: { id },
      data,
    });
  }

  async update(
    id: string,
    data: {
      condition?: AssetCondition;
      processStatus?: AssetProcess;
      notes?: string;
      serialNumber?: string;
    },
    userId?: string,
  ) {
    const asset = await this.findById(id);

    if (data.condition && data.condition !== asset.condition) {
      await this.addHistory(id, 'STATUS_CHANGE', undefined, undefined, asset.condition, data.condition, userId);
    }

    if (data.processStatus && data.processStatus !== asset.processStatus) {
      await this.addHistory(id, 'STATUS_CHANGE', undefined, undefined, asset.processStatus, data.processStatus, userId);
    }

    if (data.notes && data.notes !== asset.notes) {
      await this.addHistory(id, 'COMMENT', undefined, data.notes, undefined, undefined, userId);
    }

    const updatedAsset = await this.prisma.asset.update({
      where: { id },
      data,
    });

    try {
      this.eventsGateway.emitDashboardStats({});
    } catch {
      // no-op
    }

    return updatedAsset;
  }

  async moveToStore(id: string, storeId: string) {
    await this.findById(id);

    await this.prisma.asset.update({
      where: { id },
      data: {
        storeId,
        warehouseId: null,
        warehouseBinId: null,
        processStatus: AssetProcess.DELIVERED,
      },
    });

    await this.addHistory(id, 'Доставлено в магазин', storeId);

    return { message: 'Оборудование перемещено' };
  }

  async markInstalled(id: string) {
    await this.findById(id);

    await this.prisma.asset.update({
      where: { id },
      data: {
        processStatus: AssetProcess.INSTALLED,
        installationConfirmed: true,
      },
    });

    await this.addHistory(id, 'Установлено');

    return { message: 'Оборудование установлено' };
  }

  private async addHistory(
    assetId: string,
    action: string,
    location?: string,
    details?: string,
    fromStatus?: string,
    toStatus?: string,
    userId?: string,
  ) {
    await this.prisma.assetHistory.create({
      data: {
        assetId,
        action,
        location,
        details,
        fromStatus: fromStatus as any,
        toStatus: toStatus as any,
        userId,
      },
    });
  }

  async createBatchReplacementRequest(
    assetIds: string[],
    warehouseId: string,
    reason: string,
    userId: string,
    delivery?: {
      deliveryContactName?: string;
      deliveryContactPhone?: string;
      deliveryComment?: string;
    },
  ) {
    if (!assetIds?.length) {
      throw new BadRequestException('Не выбрано ни одного устройства для замены');
    }

    const normalizedReason = reason.trim();
    if (!normalizedReason) {
      throw new BadRequestException('Укажите причину замены');
    }

    const normalizedDeliveryPhone = delivery?.deliveryContactPhone?.trim();
    if (!normalizedDeliveryPhone) {
      throw new BadRequestException('Укажите телефон получателя для доставки');
    }

    const normalizedDeliveryName = delivery?.deliveryContactName?.trim() || 'Контакт магазина';
    const normalizedDeliveryComment = delivery?.deliveryComment?.trim() || normalizedReason;

    const assets = await this.prisma.asset.findMany({
      where: { id: { in: assetIds } },
      include: {
        product: true,
        store: true,
      },
    });

    if (assets.length !== assetIds.length) {
      throw new NotFoundException('Часть выбранного оборудования не найдена');
    }

    if (assets.some((asset) => asset.condition === AssetCondition.NEEDS_REPAIR)) {
      throw new BadRequestException('Среди выбранного оборудования уже есть позиции в статусе замены');
    }

    const storeId = assets[0]?.storeId;
    if (!storeId) {
      throw new BadRequestException('Оборудование не привязано к магазину');
    }

    if (assets.some((asset) => asset.storeId !== storeId)) {
      throw new BadRequestException('Для пакетной замены все устройства должны относиться к одному магазину');
    }

    const store = assets[0].store ?? await this.prisma.store.findUnique({ where: { id: storeId } });
    if (!store) {
      throw new NotFoundException('Магазин не найден');
    }

    const warehouseExists = await this.prisma.warehouse.findUnique({ where: { id: warehouseId } });
    if (!warehouseExists) {
      throw new NotFoundException('Склад не найден');
    }

    const productCounts = assets.reduce((acc, asset) => {
      acc[asset.productId] = (acc[asset.productId] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const result = await this.prisma.$transaction(async (tx) => {
      await tx.asset.updateMany({
        where: { id: { in: assetIds } },
        data: {
          condition: AssetCondition.NEEDS_REPAIR,
          processStatus: AssetProcess.IN_TRANSIT,
        },
      });

      await tx.assetHistory.createMany({
        data: assets.flatMap((asset) => [
          {
            assetId: asset.id,
            action: 'STATUS_CHANGE',
            details: 'Статус изменен на "Требует замены"',
            fromStatus: asset.condition as any,
            toStatus: AssetCondition.NEEDS_REPAIR as any,
            userId,
          },
          {
            assetId: asset.id,
            action: 'REPLACEMENT_REQUEST',
            details: normalizedReason,
            userId,
          },
        ]),
      });

      const receivingSession = await tx.receivingSession.create({
        data: {
          warehouseId,
          status: 'IN_TRANSIT',
          type: 'RETURN',
          supplier: store.name,
          sourceType: 'INTERNAL',
          createdById: userId,
        },
      });

      await tx.receivingItem.createMany({
        data: assets.map((asset) => ({
          sessionId: receivingSession.id,
          linkedAssetId: asset.id,
          productId: asset.productId,
          name: asset.product?.name || 'Оборудование',
          sku: asset.product?.sku || null,
          expectedQuantity: 1,
        })),
      });

      const request = await tx.request.create({
        data: {
          title:
            assets.length === 1
              ? `Замена оборудования: ${assets[0].product?.name || 'устройство'}`
              : `Замена оборудования (${assets.length} шт.)`,
          description: normalizedReason,
          deliveryContactName: normalizedDeliveryName,
          deliveryContactPhone: normalizedDeliveryPhone,
          deliveryComment: normalizedDeliveryComment,
          storeId,
          creatorId: userId,
          priority: 'MEDIUM',
          status: 'NEW',
        },
      });

      await tx.requestItem.createMany({
        data: assets.map((asset) => ({
          requestId: request.id,
          assetId: asset.id,
          notes: 'К замене',
        })),
      });

      const shipment = await tx.shipment.create({
        data: {
          requestId: request.id,
          warehouseId,
          status: 'DRAFT',
          destinationType: 'store',
          destinationId: storeId,
          destinationName: store.name,
          type: 'manual',
          linkedReceivingId: receivingSession.id,
        },
      });

      await tx.shipmentProduct.createMany({
        data: Object.entries(productCounts).map(([productId, quantity]) => ({
          shipmentId: shipment.id,
          productId,
          quantity,
        })),
      });

      await tx.shipmentLine.createMany({
        data: Object.entries(productCounts).map(([productId, quantity]) => {
          const matchingAsset = assets.find((asset) => asset.productId === productId);
          return {
            shipmentId: shipment.id,
            productId,
            originalName: matchingAsset?.product?.name || 'Оборудование',
            sku: matchingAsset?.product?.sku || null,
            quantity,
            expectedQuantity: quantity,
            scannedQuantity: 0,
          };
        }),
      });

      await tx.comment.create({
        data: {
          requestId: request.id,
          userId,
          text: `Создана заявка на замену. Возвратная приемка: ${receivingSession.id.slice(0, 8)}, черновик отгрузки: ${shipment.id.slice(0, 8)}`,
        },
      });

      return {
        requestId: request.id,
        shipmentId: shipment.id,
        receivingId: receivingSession.id,
      };
    });

    try {
      this.eventsGateway.server.emit('asset_update', { ids: assetIds });
      this.eventsGateway.emitDashboardStats({});
    } catch {
      // no-op
    }

    return {
      message: 'Заявка на замену успешно создана',
      count: assets.length,
      ...result,
    };
  }

  async delete(id: string) {
    await this.findById(id);

    await this.prisma.assetHistory.deleteMany({
      where: { assetId: id },
    });

    return this.prisma.asset.delete({
      where: { id },
    });
  }
}
