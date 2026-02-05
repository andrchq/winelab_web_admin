import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

export default function ReceivingLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <ProtectedRoute requiredRoles={['ADMIN', 'MANAGER', 'WAREHOUSE']}>
            {children}
        </ProtectedRoute>
    );
}
