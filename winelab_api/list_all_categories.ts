
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const categories = await prisma.equipmentCategory.findMany({});
    console.log('All Categories:');
    console.table(categories.map(c => ({
        id: c.id,
        code: c.code,
        name: c.name,
        parentId: c.parentId
    })));
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
