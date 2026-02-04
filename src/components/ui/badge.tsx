import * as React from "react";
import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";

const badgeVariants = cva(
    "inline-flex items-center gap-1.5 rounded-full text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
    {
        variants: {
            variant: {
                default:
                    "border-transparent bg-primary/10 text-primary",
                secondary:
                    "border-transparent bg-secondary text-secondary-foreground",
                destructive:
                    "border-transparent bg-destructive/10 text-destructive",
                outline:
                    "border border-border text-foreground bg-transparent",
                success:
                    "border-transparent bg-success/10 text-success",
                warning:
                    "border-transparent bg-warning/10 text-warning",
                info:
                    "border-transparent bg-info/10 text-info",
                accent:
                    "border-transparent bg-accent/10 text-accent",
            },
            size: {
                default: "px-2.5 py-0.5",
                sm: "px-2 py-0.5 text-[10px]",
                lg: "px-3 py-1",
            },
        },
        defaultVariants: {
            variant: "default",
            size: "default",
        },
    }
);

export interface BadgeProps
    extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
    dot?: boolean;
    animated?: boolean;
}

function Badge({ className, variant, size, dot, animated, children, ...props }: BadgeProps) {
    return (
        <div
            className={cn(
                badgeVariants({ variant, size }),
                animated && "animate-pulse-subtle",
                className
            )}
            {...props}
        >
            {dot && (
                <span
                    className={cn(
                        "h-1.5 w-1.5 rounded-full flex-shrink-0",
                        {
                            "bg-primary": variant === "default" || !variant,
                            "bg-secondary-foreground": variant === "secondary",
                            "bg-destructive": variant === "destructive",
                            "bg-foreground": variant === "outline",
                            "bg-success": variant === "success",
                            "bg-warning": variant === "warning",
                            "bg-info": variant === "info",
                            "bg-accent": variant === "accent",
                        },
                        animated && "animate-pulse"
                    )}
                />
            )}
            {children}
        </div>
    );
}

// StatusBadge - Pre-styled badge with dot indicator
interface StatusBadgeProps extends Omit<BadgeProps, "variant" | "dot"> {
    status: "success" | "warning" | "danger" | "info" | "pending" | "default";
}

function StatusBadge({ status, className, ...props }: StatusBadgeProps) {
    const statusConfig = {
        success: { variant: "success" as const, label: "Активен" },
        warning: { variant: "warning" as const, label: "Ожидание" },
        danger: { variant: "destructive" as const, label: "Ошибка" },
        info: { variant: "info" as const, label: "Информация" },
        pending: { variant: "warning" as const, label: "В обработке" },
        default: { variant: "secondary" as const, label: "Нет данных" },
    };

    const config = statusConfig[status];

    return (
        <Badge
            variant={config.variant}
            dot
            className={className}
            {...props}
        />
    );
}

export { Badge, StatusBadge, badgeVariants };
