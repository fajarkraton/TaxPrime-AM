'use client';

import {
    PieChart, Pie, Cell, ResponsiveContainer, Tooltip as PieTooltip, Legend,
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as BarTooltip
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useFirestoreCollection } from '@/hooks/use-firestore-collection';
import { useAuthContext } from '@/lib/firebase/auth-provider';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart3, PieChart as PieChartIcon } from 'lucide-react';
import type { Asset, AssetCategory, AssetStatus } from '@/types';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316'];

const statusLabels: Record<AssetStatus, string> = {
    'in_stock': 'Tersedia',
    'deployed': 'Digunakan',
    'maintenance': 'Perbaikan',
    'retired': 'Pensiun',
    'procurement': 'Pengadaan',
    'reserved': 'Dipesan',
    'lost': 'Hilang'
};

const categoryLabels: Record<AssetCategory, string> = {
    'computer': 'PC / Desktop',
    'laptop': 'Laptop',
    'printer': 'Printer / Scanner',
    'monitor': 'Monitor',
    'network': 'Jaringan',
    'peripheral': 'Peripheral',
    'storage': 'Penyimpanan',
    'server': 'Server',
    'cable': 'Kabel & Adaptor',
    'software': 'Software IT',
    'subscription': 'Langganan',
    'cloud': 'Cloud Service',
    'security': 'Keamanan',
    'domain': 'Domain Web',
    'devtools': 'Developer Tools',
    'database': 'Database'
};

export function DashboardCharts() {
    const { role, department, user } = useAuthContext();
    const { data: assets, loading, error } = useFirestoreCollection({ collectionPath: 'assets' });

    if (error) {
        return <div className="text-red-500 rounded-lg bg-red-50 dark:bg-red-950/30 p-4">Gagal memuat grafik dashboard.</div>;
    }

    if (loading || !assets) {
        return (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7 mt-4">
                <Card className="col-span-4 ">
                    <CardHeader><Skeleton className="h-6 w-1/3" /></CardHeader>
                    <CardContent><Skeleton className="h-[300px] w-full" /></CardContent>
                </Card>
                <Card className="col-span-3 ">
                    <CardHeader><Skeleton className="h-6 w-1/3" /></CardHeader>
                    <CardContent><Skeleton className="h-[300px] w-full" /></CardContent>
                </Card>
            </div>
        );
    }

    let typedAssets = assets as unknown as Asset[];

    if (role === 'manager' && department) {
        typedAssets = typedAssets.filter((a) => a.department === department);
    } else if (role === 'employee' && user?.uid) {
        typedAssets = typedAssets.filter((a) => a.assignedTo === user.uid);
    }

    // Bar Chart Data (Status)
    const statusCounts = typedAssets.reduce((acc, asset) => {
        const val = asset.status;
        acc[val] = (acc[val] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const barData = Object.keys(statusLabels).map(key => ({
        name: statusLabels[key as AssetStatus],
        total: statusCounts[key] || 0
    })).filter(item => item.total > 0);

    // Pie Chart Data (Category)
    const categoryCounts = typedAssets.reduce((acc, asset) => {
        const val = asset.category;
        acc[val] = (acc[val] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const pieData = Object.keys(categoryCounts).map(key => ({
        name: categoryLabels[key as AssetCategory] || key,
        value: categoryCounts[key] || 0
    })).sort((a, b) => b.value - a.value);

    const hasBarData = barData.length > 0;
    const hasPieData = pieData.length > 0;

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7 mt-4">
            {/* Status Overview (Bar) */}
            <Card className="col-span-4 ">
                <CardHeader>
                    <CardTitle className="text-base">Tinjauan Status Aset</CardTitle>
                    <CardDescription>
                        Distribusi jumlah aset IT berdasarkan status kesediaannya
                    </CardDescription>
                </CardHeader>
                <CardContent className="pl-0">
                    <div className="h-[300px] w-full flex items-center justify-center">
                        {hasBarData ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={barData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                    <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                                    <BarTooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                    <Bar dataKey="total" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="text-center text-muted-foreground flex flex-col items-center gap-2">
                                <BarChart3 className="h-10 w-10 opacity-20" />
                                <p className="text-sm">Belum ada data aset untuk ditampilkan.</p>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Distribution (Pie) */}
            <Card className="col-span-3 ">
                <CardHeader>
                    <CardTitle className="text-base">Proporsi Kategori</CardTitle>
                    <CardDescription>Komposisi perangkat IT saat ini</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="h-[300px] w-full flex items-center justify-center">
                        {hasPieData ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={pieData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={70}
                                        outerRadius={100}
                                        paddingAngle={3}
                                        dataKey="value"
                                    >
                                        {pieData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <PieTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                    <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '13px' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="text-center text-muted-foreground flex flex-col items-center gap-2">
                                <PieChartIcon className="h-10 w-10 opacity-20" />
                                <p className="text-sm">Belum ada data kategori.</p>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
