"use client";

import { Bell, Search, Moon, Sun, User, LogOut, ChevronDown, Settings } from "lucide-react";
import { SearchInput } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useTSDMode } from "@/contexts/TSDModeContext";

const roleLabels: Record<string, string> = {
    ADMIN: 'Администратор',
    MANAGER: 'Менеджер',
    WAREHOUSE: 'Склад',
    SUPPORT: 'Поддержка',
};

const roleColors: Record<string, string> = {
    ADMIN: 'bg-primary/10 text-primary',
    MANAGER: 'bg-info/10 text-info',
    WAREHOUSE: 'bg-warning/10 text-warning',
    SUPPORT: 'bg-accent/10 text-accent',
};

import { ScanBarcode } from "lucide-react";

export function Header() {
    const [isDark, setIsDark] = useState(true);
    const [showUserMenu, setShowUserMenu] = useState(false);
    const { user, logout, isAuthenticated } = useAuth();
    const router = useRouter();

    const toggleTheme = () => {
        setIsDark(!isDark);
        document.documentElement.classList.toggle("dark");
    };

    const handleLogout = async () => {
        await logout();
        router.push('/login');
    };

    const { isTSDMode, enableTSDMode } = useTSDMode();

    if (isTSDMode) return null;

    return (
        <header className="flex h-24 items-center justify-between border-b border-border/40 bg-card/80 backdrop-blur-sm px-8 relative z-50">
            {/* Left/Search Section */}
            <div className="flex flex-1 items-center gap-4 max-w-2xl">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={enableTSDMode}
                    className="h-12 w-12 shrink-0 border border-border/50 hover:bg-muted"
                    title="Перейти в режим ТСД"
                >
                    <ScanBarcode className="h-6 w-6" />
                </Button>
                {/* Search */}
                <div className="relative w-full">
                    <SearchInput
                        placeholder="Поиск по SN, магазину, заявке..."
                        className="bg-muted/50 border-0 focus-visible:ring-1 h-12 text-lg"
                    />
                </div>
            </div>

            {/* Right Section */}
            <div className="flex items-center gap-2">
                {/* Theme Toggle */}
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggleTheme}
                    className="text-muted-foreground hover:text-foreground h-12 w-12"
                >
                    {isDark ? <Sun className="h-6 w-6" /> : <Moon className="h-6 w-6" />}
                </Button>

                {/* Notifications */}
                <Button
                    variant="ghost"
                    size="icon"
                    className="relative text-muted-foreground hover:text-foreground h-12 w-12"
                    onClick={() => router.push('/notifications')}
                >
                    <Bell className="h-6 w-6" />
                    <span className="absolute right-3 top-3 flex h-2.5 w-2.5">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75"></span>
                        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary"></span>
                    </span>
                </Button>

                {/* User Menu */}
                {isAuthenticated && user ? (
                    <div className="relative ml-4">
                        <button
                            onClick={() => setShowUserMenu(!showUserMenu)}
                            className={cn(
                                "flex items-center gap-4 rounded-xl px-4 py-2 transition-colors",
                                showUserMenu ? "bg-muted" : "hover:bg-muted/50"
                            )}
                        >
                            {/* Avatar */}
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent text-white font-bold text-lg">
                                {user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                            </div>
                            {/* User Info */}
                            <div className="hidden text-left md:block">
                                <p className="text-lg font-bold text-foreground leading-none mb-1.5">{user.name}</p>
                                <p className={cn(
                                    "text-xs px-2 py-0.5 rounded-md inline-block font-medium uppercase tracking-wide",
                                    roleColors[user.role] || "bg-muted text-muted-foreground"
                                )}>
                                    {roleLabels[user.role] || user.role}
                                </p>
                            </div>
                            <ChevronDown className={cn(
                                "h-5 w-5 text-muted-foreground transition-transform duration-200 hidden md:block",
                                showUserMenu && "rotate-180"
                            )} />
                        </button>

                        {/* Dropdown menu */}
                        {showUserMenu && (
                            <>
                                <div
                                    className="fixed inset-0 z-[90]"
                                    onClick={() => setShowUserMenu(false)}
                                />
                                <div className="absolute right-0 top-full mt-3 w-80 bg-card border border-border/50 rounded-2xl shadow-xl z-[100] overflow-hidden animate-scale-in origin-top-right">
                                    {/* User Header */}
                                    <div className="p-5 border-b border-border/50 bg-muted/30">
                                        <div className="flex items-center gap-4">
                                            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent text-white font-bold text-xl">
                                                {user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-lg font-bold text-foreground truncate">{user.name}</p>
                                                <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                                            </div>
                                        </div>
                                    </div>
                                    {/* Menu Items */}
                                    <div className="p-3">
                                        <button
                                            onClick={() => {
                                                setShowUserMenu(false);
                                                router.push('/settings');
                                            }}
                                            className="w-full flex items-center gap-4 px-4 py-3 text-base text-foreground hover:bg-muted rounded-xl transition-colors"
                                        >
                                            <Settings className="h-5 w-5 text-muted-foreground" />
                                            Настройки
                                        </button>
                                        <div className="my-2 h-px bg-border/50" />
                                        <button
                                            onClick={handleLogout}
                                            className="w-full flex items-center gap-4 px-4 py-3 text-base text-destructive hover:bg-destructive/10 rounded-xl transition-colors"
                                        >
                                            <LogOut className="h-5 w-5" />
                                            Выйти
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                ) : (
                    <Button
                        variant="soft"
                        className="ml-4 h-12 px-6 text-lg"
                        onClick={() => router.push('/login')}
                    >
                        Войти
                    </Button>
                )}
            </div>
        </header>
    );
}
