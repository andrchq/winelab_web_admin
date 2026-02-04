import * as React from "react";
import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";

const inputVariants = cva(
    "flex w-full rounded-lg border bg-background text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200",
    {
        variants: {
            variant: {
                default: "border-input hover:border-muted-foreground/50",
                ghost: "border-transparent bg-muted/50 hover:bg-muted",
                filled: "border-transparent bg-muted hover:bg-muted/80",
            },
            inputSize: {
                default: "h-10 px-3 py-2",
                sm: "h-9 px-3 py-1 text-xs",
                lg: "h-12 px-4 py-3",
            },
        },
        defaultVariants: {
            variant: "default",
            inputSize: "default",
        },
    }
);

export interface InputProps
    extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size">,
    VariantProps<typeof inputVariants> {
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
    error?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ className, type, variant, inputSize, leftIcon, rightIcon, error, ...props }, ref) => {
        if (leftIcon || rightIcon) {
            return (
                <div className="relative w-full">
                    {leftIcon && (
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
                            {leftIcon}
                        </span>
                    )}
                    <input
                        type={type}
                        className={cn(
                            inputVariants({ variant, inputSize }),
                            leftIcon && "pl-10",
                            rightIcon && "pr-10",
                            error && "border-destructive focus-visible:ring-destructive",
                            className
                        )}
                        ref={ref}
                        {...props}
                    />
                    {rightIcon && (
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
                            {rightIcon}
                        </span>
                    )}
                </div>
            );
        }

        return (
            <input
                type={type}
                className={cn(
                    inputVariants({ variant, inputSize }),
                    error && "border-destructive focus-visible:ring-destructive",
                    className
                )}
                ref={ref}
                {...props}
            />
        );
    }
);
Input.displayName = "Input";

// Search Input - Pre-styled input with search icon
const SearchInput = React.forwardRef<HTMLInputElement, Omit<InputProps, "leftIcon" | "type">>(
    ({ className, ...props }, ref) => {
        return (
            <Input
                type="search"
                leftIcon={
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <circle cx="11" cy="11" r="8" />
                        <path d="m21 21-4.3-4.3" />
                    </svg>
                }
                className={cn("pr-3", className)}
                ref={ref}
                {...props}
            />
        );
    }
);
SearchInput.displayName = "SearchInput";

export { Input, SearchInput, inputVariants };
