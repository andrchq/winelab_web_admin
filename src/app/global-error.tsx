'use client'

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    return (
        <html lang="ru">
            <body className="flex flex-col items-center justify-center min-h-screen p-4 text-center bg-black text-white">
                <h2 className="text-3xl font-bold mb-4">Критическая ошибка системы</h2>
                <p className="mb-8 text-gray-400">{error.message}</p>
                <button
                    onClick={() => reset()}
                    className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                >
                    Перезагрузить приложение
                </button>
            </body>
        </html>
    )
}
