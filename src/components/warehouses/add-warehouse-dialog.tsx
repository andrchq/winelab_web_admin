"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";

interface AddWarehouseDialogProps {
    onSuccess?: () => void;
}

export function AddWarehouseDialog({ onSuccess }: AddWarehouseDialogProps) {
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        address: ""
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            await api.post('/warehouses', formData);
            toast.success("Склад создан");
            setOpen(false);
            setFormData({ name: "", address: "" });
            onSuccess?.();
        } catch (error) {
            toast.error("Ошибка при создании склада");
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="gradient">
                    <Plus className="h-4 w-4" />
                    Добавить склад
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Новый склад</DialogTitle>
                    <DialogDescription>
                        Добавьте новый склад для управления запасами
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Название</Label>
                        <Input
                            id="name"
                            placeholder="Например, Центральный склад"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="address">Адрес</Label>
                        <Input
                            id="address"
                            placeholder="г. Москва, ул. Примерная, д. 1"
                            value={formData.address}
                            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        />
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                            Отмена
                        </Button>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading ? "Создание..." : "Создать"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
