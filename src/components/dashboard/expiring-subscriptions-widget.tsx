'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { differenceInDays } from 'date-fns';
import { CreditCard, Clock, ExternalLink, Loader2, ShieldAlert } from 'lucide-react';

import { useFirestoreCollection } from '@/hooks/use-firestore-collection';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { Subscription } from '@/types/subscription';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const parseDate = (val: any): Date | null => {
    if (!val) return null;
    if (typeof val === 'string') return new Date(val);
    if (typeof val.toDate === 'function') return val.toDate();
    if (val.seconds) return new Date(val.seconds * 1000);
    return new Date(val);
};

const getUrgencyBadge = (daysLeft: number) => {
    if (daysLeft <= 0) {
        return <span className="text-[10px] font-medium text-white bg-red-600 px-1.5 py-0.5 rounded">Expired</span>;
    }
    if (daysLeft <= 7) {
        return <span className="text-[10px] font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 px-1.5 py-0.5 rounded">{daysLeft}d lagi</span>;
    }
    if (daysLeft <= 14) {
        return <span className="text-[10px] font-medium text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded">{daysLeft}d lagi</span>;
    }
    return <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 px-1.5 py-0.5 rounded">{daysLeft}d lagi</span>;
};

export function ExpiringSubscriptionsWidget() {
    const { data: subsRaw, loading } = useFirestoreCollection({
        collectionPath: 'subscriptions',
        pageSize: 100,
    });

    const subscriptions = subsRaw as unknown as Subscription[];

    const expiringSubs = useMemo(() => {
        const now = new Date();
        return subscriptions
            .map(sub => {
                const expiry = parseDate(sub.expiryDate);
                const daysLeft = expiry ? differenceInDays(expiry, now) : Infinity;
                return { ...sub, expiryParsed: expiry, daysLeft };
            })
            .filter(sub => sub.daysLeft <= 30)
            .sort((a, b) => a.daysLeft - b.daysLeft)
            .slice(0, 5);
    }, [subscriptions]);

    return (
        <Card className="">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-orange-500" />
                    Langganan Segera Habis
                    {!loading && expiringSubs.length > 0 && (
                        <Badge variant="destructive" className="text-xs">{expiringSubs.length}</Badge>
                    )}
                </CardTitle>
                <Button variant="ghost" size="sm" className="text-xs text-blue-600" asChild>
                    <Link href="/subscriptions">
                        Lihat Semua <ExternalLink className="w-3 h-3 ml-1" />
                    </Link>
                </Button>
            </CardHeader>
            <CardContent className="p-0">
                {loading ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                    </div>
                ) : expiringSubs.length === 0 ? (
                    <div className="flex flex-col items-center py-8 text-muted-foreground">
                        <CreditCard className="w-8 h-8 mb-2 opacity-30" />
                        <p className="text-sm">Tidak ada langganan yang segera habis.</p>
                    </div>
                ) : (
                    <div className="divide-y">
                        {expiringSubs.map((sub) => (
                            <Link
                                key={sub.id}
                                href={`/subscriptions/${sub.id}`}
                                className="flex items-center justify-between px-4 py-3 hover:bg-muted transition-colors"
                            >
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-foreground truncate">
                                        {sub.name}
                                    </p>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <span className="text-[10px] text-muted-foreground">{sub.provider}</span>
                                        <Clock className="w-2.5 h-2.5 text-muted-foreground" />
                                        <span className="text-[10px] text-muted-foreground">
                                            {sub.expiryParsed ? sub.expiryParsed.toLocaleDateString('id-ID') : '-'}
                                        </span>
                                    </div>
                                </div>
                                <div className="shrink-0 ml-3">
                                    {getUrgencyBadge(sub.daysLeft)}
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
