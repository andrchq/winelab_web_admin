import type { Metadata } from "next";
import "./globals.css";
import { ClientWrapper } from "./client-wrapper";

export const metadata: Metadata = {
  title: "WineLab Admin - Управление складом и логистикой",
  description: "SaaS панель управления складом, заявками и доставками оборудования WineLab",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className="dark" suppressHydrationWarning>
      <body className="antialiased" suppressHydrationWarning>
        <ClientWrapper>{children}</ClientWrapper>
      </body>
    </html>
  );
}
