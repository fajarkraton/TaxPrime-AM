'use server';

import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * G-USR-10 + G-USR-12: Ensure user profile exists on first login.
 * Creates Firestore doc + sets default Custom Claims if missing.
 * Also updates lastLoginAt on every login.
 */
export async function ensureUserProfile(
    uid: string,
    email: string,
    displayName: string,
    photoURL: string
): Promise<{ role: string; department: string }> {
    try {
        const userRef = adminDb.collection('users').doc(uid);
        const userDoc = await userRef.get();

        if (!userDoc.exists) {
            // First login — create Firestore profile + set default claims
            const defaultRole = 'employee';
            const defaultDept = '';

            await adminAuth.setCustomUserClaims(uid, { role: defaultRole, department: defaultDept });

            await userRef.set({
                uid,
                email,
                displayName,
                photoUrl: photoURL || '',
                role: defaultRole,
                department: defaultDept,
                jobTitle: '',
                isActive: true,
                assignedAssets: [],
                assignedAssetsCount: 0,
                lastLoginAt: FieldValue.serverTimestamp(),
                claimsUpdatedAt: FieldValue.serverTimestamp(),
                createdAt: FieldValue.serverTimestamp(),
                updatedAt: FieldValue.serverTimestamp(),
            });

            return { role: defaultRole, department: defaultDept };
        }

        // Existing user — update lastLoginAt + ensure claims exist
        const data = userDoc.data()!;
        const role = data.role || 'employee';
        const department = data.department || '';

        // G-USR-12: Update lastLoginAt
        await userRef.update({ lastLoginAt: FieldValue.serverTimestamp() });

        // Ensure claims are set (in case they were cleared)
        const authUser = await adminAuth.getUser(uid);
        if (!authUser.customClaims?.role) {
            await adminAuth.setCustomUserClaims(uid, { role, department });
            await userRef.update({ claimsUpdatedAt: FieldValue.serverTimestamp() });
        }

        return { role, department };
    } catch (error) {
        console.error('[ensureUserProfile] Error:', error);
        // Return defaults on error — don't break login flow
        return { role: 'employee', department: '' };
    }
}
