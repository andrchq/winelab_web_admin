"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StoresService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
const child_process_1 = require("child_process");
const util_1 = require("util");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
let StoresService = class StoresService {
    constructor(prisma) {
        this.prisma = prisma;
    }
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
        return Promise.all(stores.map(async (store) => {
            const installed = await this.prisma.asset.count({
                where: { storeId: store.id, processStatus: client_1.AssetProcess.INSTALLED },
            });
            const pending = await this.prisma.asset.count({
                where: { storeId: store.id, processStatus: client_1.AssetProcess.DELIVERED },
            });
            const inTransit = await this.prisma.asset.count({
                where: { storeId: store.id, processStatus: client_1.AssetProcess.IN_TRANSIT },
            });
            return {
                ...store,
                stats: { installed, pending, inTransit },
            };
        }));
    }
    async findById(id) {
        const store = await this.prisma.store.findUnique({
            where: { id },
            include: {
                assets: {
                    include: { product: { select: { name: true } } },
                    orderBy: { createdAt: 'desc' },
                },
                requests: {
                    take: 5,
                    orderBy: { createdAt: 'desc' },
                },
            },
        });
        if (!store) {
            throw new common_1.NotFoundException('Магазин не найден');
        }
        return store;
    }
    async pingStoreIps(id) {
        const store = await this.findById(id);
        const pingIp = async (ipWithMask) => {
            if (!ipWithMask)
                return false;
            const ip = ipWithMask.split('/')[0].trim();
            if (!ip)
                return false;
            try {
                const isWin = process.platform === 'win32';
                const cmd = isWin
                    ? `ping -n 1 -w 1000 ${ip}`
                    : `ping -c 1 -W 1 ${ip}`;
                await execAsync(cmd);
                return true;
            }
            catch (e) {
                return false;
            }
        };
        const [provider1, provider2] = await Promise.all([
            pingIp(store.providerIp1),
            pingIp(store.providerIp2)
        ]);
        return {
            server: false,
            provider1,
            provider2
        };
    }
    async create(data, userId) {
        return this.prisma.store.create({
            data: {
                ...data,
                createdById: userId
            }
        });
    }
    async update(id, data) {
        await this.findById(id);
        return this.prisma.store.update({
            where: { id },
            data: data,
        });
    }
    async delete(id) {
        await this.findById(id);
        await this.prisma.store.update({
            where: { id },
            data: { isActive: false },
        });
        return { message: 'Магазин удален' };
    }
    async importStores(file) {
        console.log('=== IMPORT STORES START ===');
        console.log('File received:', file ? 'yes' : 'no');
        console.log('File buffer:', file?.buffer ? 'exists' : 'missing');
        console.log('File size:', file?.buffer?.length || 0);
        try {
            const XLSX = require('xlsx');
            console.log('XLSX library loaded');
            const workbook = XLSX.read(file.buffer, { type: 'buffer' });
            console.log('Workbook parsed, sheets:', workbook.SheetNames);
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const results = XLSX.utils.sheet_to_json(worksheet, { defval: null });
            console.log('Rows parsed:', results.length);
            if (results.length > 0) {
                console.log('First row keys:', Object.keys(results[0]));
                console.log('First row sample:', JSON.stringify(results[0]).substring(0, 500));
            }
            let created = 0;
            let updated = 0;
            const errors = [];
            for (const row of results) {
                try {
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
                    const existing = await this.prisma.store.findFirst({
                        where: { name: storeData.name }
                    });
                    if (existing) {
                        await this.prisma.store.update({
                            where: { id: existing.id },
                            data: storeData
                        });
                        updated++;
                    }
                    else {
                        await this.prisma.store.create({
                            data: storeData
                        });
                        created++;
                    }
                }
                catch (error) {
                    errors.push(`Error processing ${row['SAP']}: ${error.message}`);
                }
            }
            return {
                message: 'Импорт завершен',
                stats: { created, updated, total: results.length },
                errors: errors.length > 0 ? errors : undefined
            };
        }
        catch (error) {
            console.error('=== IMPORT STORES ERROR ===');
            console.error('Error message:', error.message);
            console.error('Error stack:', error.stack);
            throw error;
        }
    }
    async addEquipment(storeId, data) {
        const { equipment, skipInventory, warehouseId } = data;
        const store = await this.findById(storeId);
        const results = [];
        for (const item of equipment) {
            const stockItem = await this.prisma.stockItem.findUnique({
                where: { id: item.stockItemId },
                include: { product: true }
            });
            if (!stockItem)
                continue;
            if (!skipInventory) {
                if (stockItem.quantity <= 0) {
                    throw new common_1.BadRequestException(`На складе недостаточно товара: ${stockItem.product.name}`);
                }
                await this.prisma.stockItem.update({
                    where: { id: item.stockItemId },
                    data: { quantity: { decrement: 1 } }
                });
            }
            let asset = await this.prisma.asset.findFirst({
                where: {
                    productId: stockItem.productId,
                    warehouseId: warehouseId,
                    processStatus: client_1.AssetProcess.AVAILABLE
                }
            });
            if (asset) {
                asset = await this.prisma.asset.update({
                    where: { id: asset.id },
                    data: {
                        storeId: store.id,
                        warehouseId: null,
                        processStatus: client_1.AssetProcess.INSTALLED,
                        notes: item.comment || asset.notes
                    }
                });
            }
            else {
                asset = await this.prisma.asset.create({
                    data: {
                        serialNumber: `SN-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                        productId: stockItem.productId,
                        storeId: store.id,
                        processStatus: client_1.AssetProcess.INSTALLED,
                        notes: item.comment,
                        condition: 'WORKING'
                    }
                });
            }
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
};
exports.StoresService = StoresService;
exports.StoresService = StoresService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], StoresService);
//# sourceMappingURL=stores.service.js.map