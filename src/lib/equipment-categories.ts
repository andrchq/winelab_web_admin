// Equipment Categories for Stores
// All mandatory equipment that must be present in a store

import type { EquipmentCategory, StoreEquipment } from '@/types/api';

export interface EquipmentCategoryConfig {
    category: string;
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

export const CATEGORY_DISPLAY_ORDER = [
    'Сервер',
    'Маршрутизатор',
    'Коммутатор',
    'Фискальный регистратор',
    'Касса',
    'Денежный ящик',
    'Монитор для кассы',
    'Компьютер',
    'Монитор для ПК',
    'МФУ',
    'ТСД',
    'Термопринтер',
    'Точка WiFi',
    'Сканер'
];

export function getCategoryWeight(name: string): number {
    const normalize = (s: string) => s.toLowerCase().trim();
    // Special handling for variations if needed
    let n = normalize(name);
    // Maps
    if (n.includes('точка')) n = 'точка wifi';
    if (n.includes('фискальный')) n = 'фискальный регистратор';

    const index = CATEGORY_DISPLAY_ORDER.findIndex(o => normalize(o) === n);
    // Try partial match if exact fails
    if (index === -1) {
        const partialIndex = CATEGORY_DISPLAY_ORDER.findIndex(o => n.includes(normalize(o)) || normalize(o).includes(n));
        return partialIndex === -1 ? 999 : partialIndex;
    }
    return index;
}

export function sortCategories(aName: string, bName: string): number {
    return getCategoryWeight(aName) - getCategoryWeight(bName);
}

/**
 * Get category config by category code from provided list (deprecated logic, use backend data)
 */
export function getCategoryLabel(category: EquipmentCategory | string, allCategories?: EquipmentCategory[]): string {
    if (typeof category !== 'string' && 'name' in category) {
        return category.name;
    }

    // Fallback for string codes (legacy or during migration)
    const found = allCategories?.find(c => c.code === category || c.id === category);
    if (found) return found.name;

    // Static fallback
    const config = MANDATORY_EQUIPMENT.find(e => e.category === category);
    if (config) return config.label;

    if (category === 'ACCESSORY') return ACCESSORY_CATEGORY.label;

    return category as string;
}

/**
 * Check which mandatory equipment is missing from a store
 * Now requires allCategories to be passed
 */
export function getMissingEquipment(
    storeEquipment: StoreEquipment[] | undefined,
    allCategories: EquipmentCategory[]
): EquipmentCategory[] {
    if (!storeEquipment || !allCategories) return [];

    const mandatoryCategories = allCategories.filter(c => c.isMandatory);
    const presentCategoryIds = new Set(
        storeEquipment.map(e => {
            // If store equipment has category object
            const catRaw = e.category as unknown;
            if (typeof catRaw !== 'string' && catRaw && 'id' in (catRaw as any)) {
                return (catRaw as EquipmentCategory).id;
            }
            // If it has code/id string, find it in allCategories
            // Check if present equipment category matches mandatory category OR is a child of it
            // Logic: we need to normalize what we have "present"
            return null;
        }).filter(Boolean)
    );

    // Better approach: iterate mandatory categories and check if satisfied
    return mandatoryCategories.filter(mandatory => {
        // Check if this mandatory category is satisfied by any equipment
        const isSatisfied = storeEquipment.some(eq => {
            const eqCategoryRaw = eq.category as unknown;
            const eqCategory = typeof eqCategoryRaw === 'string'
                ? allCategories.find(c => c.code === eqCategoryRaw || c.id === eqCategoryRaw)
                : eq.category;

            if (!eqCategory) return false;

            // Satisfied if:
            // 1. Direct match
            if (eqCategory.id === mandatory.id) return true;
            // 2. Equipment category is a child of mandatory category
            if (eqCategory.parentId === mandatory.id) return true;

            return false;
        });

        return !isSatisfied;
    });
}

/**
 * Group equipment by category
 */
export function groupEquipmentByCategory(
    equipment: StoreEquipment[]
): Record<string, StoreEquipment[]> {
    const result: Record<string, StoreEquipment[]> = {};

    for (const item of equipment) {
        // Category is always an object now based on updated StoreEquipment type
        // But for safety during migration we check
        const catRaw = item.category as unknown;
        const key = (catRaw && typeof catRaw === 'object' && 'id' in catRaw)
            ? (catRaw as EquipmentCategory).id
            : (item.category as unknown as string);

        if (!result[key]) {
            result[key] = [];
        }
        result[key].push(item);
    }

    return result;
}
