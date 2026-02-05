import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

// Force dynamic rendering - prevents static generation errors with React hooks
export const dynamic = 'force-dynamic';
export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <ProtectedRoute>
            <div className="flex h-screen bg-background">
                <Sidebar />
                <div className="flex flex-1 flex-col overflow-hidden">
                    <Header />
                    <main className="flex-1 overflow-y-auto bg-background/50">
                        {children}
                    </main>
                </div>
            </div>
        </ProtectedRoute>
    );
}
