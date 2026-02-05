"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
    LayoutDashboard,
    Package,
    Boxes,
    Warehouse,
    ClipboardList,
    Truck,
    MapPin,
    Store,
    Users,
    Settings,
    BarChart3,
    Bell,
    ChevronLeft,
    Menu,
    LogOut,
    ArrowDownToLine,
    Building2,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTSDMode } from "@/contexts/TSDModeContext";

const mainNavigation = [
    { name: "Дашборд", href: "/", icon: LayoutDashboard },
    { name: "Каталог", href: "/catalog", icon: Package },
    { name: "Серийники", href: "/assets", icon: Boxes },
    { name: "Расходники", href: "/stock", icon: Warehouse },
    { name: "Заявки", href: "/requests", icon: ClipboardList },
    { name: "Отгрузки", href: "/shipments", icon: Truck },
    { name: "Доставки", href: "/deliveries", icon: MapPin },
    { name: "Магазины", href: "/stores", icon: Store },
];

const bottomNavigation = [
    { name: "Аналитика", href: "/analytics", icon: BarChart3 },
    { name: "Пользователи", href: "/users", icon: Users },
    { name: "Уведомления", href: "/notifications", icon: Bell },
    { name: "Настройки", href: "/settings", icon: Settings },
];

export function Sidebar() {
    const pathname = usePathname();
    const { logout, hasRole } = useAuth();

    // Initialize state from localStorage if available, otherwise default to false
    const [collapsed, setCollapsed] = useState(false);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        // Use setTimeout to avoid synchronous setState inside effect in React 19
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
        const newState = !collapsed;
        setCollapsed(newState);
        localStorage.setItem("sidebarCollapsed", String(newState));
    };

    // Default open states for groups
    const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
        "Склад": true,
        "Логистика": true,
        "Система": true
    });

    const toggleGroup = (groupName: string) => {
        setOpenGroups(prev => ({ ...prev, [groupName]: !prev[groupName] }));
    };

    const navGroups = [
        {
            title: "Основное", // Implicit group, no header needed if logical
            items: [
                { name: "Дашборд", href: "/", icon: LayoutDashboard },
                { name: "Магазины", href: "/stores", icon: Store },
            ]
        },
        {
            title: "Склад",
            items: [
                { name: "Приемка", href: "/receiving", icon: ArrowDownToLine, roles: ['ADMIN', 'MANAGER', 'WAREHOUSE'] as const },
                { name: "Каталог", href: "/catalog", icon: Package },
                { name: "Склады", href: "/warehouses", icon: Building2 },
                { name: "Серийники", href: "/assets", icon: Boxes },
                { name: "Расходники", href: "/stock", icon: Warehouse },
            ]
        },
        {
            title: "Логистика",
            items: [
                { name: "Заявки", href: "/requests", icon: ClipboardList },
                { name: "Отгрузки", href: "/shipments", icon: Truck },
                { name: "Доставки", href: "/deliveries", icon: MapPin },
            ]
        },
        {
            title: "Система",
            items: [
                { name: "Аналитика", href: "/analytics", icon: BarChart3 },
                { name: "Пользователи", href: "/users", icon: Users },
                { name: "Настройки", href: "/settings", icon: Settings },
            ]
        }
    ];

    const { isTSDMode } = useTSDMode();

    if (isTSDMode) return null;

    return (
        <aside
            className={cn(
                "flex h-screen flex-col bg-card border-r border-border/40 transition-all duration-300 ease-in-out",
                collapsed ? "w-[72px]" : "w-64",
                // Prevent transition on initial mount to avoid animation
                !isMounted && "transition-none"
            )}
        >
            {/* Logo Section */}
            <div className={cn(
                "flex h-24 items-center border-b border-border/40",
                collapsed ? "justify-center px-2" : "justify-between px-4"
            )}>
                {!collapsed && (
                    <Link href="/" className="flex items-center gap-3 group">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl gradient-primary shadow-lg shadow-primary/25 transition-transform group-hover:scale-105">
                            <Warehouse className="h-6 w-6 text-white" />
                        </div>
                        <span className="text-xl font-extrabold text-gradient">WineLab</span>
                    </Link>
                )}
                <button
                    onClick={toggleCollapsed}
                    className={cn(
                        "flex h-12 w-12 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-200 border border-border/50",
                        collapsed && "mx-auto"
                    )}
                >
                    {collapsed ? (
                        <Menu className="h-6 w-6" />
                    ) : (
                        <ChevronLeft className="h-6 w-6" />
                    )}
                </button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-4">
                {navGroups.map((group, groupIndex) => (
                    <div key={group.title}>
                        {!collapsed && group.title !== "Основное" && (
                            <div
                                className="flex items-center justify-between px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground transition-colors"
                                onClick={() => toggleGroup(group.title)}
                            >
                                {group.title}
                                <ChevronLeft className={cn(
                                    "h-3 w-3 transition-transform duration-200",
                                    openGroups[group.title] ? "-rotate-90" : "rotate-0"
                                )} />
                            </div>
                        )}

                        {/* Always show "Основное" items, or if group is open */}
                        {(group.title === "Основное" || openGroups[group.title] || collapsed) && (
                            <ul className="space-y-1">
                                {group.items
                                    .filter((item) => !item.roles || hasRole(item.roles as any))
                                    .map((item) => {
                                        const isActive = pathname === item.href ||
                                            (item.href !== "/" && pathname.startsWith(item.href));

                                        return (
                                            <li key={item.name}>
                                                <Link
                                                    href={item.href}
                                                    className={cn(
                                                        "sidebar-item",
                                                        isActive && "sidebar-item-active",
                                                        collapsed && "justify-center px-2"
                                                    )}
                                                    title={collapsed ? item.name : undefined}
                                                >
                                                    <item.icon className={cn(
                                                        "h-5 w-5 shrink-0 transition-colors",
                                                        isActive ? "text-primary" : "text-muted-foreground"
                                                    )} />
                                                    {!collapsed && <span>{item.name}</span>}
                                                </Link>
                                            </li>
                                        );
                                    })}
                            </ul>
                        )}
                    </div>
                ))}
            </nav>

            {/* Bottom Actions */}
            <div className="border-t border-border/40 py-4 px-3">
                {/* Notifications - simplified, moved to System or can stay here if desired, removing from list above? 
                     User asked for "fewer links", let's keep Notifications here as action or in header. 
                     Mockup shows Bell in sidebar top usually or Header. It was in bottomNavigation.
                     I removed it from "Система" group to reduce links, usually it's in Header.
                     Sidebar has Settings/Logout. */}

                <button
                    onClick={() => logout()}
                    className={cn(
                        "sidebar-item w-full text-destructive hover:bg-destructive/10 hover:text-destructive",
                        collapsed && "justify-center px-2"
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
