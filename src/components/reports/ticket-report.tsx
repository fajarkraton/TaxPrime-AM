'use client';

import {
    PieChart, Pie, Cell, ResponsiveContainer, Tooltip as PieTooltip, Legend,
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as BarTooltip
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useFirestoreCollection } from '@/hooks/use-firestore-collection';
import { ExportCsvButton } from './export-csv-button';
import { ExportPdfButton } from './export-pdf-button';
import { TicketCheck, AlertCircle, Clock, ShieldCheck } from 'lucide-react';
import type { ServiceTicket, TicketPriority, TicketCategory } from '@/types';
import type { ReportFilterProps } from './report-tabs';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const priorityLabels: Record<TicketPriority, string> = {
    'low': 'Rendah', 'medium': 'Sedang', 'high': 'Tinggi', 'critical': 'Kritis'
};
const categoryLabels: Record<TicketCategory, string> = {
    'hardware_repair': 'Perbaikan Hardware', 'software_issue': 'Masalah Software',
    'replacement': 'Penggantian', 'new_request': 'Permintaan Baru'
};

export function TicketReport({ dateFrom, dateTo, deptFilter }: ReportFilterProps) {
    const { data: rawTickets, loading, error } = useFirestoreCollection({ collectionPath: 'serviceTickets', pageSize: 500 });

    if (error) return <div className="text-red-500 bg-red-50 p-4 rounded-lg">Gagal memuat data tiket.</div>;

    if (loading || !rawTickets) {
        return (
            <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                    {[1, 2, 3].map(i => <Card key={i}><CardContent className="pt-6"><Skeleton className="h-20 w-full" /></CardContent></Card>)}
                </div>
                <Skeleton className="h-[350px] w-full" />
            </div>
        );
    }

    // Apply filters
    let tickets = rawTickets as unknown as ServiceTicket[];
    if (deptFilter) {
        tickets = tickets.filter(t => t.requesterDepartment === deptFilter);
    }
    if (dateFrom || dateTo) {
        const from = dateFrom ? new Date(dateFrom).getTime() : 0;
        const to = dateTo ? new Date(dateTo + 'T23:59:59').getTime() : Infinity;
        tickets = tickets.filter(t => {
            const created = typeof (t.createdAt as unknown as { toDate: () => Date }).toDate === 'function'
                ? (t.createdAt as unknown as { toDate: () => Date }).toDate().getTime() : 0;
            return created >= from && created <= to;
        });
    }

    // --- Calculations ---
    const totalTickets = tickets.length;
    const openTickets = tickets.filter(t => t.status === 'open' || t.status === 'in_progress').length;

    // Average resolution time (for resolved/closed tickets that have resolvedAt)
    const resolvedTickets = tickets.filter(t => t.resolvedAt && t.createdAt);
    const avgResolutionDays = resolvedTickets.length > 0
        ? Math.round(resolvedTickets.reduce((sum, t) => {
            const created = typeof (t.createdAt as unknown as { toDate: () => Date }).toDate === 'function'
                ? (t.createdAt as unknown as { toDate: () => Date }).toDate() : new Date();
            const resolved = typeof (t.resolvedAt as unknown as { toDate: () => Date }).toDate === 'function'
                ? (t.resolvedAt as unknown as { toDate: () => Date }).toDate() : new Date();
            return sum + ((resolved.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
        }, 0) / resolvedTickets.length * 10) / 10
        : 0;

    // SLA compliance rate
    const ticketsWithSla = tickets.filter(t => t.slaResolutionTarget && t.resolvedAt);
    const slaCompliant = ticketsWithSla.filter(t => {
        const resolved = typeof (t.resolvedAt as unknown as { toDate: () => Date }).toDate === 'function'
            ? (t.resolvedAt as unknown as { toDate: () => Date }).toDate() : new Date();
        const target = typeof (t.slaResolutionTarget as unknown as { toDate: () => Date }).toDate === 'function'
            ? (t.slaResolutionTarget as unknown as { toDate: () => Date }).toDate() : new Date();
        return resolved.getTime() <= target.getTime();
    }).length;
    const slaRate = ticketsWithSla.length > 0
        ? Math.round((slaCompliant / ticketsWithSla.length) * 100)
        : 100;

    // Monthly chart (last 6 months)
    const monthlyData: { name: string; total: number }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthLabel = d.toLocaleDateString('id-ID', { month: 'short', year: '2-digit' });
        const count = tickets.filter(t => {
            const created = typeof (t.createdAt as unknown as { toDate: () => Date }).toDate === 'function'
                ? (t.createdAt as unknown as { toDate: () => Date }).toDate() : null;
            return created && created.getMonth() === d.getMonth() && created.getFullYear() === d.getFullYear();
        }).length;
        monthlyData.push({ name: monthLabel, total: count });
    }

    // Priority distribution
    const prioCounts: Record<string, number> = {};
    tickets.forEach(t => { prioCounts[t.priority] = (prioCounts[t.priority] || 0) + 1; });
    const prioData = Object.entries(priorityLabels)
        .map(([key, label]) => ({ name: label, value: prioCounts[key] || 0 }))
        .filter(d => d.value > 0);

    // Category distribution
    const catCounts: Record<string, number> = {};
    tickets.forEach(t => { catCounts[t.category] = (catCounts[t.category] || 0) + 1; });
    const catData = Object.entries(categoryLabels)
        .map(([key, label]) => ({ name: label, value: catCounts[key] || 0 }))
        .filter(d => d.value > 0);

    // CSV export
    const csvData = tickets.map(t => ({
        nomor: t.ticketNumber, judul: t.title, kategori: categoryLabels[t.category] || t.category,
        prioritas: priorityLabels[t.priority] || t.priority, status: t.status,
        pelapor: t.requesterName, departemen: t.requesterDepartment,
    }));
    const csvHeaders = [
        { key: 'nomor', label: 'No. Tiket' }, { key: 'judul', label: 'Judul' },
        { key: 'kategori', label: 'Kategori' }, { key: 'prioritas', label: 'Prioritas' },
        { key: 'status', label: 'Status' }, { key: 'pelapor', label: 'Pelapor' },
        { key: 'departemen', label: 'Departemen' },
    ];

    // --- G-RPT-02: Avg resolution per category & priority ---
    const resolveTime = (t: ServiceTicket) => {
        const created = typeof (t.createdAt as unknown as { toDate: () => Date }).toDate === 'function'
            ? (t.createdAt as unknown as { toDate: () => Date }).toDate() : null;
        const resolved = typeof (t.resolvedAt as unknown as { toDate: () => Date }).toDate === 'function'
            ? (t.resolvedAt as unknown as { toDate: () => Date }).toDate() : null;
        if (!created || !resolved) return null;
        return Math.round(((resolved.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)) * 10) / 10;
    };

    const resByCat: Record<string, number[]> = {};
    const resByPrio: Record<string, number[]> = {};
    resolvedTickets.forEach(t => {
        const days = resolveTime(t);
        if (days === null) return;
        (resByCat[t.category] ??= []).push(days);
        (resByPrio[t.priority] ??= []).push(days);
    });
    const avgResByCat = Object.entries(categoryLabels)
        .filter(([k]) => resByCat[k]?.length)
        .map(([k, label]) => ({ name: label, hari: Math.round((resByCat[k].reduce((a, b) => a + b, 0) / resByCat[k].length) * 10) / 10 }));
    const avgResByPrio = Object.entries(priorityLabels)
        .filter(([k]) => resByPrio[k]?.length)
        .map(([k, label]) => ({ name: label, hari: Math.round((resByPrio[k].reduce((a, b) => a + b, 0) / resByPrio[k].length) * 10) / 10 }));

    // --- G-RPT-03: IT Staff workload ---
    const techCounts: Record<string, number> = {};
    tickets.forEach(t => {
        if (t.assignedTechName) {
            techCounts[t.assignedTechName] = (techCounts[t.assignedTechName] || 0) + 1;
        }
    });
    const workloadData = Object.entries(techCounts)
        .map(([name, count]) => ({ name, tiket: count }))
        .sort((a, b) => b.tiket - a.tiket);

    return (
        <div className="space-y-6">
            <div className="flex gap-2 justify-end">
                <ExportPdfButton
                    title="Laporan Tiket Helpdesk"
                    subtitle="TaxPrime AM — Analitik Service Ticket"
                    headers={['No. Tiket', 'Judul', 'Kategori', 'Prioritas', 'Status', 'Pelapor', 'Departemen']}
                    rows={csvData.map(d => [d.nomor, d.judul, d.kategori, d.prioritas, d.status, d.pelapor, d.departemen])}
                    summaryItems={[
                        { label: 'Total Tiket', value: String(totalTickets) },
                        { label: 'Tiket Terbuka', value: String(openTickets) },
                        { label: 'Rata-rata Resolusi', value: `${avgResolutionDays} hari` },
                        { label: 'SLA Compliance', value: `${slaRate}%` },
                    ]}
                    filename="laporan_tiket"
                    label="Export PDF"
                />
                <ExportCsvButton data={csvData} filename="laporan_tiket" headers={csvHeaders} label="Export CSV" />
            </div>

            {/* Stat Cards */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card className="border-none shadow-sm outline outline-1 outline-slate-200">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-600">Total Tiket</CardTitle>
                        <div className="bg-blue-50 p-2 rounded-lg"><TicketCheck className="h-4 w-4 text-blue-600" /></div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalTickets}</div>
                        <p className="text-xs text-slate-500 mt-1">Seluruh tiket helpdesk</p>
                    </CardContent>
                </Card>
                <Card className="border-none shadow-sm outline outline-1 outline-slate-200">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-600">Tiket Terbuka</CardTitle>
                        <div className="bg-amber-50 p-2 rounded-lg"><AlertCircle className="h-4 w-4 text-amber-600" /></div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{openTickets}</div>
                        <p className="text-xs text-slate-500 mt-1">Menunggu penanganan</p>
                    </CardContent>
                </Card>
                <Card className="border-none shadow-sm outline outline-1 outline-slate-200">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-600">Rata-rata Penyelesaian</CardTitle>
                        <div className="bg-emerald-50 p-2 rounded-lg"><Clock className="h-4 w-4 text-emerald-600" /></div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{avgResolutionDays} <span className="text-sm font-normal text-slate-500">hari</span></div>
                        <p className="text-xs text-slate-500 mt-1">Waktu rata-rata resolusi</p>
                    </CardContent>
                </Card>
                <Card className="border-none shadow-sm outline outline-1 outline-slate-200">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-600">SLA Compliance</CardTitle>
                        <div className="bg-violet-50 p-2 rounded-lg"><ShieldCheck className="h-4 w-4 text-violet-600" /></div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{slaRate}<span className="text-sm font-normal text-slate-500">%</span></div>
                        <p className="text-xs text-slate-500 mt-1">{slaCompliant}/{ticketsWithSla.length} tiket tepat waktu</p>
                    </CardContent>
                </Card>
            </div>

            {/* Charts */}
            <Card className="border-none shadow-sm outline outline-1 outline-slate-200">
                <CardHeader>
                    <CardTitle className="text-base">Tren Tiket per Bulan</CardTitle>
                    <CardDescription>Jumlah tiket masuk dalam 6 bulan terakhir</CardDescription>
                </CardHeader>
                <CardContent className="pl-0">
                    <div className="h-[300px] w-full">
                        {monthlyData.some(d => d.total > 0) ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={monthlyData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                    <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                                    <BarTooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                    <Bar dataKey="total" fill="#8b5cf6" radius={[4, 4, 0, 0]} barSize={40} name="Tiket" />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex items-center justify-center h-full text-slate-400 text-sm">Belum ada data tiket di 6 bulan terakhir.</div>
                        )}
                    </div>
                </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-2">
                <Card className="border-none shadow-sm outline outline-1 outline-slate-200">
                    <CardHeader>
                        <CardTitle className="text-base">Distribusi Prioritas</CardTitle>
                        <CardDescription>Proporsi tiket berdasarkan tingkat prioritas</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[280px] w-full">
                            {prioData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={prioData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={3} dataKey="value">
                                            {prioData.map((_, i) => (<Cell key={`p-${i}`} fill={COLORS[i % COLORS.length]} />))}
                                        </Pie>
                                        <PieTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                        <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '13px' }} />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="flex items-center justify-center h-full text-slate-400 text-sm">Belum ada data.</div>
                            )}
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-none shadow-sm outline outline-1 outline-slate-200">
                    <CardHeader>
                        <CardTitle className="text-base">Distribusi Kategori</CardTitle>
                        <CardDescription>Proporsi tiket berdasarkan jenis permasalahan</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[280px] w-full">
                            {catData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={catData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={3} dataKey="value">
                                            {catData.map((_, i) => (<Cell key={`c-${i}`} fill={COLORS[(i + 2) % COLORS.length]} />))}
                                        </Pie>
                                        <PieTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                        <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '13px' }} />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="flex items-center justify-center h-full text-slate-400 text-sm">Belum ada data.</div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* G-RPT-02: Avg Resolution per Category & Priority */}
            <div className="grid gap-4 md:grid-cols-2">
                <Card className="border-none shadow-sm outline outline-1 outline-slate-200">
                    <CardHeader>
                        <CardTitle className="text-base">Waktu Resolusi per Kategori</CardTitle>
                        <CardDescription>Rata-rata hari penyelesaian berdasarkan jenis permasalahan</CardDescription>
                    </CardHeader>
                    <CardContent className="pl-0">
                        <div className="h-[220px] w-full">
                            {avgResByCat.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={avgResByCat} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                                        <XAxis type="number" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} unit=" hr" />
                                        <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} width={130} />
                                        <BarTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} formatter={(v) => [`${v} hari`, 'Rata-rata']} />
                                        <Bar dataKey="hari" fill="#f59e0b" radius={[0, 4, 4, 0]} barSize={20} />
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="flex items-center justify-center h-full text-slate-400 text-sm">Belum ada data resolusi.</div>
                            )}
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-none shadow-sm outline outline-1 outline-slate-200">
                    <CardHeader>
                        <CardTitle className="text-base">Waktu Resolusi per Prioritas</CardTitle>
                        <CardDescription>Rata-rata hari penyelesaian berdasarkan tingkat prioritas</CardDescription>
                    </CardHeader>
                    <CardContent className="pl-0">
                        <div className="h-[220px] w-full">
                            {avgResByPrio.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={avgResByPrio} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                                        <XAxis type="number" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} unit=" hr" />
                                        <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} width={80} />
                                        <BarTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} formatter={(v) => [`${v} hari`, 'Rata-rata']} />
                                        <Bar dataKey="hari" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={20} />
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="flex items-center justify-center h-full text-slate-400 text-sm">Belum ada data resolusi.</div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* G-RPT-03: IT Staff Workload */}
            <Card className="border-none shadow-sm outline outline-1 outline-slate-200">
                <CardHeader>
                    <CardTitle className="text-base">Distribusi Beban Kerja per Teknisi</CardTitle>
                    <CardDescription>Jumlah tiket yang ditangani masing-masing IT Staff</CardDescription>
                </CardHeader>
                <CardContent className="pl-0">
                    <div className="h-[250px] w-full">
                        {workloadData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={workloadData} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                                    <XAxis type="number" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                                    <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} width={140} />
                                    <BarTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                    <Bar dataKey="tiket" fill="#10b981" radius={[0, 4, 4, 0]} barSize={22} name="Tiket" />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex items-center justify-center h-full text-slate-400 text-sm">Belum ada tiket yang di-assign ke teknisi.</div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
