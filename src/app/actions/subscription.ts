'use server';

import { adminDb } from '@/lib/firebase/admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { revalidatePath } from 'next/cache';
import type { CreateSubscriptionInput } from '@/types/subscription';
import { createSubscriptionRenewalEvent } from '@/lib/google/calendar';

export async function createSubscription(
    input: CreateSubscriptionInput,
    creatorUid: string
): Promise<{ success: boolean; data?: string; error?: string }> {
    try {
        const subRef = adminDb.collection('subscriptions').doc();

        const startDateParsed = new Date(input.startDate);
        const expiryDateParsed = new Date(input.expiryDate);

        // Determine initial status based on dates
        const now = new Date();
        let status = 'active';
        if (expiryDateParsed < now) {
            status = 'expired';
        } else {
            const timeDiff = expiryDateParsed.getTime() - now.getTime();
            const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
            if (daysDiff <= 30) {
                status = 'expiring_soon';
            }
        }

        const subscriptionData = {
            assetRef: input.assetRef || null,
            name: input.name,
            provider: input.provider,
            licenseType: input.licenseType,
            totalLicenses: input.totalLicenses,
            usedLicenses: 0,
            costPerPeriod: input.costPerPeriod,
            billingCycle: input.billingCycle,
            currency: input.currency || 'IDR',

            // Konversi dari string form Date (YYYY-MM-DD) ke Firebase Timestamp
            startDate: Timestamp.fromDate(startDateParsed),
            expiryDate: Timestamp.fromDate(expiryDateParsed),

            autoRenew: input.autoRenew ?? false,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            status: status as any, // active | expiring_soon | expired | cancelled

            reminderSentH30: false,
            reminderSentH14: false,
            reminderSentH7: false,
            reminderSentH1: false,
            assignedUsers: [],

            vendorContact: input.vendorContact || '',
            vendorEmail: input.vendorEmail || '',
            vendorPhone: input.vendorPhone || '',
            notes: input.notes || '',

            createdAt: FieldValue.serverTimestamp() as unknown as Timestamp,
            updatedAt: FieldValue.serverTimestamp() as unknown as Timestamp,
            createdBy: creatorUid,
        };

        await subRef.set(subscriptionData);

        // Audit Trail
        await adminDb.collection('auditTrails').add({
            action: 'created',
            entityType: 'subscription',
            entityId: subRef.id,
            description: `Mendaftarkan langganan/lisensi baru: ${input.name}`,
            timestamp: FieldValue.serverTimestamp(),
            performedBy: creatorUid
        });

        // Create Google Calendar renewal event (fire-and-forget)
        createSubscriptionRenewalEvent({
            name: input.name,
            provider: input.provider,
            expiryDate: expiryDateParsed,
            costPerPeriod: input.costPerPeriod,
            billingCycle: input.billingCycle,
            id: subRef.id,
        }).catch(console.error);

        revalidatePath('/subscriptions');
        return { success: true, data: subRef.id };
    } catch (error: unknown) {
        console.error('Error creating subscription:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Gagal menyimpan langganan' };
    }
}
