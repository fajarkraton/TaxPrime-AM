'use client';

import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { DollarSign, TrendingUp, Package } from 'lucide-react';

import { useFirestoreCollection } from '@/hooks/use-firestore-collection';
import { useAuthContext } from '@/lib/firebase/auth-provider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Subscription } from '@/types/subscription';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        notation: amount >= 1_000_000_000 ? 'compact' : 'standard',
    }).format(amount);

const formatCompact = (amount: number) =>
    new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        notation: 'compact',
    }).format(amount);

export function CostAnalytics() {
    const { role, department } = useAuthContext();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: assetsRaw, loading: loadingAssets } = useFirestoreCollection({
        collectionPath: 'assets',
        pageSize: 500,
    });

    const { data: subsRaw, loading: loadingSubs } = useFirestoreCollection({
        collectionPath: 'subscriptions',
        pageSize: 100,
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const assets = assetsRaw as any[];
    const subscriptions = subsRaw as unknown as Subscription[];
    const loading = loadingAssets || loadingSubs;

    // Calculate stats
    const stats = useMemo(() => {
        // Total asset value (non-retired) — RBAC filtered
        let activeAssets = assets.filter(a => a.status !== 'retired');
        if (role === 'manager' && department) {
            activeAssets = activeAssets.filter(a => a.department === department);
        }
        const totalAssetValue = activeAssets.reduce((sum, a) => sum + (Number(a.purchasePrice) || 0), 0);

        // Monthly subscription cost
        const activeSubs = subscriptions.filter(s => s.status === 'active' || s.status === 'expiring_soon');
        const monthlySubCost = activeSubs.reduce((sum, s) => {
            let monthly = s.costPerPeriod || 0;
            if ((s.billingCycle as string) === 'yearly') monthly = monthly / 12;
            if ((s.billingCycle as string) === 'quarterly') monthly = monthly / 3;
            return sum + monthly;
        }, 0);

        // Cost per department (from assets)
        const deptMap: Record<string, number> = {};
        for (const a of activeAssets) {
            const dept = a.department || 'Lainnya';
            deptMap[dept] = (deptMap[dept] || 0) + (Number(a.purchasePrice) || 0);
        }
        const deptData = Object.entries(deptMap)
            .map(([name, value]) => ({ name, value: Math.round(value) }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 7);

        return { totalAssetValue, monthlySubCost, deptData, totalAssets: activeAssets.length };
    }, [assets, subscriptions]);

    if (loading) return null;

    return (
        <Card className="">
            <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-500" />
                    Analisis Biaya IT
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Summary cards */}
                <div className="grid grid-cols-3 gap-3">
                    <div className="bg-blue-50 dark:bg-blue-950/50 rounded-lg p-3">
                        <div className="flex items-center gap-1.5 mb-1">
                            <Package className="w-3.5 h-3.5 text-blue-500" />
                            <span className="text-[10px] text-blue-600 dark:text-blue-400 font-medium">Total Nilai Aset</span>
                        </div>
                        <div className="text-sm font-bold text-blue-900 dark:text-blue-100">
                            {formatCurrency(stats.totalAssetValue)}
                        </div>
                        <div className="text-[10px] text-blue-500">{stats.totalAssets} aset aktif</div>
                    </div>
                    <div className="bg-emerald-50 dark:bg-emerald-950/50 rounded-lg p-3">
                        <div className="flex items-center gap-1.5 mb-1">
                            <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">Biaya Langganan/bln</span>
                        </div>
                        <div className="text-sm font-bold text-emerald-900 dark:text-emerald-100">
                            {formatCurrency(Math.round(stats.monthlySubCost))}
                        </div>
                        <div className="text-[10px] text-emerald-500">Langganan aktif</div>
                    </div>
                    <div className="bg-violet-50 dark:bg-violet-950/50 rounded-lg p-3">
                        <div className="flex items-center gap-1.5 mb-1">
                            <TrendingUp className="w-3.5 h-3.5 text-violet-500" />
                            <span className="text-[10px] text-violet-600 dark:text-violet-400 font-medium">Total TCO/tahun</span>
                        </div>
                        <div className="text-sm font-bold text-violet-900 dark:text-violet-100">
                            {formatCurrency(Math.round(stats.totalAssetValue + stats.monthlySubCost * 12))}
                        </div>
                        <div className="text-[10px] text-violet-500">Aset + langganan</div>
                    </div>
                </div>

                {/* Department bar chart */}
                {stats.deptData.length > 0 && (
                    <div>
                        <p className="text-xs text-muted-foreground mb-2">Nilai Aset per Departemen</p>
                        <div className="h-[180px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={stats.deptData} layout="vertical" margin={{ left: 0, right: 10 }}>
                                    <XAxis
                                        type="number"
                                        tickFormatter={(v) => formatCompact(v)}
                                        tick={{ fontSize: 10 }}
                                    />
                                    <YAxis
                                        type="category"
                                        dataKey="name"
                                        width={70}
                                        tick={{ fontSize: 11 }}
                                    />
                                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                                    <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={18}>
                                        {stats.deptData.map((_, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
