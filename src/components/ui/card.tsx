import * as React from "react";
import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";

const cardVariants = cva(
    "rounded-xl border text-card-foreground transition-all duration-300",
    {
        variants: {
            variant: {
                default: "bg-card border-border/50 shadow-sm hover:shadow-md",
                elevated: "bg-card border-border/30 shadow-md hover:shadow-lg",
                glass: "glass-card",
                stat: "stat-card",
                outline: "bg-transparent border-border hover:border-primary/50",
                ghost: "bg-transparent border-transparent hover:bg-muted/50",
            },
        },
        defaultVariants: {
            variant: "default",
        },
    }
);

export interface CardProps
    extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {
    interactive?: boolean;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
    ({ className, variant, interactive, ...props }, ref) => (
        <div
            ref={ref}
            className={cn(
                cardVariants({ variant }),
                interactive && "cursor-pointer hover:scale-[1.01] active:scale-[0.99]",
                className
            )}
            {...props}
        />
    )
);
Card.displayName = "Card";

const CardHeader = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
    <div
        ref={ref}
        className={cn("flex flex-col space-y-1.5 p-5", className)}
        {...props}
    />
));
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<
    HTMLParagraphElement,
    React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
    <h3
        ref={ref}
        className={cn(
            "text-lg font-semibold leading-none tracking-tight",
            className
        )}
        {...props}
    />
));
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<
    HTMLParagraphElement,
    React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
    <p
        ref={ref}
        className={cn("text-sm text-muted-foreground", className)}
        {...props}
    />
));
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
    <div ref={ref} className={cn("p-5 pt-0", className)} {...props} />
));
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
    <div
        ref={ref}
        className={cn("flex items-center p-5 pt-0", className)}
        {...props}
    />
));
CardFooter.displayName = "CardFooter";

// New: StatCard component for dashboard statistics
interface StatCardProps extends React.HTMLAttributes<HTMLDivElement> {
    title: string;
    value: string | number;
    subtitle?: string;
    trend?: {
        value: number;
        label?: string;
    };
    icon?: React.ReactNode;
    status?: "success" | "warning" | "danger" | "accent" | "default";
}

const StatCard = React.forwardRef<HTMLDivElement, StatCardProps>(
    ({ className, title, value, subtitle, trend, icon, status = "default", ...props }, ref) => {
        const statusClass = status !== "default" ? `stat-card-${status}` : "";

        return (
            <div
                ref={ref}
                className={cn("stat-card", statusClass, className)}
                {...props}
            >
                <div className="flex items-start justify-between">
                    <div className="flex-1">
                        <p className="text-sm font-medium text-muted-foreground">{title}</p>
                        <p className="stat-value mt-1 text-foreground">{value}</p>
                        {subtitle && (
                            <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
                        )}
                        {trend && (
                            <div className="mt-3">
                                <span
                                    className={cn(
                                        "stat-trend",
                                        trend.value > 0 && "stat-trend-up",
                                        trend.value < 0 && "stat-trend-down",
                                        trend.value === 0 && "stat-trend-neutral"
                                    )}
                                >
                                    {trend.value > 0 ? "↑" : trend.value < 0 ? "↓" : "→"}
                                    {Math.abs(trend.value)}%
                                    {trend.label && <span className="ml-1 opacity-75">{trend.label}</span>}
                                </span>
                            </div>
                        )}
                    </div>
                    {icon && (
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            {icon}
                        </div>
                    )}
                </div>
            </div>
        );
    }
);
StatCard.displayName = "StatCard";

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent, StatCard, cardVariants };
