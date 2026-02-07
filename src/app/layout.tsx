
import type { Metadata } from "next";
import "./globals.css";
import { ClientWrapper } from "./client-wrapper";

export const metadata: Metadata = {
  title: "WineLab Admin",
  description: "Система управления WineLab",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru" className="dark" suppressHydrationWarning>
      <body className="antialiased bg-background text-foreground" suppressHydrationWarning>
        <ClientWrapper>
          {children}
        </ClientWrapper>
      </body>
    </html>
  );
}
