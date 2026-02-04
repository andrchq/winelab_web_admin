"use client";


import { Users, Plus, Shield, Mail, Phone, MoreHorizontal, AlertCircle, UserCheck, UserCog, Warehouse as WarehouseIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, StatCard } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useUsers } from "@/lib/hooks";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";

const roleConfig: Record<string, { label: string; variant: "destructive" | "accent" | "info" | "success" }> = {
    ADMIN: { label: "Администратор", variant: "destructive" },
    MANAGER: { label: "Руководство", variant: "accent" },
    WAREHOUSE: { label: "Кладовщик", variant: "info" },
    SUPPORT: { label: "Техподдержка", variant: "success" },
};

export default function UsersPage() {
    const { data: users, isLoading, error } = useUsers();
    const [search, setSearch] = useState("");

    // Compute stats
    const stats = useMemo(() => {
        const total = users.length;
        const active = users.filter(u => u.isActive).length;
        const admins = users.filter(u => u.role === 'ADMIN').length;
        const warehouse = users.filter(u => u.role === 'WAREHOUSE').length;
        return { total, active, admins, warehouse };
    }, [users]);

    // Filter users
    const filteredUsers = useMemo(() => {
        if (!search) return users;
        const s = search.toLowerCase();
        return users.filter(u =>
            u.name.toLowerCase().includes(s) ||
            u.email.toLowerCase().includes(s)
        );
    }, [users, search]);

    const getInitials = (name: string) => {
        return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
    };

    return (
        <ProtectedRoute requiredRoles={['ADMIN', 'MANAGER']}>
            <div className="p-6 h-full">
                <div className="space-y-6">
                    {/* Page Header */}
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div>
                            <h1 className="text-2xl font-bold">Пользователи</h1>
                            <p className="text-sm text-muted-foreground mt-1">Управление пользователями и ролями</p>
                        </div>
                        <Button variant="gradient" className="w-full sm:w-auto">
                            <Plus className="h-4 w-4 mr-2" />
                            Добавить пользователя
                        </Button>
                    </div>

                    {/* Stats */}
                    <div className="grid gap-4 md:grid-cols-4 animate-stagger">
                        <StatCard
                            title="Всего пользователей"
                            value={stats.total.toString()}
                            icon={<Users className="h-5 w-5" />}
                        />
                        <StatCard
                            title="Активные"
                            value={stats.active.toString()}
                            icon={<UserCheck className="h-5 w-5" />}
                            status="success"
                        />
                        <StatCard
                            title="Кладовщики"
                            value={stats.warehouse.toString()}
                            icon={<WarehouseIcon className="h-5 w-5" />}
                            status="default"
                        />
                        <StatCard
                            title="Администраторы"
                            value={stats.admins.toString()}
                            icon={<UserCog className="h-5 w-5" />}
                            status="accent"
                        />
                    </div>

                    {/* Search */}
                    <Card>
                        <CardContent className="p-4">
                            <div className="max-w-md">
                                <SearchInput
                                    placeholder="Поиск по имени или email..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Users Table */}
                    <Card variant="elevated">
                        <CardHeader className="pb-4">
                            <CardTitle className="flex items-center gap-2">
                                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                                    <Users className="h-4 w-4 text-primary" />
                                </div>
                                Список пользователей ({filteredUsers.length})
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {isLoading ? (
                                <div className="flex flex-col items-center justify-center py-12 gap-3">
                                    <div className="h-12 w-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
                                    <p className="text-muted-foreground">Загрузка пользователей...</p>
                                </div>
                            ) : error ? (
                                <div className="flex flex-col items-center justify-center py-12 gap-3">
                                    <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
                                        <AlertCircle className="h-6 w-6 text-destructive" />
                                    </div>
                                    <p className="text-destructive font-medium">Ошибка загрузки: {error}</p>
                                </div>
                            ) : filteredUsers.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 gap-3">
                                    <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                                        <Users className="h-6 w-6 text-muted-foreground" />
                                    </div>
                                    <p className="text-muted-foreground">{search ? "Ничего не найдено" : "Нет пользователей"}</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="data-table">
                                        <thead>
                                            <tr>
                                                <th>Пользователь</th>
                                                <th>Контакты</th>
                                                <th>Роль</th>
                                                <th>Статус</th>
                                                <th>Создан</th>
                                                <th></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredUsers.map((user, index) => {
                                                const role = roleConfig[user.role];
                                                return (
                                                    <tr
                                                        key={user.id}
                                                        className="animate-fade-in group"
                                                        style={{ animationDelay: `${index * 20}ms` }}
                                                    >
                                                        <td>
                                                            <div className="flex items-center gap-3">
                                                                <div className={cn(
                                                                    "flex h-10 w-10 items-center justify-center rounded-full font-medium text-sm",
                                                                    role?.variant === 'destructive' && "bg-destructive/10 text-destructive",
                                                                    role?.variant === 'accent' && "bg-accent/10 text-accent",
                                                                    role?.variant === 'info' && "bg-info/10 text-info",
                                                                    role?.variant === 'success' && "bg-success/10 text-success",
                                                                    !role && "bg-primary/10 text-primary"
                                                                )}>
                                                                    {getInitials(user.name)}
                                                                </div>
                                                                <span className="font-medium group-hover:text-primary transition-colors">{user.name}</span>
                                                            </div>
                                                        </td>
                                                        <td>
                                                            <div className="space-y-1">
                                                                <p className="text-sm flex items-center gap-1.5">
                                                                    <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                                                                    {user.email}
                                                                </p>
                                                                {user.phone && (
                                                                    <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                                                                        <Phone className="h-3.5 w-3.5" />
                                                                        {user.phone}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td>
                                                            <Badge variant={role?.variant || "secondary"}>
                                                                <Shield className="h-3 w-3" />
                                                                {role?.label || user.role}
                                                            </Badge>
                                                        </td>
                                                        <td>
                                                            <Badge variant={user.isActive ? "success" : "secondary"} dot>
                                                                {user.isActive ? "Активен" : "Неактивен"}
                                                            </Badge>
                                                        </td>
                                                        <td className="text-sm text-muted-foreground">
                                                            {new Date(user.createdAt).toLocaleDateString('ru-RU')}
                                                        </td>
                                                        <td>
                                                            <Button variant="ghost" size="icon-sm">
                                                                <MoreHorizontal className="h-4 w-4" />
                                                            </Button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

        </ProtectedRoute >
    );
}
