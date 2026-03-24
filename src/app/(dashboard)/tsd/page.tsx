"use client";

import { useTSDMode } from "@/contexts/TSDModeContext";
import { TSDDashboard } from "@/components/tsd/TSDDashboard";

export default function TSDDashboardPage() {
    const { disableTSDMode } = useTSDMode();

    return (
        <TSDDashboard onExit={disableTSDMode} />
    );
}
