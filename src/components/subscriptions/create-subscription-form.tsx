'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuthContext } from '@/lib/firebase/auth-provider';
import { createSubscription } from '@/app/actions/subscription';
import { useFirestoreCollection } from '@/hooks/use-firestore-collection';

import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
    FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import type { LicenseType, BillingCycle } from '@/types/enums';

const subscriptionSchema = z.object({
    name: z.string().min(3, 'Nama langganan minimal 3 karakter').max(100),
    provider: z.string().min(2, 'Nama provider/vendor wajib diisi'),
    licenseType: z.enum(['per_user', 'per_device', 'site', 'enterprise']),
    totalLicenses: z.coerce.number().min(1, 'Jumlah lisensi minimal 1'),
    costPerPeriod: z.coerce.number().min(0, 'Biaya tidak boleh negatif'),
    billingCycle: z.enum(['monthly', 'quarterly', 'annually']),
    currency: z.string().default('IDR'),
    startDate: z.string().min(1, 'Tanggal mulai wajib diisi'),
    expiryDate: z.string().min(1, 'Tanggal kedaluwarsa wajib diisi'),
    autoRenew: z.boolean().default(false),
    assetRef: z.string().optional(),
    vendorContact: z.string().optional(),
    vendorEmail: z.string().email('Format email tidak valid').optional().or(z.literal('')),
    vendorPhone: z.string().optional(),
    notes: z.string().max(500).optional(),
});

type FormValues = z.infer<typeof subscriptionSchema>;

export function CreateSubscriptionForm() {
    const router = useRouter();
    const { toast } = useToast();
    const { user } = useAuthContext();
    const [submitting, setSubmitting] = useState(false);

    const form = useForm<FormValues>({
        resolver: zodResolver(subscriptionSchema),
        defaultValues: {
            name: '',
            provider: '',
            licenseType: 'per_user',
            totalLicenses: 1,
            costPerPeriod: 0,
            billingCycle: 'annually',
            currency: 'IDR',
            startDate: '',
            expiryDate: '',
            autoRenew: false,
            assetRef: '',
            vendorContact: '',
            vendorEmail: '',
            vendorPhone: '',
            notes: '',
        },
    });

    async function onSubmit(data: FormValues) {
        if (!user) return;

        try {
            setSubmitting(true);
            const result = await createSubscription(
                {
                    ...data,
                    licenseType: data.licenseType as LicenseType,
                    billingCycle: data.billingCycle as BillingCycle,
                },
                user.uid
            );

            if (result.success) {
                toast({
                    title: 'Berhasil',
                    description: 'Lisensi langganan berhasil didaftarkan.',
                });
                router.push('/subscriptions');
            } else {
                toast({
                    variant: 'destructive',
                    title: 'Kesalahan Sistem',
                    description: result.error,
                });
            }
        } catch {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Gagal menghubungi server.',
            });
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 max-w-4xl">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card className="md:col-span-2">
                        <CardHeader>
                            <CardTitle>Informasi Utama</CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Nama Langganan</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Contoh: Google Workspace Business Starter" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="provider"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Provider / Vendor</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Contoh: Google Google Cloud" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="licenseType"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Tipe Lisensi</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Pilih Tipe Lisensi" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="per_user">Per Pengguna (User-based)</SelectItem>
                                                <SelectItem value="per_device">Per Perangkat (Device-based)</SelectItem>
                                                <SelectItem value="site">Lisensi Situs (Site License)</SelectItem>
                                                <SelectItem value="enterprise">Perusahaan (Enterprise)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="totalLicenses"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Total Lisensi (Kuota)</FormLabel>
                                        <FormControl>
                                            <Input type="number" min="1" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </CardContent>
                    </Card>

                    {/* Asset Ref Card */}
                    <Card className="md:col-span-2">
                        <CardHeader>
                            <CardTitle>Aset Terkait (Opsional)</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <FormField
                                control={form.control}
                                name="assetRef"
                                render={({ field }) => {
                                    // eslint-disable-next-line react-hooks/rules-of-hooks
                                    const { data: assetsData } = useFirestoreCollection({
                                        collectionPath: 'assets',
                                        pageSize: 100,
                                    });
                                    const softwareAssets = (assetsData as { id: string; assetCode: string; name: string; category: string }[]).filter(
                                        a => a.category === 'software' || a.category === 'license'
                                    );
                                    return (
                                        <FormItem>
                                            <FormLabel>Hubungkan ke Aset Intangible</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Pilih aset software/lisensi yang terkait (opsional)" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="__none__">Tidak terkait aset</SelectItem>
                                                    {softwareAssets.map(a => (
                                                        <SelectItem key={a.id} value={a.id}>
                                                            {a.assetCode} — {a.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormDescription>
                                                Hubungkan subscription ini dengan aset software yang ada di inventaris.
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    );
                                }}
                            />
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Siklus & Biaya</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <FormField
                                control={form.control}
                                name="billingCycle"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Siklus Tagihan</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Pilih Siklus" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="monthly">Bulanan</SelectItem>
                                                <SelectItem value="quarterly">Kuartalan (3 Bulan)</SelectItem>
                                                <SelectItem value="annually">Tahunan</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <div className="flex gap-2">
                                <FormField
                                    control={form.control}
                                    name="currency"
                                    render={({ field }) => (
                                        <FormItem className="w-1/3">
                                            <FormLabel>Mata Uang</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="IDR">IDR</SelectItem>
                                                    <SelectItem value="USD">USD</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="costPerPeriod"
                                    render={({ field }) => (
                                        <FormItem className="flex-1">
                                            <FormLabel>Total Biaya (Per Siklus)</FormLabel>
                                            <FormControl>
                                                <Input type="number" min="0" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                            <div className="flex gap-4">
                                <FormField
                                    control={form.control}
                                    name="startDate"
                                    render={({ field }) => (
                                        <FormItem className="flex-1">
                                            <FormLabel>Tanggal Mulai</FormLabel>
                                            <FormControl>
                                                <Input type="date" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="expiryDate"
                                    render={({ field }) => (
                                        <FormItem className="flex-1">
                                            <FormLabel>Jatuh Tempo (Expiry)</FormLabel>
                                            <FormControl>
                                                <Input type="date" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                            <FormField
                                control={form.control}
                                name="autoRenew"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm mt-4">
                                        <div className="space-y-0.5">
                                            <FormLabel>Perpanjangan Otomatis (Auto-Renew)</FormLabel>
                                            <FormDescription>
                                                Aktifkan jika pembayaran ditagih secara otomatis oleh vendor.
                                            </FormDescription>
                                        </div>
                                        <FormControl>
                                            <Switch
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                            />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Kontak Vendor & Catatan</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <FormField
                                control={form.control}
                                name="vendorContact"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Nama Kontak (Opsional)</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Nama Account Manager..." {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <div className="flex gap-4">
                                <FormField
                                    control={form.control}
                                    name="vendorEmail"
                                    render={({ field }) => (
                                        <FormItem className="flex-1">
                                            <FormLabel>Email Layanan</FormLabel>
                                            <FormControl>
                                                <Input type="email" placeholder="support@..." {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="vendorPhone"
                                    render={({ field }) => (
                                        <FormItem className="flex-1">
                                            <FormLabel>Telepon/Ext</FormLabel>
                                            <FormControl>
                                                <Input {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                            <FormField
                                control={form.control}
                                name="notes"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Catatan Tambahan</FormLabel>
                                        <FormControl>
                                            <Textarea className="resize-none" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </CardContent>
                    </Card>
                </div>

                <div className="flex justify-end gap-4">
                    <Button type="button" variant="outline" onClick={() => router.back()}>
                        Batal
                    </Button>
                    <Button type="submit" disabled={submitting}>
                        {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {submitting ? 'Menyimpan...' : 'Daftarkan Langganan'}
                    </Button>
                </div>
            </form>
        </Form>
    );
}
