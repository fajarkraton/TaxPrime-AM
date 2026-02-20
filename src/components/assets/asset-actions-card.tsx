'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthContext } from '@/lib/firebase/auth-provider';
import { useFirestoreCollection } from '@/hooks/use-firestore-collection';
import { assignAsset, returnAsset, retireAsset } from '@/app/actions/asset';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import type { Asset } from '@/types';

// Assuming basic user type from firestore
interface UserBasic {
    id: string;
    displayName: string;
    department: string;
    email: string;
}

export function AssetActionsCard({ asset }: { asset: Asset }) {
    const router = useRouter();
    const { user } = useAuthContext();
    const [isAssignOpen, setIsAssignOpen] = useState(false);
    const [isReturnOpen, setIsReturnOpen] = useState(false);
    const [isRetireOpen, setIsRetireOpen] = useState(false);

    const [loading, setLoading] = useState(false);
    const [notes, setNotes] = useState('');

    // Assign State
    const [openUserSelect, setOpenUserSelect] = useState(false);
    const [selectedUserId, setSelectedUserId] = useState('');

    // Return State
    const [returnCondition, setReturnCondition] = useState<string>('good');

    // Retire State
    const [retireReason, setRetireReason] = useState('');

    // Fetch users for assignment combo-box
    const { data: users } = useFirestoreCollection<UserBasic>({
        collectionPath: 'users',
        enabled: isAssignOpen // only fetch when modal opens
    });

    const handleAssign = async () => {
        if (!user || !selectedUserId) return;
        setLoading(true);
        const selectedUser = users.find(u => u.id === selectedUserId);
        if (!selectedUser) return;

        const res = await assignAsset(
            asset.id,
            selectedUser.id,
            selectedUser.displayName,
            selectedUser.department,
            user.uid,
            user.displayName || 'Unknown Admin',
            notes
        );

        setLoading(false);
        if (res.success) {
            alert('Aset berhasil di-assign!');
            setIsAssignOpen(false);
            router.refresh();
        } else {
            alert(res.error);
        }
    };

    const handleReturn = async () => {
        if (!user) return;
        setLoading(true);
        const res = await returnAsset(
            asset.id,
            returnCondition as 'excellent' | 'good' | 'fair' | 'poor',
            user.uid,
            user.displayName || 'Unknown Admin',
            notes
        );
        setLoading(false);
        if (res.success) {
            alert('Aset berhasil dikembalikan!');
            setIsReturnOpen(false);
            router.refresh();
        } else {
            alert(res.error);
        }
    };

    const handleRetire = async () => {
        if (!user || !retireReason) return;
        setLoading(true);
        const res = await retireAsset(
            asset.id,
            retireReason,
            user.uid,
            user.displayName || 'Unknown Admin'
        );
        setLoading(false);
        if (res.success) {
            alert('Aset telah dipensiunkan!');
            setIsRetireOpen(false);
            router.refresh();
        } else {
            alert(res.error);
        }
    };

    return (
        <Card>
            <CardHeader className="pb-3 border-b mb-4">
                <CardTitle className="text-base font-semibold">Tindakan Aset</CardTitle>
                <CardDescription>Ubah status operasional</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">

                {/* ASSIGN ASSET */}
                {asset.status === 'in_stock' && (
                    <Dialog open={isAssignOpen} onOpenChange={setIsAssignOpen}>
                        <DialogTrigger asChild>
                            <Button className="w-full justify-start" variant="default">Serahkan ke Karyawan (Assign)</Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px]">
                            <DialogHeader>
                                <DialogTitle>Serahkan Aset</DialogTitle>
                                <DialogDescription>Pilih karyawan yang akan menerima aset ini.</DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid gap-2">
                                    <Label>Pilih Karyawan</Label>
                                    <Popover open={openUserSelect} onOpenChange={setOpenUserSelect}>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant="outline"
                                                role="combobox"
                                                aria-expanded={openUserSelect}
                                                className="w-full justify-between"
                                            >
                                                {selectedUserId && users.length > 0
                                                    ? users.find((u) => u.id === selectedUserId)?.displayName
                                                    : "Cari karyawan..."}
                                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-full p-0">
                                            <Command>
                                                <CommandInput placeholder="Cari nama..." />
                                                <CommandList>
                                                    <CommandEmpty>Karyawan tidak ditemukan.</CommandEmpty>
                                                    <CommandGroup>
                                                        {users.map((u) => (
                                                            <CommandItem
                                                                key={u.id}
                                                                value={u.displayName}
                                                                onSelect={() => {
                                                                    setSelectedUserId(u.id);
                                                                    setOpenUserSelect(false);
                                                                }}
                                                            >
                                                                <Check
                                                                    className={cn(
                                                                        "mr-2 h-4 w-4",
                                                                        selectedUserId === u.id ? "opacity-100" : "opacity-0"
                                                                    )}
                                                                />
                                                                {u.displayName} - {u.department}
                                                            </CommandItem>
                                                        ))}
                                                    </CommandGroup>
                                                </CommandList>
                                            </Command>
                                        </PopoverContent>
                                    </Popover>
                                </div>
                                <div className="grid gap-2">
                                    <Label>Catatan Pribadi (Opsional)</Label>
                                    <Input
                                        placeholder="Keterangan tambahan..."
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsAssignOpen(false)} disabled={loading}>Batal</Button>
                                <Button onClick={handleAssign} disabled={loading || !selectedUserId}>
                                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Konfirmasi
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                )}

                {/* RETURN ASSET */}
                {asset.status === 'deployed' && (
                    <Dialog open={isReturnOpen} onOpenChange={setIsReturnOpen}>
                        <DialogTrigger asChild>
                            <Button className="w-full justify-start" variant="outline">Kembalikan ke Gudang (Return)</Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px]">
                            <DialogHeader>
                                <DialogTitle>Kembalikan Aset</DialogTitle>
                                <DialogDescription>Asset dari {asset.assignedToName} akan ditarik ke penyimpanan.</DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid gap-2">
                                    <Label>Kondisi Saat Dikembalikan</Label>
                                    <Select value={returnCondition} onValueChange={setReturnCondition}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Pilih kondisi" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="excellent">Sangat Baik (Excellent)</SelectItem>
                                            <SelectItem value="good">Baik (Good)</SelectItem>
                                            <SelectItem value="fair">Kurang (Fair)</SelectItem>
                                            <SelectItem value="poor">Buruk/Rusak (Poor)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid gap-2">
                                    <Label>Catatan Pemeriksaan</Label>
                                    <Input
                                        placeholder="Ada goresan ringan, baterai menurun..."
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsReturnOpen(false)} disabled={loading}>Batal</Button>
                                <Button onClick={handleReturn} disabled={loading}>
                                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Selesai Kembalikan
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                )}

                {/* RETIRE ASSET */}
                {['in_stock', 'maintenance', 'lost', 'deployed'].includes(asset.status) && (
                    <Dialog open={isRetireOpen} onOpenChange={setIsRetireOpen}>
                        <DialogTrigger asChild>
                            <Button className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50" variant="ghost">Pensiunkan Aset (Retire)</Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px]">
                            <DialogHeader>
                                <DialogTitle className="text-red-600">Pensiunkan Aset</DialogTitle>
                                <DialogDescription>Tindakan ini menandakan aset rusak permanen, hilang, atau dijual.</DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid gap-2">
                                    <Label className="text-red-600">Alasan Pensiun *</Label>
                                    <Input
                                        placeholder="Mati total, tidak bisa diperbaiki..."
                                        value={retireReason}
                                        onChange={(e) => setRetireReason(e.target.value)}
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsRetireOpen(false)} disabled={loading}>Batal</Button>
                                <Button variant="destructive" onClick={handleRetire} disabled={loading || !retireReason}>
                                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Konfirmasi Pensiun
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                )}

                {/* Fallback Display if Retired */}
                {asset.status === 'retired' && (
                    <div className="text-center py-4 bg-slate-50 border rounded-md">
                        <p className="text-sm font-medium text-slate-500">Aset ini telah usang / dipensiunkan.</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
