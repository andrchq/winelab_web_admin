"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

interface DataPoint {
    name: string;
    value: number;
    value2?: number;
}

interface AreaChartProps {
    data: DataPoint[];
    color?: string;
    color2?: string;
    height?: number;
    showGrid?: boolean;
    showAxis?: boolean;
    gradientId?: string;
    tooltipLabels?: {
        value: string;
        value2?: string;
    };
}

export function CustomAreaChart({
    data,
    color = "#8b5cf6",
    color2,
    height = 200,
    showGrid = true,
    showAxis = true,
    gradientId = "colorValue",
    tooltipLabels
}: AreaChartProps) {
    return (
        <ResponsiveContainer width="100%" height={height}>
            <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                    <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={color} stopOpacity={0} />
                    </linearGradient>
                    {color2 && (
                        <linearGradient id={`${gradientId}2`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={color2} stopOpacity={0.3} />
                            <stop offset="95%" stopColor={color2} stopOpacity={0} />
                        </linearGradient>
                    )}
                </defs>
                {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />}
                {showAxis && (
                    <>
                        <XAxis
                            dataKey="name"
                            stroke="rgba(255,255,255,0.5)"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                        />
                        <YAxis
                            stroke="rgba(255,255,255,0.5)"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                        />
                    </>
                )}
                <Tooltip
                    contentStyle={{
                        backgroundColor: 'rgba(17, 17, 17, 0.95)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '8px',
                        color: '#fff'
                    }}
                    formatter={(value: number, name: string) => {
                        if (name === 'value' && tooltipLabels?.value) return [value, tooltipLabels.value];
                        if (name === 'value2' && tooltipLabels?.value2) return [value, tooltipLabels.value2];
                        return [value, name];
                    }}
                />
                <Area
                    type="monotone"
                    dataKey="value"
                    stroke={color}
                    strokeWidth={2}
                    fillOpacity={1}
                    fill={`url(#${gradientId})`}
                />
                {color2 && (
                    <Area
                        type="monotone"
                        dataKey="value2"
                        stroke={color2}
                        strokeWidth={2}
                        fillOpacity={1}
                        fill={`url(#${gradientId}2)`}
                    />
                )}
            </AreaChart>
        </ResponsiveContainer>
    );
}
