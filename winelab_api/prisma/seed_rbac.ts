import { PrismaClient } from '@prisma/client';
import { PERMISSION_CATEGORIES, SystemPermission } from '../src/auth/permissions';

const prisma = new PrismaClient();

async function main() {
    console.log('Start seeding RBAC...');

    const permissions = Object.values(SystemPermission);

    for (const code of permissions) {
        const category = PERMISSION_CATEGORIES[code] || 'Other';
        const description = `Permission to ${code.split('_')[1].toLowerCase()} ${category.toLowerCase()}`;

        await prisma.permission.upsert({
            where: { code },
            update: { category, description },
            create: { code, category, description },
        });
    }
    console.log(`Synced ${permissions.length} permissions.`);

    const warehousePermissions = permissions.filter((permission) =>
        ['WAREHOUSE', 'STOCK', 'SHIPMENT', 'RECEIVING', 'ASSET', 'DELIVERY', 'PRODUCT'].some((prefix) =>
            permission.startsWith(prefix),
        ) || permission.startsWith('REQUEST'),
    );

    const roleConfigs = [
        { name: 'ADMIN', description: 'Administrator', permissions, isSystem: true },
        {
            name: 'MANAGER',
            description: 'Manager',
            permissions: permissions.filter((permission) =>
                permission !== SystemPermission.USER_DELETE &&
                permission !== SystemPermission.ROLE_DELETE &&
                permission !== SystemPermission.SHIPMENT_DELETE &&
                permission !== SystemPermission.CATEGORY_MANAGE,
            ),
            isSystem: true,
        },
        {
            name: 'WAREHOUSE',
            description: 'Warehouse Worker',
            permissions: warehousePermissions,
            isSystem: true,
        },
        {
            name: 'USER',
            description: 'Regular User',
            permissions: [
                SystemPermission.STORE_READ,
                SystemPermission.PRODUCT_READ,
                SystemPermission.REQUEST_READ,
                SystemPermission.REQUEST_CREATE,
            ],
            isSystem: true,
        },
    ];

    for (const roleConfig of roleConfigs) {
        const role = await prisma.role.upsert({
            where: { name: roleConfig.name },
            update: { description: roleConfig.description, isSystem: roleConfig.isSystem },
            create: { name: roleConfig.name, description: roleConfig.description, isSystem: roleConfig.isSystem },
        });

        await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });

        const permissionRecords = await prisma.permission.findMany({
            where: { code: { in: roleConfig.permissions } },
        });

        await prisma.rolePermission.createMany({
            data: permissionRecords.map((permission) => ({
                roleId: role.id,
                permissionId: permission.id,
            })),
        });

        console.log(`Role ${role.name} updated with ${permissionRecords.length} permissions.`);
    }

    console.log('RBAC seeding completed.');
    console.log('Users are not created here anymore. Create the first administrator on the login screen.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
