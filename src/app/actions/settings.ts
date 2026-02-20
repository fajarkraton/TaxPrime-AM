'use server';

import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

export interface SystemSettings {
    orgName: string;
    orgDomain: string;
    emailOnNewTicket: boolean;
    emailOnAssetAssign: boolean;
    emailOnAssetReturn: boolean;
    emailOnTicketResolved: boolean;
    emailOnSlaBreach: boolean;
    subscriptionReminder: boolean;
    reminderDaysBefore: number;
    assetCodePrefix: string;
}

/**
 * G-SET-02: Save system settings with audit trail
 */
export async function saveSystemSettings(
    callerUid: string,
    callerName: string,
    settings: SystemSettings
): Promise<{ success: boolean; error?: string }> {
    try {
        // Verify caller is super_admin
        const callerRecord = await adminAuth.getUser(callerUid);
        if (callerRecord.customClaims?.role !== 'super_admin') {
            throw new Error('Unauthorized. Only Super Admins can modify system settings.');
        }

        const settingsRef = adminDb.collection('settings').doc('organization');

        // Read old settings for audit diff
        const oldSnap = await settingsRef.get();
        const oldData = oldSnap.exists ? oldSnap.data() : {};

        // Save new settings
        await settingsRef.set(
            { ...settings, updatedAt: FieldValue.serverTimestamp(), updatedBy: callerUid },
            { merge: true }
        );

        // Build change summary
        const changes: Record<string, { old: unknown; new: unknown }> = {};
        for (const [key, value] of Object.entries(settings)) {
            if (oldData && oldData[key] !== value) {
                changes[key] = { old: oldData[key] ?? null, new: value };
            }
        }

        // Write audit trail
        if (Object.keys(changes).length > 0) {
            const auditRef = adminDb.collection('auditTrails').doc();
            await auditRef.set({
                entityId: 'organization',
                entityType: 'system_settings',
                action: 'updated',
                actionBy: callerUid,
                actionByName: callerName,
                timestamp: FieldValue.serverTimestamp(),
                details: `Mengubah pengaturan sistem: ${Object.keys(changes).join(', ')}`,
                changes,
            });
        }

        return { success: true };
    } catch (error: unknown) {
        console.error('[saveSystemSettings] Error:', error);
        const message = error instanceof Error ? error.message : 'Gagal menyimpan pengaturan';
        return { success: false, error: message };
    }
}
