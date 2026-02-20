'use client';

import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { toast } from 'sonner';

interface ExportCsvButtonProps {
    data: Record<string, unknown>[];
    filename: string;
    headers: { key: string; label: string }[];
    label?: string;
}

export function ExportCsvButton({ data, filename, headers, label = 'Export CSV' }: ExportCsvButtonProps) {
    const handleExport = () => {
        if (data.length === 0) {
            toast.info('Tidak ada data untuk diexport.');
            return;
        }

        const headerRow = headers.map(h => h.label).join(',');
        const rows = data.map(row =>
            headers.map(h => {
                const val = row[h.key];
                const str = val === null || val === undefined ? '' : String(val);
                // Escape commas and quotes
                return str.includes(',') || str.includes('"') || str.includes('\n')
                    ? `"${str.replace(/"/g, '""')}"`
                    : str;
            }).join(',')
        );

        const csv = [headerRow, ...rows].join('\n');
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${filename}_${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();
        URL.revokeObjectURL(url);
        toast.success(`Berhasil mengexport ${data.length} baris ke CSV.`);
    };

    return (
        <Button variant="outline" size="sm" onClick={handleExport} className="gap-2">
            <Download className="h-4 w-4" />
            {label}
        </Button>
    );
}
