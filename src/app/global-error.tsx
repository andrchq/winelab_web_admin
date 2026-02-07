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
            <body style={{
                margin: 0,
                padding: 0,
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '100vh',
                backgroundColor: '#0f172a',
                color: '#f8fafc'
            }}>
                <div style={{
                    textAlign: 'center',
                    padding: '24px',
                    maxWidth: '400px',
                    width: '100%'
                }}>
                    <h2 style={{
                        fontSize: '28px',
                        fontWeight: 'bold',
                        marginBottom: '16px',
                        color: '#ef4444'
                    }}>
                        Критическая ошибка
                    </h2>
                    <p style={{
                        fontSize: '16px',
                        lineHeight: '1.5',
                        color: '#94a3b8',
                        marginBottom: '32px'
                    }}>
                        {error.message || 'Произошла непредвиденная ошибка при работе приложения.'}
                    </p>
                    <button
                        onClick={() => reset()}
                        style={{
                            display: 'inline-block',
                            padding: '12px 28px',
                            backgroundColor: '#7c3aed',
                            color: 'white',
                            border: 'none',
                            borderRadius: '12px',
                            cursor: 'pointer',
                            fontSize: '16px',
                            fontWeight: '600',
                            transition: 'background-color 0.2s'
                        }}
                    >
                        Попробовать снова
                    </button>
                    {error.digest && (
                        <p style={{ marginTop: '24px', fontSize: '12px', color: '#475569' }}>
                            Error ID: {error.digest}
                        </p>
                    )}
                </div>
            </body>
        </html>
    )
}
