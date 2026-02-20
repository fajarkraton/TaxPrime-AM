'use client';

import { useMemo } from 'react';
import {
    AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts';
import { Wrench } from 'lucide-react';

import { useFirestoreCollection } from '@/hooks/use-firestore-collection';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const parseDate = (val: any): Date | null => {
    if (!val) return null;
    if (typeof val === 'string') return new Date(val);
    if (typeof val.toDate === 'function') return val.toDate();
    if (val.seconds) return new Date(val.seconds * 1000);
    return new Date(val);
};

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

export function MaintenanceTrendWidget() {
    const { data: ticketsRaw, loading } = useFirestoreCollection({
        collectionPath: 'serviceTickets',
        pageSize: 500,
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tickets = ticketsRaw as any[];

    const trendData = useMemo(() => {
        const now = new Date();
        const months: { key: string; label: string; count: number }[] = [];

        // Generate last 6 months
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            months.push({
                key,
                label: `${MONTH_LABELS[d.getMonth()]} ${String(d.getFullYear()).slice(-2)}`,
                count: 0,
            });
        }

        // Count maintenance-related tickets per month
        const maintenanceCategories = ['hardware_repair', 'maintenance', 'perbaikan_hardware'];
        for (const t of tickets) {
            const category = (t.category || '').toLowerCase();
            if (!maintenanceCategories.includes(category)) continue;
            const created = parseDate(t.createdAt);
            if (!created) continue;
            const monthKey = `${created.getFullYear()}-${String(created.getMonth() + 1).padStart(2, '0')}`;
            const month = months.find(m => m.key === monthKey);
            if (month) month.count += 1;
        }

        return months;
    }, [tickets]);

    if (loading) return null;

    const totalMaintenance = trendData.reduce((s, m) => s + m.count, 0);

    return (
        <Card className="">
            <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Wrench className="w-4 h-4 text-orange-500" />
                    Tren Maintenance
                </CardTitle>
                <CardDescription>
                    Tiket perbaikan hardware dalam 6 bulan terakhir ({totalMaintenance} total)
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="h-[180px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={trendData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                            <defs>
                                <linearGradient id="maintenanceGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                            <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                            <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
                            <Tooltip
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                formatter={(value?: number) => [`${value ?? 0} tiket`, 'Maintenance']}
                            />
                            <Area
                                type="monotone"
                                dataKey="count"
                                stroke="#f97316"
                                strokeWidth={2}
                                fill="url(#maintenanceGrad)"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}
