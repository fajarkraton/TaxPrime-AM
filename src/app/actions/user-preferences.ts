'use server';

import { adminDb } from '@/lib/firebase/admin';

export interface NotificationPreferences {
    assetAssignment: boolean;
    ticketUpdates: boolean;
    subscriptionReminders: boolean;
    monthlyReports: boolean;
}

const DEFAULT_PREFS: NotificationPreferences = {
    assetAssignment: true,
    ticketUpdates: true,
    subscriptionReminders: true,
    monthlyReports: true,
};

/**
 * Get notification preferences for a user.
 * Returns defaults if none are set.
 */
export async function getNotificationPreferences(uid: string): Promise<NotificationPreferences> {
    try {
        const doc = await adminDb.collection('users').doc(uid).collection('preferences').doc('notifications').get();
        if (doc.exists) {
            return { ...DEFAULT_PREFS, ...doc.data() } as NotificationPreferences;
        }
        return DEFAULT_PREFS;
    } catch (error) {
        console.error('[Prefs] Error getting notification preferences:', error);
        return DEFAULT_PREFS;
    }
}

/**
 * Update notification preferences for a user.
 */
export async function updateNotificationPreferences(
    uid: string,
    prefs: Partial<NotificationPreferences>
): Promise<{ success: boolean; error?: string }> {
    try {
        await adminDb
            .collection('users')
            .doc(uid)
            .collection('preferences')
            .doc('notifications')
            .set(prefs, { merge: true });

        return { success: true };
    } catch (error) {
        console.error('[Prefs] Error updating notification preferences:', error);
        return { success: false, error: 'Gagal menyimpan preferensi.' };
    }
}

/**
 * Check if a user wants to receive a specific notification type.
 * Used by email sending functions.
 */
export async function shouldSendNotification(
    uid: string,
    type: keyof NotificationPreferences
): Promise<boolean> {
    const prefs = await getNotificationPreferences(uid);
    return prefs[type];
}
