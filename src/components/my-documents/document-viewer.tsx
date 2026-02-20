'use client';

import { useState, useRef, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { signDocument } from '@/app/actions/document';
import { ArrowLeft, Printer, PenTool, Check, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

interface DocData {
    id: string;
    documentNumber: string;
    type: 'handover' | 'return';
    assetCode: string;
    assetName: string;
    assetBrand: string;
    assetModel: string;
    assetSerialNumber: string;
    assetCondition: string;
    recipientName: string;
    recipientDepartment: string;
    recipientJobTitle: string;
    createdByName: string;
    notes: string;
    status: 'pending' | 'signed';
    signatureData: string | null;
    createdAt: { seconds: number };
    signedAt: { seconds: number } | null;
    [key: string]: unknown;
}

export function DocumentViewer({
    doc,
    userId,
    userName,
    onBack,
}: {
    doc: DocData;
    userId: string;
    userName: string;
    onBack: () => void;
}) {
    const [signing, setSigning] = useState(false);
    const [showCanvas, setShowCanvas] = useState(false);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const isDrawing = useRef(false);

    const typeTitle = doc.type === 'handover' ? 'BERITA ACARA SERAH TERIMA ASET IT' : 'BERITA ACARA PENGEMBALIAN ASET IT';
    const date = doc.createdAt
        ? new Date(doc.createdAt.seconds * 1000).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
        : '-';
    const signedDate = doc.signedAt
        ? new Date(doc.signedAt.seconds * 1000).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
        : null;

    // Canvas drawing logic
    useEffect(() => {
        if (!showCanvas || !canvasRef.current) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        const getPos = (e: MouseEvent | TouchEvent) => {
            const rect = canvas.getBoundingClientRect();
            if ('touches' in e) {
                return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
            }
            return { x: e.clientX - rect.left, y: e.clientY - rect.top };
        };

        const start = (e: MouseEvent | TouchEvent) => {
            isDrawing.current = true;
            const pos = getPos(e);
            ctx.beginPath();
            ctx.moveTo(pos.x, pos.y);
        };
        const draw = (e: MouseEvent | TouchEvent) => {
            if (!isDrawing.current) return;
            e.preventDefault();
            const pos = getPos(e);
            ctx.lineTo(pos.x, pos.y);
            ctx.stroke();
        };
        const stop = () => { isDrawing.current = false; };

        canvas.addEventListener('mousedown', start);
        canvas.addEventListener('mousemove', draw);
        canvas.addEventListener('mouseup', stop);
        canvas.addEventListener('mouseleave', stop);
        canvas.addEventListener('touchstart', start, { passive: false });
        canvas.addEventListener('touchmove', draw, { passive: false });
        canvas.addEventListener('touchend', stop);

        return () => {
            canvas.removeEventListener('mousedown', start);
            canvas.removeEventListener('mousemove', draw);
            canvas.removeEventListener('mouseup', stop);
            canvas.removeEventListener('mouseleave', stop);
            canvas.removeEventListener('touchstart', start);
            canvas.removeEventListener('touchmove', draw);
            canvas.removeEventListener('touchend', stop);
        };
    }, [showCanvas]);

    const clearCanvas = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    };

    const handleSign = async () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const sigData = canvas.toDataURL('image/png');

        setSigning(true);
        try {
            const result = await signDocument(doc.id, sigData, userId, userName);
            if (result.success) {
                toast.success('Dokumen berhasil ditandatangani!');
                onBack();
            } else {
                toast.error(result.error || 'Gagal menandatangani dokumen');
            }
        } catch {
            toast.error('Terjadi kesalahan');
        } finally {
            setSigning(false);
        }
    };

    const handlePrint = () => window.print();

    return (
        <div className="space-y-4">
            {/* Actions bar — hidden on print */}
            <div className="flex items-center justify-between print:hidden">
                <Button variant="ghost" onClick={onBack} className="gap-2">
                    <ArrowLeft className="h-4 w-4" /> Kembali
                </Button>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={handlePrint} className="gap-2">
                        <Printer className="h-4 w-4" /> Cetak PDF
                    </Button>
                    {doc.status === 'pending' && !showCanvas && (
                        <Button onClick={() => setShowCanvas(true)} className="gap-2">
                            <PenTool className="h-4 w-4" /> Tanda Tangan
                        </Button>
                    )}
                </div>
            </div>

            {/* Document Preview */}
            <Card className="border-none shadow-sm outline outline-1 outline-slate-200 max-w-3xl mx-auto print:shadow-none print:outline-none">
                <CardContent className="p-8 sm:p-12 print:p-0">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <h2 className="text-lg font-bold text-slate-800">PT TAXPRIME CONSULTING</h2>
                        <p className="text-xs text-slate-500">Tax Advisory & Consulting Services</p>
                        <div className="border-b-2 border-slate-800 mt-3 mb-4" />
                        <h1 className="text-base font-bold text-slate-800 uppercase tracking-wide mt-4">
                            {typeTitle}
                        </h1>
                        <p className="text-sm text-slate-600 font-mono mt-1">{doc.documentNumber}</p>
                    </div>

                    {/* Body */}
                    <div className="text-sm text-slate-700 leading-relaxed space-y-4">
                        <p>
                            Pada hari ini, <strong>{date}</strong>, telah dilaksanakan {doc.type === 'handover' ? 'serah terima' : 'pengembalian'} aset IT dengan rincian sebagai berikut:
                        </p>

                        {/* Asset Details Table */}
                        <div className="border border-slate-200 rounded-lg overflow-hidden">
                            <table className="w-full text-sm">
                                <tbody>
                                    {[
                                        ['Kode Aset', doc.assetCode],
                                        ['Nama Aset', doc.assetName],
                                        ['Brand / Model', `${doc.assetBrand} ${doc.assetModel}`],
                                        ['Serial Number', doc.assetSerialNumber || '-'],
                                        ['Kondisi', doc.assetCondition || '-'],
                                    ].map(([label, value], i) => (
                                        <tr key={i} className={i % 2 === 0 ? 'bg-slate-50' : ''}>
                                            <td className="px-4 py-2.5 font-medium text-slate-600 w-40">{label}</td>
                                            <td className="px-4 py-2.5 text-slate-800">{value}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {doc.notes && (
                            <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                                <p className="text-xs font-medium text-slate-500 mb-1">Catatan:</p>
                                <p className="text-sm text-slate-700">{doc.notes}</p>
                            </div>
                        )}

                        <p className="mt-6">
                            Demikian berita acara ini dibuat dengan sebenarnya untuk digunakan sebagaimana mestinya.
                        </p>

                        {/* Signature Section */}
                        <div className="grid grid-cols-2 gap-8 mt-10 pt-6 border-t border-slate-100">
                            {/* Pihak 1 — Admin */}
                            <div className="text-center">
                                <p className="text-xs text-slate-500 mb-1">
                                    {doc.type === 'handover' ? 'Pihak 1 (Pemberi)' : 'Pihak 1 (Penerima Kembali)'}
                                </p>
                                <p className="font-medium text-slate-800">{doc.createdByName}</p>
                                <div className="h-20 border-b border-dashed border-slate-300 mt-12 mb-1" />
                                <p className="text-xs text-slate-500">IT Administrator</p>
                            </div>

                            {/* Pihak 2 — Employee */}
                            <div className="text-center">
                                <p className="text-xs text-slate-500 mb-1">
                                    {doc.type === 'handover' ? 'Pihak 2 (Penerima)' : 'Pihak 2 (Pengembalian)'}
                                </p>
                                <p className="font-medium text-slate-800">{doc.recipientName}</p>

                                {doc.status === 'signed' && doc.signatureData ? (
                                    <div className="mt-2">
                                        <img src={doc.signatureData} alt="Tanda tangan" className="h-20 mx-auto" />
                                        <p className="text-xs text-emerald-600 mt-1">
                                            Ditandatangani: {signedDate}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="h-20 border-b border-dashed border-slate-300 mt-12 mb-1" />
                                )}

                                <p className="text-xs text-slate-500">
                                    {doc.recipientJobTitle || doc.recipientDepartment || 'Karyawan'}
                                </p>
                            </div>
                        </div>

                        {/* Status Badge */}
                        <div className="flex justify-center mt-6 print:hidden">
                            <Badge
                                variant="outline"
                                className={doc.status === 'signed'
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 text-sm px-4 py-1'
                                    : 'bg-amber-50 text-amber-700 border-amber-200 text-sm px-4 py-1'
                                }
                            >
                                {doc.status === 'signed' ? '✓ Dokumen Telah Ditandatangani' : '⏳ Menunggu Tanda Tangan'}
                            </Badge>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Signature Canvas — shown when user clicks "Tanda Tangan" */}
            {showCanvas && doc.status === 'pending' && (
                <Card className="max-w-3xl mx-auto border-none shadow-sm outline outline-1 outline-violet-200 print:hidden">
                    <CardContent className="p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                                <PenTool className="h-4 w-4 text-violet-600" />
                                Tanda Tangan Digital
                            </h3>
                            <Button variant="ghost" size="sm" onClick={clearCanvas} className="gap-1 text-xs">
                                <RotateCcw className="h-3 w-3" /> Hapus
                            </Button>
                        </div>
                        <div className="border-2 border-dashed border-slate-200 rounded-lg bg-white">
                            <canvas
                                ref={canvasRef}
                                className="w-full h-40 cursor-crosshair touch-none"
                            />
                        </div>
                        <p className="text-xs text-slate-500">
                            Gunakan mouse atau sentuh layar untuk menggambar tanda tangan Anda.
                        </p>
                        <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setShowCanvas(false)}>Batal</Button>
                            <Button onClick={handleSign} disabled={signing} className="gap-2">
                                <Check className="h-4 w-4" />
                                {signing ? 'Menyimpan...' : 'Konfirmasi Tanda Tangan'}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
