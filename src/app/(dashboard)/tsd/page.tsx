"use client";

import Link from "next/link";
import { PackageCheck, Truck, ClipboardList, LogOut } from "lucide-react";
import { useTSDMode } from "@/contexts/TSDModeContext";
import { Button } from "@/components/ui/button";

export default function TSDDashboardPage() {
    const { disableTSDMode } = useTSDMode();

    const menuItems = [
        {
            title: "Приемка",
            description: "Поступление товаров на склад",
            icon: PackageCheck,
            href: "/receiving",
            color: "text-blue-500",
            bgColor: "bg-blue-500/10",
            borderColor: "border-blue-500/20"
        },
        {
            title: "Отгрузка",
            description: "Сборка и отправка заказов",
            icon: Truck,
            href: "/shipments",
            color: "text-orange-500",
            bgColor: "bg-orange-500/10",
            borderColor: "border-orange-500/20"
        },
        {
            title: "Инвентаризация",
            description: "Сверка остатков (В разработке)",
            icon: ClipboardList,
            href: "/assets", // Temporary link or placeholder
            color: "text-purple-500",
            bgColor: "bg-purple-500/10",
            borderColor: "border-purple-500/20",
            disabled: false // Can be set to true if not ready
        }
    ];

    return (
        <div className="flex flex-col h-full p-4 space-y-3 max-w-xl mx-auto w-full relative">

            {/* Top Exit Button */}
            <div className="w-full">
                <Button
                    variant="ghost"
                    className="w-full text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors font-medium text-sm h-10 rounded-xl border border-red-200 dark:border-red-900/50 shadow-sm"
                    onClick={disableTSDMode}
                >
                    <LogOut className="mr-2 h-4 w-4" />
                    Выйти из режима TSD
                </Button>
            </div>

            <div className="text-center space-y-1">
                <h1 className="text-xl font-bold tracking-tight">Режим TSD</h1>
                <p className="text-sm text-muted-foreground">Выберите операцию</p>
            </div>

            <div className="grid gap-3 flex-1 content-start">
                {menuItems.map((item) => (
                    <Link key={item.title} href={item.href} className={item.disabled ? "pointer-events-none opacity-50" : ""}>
                        <div className={`
                            relative overflow-hidden
                            flex items-center gap-4 p-4 rounded-xl border-2 transition-all duration-300
                            hover:scale-[1.01] active:scale-[0.99]
                            ${item.bgColor} ${item.borderColor}
                            group
                        `}>
                            <div className={`
                                p-3 rounded-lg bg-background shadow-sm
                                ${item.color}
                            `}>
                                <item.icon className="w-6 h-6" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h2 className="text-lg font-bold mb-0.5">{item.title}</h2>
                                <p className="text-xs font-medium opacity-80 leading-tight">
                                    {item.description}
                                </p>
                            </div>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
}
