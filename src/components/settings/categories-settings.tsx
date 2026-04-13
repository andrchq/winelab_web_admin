"use client";

import { useMemo, useState } from "react";
import { Loader2, FolderTree, Pencil, Plus, Search, Settings as SettingsIcon, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api";
import { useCategories } from "@/lib/hooks";
import type { EquipmentCategory } from "@/types/api";
import { useAuth } from "@/contexts/AuthContext";

type CategoryType = EquipmentCategory["categoryType"];

type CategoryFormState = {
    name: string;
    code: string;
    categoryType: CategoryType;
    parentId: string;
};

const EMPTY_PARENT = "none";

const CATEGORY_TYPE_OPTIONS: Array<{
    value: CategoryType;
    label: string;
    description: string;
}> = [
    {
        value: "REQUIRED",
        label: "Обязательная",
        description: "Категория участвует в обязательном наборе для открытия магазина.",
    },
    {
        value: "OPTIONAL",
        label: "Необязательная",
        description: "Оборудование имеет свою категорию и ШК-учет, но не требуется для открытия магазина.",
    },
    {
        value: "ACCESSORY",
        label: "Сопутствующая",
        description: "Количественная сопутка и расходники без поштучного ШК-учета.",
    },
];

const DEFAULT_FORM: CategoryFormState = {
    name: "",
    code: "",
    categoryType: "OPTIONAL",
    parentId: EMPTY_PARENT,
};

function getCategoryTypeMeta(categoryType: CategoryType) {
    switch (categoryType) {
        case "REQUIRED":
            return {
                label: "Обязательное",
                className: "bg-red-500/10 text-red-600 hover:bg-red-500/20 border-red-500/20",
            };
        case "ACCESSORY":
            return {
                label: "Сопутствующее",
                className: "bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 border-amber-500/20",
            };
        default:
            return {
                label: "Необязательное",
                className: "bg-sky-500/10 text-sky-600 hover:bg-sky-500/20 border-sky-500/20",
            };
    }
}

function normalizeForm(category?: EquipmentCategory): CategoryFormState {
    if (!category) {
        return DEFAULT_FORM;
    }

    return {
        name: category.name,
        code: category.code,
        categoryType: category.categoryType ?? (category.isMandatory ? "REQUIRED" : "OPTIONAL"),
        parentId: category.parentId || EMPTY_PARENT,
    };
}

export function CategoriesSettings() {
    const { data: categories, isLoading, refetch } = useCategories();
    const { hasRole } = useAuth();

    const [search, setSearch] = useState("");
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<EquipmentCategory | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState<CategoryFormState>(DEFAULT_FORM);

    const canDelete = hasRole(["ADMIN", "MANAGER"]);

    const filteredCategories = useMemo(() => {
        const query = search.trim().toLowerCase();
        if (!query) {
            return categories;
        }

        return categories.filter((category) =>
            category.name.toLowerCase().includes(query) ||
            category.code.toLowerCase().includes(query),
        );
    }, [categories, search]);

    const parentOptions = useMemo(() => {
        return categories
            .filter((category) =>
                category.id !== editingCategory?.id &&
                category.categoryType === formData.categoryType,
            )
            .sort((a, b) => a.name.localeCompare(b.name, "ru"));
    }, [categories, editingCategory?.id, formData.categoryType]);

    const handleOpenDialog = (category?: EquipmentCategory) => {
        setEditingCategory(category ?? null);
        setFormData(normalizeForm(category));
        setIsDialogOpen(true);
    };

    const handleTypeChange = (categoryType: CategoryType) => {
        const nextParentId = categories.some((category) =>
            category.id === formData.parentId &&
            category.id !== editingCategory?.id &&
            category.categoryType === categoryType,
        )
            ? formData.parentId
            : EMPTY_PARENT;

        setFormData((prev) => ({
            ...prev,
            categoryType,
            parentId: nextParentId,
        }));
    };

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setIsSubmitting(true);

        try {
            const payload = {
                name: formData.name.trim(),
                code: formData.code.trim(),
                categoryType: formData.categoryType,
                parentId: formData.parentId === EMPTY_PARENT ? null : formData.parentId,
            };

            if (editingCategory) {
                await api.patch(`/categories/${editingCategory.id}`, payload);
                toast.success("Категория обновлена");
            } else {
                await api.post("/categories", payload);
                toast.success("Категория создана");
            }

            await refetch();
            setIsDialogOpen(false);
        } catch (error) {
            console.error(error);
            toast.error("Не удалось сохранить категорию");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Удалить категорию? Действие необратимо.")) {
            return;
        }

        try {
            await api.delete(`/categories/${id}`);
            toast.success("Категория удалена");
            await refetch();
        } catch (error) {
            console.error(error);
            toast.error("Не удалось удалить категорию");
        }
    };

    return (
        <Card variant="elevated">
            <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                        <SettingsIcon className="h-4 w-4 text-primary" />
                    </div>
                    Категории оборудования
                </CardTitle>
                <CardDescription>
                    Управление категориями обязательного, необязательного и сопутствующего оборудования.
                </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
                <div className="flex flex-col gap-3 sm:flex-row">
                    <div className="relative flex-1">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            className="pl-9"
                            placeholder="Поиск категорий..."
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                        />
                    </div>
                    <Button className="shrink-0" onClick={() => handleOpenDialog()}>
                        <Plus className="mr-2 h-4 w-4" />
                        Добавить категорию
                    </Button>
                </div>

                <div className="hidden overflow-x-auto rounded-md border md:block">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Название</th>
                                <th>Код (system)</th>
                                <th>Тип</th>
                                <th>Родительская категория</th>
                                <th className="w-[100px]">Действия</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td colSpan={5} className="py-8 text-center">
                                        <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                                    </td>
                                </tr>
                            ) : filteredCategories.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="py-8 text-center text-muted-foreground">
                                        Категории не найдены
                                    </td>
                                </tr>
                            ) : (
                                filteredCategories.map((category) => {
                                    const typeMeta = getCategoryTypeMeta(category.categoryType);

                                    return (
                                        <tr key={category.id}>
                                            <td className="font-medium">{category.name}</td>
                                            <td className="font-mono text-xs">{category.code}</td>
                                            <td>
                                                <Badge variant="outline" className={typeMeta.className}>
                                                    {typeMeta.label}
                                                </Badge>
                                            </td>
                                            <td>
                                                {category.parent ? (
                                                    <Badge variant="outline" className="font-normal text-muted-foreground">
                                                        {category.parent.name}
                                                    </Badge>
                                                ) : (
                                                    <span className="text-sm text-muted-foreground">-</span>
                                                )}
                                            </td>
                                            <td>
                                                <div className="flex items-center gap-1">
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        className="h-8 w-8"
                                                        onClick={() => handleOpenDialog(category)}
                                                    >
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                    {canDelete && (
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                                            onClick={() => handleDelete(category.id)}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="space-y-3 md:hidden">
                    {isLoading ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : filteredCategories.length === 0 ? (
                        <p className="py-8 text-center text-muted-foreground">Категории не найдены</p>
                    ) : (
                        filteredCategories.map((category) => {
                            const typeMeta = getCategoryTypeMeta(category.categoryType);

                            return (
                                <div key={category.id} className="space-y-3 rounded-lg border bg-muted/10 p-4">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex min-w-0 items-center gap-2">
                                            <FolderTree className="h-4 w-4 shrink-0 text-muted-foreground" />
                                            <span className="truncate font-medium">{category.name}</span>
                                        </div>
                                        <div className="flex shrink-0 items-center gap-1">
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                className="h-7 w-7"
                                                onClick={() => handleOpenDialog(category)}
                                            >
                                                <Pencil className="h-3.5 w-3.5" />
                                            </Button>
                                            {canDelete && (
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-7 w-7 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                                    onClick={() => handleDelete(category.id)}
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-2">
                                        <code className="rounded bg-muted px-2 py-0.5 text-xs">{category.code}</code>
                                        <Badge variant="outline" className={typeMeta.className}>
                                            {typeMeta.label}
                                        </Badge>
                                        {category.parent && (
                                            <Badge variant="outline" className="font-normal text-muted-foreground">
                                                {category.parent.name}
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </CardContent>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>
                            {editingCategory ? "Редактировать категорию" : "Новая категория"}
                        </DialogTitle>
                        <DialogDescription>
                            Укажите тип категории. Родитель и дочерняя категория должны быть одного типа.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSubmit} className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="category-name">Название</Label>
                            <Input
                                id="category-name"
                                value={formData.name}
                                onChange={(event) => setFormData((prev) => ({ ...prev, name: event.target.value }))}
                                placeholder="Например: МФУ"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="category-code">Системный код</Label>
                            <Input
                                id="category-code"
                                value={formData.code}
                                onChange={(event) =>
                                    setFormData((prev) => ({
                                        ...prev,
                                        code: event.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ""),
                                    }))
                                }
                                placeholder="MFU"
                                disabled={Boolean(editingCategory)}
                                required
                            />
                            <p className="text-xs text-muted-foreground">
                                Только латинские буквы, цифры и подчеркивание.
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label>Тип категории</Label>
                            <Select value={formData.categoryType} onValueChange={(value) => handleTypeChange(value as CategoryType)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Выберите тип" />
                                </SelectTrigger>
                                <SelectContent>
                                    {CATEGORY_TYPE_OPTIONS.map((option) => (
                                        <SelectItem key={option.value} value={option.value}>
                                            {option.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">
                                {CATEGORY_TYPE_OPTIONS.find((option) => option.value === formData.categoryType)?.description}
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label>Родительская категория</Label>
                            <Select
                                value={formData.parentId}
                                onValueChange={(value) => setFormData((prev) => ({ ...prev, parentId: value }))}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Без родителя" />
                                </SelectTrigger>
                                <SelectContent className="max-h-[220px]">
                                    <SelectItem value={EMPTY_PARENT}>Без родителя</SelectItem>
                                    {parentOptions.map((category) => (
                                        <SelectItem key={category.id} value={category.id}>
                                            {category.name} ({category.code})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">
                                В качестве родителя доступны только категории того же типа.
                            </p>
                        </div>

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
