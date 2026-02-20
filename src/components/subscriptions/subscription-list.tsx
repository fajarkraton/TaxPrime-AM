'use client';

import { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import {
    CheckCircle2, AlertCircle, CreditCard, Search, ChevronRight, Loader2, Download,
} from 'lucide-react';

import { useFirestoreCollection } from '@/hooks/use-firestore-collection';
import type { Subscription } from '@/types/subscription';
import { SubscriptionCostChart } from './subscription-cost-chart';
import { SubscriptionCostTrend } from './subscription-cost-trend';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';

const getStatusBadge = (status: string) => {
    switch (status) {
        case 'active': return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Aktif</Badge>;
        case 'expiring_soon': return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200"><AlertCircle className="w-3 h-3 mr-1" /> Segera Habis</Badge>;
        case 'expired': return <Badge variant="destructive">Kedaluwarsa</Badge>;
        case 'cancelled': return <Badge variant="secondary">Dibatalkan</Badge>;
        default: return <Badge variant="outline">{status}</Badge>;
    }
};

const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: currency || 'IDR',
        minimumFractionDigits: 0,
    }).format(amount);
};

export function SubscriptionList() {
    const [searchQuery, setSearchQuery] = useState('');

    const { data: subscriptionsData, loading } = useFirestoreCollection({
        collectionPath: 'subscriptions',
        pageSize: 100
    });

    const subscriptions = subscriptionsData as unknown as Subscription[];

    const filteredSubscriptions = useMemo(() => {
        return subscriptions.filter(sub =>
            sub.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            sub.provider.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [subscriptions, searchQuery]);

    // CSV Export
    const handleExportCsv = useCallback(() => {
        if (subscriptions.length === 0) return;
        const headers = ['Nama', 'Provider', 'Status', 'Tipe Lisensi', 'Dipakai', 'Total', 'Biaya', 'Siklus', 'Mata Uang', 'Tanggal Mulai', 'Jatuh Tempo', 'Auto-Renew'];
        const rows = subscriptions.map(s => {
            const start = s.startDate && typeof s.startDate === 'object' && 'toDate' in s.startDate
                ? format((s.startDate as { toDate: () => Date }).toDate(), 'yyyy-MM-dd') : '';
            const expiry = s.expiryDate && typeof s.expiryDate === 'object' && 'toDate' in s.expiryDate
                ? format((s.expiryDate as { toDate: () => Date }).toDate(), 'yyyy-MM-dd') : '';
            return [
                s.name, s.provider, s.status, s.licenseType,
                String(s.usedLicenses), String(s.totalLicenses),
                String(s.costPerPeriod), s.billingCycle, s.currency || 'IDR',
                start, expiry, s.autoRenew ? 'Ya' : 'Tidak',
            ];
        });
        const csvContent = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
        const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `langganan_itams_${format(new Date(), 'yyyyMMdd')}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    }, [subscriptions]);

    // Stats
    const stats = useMemo(() => {
        const active = subscriptions.filter(s => s.status === 'active').length;
        const expiringSoon = subscriptions.filter(s => s.status === 'expiring_soon').length;
        const expired = subscriptions.filter(s => s.status === 'expired').length;
        const totalActiveSubs = subscriptions.filter(s => s.status === 'active' || s.status === 'expiring_soon');
        const totalCost = totalActiveSubs.reduce((acc, curr) => acc + curr.costPerPeriod, 0);
        return { total: subscriptions.length, active, expiringSoon, expired, totalCost };
    }, [subscriptions]);

    const statCards = [
        { title: 'Total Langganan', value: loading ? '—' : String(stats.total), icon: CreditCard, color: 'text-blue-600', bg: 'bg-blue-50', desc: 'Semua langganan terdaftar' },
        { title: 'Aktif', value: loading ? '—' : String(stats.active), icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50', desc: 'Langganan berjalan' },
        { title: 'Segera Habis', value: loading ? '—' : String(stats.expiringSoon), icon: AlertCircle, color: 'text-amber-600', bg: 'bg-amber-50', desc: 'Perlu perpanjangan' },
        { title: 'Estimasi Biaya', value: loading ? '—' : formatCurrency(stats.totalCost, 'IDR'), icon: CreditCard, color: 'text-violet-600', bg: 'bg-violet-50', desc: 'Total biaya aktif / siklus' },
    ];

    return (
        <div className="space-y-6">
            {/* Stat Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {statCards.map((card, i) => {
                    const Icon = card.icon;
                    return (
                        <Card key={i} className="border-none shadow-sm outline outline-1 outline-slate-200">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium text-slate-600">{card.title}</CardTitle>
                                <div className={`${card.bg} p-2 rounded-lg`}><Icon className={`h-4 w-4 ${card.color}`} /></div>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{card.value}</div>
                                <p className="text-xs text-slate-500 mt-1">{card.desc}</p>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {/* Cost Charts */}
            {!loading && subscriptions.length > 0 && (
                <div className="grid gap-4 md:grid-cols-2">
                    <SubscriptionCostChart subscriptions={subscriptions} />
                    <SubscriptionCostTrend subscriptions={subscriptions} />
                </div>
            )}

            {/* Main Table Card */}
            <Card className="border-none shadow-sm outline outline-1 outline-slate-200">
                <CardHeader className="pb-3 border-b mb-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                            <CardTitle className="text-xl flex items-center gap-2">
                                <CreditCard className="w-5 h-5 text-slate-500" />
                                Daftar Lisensi & SaaS
                            </CardTitle>
                            <CardDescription className="mt-1">
                                Kelola dan alokasikan lisensi aplikasi ke pengguna divisi Anda.
                            </CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-9"
                                onClick={handleExportCsv}
                                disabled={loading || subscriptions.length === 0}
                            >
                                <Download className="w-4 h-4 mr-1.5" />
                                Export CSV
                            </Button>
                            <div className="relative w-full sm:w-[280px]">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <Input
                                    placeholder="Cari langganan atau provider..."
                                    className="pl-9 h-9 bg-white"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border bg-white">
                        <Table>
                            <TableHeader className="bg-slate-50">
                                <TableRow>
                                    <TableHead className="font-semibold text-slate-600">Langganan</TableHead>
                                    <TableHead className="font-semibold text-slate-600">Status</TableHead>
                                    <TableHead className="font-semibold text-slate-600">Utilisasi Lisensi</TableHead>
                                    <TableHead className="font-semibold text-slate-600">Biaya / Siklus</TableHead>
                                    <TableHead className="font-semibold text-slate-600">Kedaluwarsa</TableHead>
                                    <TableHead className="text-right font-semibold text-slate-600 w-[80px]">Aksi</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-32 text-center">
                                            <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-500 mb-2" />
                                            <p className="text-slate-500 text-sm">Memuat data langganan...</p>
                                        </TableCell>
                                    </TableRow>
                                ) : filteredSubscriptions.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-32 text-center">
                                            <div className="flex flex-col items-center gap-2 text-slate-400">
                                                <CreditCard className="h-10 w-10 opacity-20" />
                                                <p className="text-sm">{searchQuery ? 'Tidak ada langganan yang cocok.' : 'Belum ada data langganan.'}</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredSubscriptions.map((sub) => {
                                        const usagePercent = sub.totalLicenses > 0 ? Math.min((sub.usedLicenses / sub.totalLicenses) * 100, 100) : 0;
                                        const isFull = sub.usedLicenses >= sub.totalLicenses;
                                        const isNearFull = !isFull && sub.totalLicenses > 0 && usagePercent >= 90;
                                        const isOver = sub.usedLicenses > sub.totalLicenses;

                                        return (
                                            <TableRow key={sub.id} className="hover:bg-slate-50/50">
                                                <TableCell>
                                                    <div className="flex flex-col">
                                                        <span className="font-medium text-slate-900">{sub.name}</span>
                                                        <span className="text-xs text-slate-500">{sub.provider}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>{getStatusBadge(sub.status)}</TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className={`text-xs font-medium ${isOver ? 'text-red-600 font-semibold' : isFull ? 'text-red-600' : isNearFull ? 'text-amber-600' : ''}`}>
                                                            {sub.usedLicenses} / {sub.totalLicenses}
                                                        </span>
                                                        <span className="text-xs text-slate-500 capitalize">({sub.licenseType.replace('_', ' ')})</span>
                                                        {isOver && <span className="text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded-full">‼ Over</span>}
                                                        {isFull && !isOver && <span className="text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded-full">Penuh</span>}
                                                        {isNearFull && <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full">⚠ Hampir Penuh</span>}
                                                    </div>
                                                    <Progress value={usagePercent} className={`h-2 ${isFull || isOver ? '[&>div]:bg-red-500' : isNearFull ? '[&>div]:bg-amber-500' : ''}`} />
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col">
                                                        <span className="font-medium text-slate-900">{formatCurrency(sub.costPerPeriod, sub.currency)}</span>
                                                        <span className="text-xs text-slate-500 capitalize">{sub.billingCycle}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-sm text-slate-600">
                                                    {sub.expiryDate ? format((sub.expiryDate as unknown as { toDate: () => Date }).toDate(), 'd MMM yy', { locale: localeId }) : '-'}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                                                        <Link href={`/subscriptions/${sub.id}`}>
                                                            <ChevronRight className="h-4 w-4 text-slate-400" />
                                                        </Link>
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </div>
                    {filteredSubscriptions.length > 0 && (
                        <p className="text-xs text-slate-500 mt-3">
                            Menampilkan {filteredSubscriptions.length} dari {stats.total} langganan
                        </p>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
