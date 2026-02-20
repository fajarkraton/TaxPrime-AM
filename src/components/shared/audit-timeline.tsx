'use client';

import { Skeleton } from '@/components/ui/skeleton';
import type { AuditLog } from '@/types';

const ACTION_COLORS: Record<string, string> = {
    created: 'bg-green-500',
    updated: 'bg-blue-500',
    assigned: 'bg-purple-500',
    returned: 'bg-orange-500',
    maintenance: 'bg-yellow-500',
    retired: 'bg-red-500',
    lost: 'bg-gray-800',
    found: 'bg-green-600',
};

interface AuditTimelineProps {
    history: AuditLog[];
    loading?: boolean;
}

export function AuditTimeline({ history, loading = false }: AuditTimelineProps) {
    if (loading) {
        return (
            <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex gap-3">
                        <Skeleton className="h-3 w-3 rounded-full mt-1.5" />
                        <div className="space-y-1 flex-1">
                            <Skeleton className="h-4 w-3/4" />
                            <Skeleton className="h-3 w-1/2" />
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    if (history.length === 0) {
        return <p className="text-sm text-muted-foreground">Belum ada riwayat.</p>;
    }

    return (
        <div className="space-y-4">
            {history.map((log) => {
                const dotColor = ACTION_COLORS[log.action] || 'bg-gray-400';
                const timeData = log.performedAt as { seconds?: number } | undefined;
                const date = log.performedAt?.toDate?.() || new Date(timeData?.seconds ? timeData.seconds * 1000 : Date.now());

                return (
                    <div key={log.id} className="flex gap-3">
                        <div className={`h-3 w-3 rounded-full mt-1.5 flex-shrink-0 ${dotColor}`} />
                        <div>
                            <p className="text-sm">{log.description}</p>
                            <p className="text-xs text-muted-foreground">
                                {log.performedByName} — {date.toLocaleDateString('id-ID', {
                                    day: 'numeric', month: 'short', year: 'numeric',
                                    hour: '2-digit', minute: '2-digit',
                                })}
                            </p>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
