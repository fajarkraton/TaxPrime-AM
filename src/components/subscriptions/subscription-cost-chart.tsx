'use client';

import { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Subscription } from '@/types/subscription';

const COLORS = [
    '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
    '#ec4899', '#06b6d4', '#f97316', '#6366f1', '#14b8a6',
];

const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
    }).format(amount);

interface SubscriptionCostChartProps {
    subscriptions: Subscription[];
}

export function SubscriptionCostChart({ subscriptions }: SubscriptionCostChartProps) {
    // Aggregate by provider, only active/expiring_soon
    const chartData = useMemo(() => {
        const activeSubs = subscriptions.filter(
            s => s.status === 'active' || s.status === 'expiring_soon'
        );

        const byProvider: Record<string, number> = {};
        for (const sub of activeSubs) {
            // Normalize cost to monthly
            let monthlyCost = sub.costPerPeriod;
            if (sub.billingCycle === 'yearly' as string) monthlyCost = sub.costPerPeriod / 12;
            if (sub.billingCycle === 'quarterly' as string) monthlyCost = sub.costPerPeriod / 3;

            byProvider[sub.provider] = (byProvider[sub.provider] || 0) + monthlyCost;
        }

        return Object.entries(byProvider)
            .map(([name, value]) => ({ name, value: Math.round(value) }))
            .sort((a, b) => b.value - a.value);
    }, [subscriptions]);

    const totalMonthly = chartData.reduce((sum, d) => sum + d.value, 0);

    if (chartData.length === 0) return null;

    return (
        <Card className="border-none shadow-sm outline outline-1 outline-slate-200">
            <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Biaya Bulanan per Provider</CardTitle>
                <p className="text-xs text-slate-500">
                    Total estimasi: {formatCurrency(totalMonthly)} / bulan
                </p>
            </CardHeader>
            <CardContent>
                <div className="flex items-center gap-6">
                    <div className="w-[160px] h-[160px] shrink-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={chartData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={40}
                                    outerRadius={70}
                                    paddingAngle={2}
                                    dataKey="value"
                                >
                                    {chartData.map((_, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    formatter={(value) => formatCurrency(Number(value))}
                                    contentStyle={{
                                        fontSize: '12px',
                                        borderRadius: '8px',
                                        border: '1px solid #e2e8f0',
                                    }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="flex-1 space-y-2">
                        {chartData.map((item, index) => (
                            <div key={item.name} className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2">
                                    <div
                                        className="w-3 h-3 rounded-full shrink-0"
                                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                                    />
                                    <span className="text-slate-700 truncate max-w-[140px]">{item.name}</span>
                                </div>
                                <span className="font-medium text-slate-900">{formatCurrency(item.value)}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
