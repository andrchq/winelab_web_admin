
"use client";

import { useState } from "react";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useCategories } from "@/lib/hooks";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Pencil, Trash2, Search, Save, X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Settings as SettingsIcon } from "lucide-react";

export function CategoriesSettings() {
    const { data: categories, isLoading, refetch } = useCategories();
    const [search, setSearch] = useState("");
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<any>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        name: "",
        code: "",
        isMandatory: false,
        parentId: "none"
    });

    const filteredCategories = categories?.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.code.toLowerCase().includes(search.toLowerCase())
    ) || [];

    const handleOpenDialog = (category?: any) => {
        if (category) {
            setEditingCategory(category);
            setFormData({
                name: category.name,
                code: category.code,
                isMandatory: category.isMandatory || false,
                parentId: category.parentId || "none"
            });
        } else {
            setEditingCategory(null);
            setFormData({
                name: "",
                code: "",
                isMandatory: false,
                parentId: "none"
            });
        }
        setIsDialogOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            let finalParentId = formData.parentId === "none" ? null : formData.parentId;

            // Logic: Is Mandatory -> Root (parentId = null)
            // Logic: Not Mandatory + No Parent -> Child of ACCESSORY
            if (formData.isMandatory) {
                finalParentId = null;
            } else if (!finalParentId) {
                // Find ACCESSORY category
                const accessoryCat = categories?.find(c => c.code === 'ACCESSORY');
                if (accessoryCat) {
                    finalParentId = accessoryCat.id;
                }
            }

            const payload = {
                ...formData,
                parentId: finalParentId
            };

            if (editingCategory) {
                await api.patch(`/categories/${editingCategory.id}`, payload);
                toast.success("Категория обновлена");
            } else {
                await api.post("/categories", payload);
                toast.success("Категория создана");
            }
            refetch();
            setIsDialogOpen(false);
        } catch (error) {
            console.error(error);
            toast.error("Ошибка при сохранении категории");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Вы уверены? Это действие нельзя отменить.")) return;

        try {
            await api.delete(`/categories/${id}`);
            toast.success("Категория удалена");
            refetch();
        } catch (error) {
            toast.error("Не удалось удалить категорию (возможно, к ней привязаны товары)");
        }
    };

    return (
        <Card variant="elevated">
            <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <SettingsIcon className="h-4 w-4 text-primary" />
                    </div>
                    Справочник оборудования
                </CardTitle>
                <CardDescription>Настройка категорий и обязательного оборудования для магазинов</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex items-center justify-between gap-4">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Поиск категорий..."
                            className="pl-9"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <Button onClick={() => handleOpenDialog()}>
                        <Plus className="mr-2 h-4 w-4" />
                        Добавить категорию
                    </Button>
                </div>

                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Название</TableHead>
                                <TableHead>Код (System)</TableHead>
                                <TableHead>Тип</TableHead>
                                <TableHead>Родительская категория</TableHead>
                                <TableHead className="w-[100px]">Действия</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8">
                                        <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                                    </TableCell>
                                </TableRow>
                            ) : filteredCategories.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                        Категории не найдены
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredCategories.map((category) => (
                                    <TableRow key={category.id}>
                                        <TableCell className="font-medium">{category.name}</TableCell>
                                        <TableCell className="font-mono text-xs">{category.code}</TableCell>
                                        <TableCell>
                                            {category.isMandatory ? (
                                                <Badge variant="destructive" className="bg-red-500/10 text-red-600 hover:bg-red-500/20 border-red-500/20">
                                                    Обязательное
                                                </Badge>
                                            ) : (
                                                <Badge variant="secondary">Опциональное</Badge>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {category.parent ? (
                                                <div className="flex items-center gap-1.5">
                                                    <Badge variant="outline" className="font-normal text-muted-foreground">
                                                        {category.parent.name}
                                                    </Badge>
                                                </div>
                                            ) : (
                                                <span className="text-muted-foreground text-sm">-</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleOpenDialog(category)}>
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDelete(category.id)}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingCategory ? "Редактировать категорию" : "Новая категория"}</DialogTitle>
                        <DialogDescription>
                            Заполните параметры категории оборудования. Код должен быть уникальным.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Название</Label>
                            <Input
                                id="name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                required
                                placeholder="Например: Сервер 1U"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="code">Системный Код</Label>
                            <Input
                                id="code"
                                value={formData.code}
                                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '') })}
                                required
                                placeholder="SERVER_1U"
                                disabled={!!editingCategory} // Code immutable after creation usually
                            />
                            <p className="text-xs text-muted-foreground">Только латинские буквы, цифры и подчеркивание</p>
                        </div>

                        <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
                            <div className="space-y-0.5">
                                <Label>Обязательное оборудование</Label>
                                <p className="text-xs text-muted-foreground">
                                    Наличие оборудования этой категории требуется для открытия магазина
                                </p>
                            </div>
                            <Switch
                                checked={formData.isMandatory}
                                onCheckedChange={(checked) => {
                                    setFormData({
                                        ...formData,
                                        isMandatory: checked,
                                        parentId: checked ? "none" : formData.parentId // Reset parent if mandatory
                                    });
                                }}
                            />
                        </div>

                        {!formData.isMandatory && (
                            <div className="space-y-2">
                                <Label>Родительская категория</Label>
                                <Select
                                    value={formData.parentId}
                                    onValueChange={(value) => setFormData({ ...formData, parentId: value })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Выберите родителя" />
                                    </SelectTrigger>
                                    <SelectContent className="max-h-[200px]">
                                        <SelectItem value="none">По умолчанию (Сопутствующее)</SelectItem>
                                        {categories?.filter(c => c.isMandatory && c.id !== editingCategory?.id).map((c) => (
                                            <SelectItem key={c.id} value={c.id}>
                                                {c.name} ({c.code})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <p className="text-xs text-muted-foreground">
                                    Если не выбрано, категория будет помечена как "Сопутствующее"
                                </p>
                            </div>
                        )}

                        <DialogFooter>
                            <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)}>
                                Отмена
                            </Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Сохранить
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </Card>
    );
}
