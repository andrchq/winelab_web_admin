"use client";

import Link from "next/link";
import { PackageCheck, Truck, ClipboardList, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TSDDashboardProps {
    onExit: () => void;
}

export function TSDDashboard({ onExit }: TSDDashboardProps) {
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
            description: "Сверка остатков",
            icon: ClipboardList,
            href: "/assets",
            color: "text-purple-500",
            bgColor: "bg-purple-500/10",
            borderColor: "border-purple-500/20",
            disabled: false
        }
    ];

    return (
        <div className="flex flex-col h-full p-4 gap-4 max-w-xl mx-auto w-full relative">
            <div className="text-center space-y-1 py-2">
                <h1 className="text-xl font-bold tracking-tight">Режим TSD</h1>
                <p className="text-sm text-muted-foreground">Выберите операцию</p>
            </div>

            <div className="grid gap-4 flex-1 content-start">
                {menuItems.map((item) => (
                    <Link key={item.title} href={item.href} className={item.disabled ? "pointer-events-none opacity-50" : ""}>
                        <div className={`
                            relative overflow-hidden
                            flex items-center gap-5 p-5 min-h-[110px] rounded-2xl border-2 transition-all duration-300
                            hover:scale-[1.01] active:scale-[0.98]
                            ${item.bgColor} ${item.borderColor}
                            group
                        `}>
                            <div className={`
                                p-4 rounded-xl bg-background shadow-sm shrink-0
                                ${item.color}
                            `}>
                                <item.icon className="w-8 h-8" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h2 className="text-xl font-bold mb-1">{item.title}</h2>
                                <p className="text-sm font-medium opacity-80 leading-tight">
                                    {item.description}
                                </p>
                            </div>
                        </div>
                    </Link>
                ))}
            </div>

            {/* Bottom Exit Button */}
            <div className="w-full mt-auto pt-2">
                <Button
                    variant="ghost"
                    className="w-full text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors font-semibold text-base h-16 rounded-xl border-2 border-red-200 dark:border-red-900/50 shadow-sm active:scale-[0.98]"
                    onClick={onExit}
                >
                    <LogOut className="mr-2 h-5 w-5" />
                    Выйти из режима TSD
                </Button>
            </div>
        </div>
    );
}
