import type { Metadata } from "next";
import dynamicImport from "next/dynamic";
import "./globals.css";

// Dynamic import with SSR disabled - prevents useState errors during static generation
const Providers = dynamicImport(() => import("./providers").then(mod => mod.Providers), {
  ssr: false,
});

// Force all pages to be rendered at request time, not build time
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: "WineLab Admin - Управление складом и логистикой",
  description: "SaaS панель управления складом, заявками и доставками оборудования WineLab",
  keywords: ["склад", "логистика", "управление оборудованием", "доставка", "WineLab"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className="dark" suppressHydrationWarning>
      <body className="antialiased" suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
