'use client';

import { useAuthContext } from '@/lib/firebase/auth-provider';
import { MyAssetsList } from '@/components/my-assets/my-assets-list';
import { Package, Info, Ticket } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function MyAssetsPage() {
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
                        <Package className="h-8 w-8 text-blue-600" />
                        Aset Saya
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Daftar aset IT yang ditugaskan kepada Anda oleh tim IT.
                    </p>
                </div>
                <Button asChild variant="outline" className="gap-2 shrink-0">
                    <Link href="/tickets">
                        <Ticket className="h-4 w-4" />
                        Buat Service Ticket
                    </Link>
                </Button>
            </div>

            {/* Info Banner */}
            <div className="flex items-start gap-3 rounded-lg bg-blue-50 border border-blue-100 px-4 py-3">
                <Info className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                <p className="text-sm text-blue-700">
                    Aset yang ditampilkan di sini adalah perangkat IT yang secara resmi ditugaskan kepada Anda. Jika ada aset yang tidak muncul atau ada masalah, silakan buat <Link href="/tickets" className="underline font-medium">Service Ticket</Link>.
                </p>
            </div>

            <MyAssetsList userId={user.uid} />
        </div>
    );
}
