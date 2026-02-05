import Link from 'next/link'

export default function NotFound() {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
            <h2 className="text-6xl font-bold mb-4 text-primary">404</h2>
            <p className="text-xl mb-8">Страница не найдена</p>
            <Link
                href="/"
                className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition"
            >
                Вернуться на главную
            </Link>
        </div>
    )
}
