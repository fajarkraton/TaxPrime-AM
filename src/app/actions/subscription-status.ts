'use server';

import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * Auto-update subscription statuses based on expiry dates.
 * - expired: expiryDate < now
 * - expiring_soon: expiryDate within 30 days
 * - active: everything else
 * Skips cancelled subscriptions.
 */
export async function updateSubscriptionStatuses(): Promise<{
    success: boolean;
    updated: number;
    expired: number;
    expiringSoon: number;
    error?: string;
}> {
    try {
        const snapshot = await adminDb.collection('subscriptions')
            .where('status', '!=', 'cancelled')
            .get();

        const now = new Date();
        const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
        let updated = 0;
        let expired = 0;
        let expiringSoon = 0;

        const batch = adminDb.batch();

        for (const doc of snapshot.docs) {
            const data = doc.data();
            const expiryDate = data.expiryDate?.toDate?.() as Date | undefined;
            if (!expiryDate) continue;

            const currentStatus = data.status;
            let newStatus = currentStatus;

            if (expiryDate.getTime() < now.getTime()) {
                newStatus = 'expired';
                if (currentStatus !== 'expired') expired++;
            } else if (expiryDate.getTime() - now.getTime() < thirtyDaysMs) {
                newStatus = 'expiring_soon';
                if (currentStatus !== 'expiring_soon') expiringSoon++;
            } else {
                newStatus = 'active';
            }

            if (newStatus !== currentStatus) {
                batch.update(doc.ref, {
                    status: newStatus,
                    updatedAt: FieldValue.serverTimestamp(),
                });
                updated++;
            }
        }

        if (updated > 0) {
            await batch.commit();
        }

        return { success: true, updated, expired, expiringSoon };
    } catch (error: unknown) {
        console.error('Subscription status update error:', error);
        return {
            success: false,
            updated: 0,
            expired: 0,
            expiringSoon: 0,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}
