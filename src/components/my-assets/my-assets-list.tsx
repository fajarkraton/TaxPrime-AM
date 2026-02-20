'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useFirestoreCollection } from '@/hooks/use-firestore-collection';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Laptop, MonitorSmartphone, ExternalLink, Package, Search,
    Wrench, CheckCircle2, ArrowDownUp, Layers, QrCode,
    HardDrive, Printer, Wifi, Server, Monitor,
} from 'lucide-react';
import type { Asset } from '@/types';

const statusConfig: Record<string, { label: string; color: string }> = {
    deployed: { label: 'Digunakan', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    maintenance: { label: 'Perbaikan', color: 'bg-amber-50 text-amber-700 border-amber-200' },
    in_stock: { label: 'Tersedia', color: 'bg-blue-50 text-blue-700 border-blue-200' },
};

const conditionConfig: Record<string, { label: string; color: string }> = {
    excellent: { label: 'Sangat Baik', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    good: { label: 'Baik', color: 'bg-green-50 text-green-700 border-green-200' },
    fair: { label: 'Cukup', color: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
    poor: { label: 'Buruk', color: 'bg-red-50 text-red-700 border-red-200' },
};

const categoryIcons: Record<string, typeof Laptop> = {
    laptop: Laptop,
    desktop: Monitor,
    monitor: MonitorSmartphone,
    printer: Printer,
    network: Wifi,
    server: Server,
    storage: HardDrive,
};

const categoryLabels: Record<string, string> = {
    laptop: 'Laptop',
    desktop: 'Desktop',
    monitor: 'Monitor',
    printer: 'Printer',
    network: 'Perangkat Jaringan',
    server: 'Server',
    storage: 'Storage',
};

export function MyAssetsList({ userId }: { userId: string }) {
    const [searchQuery, setSearchQuery] = useState('');
    const [sortNewest, setSortNewest] = useState(true);
    const [activeCategory, setActiveCategory] = useState<string>('all');

    const { data: allAssets, loading } = useFirestoreCollection({ collectionPath: 'assets', pageSize: 1000 });

    const myAssets = (allAssets as unknown as Asset[]).filter(a => a.assignedTo === userId);

    // Stats
    const totalCount = myAssets.length;
    const deployed = myAssets.filter(a => a.status === 'deployed').length;
    const maintenance = myAssets.filter(a => a.status === 'maintenance').length;

    // Categories for tabs
    const categories = useMemo(() => {
        const cats: Record<string, number> = {};
        for (const a of myAssets) {
            const cat = a.category?.toLowerCase() || 'other';
            cats[cat] = (cats[cat] || 0) + 1;
        }
        return cats;
    }, [myAssets]);

    // Filter + search + sort
    const filtered = useMemo(() => {
        let assets = activeCategory === 'all'
            ? myAssets
            : myAssets.filter(a => (a.category?.toLowerCase() || 'other') === activeCategory);

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            assets = assets.filter(a =>
                a.name?.toLowerCase().includes(q) ||
                a.assetCode?.toLowerCase().includes(q) ||
                a.brand?.toLowerCase().includes(q) ||
                a.model?.toLowerCase().includes(q) ||
                a.serialNumber?.toLowerCase().includes(q)
            );
        }

        assets.sort((a, b) => {
            const aTime = a.assignedAt?.seconds || a.createdAt?.seconds || 0;
            const bTime = b.assignedAt?.seconds || b.createdAt?.seconds || 0;
            return sortNewest ? bTime - aTime : aTime - bTime;
        });

        return assets;
    }, [myAssets, activeCategory, searchQuery, sortNewest]);

    if (loading) {
        return (
            <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-3">
                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full rounded-lg" />)}
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-48 w-full rounded-lg" />)}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Summary Stats */}
            <div className="grid gap-4 sm:grid-cols-3">
                <Card className="border-none shadow-sm outline outline-1 outline-slate-200">
                    <CardContent className="pt-5 pb-4 flex items-center gap-4">
                        <div className="bg-blue-50 p-2.5 rounded-lg">
                            <Package className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-xs text-slate-500 uppercase tracking-wider font-medium">Total Aset</p>
                            <p className="text-2xl font-bold text-slate-800">{totalCount}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-none shadow-sm outline outline-1 outline-slate-200">
                    <CardContent className="pt-5 pb-4 flex items-center gap-4">
                        <div className="bg-emerald-50 p-2.5 rounded-lg">
                            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                        </div>
                        <div>
                            <p className="text-xs text-slate-500 uppercase tracking-wider font-medium">Sedang Digunakan</p>
                            <p className="text-2xl font-bold text-emerald-700">{deployed}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className={`border-none shadow-sm outline outline-1 ${maintenance > 0 ? 'outline-amber-200 bg-amber-50/30' : 'outline-slate-200'}`}>
                    <CardContent className="pt-5 pb-4 flex items-center gap-4">
                        <div className={`p-2.5 rounded-lg ${maintenance > 0 ? 'bg-amber-100' : 'bg-slate-100'}`}>
                            <Wrench className={`h-5 w-5 ${maintenance > 0 ? 'text-amber-600' : 'text-slate-400'}`} />
                        </div>
                        <div>
                            <p className="text-xs text-slate-500 uppercase tracking-wider font-medium">Dalam Perbaikan</p>
                            <p className={`text-2xl font-bold ${maintenance > 0 ? 'text-amber-700' : 'text-slate-800'}`}>{maintenance}</p>
                        </div>
                        {maintenance > 0 && (
                            <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-xs ml-auto">
                                Sedang Proses
                            </Badge>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Toolbar: Category Tabs + Search + Sort */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex gap-1 bg-slate-100 p-1 rounded-lg flex-wrap">
                    <button
                        onClick={() => setActiveCategory('all')}
                        className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-md transition-all ${activeCategory === 'all'
                            ? 'bg-white text-slate-800 shadow-sm'
                            : 'text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        <Layers className="h-3.5 w-3.5" />
                        Semua
                        <span className="text-xs text-slate-400 ml-0.5">({totalCount})</span>
                    </button>
                    {Object.entries(categories).map(([cat, count]) => {
                        const Icon = categoryIcons[cat] || Package;
                        const isActive = activeCategory === cat;
                        return (
                            <button
                                key={cat}
                                onClick={() => setActiveCategory(cat)}
                                className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-md transition-all ${isActive
                                    ? 'bg-white text-slate-800 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700'
                                    }`}
                            >
                                <Icon className="h-3.5 w-3.5" />
                                {categoryLabels[cat] || cat}
                                <span className="text-xs text-slate-400 ml-0.5">({count})</span>
                            </button>
                        );
                    })}
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                    <div className="relative flex-1 sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="Cari nama, kode, brand..."
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

            {/* Asset Cards */}
            {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="relative mb-6">
                        <div className="bg-slate-100 p-5 rounded-full">
                            <Package className="h-10 w-10 text-slate-300" />
                        </div>
                        <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-1 shadow-sm">
                            {searchQuery ? (
                                <Search className="h-4 w-4 text-slate-400" />
                            ) : (
                                <Laptop className="h-4 w-4 text-slate-400" />
                            )}
                        </div>
                    </div>
                    <h3 className="text-lg font-semibold text-slate-700">
                        {searchQuery ? 'Tidak Ditemukan' : 'Belum Ada Aset'}
                    </h3>
                    <p className="text-slate-500 mt-1.5 max-w-md text-sm">
                        {searchQuery
                            ? `Tidak ada aset yang cocok dengan "${searchQuery}". Coba kata kunci lain.`
                            : 'Belum ada aset IT yang ditugaskan kepada Anda. Hubungi IT Staff jika Anda memerlukan perangkat.'}
                    </p>
                </div>
            ) : (
                <>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {filtered.map((asset) => {
                            const catKey = asset.category?.toLowerCase() || 'other';
                            const Icon = categoryIcons[catKey] || MonitorSmartphone;
                            const status = statusConfig[asset.status] || { label: asset.status, color: '' };
                            const condition = conditionConfig[asset.condition] || null;
                            const assignedDate = asset.assignedAt
                                ? new Date(asset.assignedAt.seconds * 1000).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
                                : '-';

                            return (
                                <Link key={asset.id} href={`/assets/${asset.id}`}>
                                    <Card className="border-none shadow-sm outline outline-1 outline-slate-200 hover:shadow-md hover:outline-blue-300 transition-all cursor-pointer group h-full">
                                        <CardContent className="pt-6 pb-5 flex flex-col h-full">
                                            {/* Top: Icon + Name */}
                                            <div className="flex items-start gap-4">
                                                <div className="bg-blue-50 p-3 rounded-xl shrink-0 group-hover:bg-blue-100 transition-colors">
                                                    <Icon className="h-6 w-6 text-blue-600" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="font-semibold text-slate-800 truncate group-hover:text-blue-700 transition-colors">
                                                        {asset.name}
                                                    </h3>
                                                    <p className="text-xs text-slate-500 font-mono mt-0.5">{asset.assetCode}</p>
                                                </div>
                                                <ExternalLink className="h-4 w-4 text-slate-300 group-hover:text-blue-500 transition-colors shrink-0 mt-1" />
                                            </div>

                                            {/* Details */}
                                            <div className="mt-4 space-y-2 flex-1">
                                                <div className="flex items-center justify-between text-sm">
                                                    <span className="text-slate-500">Brand / Model</span>
                                                    <span className="text-slate-700 font-medium truncate ml-2 text-right">{asset.brand} {asset.model}</span>
                                                </div>
                                                {asset.serialNumber && (
                                                    <div className="flex items-center justify-between text-sm">
                                                        <span className="text-slate-500">Serial No.</span>
                                                        <span className="text-slate-600 font-mono text-xs truncate ml-2">{asset.serialNumber}</span>
                                                    </div>
                                                )}
                                                <div className="flex items-center justify-between text-sm">
                                                    <span className="text-slate-500">Kategori</span>
                                                    <span className="text-slate-700">{categoryLabels[catKey] || asset.category}</span>
                                                </div>
                                            </div>

                                            {/* Badges */}
                                            <div className="flex items-center gap-2 mt-4 flex-wrap">
                                                <Badge variant="outline" className={status.color}>
                                                    {status.label}
                                                </Badge>
                                                {condition && (
                                                    <Badge variant="outline" className={condition.color}>
                                                        {condition.label}
                                                    </Badge>
                                                )}
                                            </div>

                                            {/* Footer */}
                                            <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
                                                <p className="text-xs text-slate-400">
                                                    Ditugaskan: {assignedDate}
                                                </p>
                                                <QrCode className="h-3.5 w-3.5 text-slate-300" />
                                            </div>
                                        </CardContent>
                                    </Card>
                                </Link>
                            );
                        })}
                    </div>

                    {/* Footer count */}
                    <p className="text-xs text-slate-400 text-center">
                        Menampilkan {filtered.length} dari {totalCount} aset
                    </p>
                </>
            )}
        </div>
    );
}
