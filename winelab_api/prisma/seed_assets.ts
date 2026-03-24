import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding assets...');

    const warehouse = await prisma.warehouse.findFirst({
        where: { name: 'Склад А' }
    });

    if (!warehouse) {
        throw new Error('Warehouse not found. Run seed.ts first.');
    }

    const products = await prisma.product.findMany();
    if (products.length === 0) {
        throw new Error('Products not found. Run seed.ts first.');
    }

    console.log(`Found warehouse: ${warehouse.name} (${warehouse.id})`);
    console.log(`Found ${products.length} products`);

    // Create 10 assets
    for (let i = 0; i < 10; i++) {
        const product = products[i % products.length];
        const serialNumber = `1000${i}`; // Predictable SNs: 10000, 10001, etc.

        await prisma.asset.upsert({
            where: { serialNumber },
            update: {},
            create: {
                serialNumber,
                productId: product.id,
                warehouseId: warehouse.id,
                condition: 'WORKING',
                processStatus: 'AVAILABLE',
            }
        });
        console.log(`Created asset: ${product.name} (SN: ${serialNumber})`);
    }

    console.log('✅ Assets seeded successfully!');
    console.log('Test Barcodes: 10000, 10001, 10002 ...');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
