import type { Metadata } from "next";

import { ClientWrapper } from "./client-wrapper";
import "./globals.css";

export const metadata: Metadata = {
  title: "ВИНЛАБ | АДМ",
  description: "SaaS панель управления складом, заявками и доставками оборудования ВИНЛАБ",
  icons: {
    icon: "/logo.svg",
    shortcut: "/logo.svg",
    apple: "/logo.png",
  },
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
