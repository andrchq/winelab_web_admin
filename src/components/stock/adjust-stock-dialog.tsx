"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Loader2, Plus, Minus } from "lucide-react";
import { StockItem } from "@/types/api";

interface AdjustStockDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    stockItem: StockItem | null;
    onSuccess: () => void;
}

export function AdjustStockDialog({ open, onOpenChange, stockItem, onSuccess }: AdjustStockDialogProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [delta, setDelta] = useState("");
    const [type, setType] = useState<"add" | "remove">("add");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!stockItem) return;

        setIsLoading(true);
        try {
            const value = parseInt(delta) || 0;
            const finalDelta = type === "add" ? value : -value;

            await api.patch(`/stock/${stockItem.id}/adjust`, {
                delta: finalDelta
            });
            toast.success("Количество обновлено");
            onSuccess();
            onOpenChange(false);
            setDelta("");
        } catch (error) {
            toast.error("Ошибка при обновлении количества");
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    if (!stockItem) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Изменить количество</DialogTitle>
                    <DialogDescription>
                        {stockItem.product?.name} ({stockItem.warehouse?.name})
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="flex justify-center gap-4 mb-4">
                        <Button
                            type="button"
                            variant={type === "add" ? "default" : "outline"}
                            onClick={() => setType("add")}
                            className="w-1/2"
                        >
                            <Plus className="mr-2 h-4 w-4" /> Приход
                        </Button>
                        <Button
                            type="button"
                            variant={type === "remove" ? "destructive" : "outline"}
                            onClick={() => setType("remove")}
                            className="w-1/2"
                        >
                            <Minus className="mr-2 h-4 w-4" /> Расход
                        </Button>
                    </div>

                    <div className="space-y-2">
                        <Label>Количество</Label>
                        <Input
                            type="number"
                            min="1"
                            value={delta}
                            onChange={(e) => setDelta(e.target.value)}
                            placeholder="Введите значение"
                            autoFocus
                        />
                        <p className="text-sm text-muted-foreground">
                            Текущий остаток: <span className="font-medium">{stockItem.quantity} шт.</span>
                        </p>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                            Отмена
                        </Button>
                        <Button type="submit" disabled={isLoading || !delta}>
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Применить
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
