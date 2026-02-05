'use client'

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] p-4 text-center">
            <h2 className="text-2xl font-bold mb-4 text-destructive">Произошла ошибка</h2>
            <p className="text-muted-foreground mb-6">{error.message || 'Неизвестная ошибка'}</p>
            <button
                onClick={() => reset()}
                className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition"
            >
                Попробовать снова
            </button>
        </div>
    )
}
