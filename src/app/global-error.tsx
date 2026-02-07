'use client'

// Minimal global error boundary - no external dependencies
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
                <div style={{ padding: '40px', textAlign: 'center' }}>
                    <h2 style={{ color: '#ef4444' }}>Something went wrong</h2>
                    <button onClick={() => reset()} style={{ marginTop: '20px', padding: '10px 20px' }}>
                        Try again
                    </button>
                </div>
            </body>
        </html>
    )
}
