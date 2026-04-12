import type { ComponentType } from "react";
import type { LucideIcon } from "lucide-react";
import { FolderTree, PackageCheck, Shield, Warehouse } from "lucide-react";

import { AutoInstallEquipmentSettings } from "@/components/settings/auto-install-equipment-settings";
import { CategoriesSettings } from "@/components/settings/categories-settings";
import { UsersSettings } from "@/components/settings/users-settings";
import { WarehousesSettings } from "@/components/settings/warehouses-settings";

export type AppRole = "ADMIN" | "MANAGER" | "WAREHOUSE" | "SUPPORT" | "USER";

export interface SettingsSectionDefinition {
    id: string;
    title: string;
    description: string;
}

export interface SettingsModuleDefinition {
    id: string;
    sectionId: string;
    title: string;
    description: string;
    roles: AppRole[];
    icon: LucideIcon;
    Component: ComponentType;
}

export const SETTINGS_ROLE_LABELS: Record<AppRole, string> = {
    ADMIN: "\u0410\u0434\u043c\u0438\u043d\u0438\u0441\u0442\u0440\u0430\u0442\u043e\u0440",
    MANAGER: "\u0420\u0443\u043a\u043e\u0432\u043e\u0434\u0441\u0442\u0432\u043e",
    WAREHOUSE: "\u0421\u043a\u043b\u0430\u0434",
    SUPPORT: "\u0422\u0435\u0445\u043f\u043e\u0434\u0434\u0435\u0440\u0436\u043a\u0430",
    USER: "\u041f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u044c",
};

export const SETTINGS_ROLE_DESCRIPTIONS: Record<AppRole, string> = {
    ADMIN: "\u0412\u0438\u0434\u0438\u0442 \u0438 \u043d\u0430\u0441\u0442\u0440\u0430\u0438\u0432\u0430\u0435\u0442 \u0432\u0435\u0441\u044c \u043a\u043e\u043d\u0442\u0443\u0440 \u0441\u0438\u0441\u0442\u0435\u043c\u044b.",
    MANAGER: "\u0423\u043f\u0440\u0430\u0432\u043b\u044f\u0435\u0442 \u0431\u0438\u0437\u043d\u0435\u0441-\u0441\u043f\u0440\u0430\u0432\u043e\u0447\u043d\u0438\u043a\u0430\u043c\u0438 \u0438 \u043e\u043f\u0435\u0440\u0430\u0446\u0438\u043e\u043d\u043d\u043e\u0439 \u043a\u043e\u043d\u0444\u0438\u0433\u0443\u0440\u0430\u0446\u0438\u0435\u0439.",
    WAREHOUSE: "\u0412\u0438\u0434\u0438\u0442 \u0442\u043e\u043b\u044c\u043a\u043e \u0441\u043a\u043b\u0430\u0434\u0441\u043a\u0438\u0435 \u043d\u0430\u0441\u0442\u0440\u043e\u0439\u043a\u0438 \u0438 \u0440\u0430\u0431\u043e\u0447\u0438\u0435 \u043f\u0430\u0440\u0430\u043c\u0435\u0442\u0440\u044b.",
    SUPPORT: "\u0414\u043e\u0441\u0442\u0443\u043f \u043a \u043d\u0430\u0441\u0442\u0440\u043e\u0439\u043a\u0430\u043c \u043e\u0433\u0440\u0430\u043d\u0438\u0447\u0435\u043d \u0440\u043e\u043b\u044c\u044e.",
    USER: "\u0414\u043b\u044f \u044d\u0442\u043e\u0439 \u0440\u043e\u043b\u0438 \u0441\u0438\u0441\u0442\u0435\u043c\u043d\u044b\u0435 \u043d\u0430\u0441\u0442\u0440\u043e\u0439\u043a\u0438 \u043d\u0435 \u043e\u0442\u043a\u0440\u044b\u0442\u044b.",
};

export const SETTINGS_SECTIONS: SettingsSectionDefinition[] = [
    {
        id: "governance",
        title: "\u0414\u043e\u0441\u0442\u0443\u043f \u0438 \u043e\u0442\u0432\u0435\u0442\u0441\u0442\u0432\u0435\u043d\u043d\u043e\u0441\u0442\u044c",
        description: "\u041d\u0430\u0441\u0442\u0440\u043e\u0439\u043a\u0438 \u043b\u044e\u0434\u0435\u0439 \u0438 \u0440\u043e\u043b\u0435\u0439, \u043a\u043e\u0442\u043e\u0440\u044b\u0435 \u0443\u043f\u0440\u0430\u0432\u043b\u044f\u044e\u0442 \u0434\u043e\u0441\u0442\u0443\u043f\u043e\u043c \u043a \u0441\u0438\u0441\u0442\u0435\u043c\u0435.",
    },
    {
        id: "operations",
        title: "\u041e\u043f\u0435\u0440\u0430\u0446\u0438\u043e\u043d\u043d\u044b\u0439 \u043a\u043e\u043d\u0442\u0443\u0440",
        description: "\u0420\u0435\u0430\u043b\u044c\u043d\u044b\u0435 \u0441\u043f\u0440\u0430\u0432\u043e\u0447\u043d\u0438\u043a\u0438 \u0438 \u0441\u0443\u0449\u043d\u043e\u0441\u0442\u0438, \u043a\u043e\u0442\u043e\u0440\u044b\u0435 \u043c\u0435\u043d\u044f\u044e\u0442 \u043f\u043e\u0432\u0441\u0435\u0434\u043d\u0435\u0432\u043d\u0443\u044e \u0440\u0430\u0431\u043e\u0442\u0443.",
    },
];

export const SETTINGS_MODULES: SettingsModuleDefinition[] = [
    {
        id: "users",
        sectionId: "governance",
        title: "\u041f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u0438 \u0438 \u0434\u043e\u0441\u0442\u0443\u043f",
        description: "\u0421\u043e\u0437\u0434\u0430\u043d\u0438\u0435 \u0443\u0447\u0435\u0442\u043d\u044b\u0445 \u0437\u0430\u043f\u0438\u0441\u0435\u0439, \u0432\u044b\u0434\u0430\u0447\u0430 \u0440\u043e\u043b\u0435\u0439 \u0438 \u0430\u043a\u0442\u0438\u0432\u0430\u0446\u0438\u044f \u0434\u043e\u0441\u0442\u0443\u043f\u0430.",
        roles: ["ADMIN", "MANAGER"],
        icon: Shield,
        Component: UsersSettings,
    },
    {
        id: "warehouses",
        sectionId: "operations",
        title: "\u0421\u043a\u043b\u0430\u0434\u044b",
        description: "\u0422\u043e\u043f\u043e\u043b\u043e\u0433\u0438\u044f \u0441\u043a\u043b\u0430\u0434\u043e\u0432, \u0438\u0445 \u0441\u043e\u0441\u0442\u043e\u044f\u043d\u0438\u0435 \u0438 \u0431\u0430\u0437\u043e\u0432\u044b\u0435 \u043f\u0430\u0440\u0430\u043c\u0435\u0442\u0440\u044b.",
        roles: ["ADMIN", "MANAGER", "WAREHOUSE"],
        icon: Warehouse,
        Component: WarehousesSettings,
    },
    {
        id: "equipment-categories",
        sectionId: "operations",
        title: "\u041a\u0430\u0442\u0435\u0433\u043e\u0440\u0438\u0438 \u043e\u0431\u043e\u0440\u0443\u0434\u043e\u0432\u0430\u043d\u0438\u044f",
        description: "\u0418\u0435\u0440\u0430\u0440\u0445\u0438\u044f \u043a\u0430\u0442\u0435\u0433\u043e\u0440\u0438\u0439, \u043e\u0431\u044f\u0437\u0430\u0442\u0435\u043b\u044c\u043d\u043e\u0441\u0442\u044c \u0438 \u0441\u0432\u044f\u0437\u0438 \u0434\u043b\u044f \u043f\u0440\u0438\u0435\u043c\u043a\u0438 \u0438 \u043e\u0441\u043d\u0430\u0449\u0435\u043d\u0438\u044f.",
        roles: ["ADMIN", "MANAGER"],
        icon: FolderTree,
        Component: CategoriesSettings,
    },
    {
        id: "store-auto-install-equipment",
        sectionId: "operations",
        title: "Перечень автоустановки",
        description: "Шаблон legacy-оборудования, который автоматически устанавливается на новые магазины.",
        roles: ["ADMIN", "MANAGER"],
        icon: PackageCheck,
        Component: AutoInstallEquipmentSettings,
    },
];

export function resolveSettingsRole(roleValue: string | null | undefined): AppRole {
    if (roleValue === "ADMIN" || roleValue === "MANAGER" || roleValue === "WAREHOUSE" || roleValue === "SUPPORT") {
        return roleValue;
    }
    return "USER";
}

export function canAccessSettingsModule(currentRole: AppRole, allowedRoles: AppRole[]) {
    return currentRole === "ADMIN" || allowedRoles.includes(currentRole);
}
