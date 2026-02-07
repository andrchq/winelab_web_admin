'use client';

// Force dynamic rendering to avoid static generation issues
export const dynamic = 'force-dynamic';

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    return (
        <html>
            <body>
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100vh',
                    fontFamily: 'system-ui, sans-serif',
                    backgroundColor: '#0f0f12',
                    color: '#fff'
                }}>
                    <h2>Что-то пошло не так!</h2>
                    <button
                        onClick={() => reset()}
                        style={{
                            marginTop: '16px',
                            padding: '8px 16px',
                            backgroundColor: '#7c3aed',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer'
                        }}
                    >
                        Попробовать снова
                    </button>
                </div>
            </body>
        </html>
    );
}
