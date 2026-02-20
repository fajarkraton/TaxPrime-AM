'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
    FolderOpen, Upload, FileText, Image, FileSpreadsheet, Film,
    ExternalLink, Loader2, HardDrive, AlertCircle,
} from 'lucide-react';
import { getAssetDriveFiles, uploadAssetFileToDrive } from '@/app/actions/drive';
import { toast } from 'sonner';

interface DriveFile {
    id: string;
    name: string;
    mimeType: string;
    webViewLink: string;
    size: string;
    createdTime: string;
}

interface DriveDocumentPanelProps {
    assetCode: string;
    editable?: boolean;
}

const FILE_ICONS: Record<string, typeof FileText> = {
    'application/pdf': FileText,
    'image/': Image,
    'video/': Film,
    'application/vnd.google-apps.spreadsheet': FileSpreadsheet,
    'application/vnd.openxmlformats': FileSpreadsheet,
    'text/csv': FileSpreadsheet,
};

function getFileIcon(mimeType: string) {
    for (const [prefix, Icon] of Object.entries(FILE_ICONS)) {
        if (mimeType.startsWith(prefix)) return Icon;
    }
    return FileText;
}

function formatFileSize(bytes: string): string {
    const b = parseInt(bytes);
    if (isNaN(b) || b === 0) return '-';
    if (b < 1024) return `${b} B`;
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
    return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}

export function DriveDocumentPanel({ assetCode, editable = true }: DriveDocumentPanelProps) {
    const [files, setFiles] = useState<DriveFile[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchFiles = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const result = await getAssetDriveFiles(assetCode);
            if (result.success && result.files) {
                setFiles(result.files);
            } else if (result.error) {
                setError(result.error);
            } else {
                setFiles([]);
            }
        } catch {
            setError('Gagal memuat file.');
        }
        setLoading(false);
    }, [assetCode]);

    useEffect(() => { fetchFiles(); }, [fetchFiles]);

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 25 * 1024 * 1024) {
            toast.error('Ukuran file maksimal 25MB.');
            return;
        }

        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);

            const result = await uploadAssetFileToDrive(formData, assetCode);
            if (result.success) {
                toast.success(`"${file.name}" berhasil diunggah ke Google Drive.`);
                fetchFiles(); // Refresh list
            } else {
                toast.error(result.error || 'Gagal mengunggah file.');
            }
        } catch {
            toast.error('Terjadi kesalahan saat mengunggah.');
        }
        setUploading(false);
        // Reset input
        e.target.value = '';
    };

    if (loading) {
        return (
            <Card>
                <CardContent className="p-6">
                    <div className="space-y-3">
                        <Skeleton className="h-5 w-48" />
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-12 w-full" />
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="bg-blue-50 p-1.5 rounded-lg">
                            <HardDrive className="w-4 h-4 text-blue-600" />
                        </div>
                        <CardTitle className="text-base">Dokumen Google Drive</CardTitle>
                    </div>
                    {editable && (
                        <div className="relative">
                            <Input
                                type="file"
                                className="hidden"
                                id="drive-upload"
                                onChange={handleUpload}
                                disabled={uploading}
                                accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.png,.jpg,.jpeg,.gif,.mp4,.zip"
                            />
                            <Button variant="outline" size="sm" asChild disabled={uploading}>
                                <label htmlFor="drive-upload" className="cursor-pointer">
                                    {uploading ? (
                                        <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                                    ) : (
                                        <Upload className="w-4 h-4 mr-1.5" />
                                    )}
                                    Upload
                                </label>
                            </Button>
                        </div>
                    )}
                </div>
            </CardHeader>
            <CardContent>
                {error && (
                    <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 border border-amber-200 p-3 rounded-lg mb-3">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{error}</span>
                    </div>
                )}

                {files.length === 0 && !error ? (
                    <div className="text-center py-8 text-slate-400">
                        <FolderOpen className="w-10 h-10 mx-auto opacity-30 mb-3" />
                        <p className="text-sm">Belum ada dokumen.</p>
                        <p className="text-xs mt-1">Upload dokumen garansi, invoice, atau manual untuk aset ini.</p>
                    </div>
                ) : (
                    <div className="divide-y">
                        {files.map(file => {
                            const Icon = getFileIcon(file.mimeType);
                            return (
                                <a
                                    key={file.id}
                                    href={file.webViewLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-3 py-3 px-1 hover:bg-slate-50 rounded-md transition-colors group"
                                >
                                    <div className="bg-slate-100 p-2 rounded-lg shrink-0">
                                        <Icon className="w-4 h-4 text-slate-500" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate text-slate-800 group-hover:text-blue-600">{file.name}</p>
                                        <p className="text-xs text-slate-400">
                                            {formatFileSize(file.size)} • {new Date(file.createdTime).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                        </p>
                                    </div>
                                    <ExternalLink className="w-3.5 h-3.5 text-slate-300 group-hover:text-blue-500 shrink-0" />
                                </a>
                            );
                        })}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
