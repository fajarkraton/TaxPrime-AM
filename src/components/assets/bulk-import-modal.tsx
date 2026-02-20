'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { UploadCloud, FileSpreadsheet, Loader2, Download, AlertCircle, CheckCircle2, XCircle } from 'lucide-react';
import Papa from 'papaparse';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuthContext } from '@/lib/firebase/auth-provider';
import { bulkImportAssets } from '@/app/actions/asset';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface RowError {
    row: number;
    field: string;
    message: string;
}

interface ImportResult {
    successCount: number;
    failedCount: number;
    errors: string[];
    rowErrors: RowError[];
}

export function BulkImportModal() {
    const [isOpen, setIsOpen] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewData, setPreviewData] = useState<Record<string, string>[]>([]);
    const [validationErrors, setValidationErrors] = useState<string[]>([]);
    const [importResult, setImportResult] = useState<ImportResult | null>(null);

    const router = useRouter();
    const { user } = useAuthContext();

    const handleOpenChange = (open: boolean) => {
        setIsOpen(open);
        if (!open) {
            setSelectedFile(null);
            setPreviewData([]);
            setValidationErrors([]);
            setIsProcessing(false);
            setImportResult(null);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        setValidationErrors([]);
        setImportResult(null);

        if (!file) {
            setSelectedFile(null);
            setPreviewData([]);
            return;
        }

        if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
            setValidationErrors(['Tipe file tidak didukung. Harap unggah file .csv']);
            setSelectedFile(null);
            return;
        }

        setSelectedFile(file);

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                const data = results.data as Record<string, string>[];

                if (data.length > 0) {
                    const headers = Object.keys(data[0]);
                    const requiredHeaders = ['Nama', 'Kategori', 'Tipe', 'Status'];
                    const missing = requiredHeaders.filter(h => !headers.includes(h));

                    if (missing.length > 0) {
                        setValidationErrors([`File CSV kekurangan kolom wajib: ${missing.join(', ')}`]);
                        setSelectedFile(null);
                        setPreviewData([]);
                        return;
                    }
                }

                setPreviewData(data);
            },
            error: (error) => {
                setValidationErrors([`Gagal membaca CSV: ${error.message}`]);
            }
        });
    };

    const handleDownloadTemplate = () => {
        const headers = ['Nama', 'Kategori', 'Tipe', 'Merek', 'Model', 'Nomor Seri', 'Status', 'Kondisi', 'Departemen', 'Lokasi', 'Harga Beli', 'Vendor'].join(',');
        const ex1 = ['Laptop HR-01', 'computer', 'laptop', 'Lenovo', 'ThinkPad T14', 'SN-12345', 'in_stock', 'new', 'HR', 'Gedung A Lt.2', '15000000', 'Bhinneka'].join(',');
        const ex2 = ['Monitor Resepsionis', 'computer', 'monitor', 'LG', '27UL500', 'SN-67890', 'deployed', 'good', 'Front Office', 'Lobby', '4500000', 'Tokopedia'].join(',');

        const blob = new Blob([`${headers}\n${ex1}\n${ex2}`], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'Template_Import_Asset_TaxPrime_AM.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleUpload = async () => {
        if (!selectedFile || previewData.length === 0) return;

        setIsProcessing(true);
        setValidationErrors([]);
        setImportResult(null);

        try {
            if (!user?.uid) {
                setValidationErrors(['Anda harus login untuk melakukan import.']);
                setIsProcessing(false);
                return;
            }

            if (previewData.length > 500) {
                setValidationErrors(['Maksimal 500 baris data per import.']);
                setIsProcessing(false);
                return;
            }

            const response = await bulkImportAssets(
                previewData,
                user.uid,
                user.displayName || user.email || 'Admin'
            );

            if (response.success && response.data) {
                const result = response.data as ImportResult;
                setImportResult(result);

                if (result.failedCount === 0) {
                    toast.success(`Import berhasil! ${result.successCount} aset ditambahkan.`);
                } else {
                    toast.warning(`Import selesai: ${result.successCount} berhasil, ${result.failedCount} gagal.`);
                }

                if (result.failedCount === 0) {
                    setTimeout(() => {
                        setIsOpen(false);
                        router.refresh();
                    }, 1500);
                }
            } else {
                setValidationErrors([response.error || 'Terjadi kesalahan saat import.']);
            }
        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : 'Terjadi kesalahan sistem.';
            setValidationErrors([msg]);
        } finally {
            setIsProcessing(false);
        }
    };

    const previewHeaders = previewData.length > 0 ? Object.keys(previewData[0]) : [];

    return (
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                <Button variant="outline" className="border shadow-sm">
                    <UploadCloud className="w-4 h-4 mr-2" />
                    Mass Upload
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Import Data Aset (CSV)</DialogTitle>
                    <DialogDescription>
                        Unggah banyak data aset sekaligus. Sistem akan memvalidasi duplikat serial number dan format data per baris.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-5 py-4">
                    {/* Step 1: Template */}
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 flex items-center justify-between">
                        <div>
                            <h4 className="text-sm font-semibold text-slate-900">1. Unduh Template CSV</h4>
                            <p className="text-xs text-slate-500 mt-1">Format kolom: Nama, Kategori, Tipe, Merek, Model, Nomor Seri, Status, Kondisi, Departemen, Lokasi, Harga Beli, Vendor</p>
                        </div>
                        <Button variant="secondary" size="sm" onClick={handleDownloadTemplate}>
                            <Download className="w-4 h-4 mr-2" /> Template
                        </Button>
                    </div>

                    {/* Step 2: File Upload */}
                    {!importResult && (
                        <div className="grid gap-3">
                            <Label htmlFor="csv-upload" className="font-semibold">2. Unggah File CSV</Label>
                            <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-xl p-6 bg-slate-50 hover:bg-slate-100 transition duration-200">
                                <Input
                                    id="csv-upload"
                                    type="file"
                                    accept=".csv"
                                    className="hidden"
                                    onChange={handleFileChange}
                                    disabled={isProcessing}
                                />
                                <Label htmlFor="csv-upload" className="cursor-pointer flex flex-col items-center w-full">
                                    {selectedFile ? (
                                        <>
                                            <FileSpreadsheet className="w-10 h-10 text-green-600 mb-2" />
                                            <p className="text-sm font-medium text-slate-900">{selectedFile.name}</p>
                                            <p className="text-xs text-slate-500 mt-1">{previewData.length} baris data terdeteksi</p>
                                        </>
                                    ) : (
                                        <>
                                            <UploadCloud className="w-10 h-10 text-slate-400 mb-2" />
                                            <p className="text-sm font-medium text-blue-600">Klik untuk memilih file .csv</p>
                                            <p className="text-xs text-slate-500 mt-1">Maksimal 500 baris</p>
                                        </>
                                    )}
                                </Label>
                            </div>
                        </div>
                    )}

                    {/* Data Preview (first 5 rows) */}
                    {previewData.length > 0 && !importResult && (
                        <div>
                            <h4 className="text-sm font-semibold text-slate-900 mb-2">
                                3. Preview Data ({previewData.length} baris)
                            </h4>
                            <div className="rounded-md border max-h-[200px] overflow-auto">
                                <Table>
                                    <TableHeader className="bg-slate-50 sticky top-0">
                                        <TableRow>
                                            <TableHead className="text-xs font-semibold w-12">#</TableHead>
                                            {previewHeaders.slice(0, 6).map(h => (
                                                <TableHead key={h} className="text-xs font-semibold">{h}</TableHead>
                                            ))}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {previewData.slice(0, 5).map((row, i) => (
                                            <TableRow key={i}>
                                                <TableCell className="text-xs text-slate-400">{i + 2}</TableCell>
                                                {previewHeaders.slice(0, 6).map(h => (
                                                    <TableCell key={h} className="text-xs">{row[h] || '-'}</TableCell>
                                                ))}
                                            </TableRow>
                                        ))}
                                        {previewData.length > 5 && (
                                            <TableRow>
                                                <TableCell colSpan={7} className="text-center text-xs text-slate-400 py-2">
                                                    ... dan {previewData.length - 5} baris lainnya
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    )}

                    {/* Import Result Summary */}
                    {importResult && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 text-center">
                                    <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-1" />
                                    <div className="text-2xl font-bold text-emerald-700">{importResult.successCount}</div>
                                    <div className="text-xs text-emerald-600">Berhasil</div>
                                </div>
                                <div className={`border rounded-lg p-4 text-center ${importResult.failedCount > 0 ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-200'}`}>
                                    <XCircle className={`w-6 h-6 mx-auto mb-1 ${importResult.failedCount > 0 ? 'text-red-500' : 'text-slate-300'}`} />
                                    <div className={`text-2xl font-bold ${importResult.failedCount > 0 ? 'text-red-700' : 'text-slate-400'}`}>{importResult.failedCount}</div>
                                    <div className={`text-xs ${importResult.failedCount > 0 ? 'text-red-600' : 'text-slate-400'}`}>Gagal</div>
                                </div>
                            </div>

                            {/* Per-row error table */}
                            {importResult.rowErrors.length > 0 && (
                                <div>
                                    <h4 className="text-sm font-semibold text-red-700 mb-2 flex items-center gap-1.5">
                                        <AlertCircle className="w-4 h-4" />
                                        Detail Error ({importResult.rowErrors.length} baris)
                                    </h4>
                                    <div className="rounded-md border border-red-200 max-h-[200px] overflow-auto">
                                        <Table>
                                            <TableHeader className="bg-red-50 sticky top-0">
                                                <TableRow>
                                                    <TableHead className="text-xs font-semibold text-red-700 w-16">Baris</TableHead>
                                                    <TableHead className="text-xs font-semibold text-red-700 w-24">Field</TableHead>
                                                    <TableHead className="text-xs font-semibold text-red-700">Error</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {importResult.rowErrors.map((err, i) => (
                                                    <TableRow key={i}>
                                                        <TableCell className="text-xs font-mono text-red-600">{err.row}</TableCell>
                                                        <TableCell className="text-xs font-medium">{err.field}</TableCell>
                                                        <TableCell className="text-xs text-red-600">{err.message}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* General Errors */}
                    {validationErrors.length > 0 && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                                <ul className="list-disc pl-4 mt-1 space-y-1 text-sm">
                                    {validationErrors.map((err, i) => (
                                        <li key={i}>{err}</li>
                                    ))}
                                </ul>
                            </AlertDescription>
                        </Alert>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="ghost" onClick={() => setIsOpen(false)} disabled={isProcessing}>
                        {importResult ? 'Tutup' : 'Batal'}
                    </Button>
                    {!importResult && (
                        <Button onClick={handleUpload} disabled={!selectedFile || isProcessing || validationErrors.length > 0 || previewData.length === 0}>
                            {isProcessing ? (
                                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Memproses...</>
                            ) : `Import ${previewData.length} Aset`}
                        </Button>
                    )}
                    {importResult && importResult.failedCount > 0 && (
                        <Button onClick={() => { setImportResult(null); router.refresh(); }}>
                            Selesai
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
