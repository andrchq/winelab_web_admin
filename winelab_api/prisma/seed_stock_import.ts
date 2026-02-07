
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DATA = {
    warehouses: [
        {
            name: "Склад Москва",
            address: "Перовская 59",
            items: {
                "МФУ (принтеры)": 16,
                "Клавиатуры проводные": 73,
                "Мышки проводные": 53,
                "Кассовые моноблоки": 4,
                "Денежные ящики CSI": 62,
                "Денежные ящики INTEGRO": 143,
                "ФР": 19,
                "Закладные для сервера": 70,
                "Сканер MERTECH": 34,
                "Кассы Самообслуживания": 4,
                "Термопринтер+ремень": 3,
                "ТСД": 106,
                "ПК (Неттоп) Администратора": 120,
                "Мониторы покупателя и администратора (24 дюйма)": 0,
                "Кронштейны для касс и мониторов": 11,
                "Сетевые фильтры UPS": 240,
                "Салазки": 100,
                "Винт 2.5-inch M3x4/8mm (для SSD)": 0,
                "SSD SAMSUNG SATAIII (500GB)": 5,
                "Провода HDMI-DP": 111,
                "Провода VGA-DP": 19,
                "Маршрутизатор": 95,
                "Комутатор": 63,
                "Сервер": 19,
                "Точки доступа Wi-Fi": 26,
                "ИБП дешевые": 0,
                "ИБП дорогие": 0,
            }
        },
        {
            name: "Склад Санкт-Петербург",
            address: "Краснопутиловская 12",
            items: {
                "МФУ (принтеры)": 3,
                "Клавиатуры проводные": 20,
                "Мышки проводные": 20,
                "Кассовые моноблоки": 3,
                "Денежные ящики CSI": 0,
                "Денежные ящики INTEGRO": 8,
                "ФР": 10,
                "Закладные для сервера": 20,
                "Сканер MERTECH": 27,
                "Кассы Самообслуживания": 0,
                "Термопринтер+ремень": 0,
                "ТСД": 108,
                "ПК (Неттоп) Администратора": 6,
                "Мониторы покупателя и администратора (24 дюйма)": 3,
                "Кронштейны для касс и мониторов": 4,
                "Сетевые фильтры UPS": 46,
                "Салазки": 6,
                "Винт 2.5-inch M3x4/8mm (для SSD)": 0,
                "SSD SAMSUNG SATAIII (500GB)": 19,
                "Провода HDMI-DP": 10,
                "Провода VGA-DP": 10,
                "Маршрутизатор": 12,
                "Комутатор": 12,
                "Сервер": 10,
                "Точки доступа Wi-Fi": 1,
                "ИБП дешевые": 0,
                "ИБП дорогие": 0,
            }
        },
        {
            name: "Склад Архангельск",
            address: "Троицкий 135",
            items: {
                "МФУ (принтеры)": 6,
                "Клавиатуры проводные": 10,
                "Мышки проводные": 10,
                "Кассовые моноблоки": 0,
                "Денежные ящики CSI": 1,
                "Денежные ящики INTEGRO": 3,
                "ФР": 3,
                "Закладные для сервера": 0,
                "Сканер MERTECH": 16,
                "Кассы Самообслуживания": 0,
                "Термопринтер+ремень": 0,
                "ТСД": 0,
                "ПК (Неттоп) Администратора": 0,
                "Мониторы покупателя и администратора (24 дюйма)": 1,
                "Кронштейны для касс и мониторов": 6,
                "Сетевые фильтры UPS": 0,
                "Салазки": 3,
                "Винт 2.5-inch M3x4/8mm (для SSD)": 0,
                "SSD SAMSUNG SATAIII (500GB)": 19,
                "Провода HDMI-DP": 4,
                "Провода VGA-DP": 2,
                "Маршрутизатор": 3,
                "Комутатор": 3,
                "Сервер": 4,
                "Точки доступа Wi-Fi": 18,
                "ИБП дешевые": 20,
                "ИБП дорогие": 0,
            }
        }
    ]
};

const CATEGORY_MAP: Record<string, string> = {
    "МФУ": "Периферия",
    "Клавиатуры": "Периферия",
    "Мышки": "Периферия",
    "Кассовые": "Торговое",
    "Денежные": "Торговое",
    "ФР": "Торговое",
    "Сканер": "Торговое",
    "Термопринтер": "Торговое",
    "ТСД": "Торговое",
    "ПК": "Компьютерное",
    "Мониторы": "Компьютерное",
    "Сервер": "Сетевое",
    "Маршрутизатор": "Сетевое",
    "Комутатор": "Сетевое",
    "Точки доступа": "Сетевое",
    "Провода": "Расходные материалы",
    "Винт": "Расходные материалы",
    "Салазки": "Расходные материалы",
    "SSD": "Компьютерное",
    "ИБП": "Периферия",
    "Кронштейны": "Периферия",
    "Сетевые фильтры": "Периферия",
    "Закладные": "Сетевое"
};

function getCategory(name: string): string {
    for (const [key, value] of Object.entries(CATEGORY_MAP)) {
        if (name.includes(key)) return value;
    }
    return "Прочее";
}

function generateSku(name: string): string {
    // Generate simple SKU: FIRST3-HASH
    const prefix = name.substring(0, 3).toUpperCase().replace(/[^A-ZА-Я0-9]/g, 'ITM');
    const hash = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}-${hash}`;
}

async function main() {
    console.log("Starting stock import...");

    for (const whData of DATA.warehouses) {
        console.log(`Processing warehouse: ${whData.name}`);

        // 1. Find or Create Warehouse
        // Try to find by name first to avoid duplicates if re-running
        let warehouse = await prisma.warehouse.findFirst({
            where: { name: whData.name }
        });

        if (!warehouse) {
            warehouse = await prisma.warehouse.create({
                data: {
                    name: whData.name,
                    address: whData.address
                }
            });
            console.log(`Created warehouse: ${warehouse.name}`);
        } else {
            // Update address if needed?
            console.log(`Found warehouse: ${warehouse.name}`);
        }

        // 2. Process Items
        for (const [itemName, quantity] of Object.entries(whData.items)) {
            // Find or Create Product
            let product = await prisma.product.findFirst({
                where: { name: itemName }
            });

            if (!product) {
                const categoryLabel = getCategory(itemName);
                let categoryCode = 'ACCESSORY';

                // Map labels to codes (approximate)
                if (categoryLabel === 'Сетевое') categoryCode = 'SWITCH'; // Generic network
                if (itemName.includes('Сервер')) categoryCode = 'SERVER';
                if (itemName.includes('Маршрутизатор')) categoryCode = 'ROUTER';
                if (itemName.includes('Точки доступа')) categoryCode = 'WIFI_AP';
                if (itemName.includes('МФУ')) categoryCode = 'MFU';
                if (itemName.includes('Кассовые') || itemName.includes('Касса')) categoryCode = 'CASH_REGISTER';
                if (itemName.includes('Сканер')) categoryCode = 'SCANNER';
                if (itemName.includes('ТСД')) categoryCode = 'TSD';
                if (itemName.includes('Термопринтер')) categoryCode = 'THERMAL_PRINTER';
                if (itemName.includes('ФР')) categoryCode = 'FISCAL_REGISTRAR';
                if (itemName.includes('Монитор')) categoryCode = 'PC_MONITOR';
                if (itemName.includes('ПК')) categoryCode = 'COMPUTER';

                // Create unique SKU based on name hash if not real
                // Actually let's try to be consistent. 
                // Using name as seed for SKU? No, random is safer for now as this is a seed.
                // But ideally we want persistent SKUs.
                const sku = generateSku(itemName);

                product = await prisma.product.create({
                    data: {
                        name: itemName,
                        category: {
                            connect: { code: categoryCode }
                        },
                        sku: sku, // Ensure uniqueness logic? SKU is unique in schema.
                        // Simple retry logic if collision?
                    }
                });
                console.log(`Created product: ${product.name}`);
            }

            // 3. Upsert StockItem
            await prisma.stockItem.upsert({
                where: {
                    productId_warehouseId: {
                        productId: product.id,
                        warehouseId: warehouse.id
                    }
                },
                update: {
                    quantity: quantity
                },
                create: {
                    productId: product.id,
                    warehouseId: warehouse.id,
                    quantity: quantity,
                    minQuantity: 5 // Default reasonable min
                }
            });
        }
    }

    console.log("Import completed successfully.");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
