import type { AppProps } from 'next/app'

// Note: Global styles are handled by App Router's layout.tsx
// This _app.tsx is only for Pages Router error pages (404, 500)

export default function App({ Component, pageProps }: AppProps) {
    return <Component {...pageProps} />
}
