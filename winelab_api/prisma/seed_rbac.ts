import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { SystemPermission, PERMISSION_CATEGORIES } from '../src/auth/permissions';

const prisma = new PrismaClient();

async function main() {
    console.log('Start seeding RBAC...');

    // 1. Create/Update Permissions
    console.log('Seeding Permissions...');
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

    // 2. Create Roles
    console.log('Seeding Roles...');

    // Define Roles and their permissions
    const rolesDef = {
        ADMIN: permissions, // Admin has all permissions
        MANAGER: permissions.filter(p => !p.startsWith('SYSTEM')), // Manager has most
        WAREHOUSE: permissions.filter(p =>
            p.startsWith('WAREHOUSE') ||
            p.startsWith('STOCK') ||
            p.startsWith('SHIPMENT') ||
            p.startsWith('RECEIVING') ||
            p.startsWith('ASSET') ||
            p.startsWith('这里Request') || // Typo in thought, strict checks slightly better
            (p.startsWith('REQUEST') && p !== 'REQUEST_DELETE')
        ),
        USER: permissions.filter(p => p.endsWith('_READ') || p === 'REQUEST_CREATE'),
    };

    // Correcting WAREHOUSE filter to be more precise based on my permissions list
    const warehousePermissions = permissions.filter(p =>
        ['WAREHOUSE', 'STOCK', 'SHIPMENT', 'RECEIVING', 'ASSET', 'DELIVERY', 'PRODUCT'].some(prefix => p.startsWith(prefix)) ||
        p.startsWith('REQUEST')
    );

    const roleConfigs = [
        { name: 'ADMIN', description: 'Administrator', permissions: permissions, isSystem: true },
        { name: 'MANAGER', description: 'Manager', permissions: permissions.filter(p => p !== SystemPermission.USER_DELETE && p !== SystemPermission.ROLE_DELETE), isSystem: true },
        { name: 'WAREHOUSE', description: 'Warehouse Worker', permissions: warehousePermissions, isSystem: true },
        { name: 'USER', description: 'Regular User', permissions: [SystemPermission.STORE_READ, SystemPermission.PRODUCT_READ, SystemPermission.REQUEST_READ, SystemPermission.REQUEST_CREATE], isSystem: true },
    ];

    for (const roleConfig of roleConfigs) {
        // Create Role
        const role = await prisma.role.upsert({
            where: { name: roleConfig.name },
            update: { description: roleConfig.description, isSystem: roleConfig.isSystem },
            create: { name: roleConfig.name, description: roleConfig.description, isSystem: roleConfig.isSystem },
        });

        // Assign Permissions
        // First remove existing permissions for this role to ensure strict sync
        await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });

        // Batch create
        const permissionRecords = await prisma.permission.findMany({
            where: { code: { in: roleConfig.permissions } }
        });

        await prisma.rolePermission.createMany({
            data: permissionRecords.map(p => ({
                roleId: role.id,
                permissionId: p.id
            }))
        });

        console.log(`Role ${role.name} updated with ${permissionRecords.length} permissions.`);
    }

    // 3. Create Admin User
    console.log('Seeding Admin User...');
    const adminEmail = 'admin@winelab.ru';
    const adminPassword = await bcrypt.hash('admin123', 10);
    const adminRole = await prisma.role.findUnique({ where: { name: 'ADMIN' } });

    if (adminRole) {
        const admin = await prisma.user.upsert({
            where: { email: adminEmail },
            update: {
                roleId: adminRole.id
            },
            create: {
                email: adminEmail,
                password: adminPassword,
                name: 'System Admin',
                roleId: adminRole.id,
                isActive: true
            }
        });
        console.log(`Admin user ${admin.email} ensured.`);
    }

    console.log('RBAC Seeding completed.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
