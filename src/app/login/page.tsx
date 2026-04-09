"use client";

import Image from 'next/image';
import { Russo_One } from 'next/font/google';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { getBootstrapStatus } from '@/lib/auth';
import { AlertCircle, ArrowRight, Loader2, Lock, Mail, Phone, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { BootstrapStatus } from '@/types/api';

const brandFont = Russo_One({
    subsets: ['latin', 'cyrillic'],
    weight: '400',
});

export default function LoginPage() {
    const router = useRouter();
    const {
        login,
        bootstrapAdmin,
        isLoading: authLoading,
        isAuthenticated,
    } = useAuth();

    const [bootstrapStatus, setBootstrapStatus] = useState<BootstrapStatus | null>(null);
    const [isCheckingSetup, setIsCheckingSetup] = useState(true);

    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (!authLoading && isAuthenticated) {
            router.replace('/');
        }
    }, [authLoading, isAuthenticated, router]);

    useEffect(() => {
        if (authLoading) {
            return;
        }

        let isMounted = true;

        const loadBootstrapStatus = async () => {
            setIsCheckingSetup(true);
            setError('');

            try {
                const status = await getBootstrapStatus();
                if (isMounted) {
                    setBootstrapStatus(status);
                }
            } catch (err) {
                if (isMounted) {
                    setError(err instanceof Error ? err.message : 'Не удалось определить состояние панели');
                }
            } finally {
                if (isMounted) {
                    setIsCheckingSetup(false);
                }
            }
        };

        loadBootstrapStatus();

        return () => {
            isMounted = false;
        };
    }, [authLoading]);

    const isBootstrapMode = bootstrapStatus?.requiresSetup ?? false;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (isBootstrapMode) {
            if (!name.trim()) {
                setError('Укажите имя администратора');
                return;
            }

            if (password !== confirmPassword) {
                setError('Пароли не совпадают');
                return;
            }
        }

        setIsLoading(true);

        try {
            if (isBootstrapMode) {
                await bootstrapAdmin({
                    name: name.trim(),
                    email,
                    password,
                    phone: phone.trim() || undefined,
                });
            } else {
                await login({ email, password });
            }

            router.push('/');
        } catch (err) {
            setError(err instanceof Error ? err.message : isBootstrapMode ? 'Ошибка создания администратора' : 'Ошибка входа');
        } finally {
            setIsLoading(false);
        }
    };

    if (authLoading || isCheckingSetup) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="h-12 w-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse" />
                <div
                    className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl animate-pulse"
                    style={{ animationDelay: '1s' }}
                />
            </div>

            <div className="relative w-full max-w-xl animate-fade-in">
                <div className="bg-card/80 backdrop-blur-xl border border-border/50 rounded-3xl p-10 shadow-2xl">
                    <div className="flex flex-col items-center justify-center gap-5 mb-8">
                        <Image
                            src="/logo.png"
                            alt="ВИНЛАБ"
                            width={64}
                            height={64}
                            priority
                            className="w-16 h-16 rounded-2xl object-cover shadow-lg shadow-purple-500/25"
                        />
                        <div className="text-center">
                            <h1 className={cn(brandFont.className, 'text-3xl uppercase tracking-[0.08em] text-violet-300 mb-1')}>
                                ВИНЛАБ
                            </h1>
                            <p className="text-base text-muted-foreground">Панель управления</p>
                        </div>
                    </div>

                    <div className="text-center mb-8">
                        <h2 className="text-3xl font-semibold mb-2">
                            {isBootstrapMode ? 'Создать первого администратора' : 'Добро пожаловать'}
                        </h2>
                        <p className="text-lg text-muted-foreground">
                            {isBootstrapMode
                                ? 'Панель пустая. Первый зарегистрированный пользователь получит права администратора.'
                                : 'Войдите в систему для продолжения'}
                        </p>
                    </div>

                    {error && (
                        <div className="mb-6 p-5 bg-destructive/10 border border-destructive/20 rounded-xl flex items-center gap-3 animate-fade-in">
                            <div className="h-9 w-9 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0">
                                <AlertCircle className="w-5 h-5 text-destructive" />
                            </div>
                            <p className="text-base text-destructive">{error}</p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {isBootstrapMode && (
                            <div>
                                <label className="block text-base font-medium text-muted-foreground mb-2">
                                    Имя администратора
                                </label>
                                <div className="relative">
                                    <User className="absolute left-5 top-1/2 -translate-y-1/2 w-6 h-6 text-muted-foreground/50" />
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="Иванов Иван"
                                        required
                                        className="w-full h-14 pl-14 pr-5 text-lg bg-muted/50 border border-border rounded-xl text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all"
                                    />
                                </div>
                            </div>
                        )}

                        <div>
                            <label className="block text-base font-medium text-muted-foreground mb-2">
                                Email
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-6 h-6 text-muted-foreground/50" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="user@company.ru"
                                    required
                                    className="w-full h-14 pl-14 pr-5 text-lg bg-muted/50 border border-border rounded-xl text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all"
                                />
                            </div>
                        </div>

                        {isBootstrapMode && (
                            <div>
                                <label className="block text-base font-medium text-muted-foreground mb-2">
                                    Телефон
                                </label>
                                <div className="relative">
                                    <Phone className="absolute left-5 top-1/2 -translate-y-1/2 w-6 h-6 text-muted-foreground/50" />
                                    <input
                                        type="tel"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        placeholder="+7 (999) 123-45-67"
                                        className="w-full h-14 pl-14 pr-5 text-lg bg-muted/50 border border-border rounded-xl text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all"
                                    />
                                </div>
                            </div>
                        )}

                        <div>
                            <label className="block text-base font-medium text-muted-foreground mb-2">
                                Пароль
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-6 h-6 text-muted-foreground/50" />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    required
                                    className="w-full h-14 pl-14 pr-5 text-lg bg-muted/50 border border-border rounded-xl text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all"
                                />
                            </div>
                        </div>

                        {isBootstrapMode && (
                            <div>
                                <label className="block text-base font-medium text-muted-foreground mb-2">
                                    Повторите пароль
                                </label>
                                <div className="relative">
                                    <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-6 h-6 text-muted-foreground/50" />
                                    <input
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        placeholder="••••••••"
                                        required
                                        className="w-full h-14 pl-14 pr-5 text-lg bg-muted/50 border border-border rounded-xl text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all"
                                    />
                                </div>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isLoading}
                            className={cn(
                                'w-full h-14 gradient-primary text-white text-lg font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/25 mt-2',
                                'hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5',
                                'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0',
                            )}
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-6 h-6 animate-spin" />
                                    {isBootstrapMode ? 'Создание...' : 'Вход...'}
                                </>
                            ) : (
                                <>
                                    {isBootstrapMode ? 'Создать администратора' : 'Войти'}
                                    <ArrowRight className="w-5 h-5" />
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
