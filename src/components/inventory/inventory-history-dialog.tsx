"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription
} from "@/components/ui/dialog";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Eye, Loader2 } from "lucide-react";
import { inventoryApi } from "@/lib/api";
import { toast } from "sonner";

interface InventoryHistoryDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onViewSession: (sessionId: string) => void;
}

export function InventoryHistoryDialog({ open, onOpenChange, onViewSession }: InventoryHistoryDialogProps) {
    const [sessions, setSessions] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (open) {
            loadHistory();
        }
    }, [open]);

    const loadHistory = async () => {
        setIsLoading(true);
        try {
            const data = await inventoryApi.getAll();
            setSessions(data);
        } catch (error) {
            console.error(error);
            toast.error("Не удалось загрузить историю инвентаризаций");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>История инвентаризаций</DialogTitle>
                    <DialogDescription>
                        Список всех инвентаризаций и их статусы.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 min-h-0 mt-4">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-40">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : sessions.length === 0 ? (
                        <div className="text-center py-10 text-muted-foreground">
                            История пуста
                        </div>
                    ) : (
                        <ScrollArea className="h-[500px]">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Дата</TableHead>
                                        <TableHead>Склад</TableHead>
                                        <TableHead>Создал</TableHead>
                                        <TableHead>Статус</TableHead>
                                        <TableHead className="text-right">Действия</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {sessions.map((session) => (
                                        <TableRow key={session.id}>
                                            <TableCell>
                                                {format(new Date(session.createdAt), "d MMMM yyyy HH:mm", { locale: ru })}
                                            </TableCell>
                                            <TableCell className="font-medium">
                                                {session.warehouse?.name || "Неизвестный склад"}
                                            </TableCell>
                                            <TableCell>
                                                {session.createdBy?.name || "Система"}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={
                                                    session.status === 'COMPLETED' ? 'success' :
                                                        session.status === 'CANCELLED' ? 'destructive' :
                                                            'info'
                                                }>
                                                    {session.status === 'COMPLETED' ? 'Завершено' :
                                                        session.status === 'CANCELLED' ? 'Отменено' :
                                                            'В процессе'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => {
                                                        onViewSession(session.id);
                                                        onOpenChange(false);
                                                    }}
                                                >
                                                    <Eye className="h-4 w-4 mr-2" />
                                                    Просмотр
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </ScrollArea>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
