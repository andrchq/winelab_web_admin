"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

import { requestApi } from "@/lib/api";
import { useStores } from "@/lib/hooks";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface CreateRequestDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    presetStoreId?: string;
    presetStoreName?: string;
}

const priorityOptions = [
    { value: "LOW", label: "Низкий" },
    { value: "MEDIUM", label: "Средний" },
    { value: "HIGH", label: "Высокий" },
    { value: "CRITICAL", label: "Критичный" },
] as const;

export function CreateRequestDialog({
    open,
    onOpenChange,
    presetStoreId,
    presetStoreName,
}: CreateRequestDialogProps) {
    const router = useRouter();
    const { data: stores } = useStores();
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [priority, setPriority] = useState("MEDIUM");
    const [storeId, setStoreId] = useState(presetStoreId || "");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const availableStores = useMemo(
        () => stores.filter((store) => store.isActive),
        [stores],
    );

    const resetForm = () => {
        setTitle("");
        setDescription("");
        setPriority("MEDIUM");
        setStoreId(presetStoreId || "");
    };

    const handleOpenChange = (nextOpen: boolean) => {
        if (!nextOpen) {
            resetForm();
        }
        onOpenChange(nextOpen);
    };

    const handleSubmit = async () => {
        if (!title.trim()) {
            toast.error("Укажите заголовок заявки");
            return;
        }

        if (!storeId) {
            toast.error("Выберите магазин");
            return;
        }

        setIsSubmitting(true);
        try {
            const createdRequest = await requestApi.create({
                title: title.trim(),
                description: description.trim() || undefined,
                storeId,
                priority,
            });

            toast.success("Заявка создана");
            handleOpenChange(false);
            router.push(`/requests/${createdRequest.id}`);
            router.refresh();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Не удалось создать заявку");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-[520px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Plus className="h-5 w-5 text-primary" />
                        Создать заявку
                    </DialogTitle>
                    <DialogDescription>
                        Оформите новую заявку для магазина. Внешний вид страницы не меняется, вы просто переходите в карточку новой заявки.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-2">
                    <div className="grid gap-2">
                        <Label htmlFor="request-title">Заголовок</Label>
                        <Input
                            id="request-title"
                            value={title}
                            onChange={(event) => setTitle(event.target.value)}
                            placeholder="Например: Замена сканера на кассе 2"
                            disabled={isSubmitting}
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="request-store">Магазин</Label>
                        {presetStoreId ? (
                            <Input id="request-store" value={presetStoreName || "Выбранный магазин"} disabled />
                        ) : (
                            <Select value={storeId} onValueChange={setStoreId} disabled={isSubmitting}>
                                <SelectTrigger id="request-store">
                                    <SelectValue placeholder="Выберите магазин" />
                                </SelectTrigger>
                                <SelectContent>
                                    {availableStores.map((store) => (
                                        <SelectItem key={store.id} value={store.id}>
                                            {store.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="request-priority">Приоритет</Label>
                        <Select value={priority} onValueChange={setPriority} disabled={isSubmitting}>
                            <SelectTrigger id="request-priority">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {priorityOptions.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                        {option.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="request-description">Описание</Label>
                        <Textarea
                            id="request-description"
                            value={description}
                            onChange={(event) => setDescription(event.target.value)}
                            placeholder="Опишите проблему, состав комплекта или задачу для склада"
                            className="min-h-[120px]"
                            disabled={isSubmitting}
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isSubmitting}>
                        Отмена
                    </Button>
                    <Button variant="gradient" onClick={handleSubmit} disabled={isSubmitting}>
                        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Создать заявку"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
