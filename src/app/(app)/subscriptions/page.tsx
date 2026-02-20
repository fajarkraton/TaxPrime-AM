'use client';

import { BreadcrumbNav } from '@/components/layout/breadcrumb-nav';
import { SubscriptionList } from '@/components/subscriptions/subscription-list';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import Link from 'next/link';

export default function SubscriptionsPage() {
    const breadcrumbItems = [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Subscriptions', isCurrent: true },
    ];

    return (
        <div className="flex flex-col gap-6">
            <BreadcrumbNav items={breadcrumbItems} />

            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Manajemen Langganan & Lisensi</h1>
                    <p className="text-muted-foreground mt-1">Pantau biaya, kapasitas, dan tenggat waktu kedaluwarsa layanan cloud dan lisensi.</p>
                </div>
                <Button asChild>
                    <Link href="/subscriptions/create">
                        <Plus className="w-4 h-4 mr-2" /> Daftar Langganan Baru
                    </Link>
                </Button>
            </div>

            <SubscriptionList />
        </div>
    );
}
