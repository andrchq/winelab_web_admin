
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    try {
        // 1. Create Server Product
        let product = await prisma.product.findFirst({ where: { category: { code: 'SERVER' } } });
        if (!product) {
            console.log('Creating Server Product...');
            product = await prisma.product.create({
                data: {
                    name: 'HPE ProLiant DL360 Gen10',
                    sku: 'SRV-HPE-360',
                    category: { connect: { code: 'SERVER' } },
                    description: 'Standard Store Server',
                }
            });
            console.log('Created Server Product:', product.name);
        } else {
            console.log('Found existing server product:', product.name);
        }

        // 2. Find Warehouse 'Москва' (or first available)
        let warehouse = await prisma.warehouse.findFirst({ where: { name: { contains: 'Москва', mode: 'insensitive' } } });
        if (!warehouse) {
            console.log('Warehouse Moscow not found, taking first one');
            warehouse = await prisma.warehouse.findFirst();
        }

        if (!warehouse) {
            console.error('No warehouses found!');
            return;
        }
        console.log('Using warehouse:', warehouse.name);

        // 3. Add Stock
        const stock = await prisma.stockItem.upsert({
            where: {
                productId_warehouseId: {
                    productId: product.id,
                    warehouseId: warehouse.id
                }
            },
            create: {
                productId: product.id,
                warehouseId: warehouse.id,
                quantity: 10,
                minQuantity: 1
            },
            update: {
                quantity: {
                    set: 10 // Ensure at least 10
                }
            }
        });

        console.log(`Updated stock: 10 servers in warehouse ${warehouse.name}`);

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
