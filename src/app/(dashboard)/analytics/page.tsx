
import { BarChart3, TrendingUp, TrendingDown, Clock, Activity, Target, Zap, Timer } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, StatCard } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const kpis = [
    { title: "Среднее время доставки", value: "2.3 ч", change: -15, trend: "up", icon: <Timer className="h-5 w-5" /> },
    { title: "Заявок в день (avg)", value: "18", change: 8, trend: "up", icon: <Activity className="h-5 w-5" /> },
    { title: "SLA выполнение", value: "94%", change: -2, trend: "down", icon: <Target className="h-5 w-5" /> },
    { title: "Оборачиваемость склада", value: "12 дн", change: 5, trend: "down", icon: <Zap className="h-5 w-5" /> },
];

const forecasts = [
    { name: "Роутер X500", current: 45, predicted: 12, daysToStockout: 8, recommended: 50, priority: "HIGH" },
    { name: "POS-терминал Pro", current: 28, predicted: 6, daysToStockout: 14, recommended: 20, priority: "MEDIUM" },
    { name: "Сканер штрих-кодов", current: 67, predicted: 15, daysToStockout: 21, recommended: 0, priority: "LOW" },
    { name: "Термобумага 80мм", current: 12, predicted: 25, daysToStockout: 3, recommended: 100, priority: "CRITICAL" },
];

const priorityConfig: Record<string, { variant: "destructive" | "warning" | "info" | "secondary", label: string }> = {
    CRITICAL: { variant: "destructive", label: "Критический" },
    HIGH: { variant: "warning", label: "Высокий" },
    MEDIUM: { variant: "info", label: "Средний" },
    LOW: { variant: "secondary", label: "Низкий" },
};

export default function AnalyticsPage() {
    return (
        <div className="p-6 h-full">
            <div className="space-y-6">
                {/* Page Header */}
                <div>
                    <h1 className="text-2xl font-bold">Аналитика</h1>
                    <p className="text-sm text-muted-foreground mt-1">KPI, прогнозы и рекомендации по пополнению</p>
                </div>

                {/* KPI Cards */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 animate-stagger">
                    {kpis.map((kpi) => (
                        <StatCard
                            key={kpi.title}
                            title={kpi.title}
                            value={kpi.value}
                            trend={{ value: kpi.change, label: "vs прошлый" }}
                            icon={kpi.icon}
                            status={kpi.trend === "up" ? "success" : "warning"}
                        />
                    ))}
                </div>

                {/* Forecast Table */}
                <Card variant="elevated">
                    <CardHeader className="pb-4">
                        <CardTitle className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                                <BarChart3 className="h-4 w-4 text-primary" />
                            </div>
                            Прогноз пополнения
                        </CardTitle>
                        <CardDescription>
                            Анализ на основе среднего расхода за 30 дней
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Приоритет</th>
                                        <th>Наименование</th>
                                        <th>Текущий остаток</th>
                                        <th>Расход/нед</th>
                                        <th>Дней до 0</th>
                                        <th>Рекомендация</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {forecasts.map((item, index) => (
                                        <tr
                                            key={item.name}
                                            className="animate-fade-in"
                                            style={{ animationDelay: `${index * 50}ms` }}
                                        >
                                            <td>
                                                <Badge variant={priorityConfig[item.priority].variant} dot>
                                                    {priorityConfig[item.priority].label}
                                                </Badge>
                                            </td>
                                            <td className="font-medium">{item.name}</td>
                                            <td>{item.current} шт</td>
                                            <td className="text-muted-foreground">{item.predicted} шт</td>
                                            <td>
                                                <span className={`flex items-center gap-1 ${item.daysToStockout <= 7 ? "text-destructive" :
                                                    item.daysToStockout <= 14 ? "text-warning" : "text-muted-foreground"
                                                    }`}>
                                                    <Clock className="h-4 w-4" />
                                                    {item.daysToStockout} дн
                                                </span>
                                            </td>
                                            <td>
                                                {item.recommended > 0 ? (
                                                    <span className="text-success font-medium">+{item.recommended} шт</span>
                                                ) : (
                                                    <span className="text-muted-foreground">—</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>

                {/* Charts Placeholder */}
                <div className="grid gap-6 lg:grid-cols-2">
                    <Card>
                        <CardHeader className="pb-4">
                            <CardTitle className="flex items-center gap-2">
                                <div className="h-8 w-8 rounded-lg bg-info/10 flex items-center justify-center">
                                    <TrendingUp className="h-4 w-4 text-info" />
                                </div>
                                Динамика заявок
                            </CardTitle>
                            <CardDescription>За последние 30 дней</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex h-[200px] items-center justify-center rounded-xl border border-dashed border-border bg-muted/20">
                                <p className="text-muted-foreground text-sm">График заявок (интеграция с Recharts)</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-4">
                            <CardTitle className="flex items-center gap-2">
                                <div className="h-8 w-8 rounded-lg bg-success/10 flex items-center justify-center">
                                    <Timer className="h-4 w-4 text-success" />
                                </div>
                                Время доставки
                            </CardTitle>
                            <CardDescription>Распределение по дням</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex h-[200px] items-center justify-center rounded-xl border border-dashed border-border bg-muted/20">
                                <p className="text-muted-foreground text-sm">График времени доставки</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
