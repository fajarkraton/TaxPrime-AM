'use client';

import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { useFirestoreCollection } from '@/hooks/use-firestore-collection';
import { useAuthContext } from '@/lib/firebase/auth-provider';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { History, ArrowRightLeft, AlertCircle, RotateCcw, Box, CheckCircle2 } from 'lucide-react';
import type { AuditLog } from '@/components/assets/audit-trail-timeline';
import { orderBy, limit } from 'firebase/firestore';

export function RecentActivityFeed() {
    const { role, user } = useAuthContext();
    const { data: logs, loading, error } = useFirestoreCollection({
        collectionPath: 'auditTrails',
        constraints: [
            orderBy('timestamp', 'desc'),
            limit(15)
        ]
    });

    if (error) {
        return <div className="text-red-500 rounded-lg bg-red-50 dark:bg-red-950/30 p-4">Gagal memuat aktivitas terbaru.</div>;
    }

    if (loading || !logs) {
        return (
            <Card className="col-span-3 ">
                <CardHeader>
                    <Skeleton className="h-6 w-1/2" />
                </CardHeader>
                <CardContent className="space-y-4">
                    {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} className="flex gap-4 items-start">
                            <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                            <div className="flex-1 space-y-2">
                                <Skeleton className="h-4 w-3/4" />
                                <Skeleton className="h-3 w-1/4" />
                            </div>
                        </div>
                    ))}
                </CardContent>
            </Card>
        );
    }

    let typedLogs = logs as unknown as AuditLog[];

    // RBAC: employee only sees own activities
    if (role === 'employee' && user?.uid) {
        typedLogs = typedLogs.filter(l => l.actionBy === user.uid);
    }
    typedLogs = typedLogs.slice(0, 5);

    const getActionIcon = (action: string) => {
        switch (action) {
            case 'created': return <Box className="w-4 h-4 text-blue-500" />;
            case 'assigned': return <ArrowRightLeft className="w-4 h-4 text-emerald-500" />;
            case 'returned': return <RotateCcw className="w-4 h-4 text-amber-500" />;
            case 'retired': return <AlertCircle className="w-4 h-4 text-red-500" />;
            case 'updated': return <CheckCircle2 className="w-4 h-4 text-indigo-500" />;
            default: return <History className="w-4 h-4 text-muted-foreground" />;
        }
    };

    const formatTimestamp = (fbTimestamp: unknown) => {
        if (!fbTimestamp) return 'Baru Saja';
        const timeObj = fbTimestamp as { toDate?: () => Date };
        const date = typeof timeObj.toDate === 'function' ? timeObj.toDate() : new Date(String(fbTimestamp));
        return format(date, "d MMM, HH:mm", { locale: id });
    };

    return (
        <Card className="">
            <CardHeader className="pb-3 border-b mb-4">
                <CardTitle className="text-base flex items-center justify-between">
                    <span>Aktivitas Terbaru</span>
                    <Badge variant="secondary" className="font-normal">{typedLogs.length} Entri</Badge>
                </CardTitle>
                <CardDescription>
                    Log transaksi sistem yang baru masuk
                </CardDescription>
            </CardHeader>
            <CardContent>
                {typedLogs.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground flex flex-col items-center">
                        <History className="h-8 w-8 mb-2 opacity-20" />
                        <p className="text-sm">Belum ada aktivitas terekam.</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {typedLogs.map((log) => (
                            <div key={log.id} className="flex gap-4">
                                <div className="mt-0.5 flex items-center justify-center w-8 h-8 rounded-full bg-muted border shrink-0">
                                    {getActionIcon(log.action)}
                                </div>
                                <div className="flex-1 space-y-1">
                                    <p className="text-sm font-medium text-foreground leading-snug">
                                        {log.details || 'Ada perubahan data.'}
                                    </p>
                                    <div className="flex items-center text-xs text-muted-foreground gap-2">
                                        <span>{log.actionByName || 'Sistem'}</span>
                                        <span className="w-1 h-1 rounded-full bg-muted-foreground"></span>
                                        <time>{formatTimestamp(log.timestamp)}</time>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
