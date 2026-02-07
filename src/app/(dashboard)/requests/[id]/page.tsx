"use client";

import {
    ArrowLeft,
    Clock,
    User,
    Store,
    MessageSquare,
    AlertCircle,
    CheckCircle2,
    Boxes,
    Send,
    Paperclip,
    Loader2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useRequest } from "@/lib/hooks";

const statusMap: Record<string, { label: string; variant: "default" | "warning" | "success" | "destructive" | "secondary" }> = {
    NEW: { label: "Новая", variant: "default" },
    IN_PROGRESS: { label: "В работе", variant: "warning" },
    PENDING: { label: "Ожидает", variant: "secondary" },
    APPROVED: { label: "Одобрена", variant: "success" },
    REJECTED: { label: "Отклонена", variant: "destructive" },
    COMPLETED: { label: "Завершена", variant: "success" },
};

const priorityColors: Record<string, string> = {
    LOW: "text-muted-foreground bg-muted/50",
    MEDIUM: "text-blue-500 bg-blue-500/10",
    HIGH: "text-amber-500 bg-amber-500/10",
    URGENT: "text-red-500 bg-red-500/10",
};

const priorityLabels: Record<string, string> = {
    LOW: "Низкий",
    MEDIUM: "Средний",
    HIGH: "Высокий",
    URGENT: "Срочный",
};

export default function RequestDetailPage() {
    const params = useParams();
    const id = params.id as string;
    const { data: request, isLoading, error } = useRequest(id);

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="p-6">
            <div className="space-y-6 animate-fade-in">
                {/* Back */}
                <div className="flex items-center justify-between">
                    <Link href="/requests">
                        <Button variant="ghost" className="gap-2">
                            <ArrowLeft className="h-4 w-4" />
                            Назад к заявкам
                        </Button>
                    </Link>
                    <div className="flex gap-2">
                        <Button variant="outline">Отменить</Button>
                        <Button variant="gradient">Завершить заявку</Button>
                    </div>
                </div>

                {isLoading ? (
                    <div className="flex items-center justify-center py-24">
                        <Loader2 className="h-12 w-12 animate-spin text-primary" />
                    </div>
                ) : error ? (
                    <div className="text-center py-24 text-red-400">
                        Ошибка загрузки: {error}
                    </div>
                ) : !request ? (
                    <div className="text-center py-24 text-muted-foreground">
                        Заявка не найдена
                    </div>
                ) : (
                    <div className="grid gap-6 lg:grid-cols-3">
                        {/* Main Content */}
                        <div className="lg:col-span-2 space-y-6">
                            {/* Request Header */}
                            <Card>
                                <CardContent className="p-6">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-mono text-sm text-muted-foreground">
                                                    {request.id.slice(0, 8)}
                                                </span>
                                                <Badge className={priorityColors[request.priority]}>
                                                    {priorityLabels[request.priority] || request.priority}
                                                </Badge>
                                            </div>
                                            <h1 className="mt-2 text-2xl font-bold">{request.title}</h1>
                                            {request.description && (
                                                <p className="mt-2 text-muted-foreground">{request.description}</p>
                                            )}
                                        </div>
                                        <Badge variant={statusMap[request.status]?.variant || "default"}>
                                            {statusMap[request.status]?.label || request.status}
                                        </Badge>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Request Items */}
                            {request.items && request.items.length > 0 && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <Boxes className="h-5 w-5 text-primary" />
                                            Позиции заявки ({request.items.length})
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-2">
                                            {request.items.map((item: any) => (
                                                <div key={item.id} className="flex items-center justify-between rounded-lg border border-primary/30 bg-primary/5 p-3">
                                                    <div>
                                                        <p className="font-medium">{item.product?.name}</p>
                                                        <p className="text-sm text-muted-foreground">
                                                            Кол-во: {item.quantity}
                                                        </p>
                                                    </div>
                                                    <Badge>{item.status}</Badge>
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            {/* Comments / Chat */}
                            <Card className="flex flex-col">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <MessageSquare className="h-5 w-5 text-primary" />
                                        Комментарии ({request.comments?.length || 0})
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="flex-1 space-y-4">
                                    {!request.comments || request.comments.length === 0 ? (
                                        <div className="text-center py-8 text-muted-foreground">
                                            Комментариев пока нет
                                        </div>
                                    ) : (
                                        request.comments.map((comment: any) => (
                                            <div key={comment.id} className={`flex gap-3 ${comment.isSystem ? "opacity-60" : ""}`}>
                                                {comment.isSystem ? (
                                                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                                                        <AlertCircle className="h-4 w-4 text-muted-foreground" />
                                                    </div>
                                                ) : (
                                                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-medium">
                                                        {comment.user?.name?.split(' ').map((n: string) => n[0]).join('') || 'U'}
                                                    </div>
                                                )}
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className={`font-medium text-sm ${comment.isSystem ? "text-muted-foreground" : ""}`}>
                                                            {comment.user?.name || 'Система'}
                                                        </span>
                                                        <span className="text-xs text-muted-foreground">
                                                            {formatDate(comment.createdAt)}
                                                        </span>
                                                    </div>
                                                    <p className={`mt-1 text-sm ${comment.isSystem ? "italic" : ""}`}>{comment.text}</p>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </CardContent>

                                {/* Comment Input */}
                                <div className="border-t border-border p-4">
                                    <div className="flex gap-2">
                                        <Button variant="ghost" size="icon">
                                            <Paperclip className="h-4 w-4" />
                                        </Button>
                                        <Input placeholder="Написать комментарий..." className="flex-1" />
                                        <Button variant="gradient" size="icon">
                                            <Send className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </Card>
                        </div>

                        {/* Sidebar */}
                        <div className="space-y-6">
                            {/* Request Info */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base">Информация</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4 text-sm">
                                    <div>
                                        <p className="text-muted-foreground">Магазин</p>
                                        {request.store && (
                                            <Link href={`/stores/${request.store.id}`} className="font-medium text-primary hover:underline flex items-center gap-1">
                                                <Store className="h-3 w-3" />
                                                {request.store.name}
                                            </Link>
                                        )}
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground">Создана</p>
                                        <p className="font-medium flex items-center gap-1">
                                            <Clock className="h-3 w-3 text-muted-foreground" />
                                            {formatDate(request.createdAt)}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground">Автор</p>
                                        <p className="font-medium flex items-center gap-1">
                                            <User className="h-3 w-3 text-muted-foreground" />
                                            {request.creator?.name || 'Неизвестно'}
                                        </p>
                                    </div>
                                    {request.assignee && (
                                        <div>
                                            <p className="text-muted-foreground">Исполнитель</p>
                                            <p className="font-medium flex items-center gap-1">
                                                <User className="h-3 w-3 text-muted-foreground" />
                                                {request.assignee.name}
                                            </p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Timeline Quick */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base">Этапы</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2">
                                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                            <span className="text-sm">Заявка создана</span>
                                        </div>
                                        {request.status !== 'NEW' && (
                                            <div className="flex items-center gap-2">
                                                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                                <span className="text-sm">В работе</span>
                                            </div>
                                        )}
                                        {request.status === 'COMPLETED' ? (
                                            <div className="flex items-center gap-2">
                                                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                                <span className="text-sm">Завершена</span>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                <div className="h-4 w-4 rounded-full border-2 border-muted-foreground" />
                                                <span className="text-sm text-muted-foreground">Завершение</span>
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
