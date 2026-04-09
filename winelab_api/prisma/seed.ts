import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding database...');

    console.log('Seeding categories...');
    const mandatoryCategories = [
        { name: 'POS-терминал', code: 'POS_TERMINAL', isMandatory: true },
        { name: 'Сканер ШК', code: 'BARCODE_SCANNER', isMandatory: true },
        { name: 'Монитор', code: 'MONITOR', isMandatory: true },
        { name: 'Системный блок', code: 'SYSTEM_UNIT', isMandatory: true },
        { name: 'Принтер', code: 'PRINTER', isMandatory: true },
        { name: 'МФУ', code: 'MFU', isMandatory: true },
        { name: 'ИБП', code: 'UPS', isMandatory: true },
        { name: 'Клавиатура', code: 'KEYBOARD', isMandatory: true },
        { name: 'Мышь', code: 'MOUSE', isMandatory: true },
        { name: 'ТСД', code: 'TSD', isMandatory: false },
        { name: 'Весы', code: 'SCALES', isMandatory: true },
        { name: 'Денежный ящик', code: 'CASH_DRAWER', isMandatory: true },
        { name: 'Дисплей покупателя', code: 'CUSTOMER_DISPLAY', isMandatory: true },
        { name: 'Сетевое оборудование', code: 'NETWORK_EQUIPMENT', isMandatory: false },
        { name: 'Кассовое оборудование', code: 'CASH_EQUIPMENT', isMandatory: false },
        { name: 'Периферия', code: 'PERIPHERALS', isMandatory: false },
        { name: 'Видеонаблюдение', code: 'CCTV', isMandatory: false },
    ];

    for (const category of mandatoryCategories) {
        await prisma.equipmentCategory.upsert({
            where: { code: category.code },
            update: {},
            create: category,
        });
    }
    console.log('Categories seeded');

    const warehouseLocation = await prisma.warehouse.upsert({
        where: { id: 'main-warehouse' },
        update: {},
        create: {
            id: 'main-warehouse',
            name: 'Склад А',
            address: 'г. Москва, ул. Складская, д. 1',
        },
    });
    console.log('Warehouse created:', warehouseLocation.name);

    const bins = ['A-01-1', 'A-01-2', 'A-02-1', 'B-01-1', 'B-02-1'];
    for (const code of bins) {
        await prisma.warehouseBin.upsert({
            where: { warehouseId_code: { warehouseId: warehouseLocation.id, code } },
            update: {},
            create: {
                warehouseId: warehouseLocation.id,
                code,
            },
        });
    }
    console.log('Warehouse bins created');

    const products = [
        { name: 'Роутер X500', sku: 'RTR-X500', categoryCode: 'NETWORK_EQUIPMENT' },
        { name: 'POS-терминал Pro', sku: 'POS-PRO', categoryCode: 'POS_TERMINAL' },
        { name: 'Сканер штрих-кодов', sku: 'SCN-200', categoryCode: 'BARCODE_SCANNER' },
        { name: 'IP-камера 4MP', sku: 'CAM-4MP', categoryCode: 'CCTV' },
        { name: 'Принтер чеков', sku: 'PRT-CHK', categoryCode: 'PRINTER' },
    ];

    for (const product of products) {
        const category = await prisma.equipmentCategory.findUnique({
            where: { code: product.categoryCode },
        });

        if (!category) {
            console.warn(`Category not found for product ${product.name}: ${product.categoryCode}`);
            continue;
        }

        await prisma.product.upsert({
            where: { sku: product.sku },
            update: {
                categoryId: category.id,
            },
            create: {
                name: product.name,
                sku: product.sku,
                categoryId: category.id,
            },
        });
    }
    console.log('Products created');

    const stores = [
        { name: 'ТРК Атриум', address: 'ул. Атриум, д. 15, этаж 2', region: 'Москва' },
        { name: 'ТЦ Европейский', address: 'пл. Киевского Вокзала, 2', region: 'Москва' },
        { name: 'ТЦ Авиапарк', address: 'Ходынский бульвар, 4', region: 'Москва' },
    ];

    for (const store of stores) {
        const safeId = store.name
            .toLowerCase()
            .replace(/тц |трк /g, '')
            .trim()
            .replace(/\s/g, '-');

        await prisma.store.upsert({
            where: { id: safeId },
            update: {},
            create: {
                id: safeId,
                ...store,
                phone: '+7 (495) 123-45-67',
                email: 'store@winelab.ru',
            },
        });
    }
    console.log('Stores created');

    console.log('\nSeeding complete');
    console.log('Users are no longer created by the default seed.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
