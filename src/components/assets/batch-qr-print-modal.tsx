'use client';

import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Printer, Loader2, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import { toast } from 'sonner';
import type { Asset } from '@/types';

interface BatchQrPrintModalProps {
    assets: Asset[];
}

// Layout presets
const LAYOUTS = {
    standard: { cols: 3, rows: 8, labelW: 60, labelH: 30, qrSize: 18, gapX: 5, gapY: 3, marginX: 12, marginY: 12, name: '3×8 Standard', desc: '24 label/halaman — ukuran sedang' },
    compact: { cols: 4, rows: 10, labelW: 44, labelH: 25, qrSize: 14, gapX: 4, gapY: 2, marginX: 10, marginY: 10, name: '4×10 Kompak', desc: '40 label/halaman — ukuran kecil' },
    large: { cols: 2, rows: 5, labelW: 90, labelH: 50, qrSize: 32, gapX: 6, gapY: 6, marginX: 10, marginY: 10, name: '2×5 Besar', desc: '10 label/halaman — ukuran besar' },
} as const;

type LayoutKey = keyof typeof LAYOUTS;

export function BatchQrPrintModal({ assets }: BatchQrPrintModalProps) {
    const [open, setOpen] = useState(false);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [generating, setGenerating] = useState(false);
    const [layout, setLayout] = useState<LayoutKey>('standard');
    const [search, setSearch] = useState('');
    const selectAllRef = useRef<HTMLButtonElement>(null);

    const tangibleAssets = assets.filter(a => a.type === 'tangible' && a.status !== 'retired');
    const filteredAssets = search
        ? tangibleAssets.filter(a =>
            a.name.toLowerCase().includes(search.toLowerCase()) ||
            a.assetCode.toLowerCase().includes(search.toLowerCase())
        )
        : tangibleAssets;

    const toggleSelect = (id: string) => {
        setSelected(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };

    const toggleAll = () => {
        const ids = filteredAssets.map(a => a.id);
        const allSelected = ids.every(id => selected.has(id));
        setSelected(prev => {
            const next = new Set(prev);
            if (allSelected) {
                ids.forEach(id => next.delete(id));
            } else {
                ids.forEach(id => next.add(id));
            }
            return next;
        });
    };

    const generatePdf = async () => {
        if (selected.size === 0) return;
        setGenerating(true);

        try {
            const doc = new jsPDF('p', 'mm', 'a4');
            const selectedAssets = tangibleAssets.filter(a => selected.has(a.id));
            const L = LAYOUTS[layout];
            const LABELS_PER_PAGE = L.cols * L.rows;

            for (let i = 0; i < selectedAssets.length; i++) {
                if (i > 0 && i % LABELS_PER_PAGE === 0) doc.addPage();

                const pageIdx = i % LABELS_PER_PAGE;
                const col = pageIdx % L.cols;
                const row = Math.floor(pageIdx / L.cols);

                const x = L.marginX + col * (L.labelW + L.gapX);
                const y = L.marginY + row * (L.labelH + L.gapY);

                const asset = selectedAssets[i];

                // Generate QR code
                const qrDataUrl = await QRCode.toDataURL(
                    `https://asset.taxprime.net/asset/${asset.assetCode}`,
                    { width: 300, margin: 1 }
                );

                // Cut-line guide (dashed border)
                doc.setDrawColor(180);
                doc.setLineWidth(0.15);
                doc.setLineDashPattern([1, 1], 0);
                doc.roundedRect(x, y, L.labelW, L.labelH, 1.5, 1.5);
                doc.setLineDashPattern([], 0);

                // QR code
                const qrPadding = layout === 'large' ? 3 : 2;
                doc.addImage(qrDataUrl, 'PNG', x + qrPadding, y + qrPadding, L.qrSize, L.qrSize);

                const textX = x + L.qrSize + qrPadding + 3;
                const maxTextW = L.labelW - L.qrSize - qrPadding - 6;

                if (layout === 'large') {
                    // Large layout — more text space
                    // TaxPrime AM header
                    doc.setFontSize(5);
                    doc.setFont('helvetica', 'normal');
                    doc.setTextColor(150);
                    doc.text('TaxPrime AM', textX, y + 5);
                    doc.setTextColor(0);

                    // Asset code
                    doc.setFontSize(9);
                    doc.setFont('helvetica', 'bold');
                    doc.text(asset.assetCode, textX, y + 11);

                    // Name
                    doc.setFontSize(8);
                    doc.setFont('helvetica', 'normal');
                    const name = asset.name.length > 28 ? asset.name.substring(0, 28) + '...' : asset.name;
                    doc.text(name, textX, y + 17);

                    // Brand + Model
                    doc.setFontSize(7);
                    doc.setTextColor(100);
                    const brandModel = [asset.brand, asset.model].filter(Boolean).join(' ').substring(0, 30);
                    if (brandModel) doc.text(brandModel, textX, y + 23);

                    // Department
                    if (asset.department) {
                        doc.setFontSize(6);
                        doc.text(`Dept: ${asset.department}`, textX, y + 28);
                    }
                    doc.setTextColor(0);

                    // Serial number (bottom left)
                    if (asset.serialNumber) {
                        doc.setFontSize(5.5);
                        doc.setTextColor(130);
                        doc.text(`S/N: ${asset.serialNumber.substring(0, 25)}`, x + qrPadding, y + L.qrSize + qrPadding + 6);
                        doc.setTextColor(0);
                    }
                } else if (layout === 'compact') {
                    // Compact layout — minimal text
                    doc.setFontSize(6.5);
                    doc.setFont('helvetica', 'bold');
                    doc.text(asset.assetCode, textX, y + 6, { maxWidth: maxTextW });

                    doc.setFontSize(5.5);
                    doc.setFont('helvetica', 'normal');
                    const name = asset.name.length > 16 ? asset.name.substring(0, 16) + '...' : asset.name;
                    doc.text(name, textX, y + 11, { maxWidth: maxTextW });

                    if (asset.serialNumber) {
                        doc.setFontSize(4.5);
                        doc.setTextColor(140);
                        doc.text(`S/N: ${asset.serialNumber.substring(0, 14)}`, x + qrPadding, y + L.qrSize + qrPadding + 4);
                        doc.setTextColor(0);
                    }
                } else {
                    // Standard layout
                    doc.setFontSize(8);
                    doc.setFont('helvetica', 'bold');
                    doc.text(asset.assetCode, textX, y + 8, { maxWidth: maxTextW });

                    doc.setFontSize(7);
                    doc.setFont('helvetica', 'normal');
                    const name = asset.name.length > 20 ? asset.name.substring(0, 20) + '...' : asset.name;
                    doc.text(name, textX, y + 14, { maxWidth: maxTextW });

                    if (asset.brand) {
                        doc.setFontSize(6);
                        doc.setTextColor(120);
                        doc.text(asset.brand, textX, y + 19, { maxWidth: maxTextW });
                        doc.setTextColor(0);
                    }

                    if (asset.serialNumber) {
                        doc.setFontSize(5);
                        doc.setTextColor(140);
                        doc.text(`S/N: ${asset.serialNumber.substring(0, 18)}`, x + qrPadding, y + L.qrSize + qrPadding + 5);
                        doc.setTextColor(0);
                    }
                }
            }

            // Footer with page numbers
            const pageCount = doc.getNumberOfPages();
            for (let p = 1; p <= pageCount; p++) {
                doc.setPage(p);
                doc.setFontSize(6);
                doc.setTextColor(160);
                doc.text(`TaxPrime AM — QR Labels — Hal. ${p}/${pageCount}`, 105, 290, { align: 'center' });
                doc.setTextColor(0);
            }

            doc.save(`QR_Labels_TaxPrime_AM_${new Date().toISOString().split('T')[0]}.pdf`);
            toast.success(`PDF berhasil diunduh (${selectedAssets.length} label, ${pageCount} halaman)`);
        } catch (err) {
            console.error('Failed to generate QR PDF:', err);
            toast.error('Gagal membuat PDF. Silakan coba lagi.');
        }

        setGenerating(false);
    };

    const L = LAYOUTS[layout];
    const labelsPerPage = L.cols * L.rows;
    const totalPages = selected.size > 0 ? Math.ceil(selected.size / labelsPerPage) : 0;

    return (
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setSelected(new Set()); setSearch(''); } }}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                    <Printer className="w-4 h-4 mr-2" />
                    Print QR
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[85vh]">
                <DialogHeader>
                    <DialogTitle>Batch Print QR Labels</DialogTitle>
                    <DialogDescription>Pilih aset dan layout label, lalu export ke PDF untuk dicetak.</DialogDescription>
                </DialogHeader>

                {/* Layout selector */}
                <div className="grid grid-cols-3 gap-2">
                    {(Object.entries(LAYOUTS) as [LayoutKey, typeof LAYOUTS[LayoutKey]][]).map(([key, val]) => (
                        <button
                            key={key}
                            onClick={() => setLayout(key)}
                            className={`text-left p-2.5 rounded-lg border-2 transition-all ${layout === key
                                ? 'border-blue-500 bg-blue-50'
                                : 'border-slate-200 hover:border-slate-300'
                                }`}
                        >
                            <div className={`text-xs font-semibold ${layout === key ? 'text-blue-700' : 'text-slate-700'}`}>{val.name}</div>
                            <div className="text-[10px] text-slate-500">{val.desc}</div>
                        </button>
                    ))}
                </div>

                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                        className="pl-9 h-9 text-sm"
                        placeholder="Cari nama atau kode aset..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>

                {/* Select all / count */}
                <div className="flex items-center justify-between py-1 border-b">
                    <button
                        ref={selectAllRef}
                        type="button"
                        onClick={toggleAll}
                        className="text-sm text-blue-600 hover:underline"
                    >
                        {filteredAssets.every(a => selected.has(a.id)) && filteredAssets.length > 0 ? 'Batal Semua' : 'Pilih Semua'}
                    </button>
                    <span className="text-sm text-slate-500">
                        {selected.size} dipilih • {totalPages} halaman ({labelsPerPage}/hal)
                    </span>
                </div>

                {/* Asset list */}
                <div className="overflow-y-auto max-h-[300px] space-y-0.5">
                    {filteredAssets.length === 0 ? (
                        <p className="text-sm text-slate-400 text-center py-8">
                            {search ? 'Tidak ditemukan.' : 'Tidak ada aset tangible yang tersedia.'}
                        </p>
                    ) : (
                        filteredAssets.map(asset => (
                            <label
                                key={asset.id}
                                className="flex items-center gap-3 p-2 rounded hover:bg-slate-50 cursor-pointer"
                            >
                                <Checkbox
                                    checked={selected.has(asset.id)}
                                    onCheckedChange={() => toggleSelect(asset.id)}
                                />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{asset.name}</p>
                                    <p className="text-xs text-slate-500 font-mono">{asset.assetCode}</p>
                                </div>
                                {asset.department && (
                                    <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded shrink-0">{asset.department}</span>
                                )}
                            </label>
                        ))
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
                    <Button onClick={generatePdf} disabled={selected.size === 0 || generating}>
                        {generating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Printer className="w-4 h-4 mr-2" />}
                        Cetak {selected.size} Label
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
