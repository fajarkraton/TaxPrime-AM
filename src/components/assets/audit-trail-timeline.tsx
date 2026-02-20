import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { History, ArrowRightLeft, AlertCircle, RotateCcw, Box, CheckCircle2, Download } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface AuditLog extends Record<string, unknown> {
    id: string;
    action: string;
    timestamp?: unknown;
    details?: string;
    actionByName?: string;
}

interface AuditTrailProps {
    logs: AuditLog[];
    loading?: boolean;
    assetName?: string;
}

export function AuditTrailTimeline({ logs, loading, assetName }: AuditTrailProps) {
    if (loading) {
        return (
            <div className="space-y-4 py-4">
                {[1, 2, 3].map((n) => (
                    <div key={n} className="flex gap-4 p-4 border rounded-lg bg-slate-50 animate-pulse">
                        <div className="w-10 h-10 rounded-full bg-slate-200 shrink-0"></div>
                        <div className="flex-1 space-y-2">
                            <div className="h-4 bg-slate-200 rounded w-1/4"></div>
                            <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    if (!logs || logs.length === 0) {
        return (
            <Card className="border-dashed shadow-none">
                <CardContent className="flex flex-col items-center justify-center p-12 text-slate-500">
                    <History className="w-12 h-12 mb-4 text-slate-300" />
                    <p className="font-medium text-slate-700">Belum ada riwayat aktivitas</p>
                    <p className="text-sm">Catatan perubahan otomatis akan muncul di sini.</p>
                </CardContent>
            </Card>
        );
    }

    const getActionIcon = (action: string) => {
        switch (action) {
            case 'created': return <Box className="w-5 h-5 text-blue-500" />;
            case 'assigned': return <ArrowRightLeft className="w-5 h-5 text-emerald-500" />;
            case 'returned': return <RotateCcw className="w-5 h-5 text-amber-500" />;
            case 'retired': return <AlertCircle className="w-5 h-5 text-red-500" />;
            case 'updated': return <CheckCircle2 className="w-5 h-5 text-indigo-500" />;
            default: return <History className="w-5 h-5 text-slate-500" />;
        }
    };

    const formatTimestamp = (fbTimestamp: unknown) => {
        if (!fbTimestamp) return 'Baru Saja';
        // Handle firestore timestamp format via type narrowing
        const timeObj = fbTimestamp as { toDate?: () => Date };
        const date = typeof timeObj.toDate === 'function' ? timeObj.toDate() : new Date(String(fbTimestamp));
        return format(date, "d MMM yyyy, HH:mm", { locale: id });
    };

    return (
        <div className="relative">
            {/* G7: Export button */}
            {logs.length > 0 && (
                <div className="flex justify-end mb-4">
                    <Button variant="outline" size="sm" onClick={() => exportAuditPdf(logs, assetName)}>
                        <Download className="w-4 h-4 mr-2" />
                        Export PDF
                    </Button>
                </div>
            )}
            <div className="relative space-y-8 before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-300 before:to-transparent pt-4">
                {logs.map((log) => (
                    <div key={log.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">

                        {/* Icon marker */}
                        <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                            {getActionIcon(log.action)}
                        </div>

                        {/* Content Card */}
                        <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border bg-white shadow-sm transition-all hover:shadow-md">
                            <div className="flex items-center justify-between mb-2">
                                <Badge variant="outline" className="capitalize">
                                    {log.action}
                                </Badge>
                                <time className="text-xs font-medium text-slate-500">{formatTimestamp(log.timestamp)}</time>
                            </div>
                            <p className="text-slate-700 text-sm font-medium mb-1">
                                {log.details || 'Ada perubahan data pada aset ini'}
                            </p>
                            <div className="text-xs text-slate-500 flex items-center gap-1 mt-3 pt-3 border-t">
                                <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold">
                                    {log.actionByName ? log.actionByName.charAt(0).toUpperCase() : '?'}
                                </div>
                                <span className="font-medium">{log.actionByName || 'Sistem'}</span>
                                mencatat perubahan ini
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function exportAuditPdf(logs: AuditLog[], assetName?: string) {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(`Audit Trail${assetName ? ` — ${assetName}` : ''}`, 14, 20);
    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.text(`Diekspor: ${format(new Date(), 'd MMM yyyy HH:mm', { locale: id })}`, 14, 27);
    doc.setTextColor(0);

    const rows = logs.map(log => {
        let date = '-';
        if (log.timestamp) {
            const ts = log.timestamp as { toDate?: () => Date };
            const d = typeof ts.toDate === 'function' ? ts.toDate() : new Date(String(log.timestamp));
            date = format(d, 'd MMM yyyy HH:mm', { locale: id });
        }
        return [date, log.action, log.details || '-', log.actionByName || 'Sistem'];
    });

    autoTable(doc, {
        startY: 32,
        head: [['Tanggal', 'Aksi', 'Detail', 'User']],
        body: rows,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [59, 130, 246] },
    });

    doc.save(`Audit_Trail${assetName ? `_${assetName.replace(/\s/g, '_')}` : ''}_${format(new Date(), 'yyyyMMdd')}.pdf`);
}
