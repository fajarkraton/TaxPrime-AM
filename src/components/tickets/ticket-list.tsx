'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { format, formatDistanceToNow } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { Search, Clock, AlertTriangle, TicketCheck, CheckCircle2, ChevronRight, Loader2, Timer, UserCog } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { useFirestoreCollection } from '@/hooks/use-firestore-collection';
import { useAuthContext } from '@/lib/firebase/auth-provider';
import type { ServiceTicket } from '@/types/service-ticket';

const getPriorityBadge = (priority: string) => {
    switch (priority) {
        case 'critical': return <Badge variant="destructive" className="flex gap-1 items-center"><AlertTriangle className="w-3 h-3" /> Kritis</Badge>;
        case 'high': return <Badge className="bg-orange-500 hover:bg-orange-600">Tinggi</Badge>;
        case 'medium': return <Badge className="bg-yellow-500 hover:bg-yellow-600">Sedang</Badge>;
        case 'low': return <Badge variant="secondary">Rendah</Badge>;
        default: return <Badge variant="outline">{priority}</Badge>;
    }
};

const getStatusBadge = (status: string) => {
    switch (status) {
        case 'open': return <Badge variant="outline" className="bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200">Terbuka</Badge>;
        case 'in_progress': return <Badge variant="outline" className="bg-amber-50 text-amber-700 hover:bg-amber-100 border-amber-200"><Clock className="w-3 h-3 mr-1" /> Dalam Proses</Badge>;
        case 'waiting_parts': return <Badge variant="outline" className="bg-purple-50 text-purple-700 hover:bg-purple-100 border-purple-200"><Timer className="w-3 h-3 mr-1" /> Menunggu</Badge>;
        case 'resolved': return <Badge variant="outline" className="bg-green-50 text-green-700 hover:bg-green-100 border-green-200">Selesai</Badge>;
        case 'closed': return <Badge variant="secondary">Ditutup</Badge>;
        default: return <Badge variant="outline">{status}</Badge>;
    }
};

// Precise duration format for SLA mini
function formatSlaDuration(ms: number): string {
    const totalSec = Math.floor(ms / 1000);
    const days = Math.floor(totalSec / 86400);
    const hrs = Math.floor((totalSec % 86400) / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    if (days > 0) return `${days}h ${hrs}j ${mins}m`;
    if (hrs > 0) return `${hrs}j ${mins}m`;
    return `${mins}m`;
}

// SLA mini countdown for table
function getSlaMini(targetTimestamp: unknown, met: boolean | null): { text: string; color: string } | null {
    if (met === true) return { text: '✓ Terpenuhi', color: 'text-green-600' };
    if (met === false) return { text: '✗ Breach', color: 'text-red-600 font-semibold' };
    if (!targetTimestamp) return null;
    try {
        let targetDate: Date;
        if (typeof targetTimestamp === 'object' && targetTimestamp !== null && 'toDate' in targetTimestamp) {
            targetDate = (targetTimestamp as { toDate: () => Date }).toDate();
        } else return null;
        const diff = targetDate.getTime() - Date.now();
        if (diff <= 0) return { text: '✗ Breach', color: 'text-red-600 font-semibold' };
        const remaining = formatSlaDuration(diff);
        if (diff < 3600000) return { text: remaining, color: 'text-red-600' };
        if (diff < 14400000) return { text: remaining, color: 'text-yellow-600' };
        return { text: remaining, color: 'text-green-600' };
    } catch { return null; }
}

export function TicketList() {
    const { user, role } = useAuthContext();
    const isITStaff = role === 'super_admin' || role === 'admin' || role === 'it_staff';

    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [priorityFilter, setPriorityFilter] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');

    // Refresh SLA countdown every minute
    const [, setTick] = useState(0);
    useEffect(() => {
        const interval = setInterval(() => setTick(t => t + 1), 60000);
        return () => clearInterval(interval);
    }, []);

    const { data: tickets, loading, error } = useFirestoreCollection({
        collectionPath: 'serviceTickets',
        pageSize: 50
    });

    const typedTickets = tickets as unknown as ServiceTicket[];

    const filteredTickets = useMemo(() => {
        return typedTickets
            .filter(ticket => {
                if (!isITStaff && ticket.requesterId !== user?.uid) return false;
                if (statusFilter !== 'all' && ticket.status !== statusFilter) return false;
                if (priorityFilter !== 'all' && ticket.priority !== priorityFilter) return false;
                if (searchQuery) {
                    const q = searchQuery.toLowerCase();
                    return ticket.ticketNumber.toLowerCase().includes(q) ||
                        ticket.title.toLowerCase().includes(q) ||
                        ticket.requesterName.toLowerCase().includes(q) ||
                        (ticket.assignedTechName || '').toLowerCase().includes(q);
                }
                return true;
            })
            // Sort: open/in_progress first, then by SLA urgency
            .sort((a, b) => {
                const statusOrder: Record<string, number> = { open: 0, in_progress: 1, waiting_parts: 2, resolved: 3, closed: 4 };
                const aOrder = statusOrder[a.status] ?? 5;
                const bOrder = statusOrder[b.status] ?? 5;
                if (aOrder !== bOrder) return aOrder - bOrder;
                // Within same status, sort by SLA resolution target
                try {
                    const aTarget = a.slaResolutionTarget && 'toDate' in (a.slaResolutionTarget as object) ? (a.slaResolutionTarget as { toDate: () => Date }).toDate().getTime() : Infinity;
                    const bTarget = b.slaResolutionTarget && 'toDate' in (b.slaResolutionTarget as object) ? (b.slaResolutionTarget as { toDate: () => Date }).toDate().getTime() : Infinity;
                    return aTarget - bTarget;
                } catch { return 0; }
            });
    }, [typedTickets, isITStaff, user?.uid, statusFilter, priorityFilter, searchQuery]);

    // Stats
    const stats = useMemo(() => {
        const all = typedTickets.filter(t => isITStaff || t.requesterId === user?.uid);
        const open = all.filter(t => t.status === 'open').length;
        const inProgress = all.filter(t => t.status === 'in_progress').length;
        const resolved = all.filter(t => t.status === 'resolved').length;
        const closed = all.filter(t => t.status === 'closed').length;
        return { total: all.length, open, inProgress, resolved, closed };
    }, [typedTickets, isITStaff, user?.uid]);

    const colSpan = isITStaff ? 9 : 7;

    const statCards = [
        { title: 'Total Tiket', value: stats.total, icon: TicketCheck, color: 'text-blue-600', bg: 'bg-blue-50', desc: 'Semua tiket' },
        { title: 'Terbuka', value: stats.open, icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50', desc: 'Menunggu ditangani' },
        { title: 'Dalam Proses', value: stats.inProgress, icon: Clock, color: 'text-violet-600', bg: 'bg-violet-50', desc: 'Sedang dikerjakan' },
        { title: 'Selesai', value: stats.resolved + stats.closed, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50', desc: 'Resolved & Closed' },
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
                                <div className="text-2xl font-bold">{loading ? '—' : card.value}</div>
                                <p className="text-xs text-slate-500 mt-1">{card.desc}</p>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {/* Main Table Card */}
            <Card className="border-none shadow-sm outline outline-1 outline-slate-200">
                <CardHeader className="pb-3 border-b mb-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                            <CardTitle className="text-xl flex items-center gap-2">
                                <TicketCheck className="w-5 h-5 text-slate-500" />
                                Helpdesk IT
                            </CardTitle>
                            <CardDescription className="mt-1">
                                Kelola dan tangani permintaan bantuan (Service Tickets)
                            </CardDescription>
                        </div>
                        <div className="flex gap-2 items-center">
                            <div className="relative w-full sm:w-[260px]">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <Input
                                    placeholder="Cari no tiket, judul, pelapor..."
                                    className="pl-9 h-9 bg-white"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger className="w-[150px] h-9 bg-white">
                                    <SelectValue placeholder="Semua Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Semua Status</SelectItem>
                                    <SelectItem value="open">Terbuka</SelectItem>
                                    <SelectItem value="in_progress">Dalam Proses</SelectItem>
                                    <SelectItem value="waiting_parts">Menunggu Sparepart</SelectItem>
                                    <SelectItem value="resolved">Selesai</SelectItem>
                                    <SelectItem value="closed">Ditutup</SelectItem>
                                </SelectContent>
                            </Select>
                            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                                <SelectTrigger className="w-[130px] h-9 bg-white">
                                    <SelectValue placeholder="Prioritas" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Semua</SelectItem>
                                    <SelectItem value="critical">Kritis</SelectItem>
                                    <SelectItem value="high">Tinggi</SelectItem>
                                    <SelectItem value="medium">Sedang</SelectItem>
                                    <SelectItem value="low">Rendah</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border bg-white">
                        <Table>
                            <TableHeader className="bg-slate-50">
                                <TableRow>
                                    <TableHead className="font-semibold text-slate-600 w-[120px]">No. Tiket</TableHead>
                                    <TableHead className="font-semibold text-slate-600">Judul Masalah</TableHead>
                                    {isITStaff && <TableHead className="font-semibold text-slate-600">Pelapor</TableHead>}
                                    <TableHead className="font-semibold text-slate-600">Prioritas</TableHead>
                                    {isITStaff && <TableHead className="font-semibold text-slate-600">Teknisi</TableHead>}
                                    <TableHead className="font-semibold text-slate-600">SLA</TableHead>
                                    <TableHead className="font-semibold text-slate-600">Tanggal</TableHead>
                                    <TableHead className="font-semibold text-slate-600">Status</TableHead>
                                    <TableHead className="text-right font-semibold text-slate-600 w-[80px]">Aksi</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={colSpan} className="h-32 text-center">
                                            <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-500 mb-2" />
                                            <p className="text-slate-500 text-sm">Memuat data tiket...</p>
                                        </TableCell>
                                    </TableRow>
                                ) : error ? (
                                    <TableRow>
                                        <TableCell colSpan={colSpan} className="h-32 text-center text-red-500">
                                            Gagal memuat: {error.message}
                                        </TableCell>
                                    </TableRow>
                                ) : filteredTickets.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={colSpan} className="h-32 text-center">
                                            <div className="flex flex-col items-center gap-2 text-slate-400">
                                                <TicketCheck className="h-10 w-10 opacity-20" />
                                                <p className="text-sm">{searchQuery || statusFilter !== 'all' ? 'Tidak ada tiket yang cocok dengan pencarian/filter.' : 'Belum ada tiket bantuan.'}</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredTickets.map((ticket) => (
                                        <TableRow key={ticket.id} className="hover:bg-slate-50/50">
                                            <TableCell className="font-medium font-mono text-xs text-slate-600">{ticket.ticketNumber}</TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="font-medium text-slate-900 truncate max-w-[300px]">{ticket.title}</span>
                                                    {ticket.assetCode !== '-' && (
                                                        <span className="text-xs text-slate-500 mt-0.5">Aset: {ticket.assetCode}</span>
                                                    )}
                                                </div>
                                            </TableCell>
                                            {isITStaff && (
                                                <TableCell>
                                                    <div className="flex flex-col">
                                                        <span className="text-sm text-slate-900">{ticket.requesterName}</span>
                                                        <span className="text-xs text-slate-500">{ticket.requesterDepartment}</span>
                                                    </div>
                                                </TableCell>
                                            )}
                                            <TableCell>{getPriorityBadge(ticket.priority)}</TableCell>
                                            {isITStaff && (
                                                <TableCell>
                                                    {ticket.assignedTechName ? (
                                                        <span className="text-sm text-slate-700 flex items-center gap-1">
                                                            <UserCog className="w-3 h-3 text-slate-400" />
                                                            {ticket.assignedTechName}
                                                        </span>
                                                    ) : (
                                                        <span className="text-xs text-slate-400 italic">Belum ada</span>
                                                    )}
                                                </TableCell>
                                            )}
                                            <TableCell>
                                                {!['closed', 'resolved'].includes(ticket.status) ? (() => {
                                                    const sla = getSlaMini(ticket.slaResolutionTarget, ticket.slaResolutionMet);
                                                    return sla ? <span className={`text-xs font-medium ${sla.color}`}>{sla.text}</span> : <span className="text-xs text-slate-400">—</span>;
                                                })() : (() => {
                                                    const sla = getSlaMini(ticket.slaResolutionTarget, ticket.slaResolutionMet);
                                                    return sla ? <span className={`text-xs ${sla.color}`}>{sla.text}</span> : <span className="text-xs text-slate-400">—</span>;
                                                })()}
                                            </TableCell>
                                            <TableCell className="text-sm text-slate-600">
                                                {ticket.createdAt ? format((ticket.createdAt as unknown as { toDate: () => Date }).toDate(), 'd MMM yy', { locale: localeId }) : '-'}
                                            </TableCell>
                                            <TableCell>{getStatusBadge(ticket.status)}</TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                                                    <Link href={`/tickets/${ticket.id}`}>
                                                        <ChevronRight className="h-4 w-4 text-slate-400" />
                                                    </Link>
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                    {filteredTickets.length > 0 && (
                        <p className="text-xs text-slate-500 mt-3">
                            Menampilkan {filteredTickets.length} dari {stats.total} tiket
                        </p>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
