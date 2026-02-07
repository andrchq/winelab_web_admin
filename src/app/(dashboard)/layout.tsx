"use client";

import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { TSDHeader } from "@/components/layout/tsd-header";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useTSDMode } from "@/contexts/TSDModeContext";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { isTSDMode } = useTSDMode();

    return (
        <ProtectedRoute>
            <div className="flex h-screen bg-background">
                {!isTSDMode && <Sidebar />}
                <div className="flex flex-1 flex-col overflow-hidden">
                    {isTSDMode ? <TSDHeader /> : <Header />}
                    <main className="flex-1 overflow-y-auto bg-background/50">
                        {children}
                    </main>
                </div>
            </div>
        </ProtectedRoute>
    );
}
