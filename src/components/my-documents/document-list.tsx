'use client';

import { useState, useMemo } from 'react';
import { useFirestoreCollection } from '@/hooks/use-firestore-collection';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
    FileText, FileCheck, Clock, Eye, Search, ArrowUpDown,
    FileSignature, ClipboardCheck, AlertCircle, ArrowDownUp,
} from 'lucide-react';
import { DocumentViewer } from './document-viewer';

interface DocItem {
    id: string;
    documentNumber: string;
    type: 'handover' | 'return';
    assetCode: string;
    assetName: string;
    assetBrand?: string;
    assetModel?: string;
    status: 'pending' | 'signed';
    createdByName: string;
    createdAt: { seconds: number };
    signedAt: { seconds: number } | null;
    [key: string]: unknown;
}

const tabs = [
    { key: 'all', label: 'Semua', icon: FileText },
    { key: 'pending', label: 'Menunggu TTD', icon: Clock },
    { key: 'signed', label: 'Ditandatangani', icon: FileCheck },
] as const;

export function DocumentList({ userId, userName }: { userId: string; userName: string }) {
    const [activeTab, setActiveTab] = useState<'pending' | 'signed' | 'all'>('all');
    const [viewingDoc, setViewingDoc] = useState<DocItem | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortNewest, setSortNewest] = useState(true);
    const { data: allDocs, loading, refresh } = useFirestoreCollection({ collectionPath: 'documents', pageSize: 1000 });

    const myDocs = (allDocs as unknown as DocItem[]).filter(d => d.recipientUid === userId);

    // Stats
    const totalCount = myDocs.length;
    const pendingCount = myDocs.filter(d => d.status === 'pending').length;
    const signedCount = myDocs.filter(d => d.status === 'signed').length;

    // Filter + search + sort
    const filtered = useMemo(() => {
        let docs = activeTab === 'all' ? myDocs : myDocs.filter(d => d.status === activeTab);
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            docs = docs.filter(d =>
                d.documentNumber?.toLowerCase().includes(q) ||
                d.assetName?.toLowerCase().includes(q) ||
                d.assetCode?.toLowerCase().includes(q) ||
                d.createdByName?.toLowerCase().includes(q)
            );
        }
        docs.sort((a, b) => {
            const aTime = a.createdAt?.seconds || 0;
            const bTime = b.createdAt?.seconds || 0;
            return sortNewest ? bTime - aTime : aTime - bTime;
        });
        return docs;
    }, [myDocs, activeTab, searchQuery, sortNewest]);

    if (viewingDoc) {
        return (
            <DocumentViewer
                doc={viewingDoc as any}
                userId={userId}
                userName={userName}
                onBack={() => { setViewingDoc(null); refresh(); }}
            />
        );
    }

    if (loading) {
        return (
            <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-3">
                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full rounded-lg" />)}
                </div>
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full rounded-lg" />)}
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Summary Stats */}
            <div className="grid gap-4 sm:grid-cols-3">
                <Card className="border-none shadow-sm outline outline-1 outline-slate-200">
                    <CardContent className="pt-5 pb-4 flex items-center gap-4">
                        <div className="bg-violet-50 p-2.5 rounded-lg">
                            <FileSignature className="h-5 w-5 text-violet-600" />
                        </div>
                        <div>
                            <p className="text-xs text-slate-500 uppercase tracking-wider font-medium">Total Dokumen</p>
                            <p className="text-2xl font-bold text-slate-800">{totalCount}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className={`border-none shadow-sm outline outline-1 ${pendingCount > 0 ? 'outline-amber-200 bg-amber-50/30' : 'outline-slate-200'}`}>
                    <CardContent className="pt-5 pb-4 flex items-center gap-4">
                        <div className={`p-2.5 rounded-lg ${pendingCount > 0 ? 'bg-amber-100' : 'bg-slate-100'}`}>
                            <AlertCircle className={`h-5 w-5 ${pendingCount > 0 ? 'text-amber-600' : 'text-slate-400'}`} />
                        </div>
                        <div>
                            <p className="text-xs text-slate-500 uppercase tracking-wider font-medium">Menunggu TTD</p>
                            <p className={`text-2xl font-bold ${pendingCount > 0 ? 'text-amber-700' : 'text-slate-800'}`}>{pendingCount}</p>
                        </div>
                        {pendingCount > 0 && (
                            <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-xs ml-auto">
                                Perlu Tindakan
                            </Badge>
                        )}
                    </CardContent>
                </Card>
                <Card className="border-none shadow-sm outline outline-1 outline-slate-200">
                    <CardContent className="pt-5 pb-4 flex items-center gap-4">
                        <div className="bg-emerald-50 p-2.5 rounded-lg">
                            <ClipboardCheck className="h-5 w-5 text-emerald-600" />
                        </div>
                        <div>
                            <p className="text-xs text-slate-500 uppercase tracking-wider font-medium">Selesai</p>
                            <p className="text-2xl font-bold text-emerald-700">{signedCount}</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Toolbar: Tabs + Search + Sort */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
                    {tabs.map(tab => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.key;
                        const count = tab.key === 'pending' ? pendingCount : tab.key === 'signed' ? signedCount : totalCount;
                        return (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key)}
                                className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-md transition-all ${isActive
                                    ? 'bg-white text-slate-800 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700'
                                    }`}
                            >
                                <Icon className="h-3.5 w-3.5" />
                                {tab.label}
                                <span className={`text-xs ml-0.5 ${isActive ? 'text-slate-500' : 'text-slate-400'}`}>
                                    ({count})
                                </span>
                            </button>
                        );
                    })}
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                    <div className="relative flex-1 sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="Cari no. dokumen, aset..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="pl-9 h-9 text-sm"
                        />
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5 h-9 shrink-0"
                        onClick={() => setSortNewest(!sortNewest)}
                    >
                        <ArrowDownUp className="h-3.5 w-3.5" />
                        {sortNewest ? 'Terbaru' : 'Terlama'}
                    </Button>
                </div>
            </div>

            {/* Document List */}
            {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="relative mb-6">
                        <div className="bg-slate-100 p-5 rounded-full">
                            <FileText className="h-10 w-10 text-slate-300" />
                        </div>
                        <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-1 shadow-sm">
                            {searchQuery ? (
                                <Search className="h-4 w-4 text-slate-400" />
                            ) : (
                                <Clock className="h-4 w-4 text-slate-400" />
                            )}
                        </div>
                    </div>
                    <h3 className="text-lg font-semibold text-slate-700">
                        {searchQuery ? 'Tidak Ditemukan' : 'Tidak Ada Dokumen'}
                    </h3>
                    <p className="text-slate-500 mt-1.5 max-w-md text-sm">
                        {searchQuery
                            ? `Tidak ada dokumen yang cocok dengan "${searchQuery}". Coba kata kunci lain.`
                            : activeTab === 'pending'
                                ? 'Tidak ada dokumen yang menunggu tanda tangan Anda saat ini. 🎉'
                                : 'Dokumen akan muncul secara otomatis saat ada aset IT yang ditugaskan atau dikembalikan kepada Anda.'}
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filtered.map((doc, idx) => {
                        const date = doc.createdAt
                            ? new Date(doc.createdAt.seconds * 1000).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
                            : '-';
                        const time = doc.createdAt
                            ? new Date(doc.createdAt.seconds * 1000).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
                            : '';
                        const typeLabel = doc.type === 'handover' ? 'Serah Terima' : 'Pengembalian';
                        const signedDate = doc.signedAt
                            ? new Date(doc.signedAt.seconds * 1000).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
                            : null;

                        return (
                            <Card
                                key={doc.id}
                                className="border-none shadow-sm outline outline-1 outline-slate-200 hover:outline-violet-300 hover:shadow-md transition-all group"
                            >
                                <CardContent className="py-5 px-6">
                                    <div className="flex items-start justify-between gap-4">
                                        {/* Left: Icon + Info */}
                                        <div className="flex items-start gap-4 flex-1 min-w-0">
                                            {/* Timeline dot */}
                                            <div className="flex flex-col items-center gap-1 pt-0.5">
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${doc.status === 'pending'
                                                    ? 'bg-amber-50 ring-2 ring-amber-200'
                                                    : 'bg-emerald-50 ring-2 ring-emerald-200'
                                                    }`}>
                                                    {doc.status === 'pending'
                                                        ? <Clock className="h-4 w-4 text-amber-600" />
                                                        : <FileCheck className="h-4 w-4 text-emerald-600" />
                                                    }
                                                </div>
                                                {idx < filtered.length - 1 && (
                                                    <div className="w-px h-6 bg-slate-200 hidden sm:block" />
                                                )}
                                            </div>

                                            {/* Document Info */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="font-semibold text-slate-800 text-sm font-mono">
                                                        {doc.documentNumber}
                                                    </span>
                                                    <Badge variant="outline" className={doc.type === 'handover'
                                                        ? 'bg-blue-50 text-blue-700 border-blue-200 text-xs'
                                                        : 'bg-orange-50 text-orange-700 border-orange-200 text-xs'
                                                    }>
                                                        {typeLabel}
                                                    </Badge>
                                                    <Badge variant="outline" className={doc.status === 'pending'
                                                        ? 'bg-amber-50 text-amber-700 border-amber-200 text-xs'
                                                        : 'bg-emerald-50 text-emerald-700 border-emerald-200 text-xs'
                                                    }>
                                                        {doc.status === 'pending' ? '⏳ Menunggu TTD' : '✓ Ditandatangani'}
                                                    </Badge>
                                                </div>

                                                <p className="text-sm text-slate-700 mt-1.5 font-medium truncate">
                                                    {doc.assetName}
                                                    <span className="text-slate-400 font-normal ml-1.5">({doc.assetCode})</span>
                                                </p>
                                                {doc.assetBrand && (
                                                    <p className="text-xs text-slate-400 mt-0.5">{doc.assetBrand} {doc.assetModel}</p>
                                                )}

                                                <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
                                                    <span>Dibuat oleh <span className="text-slate-600">{doc.createdByName}</span></span>
                                                    <span>•</span>
                                                    <span>{date} {time}</span>
                                                    {signedDate && (
                                                        <>
                                                            <span>•</span>
                                                            <span className="text-emerald-600">Ditandatangani {signedDate}</span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Right: Action */}
                                        <Button
                                            variant={doc.status === 'pending' ? 'default' : 'outline'}
                                            size="sm"
                                            className="gap-2 shrink-0 mt-1"
                                            onClick={() => setViewingDoc(doc)}
                                        >
                                            <Eye className="h-4 w-4" />
                                            {doc.status === 'pending' ? 'Tanda Tangan' : 'Lihat'}
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* Footer info */}
            {filtered.length > 0 && (
                <p className="text-xs text-slate-400 text-center">
                    Menampilkan {filtered.length} dari {totalCount} dokumen
                </p>
            )}
        </div>
    );
}
