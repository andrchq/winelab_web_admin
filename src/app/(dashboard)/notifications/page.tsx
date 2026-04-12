"use client";

import { useMemo, useState } from "react";
import {
    Bell,
    Check,
    ChevronRight,
    Inbox,
    ShieldAlert,
    Truck,
    UserRound,
    UsersRound,
    Workflow,
} from "lucide-react";
import { useRouter } from "next/navigation";

import { notificationsApi } from "@/lib/api";
import { useNotifications } from "@/lib/hooks";
import { NotificationItem, NotificationScope, NotificationType } from "@/types/api";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, StatCard } from "@/components/ui/card";

const typeConfig: Record<NotificationType, { icon: typeof Bell; bgColor: string; iconColor: string; label: string }> = {
    SYSTEM: { icon: Bell, bgColor: "bg-slate-500/10", iconColor: "text-slate-300", label: "Система" },
    REQUEST: { icon: Workflow, bgColor: "bg-cyan-500/10", iconColor: "text-cyan-300", label: "Заявки" },
    DELIVERY: { icon: Truck, bgColor: "bg-sky-500/10", iconColor: "text-sky-300", label: "Доставка" },
    RECEIVING: { icon: Inbox, bgColor: "bg-amber-500/10", iconColor: "text-amber-300", label: "Приемка" },
    SHIPMENT: { icon: Truck, bgColor: "bg-indigo-500/10", iconColor: "text-indigo-300", label: "Отгрузки" },
    STORE: { icon: UsersRound, bgColor: "bg-emerald-500/10", iconColor: "text-emerald-300", label: "Магазины" },
    INVENTORY: { icon: Inbox, bgColor: "bg-orange-500/10", iconColor: "text-orange-300", label: "Инвентаризация" },
    SECURITY: { icon: ShieldAlert, bgColor: "bg-rose-500/10", iconColor: "text-rose-300", label: "Безопасность" },
};

const scopeLabels: Record<NotificationScope, string> = {
    GLOBAL: "Общее",
    ROLE: "По роли",
    USER: "Личное",
};

type FilterKey = "all" | "unread" | NotificationScope;

function formatNotificationTime(value: string) {
    return new Intl.DateTimeFormat("ru-RU", {
        dateStyle: "short",
        timeStyle: "short",
    }).format(new Date(value));
}

export default function NotificationsPage() {
    const router = useRouter();
    const { data, isLoading, error, refetch } = useNotifications();
    const [filter, setFilter] = useState<FilterKey>("all");
    const [busyId, setBusyId] = useState<string | null>(null);
    const [isMarkingAll, setIsMarkingAll] = useState(false);

    const filteredItems = useMemo(() => {
        return data.items.filter((item) => {
            if (filter === "all") return true;
            if (filter === "unread") return !item.isRead;
            return item.audience.scope === filter;
        });
    }, [data.items, filter]);

    const filterButtons: { key: FilterKey; label: string; count: number }[] = [
        { key: "all", label: "Все", count: data.stats.total },
        { key: "unread", label: "Непрочитанные", count: data.stats.unread },
        { key: "USER", label: "Личные", count: data.stats.personalUnread },
        { key: "ROLE", label: "По роли", count: data.stats.roleUnread },
        { key: "GLOBAL", label: "Общие", count: data.stats.globalUnread },
    ];

    const handleOpenNotification = async (notification: NotificationItem) => {
        if (!notification.isRead) {
            try {
                setBusyId(notification.id);
                await notificationsApi.markRead(notification.id);
                await refetch();
            } finally {
                setBusyId(null);
            }
        }

        if (notification.link) {
            router.push(notification.link);
        }
    };

    const handleMarkAllRead = async () => {
        try {
            setIsMarkingAll(true);
            await notificationsApi.markAllRead();
            await refetch();
        } finally {
            setIsMarkingAll(false);
        }
    };

    return (
        <div className="h-full p-6">
            <div className="space-y-6">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">Уведомления</h1>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Единый центр общих, ролевых и персональных уведомлений с realtime-обновлением и общей историей событий.
                        </p>
                    </div>
                    <Button
                        variant="outline"
                        onClick={handleMarkAllRead}
                        disabled={isMarkingAll || data.unreadCount === 0}
                    >
                        <Check className="h-4 w-4" />
                        Прочитать все
                    </Button>
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <StatCard
                        title="Всего"
                        value={data.stats.total.toString()}
                        subtitle="За текущую выборку"
                        icon={<Bell className="h-5 w-5" />}
                    />
                    <StatCard
                        title="Непрочитанные"
                        value={data.stats.unread.toString()}
                        subtitle="Требуют просмотра"
                        icon={<Inbox className="h-5 w-5" />}
                        status={data.stats.unread > 0 ? "warning" : "default"}
                    />
                    <StatCard
                        title="Личные"
                        value={data.stats.personalUnread.toString()}
                        subtitle="Только для этого аккаунта"
                        icon={<UserRound className="h-5 w-5" />}
                        status="success"
                    />
                    <StatCard
                        title="По роли"
                        value={data.stats.roleUnread.toString()}
                        subtitle="Назначены вашей роли"
                        icon={<UsersRound className="h-5 w-5" />}
                        status="accent"
                    />
                </div>

                <Card variant="elevated" className="overflow-hidden">
                    <CardHeader className="border-b border-border/40 pb-5">
                        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                            <div>
                                <CardTitle className="flex items-center gap-2">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                        <Bell className="h-4 w-4" />
                                    </div>
                                    Лента уведомлений
                                </CardTitle>
                                <CardDescription className="mt-2">
                                    Хронологический список всех событий с делением по аудитории и типу.
                                </CardDescription>
                            </div>

                            <div className="flex flex-wrap gap-2">
                                {filterButtons.map((item) => (
                                    <Button
                                        key={item.key}
                                        type="button"
                                        size="sm"
                                        variant={filter === item.key ? "default" : "outline"}
                                        onClick={() => setFilter(item.key)}
                                        className="justify-between"
                                    >
                                        <span>{item.label}</span>
                                        <Badge
                                            variant={filter === item.key ? "secondary" : "outline"}
                                            className="ml-1"
                                        >
                                            {item.count}
                                        </Badge>
                                    </Button>
                                ))}
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        {isLoading ? (
                            <div className="p-8 text-sm text-muted-foreground">Загрузка уведомлений...</div>
                        ) : error ? (
                            <div className="p-8 text-sm font-medium text-destructive">Ошибка загрузки: {error}</div>
                        ) : filteredItems.length === 0 ? (
                            <div className="m-5 rounded-3xl border border-dashed border-border/50 bg-muted/10 p-10 text-center">
                                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                                    <Inbox className="h-6 w-6" />
                                </div>
                                <p className="mt-4 text-lg font-semibold">По текущему фильтру уведомлений нет</p>
                                <p className="mt-2 text-sm text-muted-foreground">
                                    Новые события автоматически появятся здесь, как только они будут созданы системой.
                                </p>
                            </div>
                        ) : (
                            <div className="divide-y divide-border/40">
                                {filteredItems.map((notification, index) => {
                                    const config = typeConfig[notification.type] || typeConfig.SYSTEM;
                                    const TypeIcon = config.icon;

                                    return (
                                        <button
                                            type="button"
                                            key={notification.id}
                                            onClick={() => void handleOpenNotification(notification)}
                                            className={cn(
                                                "group flex w-full items-start gap-4 px-5 py-5 text-left transition-colors animate-fade-in",
                                                notification.isRead
                                                    ? "bg-transparent hover:bg-muted/20"
                                                    : "bg-primary/[0.04] hover:bg-primary/[0.08]",
                                            )}
                                            style={{ animationDelay: `${index * 35}ms` }}
                                        >
                                            <div className={cn("mt-0.5 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl", config.bgColor)}>
                                                <TypeIcon className={cn("h-5 w-5", config.iconColor)} />
                                            </div>

                                            <div className="min-w-0 flex-1 space-y-3">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <p className="text-sm font-semibold text-foreground transition-colors group-hover:text-primary">
                                                        {notification.title}
                                                    </p>
                                                    {!notification.isRead && (
                                                        <span className="flex h-2 w-2 rounded-full bg-primary animate-pulse" />
                                                    )}
                                                    <Badge variant="outline">{config.label}</Badge>
                                                    <Badge variant="secondary">{scopeLabels[notification.audience.scope]}</Badge>
                                                    {notification.audience.scope === "ROLE" && notification.audience.roles.length > 0 && (
                                                        <Badge variant="outline">{notification.audience.roles.join(", ")}</Badge>
                                                    )}
                                                </div>

                                                <p className="max-w-5xl text-sm leading-6 text-muted-foreground">
                                                    {notification.message}
                                                </p>

                                                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                                                    <span>{formatNotificationTime(notification.createdAt)}</span>
                                                    <span className="h-1 w-1 rounded-full bg-border" />
                                                    <span>{notification.isRead ? "Прочитано" : "Ожидает просмотра"}</span>
                                                </div>
                                            </div>

                                            <div className="flex shrink-0 items-center gap-3 self-center">
                                                <Badge variant={busyId === notification.id ? "secondary" : notification.isRead ? "outline" : "default"}>
                                                    {busyId === notification.id ? "..." : notification.isRead ? "Прочитано" : "Новое"}
                                                </Badge>
                                                <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
