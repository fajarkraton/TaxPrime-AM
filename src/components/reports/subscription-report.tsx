'use client';

import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as BarTooltip, ResponsiveContainer
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useFirestoreCollection } from '@/hooks/use-firestore-collection';
import { ExportCsvButton } from './export-csv-button';
import { ExportPdfButton } from './export-pdf-button';
import { CreditCard, AlertTriangle, Gauge } from 'lucide-react';
import type { Subscription, SubscriptionStatus } from '@/types';
import type { ReportFilterProps } from './report-tabs';

const statusColors: Record<SubscriptionStatus, string> = {
    'active': 'bg-green-100 text-green-800',
    'expiring_soon': 'bg-amber-100 text-amber-800',
    'expired': 'bg-red-100 text-red-800',
    'cancelled': 'bg-slate-100 text-slate-800',
};
const statusLabels: Record<SubscriptionStatus, string> = {
    'active': 'Aktif', 'expiring_soon': 'Segera Habis', 'expired': 'Kadaluarsa', 'cancelled': 'Dibatalkan',
};

export function SubscriptionReport({ dateFrom, dateTo }: ReportFilterProps) {
    const { data: rawSubs, loading, error } = useFirestoreCollection({ collectionPath: 'subscriptions', pageSize: 200 });

    if (error) return <div className="text-red-500 bg-red-50 p-4 rounded-lg">Gagal memuat data langganan.</div>;

    if (loading || !rawSubs) {
        return (
            <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                    {[1, 2, 3].map(i => <Card key={i}><CardContent className="pt-6"><Skeleton className="h-20 w-full" /></CardContent></Card>)}
                </div>
                <Skeleton className="h-[350px] w-full" />
            </div>
        );
    }

    let subs = rawSubs as unknown as Subscription[];
    // Date range filter on start date
    if (dateFrom || dateTo) {
        const from = dateFrom ? new Date(dateFrom).getTime() : 0;
        const to = dateTo ? new Date(dateTo + 'T23:59:59').getTime() : Infinity;
        subs = subs.filter(s => {
            const sd = s.startDate && typeof (s.startDate as unknown as { toDate: () => Date }).toDate === 'function'
                ? (s.startDate as unknown as { toDate: () => Date }).toDate().getTime() : 0;
            return sd >= from && sd <= to;
        });
    }

    // --- Calculations ---
    const activeSubs = subs.filter(s => s.status === 'active' || s.status === 'expiring_soon');
    const totalMonthlyCost = activeSubs.reduce((sum, s) => {
        const cost = s.costPerPeriod || 0;
        if (s.billingCycle === 'annually') return sum + cost / 12;
        if (s.billingCycle === 'quarterly') return sum + cost / 3;
        return sum + cost;
    }, 0);

    const totalLicenses = activeSubs.reduce((sum, s) => sum + (s.totalLicenses || 0), 0);
    const usedLicenses = activeSubs.reduce((sum, s) => sum + (s.usedLicenses || 0), 0);
    const utilizationRate = totalLicenses > 0 ? Math.round((usedLicenses / totalLicenses) * 100) : 0;

    // Cost per provider
    const providerCosts: Record<string, number> = {};
    activeSubs.forEach(s => {
        const p = s.provider || 'Lainnya';
        const cost = s.costPerPeriod || 0;
        const monthly = s.billingCycle === 'annually' ? cost / 12 : s.billingCycle === 'quarterly' ? cost / 3 : cost;
        providerCosts[p] = (providerCosts[p] || 0) + monthly;
    });
    const providerData = Object.entries(providerCosts)
        .map(([name, total]) => ({ name, total: Math.round(total) }))
        .sort((a, b) => b.total - a.total);

    // Expiring soon (within 30 days)
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const expiringSoon = subs.filter(s => {
        if (s.status === 'cancelled' || s.status === 'expired') return false;
        const expiry = typeof (s.expiryDate as unknown as { toDate: () => Date }).toDate === 'function'
            ? (s.expiryDate as unknown as { toDate: () => Date }).toDate() : null;
        return expiry && expiry <= thirtyDaysFromNow;
    }).sort((a, b) => {
        const aD = typeof (a.expiryDate as unknown as { toDate: () => Date }).toDate === 'function' ? (a.expiryDate as unknown as { toDate: () => Date }).toDate().getTime() : 0;
        const bD = typeof (b.expiryDate as unknown as { toDate: () => Date }).toDate === 'function' ? (b.expiryDate as unknown as { toDate: () => Date }).toDate().getTime() : 0;
        return aD - bD;
    });

    // CSV
    const csvData = subs.map(s => ({
        nama: s.name, provider: s.provider, tipe_lisensi: s.licenseType,
        total_lisensi: s.totalLicenses, terpakai: s.usedLicenses,
        biaya: s.costPerPeriod, siklus: s.billingCycle, status: s.status,
    }));
    const csvHeaders = [
        { key: 'nama', label: 'Nama' }, { key: 'provider', label: 'Provider' },
        { key: 'tipe_lisensi', label: 'Tipe Lisensi' }, { key: 'total_lisensi', label: 'Total Lisensi' },
        { key: 'terpakai', label: 'Terpakai' }, { key: 'biaya', label: 'Biaya/Periode' },
        { key: 'siklus', label: 'Siklus Billing' }, { key: 'status', label: 'Status' },
    ];

    const formatCurrency = (val: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);

    return (
        <div className="space-y-6">
            <div className="flex gap-2 justify-end">
                <ExportPdfButton
                    title="Laporan Biaya Langganan"
                    subtitle="TaxPrime AM — Analitik Subscription & SaaS"
                    headers={['Nama', 'Provider', 'Tipe Lisensi', 'Total Lisensi', 'Terpakai', 'Biaya/Periode', 'Siklus', 'Status']}
                    rows={csvData.map(d => [d.nama, d.provider, d.tipe_lisensi, d.total_lisensi, d.terpakai, formatCurrency(Number(d.biaya) || 0), d.siklus, d.status])}
                    summaryItems={[
                        { label: 'Biaya Bulanan', value: formatCurrency(totalMonthlyCost) },
                        { label: 'Langganan Aktif', value: `${activeSubs.length}/${subs.length}` },
                        { label: 'Utilisasi', value: `${utilizationRate}%` },
                    ]}
                    filename="laporan_langganan"
                    label="Export PDF"
                />
                <ExportCsvButton data={csvData} filename="laporan_langganan" headers={csvHeaders} label="Export CSV" />
            </div>

            {/* Stat Cards */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card className="border-none shadow-sm outline outline-1 outline-slate-200">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-600">Biaya Bulanan</CardTitle>
                        <div className="bg-blue-50 p-2 rounded-lg"><CreditCard className="h-4 w-4 text-blue-600" /></div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(totalMonthlyCost)}</div>
                        <p className="text-xs text-slate-500 mt-1">Estimasi biaya per bulan</p>
                    </CardContent>
                </Card>
                <Card className="border-none shadow-sm outline outline-1 outline-slate-200">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-600">Langganan Aktif</CardTitle>
                        <div className="bg-emerald-50 p-2 rounded-lg"><AlertTriangle className="h-4 w-4 text-emerald-600" /></div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{activeSubs.length}</div>
                        <p className="text-xs text-slate-500 mt-1">Dari total {subs.length} langganan</p>
                    </CardContent>
                </Card>
                <Card className="border-none shadow-sm outline outline-1 outline-slate-200">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-600">Utilisasi Lisensi</CardTitle>
                        <div className="bg-amber-50 p-2 rounded-lg"><Gauge className="h-4 w-4 text-amber-600" /></div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{utilizationRate}%</div>
                        <p className="text-xs text-slate-500 mt-1">{usedLicenses} dari {totalLicenses} lisensi terpakai</p>
                    </CardContent>
                </Card>
            </div>

            {/* Cost per provider chart */}
            <Card className="border-none shadow-sm outline outline-1 outline-slate-200">
                <CardHeader>
                    <CardTitle className="text-base">Biaya per Provider</CardTitle>
                    <CardDescription>Estimasi biaya bulanan berdasarkan penyedia layanan</CardDescription>
                </CardHeader>
                <CardContent className="pl-0">
                    <div className="h-[300px] w-full">
                        {providerData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={providerData} margin={{ top: 10, right: 30, left: 20, bottom: 0 }} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                                    <XAxis type="number" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false}
                                        tickFormatter={(v: number) => `Rp ${(v / 1000).toFixed(0)}rb`} />
                                    <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} width={120} />
                                    <BarTooltip
                                        cursor={{ fill: '#f1f5f9' }}
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                        formatter={(value: number | undefined) => [formatCurrency(value ?? 0), 'Biaya/bulan']}
                                    />
                                    <Bar dataKey="total" fill="#10b981" radius={[0, 4, 4, 0]} barSize={24} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex items-center justify-center h-full text-slate-400 text-sm">Belum ada data provider.</div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Expiring soon table */}
            <Card className="border-none shadow-sm outline outline-1 outline-slate-200">
                <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-amber-500" />
                        Langganan Mendekati Kadaluarsa
                    </CardTitle>
                    <CardDescription>Langganan yang akan berakhir dalam 30 hari ke depan</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border bg-white">
                        <Table>
                            <TableHeader className="bg-slate-50">
                                <TableRow>
                                    <TableHead className="font-semibold text-slate-600">Nama Langganan</TableHead>
                                    <TableHead className="font-semibold text-slate-600">Provider</TableHead>
                                    <TableHead className="font-semibold text-slate-600">Biaya / Periode</TableHead>
                                    <TableHead className="font-semibold text-slate-600">Tanggal Kadaluarsa</TableHead>
                                    <TableHead className="font-semibold text-slate-600">Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {expiringSoon.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                            Tidak ada langganan yang mendekati kadaluarsa. 👍
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    expiringSoon.map(s => {
                                        const expiry = typeof (s.expiryDate as unknown as { toDate: () => Date }).toDate === 'function'
                                            ? (s.expiryDate as unknown as { toDate: () => Date }).toDate() : null;
                                        const daysLeft = expiry ? Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : 0;
                                        return (
                                            <TableRow key={s.id}>
                                                <TableCell className="font-medium">{s.name}</TableCell>
                                                <TableCell className="text-sm">{s.provider}</TableCell>
                                                <TableCell className="text-sm">{formatCurrency(s.costPerPeriod)}</TableCell>
                                                <TableCell className="text-sm">
                                                    {expiry ? expiry.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                                                    {daysLeft <= 7 && <span className="ml-2 text-xs text-red-600 font-semibold">({daysLeft} hari lagi!)</span>}
                                                    {daysLeft > 7 && daysLeft <= 30 && <span className="ml-2 text-xs text-amber-600">({daysLeft} hari lagi)</span>}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge className={statusColors[s.status]} variant="secondary">{statusLabels[s.status]}</Badge>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
