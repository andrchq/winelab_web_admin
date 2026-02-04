
import { Bell, Check, Trash2, Filter, AlertTriangle, Truck, Package, MessageSquare, Inbox } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, StatCard } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const notifications = [
    {
        id: 1,
        type: "DELIVERY",
        title: "Доставка завершена",
        message: "Заказ DEL-2024-0233 доставлен в Магазин #55",
        time: "5 мин назад",
        read: false
    },
    {
        id: 2,
        type: "ALERT",
        title: "Низкий остаток",
        message: "Термобумага 80мм: осталось 12 шт, минимум 50 шт",
        time: "15 мин назад",
        read: false
    },
    {
        id: 3,
        type: "REQUEST",
        title: "Новая заявка",
        message: "REQ-2024-0142: Замена роутера в Магазине #42",
        time: "30 мин назад",
        read: false
    },
    {
        id: 4,
        type: "COMMENT",
        title: "Новый комментарий",
        message: "Петров В. в заявке REQ-2024-0141: 'Оборудование проверено'",
        time: "1 час назад",
        read: true
    },
    {
        id: 5,
        type: "DELIVERY",
        title: "Проблема с доставкой",
        message: "DEL-2024-0231: Курьер не может связаться с получателем",
        time: "2 часа назад",
        read: true
    },
];

const typeConfig: Record<string, { icon: typeof Bell; bgColor: string; iconColor: string }> = {
    DELIVERY: { icon: Truck, bgColor: "bg-info/10", iconColor: "text-info" },
    ALERT: { icon: AlertTriangle, bgColor: "bg-warning/10", iconColor: "text-warning" },
    REQUEST: { icon: Package, bgColor: "bg-accent/10", iconColor: "text-accent" },
    COMMENT: { icon: MessageSquare, bgColor: "bg-success/10", iconColor: "text-success" },
};

export default function NotificationsPage() {
    const unreadCount = notifications.filter(n => !n.read).length;

    return (
        <div className="p-6 h-full">
            <div className="space-y-6 max-w-3xl">
                {/* Page Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">Уведомления</h1>
                        <p className="text-sm text-muted-foreground mt-1">Центр уведомлений и алертов</p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                            <Check className="h-4 w-4" />
                            Прочитать всё
                        </Button>
                        <Button variant="outline" size="sm">
                            <Filter className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid gap-4 md:grid-cols-3 animate-stagger">
                    <StatCard
                        title="Непрочитанные"
                        value={unreadCount.toString()}
                        icon={<Inbox className="h-5 w-5" />}
                        status="default"
                    />
                    <StatCard
                        title="Сегодня"
                        value="24"
                        icon={<Bell className="h-5 w-5" />}
                    />
                    <StatCard
                        title="Требуют внимания"
                        value="2"
                        icon={<AlertTriangle className="h-5 w-5" />}
                        status="warning"
                    />
                </div>

                {/* Notifications List */}
                <Card variant="elevated">
                    <CardHeader className="pb-4">
                        <CardTitle className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                                <Bell className="h-4 w-4 text-primary" />
                            </div>
                            Последние уведомления
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {notifications.map((notification, index) => {
                                const config = typeConfig[notification.type] || typeConfig.DELIVERY;
                                const TypeIcon = config.icon;

                                return (
                                    <div
                                        key={notification.id}
                                        className={cn(
                                            "flex items-start gap-4 p-4 rounded-xl border transition-all cursor-pointer group animate-fade-in",
                                            notification.read
                                                ? "border-border/30 opacity-60 hover:opacity-100 hover:bg-muted/30"
                                                : "border-primary/30 bg-primary/5 hover:bg-primary/10"
                                        )}
                                        style={{ animationDelay: `${index * 50}ms` }}
                                    >
                                        <div className={cn(
                                            "flex h-12 w-12 items-center justify-center rounded-xl shrink-0 transition-colors",
                                            config.bgColor
                                        )}>
                                            <TypeIcon className={cn("h-5 w-5", config.iconColor)} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <p className="font-medium group-hover:text-primary transition-colors">{notification.title}</p>
                                                {!notification.read && (
                                                    <span className="flex h-2 w-2 rounded-full bg-primary animate-pulse" />
                                                )}
                                            </div>
                                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{notification.message}</p>
                                            <p className="text-xs text-muted-foreground mt-2">{notification.time}</p>
                                        </div>
                                        <Button variant="ghost" size="icon-sm" className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive transition-colors" />
                                        </Button>
                                    </div>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
