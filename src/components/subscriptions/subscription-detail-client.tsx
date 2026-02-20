'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { UserPlus, CheckCircle2, AlertTriangle } from 'lucide-react';

import { useFirestoreCollection } from '@/hooks/use-firestore-collection';
import { useAuthContext } from '@/lib/firebase/auth-provider';
import { allocateLicense, revokeLicense } from '@/app/actions/subscription-allocation';
import type { Subscription, LicenseAllocation } from '@/types/subscription';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';

const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: currency || 'IDR',
        minimumFractionDigits: 0,
    }).format(amount);
};

// Parse dates that may be ISO strings or Firestore Timestamps
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const parseDate = (val: any): Date => {
    if (!val) return new Date();
    if (typeof val === 'string') return new Date(val);
    if (typeof val.toDate === 'function') return val.toDate();
    if (val.seconds) return new Date(val.seconds * 1000);
    return new Date(val);
};

export function SubscriptionDetailClient({
    subscription: initialData,
    subscriptionId
}: {
    subscription: Subscription;
    subscriptionId: string
}) {
    const { user } = useAuthContext();
    const { toast } = useToast();

    // Live sub-collection listeners
    const { data: allocationsData, loading: allocationsLoading } = useFirestoreCollection({
        collectionPath: `subscriptions/${subscriptionId}/allocations`,
    });
    const allocations = allocationsData as unknown as LicenseAllocation[];

    // Users list for the combobox / dropdown equivalent (Using simpler search for time constraints)
    const { data: allUsersData } = useFirestoreCollection({
        collectionPath: 'users',
        pageSize: 50
    });

    const [assignModalOpen, setAssignModalOpen] = useState(false);
    const [userSearch, setUserSearch] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const usersList = allUsersData as any[];
    const filteredUsers = usersList.filter(u =>
        (u.displayName as string || '').toLowerCase().includes(userSearch.toLowerCase()) ||
        (u.email as string || '').toLowerCase().includes(userSearch.toLowerCase())
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleAllocate = async (targetUser: any) => {
        if (!user) return;
        setSubmitting(true);
        const res = await allocateLicense(
            subscriptionId,
            targetUser.uid || targetUser.id,
            targetUser.displayName || targetUser.email,
            targetUser.department || 'Umum',
            user.uid
        );

        if (res.success) {
            toast({ title: 'Lisensi Dialokasikan', description: `Berhasil menugaskan ke ${targetUser.displayName}` });
            setAssignModalOpen(false);
        } else {
            toast({ variant: 'destructive', title: 'Gagal', description: res.error });
        }
        setSubmitting(false);
    };

    const handleRevoke = async (allocationId: string, userName: string) => {
        if (!user || !confirm(`Cabut lisensi dari ${userName}?`)) return;

        const res = await revokeLicense(subscriptionId, allocationId, userName, user.uid);
        if (res.success) {
            toast({ title: 'Lisensi Dicabut', description: 'Berhasil mengembalikan kuota lisensi.' });
        } else {
            toast({ variant: 'destructive', title: 'Gagal', description: res.error });
        }
    };

    const usedLicensesCount = allocations.length;
    const usagePercent = Math.min((usedLicensesCount / initialData.totalLicenses) * 100, 100);

    return (
        <div className="space-y-4">
            {/* Capacity Warning */}
            {usedLicensesCount >= initialData.totalLicenses && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm">
                    <AlertTriangle className="w-5 h-5 shrink-0" />
                    <div>
                        <span className="font-semibold">Kapasitas Lisensi Penuh!</span>
                        <span className="ml-1">Semua {initialData.totalLicenses} lisensi telah terpakai. Hapus alokasi atau tambah kuota untuk assign user baru.</span>
                    </div>
                </div>
            )}
            {usedLicensesCount < initialData.totalLicenses && usagePercent >= 90 && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">
                    <AlertTriangle className="w-5 h-5 shrink-0" />
                    <div>
                        <span className="font-semibold">Kapasitas Hampir Penuh</span>
                        <span className="ml-1">— tersisa {initialData.totalLicenses - usedLicensesCount} dari {initialData.totalLicenses} lisensi ({Math.round(usagePercent)}% terpakai).</span>
                    </div>
                </div>
            )}
            <div className="grid gap-6 md:grid-cols-3">
                {/* Sidebar Kiri: Info Langganan */}
                <div className="md:col-span-1 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex justify-between items-center">
                                Info Utama
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <div className="text-xs text-muted-foreground mb-1">Nama Layanan</div>
                                <div className="font-medium">{initialData.name}</div>
                                <div className="text-xs text-muted-foreground mt-1">{initialData.provider}</div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <div className="text-xs text-muted-foreground mb-1">Total Biaya</div>
                                    <div className="font-medium">{formatCurrency(initialData.costPerPeriod, initialData.currency)}</div>
                                    <div className="text-xs text-muted-foreground capitalize">{initialData.billingCycle}</div>
                                </div>
                                <div>
                                    <div className="text-xs text-muted-foreground mb-1">Jatuh Tempo</div>
                                    <div className="text-sm font-medium">
                                        {format(parseDate(initialData.expiryDate), 'dd MMM yyyy', { locale: id })}
                                    </div>
                                </div>
                            </div>

                            {/* Expiry Countdown */}
                            {(() => {
                                const expiryDate = parseDate(initialData.expiryDate);
                                const now = new Date();
                                const diffMs = expiryDate.getTime() - now.getTime();
                                const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

                                if (diffDays < 0) {
                                    return (
                                        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                                            <div className="text-xs text-red-500 mb-0.5">Status Langganan</div>
                                            <div className="text-sm font-bold text-red-700">Kedaluwarsa</div>
                                            <div className="text-xs text-red-500">Sudah lewat {Math.abs(diffDays)} hari</div>
                                        </div>
                                    );
                                } else if (diffDays <= 7) {
                                    return (
                                        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                                            <div className="text-xs text-red-500 mb-0.5">Segera Habis</div>
                                            <div className="text-sm font-bold text-red-700">{diffDays} hari lagi</div>
                                            <div className="text-xs text-red-500">Perpanjang segera!</div>
                                        </div>
                                    );
                                } else if (diffDays <= 30) {
                                    return (
                                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                                            <div className="text-xs text-amber-600 mb-0.5">Masa Berlaku</div>
                                            <div className="text-sm font-bold text-amber-700">{diffDays} hari lagi</div>
                                            <div className="text-xs text-amber-500">Pertimbangkan perpanjangan</div>
                                        </div>
                                    );
                                }
                                return (
                                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                                        <div className="text-xs text-green-600 mb-0.5">Masa Berlaku</div>
                                        <div className="text-sm font-bold text-green-700">{diffDays} hari lagi</div>
                                        <div className="text-xs text-green-500">Langganan masih aktif</div>
                                    </div>
                                );
                            })()}

                            {initialData.autoRenew && (
                                <div className="flex items-center gap-2 text-xs text-emerald-600 bg-emerald-50 px-3 py-2 rounded-lg">
                                    <CheckCircle2 className="w-3.5 h-3.5" /> Auto-Renew Aktif
                                </div>
                            )}

                            <div>
                                <div className="text-xs text-muted-foreground mb-1">Sisa Kuota: {initialData.totalLicenses - usedLicensesCount} dari {initialData.totalLicenses}</div>
                                <Progress value={usagePercent} className="h-2" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm">Catatan & Vendor</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {initialData.vendorContact || initialData.vendorEmail || initialData.vendorPhone ? (
                                <div className="text-sm space-y-1">
                                    {initialData.vendorContact && <div><strong>Kontak:</strong> {initialData.vendorContact}</div>}
                                    {initialData.vendorEmail && (
                                        <div><a href={`mailto:${initialData.vendorEmail}`} className="text-blue-600 hover:underline">{initialData.vendorEmail}</a></div>
                                    )}
                                    {initialData.vendorPhone && (
                                        <div><a href={`tel:${initialData.vendorPhone}`} className="text-blue-600 hover:underline">{initialData.vendorPhone}</a></div>
                                    )}
                                </div>
                            ) : <div className="text-sm text-muted-foreground">Tidak ada detail kontak.</div>}

                            {initialData.notes && (
                                <div className="text-sm bg-muted p-3 rounded-md">
                                    {initialData.notes}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Konten Kanan: Alokasi Lisensi */}
                <div className="md:col-span-2 space-y-6">
                    <Card className="h-full">
                        <CardHeader className="flex flex-row items-center justify-between pb-2 border-b">
                            <div>
                                <CardTitle>Alokasi Lisensi</CardTitle>
                                <CardDescription>Daftar pengguna yang ditugaskan ke layanan ini.</CardDescription>
                            </div>
                            <Dialog open={assignModalOpen} onOpenChange={setAssignModalOpen}>
                                <DialogTrigger asChild>
                                    <Button size="sm" disabled={usedLicensesCount >= initialData.totalLicenses}>
                                        <UserPlus className="w-4 h-4 mr-2" /> Assign User
                                    </Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Tugaskan Lisensi</DialogTitle>
                                        <DialogDescription>
                                            Pilih pengguna untuk mengisi slot lisensi {initialData.name}. (Sisa: {initialData.totalLicenses - usedLicensesCount})
                                        </DialogDescription>
                                    </DialogHeader>
                                    <div className="space-y-4 py-4">
                                        <Input
                                            placeholder="Cari nama atau email pengguna..."
                                            value={userSearch}
                                            onChange={(e) => setUserSearch(e.target.value)}
                                        />
                                        <div className="max-h-60 overflow-y-auto border rounded-md">
                                            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                            {filteredUsers.map((u: any) => (
                                                <div key={u.id} className="flex flex-row items-center justify-between p-3 border-b hover:bg-muted/50 last:border-0">
                                                    <div>
                                                        <div className="text-sm font-medium">{u.displayName}</div>
                                                        <div className="text-xs text-muted-foreground">{u.email} - {u.department || 'Umum'}</div>
                                                    </div>
                                                    <Button
                                                        size="sm"
                                                        variant="secondary"
                                                        disabled={submitting || allocations.some(a => a.id === u.id)}
                                                        onClick={() => handleAllocate(u)}
                                                    >
                                                        {allocations.some(a => a.id === u.id) ? 'Assigned' : 'Pilih'}
                                                    </Button>
                                                </div>
                                            ))}
                                            {filteredUsers.length === 0 && (
                                                <div className="p-4 text-center text-sm text-muted-foreground">User tidak ditemukan.</div>
                                            )}
                                        </div>
                                    </div>
                                </DialogContent>
                            </Dialog>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="pl-6">Pengguna & Departemen</TableHead>
                                        <TableHead>Tgl Dialokasikan</TableHead>
                                        <TableHead className="text-right pr-6">Aksi</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {allocationsLoading ? (
                                        <TableRow><TableCell colSpan={3} className="text-center py-8"><Loader2 className="animate-spin h-6 w-6 mx-auto text-muted-foreground" /></TableCell></TableRow>
                                    ) : allocations.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={3} className="text-center py-12 text-muted-foreground">
                                                Belum ada pengguna yang dialokasikan ke lisensi ini.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        allocations.map((alloc) => (
                                            <TableRow key={alloc.id}>
                                                <TableCell className="pl-6">
                                                    <div className="font-medium">{alloc.userName}</div>
                                                    <div className="text-xs text-muted-foreground">{alloc.department}</div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="text-sm">
                                                        {alloc.assignedAt ? format(parseDate(alloc.assignedAt), 'dd MMM yyyy', { locale: id }) : 'Baru saja'}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right pr-6">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleRevoke(alloc.id, alloc.userName)}
                                                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                                    >
                                                        Cabut
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
