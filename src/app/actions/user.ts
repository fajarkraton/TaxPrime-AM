'use server';

import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import type { UserRole } from '@/types';

export interface AdminUserRecord {
    uid: string;
    email: string;
    displayName: string;
    photoURL?: string;
    role: UserRole;
    department: string;
    jobTitle: string;
    isActive: boolean;
    lastSignInTime?: string;
    creationTime: string;
}

/**
 * Fetch all users from Firebase Auth, merged with Firestore user profiles
 * Only accessible to super_admin or admin
 */
export async function listAllUsers(callerUid: string): Promise<{ success: boolean; data?: AdminUserRecord[]; error?: string }> {
    try {
        // Verify caller's role for security
        const callerRecord = await adminAuth.getUser(callerUid);
        if (callerRecord.customClaims?.role !== 'super_admin' && callerRecord.customClaims?.role !== 'admin') {
            throw new Error('Unauthorized. Only Admins can list users.');
        }

        const listUsersResult = await adminAuth.listUsers(1000);

        // Fetch Firestore user profiles for department/jobTitle data
        const firestoreProfiles: Record<string, { department?: string; jobTitle?: string; isActive?: boolean }> = {};
        try {
            const usersSnap = await adminDb.collection('users').get();
            usersSnap.docs.forEach(doc => {
                const data = doc.data();
                firestoreProfiles[doc.id] = {
                    department: data.department || '',
                    jobTitle: data.jobTitle || '',
                    isActive: data.isActive !== false, // default true
                };
            });
        } catch {
            // If users collection doesn't exist or can't be read, continue with Auth-only data
            console.warn('Could not read Firestore users collection, using Auth-only data');
        }

        const users: AdminUserRecord[] = listUsersResult.users.map((userRecord) => {
            const profile = firestoreProfiles[userRecord.uid];
            return {
                uid: userRecord.uid,
                email: userRecord.email || '',
                displayName: userRecord.displayName || 'Unknown User',
                photoURL: userRecord.photoURL,
                role: (userRecord.customClaims?.role as UserRole) || 'employee',
                department: profile?.department || '',
                jobTitle: profile?.jobTitle || '',
                isActive: profile?.isActive !== false,
                lastSignInTime: userRecord.metadata.lastSignInTime,
                creationTime: userRecord.metadata.creationTime,
            };
        });

        return { success: true, data: users };
    } catch (error: unknown) {
        console.error('List Users Error:', error);
        const message = error instanceof Error ? error.message : 'Gagal mengambil daftar pengguna';
        return { success: false, error: message };
    }
}

/**
 * Assign a role to a user
 */
export async function assignUserRole(
    targetUid: string,
    newRole: UserRole,
    actionByUid: string,
    actionByName: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const callerRecord = await adminAuth.getUser(actionByUid);
        if (callerRecord.customClaims?.role !== 'super_admin') {
            throw new Error('Unauthorized. Only Super Admins can assign roles.');
        }

        if (targetUid === actionByUid && newRole !== 'super_admin') {
            throw new Error('Cannot demote yourself from Super Admin role.');
        }

        // G-USR-08: Include department in Custom Claims
        const targetUserDoc = await adminDb.collection('users').doc(targetUid).get();
        const currentDept = targetUserDoc.data()?.department || '';
        await adminAuth.setCustomUserClaims(targetUid, { role: newRole, department: currentDept });

        // Also update Firestore user doc + G-USR-09: signal claims changed
        await adminDb.collection('users').doc(targetUid).set(
            { role: newRole, claimsUpdatedAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() },
            { merge: true }
        );

        const auditRef = adminDb.collection('auditTrails').doc();
        await auditRef.set({
            entityId: targetUid,
            entityType: 'user_role',
            action: 'updated',
            actionBy: actionByUid,
            actionByName: actionByName,
            timestamp: FieldValue.serverTimestamp(),
            details: `Mengubah peran pengguna menjadi: ${newRole}`,
        });

        return { success: true };
    } catch (error: unknown) {
        console.error('Assign Role Error:', error);
        const message = error instanceof Error ? error.message : 'Gagal mengubah peran pengguna';
        return { success: false, error: message };
    }
}

/**
 * Update a user's department
 */
export async function updateUserDepartment(
    targetUid: string,
    department: string,
    actionByUid: string,
    actionByName: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const callerRecord = await adminAuth.getUser(actionByUid);
        if (callerRecord.customClaims?.role !== 'super_admin' && callerRecord.customClaims?.role !== 'admin') {
            throw new Error('Unauthorized. Only Admins can update user departments.');
        }

        // G-USR-08: Also update department in Custom Claims
        const targetRecord = await adminAuth.getUser(targetUid);
        const currentRole = (targetRecord.customClaims?.role as string) || 'employee';
        await adminAuth.setCustomUserClaims(targetUid, { role: currentRole, department });

        await adminDb.collection('users').doc(targetUid).set(
            { department, claimsUpdatedAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() },
            { merge: true }
        );

        const auditRef = adminDb.collection('auditTrails').doc();
        await auditRef.set({
            entityId: targetUid,
            entityType: 'user_department',
            action: 'updated',
            actionBy: actionByUid,
            actionByName: actionByName,
            timestamp: FieldValue.serverTimestamp(),
            details: `Mengubah departemen pengguna menjadi: ${department}`,
        });

        return { success: true };
    } catch (error: unknown) {
        console.error('Update Department Error:', error);
        const message = error instanceof Error ? error.message : 'Gagal mengubah departemen pengguna';
        return { success: false, error: message };
    }
}

/**
 * G-USR-02: Update a user's job title
 */
export async function updateUserJobTitle(
    targetUid: string,
    jobTitle: string,
    actionByUid: string,
    actionByName: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const callerRecord = await adminAuth.getUser(actionByUid);
        if (callerRecord.customClaims?.role !== 'super_admin' && callerRecord.customClaims?.role !== 'admin') {
            throw new Error('Unauthorized. Only Admins can update user job titles.');
        }

        await adminDb.collection('users').doc(targetUid).set(
            { jobTitle, updatedAt: FieldValue.serverTimestamp() },
            { merge: true }
        );

        const auditRef = adminDb.collection('auditTrails').doc();
        await auditRef.set({
            entityId: targetUid,
            entityType: 'user_jobtitle',
            action: 'updated',
            actionBy: actionByUid,
            actionByName: actionByName,
            timestamp: FieldValue.serverTimestamp(),
            details: `Mengubah jabatan pengguna menjadi: ${jobTitle}`,
        });

        return { success: true };
    } catch (error: unknown) {
        console.error('Update JobTitle Error:', error);
        const message = error instanceof Error ? error.message : 'Gagal mengubah jabatan pengguna';
        return { success: false, error: message };
    }
}

/**
 * G-USR-01: Toggle user active status
 */
export async function toggleUserStatus(
    targetUid: string,
    isActive: boolean,
    actionByUid: string,
    actionByName: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const callerRecord = await adminAuth.getUser(actionByUid);
        if (callerRecord.customClaims?.role !== 'super_admin' && callerRecord.customClaims?.role !== 'admin') {
            throw new Error('Unauthorized. Only Admins can toggle user status.');
        }

        // Prevent deactivating yourself
        if (targetUid === actionByUid && !isActive) {
            throw new Error('Tidak dapat menonaktifkan akun sendiri.');
        }

        // Update Firestore
        await adminDb.collection('users').doc(targetUid).set(
            { isActive, updatedAt: FieldValue.serverTimestamp() },
            { merge: true }
        );

        // Disable/enable in Firebase Auth
        await adminAuth.updateUser(targetUid, { disabled: !isActive });

        // If deactivating, revoke refresh tokens
        if (!isActive) {
            await adminAuth.revokeRefreshTokens(targetUid);
        }

        const auditRef = adminDb.collection('auditTrails').doc();
        await auditRef.set({
            entityId: targetUid,
            entityType: 'user_status',
            action: 'updated',
            actionBy: actionByUid,
            actionByName: actionByName,
            timestamp: FieldValue.serverTimestamp(),
            details: `${isActive ? 'Mengaktifkan' : 'Menonaktifkan'} akun pengguna.`,
        });

        return { success: true };
    } catch (error: unknown) {
        console.error('Toggle User Status Error:', error);
        const message = error instanceof Error ? error.message : 'Gagal mengubah status pengguna';
        return { success: false, error: message };
    }
}
