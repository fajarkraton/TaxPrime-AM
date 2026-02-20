'use client';

import { useAuthContext } from '@/lib/firebase/auth-provider';
import { DocumentList } from '@/components/my-documents/document-list';
import { FileSignature, Info } from 'lucide-react';

export default function MyDocumentsPage() {
    const { user } = useAuthContext();

    if (!user) {
        return (
            <div className="flex items-center justify-center min-h-[50vh] text-slate-400">
                Memuat...
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                        <FileSignature className="h-8 w-8 text-violet-600" />
                        Dokumen Administrasi
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Berita Acara Serah Terima dan Pengembalian Aset yang perlu ditandatangani.
                    </p>
                </div>
            </div>

            {/* Info Banner */}
            <div className="flex items-start gap-3 rounded-lg bg-violet-50 border border-violet-100 px-4 py-3">
                <Info className="h-4 w-4 text-violet-500 mt-0.5 shrink-0" />
                <p className="text-sm text-violet-700">
                    Dokumen administrasi dibuat otomatis setiap kali aset IT ditugaskan atau dikembalikan. Anda perlu menandatangani dokumen untuk konfirmasi serah terima.
                </p>
            </div>

            <DocumentList userId={user.uid} userName={user.displayName || ''} />
        </div>
    );
}
