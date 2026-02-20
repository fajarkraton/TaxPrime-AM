'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { Loader2, Paperclip, X, FileText, ImageIcon } from 'lucide-react';
import { uploadFileToStorage } from '@/lib/firebase/storage';

import {
    Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

import { useAuthContext } from '@/lib/firebase/auth-provider';
import { createServiceTicket } from '@/app/actions/ticket';
import type { TicketCategory, TicketPriority } from '@/types/enums';
import { AssetPickerCombobox } from '@/components/tickets/asset-picker-combobox';

const ticketFormSchema = z.object({
    title: z.string().min(5, 'Judul tiket minimal 5 karakter').max(100, 'Maksimal 100 karakter'),
    description: z.string().min(10, 'Deskripsikan masalah Anda lebih detail (min. 10 karakter)'),
    category: z.enum(['hardware_repair', 'software_issue', 'replacement', 'new_request']),
    priority: z.enum(['low', 'medium', 'high', 'critical']),
    assetRef: z.string().optional()
});

type TicketFormValues = z.infer<typeof ticketFormSchema>;

export function CreateTicketForm() {
    const router = useRouter();
    const { user } = useAuthContext();
    const [submitting, setSubmitting] = useState(false);
    const [attachments, setAttachments] = useState<File[]>([]);
    const [uploadProgress, setUploadProgress] = useState(0);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const MAX_FILES = 5;
    const MAX_SIZE_MB = 10;
    const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

    const handleAddFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        const remaining = MAX_FILES - attachments.length;
        if (remaining <= 0) { toast.error(`Maksimal ${MAX_FILES} file.`); return; }

        const validFiles = files.slice(0, remaining).filter(f => {
            if (f.size > MAX_SIZE_MB * 1024 * 1024) { toast.error(`${f.name} terlalu besar (max ${MAX_SIZE_MB}MB).`); return false; }
            if (!ALLOWED_TYPES.includes(f.type)) { toast.error(`${f.name}: tipe file tidak didukung.`); return false; }
            return true;
        });
        setAttachments(prev => [...prev, ...validFiles]);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const removeAttachment = (idx: number) => {
        setAttachments(prev => prev.filter((_, i) => i !== idx));
    };

    const form = useForm<TicketFormValues>({
        resolver: zodResolver(ticketFormSchema),
        defaultValues: {
            title: '',
            description: '',
            assetRef: ''
        }
    });

    async function onSubmit(data: TicketFormValues) {
        if (!user) {
            toast.error('Sesi Anda telah berakhir. Silakan login kembali.');
            return;
        }

        try {
            setSubmitting(true);

            // Upload attachments first
            let attachmentUrls: string[] = [];
            if (attachments.length > 0) {
                const uploadPromises = attachments.map((file, idx) => {
                    const path = `tickets/attachments/${Date.now()}_${idx}_${file.name}`;
                    return uploadFileToStorage(file, path, (p) => setUploadProgress(Math.round(p)));
                });
                const results = await Promise.all(uploadPromises);
                attachmentUrls = results.map(r => r.url);
            }

            const result = await createServiceTicket(
                {
                    ...data,
                    category: data.category as TicketCategory,
                    priority: data.priority as TicketPriority,
                    attachmentUrls,
                },
                user.uid,
                user.displayName || 'Unknown User',
                user.email || 'no-email@taxprime.net'
            );

            if (result.success) {
                toast.success('Tiket berhasil dibuat! Anda dapat memantau statusnya di panel antrean.');
                router.push('/tickets');
            } else {
                toast.error(result.error || 'Gagal membuat tiket bantuan.');
            }
        } catch (error: unknown) {
            toast.error('Terjadi kesalahan yang tidak terduga.');
            console.error(error);
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <Card className="max-w-3xl border-none shadow-sm outline outline-1 outline-slate-200">
            <CardHeader className="bg-slate-50/50 border-b">
                <CardTitle>Ajukan Bantuan IT</CardTitle>
                <CardDescription>
                    Gunakan formulir ini untuk melaporkan masalah perangkat keras, perangkat lunak, atau permintaan aset baru. Tim IT akan segera merespons Anda sesuai Service Level.
                </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

                        <FormField
                            control={form.control}
                            name="title"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Perihal Singkat <span className="text-red-500">*</span></FormLabel>
                                    <FormControl>
                                        <Input placeholder="Contoh: Laptop tidak bisa masuk OS Windows" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <FormField
                                control={form.control}
                                name="category"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Kategori Bantuan <span className="text-red-500">*</span></FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Pilih Jenis Keluhan" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="hardware_repair">Perbaikan Perangkat Keras</SelectItem>
                                                <SelectItem value="software_issue">Kendala / Instalasi Software</SelectItem>
                                                <SelectItem value="replacement">Penggantian Aset Rusak</SelectItem>
                                                <SelectItem value="new_request">Permintaan Perangkat Baru</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="priority"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Keadaan Mendesak (Priority) <span className="text-red-500">*</span></FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Seberapa darurat?" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="low">Rendah (Tanya IT / Konsultasi)</SelectItem>
                                                <SelectItem value="medium">Menengah (Mengganggu tapi masih bisa kerja)</SelectItem>
                                                <SelectItem value="high">Tinggi (Pekerjaan terhenti total)</SelectItem>
                                                <SelectItem value="critical">Kritis (Blokir perusahaan / server down)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="assetRef"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Terkait Aset Khusus? (Opsional)</FormLabel>
                                    <FormControl>
                                        <AssetPickerCombobox
                                            userId={user?.uid || ''}
                                            value={field.value || ''}
                                            onChange={field.onChange}
                                        />
                                    </FormControl>
                                    <FormDescription>Pilih aset yang bermasalah dari daftar aset Anda, atau kosongkan jika tidak terkait aset tertentu.</FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Detail Lengkap <span className="text-red-500">*</span></FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder="Jelaskan secara kronologis apa yang terjadi, aplikasi apa yang error, dan pesan error apa yang muncul..."
                                            className="min-h-[150px] resize-y"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* ── Attachments ── */}
                        <div className="space-y-3">
                            <label className="text-sm font-medium leading-none">Lampiran (Opsional)</label>
                            <div className="flex items-center gap-3">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={attachments.length >= MAX_FILES}
                                >
                                    <Paperclip className="w-4 h-4 mr-2" />
                                    Tambah File
                                </Button>
                                <span className="text-xs text-muted-foreground">
                                    {attachments.length}/{MAX_FILES} file (max {MAX_SIZE_MB}MB per file)
                                </span>
                            </div>
                            <input
                                ref={fileInputRef}
                                type="file"
                                multiple
                                accept="image/*,.pdf,.doc,.docx,.txt,.log"
                                className="hidden"
                                onChange={handleAddFiles}
                            />
                            {attachments.length > 0 && (
                                <div className="space-y-2 border rounded-lg p-3 bg-slate-50">
                                    {attachments.map((file, idx) => (
                                        <div key={idx} className="flex items-center gap-3 text-sm">
                                            {file.type.startsWith('image/') ? (
                                                <ImageIcon className="w-4 h-4 text-blue-500 shrink-0" />
                                            ) : (
                                                <FileText className="w-4 h-4 text-slate-500 shrink-0" />
                                            )}
                                            <span className="truncate flex-1">{file.name}</span>
                                            <span className="text-xs text-muted-foreground shrink-0">
                                                {(file.size / 1024).toFixed(0)} KB
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => removeAttachment(idx)}
                                                className="text-red-500 hover:text-red-700 shrink-0"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end gap-4 pt-4 border-t">
                            <Button type="button" variant="outline" onClick={() => router.back()} disabled={submitting}>
                                Batal
                            </Button>
                            <Button type="submit" disabled={submitting || !user}>
                                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {submitting && uploadProgress > 0 && uploadProgress < 100 ? `Mengunggah ${uploadProgress}%...` : 'Kirim Tiket'}
                            </Button>
                        </div>

                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}
