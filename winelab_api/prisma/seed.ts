import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding database...');

    // Create admin user
    const adminPassword = await bcrypt.hash('admin123', 10);
    const admin = await prisma.user.upsert({
        where: { email: 'admin@winelab.ru' },
        update: {},
        create: {
            email: 'admin@winelab.ru',
            password: adminPassword,
            name: 'Администратор',
            role: Role.ADMIN,
        },
    });
    console.log('✅ Admin user created:', admin.email);

    // Create manager
    const managerPassword = await bcrypt.hash('manager123', 10);
    const manager = await prisma.user.upsert({
        where: { email: 'manager@winelab.ru' },
        update: {},
        create: {
            email: 'manager@winelab.ru',
            password: managerPassword,
            name: 'Козлова Мария',
            phone: '+7 (999) 111-22-33',
            role: Role.MANAGER,
        },
    });
    console.log('✅ Manager created:', manager.email);

    // Create warehouse user
    const warehousePassword = await bcrypt.hash('warehouse123', 10);
    const warehouse = await prisma.user.upsert({
        where: { email: 'warehouse@winelab.ru' },
        update: {},
        create: {
            email: 'warehouse@winelab.ru',
            password: warehousePassword,
            name: 'Петров Владимир',
            phone: '+7 (999) 222-33-44',
            role: Role.WAREHOUSE,
        },
    });
    console.log('✅ Warehouse user created:', warehouse.email);

    // Create support user
    const supportPassword = await bcrypt.hash('support123', 10);
    const support = await prisma.user.upsert({
        where: { email: 'support@winelab.ru' },
        update: {},
        create: {
            email: 'support@winelab.ru',
            password: supportPassword,
            name: 'Сидорова Анна',
            phone: '+7 (999) 333-44-55',
            role: Role.SUPPORT,
        },
    });
    console.log('✅ Support user created:', support.email);

    // Create warehouse
    const warehouseLocation = await prisma.warehouse.upsert({
        where: { id: 'main-warehouse' },
        update: {},
        create: {
            id: 'main-warehouse',
            name: 'Склад А',
            address: 'г. Москва, ул. Складская, д. 1',
        },
    });
    console.log('✅ Warehouse created:', warehouseLocation.name);

    // Create bins
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
    console.log('✅ Warehouse bins created');

    // Create products
    const products = [
        { name: 'Роутер X500', sku: 'RTR-X500', category: 'Сетевое оборудование' },
        { name: 'POS-терминал Pro', sku: 'POS-PRO', category: 'Кассовое оборудование' },
        { name: 'Сканер штрих-кодов', sku: 'SCN-200', category: 'Периферия' },
        { name: 'IP-камера 4MP', sku: 'CAM-4MP', category: 'Видеонаблюдение' },
        { name: 'Принтер чеков', sku: 'PRT-CHK', category: 'Кассовое оборудование' },
    ];

    for (const product of products) {
        await prisma.product.upsert({
            where: { sku: product.sku },
            update: {},
            create: product,
        });
    }
    console.log('✅ Products created');

    // Create stores
    const stores = [
        { name: 'ТРК Атриум', address: 'ул. Атриум, д. 15, этаж 2', region: 'Москва' },
        { name: 'ТЦ Европейский', address: 'пл. Киевского Вокзала, 2', region: 'Москва' },
        { name: 'ТЦ Авиапарк', address: 'Ходынский бульвар, 4', region: 'Москва' },
    ];

    for (const store of stores) {
        await prisma.store.upsert({
            where: { id: store.name.toLowerCase().replace(/\s/g, '-') },
            update: {},
            create: {
                id: store.name.toLowerCase().replace(/\s/g, '-'),
                ...store,
                phone: '+7 (495) 123-45-67',
                email: `store@winelab.ru`,
            },
        });
    }
    console.log('✅ Stores created');

    console.log('\n🎉 Seeding complete!');
    console.log('\nTest accounts:');
    console.log('  admin@winelab.ru / admin123');
    console.log('  manager@winelab.ru / manager123');
    console.log('  warehouse@winelab.ru / warehouse123');
    console.log('  support@winelab.ru / support123');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
