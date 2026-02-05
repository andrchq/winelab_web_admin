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
            <body>
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '100vh',
                    padding: '20px',
                    textAlign: 'center',
                    backgroundColor: '#0a0a0a',
                    color: '#ffffff'
                }}>
                    <h2 style={{ fontSize: '24px', marginBottom: '16px' }}>Что-то пошло не так</h2>
                    <button
                        onClick={() => reset()}
                        style={{
                            padding: '12px 24px',
                            backgroundColor: '#8b5cf6',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer'
                        }}
                    >
                        Попробовать снова
                    </button>
                </div>
            </body>
        </html>
    )
}
