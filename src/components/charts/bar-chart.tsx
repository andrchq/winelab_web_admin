"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell } from "recharts";

interface DataPoint {
    name: string;
    value: number;
    color?: string;
}

interface BarChartProps {
    data: DataPoint[];
    color?: string;
    height?: number;
    showGrid?: boolean;
    showAxis?: boolean;
    horizontal?: boolean;
}

export function CustomBarChart({
    data,
    color = "#8b5cf6",
    height = 200,
    showGrid = true,
    showAxis = true,
    horizontal = false
}: BarChartProps) {
    return (
        <ResponsiveContainer width="100%" height={height}>
            <BarChart
                data={data}
                layout={horizontal ? "vertical" : "horizontal"}
                margin={{ top: 10, right: 10, left: horizontal ? 80 : -20, bottom: 0 }}
            >
                {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />}
                {showAxis && (
                    <>
                        {horizontal ? (
                            <>
                                <XAxis type="number" stroke="rgba(255,255,255,0.5)" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis type="category" dataKey="name" stroke="rgba(255,255,255,0.5)" fontSize={12} tickLine={false} axisLine={false} />
                            </>
                        ) : (
                            <>
                                <XAxis dataKey="name" stroke="rgba(255,255,255,0.5)" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke="rgba(255,255,255,0.5)" fontSize={12} tickLine={false} axisLine={false} />
                            </>
                        )}
                    </>
                )}
                <Tooltip
                    contentStyle={{
                        backgroundColor: 'rgba(17, 17, 17, 0.95)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '8px',
                        color: '#fff'
                    }}
                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                />
                <Bar
                    dataKey="value"
                    radius={[4, 4, 4, 4]}
                >
                    {data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color || color} />
                    ))}
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    );
}
