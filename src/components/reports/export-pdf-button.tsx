'use client';

import { Button } from '@/components/ui/button';
import { FileText } from 'lucide-react';
import { toast } from 'sonner';
import { exportReportPdf } from '@/lib/export-pdf';

interface ExportPdfButtonProps {
    title: string;
    subtitle?: string;
    headers: string[];
    rows: (string | number)[][];
    summaryItems?: { label: string; value: string }[];
    filename: string;
    label?: string;
}

export function ExportPdfButton({
    title: rawTitle, // renamed to avoid shadowing
    subtitle,
    headers,
    rows,
    summaryItems,
    filename,
    label = 'Export PDF',
}: ExportPdfButtonProps) {
    const handleExport = () => {
        if (rows.length === 0) {
            toast.info('Tidak ada data untuk diexport.');
            return;
        }

        exportReportPdf({
            title: rawTitle,
            subtitle,
            tables: [{ headers, rows }],
            summaryItems,
            filename,
        });

        toast.success(`PDF berhasil diunduh. (${rows.length} baris)`);
    };

    return (
        <Button variant="outline" size="sm" onClick={handleExport} className="gap-2">
            <FileText className="h-4 w-4" />
            {label}
        </Button>
    );
}
