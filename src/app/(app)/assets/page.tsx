'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useFirestoreCollection } from '@/hooks/use-firestore-collection';
import { BreadcrumbNav } from '@/components/layout/breadcrumb-nav';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/shared/status-badge';
import { ExportButton } from '@/components/assets/export-button';
import { QRScannerModal } from '@/components/assets/qr-scanner-modal';
import { BulkImportModal } from '@/components/assets/bulk-import-modal';
import { BatchQrPrintModal } from '@/components/assets/batch-qr-print-modal';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Search, Plus, Filter, Loader2, Boxes, Laptop, Package, AlertTriangle, ChevronRight, ArrowUpDown } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { orderBy } from 'firebase/firestore';
import { AssetCategory, AssetStatus } from '@/types';
import type { Asset, AssetCategory as AssetCategoryType } from '@/types';

const categoryLabels: Record<AssetCategoryType, string> = {
    'computer': 'PC / Desktop',
    'laptop': 'Laptop',
    'printer': 'Printer / Scanner',
    'monitor': 'Monitor',
    'network': 'Jaringan',
    'peripheral': 'Peripheral',
    'storage': 'Penyimpanan',
    'server': 'Server',
    'cable': 'Kabel & Adaptor',
    'software': 'Software IT',
    'subscription': 'Langganan',
    'cloud': 'Cloud Service',
    'security': 'Keamanan',
    'domain': 'Domain Web',
    'devtools': 'Developer Tools',
    'database': 'Database'
};

export default function AssetListPage() {
    const router = useRouter();
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCategory, setFilterCategory] = useState<string>('all');
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [filterDepartment, setFilterDepartment] = useState<string>('all');
    const [filterLocation, setFilterLocation] = useState<string>('all');
    const [filterCondition, setFilterCondition] = useState<string>('all');
    const [showRetired, setShowRetired] = useState(false);
    const [sortBy, setSortBy] = useState<string>('createdAt');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
    const [isFilterOpen, setIsFilterOpen] = useState(false);

    const { data: assets, loading, error, hasMore, loadMore } = useFirestoreCollection<Asset>({
        collectionPath: 'assets',
        constraints: [orderBy('createdAt', 'desc')],
        pageSize: 10
    });

    const breadcrumbItems = [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Inventaris Aset', isCurrent: true },
    ];

    // Extract unique departments & locations for filter dropdowns
    const { departments, locations } = useMemo(() => {
        const deptSet = new Set<string>();
        const locSet = new Set<string>();
        for (const a of assets) {
            if (a.department) deptSet.add(a.department);
            if (a.location) locSet.add(a.location);
        }
        return { departments: Array.from(deptSet).sort(), locations: Array.from(locSet).sort() };
    }, [assets]);

    // Client-side filtering + sorting
    const filteredAssets = useMemo(() => {
        const filtered = assets.filter((asset) => {
            // G3: Default exclude retired
            if (!showRetired && asset.status === 'retired') return false;

            const q = searchTerm.toLowerCase();
            const matchSearch =
                asset.name?.toLowerCase().includes(q) ||
                asset.assetCode?.toLowerCase().includes(q) ||
                asset.serialNumber?.toLowerCase().includes(q) ||
                asset.brand?.toLowerCase().includes(q);

            const matchCategory = filterCategory === 'all' || asset.category === filterCategory;
            const matchStatus = filterStatus === 'all' || asset.status === filterStatus;
            const matchDept = filterDepartment === 'all' || asset.department === filterDepartment;
            const matchLoc = filterLocation === 'all' || asset.location === filterLocation;
            const matchCond = filterCondition === 'all' || asset.condition === filterCondition;

            return matchSearch && matchCategory && matchStatus && matchDept && matchLoc && matchCond;
        });

        // G2: Sort
        filtered.sort((a, b) => {
            let cmp = 0;
            switch (sortBy) {
                case 'name': cmp = (a.name || '').localeCompare(b.name || ''); break;
                case 'purchaseDate': {
                    const da = a.purchaseDate ? (typeof (a.purchaseDate as any).toDate === 'function' ? (a.purchaseDate as any).toDate().getTime() : new Date(a.purchaseDate as any).getTime()) : 0;
                    const db = b.purchaseDate ? (typeof (b.purchaseDate as any).toDate === 'function' ? (b.purchaseDate as any).toDate().getTime() : new Date(b.purchaseDate as any).getTime()) : 0;
                    cmp = da - db; break;
                }
                case 'purchasePrice': cmp = (a.purchasePrice || 0) - (b.purchasePrice || 0); break;
                case 'status': cmp = (a.status || '').localeCompare(b.status || ''); break;
                default: {
                    const ca = a.createdAt ? (typeof (a.createdAt as any).toDate === 'function' ? (a.createdAt as any).toDate().getTime() : new Date(a.createdAt as any).getTime()) : 0;
                    const cb = b.createdAt ? (typeof (b.createdAt as any).toDate === 'function' ? (b.createdAt as any).toDate().getTime() : new Date(b.createdAt as any).getTime()) : 0;
                    cmp = ca - cb; break;
                }
            }
            return sortDir === 'asc' ? cmp : -cmp;
        });

        return filtered;
    }, [assets, searchTerm, filterCategory, filterStatus, filterDepartment, filterLocation, filterCondition, showRetired, sortBy, sortDir]);

    // Stats
    const stats = useMemo(() => {
        const total = assets.length;
        const deployed = assets.filter(a => a.status === 'deployed').length;
        const inStock = assets.filter(a => a.status === 'in_stock').length;
        const maintenance = assets.filter(a => a.status === 'maintenance').length;
        return { total, deployed, inStock, maintenance };
    }, [assets]);

    const activeFilters = (filterCategory !== 'all' ? 1 : 0) + (filterStatus !== 'all' ? 1 : 0) + (filterDepartment !== 'all' ? 1 : 0) + (filterLocation !== 'all' ? 1 : 0) + (filterCondition !== 'all' ? 1 : 0);

    const statCards = [
        { title: 'Total Aset', value: stats.total, icon: Boxes, color: 'text-blue-600', bg: 'bg-blue-50', desc: 'Inventaris IT terdaftar' },
        { title: 'Sedang Digunakan', value: stats.deployed, icon: Laptop, color: 'text-emerald-600', bg: 'bg-emerald-50', desc: 'Aset aktif (Deployed)' },
        { title: 'Stok Tersedia', value: stats.inStock, icon: Package, color: 'text-amber-600', bg: 'bg-amber-50', desc: 'Siap distribusi (In Stock)' },
        { title: 'Dalam Perbaikan', value: stats.maintenance, icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50', desc: 'Proses maintenance' },
    ];

    return (
        <div className="flex flex-col gap-6">
            <BreadcrumbNav items={breadcrumbItems} />

            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Inventaris Aset IT</h1>
                    <p className="text-muted-foreground mt-1">Kelola dan lacak seluruh perangkat keras dan lunak perusahaan.</p>
                </div>
                <div className="flex gap-2 flex-wrap">
                    <QRScannerModal />
                    <BulkImportModal />
                    <BatchQrPrintModal assets={filteredAssets} />
                    <ExportButton data={filteredAssets} filename="Inventaris_TaxPrime_AM" />
                    <Button onClick={() => router.push('/assets/create')}>
                        <Plus className="w-4 h-4 mr-2" /> Aset Baru
                    </Button>
                </div>
            </div>

            {/* Stat Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {statCards.map((card, i) => {
                    const Icon = card.icon;
                    return (
                        <Card key={i} className="border-none shadow-sm outline outline-1 outline-slate-200">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium text-slate-600">{card.title}</CardTitle>
                                <div className={`${card.bg} p-2 rounded-lg`}><Icon className={`h-4 w-4 ${card.color}`} /></div>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{loading ? '—' : card.value}</div>
                                <p className="text-xs text-slate-500 mt-1">{card.desc}</p>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {/* Main Table Card */}
            <Card className="border-none shadow-sm outline outline-1 outline-slate-200">
                <CardHeader className="pb-3 border-b mb-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                            <CardTitle className="text-xl flex items-center gap-2">
                                <Boxes className="w-5 h-5 text-slate-500" />
                                Daftar Aset
                            </CardTitle>
                            <CardDescription className="mt-1">
                                Inventaris perangkat keras, lunak, dan layanan IT perusahaan.
                            </CardDescription>
                        </div>
                        <div className="flex gap-2 items-center">
                            <div className="relative w-full sm:w-[280px]">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <Input
                                    placeholder="Cari nama, kode, merk, S/N..."
                                    className="pl-9 h-9 bg-white"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            {/* G2: Sort dropdown */}
                            <Select value={`${sortBy}-${sortDir}`} onValueChange={(v) => { const [field, dir] = v.split('-'); setSortBy(field); setSortDir(dir as 'asc' | 'desc'); }}>
                                <SelectTrigger className="h-9 w-[170px] bg-white">
                                    <ArrowUpDown className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                                    <SelectValue placeholder="Urutkan" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="createdAt-desc">Terbaru</SelectItem>
                                    <SelectItem value="createdAt-asc">Terlama</SelectItem>
                                    <SelectItem value="name-asc">Nama A→Z</SelectItem>
                                    <SelectItem value="name-desc">Nama Z→A</SelectItem>
                                    <SelectItem value="purchaseDate-desc">Tanggal Beli ↓</SelectItem>
                                    <SelectItem value="purchaseDate-asc">Tanggal Beli ↑</SelectItem>
                                    <SelectItem value="purchasePrice-desc">Harga Tertinggi</SelectItem>
                                    <SelectItem value="purchasePrice-asc">Harga Terendah</SelectItem>
                                    <SelectItem value="status-asc">Status A→Z</SelectItem>
                                </SelectContent>
                            </Select>
                            <Dialog open={isFilterOpen} onOpenChange={setIsFilterOpen}>
                                <DialogTrigger asChild>
                                    <Button variant="outline" size="sm" className="h-9 relative">
                                        <Filter className="w-4 h-4 mr-2" />
                                        Filter
                                        {activeFilters > 0 && (
                                            <span className="absolute -top-1.5 -right-1.5 bg-blue-600 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
                                                {activeFilters}
                                            </span>
                                        )}
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-[425px]">
                                    <DialogHeader>
                                        <DialogTitle>Filter Aset Lanjutan</DialogTitle>
                                        <DialogDescription>Saring daftar aset berdasarkan spesifikasi tertentu.</DialogDescription>
                                    </DialogHeader>
                                    <div className="grid gap-4 py-4">
                                        <div className="grid gap-2">
                                            <label className="text-sm font-medium">Berdasarkan Kategori</label>
                                            <Select value={filterCategory} onValueChange={setFilterCategory}>
                                                <SelectTrigger><SelectValue placeholder="Semua Kategori" /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="all">Semua Kategori</SelectItem>
                                                    {Object.values(AssetCategory).map((cat) => (
                                                        <SelectItem key={cat} value={cat}>{categoryLabels[cat as AssetCategoryType] || cat}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="grid gap-2 mt-2">
                                            <label className="text-sm font-medium">Berdasarkan Status</label>
                                            <Select value={filterStatus} onValueChange={setFilterStatus}>
                                                <SelectTrigger><SelectValue placeholder="Semua Status" /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="all">Semua Status</SelectItem>
                                                    {Object.values(AssetStatus).map((status) => (
                                                        <SelectItem key={status} value={status} className="capitalize">{status.replace('_', ' ')}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        {/* G1: Filter Departemen */}
                                        <div className="grid gap-2 mt-2">
                                            <label className="text-sm font-medium">Berdasarkan Departemen</label>
                                            <Select value={filterDepartment} onValueChange={setFilterDepartment}>
                                                <SelectTrigger><SelectValue placeholder="Semua Departemen" /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="all">Semua Departemen</SelectItem>
                                                    {departments.map((dept) => (
                                                        <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        {/* G1: Filter Lokasi */}
                                        <div className="grid gap-2 mt-2">
                                            <label className="text-sm font-medium">Berdasarkan Lokasi</label>
                                            <Select value={filterLocation} onValueChange={setFilterLocation}>
                                                <SelectTrigger><SelectValue placeholder="Semua Lokasi" /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="all">Semua Lokasi</SelectItem>
                                                    {locations.map((loc) => (
                                                        <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        {/* G1: Filter Kondisi */}
                                        <div className="grid gap-2 mt-2">
                                            <label className="text-sm font-medium">Berdasarkan Kondisi</label>
                                            <Select value={filterCondition} onValueChange={setFilterCondition}>
                                                <SelectTrigger><SelectValue placeholder="Semua Kondisi" /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="all">Semua Kondisi</SelectItem>
                                                    <SelectItem value="excellent">Sangat Baik</SelectItem>
                                                    <SelectItem value="good">Baik</SelectItem>
                                                    <SelectItem value="fair">Cukup</SelectItem>
                                                    <SelectItem value="poor">Buruk</SelectItem>
                                                    <SelectItem value="damaged">Rusak</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        {/* G3: Show Retired toggle */}
                                        <div className="flex items-center gap-2 mt-3 pt-3 border-t">
                                            <Checkbox id="showRetired" checked={showRetired} onCheckedChange={(v) => setShowRetired(!!v)} />
                                            <label htmlFor="showRetired" className="text-sm text-slate-600 cursor-pointer">Tampilkan aset retired/disposed</label>
                                        </div>
                                    </div>
                                    <DialogFooter>
                                        <Button variant="outline" onClick={() => { setFilterCategory('all'); setFilterStatus('all'); setFilterDepartment('all'); setFilterLocation('all'); setFilterCondition('all'); setShowRetired(false); }}>Reset Filter</Button>
                                        <Button onClick={() => setIsFilterOpen(false)}>Terapkan</Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border bg-white">
                        <Table>
                            <TableHeader className="bg-slate-50">
                                <TableRow>
                                    <TableHead className="font-semibold text-slate-600 w-[140px]">Kode Aset</TableHead>
                                    <TableHead className="font-semibold text-slate-600">Nama Aset</TableHead>
                                    <TableHead className="font-semibold text-slate-600">Kategori</TableHead>
                                    <TableHead className="font-semibold text-slate-600">Status</TableHead>
                                    <TableHead className="font-semibold text-slate-600 hidden md:table-cell">Dept / Lokasi</TableHead>
                                    <TableHead className="text-right font-semibold text-slate-600 w-[80px]">Aksi</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-48 text-center">
                                            <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-500 mb-2" />
                                            <p className="text-slate-500 text-sm">Memuat data inventaris...</p>
                                        </TableCell>
                                    </TableRow>
                                ) : error ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-48 text-center text-red-500">
                                            Gagal memuat data: {error.message}
                                        </TableCell>
                                    </TableRow>
                                ) : filteredAssets.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-32 text-center">
                                            <div className="flex flex-col items-center gap-2 text-slate-400">
                                                <Boxes className="h-10 w-10 opacity-20" />
                                                <p className="text-sm">{searchTerm || activeFilters > 0 ? 'Tidak ada aset yang cocok dengan pencarian/filter.' : 'Belum ada data aset terdaftar.'}</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredAssets.map((asset) => (
                                        <TableRow key={asset.id} className="cursor-pointer hover:bg-slate-50/50" onClick={() => router.push(`/assets/${asset.id}`)}>
                                            <TableCell className="font-mono text-xs text-slate-600">{asset.assetCode}</TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="font-medium text-slate-900">{asset.name}</span>
                                                    {asset.brand && <span className="text-xs text-slate-500">{asset.brand}</span>}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-slate-600 text-sm">{categoryLabels[asset.category as AssetCategoryType] || asset.category}</TableCell>
                                            <TableCell><StatusBadge status={asset.status} /></TableCell>
                                            <TableCell className="hidden md:table-cell">
                                                <div className="flex flex-col">
                                                    <span className="text-sm text-slate-600">{asset.department || '—'}</span>
                                                    <span className="text-xs text-slate-400">{asset.assignedToName || 'Gudang'}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                                    <ChevronRight className="h-4 w-4 text-slate-400" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Pagination */}
                    <div className="flex items-center justify-between text-sm text-slate-500 mt-3">
                        <p>
                            Menampilkan {filteredAssets.length} dari {assets.length} aset
                            {activeFilters > 0 && <span className="text-blue-600 ml-1">({activeFilters} filter aktif)</span>}
                        </p>
                        <div className="flex items-center space-x-2">
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={!hasMore || loading}
                                onClick={() => loadMore()}
                            >
                                Muat Selanjutnya
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
