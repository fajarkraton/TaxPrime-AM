'use client';

import { useFirestoreCollection } from '@/hooks/use-firestore-collection';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { BellRing, Clock, AlertCircle } from 'lucide-react';
import type { ServiceTicket, Subscription } from '@/types';
import { formatDistanceToNow, isPast } from 'date-fns';
import { id } from 'date-fns/locale';

export function AlertCenter() {
    // We fetch open/in_progress tickets
    const { data: tickets, loading: loadingTix } = useFirestoreCollection({
        collectionPath: 'serviceTickets',
        filters: [{ field: 'status', operator: 'in', value: ['open', 'in_progress'] }]
    });

    // We fetch active subscriptions
    const { data: subs, loading: loadingSubs } = useFirestoreCollection({
        collectionPath: 'subscriptions',
        filters: [{ field: 'status', operator: '==', value: 'active' }]
    });

    if (loadingTix || loadingSubs) {
        return (
            <Card className="col-span-full xl:col-span-3 ">
                <CardHeader>
                    <Skeleton className="h-6 w-[150px]" />
                </CardHeader>
                <CardContent className="space-y-4">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                </CardContent>
            </Card>
        );
    }

    const typedTickets = (tickets || []) as unknown as ServiceTicket[];
    const typedSubs = (subs || []) as unknown as Subscription[];

    // --- 1. Find Tickets Near SLA Breach ---
    // Rule: Sort by slaResolutionTarget ascending (nearest first)
    const now = new Date();

    const urgentTickets = typedTickets
        .filter(t => t.slaResolutionTarget && !t.resolvedAt)
        .sort((a, b) => {
            const dateA = a.slaResolutionTarget.toDate().getTime();
            const dateB = b.slaResolutionTarget.toDate().getTime();
            return dateA - dateB;
        })
        .slice(0, 5); // Take top 5

    // --- 2. Find Expiring Subscriptions (Within 30 Days) ---
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(now.getDate() + 30);

    const expiringSubs = typedSubs
        .filter(s => {
            // Kita parse explicit string jika Firestore Timestamp belum beradaptasi penuh
            const expDate = typeof s.expiryDate === 'string'
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                ? new Date(s.expiryDate as string)
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                : (s.expiryDate as any)?.toDate ? (s.expiryDate as any).toDate() : new Date();

            // Masuk alert jika kurang dari 30 hari lagi
            return expDate > now && expDate <= thirtyDaysFromNow;
        })
        .sort((a, b) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const dateA = typeof a.expiryDate === 'string' ? new Date(a.expiryDate).getTime() : (a.expiryDate as any).toDate().getTime();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const dateB = typeof b.expiryDate === 'string' ? new Date(b.expiryDate).getTime() : (b.expiryDate as any).toDate().getTime();
            return dateA - dateB;
        });


    if (urgentTickets.length === 0 && expiringSubs.length === 0) {
        return null; // Don't show Alert center if everything is fine
    }

    return (
        <Card className="col-span-full bg-red-50 dark:bg-red-950/30">
            <CardHeader className="pb-3 border-b border-red-100 flex flex-row items-center justify-between space-y-0">
                <div>
                    <CardTitle className="text-base text-red-700 flex items-center gap-2">
                        <AlertCircle className="w-5 h-5" />
                        Pusat Perhatian (Alert Center)
                    </CardTitle>
                    <CardDescription className="text-red-600 dark:text-red-400/70">
                        Insiden SLA Kritis dan Jatuh Tempo Layanan
                    </CardDescription>
                </div>
                <div className="bg-red-100 p-2 rounded-full hidden sm:block">
                    <BellRing className="w-4 h-4 text-red-600 dark:text-red-400" />
                </div>
            </CardHeader>
            <CardContent className="pt-4 grid gap-6 md:grid-cols-2">

                {/* Tickets Col */}
                {urgentTickets.length > 0 && (
                    <div className="space-y-3">
                        <h4 className="text-sm font-semibold flex items-center gap-2 text-foreground">
                            <Clock className="w-4 h-4 text-orange-500" />
                            Mendekati Batas SLA (Tiket Aktif)
                        </h4>
                        <div className="space-y-2">
                            {urgentTickets.map(tix => {
                                const targetDate = tix.slaResolutionTarget.toDate();
                                const breached = isPast(targetDate);
                                return (
                                    <div key={tix.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg border bg-card border-border">
                                        <div>
                                            <div className="font-medium text-sm">#{tix.ticketNumber} - {tix.title}</div>
                                            <div className="text-xs text-muted-foreground mt-0.5">{tix.requesterName}</div>
                                        </div>
                                        <div className="mt-2 sm:mt-0">
                                            <Badge variant={breached ? "destructive" : "secondary"} className={!breached ? "bg-orange-100 text-orange-700 hover:bg-orange-100" : ""}>
                                                {breached ? 'Melewati SLA' : formatDistanceToNow(targetDate, { addSuffix: true, locale: id })}
                                            </Badge>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}

                {/* Subscriptions Col */}
                {expiringSubs.length > 0 && (
                    <div className="space-y-3">
                        <h4 className="text-sm font-semibold flex items-center gap-2 text-foreground">
                            <AlertCircle className="w-4 h-4 text-red-500" />
                            SaaS Akan Berakhir (H-30)
                        </h4>
                        <div className="space-y-2">
                            {expiringSubs.map(sub => {
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                const expDate = typeof sub.expiryDate === 'string'
                                    ? new Date(sub.expiryDate)
                                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                    : (sub.expiryDate as any).toDate();
                                return (
                                    <div key={sub.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg border bg-card border-border">
                                        <div>
                                            <div className="font-medium text-sm">{sub.name}</div>
                                            <div className="text-xs text-muted-foreground mt-0.5">{sub.provider}</div>
                                        </div>
                                        <div className="mt-2 sm:mt-0 text-xs font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 px-2 py-1 rounded-md">
                                            Sisa: {formatDistanceToNow(expDate, { locale: id })}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
