import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { NotificationType, Prisma, ShipmentStatus } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { YandexClaimRequest, YandexDeliveryService } from '../deliveries/yandex-delivery.service';
import { NotificationsService } from '../notifications/notifications.service';

type CreateShipmentItemDto = {
  productId?: string;
  originalName: string;
  sku?: string;
  quantity?: number;
  expectedQuantity?: number;
  scannedQuantity?: number;
};

type CreateShipmentDto = {
  requestId?: string;
  warehouseId: string;
  destinationType: 'store' | 'warehouse' | 'other';
  destinationId?: string;
  destination: string;
  items?: CreateShipmentItemDto[];
  requestNumber?: string;
  invoiceNumber?: string;
  supplier?: string;
  type: 'manual' | 'file';
};

type AddShipmentLineDto = {
  productId?: string;
  originalName: string;
  sku?: string;
  quantity?: number;
  expectedQuantity?: number;
};

type ShipmentWithRelations = Prisma.ShipmentGetPayload<{
  include: {
    request: { include: { store: true } };
    warehouse: true;
    assembler: { select: { id: true; name: true } };
    lines: { include: { scans: true; product: { include: { category: true } } } };
    delivery: true;
  };
}>;

type ShipmentForCommit = Prisma.ShipmentGetPayload<{
  include: {
    warehouse: true;
    request: { include: { store: true } };
    lines: {
      include: {
        scans: true;
        product: {
          select: {
            id: true;
            name: true;
            sku: true;
            accountingType: true;
          };
        };
      };
    };
    delivery: true;
  };
}>;

@Injectable()
export class ShipmentsService {
  constructor(
    private prisma: PrismaService,
    private yandexDeliveryService: YandexDeliveryService,
    private notificationsService: NotificationsService,
  ) {}

  private async syncRequestStatusForShipment(
    tx: Prisma.TransactionClient,
    requestId: string | null | undefined,
    shipmentStatus: ShipmentStatus,
  ) {
    if (!requestId) {
      return;
    }

    const request = await tx.request.findUnique({
      where: { id: requestId },
    });

    if (!request || request.status === 'COMPLETED' || request.status === 'CANCELLED') {
      return;
    }

    let nextStatus = request.status;

    if (shipmentStatus === ShipmentStatus.SHIPPED || shipmentStatus === ShipmentStatus.DELIVERED) {
      nextStatus = 'SHIPPED';
    } else if (shipmentStatus === ShipmentStatus.READY) {
      nextStatus = 'READY';
    } else if (shipmentStatus === ShipmentStatus.PICKING || shipmentStatus === ShipmentStatus.DRAFT) {
      nextStatus = request.status === 'NEW' ? 'IN_PROGRESS' : request.status;
    }

    if (nextStatus !== request.status) {
      await tx.request.update({
        where: { id: requestId },
        data: { status: nextStatus },
      });
    }
  }

  private mapStatus(status: ShipmentStatus) {
    switch (status) {
      case ShipmentStatus.DRAFT:
        return 'draft';
      case ShipmentStatus.PICKING:
        return 'picking';
      case ShipmentStatus.READY:
        return 'packed';
      case ShipmentStatus.SHIPPED:
      case ShipmentStatus.DELIVERED:
        return 'shipped';
      default:
        return 'draft';
    }
  }

  private normalizeScanCode(code?: string | null) {
    if (!code) {
      return null;
    }

    return code.replace(/^BOX:\s*/i, '').trim().toLowerCase();
  }

  private async findAssetBySerial(tx: Prisma.TransactionClient, code: string) {
    return tx.asset.findFirst({
      where: {
        serialNumber: {
          equals: code,
          mode: 'insensitive',
        },
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
          },
        },
        warehouse: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  private deriveStatusFromLines(lines: Array<{ expectedQuantity: number; scannedQuantity: number }>, type: string) {
    const totalScanned = lines.reduce((sum, line) => sum + line.scannedQuantity, 0);
    if (totalScanned <= 0) {
      return ShipmentStatus.DRAFT;
    }

    if (type === 'file') {
      const hasLines = lines.length > 0;
      const allExpectedCollected =
        hasLines &&
        lines.every((line) => line.expectedQuantity > 0 && line.scannedQuantity >= line.expectedQuantity);

      return allExpectedCollected ? ShipmentStatus.READY : ShipmentStatus.PICKING;
    }

    return ShipmentStatus.PICKING;
  }

  private mapShipment(shipment: ShipmentWithRelations) {
    const destinationName =
      shipment.destinationName ||
      shipment.request?.store?.name ||
      shipment.delivery?.storeId ||
      'Получатель не указан';

    return {
      id: shipment.id,
      warehouseId: shipment.warehouseId,
      destination: destinationName,
      destinationType: (shipment.destinationType as 'store' | 'warehouse' | 'other') || 'other',
      destinationId: shipment.destinationId || undefined,
      items: shipment.lines.map((line) => ({
        id: line.id,
        productId: line.productId || '',
        originalName: line.originalName,
        sku: line.sku || '',
        accountingType: line.product?.accountingType || 'SERIALIZED',
        quantity: line.quantity,
        expectedQuantity: line.expectedQuantity,
        scannedQuantity: line.scannedQuantity,
        scans: line.scans
          .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
          .map((scan) => ({
            id: scan.id,
            timestamp: scan.timestamp.getTime(),
            quantity: scan.quantity,
            isManual: scan.isManual,
            code: scan.code || undefined,
          })),
      })),
      status: this.mapStatus(shipment.status),
      createdAt: shipment.createdAt.toISOString(),
      completedAt: shipment.completedAt?.toISOString(),
      requestNumber: shipment.requestNumber || undefined,
      invoiceNumber: shipment.invoiceNumber || undefined,
      supplier: shipment.supplier || undefined,
      type: (shipment.type as 'manual' | 'file') || 'manual',
      linkedReceivingId: shipment.linkedReceivingId || undefined,
      request: shipment.request
        ? {
            id: shipment.request.id,
            title: shipment.request.title,
            deliveryContactName: shipment.request.deliveryContactName || undefined,
            deliveryContactPhone: shipment.request.deliveryContactPhone || undefined,
            deliveryComment: shipment.request.deliveryComment || undefined,
          }
        : undefined,
      delivery: shipment.delivery
        ? {
            id: shipment.delivery.id,
            status: shipment.delivery.status,
            provider: shipment.delivery.provider,
          }
        : undefined,
    };
  }

  private async loadShipmentForCommit(id: string) {
    const shipment = await this.prisma.shipment.findUnique({
      where: { id },
      include: {
        warehouse: true,
        request: {
          include: {
            store: true,
          },
        },
        lines: {
          include: {
            scans: true,
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
                accountingType: true,
              },
            },
          },
        },
        delivery: true,
      },
    });

    if (!shipment) {
      throw new NotFoundException('Отгрузка не найдена');
    }

    return shipment as ShipmentForCommit;
  }

  private normalizePhone(phone: string) {
    return phone.replace(/[^\d+]/g, '');
  }

  private buildYandexPayload(context: {
    shipment: ShipmentForCommit;
    recipientName: string;
    recipientPhone: string;
    recipientComment?: string;
    storeAddress: string;
  }): YandexClaimRequest {
    const callbackUrl = process.env.YANDEX_DELIVERY_CALLBACK_URL;
    const items = context.shipment.lines
      .filter((line) => line.scannedQuantity > 0)
      .map((line, index) => ({
        extra_id: `${context.shipment.id}-${index + 1}`,
        pickup_point: 1,
        dropoff_point: 2,
        title: line.originalName,
        quantity: line.scannedQuantity,
        cost_value: '1.00',
        cost_currency: 'RUB' as const,
        weight: 0.5,
        size: {
          length: 0.2,
          width: 0.2,
          height: 0.1,
        },
      }));

    return {
      auto_accept: false,
      external_order_id: context.shipment.requestNumber || context.shipment.invoiceNumber || context.shipment.id,
      referral_source: 'winelab-admin',
      route_points: [
        {
          point_id: 1,
          visit_order: 1,
          type: 'source',
          address: {
            fullname: context.shipment.warehouse.address!,
          },
          contact: {
            name: context.shipment.warehouse.contactName!,
            phone: this.normalizePhone(context.shipment.warehouse.phone!),
            email: context.shipment.warehouse.email!,
          },
        },
        {
          point_id: 2,
          visit_order: 2,
          type: 'destination',
          address: {
            fullname: context.storeAddress,
          },
          contact: {
            name: context.recipientName,
            phone: this.normalizePhone(context.recipientPhone),
          },
          skip_confirmation: false,
        },
      ],
      items,
      skip_client_notify: false,
      ...(callbackUrl
        ? {
            callback_properties: {
              callback_url: callbackUrl,
            },
          }
        : {}),
    };
  }

  private async getStoreDeliveryContext(id: string) {
    const shipment = await this.loadShipmentForCommit(id);

    if (shipment.destinationType !== 'store' || !shipment.destinationId) {
      throw new BadRequestException('Подтверждение доставки через Яндекс доступно только для отгрузок в магазин');
    }

    const store =
      shipment.request?.store ||
      (await this.prisma.store.findUnique({
        where: { id: shipment.destinationId },
      }));

    if (!store) {
      throw new NotFoundException('Магазин-получатель не найден');
    }

    const linesWithQuantity = shipment.lines.filter((line) => line.scannedQuantity > 0);
    if (linesWithQuantity.length === 0) {
      throw new BadRequestException('Нет собранных позиций');
    }

    if (shipment.delivery) {
      throw new BadRequestException('Для этой отгрузки доставка уже создана');
    }

    const recipientName =
      shipment.request?.deliveryContactName?.trim() ||
      store.manager ||
      store.name;
    const recipientPhone =
      shipment.request?.deliveryContactPhone?.trim() ||
      store.phone ||
      '';
    const recipientComment =
      shipment.request?.deliveryComment?.trim() ||
      shipment.request?.description ||
      '';

    const warnings: string[] = [];
    if (!shipment.warehouse.address) warnings.push('У склада не заполнен адрес');
    if (!shipment.warehouse.contactName) warnings.push('У склада не заполнено контактное лицо');
    if (!shipment.warehouse.phone) warnings.push('У склада не заполнен телефон отправителя');
    if (!shipment.warehouse.email) warnings.push('У склада не заполнен email отправителя');
    if (!store.address) warnings.push('У магазина не заполнен адрес');
    if (!recipientPhone) warnings.push('У заявки не заполнен телефон получателя');

    return {
      shipment,
      store,
      recipientName,
      recipientPhone,
      recipientComment,
      warnings,
      items: linesWithQuantity.map((line) => ({
        id: line.id,
        name: line.originalName,
        sku: line.sku,
        quantity: line.scannedQuantity,
      })),
    };
  }

  private async commitShipmentInternal(
    tx: Prisma.TransactionClient,
    shipment: ShipmentForCommit,
    userId: string,
  ) {
    const linesWithQuantity = shipment.lines.filter((line) => line.scannedQuantity > 0);
    let linkedReceivingId: string | null = null;

    for (const line of linesWithQuantity) {
      if (!line.productId) {
        continue;
      }

      const isSerialized = line.product?.accountingType !== 'QUANTITY';

      if (isSerialized) {
        const scanCodes = line.scans
          .map((scan) => scan.code?.replace(/^BOX:\s*/i, '').trim())
          .filter((value): value is string => Boolean(value));

        if (scanCodes.length !== line.scannedQuantity) {
          throw new BadRequestException(`Для "${line.originalName}" нужно сканировать каждую единицу по серийному номеру`);
        }

        const assets = await tx.asset.findMany({
          where: {
            serialNumber: { in: scanCodes },
            productId: line.productId,
            warehouseId: shipment.warehouseId,
            processStatus: 'AVAILABLE',
          },
        });

        if (assets.length !== scanCodes.length) {
          throw new BadRequestException(`Не удалось подтвердить серийные номера для "${line.originalName}" на складе отправителя`);
        }

        for (const asset of assets) {
          await tx.asset.update({
            where: { id: asset.id },
            data: {
              processStatus: 'IN_TRANSIT',
              warehouseId: null,
            },
          });
        }
        continue;
      }

      const stockItem = await tx.stockItem.findUnique({
        where: {
          productId_warehouseId: {
            productId: line.productId,
            warehouseId: shipment.warehouseId,
          },
        },
      });

      if (!stockItem || stockItem.quantity < line.scannedQuantity) {
        throw new BadRequestException(`Недостаточно остатка для "${line.originalName}"`);
      }

      await tx.stockItem.update({
        where: { id: stockItem.id },
        data: {
          quantity: { decrement: line.scannedQuantity },
        },
      });
    }

    if (shipment.destinationType === 'warehouse' && shipment.destinationId) {
      const receiving = await tx.receivingSession.create({
        data: {
          warehouseId: shipment.destinationId,
          status: 'DRAFT',
          invoiceNumber: shipment.invoiceNumber || `Отгрузка ${shipment.id}`,
          supplier: shipment.warehouse.name,
          sourceType: 'INTERNAL',
          createdById: userId,
          type: shipment.type,
          items: {
            create: linesWithQuantity.map((line) => ({
              name: line.originalName,
              sku: line.sku,
              expectedQuantity: line.scannedQuantity,
              scannedQuantity: 0,
              productId: line.productId,
            })),
          },
        },
      });

      linkedReceivingId = receiving.id;
    }

    const updatedShipment = await tx.shipment.update({
      where: { id: shipment.id },
      data: {
        status: ShipmentStatus.SHIPPED,
        assembledBy: userId,
        completedAt: new Date(),
        linkedReceivingId,
      },
    });

    await this.syncRequestStatusForShipment(tx, updatedShipment.requestId, ShipmentStatus.SHIPPED);
    return updatedShipment;
  }

  async findAll(filters?: { status?: ShipmentStatus }) {
    const shipments = await this.prisma.shipment.findMany({
      where: filters,
      include: {
        request: { include: { store: true } },
        warehouse: true,
        assembler: { select: { id: true, name: true } },
        lines: { include: { scans: true, product: { include: { category: true } } } },
        delivery: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return shipments.map((shipment) => this.mapShipment(shipment as ShipmentWithRelations));
  }

  async findById(id: string) {
    const shipment = await this.prisma.shipment.findUnique({
      where: { id },
      include: {
        request: { include: { store: true } },
        warehouse: true,
        assembler: { select: { id: true, name: true } },
        lines: { include: { scans: true, product: { include: { category: true } } } },
        delivery: true,
      },
    });

    if (!shipment) {
      throw new NotFoundException('Отгрузка не найдена');
    }

    return this.mapShipment(shipment as ShipmentWithRelations);
  }

  async create(data: CreateShipmentDto) {
    const created = await this.prisma.$transaction(async (tx) => {
      const shipment = await tx.shipment.create({
        data: {
          requestId: data.requestId || null,
          warehouseId: data.warehouseId,
          destinationType: data.destinationType,
          destinationId: data.destinationId || null,
          destinationName: data.destination,
          requestNumber: data.requestNumber || null,
          invoiceNumber: data.invoiceNumber || null,
          supplier: data.supplier || null,
          type: data.type,
          lines: {
            create: (data.items || []).map((item) => ({
              productId: item.productId || null,
              originalName: item.originalName,
              sku: item.sku || null,
              quantity: item.quantity ?? item.expectedQuantity ?? 0,
              expectedQuantity: item.expectedQuantity ?? item.quantity ?? 0,
              scannedQuantity: item.scannedQuantity ?? 0,
            })),
          },
        },
        include: {
          request: { include: { store: true } },
          warehouse: true,
          assembler: { select: { id: true, name: true } },
          lines: { include: { scans: true, product: { include: { category: true } } } },
          delivery: true,
        },
      });

      await this.syncRequestStatusForShipment(tx, shipment.requestId, shipment.status);
      return shipment;
    });

    return this.mapShipment(created as ShipmentWithRelations);
  }

  async addLine(shipmentId: string, data: AddShipmentLineDto) {
    await this.ensureShipmentExists(shipmentId);

    const line = await this.prisma.shipmentLine.create({
      data: {
        shipmentId,
        productId: data.productId || null,
        originalName: data.originalName,
        sku: data.sku || null,
        quantity: data.quantity ?? data.expectedQuantity ?? 0,
        expectedQuantity: data.expectedQuantity ?? data.quantity ?? 0,
        scannedQuantity: 0,
      },
      include: {
        scans: true,
      },
    });

    return {
      id: line.id,
      productId: line.productId || '',
      originalName: line.originalName,
      sku: line.sku || '',
      quantity: line.quantity,
      expectedQuantity: line.expectedQuantity,
      scannedQuantity: line.scannedQuantity,
      scans: [],
    };
  }

  async addScan(shipmentId: string, lineId: string, delta: number, isManual = false, code?: string) {
    const line = await this.prisma.shipmentLine.findFirst({
      where: { id: lineId, shipmentId },
      include: {
        shipment: true,
        product: {
          select: {
            id: true,
            name: true,
            accountingType: true,
          },
        },
      },
    });

    if (!line) {
      throw new NotFoundException('Позиция отгрузки не найдена');
    }

    if (line.shipment.status === ShipmentStatus.SHIPPED || line.shipment.status === ShipmentStatus.DELIVERED) {
      throw new BadRequestException('Нельзя менять уже оформленную отгрузку');
    }

    await this.prisma.$transaction(async (tx) => {
      const isSerialized = line.product?.accountingType !== 'QUANTITY';
      let storedCode = code || null;

      if (isSerialized) {
        if (isManual) {
          throw new BadRequestException('Для серийного товара ручной ввод недоступен');
        }

        if (!code) {
          throw new BadRequestException('Для серийного товара нужно сканировать ШК');
        }

        if (delta !== 1) {
          throw new BadRequestException('Серийный товар можно сканировать только по одной единице');
        }

        const normalizedCode = this.normalizeScanCode(code);
        if (!normalizedCode) {
          throw new BadRequestException('Пустой ШК нельзя добавить в отгрузку');
        }

        const shipmentScans = await tx.shipmentScan.findMany({
          where: {
            line: {
              shipmentId,
            },
            code: {
              not: null,
            },
          },
        });

        const duplicateScan = shipmentScans.find(
          (scan) => this.normalizeScanCode(scan.code) === normalizedCode,
        );
        if (duplicateScan) {
          throw new BadRequestException('Этот ШК уже был отсканирован в текущей отгрузке');
        }

        const asset = await this.findAssetBySerial(tx, normalizedCode);
        if (!asset) {
          throw new BadRequestException('Этот ШК не найден в системе. Новые ШК можно добавлять только через инвентаризацию');
        }

        if (!line.productId) {
          throw new BadRequestException('Для этой позиции не задана модель товара');
        }

        if (asset.productId !== line.productId) {
          throw new BadRequestException(`Этот ШК относится к модели "${asset.product.name}", а не к "${line.originalName}"`);
        }

        if (asset.warehouseId !== line.shipment.warehouseId) {
          throw new BadRequestException('Этот товар числится на другом складе и не может быть добавлен в текущую отгрузку');
        }

        if (asset.processStatus !== 'AVAILABLE') {
          throw new BadRequestException('Этот товар сейчас недоступен для отгрузки');
        }

        storedCode = asset.serialNumber;
      }

      await tx.shipmentScan.create({
        data: {
          lineId,
          quantity: delta,
          isManual,
          code: storedCode,
        },
      });

      const scans = await tx.shipmentScan.findMany({ where: { lineId } });
      const scannedQuantity = scans.reduce((sum, scan) => sum + scan.quantity, 0);

      await tx.shipmentLine.update({
        where: { id: lineId },
        data: { scannedQuantity },
      });

      const lines = await tx.shipmentLine.findMany({ where: { shipmentId } });
      const status = this.deriveStatusFromLines(lines, line.shipment.type);

      const updatedShipment = await tx.shipment.update({
        where: { id: shipmentId },
        data: { status },
      });

      await this.syncRequestStatusForShipment(tx, updatedShipment.requestId, status);
    });

    return this.findById(shipmentId);
  }

  async removeScan(shipmentId: string, lineId: string, scanId: string) {
    const scan = await this.prisma.shipmentScan.findFirst({
      where: {
        id: scanId,
        lineId,
        line: { shipmentId },
      },
    });

    if (!scan) {
      throw new NotFoundException('Скан не найден');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.shipmentScan.delete({ where: { id: scanId } });

      const scans = await tx.shipmentScan.findMany({ where: { lineId } });
      const scannedQuantity = scans.reduce((sum, item) => sum + item.quantity, 0);

      await tx.shipmentLine.update({
        where: { id: lineId },
        data: { scannedQuantity },
      });

      const line = await tx.shipmentLine.findUnique({
        where: { id: lineId },
        include: { shipment: true },
      });

      if (!line) {
        return;
      }

      const lines = await tx.shipmentLine.findMany({ where: { shipmentId } });
      const status = this.deriveStatusFromLines(lines, line.shipment.type);

      const updatedShipment = await tx.shipment.update({
        where: { id: shipmentId },
        data: { status },
      });

      await this.syncRequestStatusForShipment(tx, updatedShipment.requestId, status);
    });

    return this.findById(shipmentId);
  }

  async addConsumables(shipmentId: string, productId: string, quantity: number, warehouseId: string) {
    const shipment = await this.ensureShipmentExists(shipmentId);

    if (shipment.status === ShipmentStatus.SHIPPED || shipment.status === ShipmentStatus.DELIVERED) {
      throw new BadRequestException('Нельзя добавлять расходники в уже завершенную отгрузку');
    }

    if (shipment.warehouseId !== warehouseId) {
      throw new BadRequestException('Склад расходников должен совпадать со складом отгрузки');
    }

    const stockItem = await this.prisma.stockItem.findUnique({
      where: { productId_warehouseId: { productId, warehouseId } },
      include: { product: true },
    });

    if (!stockItem || stockItem.quantity - stockItem.reserved < quantity) {
      throw new BadRequestException('Недостаточно остатка на складе');
    }

    await this.prisma.$transaction(async (tx) => {
      const existingLine = await tx.shipmentLine.findFirst({
        where: {
          shipmentId,
          productId,
        },
      });

      const line = existingLine
        ? await tx.shipmentLine.update({
            where: { id: existingLine.id },
            data: {
              quantity: { increment: quantity },
              expectedQuantity: { increment: quantity },
              scannedQuantity: { increment: quantity },
            },
          })
        : await tx.shipmentLine.create({
            data: {
              shipmentId,
              productId,
              originalName: stockItem.product.name,
              sku: stockItem.product.sku,
              quantity,
              expectedQuantity: quantity,
              scannedQuantity: quantity,
            },
          });

      await tx.shipmentScan.create({
        data: {
          lineId: line.id,
          quantity,
          isManual: true,
          code: null,
        },
      });

      const lines = await tx.shipmentLine.findMany({ where: { shipmentId } });
      const status = this.deriveStatusFromLines(lines, shipment.type);
      const updatedShipment = await tx.shipment.update({
        where: { id: shipmentId },
        data: { status },
      });

      await this.syncRequestStatusForShipment(tx, updatedShipment.requestId, status);
    });

    return this.findById(shipmentId);
  }

  async getStoreDeliveryPreview(id: string) {
    const context = await this.getStoreDeliveryContext(id);

    return {
      shipmentId: context.shipment.id,
      provider: 'YANDEX_DELIVERY',
      canConfirm: context.warnings.length === 0 && this.yandexDeliveryService.isConfigured(),
      yandexConfigured: this.yandexDeliveryService.isConfigured(),
      warnings: context.warnings,
      source: {
        warehouseId: context.shipment.warehouseId,
        name: context.shipment.warehouse.name,
        address: context.shipment.warehouse.address,
        contactName: context.shipment.warehouse.contactName,
        phone: context.shipment.warehouse.phone,
        email: context.shipment.warehouse.email,
      },
      destination: {
        storeId: context.store.id,
        name: context.store.name,
        address: context.store.address,
        contactName: context.recipientName,
        phone: context.recipientPhone,
        comment: context.recipientComment,
      },
      items: context.items,
    };
  }

  async confirmStoreDelivery(id: string, userId: string) {
    const context = await this.getStoreDeliveryContext(id);

    if (context.warnings.length > 0) {
      throw new BadRequestException(context.warnings[0]);
    }

    const payload = this.buildYandexPayload({
      shipment: context.shipment,
      recipientName: context.recipientName,
      recipientPhone: context.recipientPhone,
      recipientComment: context.recipientComment,
      storeAddress: context.store.address,
    });

    const externalRequestId = `shipment-${context.shipment.id}`;
    const createdClaim = await this.yandexDeliveryService.createClaim(externalRequestId, payload);
    const acceptedClaim =
      createdClaim.status === 'ready_for_approval'
        ? await this.yandexDeliveryService.acceptClaim(createdClaim.id, createdClaim.version)
        : createdClaim;

    await this.prisma.$transaction(async (tx) => {
      await this.commitShipmentInternal(tx, context.shipment, userId);

      const delivery = await tx.delivery.create({
        data: {
          shipmentId: context.shipment.id,
          storeId: context.store.id,
          provider: 'YANDEX_DELIVERY',
          externalId: createdClaim.id,
          externalVersion: acceptedClaim.version ?? createdClaim.version,
          rawStatus: acceptedClaim.status || createdClaim.status,
          sourceContactName: context.shipment.warehouse.contactName!,
          sourceContactPhone: context.shipment.warehouse.phone!,
          sourceContactEmail: context.shipment.warehouse.email!,
          recipientContactName: context.recipientName,
          recipientContactPhone: context.recipientPhone,
          recipientComment: context.recipientComment || null,
          status: 'CREATED',
          confirmedAt: new Date(),
          lastSyncAt: new Date(),
        },
      });

      await tx.deliveryEvent.create({
        data: {
          deliveryId: delivery.id,
          title: 'Заявка отправлена в Yandex Delivery',
          description: createdClaim.id,
        },
      });
    });

    return this.findById(id);
  }

  async commitShipment(id: string, userId: string) {
    const shipment = await this.loadShipmentForCommit(id);

    if (shipment.destinationType === 'store') {
      throw new BadRequestException('Для отгрузки в магазин используйте подтверждение доставки через Yandex Delivery');
    }

    const linesWithQuantity = shipment.lines.filter((line) => line.scannedQuantity > 0);
    if (linesWithQuantity.length === 0) {
      throw new BadRequestException('Нет собранных позиций');
    }

    const committedShipment = await this.prisma.$transaction(async (tx) => {
      return this.commitShipmentInternal(tx, shipment, userId);
    });

    if (shipment.destinationType === 'warehouse' && shipment.destinationId && committedShipment.linkedReceivingId) {
      await this.notificationsService.createForRoles({
        title: 'Создана приемка',
        message: `${shipment.invoiceNumber || committedShipment.linkedReceivingId}: ${shipment.destinationName || 'Склад-получатель'}`,
        type: NotificationType.RECEIVING,
        link: `/receiving/${committedShipment.linkedReceivingId}`,
        roleNames: ['WAREHOUSE'],
        warehouseId: shipment.destinationId,
        meta: {
          receivingId: committedShipment.linkedReceivingId,
          warehouseId: shipment.destinationId,
          shipmentId: shipment.id,
          sourceType: 'INTERNAL',
        },
      });
    }

    return this.findById(id);
  }

  async updateStatus(id: string, status: ShipmentStatus, assembledBy?: string) {
    await this.ensureShipmentExists(id);

    await this.prisma.shipment.update({
      where: { id },
      data: {
        status,
        assembledBy,
        completedAt: status === ShipmentStatus.SHIPPED ? new Date() : null,
      },
    });

    return this.findById(id);
  }

  async deleteShipment(id: string) {
    const shipment = await this.ensureShipmentExists(id);

    await this.prisma.$transaction(async (tx) => {
      await tx.shipment.delete({
        where: { id },
      });

      if (shipment.requestId) {
        const remainingShipments = await tx.shipment.findMany({
          where: { requestId: shipment.requestId },
          orderBy: { createdAt: 'desc' },
        });

        if (remainingShipments.length === 0) {
          await tx.request.update({
            where: { id: shipment.requestId },
            data: { status: 'IN_PROGRESS' },
          });
        } else {
          await this.syncRequestStatusForShipment(
            tx,
            shipment.requestId,
            remainingShipments[0].status,
          );
        }
      }
    });

    return { success: true };
  }

  private async ensureShipmentExists(id: string) {
    const shipment = await this.prisma.shipment.findUnique({
      where: { id },
    });

    if (!shipment) {
      throw new NotFoundException('Отгрузка не найдена');
    }

    return shipment;
  }
}
