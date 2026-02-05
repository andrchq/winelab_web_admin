import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { Toaster } from "@/components/ui/sonner";
import { TSDModeProvider } from "@/contexts/TSDModeContext";

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
      <body
        className="antialiased"
        suppressHydrationWarning
      >
        <AuthProvider>
          <TSDModeProvider>
            {children}
            <Toaster />
          </TSDModeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

