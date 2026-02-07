import Link from 'next/link'

export default function Custom404() {
    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            padding: '1rem',
            textAlign: 'center',
            backgroundColor: '#0f0f14',
            color: '#f5f5f5',
            fontFamily: 'system-ui, sans-serif'
        }}>
            <h1 style={{ fontSize: '4rem', fontWeight: 'bold', marginBottom: '1rem', color: '#10b981' }}>404</h1>
            <p style={{ fontSize: '1.25rem', marginBottom: '2rem' }}>Страница не найдена</p>
            <Link
                href="/"
                style={{
                    padding: '0.75rem 1.5rem',
                    backgroundColor: '#10b981',
                    color: 'white',
                    borderRadius: '0.5rem',
                    textDecoration: 'none',
                    fontWeight: 500
                }}
            >
                Вернуться на главную
            </Link>
        </div>
    )
}
