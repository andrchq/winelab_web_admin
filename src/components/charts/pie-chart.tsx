"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";

interface DataPoint {
    name: string;
    value: number;
    color: string;
}

interface PieChartProps {
    data: DataPoint[];
    height?: number;
    innerRadius?: number;
    outerRadius?: number;
    showLegend?: boolean;
}

export function CustomPieChart({
    data,
    height = 200,
    innerRadius = 60,
    outerRadius = 80,
    showLegend = true
}: PieChartProps) {
    const total = data.reduce((sum, item) => sum + item.value, 0);

    return (
        <ResponsiveContainer width="100%" height={height}>
            <PieChart>
                <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    innerRadius={innerRadius}
                    outerRadius={outerRadius}
                    paddingAngle={2}
                    dataKey="value"
                    strokeWidth={0}
                >
                    {data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                </Pie>
                <Tooltip
                    contentStyle={{
                        backgroundColor: 'rgba(17, 17, 17, 0.95)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '8px',
                        color: '#fff'
                    }}
                    formatter={(value: number) => [`${value} (${((value / total) * 100).toFixed(1)}%)`, '']}
                />
                {showLegend && (
                    <Legend
                        verticalAlign="bottom"
                        height={36}
                        formatter={(value) => <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px' }}>{value}</span>}
                    />
                )}
            </PieChart>
        </ResponsiveContainer>
    );
}
