
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    try {
        const counts = await prisma.product.groupBy({
            by: ['categoryId'],
            _count: { categoryId: true }
        });
        console.log('Categories:', JSON.stringify(counts, null, 2));

        const servers = await prisma.product.findMany({
            where: { category: { code: 'SERVER' } }
        });
        console.log('Servers:', JSON.stringify(servers, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
