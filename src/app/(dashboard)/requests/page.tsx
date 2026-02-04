"use client";


import { ClipboardList, Plus, Filter, MessageSquare, Clock, User, Loader2, AlertCircle, CheckCircle2, Timer, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, StatCard } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useRequests } from "@/lib/hooks";

import Link from "next/link";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";

const statusMap: Record<string, { label: string; variant: "default" | "success" | "warning" | "destructive" | "secondary" }> = {
    NEW: { label: "Новая", variant: "default" },
    IN_PROGRESS: { label: "В работе", variant: "warning" },
    PENDING: { label: "Ожидает", variant: "secondary" },
    APPROVED: { label: "Одобрена", variant: "success" },
    REJECTED: { label: "Отклонена", variant: "destructive" },
    COMPLETED: { label: "Выполнена", variant: "success" },
};

const priorityMap: Record<string, { label: string; color: string }> = {
    URGENT: { label: "Срочный", color: "bg-destructive" },
    HIGH: { label: "Высокий", color: "bg-warning" },
    MEDIUM: { label: "Средний", color: "bg-info" },
    LOW: { label: "Низкий", color: "bg-muted-foreground" },
};

export default function RequestsPage() {
    const { data: requests, isLoading, error } = useRequests();
    const [search, setSearch] = useState("");

    // Compute stats
    const stats = useMemo(() => {
        const newCount = requests.filter(r => r.status === 'NEW').length;
        const inProgress = requests.filter(r => r.status === 'IN_PROGRESS').length;
        const pending = requests.filter(r => r.status === 'PENDING').length;
        const completed = requests.filter(r => r.status === 'COMPLETED').length;
        return { newCount, inProgress, pending, completed };
    }, [requests]);

    // Filter requests
    const filteredRequests = useMemo(() => {
        if (!search) return requests;
        const s = search.toLowerCase();
        return requests.filter(r =>
            r.id.toLowerCase().includes(s) ||
            r.title.toLowerCase().includes(s) ||
            r.store?.name?.toLowerCase().includes(s)
        );
    }, [requests, search]);

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="p-6 h-full">
            <div className="space-y-6">
                {/* Page Header */}
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">Заявки</h1>
                        <p className="text-sm text-muted-foreground mt-1">Управление заявками на оборудование</p>
                    </div>
                    <Button variant="gradient" className="w-full sm:w-auto">
                        <Plus className="h-4 w-4 mr-2" />
                        Новая заявка
                    </Button>
                </div>

                {/* Stats */}
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
                        title="Ожидает"
                        value={stats.pending.toString()}
                        icon={<Clock className="h-5 w-5" />}
                        status="accent"
                    />
                    <StatCard
                        title="Выполнено"
                        value={stats.completed.toString()}
                        icon={<CheckCircle2 className="h-5 w-5" />}
                        status="success"
                    />
                </div>

                {/* Filters */}
                <Card>
                    <CardContent className="p-4">
                        <div className="flex flex-wrap gap-4 items-center">
                            <div className="flex-1 min-w-[200px] max-w-md">
                                <SearchInput
                                    placeholder="Поиск по номеру или магазину..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                            </div>
                            <Button variant="outline" size="sm">
                                <Filter className="h-4 w-4" />
                                Фильтры
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Requests List */}
                <Card variant="elevated">
                    <CardHeader className="pb-4">
                        <CardTitle className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                                <ClipboardList className="h-4 w-4 text-primary" />
                            </div>
                            Список заявок ({filteredRequests.length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center py-12 gap-3">
                                <div className="h-12 w-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
                                <p className="text-muted-foreground">Загрузка заявок...</p>
                            </div>
                        ) : error ? (
                            <div className="flex flex-col items-center justify-center py-12 gap-3">
                                <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
                                    <AlertCircle className="h-6 w-6 text-destructive" />
                                </div>
                                <p className="text-destructive font-medium">Ошибка загрузки: {error}</p>
                            </div>
                        ) : filteredRequests.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 gap-3">
                                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
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
                                                "flex items-center justify-between rounded-xl border border-border/50 p-4 transition-all hover:bg-muted/50 hover:border-primary/30 cursor-pointer group animate-fade-in"
                                            )}
                                            style={{ animationDelay: `${index * 30}ms` }}
                                        >
                                            <div className="flex items-start gap-4">
                                                <div className={cn(
                                                    "w-1.5 h-14 rounded-full shrink-0",
                                                    priorityMap[request.priority]?.color || 'bg-muted-foreground'
                                                )} />
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                                                            {request.id.slice(0, 8)}
                                                        </code>
                                                        <Badge variant={statusMap[request.status]?.variant || "secondary"} dot size="sm">
                                                            {statusMap[request.status]?.label || request.status}
                                                        </Badge>
                                                    </div>
                                                    <p className="font-medium mt-1.5 group-hover:text-primary transition-colors">{request.title}</p>
                                                    <p className="text-sm text-muted-foreground">{request.store?.name}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-6 text-sm text-muted-foreground">
                                                <div className="flex items-center gap-1.5">
                                                    <User className="h-4 w-4" />
                                                    <span className="hidden sm:inline">{request.creator?.name || 'Неизвестно'}</span>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <MessageSquare className="h-4 w-4" />
                                                    <span>{request._count?.comments || 0}</span>
                                                </div>
                                                <div className="flex items-center gap-1.5 hidden md:flex">
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
            </div>
        </div>
    );
}
