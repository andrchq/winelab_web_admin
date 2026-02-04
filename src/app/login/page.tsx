"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Warehouse, Lock, Mail, AlertCircle, Loader2, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function LoginPage() {
    const router = useRouter();
    const { login, isLoading: authLoading } = useAuth();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            await login({ email, password });
            router.push('/');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Ошибка входа');
        } finally {
            setIsLoading(false);
        }
    };

    if (authLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="h-12 w-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
            {/* Background effects */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
            </div>

            {/* Login card - Balanced Size */}
            <div className="relative w-full max-w-xl animate-fade-in">
                <div className="bg-card/80 backdrop-blur-xl border border-border/50 rounded-3xl p-10 shadow-2xl">
                    {/* Logo - Medium-Large */}
                    <div className="flex flex-col items-center justify-center gap-5 mb-8">
                        <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center shadow-lg shadow-primary/25">
                            <Warehouse className="w-8 h-8 text-white" />
                        </div>
                        <div className="text-center">
                            <h1 className="text-3xl font-bold text-gradient mb-1">WineLab</h1>
                            <p className="text-base text-muted-foreground">Admin Panel</p>
                        </div>
                    </div>

                    {/* Title - Medium-Large */}
                    <div className="text-center mb-8">
                        <h2 className="text-3xl font-semibold mb-2">Добро пожаловать</h2>
                        <p className="text-lg text-muted-foreground">Войдите в систему для продолжения</p>
                    </div>

                    {/* Error message */}
                    {error && (
                        <div className="mb-6 p-5 bg-destructive/10 border border-destructive/20 rounded-xl flex items-center gap-3 animate-fade-in">
                            <div className="h-9 w-9 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0">
                                <AlertCircle className="w-5 h-5 text-destructive" />
                            </div>
                            <p className="text-destructive text-base">{error}</p>
                        </div>
                    )}

                    {/* Form - Medium-Large Inputs */}
                    <form onSubmit={handleSubmit} className="space-y-6">
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
                                    placeholder="admin@winelab.ru"
                                    required
                                    className="w-full h-14 pl-14 pr-5 text-lg bg-muted/50 border border-border rounded-xl text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all"
                                />
                            </div>
                        </div>

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

                        <button
                            type="submit"
                            disabled={isLoading}
                            className={cn(
                                "w-full h-14 gradient-primary text-white text-lg font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/25 mt-2",
                                "hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5",
                                "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                            )}
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-6 h-6 animate-spin" />
                                    Вход...
                                </>
                            ) : (
                                <>
                                    Войти
                                    <ArrowRight className="w-5 h-5" />
                                </>
                            )}
                        </button>
                    </form>

                    {/* Test accounts hint - Medium-Large */}
                    <div className="mt-8 pt-6 border-t border-border">
                        <p className="text-sm text-muted-foreground text-center mb-3">Тестовые аккаунты:</p>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                            <button
                                type="button"
                                onClick={() => { setEmail('admin@winelab.ru'); setPassword('admin123'); }}
                                className="p-3 bg-muted/50 rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground transition-all text-center px-4"
                            >
                                admin@winelab.ru
                            </button>
                            <button
                                type="button"
                                onClick={() => { setEmail('manager@winelab.ru'); setPassword('manager123'); }}
                                className="p-3 bg-muted/50 rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground transition-all text-center px-4"
                            >
                                manager@winelab.ru
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
