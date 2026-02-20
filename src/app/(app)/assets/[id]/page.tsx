'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useAssetDetail } from '@/hooks/use-asset';
import { BreadcrumbNav } from '@/components/layout/breadcrumb-nav';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { QRCodeGenerator } from '@/components/shared/qr-code-generator';
import { StatusBadge } from '@/components/shared/status-badge';
import { AssetActionsCard } from '@/components/assets/asset-actions-card';
import { EditAssetModal } from '@/components/assets/edit-asset-modal';
import { AuditTrailTimeline, type AuditLog } from '@/components/assets/audit-trail-timeline';
import { PhotoUploader } from '@/components/shared/photo-uploader';
import { useFirestoreCollection } from '@/hooks/use-firestore-collection';
import { useAuthContext } from '@/lib/firebase/auth-provider';
import { orderBy, where } from 'firebase/firestore';
import { MapPin, User, Calendar, Tag, HardDrive, Ticket, Trash2, X, ChevronRight, Clock, AlertTriangle, ExternalLink, FolderOpen } from 'lucide-react';
import { HardwareSpecsDisplay } from '@/components/assets/hardware-specs-display';
import { DriveDocumentPanel } from '@/components/assets/drive-document-panel';
import { DepreciationCard } from '@/components/assets/depreciation-card';
import { useParams, useRouter } from 'next/navigation';
import { updateAssetPhotos, removeAssetPhoto } from '@/app/actions/asset-photos';

export default function AssetDetailPage() {
    const params = useParams();
    const router = useRouter();
    const assetId = params.id as string;
    const { user, role } = useAuthContext();
    const { data: asset, loading, error } = useAssetDetail(assetId);
    const isAdmin = role === 'super_admin' || role === 'admin' || role === 'it_staff';

    const [filterAction, setFilterAction] = useState<string>('all');
    const [photoLightbox, setPhotoLightbox] = useState<string | null>(null);
    const [removingPhoto, setRemovingPhoto] = useState<string | null>(null);

    // Audit Trail
    const queryConstraints = [
        where('entityId', '==', assetId),
        orderBy('timestamp', 'desc')
    ];
    if (filterAction !== 'all') {
        queryConstraints.unshift(where('action', '==', filterAction));
    }
    const { data: auditLogs, loading: loadingLogs } = useFirestoreCollection({
        collectionPath: 'auditTrails',
        constraints: queryConstraints,
        enabled: !!assetId
    });

    // Linked tickets via assetCode
    const ticketConstraints = asset ? [
        where('assetCode', '==', asset.assetCode),
        orderBy('createdAt', 'desc')
    ] : [];
    const { data: linkedTickets, loading: loadingTickets } = useFirestoreCollection({
        collectionPath: 'serviceTickets',
        constraints: ticketConstraints,
        enabled: !!asset?.assetCode
    });

    if (loading) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-8 w-64 mb-6" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Skeleton className="h-[400px] col-span-2" />
                    <Skeleton className="h-[400px]" />
                </div>
            </div>
        );
    }

    if (error || !asset) {
        return (
            <div className="text-center text-red-500 py-12">
                <h2 className="text-2xl font-bold">Aset tidak ditemukan</h2>
                <p>Aset yang Anda cari mungkin telah dihapus atau ID tidak valid.</p>
            </div>
        );
    }

    const breadcrumbItems = [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Aset IT', href: '/assets' },
        { title: asset.assetCode, isCurrent: true },
    ];

    const handlePhotoUploadSuccess = async (urls: string[]) => {
        if (!user || urls.length === 0) return;
        const result = await updateAssetPhotos(assetId, urls, user.uid, user.displayName || 'Unknown');
        if (result.success) {
            router.refresh();
        } else {
            alert(result.error || 'Gagal menyimpan foto.');
        }
    };

    const handleRemovePhoto = async (url: string) => {
        if (!user || !confirm('Hapus foto ini?')) return;
        setRemovingPhoto(url);
        const result = await removeAssetPhoto(assetId, url, user.uid, user.displayName || 'Unknown');
        if (result.success) {
            router.refresh();
        } else {
            alert(result.error || 'Gagal menghapus foto.');
        }
        setRemovingPhoto(null);
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const typedTickets = linkedTickets as unknown as any[];

    const getTicketStatusBadge = (status: string) => {
        switch (status) {
            case 'open': return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">Terbuka</Badge>;
            case 'in_progress': return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-xs"><Clock className="w-3 h-3 mr-1" /> Proses</Badge>;
            case 'resolved': return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">Selesai</Badge>;
            case 'closed': return <Badge variant="secondary" className="text-xs">Ditutup</Badge>;
            default: return <Badge variant="outline" className="text-xs">{status}</Badge>;
        }
    };

    const getTicketPriorityBadge = (priority: string) => {
        switch (priority) {
            case 'critical': return <Badge variant="destructive" className="text-xs"><AlertTriangle className="w-3 h-3 mr-1" />Kritis</Badge>;
            case 'high': return <Badge className="bg-orange-500 hover:bg-orange-600 text-xs">Tinggi</Badge>;
            case 'medium': return <Badge className="bg-yellow-500 hover:bg-yellow-600 text-xs">Sedang</Badge>;
            case 'low': return <Badge variant="secondary" className="text-xs">Rendah</Badge>;
            default: return <Badge variant="outline" className="text-xs">{priority}</Badge>;
        }
    };

    return (
        <div className="space-y-6">
            <BreadcrumbNav items={breadcrumbItems} />

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <h1 className="text-3xl font-bold text-slate-900">{asset.name}</h1>
                        <StatusBadge status={asset.status} />
                    </div>
                    <p className="text-slate-500 font-mono text-sm">{asset.assetCode} — {asset.serialNumber}</p>
                </div>
                <div className="flex gap-3">
                    <EditAssetModal asset={asset} />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Left Column (Main Content) */}
                <div className="lg:col-span-2 space-y-6">
                    <Tabs defaultValue="info" className="w-full">
                        <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent">
                            <TabsTrigger value="info" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none px-6 py-3 font-medium">Informasi Utama</TabsTrigger>
                            {(asset.category === 'laptop' || asset.category === 'computer') && (
                                <TabsTrigger value="specs" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none px-6 py-3 font-medium">Spesifikasi Hardware</TabsTrigger>
                            )}
                            <TabsTrigger value="photos" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none px-6 py-3 font-medium">
                                Foto Aset
                                {asset.photoUrls && asset.photoUrls.length > 0 && (
                                    <Badge variant="secondary" className="ml-2 text-xs">{asset.photoUrls.length}</Badge>
                                )}
                            </TabsTrigger>
                            <TabsTrigger value="tickets" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none px-6 py-3 font-medium">
                                <Ticket className="w-4 h-4 mr-1.5" />
                                Tiket Terkait
                                {typedTickets.length > 0 && (
                                    <Badge variant="secondary" className="ml-2 text-xs">{typedTickets.length}</Badge>
                                )}
                            </TabsTrigger>
                            <TabsTrigger value="history" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none px-6 py-3 font-medium">Riwayat</TabsTrigger>
                            {isAdmin && (
                                <TabsTrigger value="documents" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none px-6 py-3 font-medium">
                                    <FolderOpen className="w-4 h-4 mr-1.5" />
                                    Dokumen
                                </TabsTrigger>
                            )}
                        </TabsList>

                        {/* ── Info Tab ── */}
                        <TabsContent value="info" className="pt-6">
                            <Card>
                                <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-12">
                                    <div>
                                        <p className="text-sm text-slate-500 flex items-center gap-2 mb-1"><Tag className="w-4 h-4" /> Kategori</p>
                                        <p className="font-semibold capitalize">{asset.category}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-slate-500 flex items-center gap-2 mb-1"><Tag className="w-4 h-4" /> Merk / Model</p>
                                        <p className="font-semibold">{asset.brand} - {asset.model}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-slate-500 flex items-center gap-2 mb-1"><User className="w-4 h-4" /> Pemegang Saat Ini</p>
                                        <p className="font-semibold">{asset.assignedToName || 'Tidak Ada (Di Gudang)'}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-slate-500 flex items-center gap-2 mb-1"><MapPin className="w-4 h-4" /> Lokasi</p>
                                        <p className="font-semibold">{asset.location || asset.department}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-slate-500 flex items-center gap-2 mb-1"><Calendar className="w-4 h-4" /> Tanggal Pembelian</p>
                                        <p className="font-semibold">{asset.purchaseDate ? String(asset.purchaseDate) : '-'}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-slate-500 flex items-center gap-2 mb-1"><Tag className="w-4 h-4" /> Vendor</p>
                                        <p className="font-semibold">{asset.vendor || '-'}</p>
                                    </div>
                                    {asset.purchasePrice > 0 && (
                                        <div>
                                            <p className="text-sm text-slate-500 mb-1">Harga Pembelian</p>
                                            <p className="font-semibold">Rp {asset.purchasePrice.toLocaleString('id-ID')}</p>
                                        </div>
                                    )}
                                    <div className="md:col-span-2">
                                        <p className="text-sm text-slate-500 mb-1">Catatan</p>
                                        <p className="text-slate-700 bg-slate-50 p-3 rounded-md min-h-[60px]">{asset.notes || 'Tidak ada catatan.'}</p>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* ── Specs Tab ── */}
                        <TabsContent value="specs" className="pt-6">
                            <Card>
                                <CardContent className="p-6">
                                    <div className="flex items-center gap-3 text-slate-500 mb-4 pb-4 border-b">
                                        <HardDrive className="h-5 w-5" />
                                        <h3 className="font-semibold text-slate-800">Spesifikasi Komponen Utama</h3>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-12">
                                        <div>
                                            <p className="text-sm text-slate-500 mb-1">Merk</p>
                                            <p className="font-semibold">{asset.brand}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-slate-500 mb-1">Model</p>
                                            <p className="font-semibold">{asset.model}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-slate-500 mb-1">Serial Number</p>
                                            <p className="font-semibold font-mono text-sm">{asset.serialNumber || '-'}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-slate-500 mb-1">Kondisi</p>
                                            <p className="font-semibold capitalize">{asset.condition}</p>
                                        </div>
                                    </div>
                                    <p className="text-xs text-slate-400 mt-6 border-t pt-4">
                                        Lihat tab &quot;Spesifikasi Hardware&quot; untuk detail teknis lengkap.
                                    </p>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* ── Specs Tab ── */}
                        {(asset.category === 'laptop' || asset.category === 'computer') && (
                            <TabsContent value="specs" className="pt-6">
                                <HardwareSpecsDisplay assetId={asset.id} />
                            </TabsContent>
                        )}

                        {/* ── Photos Tab ── */}
                        <TabsContent value="photos" className="pt-6 space-y-6">
                            {/* Existing photos */}
                            {asset.photoUrls && asset.photoUrls.length > 0 ? (
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                    {asset.photoUrls.map((url, i) => (
                                        <div key={i} className="relative group w-full h-40 rounded-lg overflow-hidden border">
                                            <Image
                                                src={url}
                                                alt={`Asset Photo ${i + 1}`}
                                                fill
                                                className="object-cover cursor-pointer transition-transform group-hover:scale-105"
                                                sizes="(max-width: 768px) 50vw, 33vw"
                                                onClick={() => setPhotoLightbox(url)}
                                            />
                                            {isAdmin && (
                                                <button
                                                    type="button"
                                                    onClick={(e) => { e.stopPropagation(); handleRemovePhoto(url); }}
                                                    disabled={removingPhoto === url}
                                                    className="absolute top-2 right-2 bg-red-500/80 hover:bg-red-600 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8 text-slate-500 bg-slate-50 rounded-lg border-2 border-dashed">
                                    <p>Belum ada foto yang diunggah untuk aset ini.</p>
                                </div>
                            )}

                            {/* Upload area (Admin / IT Staff only) */}
                            {isAdmin && (
                                <Card>
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-base">Unggah Foto Baru</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <PhotoUploader
                                            assetId={assetId}
                                            onUploadSuccess={handlePhotoUploadSuccess}
                                            maxFiles={10}
                                        />
                                    </CardContent>
                                </Card>
                            )}
                        </TabsContent>

                        {/* ── Linked Tickets Tab ── */}
                        <TabsContent value="tickets" className="pt-6">
                            <Card>
                                <CardContent className="p-0">
                                    {loadingTickets ? (
                                        <div className="p-8 text-center text-slate-500">Memuat tiket...</div>
                                    ) : typedTickets.length === 0 ? (
                                        <div className="p-8 text-center text-slate-400">
                                            <Ticket className="w-10 h-10 mx-auto opacity-20 mb-3" />
                                            <p>Tidak ada tiket yang terkait dengan aset ini.</p>
                                        </div>
                                    ) : (
                                        <div className="divide-y">
                                            {typedTickets.map((ticket) => (
                                                <Link
                                                    key={ticket.id}
                                                    href={`/tickets/${ticket.id}`}
                                                    className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors group"
                                                >
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className="font-mono text-xs text-slate-500">{ticket.ticketNumber}</span>
                                                            {getTicketPriorityBadge(ticket.priority)}
                                                            {getTicketStatusBadge(ticket.status)}
                                                        </div>
                                                        <p className="font-medium text-slate-800 truncate">{ticket.title}</p>
                                                        <p className="text-xs text-slate-500 mt-0.5">
                                                            oleh {ticket.requesterName} • {ticket.category}
                                                        </p>
                                                    </div>
                                                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600 shrink-0 ml-4" />
                                                </Link>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* ── History Tab ── */}
                        <TabsContent value="history" className="pt-6">
                            <Card className="border-none shadow-none bg-transparent">
                                <CardContent className="p-0">
                                    <div className="flex items-center justify-between mb-6">
                                        <div>
                                            <h3 className="font-semibold text-slate-900 border-b-2 border-slate-900 pb-1 inline-block">Linimasa Riwayat</h3>
                                            <p className="text-sm text-slate-500 mt-1">Lacak penciptaan, perubahan, dan penugasan aset.</p>
                                        </div>
                                        <div>
                                            <Select value={filterAction} onValueChange={setFilterAction}>
                                                <SelectTrigger className="w-[180px]">
                                                    <SelectValue placeholder="Semua Aktivitas" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="all">Semua Aktivitas</SelectItem>
                                                    <SelectItem value="created">Didaftarkan</SelectItem>
                                                    <SelectItem value="updated">Diperbarui</SelectItem>
                                                    <SelectItem value="assigned">Dipinjamkan</SelectItem>
                                                    <SelectItem value="returned">Dikembalikan</SelectItem>
                                                    <SelectItem value="retired">Dipensiunkan</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    <AuditTrailTimeline logs={auditLogs as unknown as AuditLog[]} loading={loadingLogs} />
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* ── Documents Tab ── */}
                        {isAdmin && (
                            <TabsContent value="documents" className="pt-6">
                                <DriveDocumentPanel assetCode={asset.assetCode} editable={isAdmin} />
                            </TabsContent>
                        )}

                    </Tabs>
                </div>

                {/* Right Column (Sidebar Widgets) */}
                <div className="space-y-6">
                    {/* S4-ASSIGN Action Control */}
                    <AssetActionsCard asset={asset} />

                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base font-semibold">Identifikasi QR Code</CardTitle>
                        </CardHeader>
                        <CardContent className="flex flex-col items-center justify-center pt-2 pb-6">
                            <div className="bg-white p-4 border rounded-xl shadow-sm mb-4">
                                <QRCodeGenerator value={`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/assets/${asset.id}`} size={160} />
                            </div>
                            <p className="text-xs text-center text-slate-500 font-mono break-all w-full px-4">
                                {asset.id}
                            </p>
                            <Button variant="outline" className="w-full mt-4" size="sm">Print Label QR</Button>
                        </CardContent>
                    </Card>

                    {/* Quick Ticket Link Count */}
                    {typedTickets.length > 0 && (
                        <Card>
                            <CardContent className="p-4">
                                <div className="flex items-center gap-3">
                                    <div className="bg-amber-50 p-2 rounded-lg">
                                        <Ticket className="w-4 h-4 text-amber-600" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold">{typedTickets.length} Tiket Terkait</p>
                                        <p className="text-xs text-slate-500">
                                            {typedTickets.filter((t: { status: string }) => t.status === 'open' || t.status === 'in_progress').length} aktif
                                        </p>
                                    </div>
                                    <Link href={`/tickets?asset=${asset.assetCode}`} className="ml-auto">
                                        <ExternalLink className="w-4 h-4 text-slate-400 hover:text-slate-600" />
                                    </Link>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Depreciation Card */}
                    {asset.purchasePrice > 0 && (
                        <DepreciationCard
                            purchasePrice={asset.purchasePrice}
                            purchaseDate={asset.purchaseDate?.toDate ? asset.purchaseDate.toDate() : null}
                            category={asset.category}
                        />
                    )}
                </div>

            </div>

            {/* Photo Lightbox Overlay */}
            {photoLightbox && (
                <div
                    className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center cursor-pointer"
                    onClick={() => setPhotoLightbox(null)}
                >
                    <button
                        className="absolute top-4 right-4 text-white hover:text-gray-300"
                        onClick={() => setPhotoLightbox(null)}
                    >
                        <X className="w-8 h-8" />
                    </button>
                    <div className="relative max-w-4xl max-h-[85vh] w-full h-full">
                        <Image
                            src={photoLightbox}
                            alt="Asset Photo"
                            fill
                            className="object-contain"
                            sizes="100vw"
                        />
                    </div>
                </div>
            )}
        </div>
    );
}

