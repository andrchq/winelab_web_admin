"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import {
    AlertCircle,
    ArrowLeft,
    Boxes,
    CheckCircle2,
    Clock,
    Loader2,
    MessageSquare,
    Paperclip,
    Send,
    Store,
    Truck,
    User,
    XCircle,
} from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { requestApi } from "@/lib/api";
import { useRequest } from "@/lib/hooks";
import { SystemPermission } from "@/lib/permissions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const statusMap: Record<string, { label: string; variant: "default" | "warning" | "success" | "destructive" | "secondary" }> = {
    NEW: { label: "Новая", variant: "default" },
    IN_PROGRESS: { label: "В работе", variant: "warning" },
    READY: { label: "Готова", variant: "secondary" },
    SHIPPED: { label: "Отгружена", variant: "secondary" },
    COMPLETED: { label: "Завершена", variant: "success" },
    CANCELLED: { label: "Отменена", variant: "destructive" },
};

const priorityColors: Record<string, string> = {
    LOW: "text-muted-foreground bg-muted/50",
    MEDIUM: "text-blue-500 bg-blue-500/10",
    HIGH: "text-amber-500 bg-amber-500/10",
    CRITICAL: "text-red-500 bg-red-500/10",
};

const priorityLabels: Record<string, string> = {
    LOW: "Низкий",
    MEDIUM: "Средний",
    HIGH: "Высокий",
    CRITICAL: "Критичный",
};

export default function RequestDetailPage() {
    const params = useParams();
    const router = useRouter();
    const requestId = params.id as string;
    const { user, hasPermission } = useAuth();
    const { data: request, isLoading, error, refetch } = useRequest(requestId);
    const [commentText, setCommentText] = useState("");
    const [isSavingStatus, setIsSavingStatus] = useState(false);
    const [isSendingComment, setIsSendingComment] = useState(false);

    const canUpdateRequest = hasPermission([SystemPermission.REQUEST_UPDATE]);
    const canComment = hasPermission([SystemPermission.REQUEST_READ]);
    const canCreateShipment = hasPermission([SystemPermission.SHIPMENT_CREATE]);

    const canCancel = canUpdateRequest && request && !["COMPLETED", "CANCELLED"].includes(request.status);
    const canComplete = canUpdateRequest && request && !["COMPLETED", "CANCELLED"].includes(request.status);
    const canStartWork = canUpdateRequest && request?.status === "NEW";
    const activeShipment = request?.shipments?.find((shipment) => !["shipped", "SHIPPED", "DELIVERED"].includes(shipment.status));

    const handleCreateShipment = () => {
        if (!request?.store) {
            toast.error("У заявки не указан магазин");
            return;
        }

        const params = new URLSearchParams({
            requestId: request.id,
            storeId: request.store.id,
        });

        router.push(`/shipments/new?${params.toString()}`);
    };

    const timeline = useMemo(() => {
        if (!request) {
            return [];
        }

        return [
            { done: true, label: "Заявка создана" },
            { done: request.status !== "NEW", label: "Взята в работу" },
            { done: ["READY", "SHIPPED", "COMPLETED"].includes(request.status), label: "Подготовлена к исполнению" },
            { done: request.status === "SHIPPED", label: "Отгружена" },
            { done: request.status === "COMPLETED", label: "Завершена" },
            { done: request.status === "CANCELLED", label: "Отменена", destructive: true },
        ];
    }, [request]);

    const formatDate = (dateStr: string) =>
        new Date(dateStr).toLocaleString("ru-RU", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });

    const handleStatusUpdate = async (status: "IN_PROGRESS" | "COMPLETED" | "CANCELLED") => {
        if (!request) {
            return;
        }

        setIsSavingStatus(true);
        try {
            await requestApi.updateStatus(request.id, {
                status,
                assigneeId: request.assigneeId || user?.id,
            });
            toast.success(
                status === "IN_PROGRESS"
                    ? "Заявка переведена в работу"
                    : status === "COMPLETED"
                      ? "Заявка завершена"
                      : "Заявка отменена",
            );
            await refetch();
        } catch (requestError) {
            toast.error(requestError instanceof Error ? requestError.message : "Не удалось обновить заявку");
        } finally {
            setIsSavingStatus(false);
        }
    };

    const handleSendComment = async () => {
        if (!request || !commentText.trim()) {
            return;
        }

        setIsSendingComment(true);
        try {
            await requestApi.addComment(request.id, commentText);
            setCommentText("");
            toast.success("Комментарий добавлен");
            await refetch();
        } catch (requestError) {
            toast.error(requestError instanceof Error ? requestError.message : "Не удалось отправить комментарий");
        } finally {
            setIsSendingComment(false);
        }
    };

    return (
        <div className="p-6">
            <div className="space-y-6 animate-fade-in">
                <div className="flex items-center justify-between">
                    <Link href="/requests">
                        <Button variant="ghost" className="gap-2">
                            <ArrowLeft className="h-4 w-4" />
                            Назад к заявкам
                        </Button>
                    </Link>
                    <div className="flex gap-2">
                        {canCreateShipment && request?.store && (
                            activeShipment ? (
                                <Button variant="outline" onClick={() => router.push(`/shipments/${activeShipment.id}`)}>
                                    Открыть отгрузку
                                </Button>
                            ) : (
                                <Button variant="outline" onClick={handleCreateShipment}>
                                    Создать отгрузку
                                </Button>
                            )
                        )}
                        {canCancel && (
                            <Button variant="outline" disabled={isSavingStatus} onClick={() => handleStatusUpdate("CANCELLED")}>
                                {isSavingStatus ? <Loader2 className="h-4 w-4 animate-spin" /> : "Отменить"}
                            </Button>
                        )}
                        {canStartWork && (
                            <Button variant="outline" disabled={isSavingStatus} onClick={() => handleStatusUpdate("IN_PROGRESS")}>
                                {isSavingStatus ? <Loader2 className="h-4 w-4 animate-spin" /> : "Взять в работу"}
                            </Button>
                        )}
                        {canComplete && !canStartWork && (
                            <Button variant="gradient" disabled={isSavingStatus} onClick={() => handleStatusUpdate("COMPLETED")}>
                                {isSavingStatus ? <Loader2 className="h-4 w-4 animate-spin" /> : "Завершить заявку"}
                            </Button>
                        )}
                    </div>
                </div>

                {isLoading ? (
                    <div className="flex items-center justify-center py-24">
                        <Loader2 className="h-12 w-12 animate-spin text-primary" />
                    </div>
                ) : error ? (
                    <div className="py-24 text-center text-red-400">Ошибка загрузки: {error}</div>
                ) : !request ? (
                    <div className="py-24 text-center text-muted-foreground">Заявка не найдена</div>
                ) : (
                    <div className="grid gap-6 lg:grid-cols-3">
                        <div className="space-y-6 lg:col-span-2">
                            <Card>
                                <CardContent className="p-6">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-mono text-sm text-muted-foreground">{request.id.slice(0, 8)}</span>
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
                                            {request.items.map((item) => (
                                                <div
                                                    key={item.id}
                                                    className="flex items-center justify-between rounded-lg border border-primary/30 bg-primary/5 p-3"
                                                >
                                                    <div>
                                                        <p className="font-medium">{item.asset?.product?.name || "Оборудование"}</p>
                                                        <p className="text-sm text-muted-foreground">
                                                            SN: {item.asset?.serialNumber || "не указан"}
                                                        </p>
                                                        {item.notes && <p className="text-sm text-muted-foreground">{item.notes}</p>}
                                                    </div>
                                                    <Badge variant="secondary">{item.asset?.processStatus || "В заявке"}</Badge>
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            {request.shipments && request.shipments.length > 0 && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <Truck className="h-5 w-5 text-primary" />
                                            Связанные отгрузки ({request.shipments.length})
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-2">
                                            {request.shipments.map((shipment) => (
                                                <Link key={shipment.id} href={`/shipments/${shipment.id}`}>
                                                    <div className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/40">
                                                        <div>
                                                            <p className="font-medium">{shipment.invoiceNumber || shipment.id.slice(0, 8)}</p>
                                                            <p className="text-sm text-muted-foreground">
                                                                {shipment.destination || shipment.destinationName || "Маршрут не указан"} • {formatDate(shipment.createdAt)}
                                                            </p>
                                                        </div>
                                                        <Badge variant="secondary">{shipment.status}</Badge>
                                                    </div>
                                                </Link>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            <Card className="flex flex-col">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <MessageSquare className="h-5 w-5 text-primary" />
                                        Комментарии ({request.comments?.length || 0})
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="flex-1 space-y-4">
                                    {!request.comments || request.comments.length === 0 ? (
                                        <div className="py-8 text-center text-muted-foreground">Комментариев пока нет</div>
                                    ) : (
                                        request.comments.map((comment) => {
                                            const roleName: string | null =
                                                comment.user?.role && typeof comment.user.role === "object"
                                                    ? comment.user.role.name
                                                    : typeof comment.user?.role === "string"
                                                      ? comment.user.role
                                                      : null;
                                            return (
                                                <div key={comment.id} className="flex gap-3">
                                                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                                                        {comment.user?.name?.split(" ").map((part) => part[0]).join("") || "U"}
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-sm font-medium">{comment.user?.name || "Система"}</span>
                                                            {roleName && (
                                                                <span className="text-xs text-muted-foreground">{roleName}</span>
                                                            )}
                                                            <span className="text-xs text-muted-foreground">
                                                                {formatDate(comment.createdAt)}
                                                            </span>
                                                        </div>
                                                        <p className="mt-1 text-sm">{comment.text}</p>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </CardContent>

                                <div className="border-t border-border p-4">
                                    <div className="flex gap-2">
                                        <Button variant="ghost" size="icon" disabled>
                                            <Paperclip className="h-4 w-4" />
                                        </Button>
                                        <Input
                                            placeholder="Написать комментарий..."
                                            className="flex-1"
                                            value={commentText}
                                            onChange={(event) => setCommentText(event.target.value)}
                                            onKeyDown={(event) => {
                                                if (event.key === "Enter" && !event.shiftKey) {
                                                    event.preventDefault();
                                                    void handleSendComment();
                                                }
                                            }}
                                            disabled={!canComment || isSendingComment}
                                        />
                                        <Button
                                            variant="gradient"
                                            size="icon"
                                            onClick={() => void handleSendComment()}
                                            disabled={!canComment || !commentText.trim() || isSendingComment}
                                        >
                                            {isSendingComment ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                                        </Button>
                                    </div>
                                </div>
                            </Card>
                        </div>

                        <div className="space-y-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base">Информация</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4 text-sm">
                                    <div>
                                        <p className="text-muted-foreground">Магазин</p>
                                        {request.store && (
                                            <Link
                                                href={`/stores/${request.store.id}`}
                                                className="flex items-center gap-1 font-medium text-primary hover:underline"
                                            >
                                                <Store className="h-3 w-3" />
                                                {request.store.name}
                                            </Link>
                                        )}
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground">Создана</p>
                                        <p className="flex items-center gap-1 font-medium">
                                            <Clock className="h-3 w-3 text-muted-foreground" />
                                            {formatDate(request.createdAt)}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground">Автор</p>
                                        <p className="flex items-center gap-1 font-medium">
                                            <User className="h-3 w-3 text-muted-foreground" />
                                            {request.creator?.name || "Неизвестно"}
                                        </p>
                                    </div>
                                    {request.assignee && (
                                        <div>
                                            <p className="text-muted-foreground">Исполнитель</p>
                                            <p className="flex items-center gap-1 font-medium">
                                                <User className="h-3 w-3 text-muted-foreground" />
                                                {request.assignee.name}
                                            </p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base">Этапы</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-3">
                                        {timeline.map((step) => (
                                            <div key={step.label} className="flex items-center gap-2">
                                                {step.done ? (
                                                    step.destructive ? (
                                                        <XCircle className="h-4 w-4 text-destructive" />
                                                    ) : (
                                                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                                    )
                                                ) : (
                                                    <div className="h-4 w-4 rounded-full border-2 border-muted-foreground" />
                                                )}
                                                <span className={step.done ? "text-sm" : "text-sm text-muted-foreground"}>
                                                    {step.label}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>

                            {!canUpdateRequest && (
                                <Card className="border-amber-500/30 bg-amber-500/5">
                                    <CardContent className="flex items-start gap-3 p-4 text-sm text-muted-foreground">
                                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                                        <div>У вас есть доступ к просмотру, но нет прав на изменение статуса этой заявки.</div>
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
