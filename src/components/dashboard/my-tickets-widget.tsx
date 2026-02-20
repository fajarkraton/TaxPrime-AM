'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { TicketCheck, ExternalLink, Loader2, Inbox } from 'lucide-react';

import { useFirestoreCollection } from '@/hooks/use-firestore-collection';
import { useAuthContext } from '@/lib/firebase/auth-provider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const parseDate = (val: any): Date | null => {
    if (!val) return null;
    if (typeof val === 'string') return new Date(val);
    if (typeof val.toDate === 'function') return val.toDate();
    if (val.seconds) return new Date(val.seconds * 1000);
    return new Date(val);
};

const getStatusBadge = (status: string) => {
    switch (status) {
        case 'open': return <Badge className="bg-blue-500 text-white text-[10px] px-1.5 py-0">Buka</Badge>;
        case 'in_progress': return <Badge className="bg-amber-500 text-white text-[10px] px-1.5 py-0">Proses</Badge>;
        case 'waiting_parts': return <Badge className="bg-purple-500 text-white text-[10px] px-1.5 py-0">Menunggu</Badge>;
        case 'resolved': return <Badge className="bg-green-500 text-white text-[10px] px-1.5 py-0">Selesai</Badge>;
        case 'closed': return <Badge className="bg-muted-foreground text-white text-[10px] px-1.5 py-0">Ditutup</Badge>;
        default: return <Badge variant="outline" className="text-[10px] px-1.5 py-0">{status}</Badge>;
    }
};

export function MyTicketsWidget() {
    const { user } = useAuthContext();
    const { data: ticketsRaw, loading } = useFirestoreCollection({
        collectionPath: 'serviceTickets',
        pageSize: 50,
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tickets = ticketsRaw as any[];

    const myTickets = useMemo(() => {
        if (!user?.uid) return [];
        return tickets
            .filter(t => t.requesterId === user.uid)
            .sort((a, b) => {
                const dateA = parseDate(a.createdAt)?.getTime() ?? 0;
                const dateB = parseDate(b.createdAt)?.getTime() ?? 0;
                return dateB - dateA;
            })
            .slice(0, 5);
    }, [tickets, user?.uid]);

    return (
        <Card className="">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <TicketCheck className="w-4 h-4 text-violet-500" />
                    Tiket Saya
                    {!loading && myTickets.length > 0 && (
                        <Badge variant="secondary" className="text-xs">{myTickets.length}</Badge>
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
                ) : myTickets.length === 0 ? (
                    <div className="flex flex-col items-center py-8 text-muted-foreground">
                        <Inbox className="w-8 h-8 mb-2 opacity-30" />
                        <p className="text-sm">Anda belum memiliki tiket.</p>
                    </div>
                ) : (
                    <div className="divide-y">
                        {myTickets.map((ticket) => {
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
                                            {getStatusBadge(ticket.status)}
                                        </div>
                                        <p className="text-sm font-medium text-foreground truncate">
                                            {ticket.title}
                                        </p>
                                        <span className="text-[10px] text-muted-foreground">
                                            {createdAt ? format(createdAt, 'd MMM HH:mm', { locale: localeId }) : ''}
                                        </span>
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
