
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        console.log('Starting database cleanup...');

        // Delete dependent records first to avoid foreign key constraints
        // Assets
        const deletedAssets = await prisma.asset.deleteMany({});
        console.log(`Deleted ${deletedAssets.count} assets`);

        // Stock Items
        const deletedStock = await prisma.stockItem.deleteMany({});
        console.log(`Deleted ${deletedStock.count} stock items`);

        // Receiving Items (since they link to products)
        // We might want to keep sessions but clear items, or just clear items linked to products
        const deletedReceivingItems = await prisma.receivingItem.deleteMany({});
        console.log(`Deleted ${deletedReceivingItems.count} receiving items`);

        // Finally, delete products
        const deletedProducts = await prisma.product.deleteMany({});
        console.log(`Deleted ${deletedProducts.count} products`);

        console.log('Cleanup completed successfully.');
    } catch (e) {
        console.error('Error during cleanup:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
