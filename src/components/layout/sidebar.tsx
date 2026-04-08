"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Russo_One } from "next/font/google";
import { useEffect, useState } from "react";
import {
    type LucideIcon,
    ArrowDownToLine,
    BarChart3,
    Boxes,
    Building2,
    ChevronLeft,
    ClipboardList,
    LayoutDashboard,
    LogOut,
    Menu,
    Settings,
    Store,
    Truck,
    Users,
    Warehouse,
} from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { useTSDMode } from "@/contexts/TSDModeContext";
import { useRequests } from "@/lib/hooks";
import { cn } from "@/lib/utils";

interface SidebarNavItem {
    name: string;
    href: string;
    icon: LucideIcon;
    roles?: readonly string[];
    badge?: number;
}

interface SidebarNavGroup {
    title: string;
    items: SidebarNavItem[];
}

const brandFont = Russo_One({
    subsets: ["latin", "cyrillic"],
    weight: "400",
});

export function Sidebar() {
    const pathname = usePathname();
    const { logout, hasRole } = useAuth();
    const { isTSDMode, isExitingTSD } = useTSDMode();
    const { data: requests } = useRequests();

    const activeRequestsCount = requests?.filter((request) => request.status === "NEW").length || 0;
    const [collapsed, setCollapsed] = useState(false);
    const [isMounted, setIsMounted] = useState(false);
    const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
        "Склад": true,
        "Логистика": true,
        "Система": true,
    });

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsMounted(true);
            const savedState = localStorage.getItem("sidebarCollapsed");
            if (savedState !== null) {
                setCollapsed(savedState === "true");
            }
        }, 0);

        return () => clearTimeout(timer);
    }, []);

    const toggleCollapsed = () => {
        const nextState = !collapsed;
        setCollapsed(nextState);
        localStorage.setItem("sidebarCollapsed", String(nextState));
    };

    const toggleGroup = (groupName: string) => {
        setOpenGroups((prev) => ({ ...prev, [groupName]: !prev[groupName] }));
    };

    const renderAnimatedText = (
        text: string,
        className?: string,
        expandedWidthClassName = "max-w-[220px]",
        stagger = 18,
    ) => (
        <span
            aria-hidden={collapsed}
            className={cn(
                "overflow-hidden whitespace-nowrap transition-[max-width,opacity] duration-300 ease-out",
                collapsed ? "max-w-0 opacity-0" : `${expandedWidthClassName} opacity-100`,
                className,
            )}
        >
            <span className="inline-flex whitespace-nowrap">
                {text.split("").map((char, index) => {
                    const reverseIndex = text.length - index - 1;
                    return (
                        <span
                            key={`${text}-${index}`}
                            className={cn(
                                "inline-block transition-[transform,opacity] duration-300 ease-out",
                                collapsed ? "translate-x-1 opacity-0" : "translate-x-0 opacity-100",
                            )}
                            style={{
                                transitionDelay: `${(collapsed ? reverseIndex : index) * stagger}ms`,
                            }}
                        >
                            {char === " " ? "\u00A0" : char}
                        </span>
                    );
                })}
            </span>
        </span>
    );

    const navGroups: SidebarNavGroup[] = [
        {
            title: "Основное",
            items: [
                { name: "Главная", href: "/", icon: LayoutDashboard },
                { name: "Магазины", href: "/stores", icon: Store },
            ],
        },
        {
            title: "Склад",
            items: [
                { name: "Перемещения", href: "/receiving", icon: ArrowDownToLine, roles: ["ADMIN", "MANAGER", "WAREHOUSE"] as const },
                { name: "Отгрузка", href: "/shipments", icon: Truck },
                { name: "Склады", href: "/warehouses", icon: Building2 },
                { name: "Инвентаризация", href: "/assets", icon: Boxes },
                { name: "Остатки", href: "/stock", icon: Warehouse },
            ],
        },
        {
            title: "Логистика",
            items: [
                {
                    name: "Заявки",
                    href: "/requests",
                    icon: ClipboardList,
                    badge: activeRequestsCount > 0 ? activeRequestsCount : undefined,
                },
            ],
        },
        {
            title: "Система",
            items: [
                { name: "Аналитика", href: "/analytics", icon: BarChart3 },
                { name: "Пользователи", href: "/users", icon: Users },
                { name: "Настройки", href: "/settings", icon: Settings },
            ],
        },
    ];

    if (isTSDMode) {
        return null;
    }

    return (
        <aside
            className={cn(
                "flex h-screen flex-col bg-card border-r border-border/40 transition-all duration-300 ease-in-out",
                collapsed ? "w-[72px]" : "w-64",
                (!isMounted || isExitingTSD) && "transition-none",
            )}
        >
            <div className="border-b border-border/40 px-3 py-4">
                <Link
                    href="/"
                    className={cn(
                        "group flex min-w-0 items-center transition-all duration-300 ease-out min-h-11",
                        collapsed ? "mx-auto w-11 justify-center" : "gap-3 w-full",
                    )}
                >
                    <Image
                        src="/logo.png"
                        alt="ВИНЛАБ"
                        width={44}
                        height={44}
                        priority
                        className={cn(
                            "rounded-xl object-cover shadow-lg shadow-violet-500/20 transition-all duration-300 ease-out group-hover:scale-105",
                            "h-11 w-11",
                        )}
                    />
                    {!collapsed && (
                        <span className={cn(brandFont.className, "text-[26px] uppercase tracking-[0.05em] text-violet-300")}>
                            {renderAnimatedText("ВИНЛАБ", "align-middle", "max-w-[170px]", 20)}
                        </span>
                    )}
                </Link>

                <button
                    onClick={toggleCollapsed}
                    className={cn(
                        "mt-3 flex h-11 items-center rounded-xl border border-border/50 text-muted-foreground transition-all duration-300 ease-out hover:bg-muted hover:text-foreground active:scale-[0.98]",
                        collapsed ? "mx-auto w-11 justify-center" : "w-full justify-between px-4",
                    )}
                    aria-label={collapsed ? "Развернуть меню" : "Свернуть меню"}
                >
                    {collapsed ? (
                        <Menu className="h-5 w-5 transition-transform duration-300 ease-out" />
                    ) : (
                        <>
                            <span className="min-w-0 flex-1 text-left text-sm font-medium">
                                {renderAnimatedText("Свернуть", undefined, "max-w-[120px]", 12)}
                            </span>
                            <ChevronLeft className="h-5 w-5 shrink-0 transition-transform duration-300 ease-out" />
                        </>
                    )}
                </button>
            </div>

            <nav className="sidebar-scroll flex-1 overflow-y-auto overflow-x-hidden py-4 px-3 space-y-4">
                {navGroups.map((group, groupIndex) => (
                    <div key={group.title}>
                        {groupIndex > 0 && (
                            <div
                                className={cn(
                                    "relative flex min-h-[32px] items-center justify-between px-3 py-2 text-xs font-medium uppercase tracking-wider transition-colors",
                                    collapsed
                                        ? "mx-auto w-11 cursor-default justify-center px-0 text-transparent"
                                        : "cursor-pointer text-muted-foreground hover:text-foreground",
                                )}
                                onClick={collapsed ? undefined : () => toggleGroup(group.title)}
                                title={collapsed ? group.title : undefined}
                            >
                                <span>{group.title}</span>
                                <ChevronLeft
                                    className={cn(
                                        "h-3 w-3 transition-transform duration-200",
                                        collapsed ? "opacity-0" : openGroups[group.title] ? "-rotate-90" : "rotate-0",
                                    )}
                                />
                                {collapsed && (
                                    <div className="pointer-events-none absolute inset-x-0 top-1/2 flex -translate-y-1/2 justify-center">
                                        <div className="h-px w-6 rounded-full bg-border/70" />
                                    </div>
                                )}
                            </div>
                        )}

                        {(groupIndex === 0 || openGroups[group.title] || collapsed) && (
                            <ul className="space-y-1">
                                {group.items
                                    .filter((item) => !item.roles || hasRole([...item.roles]))
                                    .map((item) => {
                                        const isActive =
                                            pathname === item.href ||
                                            (item.href !== "/" && pathname.startsWith(item.href));

                                        return (
                                            <li key={item.name}>
                                                <Link
                                                    href={item.href}
                                                    className={cn(
                                                        "sidebar-item relative min-h-[46px] rounded-lg border border-border/30",
                                                        isActive && "sidebar-item-active",
                                                        collapsed && "mx-auto w-11 justify-center px-0",
                                                    )}
                                                    title={collapsed ? item.name : undefined}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <item.icon
                                                            className={cn(
                                                                "h-5 w-5 shrink-0 transition-colors",
                                                                isActive ? "text-primary" : "text-muted-foreground",
                                                            )}
                                                        />
                                                        {!collapsed && <span>{item.name}</span>}
                                                    </div>

                                                    {item.badge !== undefined && item.badge > 0 && (
                                                        <div
                                                            className={cn(
                                                                "flex items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white shadow-sm ring-1 ring-background",
                                                                collapsed ? "absolute -top-1 -right-1 h-5 w-5" : "ml-auto h-5 px-1.5 min-w-[20px]",
                                                            )}
                                                        >
                                                            {item.badge}
                                                        </div>
                                                    )}
                                                </Link>
                                            </li>
                                        );
                                    })}
                            </ul>
                        )}
                    </div>
                ))}
            </nav>

            <div className="border-t border-border/40 py-4 px-3">
                <button
                    onClick={() => logout()}
                    className={cn(
                        "sidebar-item min-h-[46px] w-full text-destructive hover:bg-destructive/10 hover:text-destructive",
                        collapsed && "mx-auto w-11 justify-center px-0",
                    )}
                    title={collapsed ? "Выйти" : undefined}
                >
                    <LogOut className="h-5 w-5 shrink-0" />
                    {!collapsed && <span>Выйти</span>}
                </button>
            </div>
        </aside>
    );
}
