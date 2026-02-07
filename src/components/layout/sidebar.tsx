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
import { useDeliveries } from "@/lib/hooks";

export function Sidebar() {
    const pathname = usePathname();
    const { logout, hasRole } = useAuth();
    const { data: deliveries } = useDeliveries();

    // Calculate active/unprocessed deliveries count
    // Assuming 'CREATED' is considered "open" or "new" tasks for logistics
    // Adjust status filter as needed based on specific business logic for "unprocessed"
    const activeDeliveriesCount = deliveries?.filter(d => ['CREATED'].includes(d.status)).length || 0;

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
                { name: "Главная", href: "/", icon: LayoutDashboard },
                { name: "Магазины", href: "/stores", icon: Store },
            ]
        },
        {
            title: "Склад",
            items: [
                { name: "Перемещения", href: "/receiving", icon: ArrowDownToLine, roles: ['ADMIN', 'MANAGER', 'WAREHOUSE'] as const },
                // Catalog integrated into Inventory (Serial Numbers)
                { name: "Склады", href: "/warehouses", icon: Building2 },
                { name: "Инвентаризация", href: "/assets", icon: Boxes }, // Was "Серийники"
                { name: "Остатки", href: "/stock", icon: Warehouse },     // Was "Расходники"
            ]
        },
        {
            title: "Логистика",
            items: [
                {
                    name: "Заявки",
                    href: "/requests",
                    icon: ClipboardList,
                    badge: activeDeliveriesCount > 0 ? activeDeliveriesCount : undefined
                },
                // Deliveries integrated into Requests
                { name: "Отгрузка", href: "/shipments", icon: Truck },  // Was "Отгрузки"
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
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-purple-600 shadow-lg shadow-purple-500/25 transition-transform group-hover:scale-105">
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="3"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="h-6 w-6 text-white"
                            >
                                <path d="M4 4l6 16 2.5-7 2.5 7 6-16" />
                            </svg>
                        </div>
                        <span className="text-xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-violet-600 to-purple-600">WineLab</span>
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
                                                        "sidebar-item relative",
                                                        isActive && "sidebar-item-active",
                                                        collapsed && "justify-center px-2"
                                                    )}
                                                    title={collapsed ? item.name : undefined}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <item.icon className={cn(
                                                            "h-5 w-5 shrink-0 transition-colors",
                                                            isActive ? "text-primary" : "text-muted-foreground"
                                                        )} />
                                                        {!collapsed && <span>{item.name}</span>}
                                                    </div>

                                                    {/* Badge Counter */}
                                                    {item.badge !== undefined && item.badge > 0 && (
                                                        <div className={cn(
                                                            "flex items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white shadow-sm ring-1 ring-background",
                                                            collapsed ? "absolute -top-1 -right-1 h-5 w-5" : "ml-auto h-5 px-1.5 min-w-[20px]"
                                                        )}>
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

            {/* Bottom Actions */}
            <div className="border-t border-border/40 py-4 px-3">
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
