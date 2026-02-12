import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRoles } from "@/lib/hooks";
import { User, Role } from "@/types/api";
import { Loader2 } from "lucide-react";

interface UserDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    user?: User | null;
    onSave: (data: any) => Promise<void>;
}

interface FormData {
    name: string;
    email: string;
    password?: string;
    phone?: string;
    roleId: string;
    isActive: boolean;
}

export function UserDialog({ open, onOpenChange, user, onSave }: UserDialogProps) {
    const { data: roles, isLoading: rolesLoading } = useRoles();
    const [isSaving, setIsSaving] = useState(false);
    const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<FormData>();

    // Reset form when user changes or dialog opens
    useEffect(() => {
        if (user) {
            setValue("name", user.name);
            setValue("email", user.email);
            setValue("phone", user.phone || "");

            // Handle role: if object extract id, if string use as is
            const roleId = user.role && typeof user.role === 'object' ? user.role.id : '';
            // Note: if user.role is string (old data), we might not have ID match in new system without migration mapping

            setValue("roleId", roleId);
            setValue("isActive", user.isActive);
        } else {
            reset({
                name: "",
                email: "",
                password: "",
                phone: "",
                roleId: "",
                isActive: true
            });
        }
    }, [user, open, setValue, reset]);

    const onSubmit = async (data: FormData) => {
        try {
            setIsSaving(true);
            await onSave(data);
            onOpenChange(false);
        } catch (error) {
            console.error(error);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>{user ? "Редактировать пользователя" : "Новый пользователь"}</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">ФИО</Label>
                        <Input
                            id="name"
                            placeholder="Иванов Иван Иванович"
                            {...register("name", { required: "Введите имя" })}
                        />
                        {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="user@example.com"
                                {...register("email", { required: "Введите email" })}
                            />
                            {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="phone">Телефон</Label>
                            <Input
                                id="phone"
                                placeholder="+7 (999) 000-00-00"
                                {...register("phone")}
                            />
                        </div>
                    </div>

                    {!user && (
                        <div className="space-y-2">
                            <Label htmlFor="password">Пароль</Label>
                            <Input
                                id="password"
                                type="password"
                                {...register("password", { required: "Введите пароль" })}
                            />
                            {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
                        </div>
                    )}

                    {user && (
                        <div className="space-y-2">
                            <Label htmlFor="password">Новый пароль (необязательно)</Label>
                            <Input
                                id="password"
                                type="password"
                                placeholder="Оставьте пустым, чтобы не менять"
                                {...register("password")}
                            />
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label htmlFor="role">Роль</Label>
                        <Select
                            onValueChange={(value) => setValue("roleId", value)}
                            defaultValue={user?.role && typeof user.role === 'object' ? user.role.id : undefined}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Выберите роль" />
                            </SelectTrigger>
                            <SelectContent>
                                {rolesLoading ? (
                                    <div className="p-2 text-center text-sm text-muted-foreground">Загрузка ролей...</div>
                                ) : (
                                    roles?.map((role: Role) => (
                                        <SelectItem key={role.id} value={role.id}>
                                            {role.name} {role.description && <span className="text-muted-foreground text-xs ml-2">({role.description})</span>}
                                        </SelectItem>
                                    ))
                                )}
                            </SelectContent>
                        </Select>
                        {errors.roleId && <p className="text-sm text-destructive">{errors.roleId.message}</p>}
                    </div>

                    <div className="flex items-center space-x-2">
                        <input
                            type="checkbox"
                            id="isActive"
                            className="h-4 w-4 rounded border-gray-300"
                            {...register("isActive")}
                        />
                        <Label htmlFor="isActive">Активен</Label>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Отмена
                        </Button>
                        <Button type="submit" disabled={isSaving}>
                            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Сохранить
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
