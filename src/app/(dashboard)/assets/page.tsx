"use client";

import { AssetsTab } from "@/components/assets/assets-tab";

export default function AssetsPage() {
    return (
        <div className="p-6 h-full flex flex-col">
            <div className="flex flex-col gap-4 mb-6">
                <div className="flex flex-col gap-2">
                    <h1 className="text-2xl font-bold">Инвентаризация</h1>
                    <p className="text-sm text-muted-foreground">Управление оборудованием</p>
                </div>
            </div>

            <div className="flex-1 flex flex-col">
                <AssetsTab />
            </div>
        </div>
    );
}
