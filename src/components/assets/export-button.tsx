'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import type { Asset } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface ExportButtonProps {
    data: Asset[];
    filename?: string;
    disabled?: boolean;
}

export function ExportButton({ data, filename = 'TaxPrime_AM_Assets_Export', disabled }: ExportButtonProps) {
    const [isExporting, setIsExporting] = useState(false);
    const { toast } = useToast();

    const handleExport = async () => {
        setIsExporting(true);
        try {
            if (!data || data.length === 0) {
                toast({
                    title: 'Export Gagal',
                    description: 'Tidak ada data untuk diekspor.',
                    variant: 'destructive'
                });
                return;
            }

            // 1. Define CSV Headers
            const headers = [
                'ID Aset',
                'Kode Aset',
                'Nama',
                'Kategori',
                'Tipe',
                'Merek',
                'Model',
                'Nomor Seri',
                'Status',
                'Kondisi',
                'Departemen',
                'Lokasi',
                'Pegawai (Pengguna)',
                'Harga Beli',
                'Vendor',
                'Tanggal Dibuat',
            ];

            // 2. Map Data to CSV Rows
            const rows = data.map(asset => {
                // Escape string containing commas with quotes
                const escapeCsv = (str: string | undefined | null) => {
                    if (!str) return '""';
                    // Ganti quote dengan double quote jika ada, lalu wrap dengan quote
                    return `"${String(str).replace(/"/g, '""')}"`;
                };

                return [
                    escapeCsv(asset.id),
                    escapeCsv(asset.assetCode),
                    escapeCsv(asset.name),
                    escapeCsv(asset.category),
                    escapeCsv(asset.type),
                    escapeCsv(asset.brand),
                    escapeCsv(asset.model),
                    escapeCsv(asset.serialNumber),
                    escapeCsv(asset.status),
                    escapeCsv(asset.condition),
                    escapeCsv(asset.department),
                    escapeCsv(asset.location),
                    escapeCsv(asset.assignedToName || 'Unassigned'),
                    asset.purchasePrice || 0,
                    escapeCsv(asset.vendor),
                    // Format timestamp if it exists
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    escapeCsv(asset.createdAt ? format((asset.createdAt as any).toDate(), 'yyyy-MM-dd') : '')
                ].join(',');
            });

            // 3. Combine headers and rows
            const csvContent = [headers.join(','), ...rows].join('\n');

            // 4. Create Blob and Trigger Download
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');

            // Generate dynamic filename with date
            const dateStr = format(new Date(), 'yyyyMMdd_HHmm');
            const fullFilename = `${filename}_${dateStr}.csv`;

            // @ts-expect-error - msSaveBlob is not standard
            if (navigator.msSaveBlob) { // IE 10+
                // @ts-expect-error - msSaveBlob is not standard
                navigator.msSaveBlob(blob, fullFilename);
            } else {
                const url = URL.createObjectURL(blob);
                link.setAttribute('href', url);
                link.setAttribute('download', fullFilename);
                link.style.visibility = 'hidden';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }

            toast({
                title: 'Export Berhasil',
                description: `${data.length} aset berhasil diekspor ke CSV.`,
            });
        } catch (error) {
            console.error('Export error:', error);
            toast({
                title: 'Export Gagal',
                description: 'Terjadi kesalahan sistem saat memproses file CSV.',
                variant: 'destructive'
            });
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <Button
            onClick={handleExport}
            disabled={disabled || isExporting || data.length === 0}
            variant="outline"
            className="flex items-center gap-2"
        >
            {isExporting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
                <Download className="h-4 w-4" />
            )}
            Export CSV
        </Button>
    );
}
