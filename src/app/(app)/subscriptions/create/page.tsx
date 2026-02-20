import { BreadcrumbNav } from '@/components/layout/breadcrumb-nav';
import { CreateSubscriptionForm } from '@/components/subscriptions/create-subscription-form';

export const metadata = {
    title: 'Daftar Langganan Baru | TaxPrime AM',
    description: 'Registrasi Software, SaaS, atau Cloud Services baru',
};

export default function CreateSubscriptionPage() {
    const breadcrumbItems = [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Subscriptions', href: '/subscriptions' },
        { title: 'Baru', isCurrent: true },
    ];

    return (
        <div className="flex flex-col gap-6 max-w-7xl mx-auto w-full">
            <BreadcrumbNav items={breadcrumbItems} />

            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight">Daftar Langganan & Lisensi</h1>
                <p className="text-muted-foreground">
                    Masukkan informasi tagihan dan profil kontrak vendor untuk lisensi IT Anda.
                </p>
            </div>

            <div className="grid gap-6">
                <CreateSubscriptionForm />
            </div>
        </div>
    );
}
