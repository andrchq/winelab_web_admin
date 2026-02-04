"use client";

import { cn } from "@/lib/utils";
import {
    Package,
    Truck,
    MapPin,
    CheckCircle2,
    Clock,
    User,
    Phone,
    AlertCircle,
    Navigation
} from "lucide-react";

interface TimelineEvent {
    id: string;
    timestamp: string;
    title: string;
    description?: string;
    status: "completed" | "current" | "pending" | "error";
    type: "internal" | "delivery";
}

interface DeliveryTimelineProps {
    events: TimelineEvent[];
    className?: string;
}

const statusIcons = {
    completed: CheckCircle2,
    current: Truck,
    pending: Clock,
    error: AlertCircle,
};

const statusColors = {
    completed: "bg-emerald-500 text-white",
    current: "bg-primary text-primary-foreground animate-pulse-subtle",
    pending: "bg-muted text-muted-foreground",
    error: "bg-destructive text-destructive-foreground",
};

const lineColors = {
    completed: "bg-emerald-500",
    current: "bg-primary",
    pending: "bg-border",
    error: "bg-destructive",
};

export function DeliveryTimeline({ events, className }: DeliveryTimelineProps) {
    return (
        <div className={cn("relative", className)}>
            {events.map((event, index) => {
                const Icon = statusIcons[event.status];
                const isLast = index === events.length - 1;

                return (
                    <div key={event.id} className="relative flex gap-4 pb-8 last:pb-0">
                        {/* Vertical line */}
                        {!isLast && (
                            <div
                                className={cn(
                                    "absolute left-[15px] top-8 h-full w-0.5",
                                    lineColors[event.status === "completed" ? "completed" : "pending"]
                                )}
                            />
                        )}

                        {/* Icon */}
                        <div
                            className={cn(
                                "relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-all duration-300",
                                statusColors[event.status]
                            )}
                        >
                            <Icon className="h-4 w-4" />
                        </div>

                        {/* Content */}
                        <div className="flex-1 pt-0.5">
                            <div className="flex items-center justify-between">
                                <p className={cn(
                                    "font-medium",
                                    event.status === "pending" && "text-muted-foreground"
                                )}>
                                    {event.title}
                                </p>
                                <span className="text-xs text-muted-foreground">
                                    {event.timestamp}
                                </span>
                            </div>
                            {event.description && (
                                <p className="mt-1 text-sm text-muted-foreground">
                                    {event.description}
                                </p>
                            )}
                            {event.type === "delivery" && event.status === "current" && (
                                <div className="mt-2 flex items-center gap-4 text-sm">
                                    <span className="flex items-center gap-1 text-primary">
                                        <Navigation className="h-3 w-3" />
                                        Отслеживать на карте
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

// Компонент для полной карточки доставки с таймлайном
interface DeliveryDetailCardProps {
    delivery: {
        id: string;
        destination: string;
        address: string;
        courier?: {
            name: string;
            phone: string;
        };
        eta?: string;
        provider: string;
    };
    events: TimelineEvent[];
}

export function DeliveryDetailCard({ delivery, events }: DeliveryDetailCardProps) {
    return (
        <div className="space-y-6">
            {/* Delivery Info Header */}
            <div className="flex items-start justify-between">
                <div>
                    <div className="flex items-center gap-2">
                        <span className="font-mono text-sm text-muted-foreground">{delivery.id}</span>
                        <span className="rounded bg-secondary px-2 py-0.5 text-xs">{delivery.provider}</span>
                    </div>
                    <h3 className="mt-1 text-lg font-semibold">{delivery.destination}</h3>
                    <p className="flex items-center gap-1 text-sm text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        {delivery.address}
                    </p>
                </div>
                {delivery.eta && (
                    <div className="rounded-lg bg-primary/10 px-3 py-2 text-right">
                        <p className="text-xs text-muted-foreground">ETA</p>
                        <p className="font-medium text-primary">{delivery.eta}</p>
                    </div>
                )}
            </div>

            {/* Courier Info */}
            {delivery.courier && (
                <div className="flex items-center gap-4 rounded-lg border border-border/50 bg-card p-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                        <User className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                        <p className="font-medium">{delivery.courier.name}</p>
                        <p className="text-sm text-muted-foreground">Курьер</p>
                    </div>
                    <a
                        href={`tel:${delivery.courier.phone}`}
                        className="flex items-center gap-2 rounded-lg bg-emerald-500/10 px-3 py-2 text-emerald-500 transition-colors hover:bg-emerald-500/20"
                    >
                        <Phone className="h-4 w-4" />
                        <span className="text-sm font-medium">{delivery.courier.phone}</span>
                    </a>
                </div>
            )}

            {/* Timeline */}
            <div>
                <h4 className="mb-4 text-sm font-medium text-muted-foreground">История доставки</h4>
                <DeliveryTimeline events={events} />
            </div>
        </div>
    );
}
