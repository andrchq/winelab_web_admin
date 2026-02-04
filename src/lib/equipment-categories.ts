// Equipment Categories for Stores
// All mandatory equipment that must be present in a store

import type { MandatoryEquipmentCategory, EquipmentCategory, StoreEquipment } from '@/types/api';

export interface EquipmentCategoryConfig {
    category: MandatoryEquipmentCategory;
    label: string;
    labelShort: string;
    icon: string; // Lucide icon name
    minCount: number;
}

export const MANDATORY_EQUIPMENT: EquipmentCategoryConfig[] = [
    { category: 'SERVER', label: 'Сервер', labelShort: 'Сервер', icon: 'Server', minCount: 1 },
    { category: 'ROUTER', label: 'Маршрутизатор', labelShort: 'Маршрутизатор', icon: 'Router', minCount: 1 },
    { category: 'SWITCH', label: 'Коммутатор', labelShort: 'Коммутатор', icon: 'Network', minCount: 1 },
    { category: 'CASH_REGISTER', label: 'Касса', labelShort: 'Касса', icon: 'DollarSign', minCount: 1 },
    { category: 'SCANNER', label: 'Сканер', labelShort: 'Сканер', icon: 'Scan', minCount: 1 },
    { category: 'CASH_DRAWER', label: 'Денежный ящик', labelShort: 'Ден.ящик', icon: 'Inbox', minCount: 1 },
    { category: 'FISCAL_REGISTRAR', label: 'Фискальный регистратор', labelShort: 'ФР', icon: 'Receipt', minCount: 1 },
    { category: 'COMPUTER', label: 'Компьютер', labelShort: 'ПК', icon: 'Monitor', minCount: 1 },
    { category: 'PC_MONITOR', label: 'Монитор для ПК', labelShort: 'Мон.ПК', icon: 'MonitorUp', minCount: 1 },
    { category: 'CASH_MONITOR', label: 'Монитор для кассы', labelShort: 'Мон.кассы', icon: 'Tv', minCount: 1 },
    { category: 'WIFI_AP', label: 'Точка WiFi', labelShort: 'WiFi', icon: 'Wifi', minCount: 1 },
    { category: 'MFU', label: 'МФУ', labelShort: 'МФУ', icon: 'Printer', minCount: 1 },
    { category: 'TSD', label: 'ТСД', labelShort: 'ТСД', icon: 'Smartphone', minCount: 1 },
    { category: 'THERMAL_PRINTER', label: 'Термопринтер', labelShort: 'Термопринтер', icon: 'Printer', minCount: 1 },
];

export const ACCESSORY_CATEGORY: { category: 'ACCESSORY'; label: string; labelShort: string } = {
    category: 'ACCESSORY',
    label: 'Сопутствующее',
    labelShort: 'Сопутствующее',
};

/**
 * Get category config by category code
 */
export function getCategoryConfig(category: EquipmentCategory): EquipmentCategoryConfig | typeof ACCESSORY_CATEGORY | undefined {
    if (category === 'ACCESSORY') return ACCESSORY_CATEGORY;
    return MANDATORY_EQUIPMENT.find(e => e.category === category);
}

/**
 * Get category label by category code
 */
export function getCategoryLabel(category: EquipmentCategory): string {
    const config = getCategoryConfig(category);
    return config?.label || category;
}

/**
 * Check which mandatory equipment is missing from a store
 */
export function getMissingEquipment(
    storeEquipment: StoreEquipment[] | undefined
): { category: MandatoryEquipmentCategory; label: string; labelShort: string }[] {
    if (!storeEquipment || storeEquipment.length === 0) {
        return MANDATORY_EQUIPMENT.map(e => ({
            category: e.category,
            label: e.label,
            labelShort: e.labelShort,
        }));
    }

    const presentCategories = new Set(storeEquipment.map(e => e.category));

    return MANDATORY_EQUIPMENT
        .filter(req => !presentCategories.has(req.category))
        .map(e => ({
            category: e.category,
            label: e.label,
            labelShort: e.labelShort,
        }));
}

/**
 * Group equipment by category
 */
export function groupEquipmentByCategory(
    equipment: StoreEquipment[]
): Record<EquipmentCategory, StoreEquipment[]> {
    const result: Record<string, StoreEquipment[]> = {};

    for (const item of equipment) {
        if (!result[item.category]) {
            result[item.category] = [];
        }
        result[item.category].push(item);
    }

    return result as Record<EquipmentCategory, StoreEquipment[]>;
}
