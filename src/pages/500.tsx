export default function Custom500() {
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
            <h1 style={{ fontSize: '4rem', fontWeight: 'bold', marginBottom: '1rem', color: '#ef4444' }}>500</h1>
            <p style={{ fontSize: '1.25rem', marginBottom: '2rem' }}>Внутренняя ошибка сервера</p>
            <button
                onClick={() => window.location.reload()}
                style={{
                    padding: '0.75rem 1.5rem',
                    backgroundColor: '#10b981',
                    color: 'white',
                    borderRadius: '0.5rem',
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: 500,
                    fontSize: '1rem'
                }}
            >
                Обновить страницу
            </button>
        </div>
    )
}
