'use client'

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    return (
        <html>
            <body>
                <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center bg-background text-foreground">
                    <h2 className="text-2xl font-bold mb-4 text-destructive">Критическая ошибка</h2>
                    <p className="text-muted-foreground mb-6">{error.message || 'Произошла непредвиденная ошибка'}</p>
                    <button
                        onClick={() => reset()}
                        className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition"
                    >
                        Попробовать снова
                    </button>
                </div>
            </body>
        </html>
    )
}
