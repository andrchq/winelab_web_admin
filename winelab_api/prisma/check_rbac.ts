import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const permCount = await prisma.permission.count();
    const roleCount = await prisma.role.count();
    const userCount = await prisma.user.count();

    console.log(`Permissions count: ${permCount}`);
    console.log(`Roles count: ${roleCount}`);
    console.log(`Users count: ${userCount}`);
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
