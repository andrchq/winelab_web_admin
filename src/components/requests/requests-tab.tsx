"use client";

import {
    ClipboardList,
    Plus,
    Filter,
    MessageSquare,
    Clock,
    User,
    AlertCircle,
    CheckCircle2,
    Timer,
    FileText,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { useAuth } from "@/contexts/AuthContext";
import { useRequests } from "@/lib/hooks";
import { SystemPermission } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import { CreateRequestDialog } from "@/components/requests/create-request-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, StatCard } from "@/components/ui/card";
import { SearchInput } from "@/components/ui/input";

const statusMap: Record<string, { label: string; variant: "default" | "success" | "warning" | "destructive" | "secondary" }> = {
    NEW: { label: "Новая", variant: "default" },
    IN_PROGRESS: { label: "В работе", variant: "warning" },
    READY: { label: "Готова", variant: "secondary" },
    SHIPPED: { label: "Отгружена", variant: "secondary" },
    COMPLETED: { label: "Завершена", variant: "success" },
    CANCELLED: { label: "Отменена", variant: "destructive" },
};

const priorityMap: Record<string, { label: string; color: string }> = {
    CRITICAL: { label: "Критичный", color: "bg-destructive" },
    HIGH: { label: "Высокий", color: "bg-warning" },
    MEDIUM: { label: "Средний", color: "bg-info" },
    LOW: { label: "Низкий", color: "bg-muted-foreground" },
};

export function RequestsTab() {
    const { data: requests, isLoading, error } = useRequests();
    const { hasPermission } = useAuth();
    const [search, setSearch] = useState("");
    const [createDialogOpen, setCreateDialogOpen] = useState(false);

    const canCreateRequest = hasPermission([SystemPermission.REQUEST_CREATE]);

    const stats = useMemo(() => {
        const newCount = requests.filter((request) => request.status === "NEW").length;
        const inProgress = requests.filter((request) => request.status === "IN_PROGRESS").length;
        const ready = requests.filter((request) => ["READY", "SHIPPED"].includes(request.status)).length;
        const completed = requests.filter((request) => request.status === "COMPLETED").length;
        return { newCount, inProgress, ready, completed };
    }, [requests]);

    const filteredRequests = useMemo(() => {
        if (!search.trim()) {
            return requests;
        }

        const normalizedSearch = search.trim().toLowerCase();
        return requests.filter((request) =>
            request.id.toLowerCase().includes(normalizedSearch) ||
            request.title.toLowerCase().includes(normalizedSearch) ||
            request.store?.name?.toLowerCase().includes(normalizedSearch),
        );
    }, [requests, search]);

    const formatDate = (dateStr: string) =>
        new Date(dateStr).toLocaleDateString("ru-RU", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h2 className="text-lg font-semibold">Заявки на оборудование</h2>
                    <p className="text-sm text-muted-foreground">Управление внутренними заявками</p>
                </div>
                {canCreateRequest && (
                    <Button
                        variant="gradient"
                        className="w-full sm:w-auto"
                        onClick={() => setCreateDialogOpen(true)}
                    >
                        <Plus className="mr-2 h-4 w-4" />
                        Новая заявка
                    </Button>
                )}
            </div>

            <div className="grid gap-4 md:grid-cols-4 animate-stagger">
                <StatCard
                    title="Новые"
                    value={stats.newCount.toString()}
                    icon={<FileText className="h-5 w-5" />}
                    status="default"
                />
                <StatCard
                    title="В работе"
                    value={stats.inProgress.toString()}
                    icon={<Timer className="h-5 w-5" />}
                    status="warning"
                />
                <StatCard
                    title="Готово к выдаче"
                    value={stats.ready.toString()}
                    icon={<Clock className="h-5 w-5" />}
                    status="accent"
                />
                <StatCard
                    title="Завершено"
                    value={stats.completed.toString()}
                    icon={<CheckCircle2 className="h-5 w-5" />}
                    status="success"
                />
            </div>

            <Card>
                <CardContent className="p-4">
                    <div className="flex flex-wrap items-center gap-4">
                        <div className="min-w-[200px] max-w-md flex-1">
                            <SearchInput
                                placeholder="Поиск по номеру, названию или магазину..."
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                            />
                        </div>
                        <Button variant="outline" size="sm" onClick={() => toast.info("Фильтры будут вынесены отдельным этапом")}>
                            <Filter className="h-4 w-4" />
                            Фильтры
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <Card variant="elevated">
                <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                            <ClipboardList className="h-4 w-4 text-primary" />
                        </div>
                        Список заявок ({filteredRequests.length})
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center gap-3 py-12">
                            <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
                            <p className="text-muted-foreground">Загрузка заявок...</p>
                        </div>
                    ) : error ? (
                        <div className="flex flex-col items-center justify-center gap-3 py-12">
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                                <AlertCircle className="h-6 w-6 text-destructive" />
                            </div>
                            <p className="font-medium text-destructive">Ошибка загрузки: {error}</p>
                        </div>
                    ) : filteredRequests.length === 0 ? (
                        <div className="flex flex-col items-center justify-center gap-3 py-12">
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                                <ClipboardList className="h-6 w-6 text-muted-foreground" />
                            </div>
                            <p className="text-muted-foreground">{search ? "Ничего не найдено" : "Нет заявок"}</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {filteredRequests.map((request, index) => (
                                <Link key={request.id} href={`/requests/${request.id}`}>
                                    <div
                                        className={cn(
                                            "group cursor-pointer rounded-xl border border-border/50 p-4 transition-all hover:border-primary/30 hover:bg-muted/50 animate-fade-in",
                                            "flex items-center justify-between",
                                        )}
                                        style={{ animationDelay: `${index * 30}ms` }}
                                    >
                                        <div className="flex items-start gap-4">
                                            <div
                                                className={cn(
                                                    "h-14 w-1.5 shrink-0 rounded-full",
                                                    priorityMap[request.priority]?.color || "bg-muted-foreground",
                                                )}
                                            />
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <code className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                                                        {request.id.slice(0, 8)}
                                                    </code>
                                                    <Badge variant={statusMap[request.status]?.variant || "secondary"} dot size="sm">
                                                        {statusMap[request.status]?.label || request.status}
                                                    </Badge>
                                                </div>
                                                <p className="mt-1.5 font-medium transition-colors group-hover:text-primary">{request.title}</p>
                                                <p className="text-sm text-muted-foreground">{request.store?.name}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-6 text-sm text-muted-foreground">
                                            <div className="flex items-center gap-1.5">
                                                <User className="h-4 w-4" />
                                                <span className="hidden sm:inline">{request.creator?.name || "Неизвестно"}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <MessageSquare className="h-4 w-4" />
                                                <span>{request._count?.comments || 0}</span>
                                            </div>
                                            <div className="hidden items-center gap-1.5 md:flex">
                                                <Clock className="h-4 w-4" />
                                                <span>{formatDate(request.createdAt)}</span>
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            <CreateRequestDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} />
        </div>
    );
}
