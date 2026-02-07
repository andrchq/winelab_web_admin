"use client";

import { useState } from 'react';
import { cn } from '@/lib/utils';

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
    const [collapsed, setCollapsed] = useState(false);

    // Load persisted state if needed, or default to false (expanded)

    return (
        <ProtectedRoute>
            <div className="flex h-screen bg-background relative">
                {!isTSDMode && (
                    <Sidebar
                        collapsed={collapsed}
                        setCollapsed={setCollapsed}
                    />
                )}

                {/* Main Content Wrapper - adjust padding dynamically based on sidebar state */}
                <div
                    className={cn(
                        "flex flex-1 flex-col overflow-hidden transition-all duration-300 ease-in-out",
                        !isTSDMode ? (collapsed ? "pl-20" : "pl-72") : "pl-0"
                    )}
                >
                    {isTSDMode ? <TSDHeader /> : <Header />}
                    <main className="flex-1 overflow-y-auto bg-background/50 p-6">
                        {children}
                    </main>
                </div>
            </div>
        </ProtectedRoute>
    );
}
