'use client';

import {
    PieChart, Pie, Cell, ResponsiveContainer, Tooltip as PieTooltip, Legend,
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as BarTooltip
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useFirestoreCollection } from '@/hooks/use-firestore-collection';
import { useAuthContext } from '@/lib/firebase/auth-provider';
import { ExportCsvButton } from './export-csv-button';
import { ExportPdfButton } from './export-pdf-button';
import { Boxes, DollarSign, CalendarClock } from 'lucide-react';
import type { Asset, AssetStatus } from '@/types';
import type { ReportFilterProps } from './report-tabs';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

const statusLabels: Record<AssetStatus, string> = {
    'in_stock': 'Tersedia', 'deployed': 'Digunakan', 'maintenance': 'Perbaikan',
    'retired': 'Pensiun', 'procurement': 'Pengadaan', 'reserved': 'Dipesan', 'lost': 'Hilang'
};

export function AssetReport({ dateFrom, dateTo, deptFilter }: ReportFilterProps) {
    const { role, department, user } = useAuthContext();
    const { data: rawAssets, loading, error } = useFirestoreCollection({ collectionPath: 'assets' });

    if (error) return <div className="text-red-500 bg-red-50 p-4 rounded-lg">Gagal memuat data aset.</div>;

    if (loading || !rawAssets) {
        return (
            <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                    {[1, 2, 3].map(i => <Card key={i}><CardContent className="pt-6"><Skeleton className="h-20 w-full" /></CardContent></Card>)}
                </div>
                <Skeleton className="h-[350px] w-full" />
            </div>
        );
    }

    let assets = rawAssets as unknown as Asset[];
    // Role-based filtering: use deptFilter from props (manager), or fallback to existing role logic
    if (deptFilter) {
        assets = assets.filter(a => a.department === deptFilter);
    } else if (role === 'manager' && department) {
        assets = assets.filter(a => a.department === department);
    } else if (role === 'employee' && user?.uid) {
        assets = assets.filter(a => a.assignedTo === user.uid);
    }
    // Date range filter
    if (dateFrom || dateTo) {
        const from = dateFrom ? new Date(dateFrom).getTime() : 0;
        const to = dateTo ? new Date(dateTo + 'T23:59:59').getTime() : Infinity;
        assets = assets.filter(a => {
            const pd = a.purchaseDate && typeof (a.purchaseDate as unknown as { toDate: () => Date }).toDate === 'function'
                ? (a.purchaseDate as unknown as { toDate: () => Date }).toDate().getTime() : 0;
            return pd >= from && pd <= to;
        });
    }

    // --- Calculations ---
    const totalAssets = assets.length;
    const totalValue = assets.reduce((sum, a) => sum + (a.purchasePrice || 0), 0);
    const avgAge = assets.length > 0
        ? Math.round(assets.reduce((sum, a) => {
            const purchaseDate = a.purchaseDate && typeof (a.purchaseDate as unknown as { toDate: () => Date }).toDate === 'function'
                ? (a.purchaseDate as unknown as { toDate: () => Date }).toDate()
                : new Date();
            return sum + ((Date.now() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24 * 365));
        }, 0) / assets.length * 10) / 10
        : 0;

    // Department distribution
    const deptCounts: Record<string, number> = {};
    assets.forEach(a => { deptCounts[a.department || 'Tanpa Dept'] = (deptCounts[a.department || 'Tanpa Dept'] || 0) + 1; });
    const deptData = Object.entries(deptCounts).map(([name, total]) => ({ name, total })).sort((a, b) => b.total - a.total);

    // Status distribution
    const statusCounts: Record<string, number> = {};
    assets.forEach(a => { statusCounts[a.status] = (statusCounts[a.status] || 0) + 1; });
    const statusData = Object.entries(statusLabels)
        .map(([key, label]) => ({ name: label, value: statusCounts[key] || 0 }))
        .filter(d => d.value > 0);

    // Top 10 by price
    const top10 = [...assets].sort((a, b) => (b.purchasePrice || 0) - (a.purchasePrice || 0)).slice(0, 10);

    // CSV export data
    const csvData = assets.map(a => ({
        kode: a.assetCode, nama: a.name, kategori: a.category, status: a.status,
        departemen: a.department, lokasi: a.location, harga: a.purchasePrice, merk: a.brand, model: a.model,
    }));
    const csvHeaders = [
        { key: 'kode', label: 'Kode Aset' }, { key: 'nama', label: 'Nama' },
        { key: 'kategori', label: 'Kategori' }, { key: 'status', label: 'Status' },
        { key: 'departemen', label: 'Departemen' }, { key: 'lokasi', label: 'Lokasi' },
        { key: 'harga', label: 'Harga Beli' }, { key: 'merk', label: 'Merk' }, { key: 'model', label: 'Model' },
    ];

    const formatCurrency = (val: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);

    return (
        <div className="space-y-6">
            {/* Export */}
            <div className="flex gap-2 justify-end">
                <ExportPdfButton
                    title="Laporan Ringkasan Aset"
                    subtitle="TaxPrime AM — Inventaris Aset IT"
                    headers={['Kode Aset', 'Nama', 'Kategori', 'Status', 'Departemen', 'Lokasi', 'Harga Beli', 'Merk', 'Model']}
                    rows={csvData.map(d => [d.kode, d.nama, d.kategori, d.status, d.departemen, d.lokasi, formatCurrency(Number(d.harga) || 0), d.merk, d.model])}
                    summaryItems={[
                        { label: 'Total Aset', value: String(totalAssets) },
                        { label: 'Total Nilai', value: formatCurrency(totalValue) },
                        { label: 'Rata-rata Usia', value: `${avgAge} tahun` },
                    ]}
                    filename="laporan_aset"
                    label="Export PDF"
                />
                <ExportCsvButton data={csvData} filename="laporan_aset" headers={csvHeaders} label="Export CSV" />
            </div>

            {/* Stat Cards */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card className="border-none shadow-sm outline outline-1 outline-slate-200">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-600">Total Aset</CardTitle>
                        <div className="bg-blue-50 p-2 rounded-lg"><Boxes className="h-4 w-4 text-blue-600" /></div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalAssets}</div>
                        <p className="text-xs text-slate-500 mt-1">Seluruh aset terdaftar</p>
                    </CardContent>
                </Card>
                <Card className="border-none shadow-sm outline outline-1 outline-slate-200">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-600">Total Nilai Aset</CardTitle>
                        <div className="bg-emerald-50 p-2 rounded-lg"><DollarSign className="h-4 w-4 text-emerald-600" /></div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(totalValue)}</div>
                        <p className="text-xs text-slate-500 mt-1">Akumulasi harga beli</p>
                    </CardContent>
                </Card>
                <Card className="border-none shadow-sm outline outline-1 outline-slate-200">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-600">Rata-rata Usia</CardTitle>
                        <div className="bg-amber-50 p-2 rounded-lg"><CalendarClock className="h-4 w-4 text-amber-600" /></div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{avgAge} <span className="text-sm font-normal text-slate-500">tahun</span></div>
                        <p className="text-xs text-slate-500 mt-1">Sejak tanggal pembelian</p>
                    </CardContent>
                </Card>
            </div>

            {/* Charts */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <Card className="col-span-4 border-none shadow-sm outline outline-1 outline-slate-200">
                    <CardHeader>
                        <CardTitle className="text-base">Distribusi Aset per Departemen</CardTitle>
                        <CardDescription>Jumlah aset yang dialokasikan ke setiap departemen</CardDescription>
                    </CardHeader>
                    <CardContent className="pl-0">
                        <div className="h-[300px] w-full">
                            {deptData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={deptData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                        <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                                        <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                                        <BarTooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                        <Bar dataKey="total" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="flex items-center justify-center h-full text-slate-400 text-sm">Belum ada data departemen.</div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                <Card className="col-span-3 border-none shadow-sm outline outline-1 outline-slate-200">
                    <CardHeader>
                        <CardTitle className="text-base">Distribusi Status</CardTitle>
                        <CardDescription>Proporsi aset berdasarkan status lifecycle</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[300px] w-full">
                            {statusData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={statusData} cx="50%" cy="50%" innerRadius={70} outerRadius={100} paddingAngle={3} dataKey="value">
                                            {statusData.map((_, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}
                                        </Pie>
                                        <PieTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                        <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '13px' }} />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="flex items-center justify-center h-full text-slate-400 text-sm">Belum ada data status.</div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Top 10 Table */}
            <Card className="border-none shadow-sm outline outline-1 outline-slate-200">
                <CardHeader>
                    <CardTitle className="text-base">Top 10 Aset (Berdasarkan Harga Beli)</CardTitle>
                    <CardDescription>Aset dengan nilai investasi tertinggi</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border bg-white">
                        <Table>
                            <TableHeader className="bg-slate-50">
                                <TableRow>
                                    <TableHead className="font-semibold text-slate-600 w-[120px]">Kode</TableHead>
                                    <TableHead className="font-semibold text-slate-600">Nama Aset</TableHead>
                                    <TableHead className="font-semibold text-slate-600">Merk / Model</TableHead>
                                    <TableHead className="font-semibold text-slate-600">Departemen</TableHead>
                                    <TableHead className="font-semibold text-slate-600">Status</TableHead>
                                    <TableHead className="font-semibold text-slate-600 text-right">Harga Beli</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {top10.length === 0 ? (
                                    <TableRow><TableCell colSpan={6} className="h-24 text-center text-muted-foreground">Belum ada data aset.</TableCell></TableRow>
                                ) : (
                                    top10.map(a => (
                                        <TableRow key={a.id}>
                                            <TableCell className="font-mono text-xs">{a.assetCode}</TableCell>
                                            <TableCell className="font-medium">{a.name}</TableCell>
                                            <TableCell className="text-sm text-slate-600">{a.brand} {a.model}</TableCell>
                                            <TableCell className="text-sm">{a.department || '-'}</TableCell>
                                            <TableCell className="text-sm capitalize">{statusLabels[a.status] || a.status}</TableCell>
                                            <TableCell className="text-right font-medium">{formatCurrency(a.purchasePrice || 0)}</TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
