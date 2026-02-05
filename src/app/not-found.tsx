// Server component - no hooks, no client-side code
// This ensures it can be statically generated without React context issues

import Link from 'next/link'

export default function NotFound() {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center bg-background">
            <h2 className="text-6xl font-bold mb-4 text-primary">404</h2>
            <p className="text-xl mb-8 text-foreground">Страница не найдена</p>
            <Link
                href="/"
                className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition shadow-lg"
            >
                Вернуться на главную
            </Link>
        </div>
    )
}
