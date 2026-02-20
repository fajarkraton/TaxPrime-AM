import { notFound } from 'next/navigation';
import { adminDb } from '@/lib/firebase/admin';
import type { Subscription } from '@/types/subscription';
import { SubscriptionDetailClient } from '@/components/subscriptions/subscription-detail-client';
import { BreadcrumbNav } from '@/components/layout/breadcrumb-nav';
import { Building2 } from 'lucide-react';

export const dynamic = 'force-dynamic';

// Serialize Firestore Timestamps to ISO strings for client components
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function serializeSubscription(data: any): any {
    const result = { ...data };
    for (const key of Object.keys(result)) {
        const val = result[key];
        if (val && typeof val === 'object' && typeof val.toDate === 'function') {
            result[key] = val.toDate().toISOString();
        }
    }
    return result;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
    const defaultMeta = { title: 'Detail Langganan | TaxPrime AM' };
    const { id } = await params;

    try {
        const subSnap = await adminDb.collection('subscriptions').doc(id).get();
        if (subSnap.exists) {
            const data = subSnap.data() as Subscription;
            return {
                title: `${data.name} - Langganan | TaxPrime AM`,
                description: `Kelola kuota lisensi ${data.name} oleh ${data.provider}`
            };
        }
        return defaultMeta;
    } catch {
        return defaultMeta;
    }
}

export default async function SubscriptionDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    let subscriptionData: Subscription | null = null;

    try {
        const subSnap = await adminDb.collection('subscriptions').doc(id).get();
        if (subSnap.exists) {
            subscriptionData = serializeSubscription({ id: subSnap.id, ...subSnap.data() }) as Subscription;
        }
    } catch (error) {
        console.error('Error fetching subscription details:', error);
    }

    if (!subscriptionData) {
        notFound();
    }

    const breadcrumbItems = [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Subscriptions', href: '/subscriptions' },
        { title: subscriptionData.name, isCurrent: true },
    ];

    return (
        <div className="flex flex-col gap-6 max-w-7xl mx-auto w-full">
            <BreadcrumbNav items={breadcrumbItems} />

            <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3">
                    <Building2 className="w-8 h-8 text-muted-foreground" />
                    <h1 className="text-3xl font-bold tracking-tight">{subscriptionData.name}</h1>
                </div>
                <p className="text-muted-foreground">
                    Kelola detail layanan, alokasi lisensi, dan tagihan.
                </p>
            </div>

            <SubscriptionDetailClient
                subscription={subscriptionData}
                subscriptionId={id}
            />
        </div>
    );
}

