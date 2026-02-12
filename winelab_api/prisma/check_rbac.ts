import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const permCount = await prisma.permission.count();
    const roleCount = await prisma.role.count();
    const adminUser = await prisma.user.findUnique({ where: { email: 'admin@winelab.ru' }, include: { role: true } });

    console.log(`Permissions count: ${permCount}`);
    console.log(`Roles count: ${roleCount}`);
    console.log(`Admin user: ${adminUser ? 'Found' : 'Missing'}`);
    if (adminUser) {
        console.log(`Admin ID: ${adminUser.id}`);
        console.log(`Admin Role: ${adminUser.role?.name}`);
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
