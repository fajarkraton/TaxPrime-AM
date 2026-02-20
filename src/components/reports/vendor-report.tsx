'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useFirestoreCollection } from '@/hooks/use-firestore-collection';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import type { ReportFilterProps } from './report-tabs';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#14b8a6'];

interface VendorStats {
    vendor: string;
    totalAssets: number;
    totalValue: number;
    avgValue: number;
    maintenanceCount: number;
    maintenanceRate: number;
}

export function VendorReport({ deptFilter }: ReportFilterProps) {
    const { data: assets, loading: loadingAssets } = useFirestoreCollection({
        collectionPath: 'assets',
    });
    const { data: tickets, loading: loadingTickets } = useFirestoreCollection({
        collectionPath: 'serviceTickets',
    });

    if (loadingAssets || loadingTickets) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-[300px] w-full" />
                <Skeleton className="h-[200px] w-full" />
            </div>
        );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const typedAssets = assets as any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const typedTickets = tickets as any[];

    // Filter by department if manager
    const filteredAssets = deptFilter
        ? typedAssets.filter(a => a.department === deptFilter)
        : typedAssets;

    // Group by vendor
    const vendorMap = new Map<string, VendorStats>();

    for (const asset of filteredAssets) {
        const vendor = asset.vendor?.trim() || 'Tidak Diketahui';
        if (!vendorMap.has(vendor)) {
            vendorMap.set(vendor, {
                vendor,
                totalAssets: 0,
                totalValue: 0,
                avgValue: 0,
                maintenanceCount: 0,
                maintenanceRate: 0,
            });
        }
        const stats = vendorMap.get(vendor)!;
        stats.totalAssets++;
        stats.totalValue += (asset.purchasePrice || 0);
    }

    // Count maintenance tickets per vendor
    for (const ticket of typedTickets) {
        const assetCode = ticket.assetCode;
        if (!assetCode) continue;
        const asset = filteredAssets.find(a => a.assetCode === assetCode);
        if (asset) {
            const vendor = asset.vendor?.trim() || 'Tidak Diketahui';
            const stats = vendorMap.get(vendor);
            if (stats) stats.maintenanceCount++;
        }
    }

    // Calculate averages and rates
    const vendorStats: VendorStats[] = Array.from(vendorMap.values())
        .map(v => ({
            ...v,
            avgValue: v.totalAssets > 0 ? Math.round(v.totalValue / v.totalAssets) : 0,
            maintenanceRate: v.totalAssets > 0 ? Math.round((v.maintenanceCount / v.totalAssets) * 100) : 0,
        }))
        .sort((a, b) => b.totalAssets - a.totalAssets);

    const chartData = vendorStats.slice(0, 8);

    const getRatingBadge = (rate: number) => {
        if (rate <= 10) return <Badge className="bg-emerald-500 text-xs">Sangat Baik</Badge>;
        if (rate <= 25) return <Badge className="bg-blue-500 text-xs">Baik</Badge>;
        if (rate <= 50) return <Badge className="bg-amber-500 text-xs">Cukup</Badge>;
        return <Badge variant="destructive" className="text-xs">Buruk</Badge>;
    };

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardContent className="p-4 text-center">
                        <p className="text-2xl font-bold">{vendorStats.length}</p>
                        <p className="text-sm text-muted-foreground">Total Vendor</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 text-center">
                        <p className="text-2xl font-bold">Rp {(vendorStats.reduce((s, v) => s + v.totalValue, 0) / 1_000_000).toFixed(1)}jt</p>
                        <p className="text-sm text-muted-foreground">Total Nilai Aset</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 text-center">
                        <p className="text-2xl font-bold">{vendorStats.reduce((s, v) => s + v.maintenanceCount, 0)}</p>
                        <p className="text-sm text-muted-foreground">Total Tiket Maintenance</p>
                    </CardContent>
                </Card>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base">Jumlah Aset per Vendor</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={280}>
                            <BarChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                                <XAxis dataKey="vendor" tick={{ fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={60} />
                                <YAxis tick={{ fontSize: 11 }} />
                                <Tooltip formatter={(v) => [Number(v || 0), 'Aset']} />
                                <Bar dataKey="totalAssets" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base">Distribusi Nilai Aset</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={280}>
                            <PieChart>
                                <Pie
                                    data={chartData.filter(d => d.totalValue > 0)}
                                    dataKey="totalValue"
                                    nameKey="vendor"
                                    cx="50%"
                                    cy="50%"
                                    outerRadius={100}
                                    label={({ name, percent }: { name?: string; percent?: number }) => `${name || ''} (${((percent || 0) * 100).toFixed(0)}%)`}
                                    labelLine={{ stroke: 'hsl(var(--muted-foreground))' }}
                                >
                                    {chartData.map((_, i) => (
                                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(v) => [`Rp ${(Number(v || 0) / 1_000_000).toFixed(1)}jt`, 'Nilai']} />
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            {/* Vendor Table */}
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-base">Detail Performa Vendor</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Vendor</TableHead>
                                <TableHead className="text-right">Jumlah Aset</TableHead>
                                <TableHead className="text-right">Total Nilai</TableHead>
                                <TableHead className="text-right">Rata-rata</TableHead>
                                <TableHead className="text-right">Tiket</TableHead>
                                <TableHead className="text-right">Maintenance Rate</TableHead>
                                <TableHead className="text-center">Rating</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {vendorStats.map(v => (
                                <TableRow key={v.vendor}>
                                    <TableCell className="font-medium">{v.vendor}</TableCell>
                                    <TableCell className="text-right">{v.totalAssets}</TableCell>
                                    <TableCell className="text-right">Rp {v.totalValue.toLocaleString('id-ID')}</TableCell>
                                    <TableCell className="text-right">Rp {v.avgValue.toLocaleString('id-ID')}</TableCell>
                                    <TableCell className="text-right">{v.maintenanceCount}</TableCell>
                                    <TableCell className="text-right">{v.maintenanceRate}%</TableCell>
                                    <TableCell className="text-center">{getRatingBadge(v.maintenanceRate)}</TableCell>
                                </TableRow>
                            ))}
                            {vendorStats.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                                        Tidak ada data vendor.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
