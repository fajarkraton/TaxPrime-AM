'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { AlertTriangle, Clock, ExternalLink, Loader2 } from 'lucide-react';

import { useFirestoreCollection } from '@/hooks/use-firestore-collection';
import { useAuthContext } from '@/lib/firebase/auth-provider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { where } from 'firebase/firestore';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const parseDate = (val: any): Date | null => {
    if (!val) return null;
    if (typeof val === 'string') return new Date(val);
    if (typeof val.toDate === 'function') return val.toDate();
    if (val.seconds) return new Date(val.seconds * 1000);
    return new Date(val);
};

const getPriorityBadge = (priority: string) => {
    switch (priority) {
        case 'critical': return <Badge className="bg-red-600 text-white text-[10px] px-1.5 py-0">Kritis</Badge>;
        case 'high': return <Badge className="bg-orange-500 text-white text-[10px] px-1.5 py-0">Tinggi</Badge>;
        case 'medium': return <Badge className="bg-amber-50 dark:bg-amber-950/300 text-white text-[10px] px-1.5 py-0">Sedang</Badge>;
        case 'low': return <Badge className="bg-muted-foreground text-white text-[10px] px-1.5 py-0">Rendah</Badge>;
        default: return <Badge variant="outline" className="text-[10px] px-1.5 py-0">{priority}</Badge>;
    }
};

const getSlaCountdown = (slaResolutionTarget: Date | null) => {
    if (!slaResolutionTarget) return null;
    const now = new Date();
    const diffMs = slaResolutionTarget.getTime() - now.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (diffMs < 0) {
        const overHours = Math.abs(diffHours);
        return (
            <span className="text-[10px] font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 px-1.5 py-0.5 rounded">
                Breach {overHours}j lalu
            </span>
        );
    }
    if (diffHours < 2) {
        return (
            <span className="text-[10px] font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 px-1.5 py-0.5 rounded">
                {diffHours}j {diffMins}m
            </span>
        );
    }
    if (diffHours < 8) {
        return (
            <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 px-1.5 py-0.5 rounded">
                {diffHours}j {diffMins}m
            </span>
        );
    }
    return (
        <span className="text-[10px] font-medium text-green-600 bg-green-50 px-1.5 py-0.5 rounded">
            {diffHours}j {diffMins}m
        </span>
    );
};

const ticketConstraints = [
    where('status', 'in', ['open', 'in_progress', 'waiting_parts']),
];

export function OpenTicketsWidget() {
    const { role, department, user } = useAuthContext();
    const { data: ticketsRaw, loading } = useFirestoreCollection({
        collectionPath: 'serviceTickets',
        constraints: ticketConstraints,
        pageSize: 20,
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tickets = ticketsRaw as any[];

    // Sort by SLA urgency + RBAC filter
    const sortedTickets = useMemo(() => {
        let filtered = [...tickets];
        if (role === 'manager' && department) {
            filtered = filtered.filter(t => t.requesterDepartment === department);
        } else if (role === 'employee' && user?.uid) {
            filtered = filtered.filter(t => t.requesterId === user.uid);
        }
        return filtered.sort((a, b) => {
            const slaA = parseDate(a.slaResolutionTarget)?.getTime() ?? Infinity;
            const slaB = parseDate(b.slaResolutionTarget)?.getTime() ?? Infinity;
            return slaA - slaB;
        }).slice(0, 5);
    }, [tickets, role, department, user?.uid]);

    return (
        <Card className="">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    Tiket Terbuka
                    {!loading && tickets.length > 0 && (
                        <Badge variant="secondary" className="text-xs">{tickets.length}</Badge>
                    )}
                </CardTitle>
                <Button variant="ghost" size="sm" className="text-xs text-blue-600" asChild>
                    <Link href="/tickets">
                        Lihat Semua <ExternalLink className="w-3 h-3 ml-1" />
                    </Link>
                </Button>
            </CardHeader>
            <CardContent className="p-0">
                {loading ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                    </div>
                ) : sortedTickets.length === 0 ? (
                    <div className="flex flex-col items-center py-8 text-muted-foreground">
                        <Clock className="w-8 h-8 mb-2 opacity-30" />
                        <p className="text-sm">Tidak ada tiket terbuka.</p>
                    </div>
                ) : (
                    <div className="divide-y">
                        {sortedTickets.map((ticket) => {
                            const slaTarget = parseDate(ticket.slaResolutionTarget);
                            const createdAt = parseDate(ticket.createdAt);
                            return (
                                <Link
                                    key={ticket.id}
                                    href={`/tickets/${ticket.id}`}
                                    className="flex items-center justify-between px-4 py-3 hover:bg-muted transition-colors"
                                >
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-0.5">
                                            <span className="text-xs text-muted-foreground font-mono">{ticket.ticketNumber}</span>
                                            {getPriorityBadge(ticket.priority)}
                                        </div>
                                        <p className="text-sm font-medium text-foreground truncate">
                                            {ticket.title}
                                        </p>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <span className="text-[10px] text-muted-foreground">
                                                {createdAt ? format(createdAt, 'd MMM HH:mm', { locale: localeId }) : ''}
                                            </span>
                                            {ticket.assignedToName && (
                                                <span className="text-[10px] text-muted-foreground">
                                                    → {ticket.assignedToName}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="shrink-0 ml-3">
                                        {getSlaCountdown(slaTarget)}
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
