import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { AssetProcess, StoreStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

@Injectable()
export class StoresService {
    constructor(private prisma: PrismaService) { }

    async findAll() {
        const stores = await this.prisma.store.findMany({
            where: { isActive: true },
            include: {
                _count: {
                    select: { assets: true, requests: true },
                },
                creator: {
                    select: { name: true }
                }
            },
            orderBy: { name: 'asc' },
        });

        // Добавляем статистику по оборудованию
        return Promise.all(
            stores.map(async (store) => {
                const installed = await this.prisma.asset.count({
                    where: { storeId: store.id, processStatus: AssetProcess.INSTALLED },
                });
                const pending = await this.prisma.asset.count({
                    where: { storeId: store.id, processStatus: AssetProcess.DELIVERED },
                });
                const inTransit = await this.prisma.asset.count({
                    where: { storeId: store.id, processStatus: AssetProcess.IN_TRANSIT },
                });

                return {
                    ...store,
                    stats: { installed, pending, inTransit },
                };
            }),
        );
    }

    async findById(id: string) {
        const store = await this.prisma.store.findUnique({
            where: { id },
            include: {
                assets: {
                    include: { product: { select: { name: true, category: true, sku: true } } },
                    orderBy: { createdAt: 'desc' },
                },
                requests: {
                    take: 5,
                    orderBy: { createdAt: 'desc' },
                },
            },
        });

        if (!store) {
            throw new NotFoundException('Магазин не найден');
        }

        return store;
    }

    async pingStoreIps(id: string) {
        const store = await this.findById(id);

        const pingIp = async (ipWithMask?: string | null) => {
            if (!ipWithMask) return false;
            // Strip CIDR mask if present (e.g., 10.11.2.5/30 -> 10.11.2.5)
            // Also trim whitespace
            const ip = ipWithMask.split('/')[0].trim();

            if (!ip) return false;

            try {
                // Windows ping uses -n for count, -w for timeout (ms)
                // Linux uses -c for count, -W for timeout (s)
                const isWin = process.platform === 'win32';
                const cmd = isWin
                    ? `ping -n 1 -w 1000 ${ip}`
                    : `ping -c 1 -W 1 ${ip}`;

                await execAsync(cmd);
                return true;
            } catch (e) {
                return false;
            }
        };

        const [provider1, provider2] = await Promise.all([
            pingIp(store.providerIp1),
            pingIp(store.providerIp2)
        ]);

        return {
            server: false, // Server IP should not be pinged as per new requirement
            provider1,
            provider2
        };
    }

    async create(data: {
        name: string;
        address: string;
        city?: string;
        cfo?: string;
        region?: string;
        phone?: string;
        email?: string;
        manager?: string;
        status?: string;
        serverIp?: string;
        providerIp1?: string;
        providerIp2?: string;
        utmUrl?: string;
        retailUrl?: string;
        legalEntity?: string;
        inn?: string;
        kpp?: string;
        fsrarId?: string;
        cctvSystem?: string;
        cameraCount?: number;
    }, userId?: string) {
        return this.prisma.store.create({
            data: {
                ...data,
                createdById: userId
            } as any
        });
    }

    async update(id: string, data: Partial<{
        name: string;
        address: string;
        city: string;
        cfo: string;
        region: string;
        phone: string;
        email: string;
        manager: string;
        status: any; // StoreStatus enum
        serverIp: string;
        providerIp1: string;
        providerIp2: string;
        utmUrl: string;
        retailUrl: string;
        legalEntity: string;
        inn: string;
        kpp: string;
        fsrarId: string;
        cctvSystem: string;
        cameraCount: number;
        isActive: boolean;
    }>) {
        await this.findById(id);
        return this.prisma.store.update({
            where: { id },
            data: data as any,
        });
    }


    async delete(id: string) {
        await this.findById(id);
        await this.prisma.store.update({
            where: { id },
            data: { isActive: false },
        });
        return { message: 'Магазин удален' };
    }

    async importStores(file: any) {
        console.log('=== IMPORT STORES START ===');
        console.log('File received:', file ? 'yes' : 'no');
        console.log('File buffer:', file?.buffer ? 'exists' : 'missing');
        console.log('File size:', file?.buffer?.length || 0);

        try {
            const XLSX = require('xlsx');
            console.log('XLSX library loaded');

            // Parse XLSX file from buffer
            const workbook = XLSX.read(file.buffer, { type: 'buffer' });
            console.log('Workbook parsed, sheets:', workbook.SheetNames);

            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];

            // Convert to JSON array
            const results: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: null });
            console.log('Rows parsed:', results.length);
            if (results.length > 0) {
                console.log('First row keys:', Object.keys(results[0]));
                console.log('First row sample:', JSON.stringify(results[0]).substring(0, 500));
            }

            let created = 0;
            let updated = 0;
            const errors: string[] = [];

            for (const row of results) {
                try {
                    // Map XLSX columns to Prisma fields
                    // "SAP" -> name (or code)
                    // "Город" -> city
                    // "Address" -> address
                    // "ЦФО" -> cfo

                    // Check mandatory fields
                    const sapCode = row['SAP'] || row['sap'] || row['Sap'];
                    const address = row['Address'] || row['address'] || row['Адрес'];

                    if (!sapCode || !address) {
                        continue;
                    }

                    const city = row['Город'] || row['город'] || row['City'];
                    const region = row['Регион'] || row['регион'] || row['Region'];
                    const cfo = row['ЦФО'] || row['цфо'] || row['CFO'];

                    const storeData = {
                        name: String(sapCode),
                        cfo: cfo ? String(cfo) : null,
                        city: city ? String(city) : null,
                        region: region ? String(region) : null,
                        address: String(address),
                        legalEntity: row['Юр.лицо'] || row['Юр лицо'] || null,
                        serverIp: row['ip Сервера'] || row['IP Сервера'] || row['ip сервера'] || null,
                        providerIp1: row['ip provider 1'] || row['Ip provider 1'] || row['IP provider 1'] || null,
                        providerIp2: row['ip provider 2'] || row['Ip provider 2'] || row['IP provider 2'] || null,
                        phone: (row['Telephone'] || row['telephone'] || row['Телефон'])
                            ? String(row['Telephone'] || row['telephone'] || row['Телефон'])
                            : null,
                        inn: (row['ИНН'] || row['инн'] || row['INN'])
                            ? String(row['ИНН'] || row['инн'] || row['INN'])
                            : null,
                        kpp: (row['КПП'] || row['кпп'] || row['KPP'])
                            ? String(row['КПП'] || row['кпп'] || row['KPP'])
                            : null,
                        fsrarId: (row['ФСРАР'] || row['фсрар'] || row['FSRAR'])
                            ? String(row['ФСРАР'] || row['фсрар'] || row['FSRAR'])
                            : null,
                        utmUrl: row['УТМ ссылка'] || row['UTM ссылка'] || row['UTM'] || null,
                        retailUrl: row['Retail ссылка'] || row['Retail'] || row['retail'] || null,
                        cctvSystem: row['СВН'] || row['свн'] || row['CCTV'] || null,
                        cameraCount: (row['Кол-во камер'] || row['Количество камер'])
                            ? parseInt(String(row['Кол-во камер'] || row['Количество камер']))
                            : null,
                        isActive: true,
                    };

                    // Upsert based on name (SAP)
                    // First check if exists
                    const existing = await this.prisma.store.findFirst({
                        where: { name: storeData.name } // Assuming SAP name is unique-ish
                    });

                    if (existing) {
                        await this.prisma.store.update({
                            where: { id: existing.id },
                            data: storeData
                        });
                        updated++;
                    } else {
                        await this.prisma.store.create({
                            data: storeData
                        });
                        created++;
                    }

                } catch (error: any) {
                    errors.push(`Error processing ${row['SAP']}: ${error.message}`);
                }
            }

            return {
                message: 'Импорт завершен',
                stats: { created, updated, total: results.length },
                errors: errors.length > 0 ? errors : undefined
            };
        } catch (error: any) {
            console.error('=== IMPORT STORES ERROR ===');
            console.error('Error message:', error.message);
            console.error('Error stack:', error.stack);
            throw error;
        }
    }
    async addEquipment(storeId: string, data: {
        equipment: Array<{ category: string; stockItemId: string; comment: string }>;
        skipInventory: boolean;
        warehouseId: string;
    }) {
        const { equipment, skipInventory, warehouseId } = data;
        const store = await this.findById(storeId);

        const results = [];

        for (const item of equipment) {
            // Find stock item to get product info
            const stockItem = await this.prisma.stockItem.findUnique({
                where: { id: item.stockItemId },
                include: { product: true }
            });

            if (!stockItem) continue;

            // 1. If not skipInventory, decrement stock
            if (!skipInventory) {
                if (stockItem.quantity <= 0) {
                    throw new BadRequestException(`На складе недостаточно товара: ${stockItem.product.name}`);
                }

                await this.prisma.stockItem.update({
                    where: { id: item.stockItemId },
                    data: { quantity: { decrement: 1 } }
                });
            }

            // 2. Try to find an available physical asset at the warehouse
            let asset = await this.prisma.asset.findFirst({
                where: {
                    productId: stockItem.productId,
                    warehouseId: warehouseId,
                    processStatus: AssetProcess.AVAILABLE
                }
            });

            if (asset) {
                // Move existing asset
                asset = await this.prisma.asset.update({
                    where: { id: asset.id },
                    data: {
                        storeId: store.id,
                        warehouseId: null,
                        processStatus: AssetProcess.INSTALLED,
                        notes: item.comment || asset.notes
                    }
                });
            } else {
                // Create a new "virtual" asset if no physical ones are found
                asset = await this.prisma.asset.create({
                    data: {
                        serialNumber: `SN-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                        productId: stockItem.productId,
                        storeId: store.id,
                        processStatus: AssetProcess.INSTALLED,
                        notes: item.comment,
                        condition: 'WORKING'
                    }
                });
            }

            // 3. Add history
            await this.prisma.assetHistory.create({
                data: {
                    assetId: asset.id,
                    action: 'Установлено при комплектации магазина',
                    location: store.name,
                }
            });

            results.push(asset);
        }

        return {
            message: `Успешно добавлено ${results.length} ед. оборудования`,
            equipment: results
        };
    }
}
