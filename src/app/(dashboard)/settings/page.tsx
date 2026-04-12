"use client";

import { FolderTree, LockKeyhole, Settings2, Shield } from "lucide-react";

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import {
    SETTINGS_MODULES,
    SETTINGS_ROLE_DESCRIPTIONS,
    SETTINGS_ROLE_LABELS,
    SETTINGS_SECTIONS,
    canAccessSettingsModule,
    resolveSettingsRole,
} from "@/components/settings/settings-registry";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardHeader, CardTitle, StatCard } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";

const TEXT = {
    title: "\u041d\u0430\u0441\u0442\u0440\u043e\u0439\u043a\u0438",
    description:
        "\u0421\u0442\u0440\u0430\u043d\u0438\u0446\u0430 \u0441\u043e\u0431\u0440\u0430\u043d\u0430 \u0438\u0437 inline-\u043c\u043e\u0434\u0443\u043b\u0435\u0439 \u0441 \u0440\u0435\u0430\u043b\u044c\u043d\u043e\u0439 API-\u043b\u043e\u0433\u0438\u043a\u043e\u0439. \u0410\u0434\u043c\u0438\u043d \u0432\u0438\u0434\u0438\u0442 \u0432\u0435\u0441\u044c \u043a\u043e\u043d\u0442\u0443\u0440, \u043e\u0441\u0442\u0430\u043b\u044c\u043d\u044b\u0435 \u0440\u043e\u043b\u0438 \u0442\u043e\u043b\u044c\u043a\u043e \u0441\u0432\u043e\u0438 \u0437\u043e\u043d\u044b.",
    currentRole: "\u0422\u0435\u043a\u0443\u0449\u0430\u044f \u0440\u043e\u043b\u044c",
    availableModules: "\u0414\u043e\u0441\u0442\u0443\u043f\u043d\u043e \u043c\u043e\u0434\u0443\u043b\u0435\u0439",
    hiddenModules: "\u0421\u043a\u0440\u044b\u0442\u043e \u043f\u043e \u0440\u043e\u043b\u0438",
    availableSections: "\u0413\u0440\u0443\u043f\u043f \u043d\u0430\u0441\u0442\u0440\u043e\u0435\u043a",
    availableModulesSubtitle: "\u041c\u043e\u0434\u0443\u043b\u0438, \u043a\u043e\u0442\u043e\u0440\u044b\u0435 \u043c\u043e\u0436\u043d\u043e \u043c\u0435\u043d\u044f\u0442\u044c \u0438\u0437 \u044d\u0442\u043e\u0439 \u0441\u0442\u0440\u0430\u043d\u0438\u0446\u044b",
    hiddenAdminSubtitle: "\u0410\u0434\u043c\u0438\u043d \u0432\u0438\u0434\u0438\u0442 \u0432\u0441\u0435 \u043c\u043e\u0434\u0443\u043b\u0438",
    hiddenRoleSubtitle: "\u041d\u0435\u0434\u043e\u0441\u0442\u0443\u043f\u043d\u043e \u0434\u043b\u044f \u0442\u0435\u043a\u0443\u0449\u0435\u0439 \u0440\u043e\u043b\u0438",
    sectionSubtitle: "\u041c\u043e\u0434\u0443\u043b\u0438 \u0441 \u0440\u0435\u0430\u043b\u044c\u043d\u044b\u043c\u0438 \u0438\u0437\u043c\u0435\u043d\u0435\u043d\u0438\u044f\u043c\u0438",
    roleAccess: "\u0414\u043e\u0441\u0442\u0443\u043f",
    adminAccess: "\u0412\u0441\u0435 \u0440\u043e\u043b\u0438 \u0447\u0435\u0440\u0435\u0437 Admin",
    noAccessTitle: "\u0414\u043b\u044f \u044d\u0442\u043e\u0439 \u0440\u043e\u043b\u0438 \u043f\u043e\u043a\u0430 \u043d\u0435\u0442 \u043e\u0442\u043a\u0440\u044b\u0442\u044b\u0445 inline-\u043d\u0430\u0441\u0442\u0440\u043e\u0435\u043a",
    noAccessDescription:
        "\u041a\u043e\u0433\u0434\u0430 \u043f\u043e\u044f\u0432\u044f\u0442\u0441\u044f \u0440\u0435\u0430\u043b\u044c\u043d\u044b\u0435 \u043c\u043e\u0434\u0443\u043b\u0438 \u0434\u043b\u044f \u0432\u0430\u0448\u0435\u0439 \u0440\u043e\u043b\u0438, \u043e\u043d\u0438 \u043f\u043e\u0434\u043a\u043b\u044e\u0447\u0430\u0442\u0441\u044f \u0432 \u044d\u0442\u043e\u0442 \u044d\u043a\u0440\u0430\u043d \u0447\u0435\u0440\u0435\u0437 \u043e\u0431\u0449\u0438\u0439 \u0440\u0435\u0435\u0441\u0442\u0440 \u0431\u0435\u0437 \u043f\u0435\u0440\u0435\u0441\u0431\u043e\u0440\u043a\u0438 \u0441\u0442\u0440\u0430\u043d\u0438\u0446\u044b.",
};

export default function SettingsPage() {
    const { user } = useAuth();
    const roleName = user?.role ? (typeof user.role === "object" ? user.role.name : user.role) : null;
    const currentRole = resolveSettingsRole(roleName);
    const isAdmin = currentRole === "ADMIN";

    const visibleModules = SETTINGS_MODULES.filter((module) => canAccessSettingsModule(currentRole, module.roles));
    const hiddenModulesCount = SETTINGS_MODULES.length - visibleModules.length;

    const visibleSections = SETTINGS_SECTIONS.map((section) => ({
        ...section,
        modules: visibleModules.filter((module) => module.sectionId === section.id),
    })).filter((section) => section.modules.length > 0);

    return (
        <ProtectedRoute>
            <div className="h-full p-6">
                <div className="space-y-6">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div>
                            <h1 className="text-2xl font-bold">{TEXT.title}</h1>
                            <p className="mt-1 text-sm text-muted-foreground">{TEXT.description}</p>
                        </div>
                        <Badge variant={isAdmin ? "destructive" : "secondary"} className="h-10 w-fit px-4 text-sm">
                            <Shield className="h-4 w-4" />
                            {SETTINGS_ROLE_LABELS[currentRole]}
                        </Badge>
                    </div>

                    <div className="grid gap-4 md:grid-cols-4 animate-stagger">
                        <StatCard
                            title={TEXT.currentRole}
                            value={SETTINGS_ROLE_LABELS[currentRole]}
                            subtitle={SETTINGS_ROLE_DESCRIPTIONS[currentRole]}
                            icon={<Shield className="h-5 w-5" />}
                            status={isAdmin ? "accent" : "default"}
                        />
                        <StatCard
                            title={TEXT.availableModules}
                            value={visibleModules.length}
                            subtitle={TEXT.availableModulesSubtitle}
                            icon={<Settings2 className="h-5 w-5" />}
                            status="success"
                        />
                        <StatCard
                            title={TEXT.hiddenModules}
                            value={hiddenModulesCount}
                            subtitle={isAdmin ? TEXT.hiddenAdminSubtitle : TEXT.hiddenRoleSubtitle}
                            icon={<LockKeyhole className="h-5 w-5" />}
                            status={isAdmin ? "default" : "warning"}
                        />
                        <StatCard
                            title={TEXT.availableSections}
                            value={visibleSections.length}
                            subtitle={TEXT.sectionSubtitle}
                            icon={<FolderTree className="h-5 w-5" />}
                            status="default"
                        />
                    </div>

                    {visibleSections.length === 0 ? (
                        <Card variant="elevated">
                            <CardHeader>
                                <CardTitle>{TEXT.noAccessTitle}</CardTitle>
                                <CardDescription>{TEXT.noAccessDescription}</CardDescription>
                            </CardHeader>
                        </Card>
                    ) : (
                        visibleSections.map((section) => (
                            <div key={section.id} className="space-y-4">
                                <div>
                                    <h2 className="text-lg font-semibold">{section.title}</h2>
                                    <p className="mt-1 text-sm text-muted-foreground">{section.description}</p>
                                </div>

                                <div className="space-y-4">
                                    {section.modules.map((module) => {
                                        const ModuleComponent = module.Component;

                                        return (
                                            <div key={module.id} className="space-y-2">
                                                <div className="flex justify-end">
                                                    <Badge variant="outline">
                                                        {TEXT.roleAccess}: {isAdmin ? TEXT.adminAccess : module.roles.map((role) => SETTINGS_ROLE_LABELS[role]).join(", ")}
                                                    </Badge>
                                                </div>
                                                <ModuleComponent />
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </ProtectedRoute>
    );
}
