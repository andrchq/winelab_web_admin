"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RequestsTab } from "@/components/requests/requests-tab";
import { DeliveriesTab } from "@/components/deliveries/deliveries-tab";
import { useDeliveries } from "@/lib/hooks";

export default function RequestsPage() {
    // We can show badges in tabs too if we want
    const { data: deliveries } = useDeliveries();
    const activeDeliveriesCount = deliveries?.filter(d => ['CREATED'].includes(d.status)).length || 0;

    return (
        <div className="p-6 h-full flex flex-col">
            <div className="flex flex-col gap-4 mb-6">
                <div className="flex flex-col gap-2">
                    <h1 className="text-2xl font-bold">Логистика</h1>
                    <p className="text-sm text-muted-foreground">Управление заявками и доставками</p>
                </div>
            </div>

            <Tabs defaultValue="requests" className="flex-1 flex flex-col">
                <div className="mb-4">
                    <TabsList>
                        <TabsTrigger value="requests">Заявки</TabsTrigger>
                        <TabsTrigger value="deliveries" className="flex items-center gap-2">
                            Доставки
                            {activeDeliveriesCount > 0 && (
                                <span className="ml-1 rounded-full bg-primary/10 px-1.5 py-0.5 text-xs font-semibold text-primary">
                                    {activeDeliveriesCount}
                                </span>
                            )}
                        </TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="requests" className="flex-1">
                    <RequestsTab />
                </TabsContent>

                <TabsContent value="deliveries" className="flex-1">
                    <DeliveriesTab />
                </TabsContent>
            </Tabs>
        </div>
    );
}
