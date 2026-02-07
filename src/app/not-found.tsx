
import Link from 'next/link'

export default function NotFound() {
    return (
        <div className="flex h-screen flex-col items-center justify-center bg-background text-foreground">
            <h2 className="text-2xl font-bold mb-4">Страница не найдена</h2>
            <p className="text-muted-foreground mb-4">Запрашиваемый ресурс не существует</p>
            <Link href="/" className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90 transition-colors">
                Вернуться на главную
            </Link>
        </div>
    )
}
