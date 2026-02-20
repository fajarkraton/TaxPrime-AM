'use client';

import { useMemo } from 'react';
import {
    AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Subscription } from '@/types/subscription';

const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
    }).format(amount);

interface SubscriptionCostTrendProps {
    subscriptions: Subscription[];
}

export function SubscriptionCostTrend({ subscriptions }: SubscriptionCostTrendProps) {
    const chartData = useMemo(() => {
        const now = new Date();
        const months: { month: string; cost: number }[] = [];

        for (let i = 11; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthStart = d.getTime();
            const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0).getTime();

            let monthlyCost = 0;

            for (const sub of subscriptions) {
                if (sub.status === 'cancelled') continue;

                // Parse dates
                const startDate = sub.startDate && typeof sub.startDate === 'object' && 'toDate' in sub.startDate
                    ? (sub.startDate as { toDate: () => Date }).toDate()
                    : new Date(sub.startDate as unknown as string);
                const expiryDate = sub.expiryDate && typeof sub.expiryDate === 'object' && 'toDate' in sub.expiryDate
                    ? (sub.expiryDate as { toDate: () => Date }).toDate()
                    : new Date(sub.expiryDate as unknown as string);

                // Check if subscription was active during this month
                if (startDate.getTime() <= monthEnd && expiryDate.getTime() >= monthStart) {
                    // Normalize to monthly cost
                    let mc = sub.costPerPeriod;
                    const cycle = sub.billingCycle as string;
                    if (cycle === 'annually') mc = sub.costPerPeriod / 12;
                    else if (cycle === 'quarterly') mc = sub.costPerPeriod / 3;
                    monthlyCost += mc;
                }
            }

            const label = d.toLocaleDateString('id-ID', { month: 'short', year: '2-digit' });
            months.push({ month: label, cost: Math.round(monthlyCost) });
        }

        return months;
    }, [subscriptions]);

    const hasData = chartData.some(d => d.cost > 0);
    if (!hasData) return null;

    return (
        <Card className="border-none shadow-sm outline outline-1 outline-slate-200">
            <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Tren Biaya Langganan (12 Bulan)</CardTitle>
                <p className="text-xs text-slate-500">
                    Estimasi biaya bulanan berdasarkan langganan aktif per periode
                </p>
            </CardHeader>
            <CardContent>
                <div className="h-[240px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                            <defs>
                                <linearGradient id="costGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis
                                dataKey="month"
                                tick={{ fontSize: 11, fill: '#94a3b8' }}
                                tickLine={false}
                                axisLine={{ stroke: '#e2e8f0' }}
                            />
                            <YAxis
                                tick={{ fontSize: 11, fill: '#94a3b8' }}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(v) => `${(v / 1000000).toFixed(1)}jt`}
                            />
                            <Tooltip
                                formatter={(value) => [formatCurrency(Number(value)), 'Biaya Bulanan']}
                                contentStyle={{
                                    fontSize: '12px',
                                    borderRadius: '8px',
                                    border: '1px solid #e2e8f0',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                                }}
                            />
                            <Area
                                type="monotone"
                                dataKey="cost"
                                stroke="#6366f1"
                                strokeWidth={2}
                                fill="url(#costGradient)"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}
