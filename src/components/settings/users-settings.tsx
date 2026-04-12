"use client";

import { useMemo, useState } from "react";
import {
    AlertCircle,
    Mail,
    MoreHorizontal,
    Pencil,
    Phone,
    Plus,
    Shield,
    Trash2,
    Users,
} from "lucide-react";

import { UserDialog } from "@/components/users/user-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { SearchInput } from "@/components/ui/input";
import { api } from "@/lib/api";
import { useUsers } from "@/lib/hooks";
import type { User } from "@/types/api";

const ROLE_CONFIG: Record<string, { label: string; variant: "destructive" | "accent" | "info" | "success" }> = {
    ADMIN: { label: "\u0410\u0434\u043c\u0438\u043d\u0438\u0441\u0442\u0440\u0430\u0442\u043e\u0440", variant: "destructive" },
    MANAGER: { label: "\u0420\u0443\u043a\u043e\u0432\u043e\u0434\u0441\u0442\u0432\u043e", variant: "accent" },
    WAREHOUSE: { label: "\u0421\u043a\u043b\u0430\u0434", variant: "info" },
    SUPPORT: { label: "\u0422\u0435\u0445\u043f\u043e\u0434\u0434\u0435\u0440\u0436\u043a\u0430", variant: "success" },
    USER: { label: "\u041f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u044c", variant: "info" },
};

const TEXT = {
    title: "\u041f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u0438 \u0438 \u0434\u043e\u0441\u0442\u0443\u043f",
    description: "\u0417\u0434\u0435\u0441\u044c \u043d\u0430\u0441\u0442\u0440\u0430\u0438\u0432\u0430\u044e\u0442\u0441\u044f \u0443\u0447\u0435\u0442\u043d\u044b\u0435 \u0437\u0430\u043f\u0438\u0441\u0438, \u0440\u043e\u043b\u0438 \u0438 \u0441\u0442\u0430\u0442\u0443\u0441 \u0434\u043e\u0441\u0442\u0443\u043f\u0430.",
    searchPlaceholder: "\u041f\u043e\u0438\u0441\u043a \u043f\u043e \u0438\u043c\u0435\u043d\u0438 \u0438\u043b\u0438 email...",
    addUser: "\u0414\u043e\u0431\u0430\u0432\u0438\u0442\u044c \u043f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u044f",
    total: "\u0412\u0441\u0435\u0433\u043e",
    active: "\u0410\u043a\u0442\u0438\u0432\u043d\u044b\u0435",
    admins: "\u0410\u0434\u043c\u0438\u043d\u044b",
    warehouse: "\u0421\u043a\u043b\u0430\u0434",
    tableUser: "\u041f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u044c",
    tableContacts: "\u041a\u043e\u043d\u0442\u0430\u043a\u0442\u044b",
    tableRole: "\u0420\u043e\u043b\u044c",
    tableStatus: "\u0421\u0442\u0430\u0442\u0443\u0441",
    tableCreated: "\u0421\u043e\u0437\u0434\u0430\u043d",
    loading: "\u0417\u0430\u0433\u0440\u0443\u0437\u043a\u0430 \u043f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u0435\u0439...",
    empty: "\u041d\u0435\u0442 \u043f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u0435\u0439",
    emptySearch: "\u041f\u043e \u0437\u0430\u043f\u0440\u043e\u0441\u0443 \u043d\u0438\u0447\u0435\u0433\u043e \u043d\u0435 \u043d\u0430\u0439\u0434\u0435\u043d\u043e",
    loadError: "\u041e\u0448\u0438\u0431\u043a\u0430 \u0437\u0430\u0433\u0440\u0443\u0437\u043a\u0438",
    activeLabel: "\u0410\u043a\u0442\u0438\u0432\u0435\u043d",
    inactiveLabel: "\u041d\u0435\u0430\u043a\u0442\u0438\u0432\u0435\u043d",
    edit: "\u0420\u0435\u0434\u0430\u043a\u0442\u0438\u0440\u043e\u0432\u0430\u0442\u044c",
    delete: "\u0423\u0434\u0430\u043b\u0438\u0442\u044c",
    confirmDelete: "\u0423\u0434\u0430\u043b\u0438\u0442\u044c \u043f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u044f?",
    saveError: "\u041e\u0448\u0438\u0431\u043a\u0430 \u043f\u0440\u0438 \u0441\u043e\u0445\u0440\u0430\u043d\u0435\u043d\u0438\u0438 \u043f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u044f",
    deleteError: "\u041e\u0448\u0438\u0431\u043a\u0430 \u043f\u0440\u0438 \u0443\u0434\u0430\u043b\u0435\u043d\u0438\u0438 \u043f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u044f",
};

export function UsersSettings() {
    const { data: users, isLoading, error, refetch } = useUsers();
    const [search, setSearch] = useState("");
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);

    const stats = useMemo(() => {
        const getRoleName = (user: User) => {
            if (!user.role) {
                return null;
            }
            return typeof user.role === "object" ? user.role.name : user.role;
        };

        return {
            total: users.length,
            active: users.filter((user) => user.isActive).length,
            admins: users.filter((user) => getRoleName(user) === "ADMIN").length,
            warehouse: users.filter((user) => getRoleName(user) === "WAREHOUSE").length,
        };
    }, [users]);

    const filteredUsers = useMemo(() => {
        if (!search) {
            return users;
        }

        const normalizedSearch = search.toLowerCase();
        return users.filter((user) =>
            user.name.toLowerCase().includes(normalizedSearch) ||
            user.email.toLowerCase().includes(normalizedSearch),
        );
    }, [search, users]);

    const handleCreate = () => {
        setSelectedUser(null);
        setIsDialogOpen(true);
    };

    const handleEdit = (user: User) => {
        setSelectedUser(user);
        setIsDialogOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm(TEXT.confirmDelete)) {
            return;
        }

        try {
            await api.delete(`/users/${id}`);
            await refetch();
        } catch (deleteError) {
            console.error("Failed to delete user", deleteError);
            alert(TEXT.deleteError);
        }
    };

    const handleSave = async (data: {
        name: string;
        email: string;
        password?: string;
        phone?: string;
        roleId: string;
        isActive: boolean;
    }) => {
        const normalizedPayload = {
            name: data.name,
            email: data.email,
            phone: data.phone?.trim() || undefined,
            password: data.password?.trim() || undefined,
            roleId: data.roleId || undefined,
            isActive: data.isActive,
        };

        try {
            if (selectedUser) {
                await api.patch(`/users/${selectedUser.id}`, normalizedPayload);
            } else {
                await api.post("/users", {
                    name: normalizedPayload.name,
                    email: normalizedPayload.email,
                    phone: normalizedPayload.phone,
                    password: normalizedPayload.password,
                    roleId: normalizedPayload.roleId,
                });
            }

            await refetch();
        } catch (saveError) {
            console.error("Failed to save user", saveError);
            alert(TEXT.saveError);
            throw saveError;
        }
    };

    return (
        <Card variant="elevated">
            <CardHeader className="pb-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                                <Shield className="h-4 w-4 text-primary" />
                            </div>
                            {TEXT.title}
                        </CardTitle>
                        <CardDescription className="mt-2">{TEXT.description}</CardDescription>
                    </div>
                    <Button variant="gradient" className="w-full sm:w-auto" onClick={handleCreate}>
                        <Plus className="h-4 w-4" />
                        {TEXT.addUser}
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">{TEXT.total}: {stats.total}</Badge>
                    <Badge variant="success">{TEXT.active}: {stats.active}</Badge>
                    <Badge variant="destructive">{TEXT.admins}: {stats.admins}</Badge>
                    <Badge variant="info">{TEXT.warehouse}: {stats.warehouse}</Badge>
                </div>

                <div className="max-w-md">
                    <SearchInput
                        placeholder={TEXT.searchPlaceholder}
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                    />
                </div>

                {isLoading ? (
                    <div className="flex flex-col items-center justify-center gap-3 py-12">
                        <div className="h-12 w-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
                        <p className="text-sm text-muted-foreground">{TEXT.loading}</p>
                    </div>
                ) : error ? (
                    <div className="flex flex-col items-center justify-center gap-3 py-12">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                            <AlertCircle className="h-6 w-6 text-destructive" />
                        </div>
                        <p className="font-medium text-destructive">{TEXT.loadError}: {error}</p>
                    </div>
                ) : filteredUsers.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-3 py-12">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                            <Users className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <p className="text-muted-foreground">{search ? TEXT.emptySearch : TEXT.empty}</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>{TEXT.tableUser}</th>
                                    <th>{TEXT.tableContacts}</th>
                                    <th>{TEXT.tableRole}</th>
                                    <th>{TEXT.tableStatus}</th>
                                    <th>{TEXT.tableCreated}</th>
                                    <th className="w-[56px]" />
                                </tr>
                            </thead>
                            <tbody>
                                {filteredUsers.map((user) => {
                                    const roleName = user.role && typeof user.role === "object" ? user.role.name : user.role;
                                    const role = roleName ? ROLE_CONFIG[roleName] : null;

                                    return (
                                        <tr key={user.id}>
                                            <td className="font-medium">{user.name}</td>
                                            <td>
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-1.5 text-sm">
                                                        <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                                                        {user.email}
                                                    </div>
                                                    {user.phone && (
                                                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                                            <Phone className="h-3.5 w-3.5" />
                                                            {user.phone}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td>
                                                <Badge variant={role?.variant || "secondary"}>
                                                    {role?.label || roleName || "-"}
                                                </Badge>
                                            </td>
                                            <td>
                                                <Badge variant={user.isActive ? "success" : "secondary"} dot>
                                                    {user.isActive ? TEXT.activeLabel : TEXT.inactiveLabel}
                                                </Badge>
                                            </td>
                                            <td className="text-sm text-muted-foreground">
                                                {new Date(user.createdAt).toLocaleDateString("ru-RU")}
                                            </td>
                                            <td>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon-sm">
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onClick={() => handleEdit(user)}>
                                                            <Pencil className="mr-2 h-4 w-4" />
                                                            {TEXT.edit}
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(user.id)}>
                                                            <Trash2 className="mr-2 h-4 w-4" />
                                                            {TEXT.delete}
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </CardContent>

            <UserDialog
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                user={selectedUser}
                onSave={handleSave}
            />
        </Card>
    );
}
