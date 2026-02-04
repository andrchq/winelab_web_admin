
import { Settings, Key, Shield, Bell, Globe, Save, CheckCircle2, Plug, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export default function SettingsPage() {
    return (
        <div className="p-6 h-full">
            <div className="space-y-6 max-w-4xl">
                {/* Page Header */}
                <div>
                    <h1 className="text-2xl font-bold">Настройки</h1>
                    <p className="text-sm text-muted-foreground mt-1">Конфигурация системы и интеграций</p>
                </div>

                {/* Integrations */}
                <Card variant="elevated">
                    <CardHeader className="pb-4">
                        <CardTitle className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                                <Globe className="h-4 w-4 text-primary" />
                            </div>
                            Интеграции
                        </CardTitle>
                        <CardDescription>Настройка внешних сервисов</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="flex items-center justify-between p-4 rounded-xl border border-border/50 bg-muted/20 hover:bg-muted/40 transition-colors">
                            <div className="flex items-center gap-4">
                                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-warning/10">
                                    <span className="text-warning font-bold text-lg">Я</span>
                                </div>
                                <div>
                                    <p className="font-medium">Яндекс.Доставка</p>
                                    <p className="text-sm text-muted-foreground">API для создания и отслеживания доставок</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <Badge variant="success" dot>Подключено</Badge>
                                <Button variant="outline" size="sm">
                                    <Settings className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>

                        <div className="flex items-center justify-between p-4 rounded-xl border border-border/50 bg-muted/20 hover:bg-muted/40 transition-colors">
                            <div className="flex items-center gap-4">
                                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-info/10">
                                    <span className="text-info font-bold text-lg">M</span>
                                </div>
                                <div>
                                    <p className="font-medium">Major Express</p>
                                    <p className="text-sm text-muted-foreground">Альтернативный провайдер доставки</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <Badge variant="secondary">Не настроено</Badge>
                                <Button variant="outline" size="sm">
                                    <Plug className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>

                        <div className="flex items-center justify-between p-4 rounded-xl border border-border/50 bg-muted/20 hover:bg-muted/40 transition-colors">
                            <div className="flex items-center gap-4">
                                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10">
                                    <span className="text-accent font-bold text-lg">TG</span>
                                </div>
                                <div>
                                    <p className="font-medium">Telegram Bot</p>
                                    <p className="text-sm text-muted-foreground">Уведомления и approve-login</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <Badge variant="success" dot>Подключено</Badge>
                                <Button variant="outline" size="sm">
                                    <Settings className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* API Keys */}
                <Card variant="elevated">
                    <CardHeader className="pb-4">
                        <CardTitle className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-lg bg-warning/10 flex items-center justify-center">
                                <Key className="h-4 w-4 text-warning" />
                            </div>
                            API Ключи
                        </CardTitle>
                        <CardDescription>Управление секретами интеграций</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Yandex Delivery API Key</label>
                            <div className="flex gap-2">
                                <Input type="password" value="••••••••••••••••" readOnly className="font-mono" />
                                <Button variant="outline">Изменить</Button>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Telegram Bot Token</label>
                            <div className="flex gap-2">
                                <Input type="password" value="••••••••••••••••" readOnly className="font-mono" />
                                <Button variant="outline">Изменить</Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Security */}
                <Card variant="elevated">
                    <CardHeader className="pb-4">
                        <CardTitle className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-lg bg-success/10 flex items-center justify-center">
                                <Shield className="h-4 w-4 text-success" />
                            </div>
                            Безопасность
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="flex items-center justify-between p-4 rounded-xl border border-border/50 bg-muted/20">
                            <div className="flex items-center gap-3">
                                <CheckCircle2 className="h-5 w-5 text-success" />
                                <div>
                                    <p className="font-medium">Двухфакторная аутентификация</p>
                                    <p className="text-sm text-muted-foreground">Обязательна для администраторов</p>
                                </div>
                            </div>
                            <Badge variant="success" dot>Включено</Badge>
                        </div>
                        <div className="flex items-center justify-between p-4 rounded-xl border border-border/50 bg-muted/20">
                            <div className="flex items-center gap-3">
                                <CheckCircle2 className="h-5 w-5 text-success" />
                                <div>
                                    <p className="font-medium">Rate Limiting</p>
                                    <p className="text-sm text-muted-foreground">Защита от brute force</p>
                                </div>
                            </div>
                            <Badge variant="success" dot>Активно</Badge>
                        </div>
                        <div className="flex items-center justify-between p-4 rounded-xl border border-border/50 bg-muted/20">
                            <div className="flex items-center gap-3">
                                <ExternalLink className="h-5 w-5 text-muted-foreground" />
                                <div>
                                    <p className="font-medium">Аудит логи</p>
                                    <p className="text-sm text-muted-foreground">Хранение 90 дней</p>
                                </div>
                            </div>
                            <Button variant="outline" size="sm">Просмотреть</Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Notifications */}
                <Card variant="elevated">
                    <CardHeader className="pb-4">
                        <CardTitle className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-lg bg-info/10 flex items-center justify-center">
                                <Bell className="h-4 w-4 text-info" />
                            </div>
                            Уведомления
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="flex items-center justify-between p-4 rounded-xl border border-border/50 bg-muted/20">
                            <div>
                                <p className="font-medium">SLA алерты</p>
                                <p className="text-sm text-muted-foreground">При просрочке доставки/установки</p>
                            </div>
                            <Badge variant="success" dot>Включено</Badge>
                        </div>
                        <div className="flex items-center justify-between p-4 rounded-xl border border-border/50 bg-muted/20">
                            <div>
                                <p className="font-medium">Низкий остаток</p>
                                <p className="text-sm text-muted-foreground">Когда остаток ниже минимума</p>
                            </div>
                            <Badge variant="success" dot>Включено</Badge>
                        </div>
                    </CardContent>
                </Card>

                <Button variant="gradient" size="lg" className="w-full">
                    <Save className="h-4 w-4" />
                    Сохранить изменения
                </Button>
            </div>
        </div>
    );
}
