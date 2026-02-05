'use client'

export default function Error({
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] p-4 text-center">
            <h2 className="text-2xl font-bold mb-4">Произошла ошибка</h2>
            <button
                onClick={() => reset()}
                className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition"
            >
                Попробовать снова
            </button>
        </div>
    )
}
