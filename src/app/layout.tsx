import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

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

