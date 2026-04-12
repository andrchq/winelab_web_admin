import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const STORE_AUTO_INSTALL_PRODUCTS_KEY = 'store_auto_install_product_ids';

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  async getStoreAutoInstallProductIds(): Promise<string[]> {
    const setting = await this.prisma.systemSetting.findUnique({
      where: { key: STORE_AUTO_INSTALL_PRODUCTS_KEY },
    });

    if (!setting) {
      return [];
    }

    const value = Array.isArray(setting.value) ? setting.value : [];
    return value.filter((item): item is string => typeof item === 'string');
  }

  async getStoreAutoInstallProducts() {
    const productIds = await this.getStoreAutoInstallProductIds();
    if (productIds.length === 0) {
      return [];
    }

    const products = await this.prisma.product.findMany({
      where: {
        id: { in: productIds },
        isActive: true,
        categoryId: { not: null },
      },
      include: {
        category: true,
      },
    });

    const productsById = new Map(products.map((product) => [product.id, product]));
    return productIds.map((id) => productsById.get(id)).filter(Boolean);
  }

  async updateStoreAutoInstallProducts(productIds: string[]) {
    const uniqueIds = Array.from(new Set(productIds.filter(Boolean)));

    if (uniqueIds.length > 0) {
      const products = await this.prisma.product.findMany({
        where: {
          id: { in: uniqueIds },
          isActive: true,
          categoryId: { not: null },
        },
        select: { id: true },
      });

      if (products.length !== uniqueIds.length) {
        throw new BadRequestException(
          'В перечне автоустановки найдены несуществующие, неактивные или не привязанные к категории модели',
        );
      }
    }

    await this.prisma.systemSetting.upsert({
      where: { key: STORE_AUTO_INSTALL_PRODUCTS_KEY },
      create: {
        key: STORE_AUTO_INSTALL_PRODUCTS_KEY,
        value: uniqueIds,
      },
      update: {
        value: uniqueIds,
      },
    });

    return this.getStoreAutoInstallProducts();
  }
}
