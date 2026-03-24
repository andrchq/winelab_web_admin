import { useState } from "react";
import { Box, Loader2, Plus } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

interface AddConsumablesDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    shipmentId: string;
    warehouseId: string;
    onSuccess: (data: unknown) => void;
    categories: any[];
    products: any[];
}

export function AddConsumablesDialog({
    open,
    onOpenChange,
    shipmentId,
    warehouseId,
    onSuccess,
    categories,
    products,
}: AddConsumablesDialogProps) {
    const [productId, setProductId] = useState("");
    const [quantity, setQuantity] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const consumableCategoryParent = categories?.find(
        (category) => category.name.toLowerCase().includes("расход") && !category.parentId,
    );
    const consumableCategories =
        categories?.filter(
            (category) =>
                category.parentId === consumableCategoryParent?.id ||
                category.name.toLowerCase().includes("кабель") ||
                category.name.toLowerCase().includes("патч"),
        ) || [];
    const consumableCategoryIds = consumableCategories.map((category) => category.id);

    const availableConsumables =
        products?.filter(
            (product) =>
                consumableCategoryIds.includes(product.categoryId) ||
                product.category?.name?.toLowerCase().includes("расход") ||
                product.category?.name?.toLowerCase().includes("кабель"),
        ) || [];

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();

        if (!productId) {
            toast.error("Выберите расходник");
            return;
        }

        if (quantity < 1) {
            toast.error("Укажите корректное количество");
            return;
        }

        setIsSubmitting(true);

        try {
            const data = await api.post(`/shipments/${shipmentId}/consumables`, {
                productId,
                quantity,
                warehouseId,
            });

            toast.success(`Расходники добавлены (${quantity} шт.)`);
            onSuccess(data);
            onOpenChange(false);
            setProductId("");
            setQuantity(1);
        } catch (error: any) {
            toast.error(error.message || "Не удалось добавить расходники");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Box className="h-5 w-5 text-primary" />
                            Добавить расходники
                        </DialogTitle>
                        <DialogDescription>
                            Расходные материалы будут сразу списаны со склада отправителя и добавлены в текущую отгрузку.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="product">
                                Товар <span className="text-destructive">*</span>
                            </Label>
                            <Select value={productId} onValueChange={setProductId} disabled={isSubmitting}>
                                <SelectTrigger id="product">
                                    <SelectValue placeholder="Выберите товар..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {availableConsumables.map((product) => (
                                        <SelectItem key={product.id} value={product.id}>
                                            {product.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {availableConsumables.length === 0 && (
                                <p className="text-xs text-muted-foreground">
                                    В доступных категориях пока нет расходников.
                                </p>
                            )}
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="quantity">
                                Количество <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                id="quantity"
                                type="number"
                                min={1}
                                step={1}
                                value={quantity}
                                onChange={(event) => setQuantity(parseInt(event.target.value, 10) || 0)}
                                disabled={isSubmitting}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                            Отмена
                        </Button>
                        <Button type="submit" disabled={isSubmitting || !productId || quantity < 1}>
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Добавление...
                                </>
                            ) : (
                                <>
                                    <Plus className="mr-2 h-4 w-4" />
                                    Добавить в отгрузку
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
