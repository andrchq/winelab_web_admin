
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding equipment categories...');

    // Mandatory Categories (Parent)
    const mandatoryCategories = [
        { name: 'POS-терминал', code: 'POS_TERMINAL', isMandatory: true },
        { name: 'Сканер ШК', code: 'BARCODE_SCANNER', isMandatory: true },
        { name: 'Монитор', code: 'MONITOR', isMandatory: true },
        { name: 'Системный блок', code: 'SYSTEM_UNIT', isMandatory: true },
        { name: 'Принтер', code: 'PRINTER', isMandatory: true },
        { name: 'МФУ', code: 'MFU', isMandatory: true },
        { name: 'ИБП', code: 'UPS', isMandatory: true },
        { name: 'Клавиатура', code: 'KEYBOARD', isMandatory: true },
        { name: 'Мышь', code: 'MOUSE', isMandatory: true },
        { name: 'ТСД', code: 'TSD', isMandatory: false }, // ТСД is usually mandatory but flagged false in some contexts, keeping consistent
        { name: 'Весы', code: 'SCALES', isMandatory: true },
        { name: 'Денежный ящик', code: 'CASH_DRAWER', isMandatory: true },
        { name: 'Дисплей покупателя', code: 'CUSTOMER_DISPLAY', isMandatory: true },
    ];

    for (const cat of mandatoryCategories) {
        await prisma.equipmentCategory.upsert({
            where: { code: cat.code },
            update: {},
            create: cat,
        });
    }

    // Child Categories (Specific Models/Types) mapping to parents
    // This is a simplified list based on common equipment
    const childCategories = [
        // POS Terminals
        { name: 'POS-терминал АТОЛ', code: 'POS_ATOL', parentCode: 'POS_TERMINAL' },
        { name: 'POS-терминал ШТРИХ', code: 'POS_SHTRIH', parentCode: 'POS_TERMINAL' },

        // Scanners
        { name: 'Сканер Honeywell 1450g', code: 'SCANNER_1450G', parentCode: 'BARCODE_SCANNER' },
        { name: 'Сканер Mertech', code: 'SCANNER_MERTECH', parentCode: 'BARCODE_SCANNER' },
        { name: 'Сканер Атол', code: 'SCANNER_ATOL', parentCode: 'BARCODE_SCANNER' },

        // Monitors
        { name: 'Монитор 21.5"', code: 'MONITOR_21', parentCode: 'MONITOR' },
        { name: 'Монитор 24"', code: 'MONITOR_24', parentCode: 'MONITOR' },

        // System Units
        { name: 'Системный блок Mini', code: 'SYS_MINI', parentCode: 'SYSTEM_UNIT' },
        { name: 'Системный блок Standard', code: 'SYS_STD', parentCode: 'SYSTEM_UNIT' },

        // Printers/MFU
        { name: 'Принтер HP', code: 'PRINTER_HP', parentCode: 'PRINTER' },
        { name: 'МФУ Kyocera', code: 'MFU_KYOCERA', parentCode: 'MFU' },
        { name: 'МФУ Pantum', code: 'MFU_PANTUM', parentCode: 'MFU' },

        // UPS
        { name: 'ИБП Ippon', code: 'UPS_IPPON', parentCode: 'UPS' },
        { name: 'ИБП Powercom', code: 'UPS_POWERCOM', parentCode: 'UPS' },

        // TSD
        { name: 'ТСД Urovo', code: 'TSD_UROVO', parentCode: 'TSD' },
        { name: 'ТСД Atol Smart', code: 'TSD_ATOL', parentCode: 'TSD' },
    ];

    for (const cat of childCategories) {
        const parent = await prisma.equipmentCategory.findUnique({
            where: { code: cat.parentCode },
        });

        if (parent) {
            await prisma.equipmentCategory.upsert({
                where: { code: cat.code },
                update: { parentId: parent.id },
                create: {
                    name: cat.name,
                    code: cat.code,
                    parentId: parent.id,
                    isMandatory: false,
                },
            });
        }
    }

    console.log('✅ Categories seeded successfully');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
