
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const CATEGORIES = [
    // Parents (Mandatory Requirements)
    {
        code: 'SERVER_ROOT', label: 'Сервер', isMandatory: true, children: [
            { code: 'SERVER', label: 'Сервер (Стандарт)', isMandatory: false },
            { code: 'SERVER_RACK', label: 'Сервер (Стойка)', isMandatory: false },
        ]
    },
    {
        code: 'ROUTER_ROOT', label: 'Маршрутизатор', isMandatory: true, children: [
            { code: 'ROUTER', label: 'Маршрутизатор (Mikrotik)', isMandatory: false },
            { code: 'ROUTER_CISCO', label: 'Маршрутизатор (Cisco)', isMandatory: false },
        ]
    },
    {
        code: 'SWITCH_ROOT', label: 'Коммутатор', isMandatory: true, children: [
            { code: 'SWITCH', label: 'Коммутатор 24p', isMandatory: false },
            { code: 'SWITCH_48', label: 'Коммутатор 48p', isMandatory: false },
        ]
    },
    {
        code: 'POS_ROOT', label: 'Кассовый узел', isMandatory: true, children: [
            { code: 'CASH_REGISTER', label: 'Касса (Моноблок)', isMandatory: false },
            { code: 'FISCAL_REGISTRAR', label: 'Фискальный регистратор', isMandatory: false },
            { code: 'SCANNER', label: 'Сканер штрих-кода', isMandatory: false },
        ]
    },
    {
        code: 'WORKSTATION_ROOT', label: 'Рабочее место', isMandatory: true, children: [
            { code: 'COMPUTER', label: 'ПК Администратора', isMandatory: false },
            { code: 'PC_MONITOR', label: 'Монитор', isMandatory: false },
            { code: 'MFU', label: 'МФУ', isMandatory: false },
        ]
    },
    // Standalone / Other
    { code: 'WIFI_AP', label: 'Точка доступа WiFi', isMandatory: true, children: [] },
    { code: 'TSD', label: 'Терминал сбора данных', isMandatory: true, children: [] },
    { code: 'THERMAL_PRINTER', label: 'Термопринтер', isMandatory: false, children: [] },
    { code: 'ACCESSORY', label: 'Сопутствующее', isMandatory: false, children: [] },
    { code: 'CCTV', label: 'Видеонаблюдение', isMandatory: false, children: [] },
];

async function main() {
    console.log('Seeding categories hierarchy...');

    for (const parent of CATEGORIES) {
        // Create Parent
        const parentCat = await prisma.equipmentCategory.upsert({
            where: { code: parent.code },
            update: {
                name: parent.label,
                isMandatory: parent.isMandatory
            },
            create: {
                code: parent.code,
                name: parent.label,
                isMandatory: parent.isMandatory
            }
        });
        console.log(`Processed Parent: ${parent.label}`);

        // Create Children
        for (const child of parent.children) {
            await prisma.equipmentCategory.upsert({
                where: { code: child.code },
                update: {
                    name: child.label,
                    isMandatory: child.isMandatory,
                    parentId: parentCat.id
                },
                create: {
                    code: child.code,
                    name: child.label,
                    isMandatory: child.isMandatory,
                    parentId: parentCat.id
                }
            });
            console.log(`  > Processed Child: ${child.label}`);
        }
    }

    console.log('Categories seeded successfully.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
