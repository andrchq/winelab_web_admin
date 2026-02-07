"use client";

import { CategoriesSettings } from "@/components/settings/categories-settings";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function EquipmentCategoriesPage() {
    return (
        <div className="p-6 h-full">
            <div className="space-y-6 max-w-5xl mx-auto animate-fade-in">
                <div className="flex items-center gap-4">
                    <Link href="/settings">
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold">Категории оборудования</h1>
                        <p className="text-sm text-muted-foreground">Управление справочником типов устройств и их параметрами</p>
                    </div>
                </div>

                <CategoriesSettings />
            </div>
        </div>
    );
}
