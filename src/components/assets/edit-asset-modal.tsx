'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useAuthContext } from '@/lib/firebase/auth-provider';
import { updateAsset } from '@/app/actions/asset';
import { assetFormSchema, AssetFormValues } from '@/lib/validations/asset';
import { AssetCategory, AssetStatus, AssetType, type Asset } from '@/types';

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Loader2, Edit3 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

export function EditAssetModal({ asset }: { asset: Asset }) {
    const router = useRouter();
    const { user, claims } = useAuthContext() as unknown as { user: { uid: string, displayName?: string }, claims: Record<string, unknown> }; // Cast to handle custom Auth shape
    const [isOpen, setIsOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // RBAC logic: IT Staff and Super Admin can edit sensitive fields
    const isPrivileged = claims?.role === 'it_staff' || claims?.role === 'super_admin';

    const form = useForm<AssetFormValues>({
        resolver: zodResolver(assetFormSchema),
        defaultValues: {
            name: asset.name,
            brand: asset.brand,
            model: asset.model,
            serialNumber: asset.serialNumber,
            category: asset.category as AssetCategory,
            type: asset.type as AssetType,
            status: asset.status as AssetStatus,
            condition: (asset.condition || 'good') as 'good' | 'excellent' | 'fair' | 'poor',
            department: asset.department,
            location: asset.location || '',
            purchaseDate: asset.purchaseDate ? String(asset.purchaseDate) : '',
            purchasePrice: asset.purchasePrice || 0,
            vendor: asset.vendor || '',
            notes: asset.notes || '',
            hardwareSpecs: (asset as unknown as Record<string, unknown>).hardwareSpecs as AssetFormValues['hardwareSpecs'] || {
                cpuBrand: '',
                cpuModel: '',
                ramTotal: 8,
                storagePrimaryCapacity: '',
                osName: ''
            }
        } as AssetFormValues,
    });

    const watchCategory = form.watch('category');
    const showHardwareSpecs = watchCategory === AssetCategory.LAPTOP || watchCategory === AssetCategory.COMPUTER;

    async function onSubmit(data: AssetFormValues) {
        if (!user) return;
        setIsSubmitting(true);
        try {
            const res = await updateAsset(asset.id, data, user.uid, user.displayName || 'Unknown');
            if (res.success) {
                alert('Informasi Aset berhasil diperbarui');
                setIsOpen(false);
                router.refresh();
            } else {
                alert(res.error);
            }
        } catch (error) {
            console.error(error);
            alert('Terjadi kesalahan tidak terduga');
        }
        setIsSubmitting(false);
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="outline"><Edit3 className="w-4 h-4 mr-2" /> Edit Info Lengkap</Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0">
                <DialogHeader className="px-6 py-4 border-b shrink-0">
                    <DialogTitle>Edit Informasi Aset: {asset.assetCode}</DialogTitle>
                    <DialogDescription>
                        Perbarui metadata untuk {asset.name}. Beberapa kolom dikunci untuk Role anda.
                    </DialogDescription>
                </DialogHeader>

                <ScrollArea className="flex-1 px-6 py-4">
                    <Form {...form}>
                        <form id="edit-asset-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

                            {/* BASIC INFO */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <FormField
                                    control={form.control}
                                    name="name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Nama Aset / Alias</FormLabel>
                                            <FormControl><Input {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="department"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Departemen Pemilik</FormLabel>
                                            <FormControl><Input {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="category"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Kategori Aset</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!isPrivileged}>
                                                <FormControl><SelectTrigger><SelectValue placeholder="Pilih kategori" /></SelectTrigger></FormControl>
                                                <SelectContent>
                                                    {Object.values(AssetCategory).map(cat => (
                                                        <SelectItem key={cat} value={cat} className="capitalize">{cat}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="type"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Jenis Aset</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!isPrivileged}>
                                                <FormControl><SelectTrigger><SelectValue placeholder="Pilih jenis" /></SelectTrigger></FormControl>
                                                <SelectContent>
                                                    {Object.values(AssetType).map(t => (
                                                        <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <hr />

                            {/* HARDWARE IDENTIFICATION */}
                            <h3 className="text-sm font-semibold text-slate-900 border-l-4 border-blue-600 pl-3">Identifikasi Hardware</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 uppercase-labels">
                                <FormField
                                    control={form.control}
                                    name="brand"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Merk (Brand)</FormLabel>
                                            <FormControl><Input {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="model"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Model / Seri</FormLabel>
                                            <FormControl><Input {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="serialNumber"
                                    render={({ field }) => (
                                        <FormItem className="md:col-span-2">
                                            <FormLabel>Serial Number (S/N) / Service Tag</FormLabel>
                                            <FormControl><Input {...field} disabled={!isPrivileged} placeholder="Dilarang mengubah tanpa izin sysadmin" /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            {/* CONDITIONAL HARDWARE SPECS */}
                            {showHardwareSpecs && (
                                <div className="p-4 border rounded-xl bg-slate-50 space-y-4">
                                    <h3 className="text-sm font-semibold">Spesifikasi Komputer/Laptop</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <FormField control={form.control} name="hardwareSpecs.cpuBrand" render={({ field }) => (
                                            <FormItem><FormLabel>CPU Brand</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                                        )} />
                                        <FormField control={form.control} name="hardwareSpecs.cpuModel" render={({ field }) => (
                                            <FormItem><FormLabel>CPU Model</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                                        )} />
                                        <FormField control={form.control} name="hardwareSpecs.ramTotal" render={({ field }) => (
                                            <FormItem><FormLabel>RAM (GB)</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value))} /></FormControl></FormItem>
                                        )} />
                                    </div>
                                </div>
                            )}

                            <hr />

                            {/* PURCHASE INFO */}
                            <h3 className="text-sm font-semibold text-slate-900 border-l-4 border-emerald-600 pl-3">Informasi Akuisisi & Pengadaan</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <FormField control={form.control} name="vendor" render={({ field }) => (
                                    <FormItem><FormLabel>Vendor / Toko</FormLabel><FormControl><Input {...field} disabled={!isPrivileged} /></FormControl></FormItem>
                                )} />
                                <FormField control={form.control} name="purchaseDate" render={({ field }) => (
                                    <FormItem><FormLabel>Tanggal Pembelian</FormLabel><FormControl><Input type="date" {...field} disabled={!isPrivileged} /></FormControl></FormItem>
                                )} />
                                <FormField control={form.control} name="purchasePrice" render={({ field }) => (
                                    <FormItem><FormLabel>Harga Beli (IDR)</FormLabel><FormControl><Input type="number" {...field} disabled={!isPrivileged} onChange={e => field.onChange(parseFloat(e.target.value))} /></FormControl></FormItem>
                                )} />
                                <FormField control={form.control} name="location" render={({ field }) => (
                                    <FormItem><FormLabel>Lokasi Fisik (Gudang/Lantai)</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                                )} />
                            </div>

                            <FormField
                                control={form.control}
                                name="notes"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Catatan Tambahan (Opsional)</FormLabel>
                                        <FormControl>
                                            <Textarea {...field} placeholder="Kelengkapan dus, garansi, dsb." className="resize-none" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Safe padding for scrolling */}
                            <div className="h-4"></div>
                        </form>
                    </Form>
                </ScrollArea>

                <div className="p-4 border-t bg-slate-50 shrink-0 flex justify-end gap-3 rounded-b-lg">
                    <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isSubmitting}>Batal</Button>
                    <Button type="submit" form="edit-asset-form" disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Simpan Perubahan
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
