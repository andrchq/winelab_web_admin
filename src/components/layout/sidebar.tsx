
'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
    LayoutDashboard,
    Package,
    ClipboardList,
    Truck,
    Store,
    Users,
    Settings,
    Bell,
    ChevronLeft,
    Menu,
    Warehouse,
    BarChart3,
    FileText,
    History
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface SidebarProps {
    collapsed: boolean;
    setCollapsed: (collapsed: boolean) => void;
}

const navGroups = [
    {
        name: 'Основное',
        items: [
            { name: 'Дашборд', href: '/', icon: LayoutDashboard },
            { name: 'Склад', href: '/stock', icon: Package },
            { name: 'Приемка', href: '/receiving', icon: ClipboardList, badge: 3 },
            { name: 'Отгрузка', href: '/shipments', icon: Truck },
        ]
    },
    {
        name: 'Управление',
        items: [
            { name: 'Магазины', href: '/stores', icon: Store },
            { name: 'Каталог', href: '/catalog', icon: FileText },
            { name: 'Заявки', href: '/requests', icon: Bell, badge: 5 },
        ]
    },
    {
        name: 'Администрирование',
        items: [
            { name: 'Пользователи', href: '/users', icon: Users, roles: ['ADMIN'] as const },
            { name: 'Аналитика', href: '/analytics', icon: BarChart3, roles: ['ADMIN', 'MANAGER'] as const },
            { name: 'Настройки', href: '/settings', icon: Settings },
        ]
    }
];

export function Sidebar({ collapsed, setCollapsed }: SidebarProps) {
    const pathname = usePathname();
    const { user } = useAuth();

    const toggleCollapsed = () => setCollapsed(!collapsed);

    return (
        <aside
            className={cn(
                "fixed left-0 top-0 z-40 h-screen transition-all duration-300 ease-in-out border-r border-border/40 bg-card/50 backdrop-blur-xl",
                collapsed ? "w-20" : "w-72"
            )}
        >
            {/* Logo Section */}
            <div className={cn(
                "flex h-20 items-center border-b border-border/40 transition-all",
                collapsed ? "justify-center px-2" : "justify-between px-6"
            )}>
                <Link href="/" className="flex items-center gap-3">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-violet-600 shadow-lg shadow-violet-500/30">
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
                    {!collapsed && (
                        <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-violet-400 to-purple-600">
                            WineLab
                        </span>
                    )}
                </Link>

                <button
                    onClick={toggleCollapsed}
                    className={cn(
                        "p-2 rounded-lg hover:bg-muted text-muted-foreground transition-colors",
                        collapsed && "hidden" // Скрываем нативную кнопку внутри, если свернуто (бургер будет ниже?) 
                    )}
                >
                    <ChevronLeft className={cn("h-5 w-5 transition-transform", collapsed && "rotate-180")} />
                </button>

                {collapsed && (
                    <button
                        onClick={toggleCollapsed}
                        className="absolute -right-3 top-7 h-6 w-6 rounded-full bg-primary flex items-center justify-center text-white shadow-lg border border-border"
                    >
                        <Menu className="h-3 w-3" />
                    </button>
                )}
            </div>

            {/* Navigation */}
            <div className="h-[calc(100vh-5rem)] overflow-y-auto overflow-x-hidden py-6 custom-scrollbar">
                {navGroups.map((group, idx) => {
                    const filteredItems = group.items.filter(item =>
                        !('roles' in item) || (user && (item.roles as any).includes(user.role))
                    );

                    if (filteredItems.length === 0) return null;

                    return (
                        <div key={group.name} className={cn("mb-8", collapsed ? "px-2" : "px-4")}>
                            {!collapsed && (
                                <h3 className="mb-4 px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground/50">
                                    {group.name}
                                </h3>
                            )}
                            <div className="space-y-1">
                                {filteredItems.map((item) => {
                                    const isActive = pathname === item.href;
                                    const Icon = item.icon;

                                    return (
                                        <Link
                                            key={item.href}
                                            href={item.href}
                                            className={cn(
                                                "sidebar-item group relative",
                                                isActive ? "sidebar-item-active" : "text-muted-foreground hover:text-foreground"
                                            )}
                                        >
                                            <Icon className={cn(
                                                "h-5 w-5 transition-colors",
                                                isActive ? "text-white" : "group-hover:text-primary"
                                            )} />
                                            {!collapsed && (
                                                <span className="ml-3 font-medium transition-opacity duration-200">
                                                    {item.name}
                                                </span>
                                            )}
                                            {!collapsed && 'badge' in item && (item as any).badge > 0 && (
                                                <span className="ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary/20 px-1.5 text-[10px] font-bold text-primary">
                                                    {(item as any).badge}
                                                </span>
                                            )}
                                            {collapsed && isActive && (
                                                <div className="absolute left-0 h-8 w-1 rounded-r-full bg-primary shadow-[0_0_10px_rgb(var(--primary))]" />
                                            )}
                                        </Link>
                                    );
                                })}
                            </div>
                            {idx < navGroups.length - 1 && !collapsed && (
                                <div className="mt-8 h-px bg-gradient-to-r from-transparent via-border/40 to-transparent" />
                            )}
                        </div>
                    );
                })}
            </div>
        </aside>
    );
}
