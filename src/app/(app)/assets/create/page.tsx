import { CreateAssetForm } from '@/components/assets/create-asset-form';
import { BreadcrumbNav } from '@/components/layout/breadcrumb-nav';
import { ShieldAlert } from 'lucide-react';
import { Card } from '@/components/ui/card';

export default function CreateAssetPage() {
    const breadcrumbItems = [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Aset IT', href: '/assets' },
        { title: 'Registrasi Aset Baru', isCurrent: true },
    ];

    return (
        <div className="container py-8 max-w-6xl mx-auto space-y-6">
            <BreadcrumbNav items={breadcrumbItems} />

            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight text-slate-900">Registrasi Aset</h1>
                <p className="text-slate-500">Tambah data inventaris aset fisik atau perangkat lunak baru.</p>
            </div>

            <Card className="p-4 bg-blue-50 border-blue-200">
                <div className="flex gap-3 text-blue-800 text-sm">
                    <ShieldAlert className="h-5 w-5 shrink-0" />
                    <p><strong>Perhatian:</strong> Pastikan Anda telah memasang label fisik S/N atau menempelkan QR Code sementara pada perangkat sebelum menyimpannya ke gudang.</p>
                </div>
            </Card>

            <CreateAssetForm />
        </div>
    );
}
