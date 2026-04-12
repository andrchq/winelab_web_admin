import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRoles, useWarehouses } from "@/lib/hooks";
import { Role, User } from "@/types/api";
import { Copy, Loader2, RefreshCw } from "lucide-react";

interface UserDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    user?: User | null;
    onSave: (data: FormData) => Promise<void>;
}

interface FormData {
    name: string;
    email: string;
    password?: string;
    phone?: string;
    roleId: string;
    warehouseId?: string;
    isActive: boolean;
}

const PASSWORD_LENGTH = 18;
const UPPERCASE = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const LOWERCASE = "abcdefghijkmnopqrstuvwxyz";
const DIGITS = "23456789";
const SYMBOLS = "!@#$%^&*()-_=+";

const TEXT = {
    editTitle: "\u0420\u0435\u0434\u0430\u043a\u0442\u0438\u0440\u043e\u0432\u0430\u0442\u044c \u043f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u044f",
    createTitle: "\u041d\u043e\u0432\u044b\u0439 \u043f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u044c",
    nameLabel: "\u0424\u0418\u041e",
    namePlaceholder: "\u0418\u0432\u0430\u043d\u043e\u0432 \u0418\u0432\u0430\u043d \u0418\u0432\u0430\u043d\u043e\u0432\u0438\u0447",
    nameRequired: "\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u0438\u043c\u044f",
    emailRequired: "\u0412\u0432\u0435\u0434\u0438\u0442\u0435 email",
    phoneLabel: "\u0422\u0435\u043b\u0435\u0444\u043e\u043d",
    passwordLabel: "\u041f\u0430\u0440\u043e\u043b\u044c",
    passwordRequired: "\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u043f\u0430\u0440\u043e\u043b\u044c",
    newPasswordLabel: "\u041d\u043e\u0432\u044b\u0439 \u043f\u0430\u0440\u043e\u043b\u044c (\u043d\u0435\u043e\u0431\u044f\u0437\u0430\u0442\u0435\u043b\u044c\u043d\u043e)",
    newPasswordPlaceholder: "\u041e\u0441\u0442\u0430\u0432\u044c\u0442\u0435 \u043f\u0443\u0441\u0442\u044b\u043c, \u0447\u0442\u043e\u0431\u044b \u043d\u0435 \u043c\u0435\u043d\u044f\u0442\u044c",
    roleLabel: "\u0420\u043e\u043b\u044c",
    rolePlaceholder: "\u0412\u044b\u0431\u0435\u0440\u0438\u0442\u0435 \u0440\u043e\u043b\u044c",
    rolesLoading: "\u0417\u0430\u0433\u0440\u0443\u0437\u043a\u0430 \u0440\u043e\u043b\u0435\u0439...",
    warehouseLabel: "\u0421\u043a\u043b\u0430\u0434",
    warehousePlaceholder: "\u0412\u044b\u0431\u0435\u0440\u0438\u0442\u0435 \u0441\u043a\u043b\u0430\u0434",
    warehousesLoading: "\u0417\u0430\u0433\u0440\u0443\u0437\u043a\u0430 \u0441\u043a\u043b\u0430\u0434\u043e\u0432...",
    warehouseRequired: "\u0414\u043b\u044f \u043a\u043b\u0430\u0434\u043e\u0432\u0449\u0438\u043a\u0430 \u043d\u0443\u0436\u043d\u043e \u0443\u043a\u0430\u0437\u0430\u0442\u044c \u0441\u043a\u043b\u0430\u0434",
    activeLabel: "\u0410\u043a\u0442\u0438\u0432\u0435\u043d",
    cancel: "\u041e\u0442\u043c\u0435\u043d\u0430",
    save: "\u0421\u043e\u0445\u0440\u0430\u043d\u0438\u0442\u044c",
    generateTitle: "\u0421\u0433\u0435\u043d\u0435\u0440\u0438\u0440\u043e\u0432\u0430\u0442\u044c \u043f\u0430\u0440\u043e\u043b\u044c",
    copyTitle: "\u0421\u043a\u043e\u043f\u0438\u0440\u043e\u0432\u0430\u0442\u044c \u043f\u0430\u0440\u043e\u043b\u044c",
};

function generatePassword(length = PASSWORD_LENGTH) {
    const required = [
        UPPERCASE[Math.floor(Math.random() * UPPERCASE.length)],
        LOWERCASE[Math.floor(Math.random() * LOWERCASE.length)],
        DIGITS[Math.floor(Math.random() * DIGITS.length)],
        SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
    ];
    const allChars = `${UPPERCASE}${LOWERCASE}${DIGITS}${SYMBOLS}`;
    const extra = Array.from({ length: Math.max(length - required.length, 0) }, () =>
        allChars[Math.floor(Math.random() * allChars.length)]
    );
    const result = [...required, ...extra];

    for (let i = result.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }

    return result.join("");
}

export function UserDialog({ open, onOpenChange, user, onSave }: UserDialogProps) {
    const { data: roles, isLoading: rolesLoading } = useRoles();
    const { data: warehouses, isLoading: warehousesLoading } = useWarehouses();
    const [isSaving, setIsSaving] = useState(false);
    const { register, handleSubmit, reset, setValue, setError, clearErrors, watch, formState: { errors } } = useForm<FormData>();
    const passwordValue = watch("password") || "";
    const selectedRoleId = watch("roleId") || "";
    const selectedRoleName = roles.find((role: Role) => role.id === selectedRoleId)?.name;

    useEffect(() => {
        if (!open) {
            return;
        }

        if (user) {
            setValue("name", user.name);
            setValue("email", user.email);
            setValue("phone", user.phone || "");
            setValue("password", "");

            const roleId = user.role && typeof user.role === "object" ? user.role.id : "";
            setValue("roleId", roleId);
            setValue("warehouseId", user.warehouse?.id || "");
            setValue("isActive", user.isActive);
            return;
        }

        reset({
            name: "",
            email: "",
            password: generatePassword(),
            phone: "",
            roleId: "",
            warehouseId: "",
            isActive: true,
        });
    }, [user, open, setValue, reset]);

    useEffect(() => {
        if (selectedRoleName !== "WAREHOUSE") {
            setValue("warehouseId", "");
            clearErrors("warehouseId");
        }
    }, [selectedRoleName, setValue, clearErrors]);

    const handleGeneratePassword = () => {
        setValue("password", generatePassword(), { shouldDirty: true, shouldValidate: true });
    };

    const handleCopyPassword = async () => {
        if (!passwordValue) {
            return;
        }

        try {
            await navigator.clipboard.writeText(passwordValue);
        } catch (error) {
            console.error("Failed to copy password", error);
        }
    };

    const onSubmit = async (data: FormData) => {
        if (selectedRoleName === "WAREHOUSE" && !data.warehouseId) {
            setError("warehouseId", { type: "required", message: TEXT.warehouseRequired });
            return;
        }

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

    const passwordField = (
        <div className="flex items-center gap-2">
            <Input
                id="password"
                type="text"
                className="flex-1"
                {...register("password", user ? undefined : { required: TEXT.passwordRequired })}
            />
            <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-10 w-10 shrink-0"
                onClick={handleGeneratePassword}
                title={TEXT.generateTitle}
            >
                <RefreshCw className="h-4 w-4" />
            </Button>
            <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-10 w-10 shrink-0"
                onClick={handleCopyPassword}
                title={TEXT.copyTitle}
                disabled={!passwordValue}
            >
                <Copy className="h-4 w-4" />
            </Button>
        </div>
    );

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>{user ? TEXT.editTitle : TEXT.createTitle}</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">{TEXT.nameLabel}</Label>
                        <Input
                            id="name"
                            placeholder={TEXT.namePlaceholder}
                            {...register("name", { required: TEXT.nameRequired })}
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
                                {...register("email", { required: TEXT.emailRequired })}
                            />
                            {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="phone">{TEXT.phoneLabel}</Label>
                            <Input
                                id="phone"
                                placeholder="+7 (999) 000-00-00"
                                {...register("phone")}
                            />
                        </div>
                    </div>

                    {!user && (
                        <div className="space-y-2">
                            <Label htmlFor="password">{TEXT.passwordLabel}</Label>
                            {passwordField}
                            {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
                        </div>
                    )}

                    {user && (
                        <div className="space-y-2">
                            <Label htmlFor="password">{TEXT.newPasswordLabel}</Label>
                            <div className="flex items-center gap-2">
                                <Input
                                    id="password"
                                    type="text"
                                    className="flex-1"
                                    placeholder={TEXT.newPasswordPlaceholder}
                                    {...register("password")}
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    className="h-10 w-10 shrink-0"
                                    onClick={handleGeneratePassword}
                                    title={TEXT.generateTitle}
                                >
                                    <RefreshCw className="h-4 w-4" />
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    className="h-10 w-10 shrink-0"
                                    onClick={handleCopyPassword}
                                    title={TEXT.copyTitle}
                                    disabled={!passwordValue}
                                >
                                    <Copy className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label htmlFor="role">{TEXT.roleLabel}</Label>
                        <Select
                            onValueChange={(value) => setValue("roleId", value, { shouldValidate: true, shouldDirty: true })}
                            defaultValue={user?.role && typeof user.role === "object" ? user.role.id : undefined}
                            value={selectedRoleId || undefined}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder={TEXT.rolePlaceholder} />
                            </SelectTrigger>
                            <SelectContent>
                                {rolesLoading ? (
                                    <div className="p-2 text-center text-sm text-muted-foreground">{TEXT.rolesLoading}</div>
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

                    {selectedRoleName === "WAREHOUSE" && (
                        <div className="space-y-2">
                            <Label htmlFor="warehouse">{TEXT.warehouseLabel}</Label>
                            <Select
                                onValueChange={(value) => {
                                    setValue("warehouseId", value, { shouldValidate: true, shouldDirty: true });
                                    clearErrors("warehouseId");
                                }}
                                value={watch("warehouseId") || undefined}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder={TEXT.warehousePlaceholder} />
                                </SelectTrigger>
                                <SelectContent>
                                    {warehousesLoading ? (
                                        <div className="p-2 text-center text-sm text-muted-foreground">{TEXT.warehousesLoading}</div>
                                    ) : (
                                        warehouses?.map((warehouse) => (
                                            <SelectItem key={warehouse.id} value={warehouse.id}>
                                                {warehouse.name}
                                            </SelectItem>
                                        ))
                                    )}
                                </SelectContent>
                            </Select>
                            {errors.warehouseId && <p className="text-sm text-destructive">{errors.warehouseId.message}</p>}
                        </div>
                    )}

                    <div className="flex items-center space-x-2">
                        <input
                            type="checkbox"
                            id="isActive"
                            className="h-4 w-4 rounded border-gray-300"
                            {...register("isActive")}
                        />
                        <Label htmlFor="isActive">{TEXT.activeLabel}</Label>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            {TEXT.cancel}
                        </Button>
                        <Button type="submit" disabled={isSaving}>
                            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {TEXT.save}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
