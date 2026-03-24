import { PrismaClient, RequestPriority, RequestStatus, ShipmentStatus, DeliveryStatus, AssetProcess, AssetCondition } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { SystemPermission, PERMISSION_CATEGORIES } from '../src/auth/permissions';

const prisma = new PrismaClient();

const DEV = {
    users: {
        admin: 'dev-admin@winelab.local',
        manager: 'dev-manager@winelab.local',
        warehouse: 'dev-warehouse@winelab.local',
        support: 'dev-support@winelab.local',
    },
    warehouses: {
        north: 'dev-warehouse-north',
        south: 'dev-warehouse-south',
    },
    stores: {
        sokol: 'dev-store-sokol',
        atrium: 'dev-store-atrium',
        himki: 'dev-store-khimki',
    },
    requests: {
        urgentRepair: 'dev-request-urgent-repair',
        newOpening: 'dev-request-new-opening',
        replacement: 'dev-request-replacement',
    },
    shipments: {
        draft: 'dev-shipment-draft',
        ready: 'dev-shipment-ready',
        delivered: 'dev-shipment-delivered',
    },
    deliveries: {
        active: 'dev-delivery-active',
        done: 'dev-delivery-done',
    },
    receiving: {
        draft: 'dev-receiving-draft',
        progress: 'dev-receiving-progress',
        done: 'dev-receiving-done',
    },
    inventory: {
        active: 'dev-inventory-active',
        done: 'dev-inventory-done',
    },
};

type RoleName = 'ADMIN' | 'MANAGER' | 'WAREHOUSE' | 'SUPPORT';

async function ensurePermissionsAndRoles() {
    const permissions = Object.values(SystemPermission);

    for (const code of permissions) {
        await prisma.permission.upsert({
            where: { code },
            update: {
                category: PERMISSION_CATEGORIES[code] || 'Other',
                description: `Permission ${code}`,
            },
            create: {
                code,
                category: PERMISSION_CATEGORIES[code] || 'Other',
                description: `Permission ${code}`,
            },
        });
    }

    const roleConfig: Record<RoleName, string[]> = {
        ADMIN: permissions,
        MANAGER: permissions.filter((code) =>
            code !== SystemPermission.USER_DELETE &&
            code !== SystemPermission.ROLE_DELETE
        ),
        WAREHOUSE: permissions.filter((code) =>
            ['WAREHOUSE', 'STOCK', 'SHIPMENT', 'RECEIVING', 'ASSET', 'DELIVERY', 'PRODUCT', 'REQUEST'].some((prefix) => code.startsWith(prefix))
        ),
        SUPPORT: [
            SystemPermission.STORE_READ,
            SystemPermission.PRODUCT_READ,
            SystemPermission.REQUEST_READ,
            SystemPermission.REQUEST_CREATE,
            SystemPermission.REQUEST_UPDATE,
            SystemPermission.ASSET_READ,
            SystemPermission.DELIVERY_READ,
        ],
    };

    const permissionRecords = await prisma.permission.findMany();
    const permissionMap = new Map(permissionRecords.map((permission) => [permission.code, permission.id]));

    for (const [name, permissionsForRole] of Object.entries(roleConfig) as [RoleName, string[]][]) {
        const role = await prisma.role.upsert({
            where: { name },
            update: {
                description: `DEV ${name}`,
                isSystem: true,
            },
            create: {
                name,
                description: `DEV ${name}`,
                isSystem: true,
            },
        });

        await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
        await prisma.rolePermission.createMany({
            data: permissionsForRole.map((code) => ({
                roleId: role.id,
                permissionId: permissionMap.get(code)!,
            })),
            skipDuplicates: true,
        });
    }
}

async function ensureUsers() {
    const password = await bcrypt.hash('dev12345', 10);
    const roles = await prisma.role.findMany({
        where: { name: { in: ['ADMIN', 'MANAGER', 'WAREHOUSE', 'SUPPORT'] } },
    });
    const roleMap = new Map(roles.map((role) => [role.name, role.id]));

    await prisma.user.upsert({
        where: { email: DEV.users.admin },
        update: { roleId: roleMap.get('ADMIN') },
        create: {
            email: DEV.users.admin,
            password,
            name: 'DEV Администратор',
            phone: '+7 900 000-00-01',
            roleId: roleMap.get('ADMIN'),
        },
    });

    await prisma.user.upsert({
        where: { email: DEV.users.manager },
        update: { roleId: roleMap.get('MANAGER') },
        create: {
            email: DEV.users.manager,
            password,
            name: 'DEV Менеджер',
            phone: '+7 900 000-00-02',
            roleId: roleMap.get('MANAGER'),
        },
    });

    await prisma.user.upsert({
        where: { email: DEV.users.warehouse },
        update: { roleId: roleMap.get('WAREHOUSE') },
        create: {
            email: DEV.users.warehouse,
            password,
            name: 'DEV Кладовщик',
            phone: '+7 900 000-00-03',
            roleId: roleMap.get('WAREHOUSE'),
        },
    });

    await prisma.user.upsert({
        where: { email: DEV.users.support },
        update: { roleId: roleMap.get('SUPPORT') },
        create: {
            email: DEV.users.support,
            password,
            name: 'DEV Поддержка',
            phone: '+7 900 000-00-04',
            roleId: roleMap.get('SUPPORT'),
        },
    });
}

async function ensureCategories() {
    const categories = [
        ['SERVER', 'Сервер'],
        ['ROUTER', 'Маршрутизатор'],
        ['SWITCH', 'Коммутатор'],
        ['FISCAL', 'Фискальный регистратор'],
        ['POS', 'Касса'],
        ['CASH_DRAWER', 'Денежный ящик'],
        ['POS_MONITOR', 'Монитор для кассы'],
        ['PC', 'Компьютер'],
        ['PC_MONITOR', 'Монитор для ПК'],
        ['MFU', 'МФУ'],
        ['TSD', 'ТСД'],
        ['THERMAL_PRINTER', 'Термопринтер'],
        ['WIFI', 'Точка WiFi'],
        ['SCANNER', 'Сканер'],
        ['ACCESSORY', 'Расходники'],
    ] as const;

    for (const [code, name] of categories) {
        await prisma.equipmentCategory.upsert({
            where: { code },
            update: { name },
            create: { code, name, isMandatory: false },
        });
    }
}

async function ensureWarehousesAndBins() {
    await prisma.warehouse.upsert({
        where: { id: DEV.warehouses.north },
        update: {
            name: 'DEV Склад Север',
            address: 'Москва, Лобненская, 18',
            contactName: 'Алексей Северный',
            phone: '+7 900 111-11-11',
            email: 'north-warehouse@winelab.local',
            isActive: true,
        },
        create: {
            id: DEV.warehouses.north,
            name: 'DEV Склад Север',
            address: 'Москва, Лобненская, 18',
            contactName: 'Алексей Северный',
            phone: '+7 900 111-11-11',
            email: 'north-warehouse@winelab.local',
        },
    });

    await prisma.warehouse.upsert({
        where: { id: DEV.warehouses.south },
        update: {
            name: 'DEV Склад Юг',
            address: 'Москва, Варшавское шоссе, 147',
            contactName: 'Мария Южная',
            phone: '+7 900 222-22-22',
            email: 'south-warehouse@winelab.local',
            isActive: true,
        },
        create: {
            id: DEV.warehouses.south,
            name: 'DEV Склад Юг',
            address: 'Москва, Варшавское шоссе, 147',
            contactName: 'Мария Южная',
            phone: '+7 900 222-22-22',
            email: 'south-warehouse@winelab.local',
        },
    });

    const bins = [
        [DEV.warehouses.north, 'A-01'],
        [DEV.warehouses.north, 'A-02'],
        [DEV.warehouses.north, 'B-01'],
        [DEV.warehouses.south, 'C-01'],
        [DEV.warehouses.south, 'C-02'],
    ] as const;

    for (const [warehouseId, code] of bins) {
        await prisma.warehouseBin.upsert({
            where: { warehouseId_code: { warehouseId, code } },
            update: {},
            create: { warehouseId, code },
        });
    }
}

async function ensureProducts() {
    const categoryMap = new Map(
        (await prisma.equipmentCategory.findMany()).map((category) => [category.code, category.id]),
    );

    const products = [
        ['DEV-SRV-01', 'Сервер Dell PowerEdge', 'SERVER'],
        ['DEV-RTR-01', 'Маршрутизатор MikroTik', 'ROUTER'],
        ['DEV-SW-01', 'Коммутатор TP-Link 24p', 'SWITCH'],
        ['DEV-FISCAL-01', 'Фискальный регистратор Атол', 'FISCAL'],
        ['DEV-POS-01', 'POS-терминал WinLab', 'POS'],
        ['DEV-CASH-01', 'Денежный ящик HPC', 'CASH_DRAWER'],
        ['DEV-MON-POS-01', 'Монитор кассира 15"', 'POS_MONITOR'],
        ['DEV-PC-01', 'Мини-ПК Lenovo Tiny', 'PC'],
        ['DEV-MON-PC-01', 'Монитор Samsung 24"', 'PC_MONITOR'],
        ['DEV-MFU-01', 'МФУ HP LaserJet', 'MFU'],
        ['DEV-TSD-01', 'Терминал сбора данных Zebra', 'TSD'],
        ['DEV-THERM-01', 'Термопринтер Zebra', 'THERMAL_PRINTER'],
        ['DEV-WIFI-01', 'Точка WiFi Ubiquiti', 'WIFI'],
        ['DEV-SCAN-01', 'Сканер штрихкода Honeywell', 'SCANNER'],
        ['DEV-LABEL-01', 'Этикетки 58x40', 'ACCESSORY'],
        ['DEV-CABLE-01', 'Патч-корд 2м', 'ACCESSORY'],
    ] as const;

    for (const [sku, name, categoryCode] of products) {
        await prisma.product.upsert({
            where: { sku },
            update: {
                name,
                categoryId: categoryMap.get(categoryCode),
                accountingType: categoryCode === 'ACCESSORY' ? 'QUANTITY' : 'SERIALIZED',
                isActive: true,
            },
            create: {
                sku,
                name,
                categoryId: categoryMap.get(categoryCode),
                accountingType: categoryCode === 'ACCESSORY' ? 'QUANTITY' : 'SERIALIZED',
            },
        });
    }
}

async function ensureStores() {
    const manager = await prisma.user.findUnique({ where: { email: DEV.users.manager } });

    const stores = [
        {
            id: DEV.stores.sokol,
            name: 'DEV Магазин Сокол',
            address: 'Москва, Ленинградский проспект, 80',
            city: 'Москва',
            region: 'Москва',
            manager: 'Ирина Соколова',
            createdById: manager?.id,
        },
        {
            id: DEV.stores.atrium,
            name: 'DEV Магазин Атриум',
            address: 'Москва, Земляной Вал, 33',
            city: 'Москва',
            region: 'Москва',
            manager: 'Дмитрий Атриум',
            createdById: manager?.id,
        },
        {
            id: DEV.stores.himki,
            name: 'DEV Магазин Химки',
            address: 'Химки, Ленинградское шоссе, вл. 5',
            city: 'Химки',
            region: 'Московская область',
            manager: 'Олег Химкин',
            createdById: manager?.id,
        },
    ];

    for (const store of stores) {
        await prisma.store.upsert({
            where: { id: store.id },
            update: {
                ...store,
                isActive: true,
            },
            create: {
                ...store,
                phone: '+7 495 000-00-00',
                email: `${store.id}@winelab.local`,
            },
        });
    }
}

async function ensureStock() {
    const productMap = new Map((await prisma.product.findMany()).map((product) => [product.sku, product.id]));

    const stockItems = [
        [DEV.warehouses.north, 'DEV-SRV-01', 3, 0, 1],
        [DEV.warehouses.north, 'DEV-RTR-01', 6, 1, 2],
        [DEV.warehouses.north, 'DEV-SW-01', 4, 1, 1],
        [DEV.warehouses.north, 'DEV-FISCAL-01', 5, 0, 2],
        [DEV.warehouses.north, 'DEV-POS-01', 8, 2, 3],
        [DEV.warehouses.north, 'DEV-LABEL-01', 40, 5, 20],
        [DEV.warehouses.north, 'DEV-CABLE-01', 12, 3, 10],
        [DEV.warehouses.south, 'DEV-RTR-01', 2, 1, 2],
        [DEV.warehouses.south, 'DEV-WIFI-01', 1, 0, 2],
        [DEV.warehouses.south, 'DEV-SCAN-01', 0, 0, 1],
        [DEV.warehouses.south, 'DEV-LABEL-01', 8, 2, 10],
        [DEV.warehouses.south, 'DEV-CABLE-01', 5, 1, 8],
    ] as const;

    for (const [warehouseId, sku, quantity, reserved, minQuantity] of stockItems) {
        await prisma.stockItem.upsert({
            where: {
                productId_warehouseId: {
                    productId: productMap.get(sku)!,
                    warehouseId,
                },
            },
            update: { quantity, reserved, minQuantity },
            create: {
                productId: productMap.get(sku)!,
                warehouseId,
                quantity,
                reserved,
                minQuantity,
            },
        });
    }
}

async function ensureAssets() {
    const products = new Map((await prisma.product.findMany()).map((product) => [product.sku, product.id]));
    const bins = new Map(
        (await prisma.warehouseBin.findMany()).map((bin) => [`${bin.warehouseId}:${bin.code}`, bin.id]),
    );

    const assets = [
        ['DEV-SN-0001', 'DEV-SRV-01', DEV.warehouses.north, undefined, AssetProcess.AVAILABLE, AssetCondition.WORKING, 'A-01'],
        ['DEV-SN-0002', 'DEV-RTR-01', DEV.warehouses.north, undefined, AssetProcess.AVAILABLE, AssetCondition.WORKING, 'A-01'],
        ['DEV-SN-0003', 'DEV-RTR-01', DEV.warehouses.north, undefined, AssetProcess.RESERVED, AssetCondition.WORKING, 'A-02'],
        ['DEV-SN-0004', 'DEV-SW-01', DEV.warehouses.north, undefined, AssetProcess.AVAILABLE, AssetCondition.WORKING, 'A-02'],
        ['DEV-SN-0005', 'DEV-FISCAL-01', DEV.warehouses.north, undefined, AssetProcess.AVAILABLE, AssetCondition.WORKING, 'B-01'],
        ['DEV-SN-0006', 'DEV-POS-01', DEV.warehouses.north, undefined, AssetProcess.RESERVED, AssetCondition.WORKING, 'B-01'],
        ['DEV-SN-0007', 'DEV-WIFI-01', DEV.warehouses.south, undefined, AssetProcess.AVAILABLE, AssetCondition.WORKING, 'C-01'],
        ['DEV-SN-0008', 'DEV-SCAN-01', DEV.warehouses.south, undefined, AssetProcess.AVAILABLE, AssetCondition.WORKING, 'C-02'],
        ['DEV-SN-1001', 'DEV-POS-01', undefined, DEV.stores.sokol, AssetProcess.INSTALLED, AssetCondition.WORKING, undefined],
        ['DEV-SN-1002', 'DEV-SCAN-01', undefined, DEV.stores.sokol, AssetProcess.INSTALLED, AssetCondition.WORKING, undefined],
        ['DEV-SN-1003', 'DEV-PC-01', undefined, DEV.stores.atrium, AssetProcess.DELIVERED, AssetCondition.WORKING, undefined],
        ['DEV-SN-1004', 'DEV-WIFI-01', undefined, DEV.stores.atrium, AssetProcess.IN_TRANSIT, AssetCondition.WORKING, undefined],
        ['DEV-SN-1005', 'DEV-FISCAL-01', undefined, DEV.stores.himki, AssetProcess.INSTALLED, AssetCondition.NEEDS_REPAIR, undefined],
    ] as const;

    for (const [serialNumber, sku, warehouseId, storeId, processStatus, condition, binCode] of assets) {
        await prisma.asset.upsert({
            where: { serialNumber },
            update: {
                productId: products.get(sku)!,
                warehouseId: warehouseId ?? null,
                storeId: storeId ?? null,
                warehouseBinId: warehouseId && binCode ? bins.get(`${warehouseId}:${binCode}`) ?? null : null,
                processStatus,
                condition,
            },
            create: {
                serialNumber,
                productId: products.get(sku)!,
                warehouseId: warehouseId ?? null,
                storeId: storeId ?? null,
                warehouseBinId: warehouseId && binCode ? bins.get(`${warehouseId}:${binCode}`) ?? null : null,
                processStatus,
                condition,
            },
        });
    }
}

async function ensureRequestsShipmentsAndDeliveries() {
    const support = await prisma.user.findUnique({ where: { email: DEV.users.support } });
    const manager = await prisma.user.findUnique({ where: { email: DEV.users.manager } });
    const warehouseUser = await prisma.user.findUnique({ where: { email: DEV.users.warehouse } });
    const assets = new Map((await prisma.asset.findMany()).map((asset) => [asset.serialNumber, asset.id]));
    const products = new Map((await prisma.product.findMany()).map((product) => [product.sku, product.id]));

    const requests = [
        {
            id: DEV.requests.urgentRepair,
            title: 'DEV Срочная замена фискального регистратора',
            description: 'В магазине Сокол фискальный регистратор работает с перебоями.',
            priority: RequestPriority.HIGH,
            status: RequestStatus.IN_PROGRESS,
            deliveryContactName: 'Ирина Соколова',
            deliveryContactPhone: '+7 900 333-33-33',
            deliveryComment: 'Позвонить за 30 минут до приезда',
            storeId: DEV.stores.sokol,
            creatorId: support!.id,
            assigneeId: manager!.id,
            items: [['DEV-SN-1005', 'Требуется замена']],
            comments: ['Диагностика подтверждена, готовим замену.'],
        },
        {
            id: DEV.requests.newOpening,
            title: 'DEV Комплект на открытие нового магазина',
            description: 'Нужно собрать базовый комплект оборудования для новой точки.',
            priority: RequestPriority.CRITICAL,
            status: RequestStatus.READY,
            deliveryContactName: 'Олег Химкин',
            deliveryContactPhone: '+7 900 444-44-44',
            deliveryComment: 'Выгрузка через служебный вход',
            storeId: DEV.stores.himki,
            creatorId: manager!.id,
            assigneeId: warehouseUser!.id,
            items: [['DEV-SN-0001', 'Резерв под открытие']],
            comments: ['Отгрузка готова к выдаче курьеру.'],
        },
        {
            id: DEV.requests.replacement,
            title: 'DEV Дозакупка расходников и сканеров',
            description: 'Нужно довезти этикетки, патч-корды и один сканер.',
            priority: RequestPriority.MEDIUM,
            status: RequestStatus.NEW,
            deliveryContactName: 'Дмитрий Атриум',
            deliveryContactPhone: '+7 900 555-55-55',
            deliveryComment: 'Связаться с магазином перед выездом',
            storeId: DEV.stores.atrium,
            creatorId: support!.id,
            assigneeId: manager!.id,
            items: [['DEV-SN-1002', 'Для сравнения установленного парка']],
            comments: ['Заявка только поступила, ожидает планирования.'],
        },
    ] as const;

    for (const request of requests) {
        await prisma.request.upsert({
            where: { id: request.id },
            update: {
                title: request.title,
                description: request.description,
                deliveryContactName: request.deliveryContactName,
                deliveryContactPhone: request.deliveryContactPhone,
                deliveryComment: request.deliveryComment,
                priority: request.priority,
                status: request.status,
                storeId: request.storeId,
                creatorId: request.creatorId,
                assigneeId: request.assigneeId,
            },
            create: {
                id: request.id,
                title: request.title,
                description: request.description,
                deliveryContactName: request.deliveryContactName,
                deliveryContactPhone: request.deliveryContactPhone,
                deliveryComment: request.deliveryComment,
                priority: request.priority,
                status: request.status,
                storeId: request.storeId,
                creatorId: request.creatorId,
                assigneeId: request.assigneeId,
            },
        });

        await prisma.requestItem.deleteMany({ where: { requestId: request.id } });
        for (const [serialNumber, notes] of request.items) {
            await prisma.requestItem.create({
                data: {
                    requestId: request.id,
                    assetId: assets.get(serialNumber)!,
                    notes,
                },
            });
        }

        await prisma.comment.deleteMany({ where: { requestId: request.id } });
        for (const text of request.comments) {
            await prisma.comment.create({
                data: {
                    requestId: request.id,
                    userId: request.creatorId,
                    text,
                },
            });
        }
    }

    const shipments = [
        {
            id: DEV.shipments.draft,
            requestId: DEV.requests.replacement,
            warehouseId: DEV.warehouses.north,
            destinationType: 'store',
            destinationId: DEV.stores.himki,
            destinationName: 'DEV Магазин Химки',
            status: ShipmentStatus.DRAFT,
            assembledBy: warehouseUser!.id,
            type: 'file',
            requestNumber: 'REQ-DEV-001',
            invoiceNumber: 'DEV-SHP-001',
            items: [],
            expectedProducts: [
                ['DEV-SCAN-01', 1],
                ['DEV-LABEL-01', 3],
                ['DEV-CABLE-01', 5],
            ],
            lines: [
                ['Сканер штрихкода Honeywell', 'DEV-SCAN-01', 1, 0],
                ['Этикетки 58x40', 'DEV-LABEL-01', 3, 0],
                ['Патч-корд 2м', 'DEV-CABLE-01', 5, 0],
            ],
        },
        {
            id: DEV.shipments.ready,
            requestId: DEV.requests.newOpening,
            warehouseId: DEV.warehouses.north,
            destinationType: 'store',
            destinationId: DEV.stores.himki,
            destinationName: 'DEV Магазин Химки',
            status: ShipmentStatus.READY,
            assembledBy: warehouseUser!.id,
            type: 'file',
            requestNumber: 'REQ-DEV-002',
            invoiceNumber: 'DEV-SHP-002',
            items: ['DEV-SN-0003', 'DEV-SN-0006'],
            expectedProducts: [
                ['DEV-RTR-01', 1],
                ['DEV-POS-01', 1],
            ],
            lines: [
                ['Маршрутизатор Keenetic', 'DEV-RTR-01', 1, 1],
                ['POS-терминал Атол', 'DEV-POS-01', 1, 1],
            ],
        },
        {
            id: DEV.shipments.delivered,
            requestId: DEV.requests.urgentRepair,
            warehouseId: DEV.warehouses.south,
            destinationType: 'warehouse',
            destinationId: DEV.warehouses.north,
            destinationName: 'DEV Склад Север',
            status: ShipmentStatus.DELIVERED,
            assembledBy: warehouseUser!.id,
            type: 'manual',
            requestNumber: 'REQ-DEV-003',
            invoiceNumber: 'DEV-SHP-003',
            items: ['DEV-SN-0007', 'DEV-SN-0008'],
            expectedProducts: [
                ['DEV-WIFI-01', 1],
                ['DEV-SCAN-01', 1],
            ],
            lines: [
                ['Точка WiFi Ubiquiti', 'DEV-WIFI-01', 1, 1],
                ['Сканер штрихкода Honeywell', 'DEV-SCAN-01', 1, 1],
            ],
        },
    ] as const;

    for (const shipment of shipments) {
        await prisma.shipment.upsert({
            where: { id: shipment.id },
            update: {
                requestId: shipment.requestId,
                warehouseId: shipment.warehouseId,
                destinationType: shipment.destinationType,
                destinationId: shipment.destinationId,
                destinationName: shipment.destinationName,
                status: shipment.status,
                assembledBy: shipment.assembledBy,
                type: shipment.type,
                requestNumber: shipment.requestNumber,
                invoiceNumber: shipment.invoiceNumber,
                completedAt: shipment.status === ShipmentStatus.DELIVERED ? new Date() : null,
            },
            create: {
                id: shipment.id,
                requestId: shipment.requestId,
                warehouseId: shipment.warehouseId,
                destinationType: shipment.destinationType,
                destinationId: shipment.destinationId,
                destinationName: shipment.destinationName,
                status: shipment.status,
                assembledBy: shipment.assembledBy,
                type: shipment.type,
                requestNumber: shipment.requestNumber,
                invoiceNumber: shipment.invoiceNumber,
                completedAt: shipment.status === ShipmentStatus.DELIVERED ? new Date() : null,
            },
        });

        await prisma.shipmentItem.deleteMany({ where: { shipmentId: shipment.id } });
        for (const serialNumber of shipment.items) {
            await prisma.shipmentItem.create({
                data: {
                    shipmentId: shipment.id,
                    assetId: assets.get(serialNumber)!,
                    picked: true,
                    pickedAt: new Date(),
                },
            });
        }

        await prisma.shipmentProduct.deleteMany({ where: { shipmentId: shipment.id } });
        for (const [sku, quantity] of shipment.expectedProducts) {
            await prisma.shipmentProduct.create({
                data: {
                    shipmentId: shipment.id,
                    productId: products.get(sku)!,
                    quantity,
                },
            });
        }

        await prisma.shipmentScan.deleteMany({
            where: { line: { shipmentId: shipment.id } },
        });
        await prisma.shipmentLine.deleteMany({ where: { shipmentId: shipment.id } });

        for (const [name, sku, expectedQuantity, scannedQuantity] of shipment.lines) {
            const line = await prisma.shipmentLine.create({
                data: {
                    shipmentId: shipment.id,
                    productId: products.get(sku)!,
                    originalName: name,
                    sku,
                    quantity: expectedQuantity,
                    expectedQuantity,
                    scannedQuantity,
                },
            });

            if (scannedQuantity > 0) {
                await prisma.shipmentScan.create({
                    data: {
                        lineId: line.id,
                        quantity: scannedQuantity,
                        isManual: false,
                        code: `${sku}-SHIP`,
                    },
                });
            }
        }
    }

    await prisma.delivery.upsert({
        where: { id: DEV.deliveries.active },
        update: {
            shipmentId: DEV.shipments.ready,
            storeId: DEV.stores.himki,
            provider: 'DEV Courier',
            status: DeliveryStatus.IN_TRANSIT,
            courierName: 'Павел Курьер',
            courierPhone: '+7 900 100-10-10',
        },
        create: {
            id: DEV.deliveries.active,
            shipmentId: DEV.shipments.ready,
            storeId: DEV.stores.himki,
            provider: 'DEV Courier',
            status: DeliveryStatus.IN_TRANSIT,
            courierName: 'Павел Курьер',
            courierPhone: '+7 900 100-10-10',
        },
    });

    await prisma.delivery.upsert({
        where: { id: DEV.deliveries.done },
        update: {
            shipmentId: DEV.shipments.delivered,
            storeId: DEV.stores.sokol,
            provider: 'DEV Courier',
            status: DeliveryStatus.DELIVERED,
            courierName: 'Илья Логист',
            courierPhone: '+7 900 200-20-20',
            deliveredAt: new Date(),
        },
        create: {
            id: DEV.deliveries.done,
            shipmentId: DEV.shipments.delivered,
            storeId: DEV.stores.sokol,
            provider: 'DEV Courier',
            status: DeliveryStatus.DELIVERED,
            courierName: 'Илья Логист',
            courierPhone: '+7 900 200-20-20',
            deliveredAt: new Date(),
        },
    });

    await prisma.deliveryEvent.deleteMany({
        where: { deliveryId: { in: [DEV.deliveries.active, DEV.deliveries.done] } },
    });

    await prisma.deliveryEvent.createMany({
        data: [
            {
                deliveryId: DEV.deliveries.active,
                title: 'Курьер назначен',
                description: 'Доставка выехала со склада Север',
            },
            {
                deliveryId: DEV.deliveries.active,
                title: 'В пути',
                description: 'Ожидаем прибытие до конца дня',
            },
            {
                deliveryId: DEV.deliveries.done,
                title: 'Доставлено',
                description: 'Оборудование принято магазином',
            },
        ],
    });
}

async function ensureReceivingSessions() {
    const warehouseUser = await prisma.user.findUnique({ where: { email: DEV.users.warehouse } });
    const manager = await prisma.user.findUnique({ where: { email: DEV.users.manager } });
    const products = new Map((await prisma.product.findMany()).map((product) => [product.sku, product.id]));

    const sessions = [
        {
            id: DEV.receiving.draft,
            warehouseId: DEV.warehouses.south,
            status: 'DRAFT',
            supplier: 'DEV Поставщик Alpha',
            invoiceNumber: 'DEV-REC-001',
            createdById: warehouseUser!.id,
            completedById: null,
            completedAt: null,
            type: 'file',
            items: [
                ['Точка WiFi Ubiquiti', 'DEV-WIFI-01', 2, 0],
                ['Этикетки 58x40', 'DEV-LABEL-01', 10, 0],
            ],
        },
        {
            id: DEV.receiving.progress,
            warehouseId: DEV.warehouses.north,
            status: 'IN_PROGRESS',
            supplier: 'DEV Поставщик Beta',
            invoiceNumber: 'DEV-REC-002',
            createdById: warehouseUser!.id,
            completedById: null,
            completedAt: null,
            type: 'manual',
            items: [
                ['Сканер штрихкода Honeywell', 'DEV-SCAN-01', 3, 2],
                ['Патч-корд 2м', 'DEV-CABLE-01', 12, 9],
            ],
        },
        {
            id: DEV.receiving.done,
            warehouseId: DEV.warehouses.north,
            status: 'COMPLETED',
            supplier: 'DEV Поставщик Gamma',
            invoiceNumber: 'DEV-REC-003',
            createdById: warehouseUser!.id,
            completedById: manager!.id,
            completedAt: new Date(),
            type: 'file',
            items: [
                ['МФУ HP LaserJet', 'DEV-MFU-01', 2, 2],
                ['Этикетки 58x40', 'DEV-LABEL-01', 6, 6],
            ],
        },
    ] as const;

    for (const session of sessions) {
        await prisma.receivingSession.upsert({
            where: { id: session.id },
            update: {
                warehouseId: session.warehouseId,
                status: session.status as any,
                supplier: session.supplier,
                invoiceNumber: session.invoiceNumber,
                createdById: session.createdById,
                completedById: session.completedById,
                completedAt: session.completedAt,
                type: session.type,
            },
            create: {
                id: session.id,
                warehouseId: session.warehouseId,
                status: session.status as any,
                supplier: session.supplier,
                invoiceNumber: session.invoiceNumber,
                createdById: session.createdById,
                completedById: session.completedById,
                completedAt: session.completedAt,
                type: session.type,
            },
        });

        await prisma.receivingScan.deleteMany({
            where: { receivingItem: { sessionId: session.id } },
        });
        await prisma.receivingItem.deleteMany({ where: { sessionId: session.id } });

        for (const [name, sku, expectedQuantity, scannedQuantity] of session.items) {
            const item = await prisma.receivingItem.create({
                data: {
                    sessionId: session.id,
                    name,
                    sku,
                    productId: products.get(sku)!,
                    expectedQuantity,
                    scannedQuantity,
                },
            });

            if (scannedQuantity > 0) {
                await prisma.receivingScan.create({
                    data: {
                        receivingItemId: item.id,
                        quantity: scannedQuantity,
                        isManual: false,
                        code: `${sku}-SCAN`,
                    },
                });
            }
        }
    }
}

async function ensureInventorySessions() {
    const warehouseUser = await prisma.user.findUnique({ where: { email: DEV.users.warehouse } });
    const assets = new Map((await prisma.asset.findMany()).map((asset) => [asset.serialNumber, asset.id]));

    const sessions = [
        {
            id: DEV.inventory.active,
            warehouseId: DEV.warehouses.north,
            status: 'IN_PROGRESS',
            completedAt: null,
            records: [
                ['DEV-SN-0001', 'SCANNED'],
                ['DEV-SN-0002', 'EXPECTED'],
                ['DEV-SN-0004', 'SCANNED'],
                ['DEV-SN-0005', 'EXPECTED'],
            ],
        },
        {
            id: DEV.inventory.done,
            warehouseId: DEV.warehouses.south,
            status: 'COMPLETED',
            completedAt: new Date(),
            records: [
                ['DEV-SN-0007', 'SCANNED'],
                ['DEV-SN-0008', 'SCANNED'],
                ['DEV-SN-0003', 'EXTRA'],
            ],
        },
    ] as const;

    for (const session of sessions) {
        await prisma.inventorySession.upsert({
            where: { id: session.id },
            update: {
                warehouseId: session.warehouseId,
                status: session.status,
                createdById: warehouseUser!.id,
                completedAt: session.completedAt,
            },
            create: {
                id: session.id,
                warehouseId: session.warehouseId,
                status: session.status,
                createdById: warehouseUser!.id,
                completedAt: session.completedAt,
            },
        });

        await prisma.inventoryRecord.deleteMany({ where: { inventorySessionId: session.id } });
        for (const [serialNumber, status] of session.records) {
            await prisma.inventoryRecord.create({
                data: {
                    inventorySessionId: session.id,
                    assetId: assets.get(serialNumber)!,
                    status,
                    scannedById: status === 'EXPECTED' ? null : warehouseUser!.id,
                    scannedAt: status === 'EXPECTED' ? null : new Date(),
                },
            });
        }
    }
}

async function main() {
    console.log('Seeding DEV data...');

    await ensurePermissionsAndRoles();
    await ensureUsers();
    await ensureCategories();
    await ensureWarehousesAndBins();
    await ensureProducts();
    await ensureStores();
    await ensureStock();
    await ensureAssets();
    await ensureRequestsShipmentsAndDeliveries();
    await ensureReceivingSessions();
    await ensureInventorySessions();

    console.log('DEV seed completed.');
    console.log('Test login:');
    console.log(`  ${DEV.users.admin} / dev12345`);
    console.log(`  ${DEV.users.manager} / dev12345`);
    console.log(`  ${DEV.users.warehouse} / dev12345`);
    console.log(`  ${DEV.users.support} / dev12345`);
}

main()
    .catch((error) => {
        console.error(error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
