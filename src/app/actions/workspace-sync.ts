'use server';

import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { google } from 'googleapis';

/**
 * G-USR-03: Sync users from Google Workspace Directory API
 * 
 * Fetches all users in the @taxprime.net domain from Google Admin SDK
 * and updates Firestore user profiles with displayName, department, jobTitle, photoUrl.
 * 
 * Only accessible by super_admin or admin.
 */
export async function syncUsersFromWorkspace(callerUid: string): Promise<{
    success: boolean;
    data?: { synced: number; created: number; updated: number; skipped: number };
    error?: string;
}> {
    try {
        // Verify caller role
        const callerRecord = await adminAuth.getUser(callerUid);
        if (callerRecord.customClaims?.role !== 'super_admin' && callerRecord.customClaims?.role !== 'admin') {
            throw new Error('Unauthorized. Only Admins can sync Workspace users.');
        }

        // Check credentials
        const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
        const key = process.env.GOOGLE_SERVICE_ACCOUNT_KEY?.replace(/\\n/g, '\n');
        const delegatedUser = process.env.GOOGLE_DELEGATED_USER;

        if (!email || !key || !delegatedUser) {
            return {
                success: false,
                error: 'Google Workspace credentials not configured. Set GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_SERVICE_ACCOUNT_KEY, and GOOGLE_DELEGATED_USER.',
            };
        }

        // Initialize Admin SDK Directory API
        const auth = new google.auth.JWT({
            email,
            key,
            scopes: ['https://www.googleapis.com/auth/admin.directory.user.readonly'],
            subject: delegatedUser,
        });

        const directory = google.admin({ version: 'directory_v1', auth });

        // Fetch all users from Workspace domain
        const domain = delegatedUser.split('@')[1] || 'taxprime.net';
        let allWorkspaceUsers: {
            primaryEmail: string;
            name?: { fullName?: string };
            thumbnailPhotoUrl?: string;
            orgUnitPath?: string;
            organizations?: Array<{ department?: string; title?: string }>;
            suspended?: boolean;
        }[] = [];

        let pageToken: string | undefined;
        do {
            const res = await directory.users.list({
                domain,
                maxResults: 500,
                pageToken,
                projection: 'full',
            });

            if (res.data.users) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                allWorkspaceUsers = [...allWorkspaceUsers, ...(res.data.users as any[])];
            }
            pageToken = res.data.nextPageToken || undefined;
        } while (pageToken);

        const stats = { synced: 0, created: 0, updated: 0, skipped: 0 };

        // Process each Workspace user
        for (const wsUser of allWorkspaceUsers) {
            if (!wsUser.primaryEmail) {
                stats.skipped++;
                continue;
            }

            try {
                // Try to find matching Firebase Auth user
                let firebaseUser;
                try {
                    firebaseUser = await adminAuth.getUserByEmail(wsUser.primaryEmail);
                } catch {
                    // User doesn't exist in Firebase Auth yet — skip
                    stats.skipped++;
                    continue;
                }

                const org = wsUser.organizations?.[0];
                const updates: Record<string, unknown> = {
                    email: wsUser.primaryEmail,
                    displayName: wsUser.name?.fullName || '',
                    photoUrl: wsUser.thumbnailPhotoUrl || '',
                    department: org?.department || '',
                    jobTitle: org?.title || '',
                    lastSyncedAt: FieldValue.serverTimestamp(),
                    updatedAt: FieldValue.serverTimestamp(),
                };

                // Check if Firestore doc exists
                const userRef = adminDb.collection('users').doc(firebaseUser.uid);
                const existing = await userRef.get();

                if (existing.exists) {
                    // Only update fields that are different or empty
                    const existingData = existing.data()!;
                    const changed =
                        existingData.displayName !== updates.displayName ||
                        existingData.photoUrl !== updates.photoUrl ||
                        (!existingData.department && updates.department) ||
                        (!existingData.jobTitle && updates.jobTitle);

                    if (changed) {
                        // Preserve manually-set dept/jobTitle if they already exist
                        if (existingData.department) delete updates.department;
                        if (existingData.jobTitle) delete updates.jobTitle;

                        await userRef.set(updates, { merge: true });
                        stats.updated++;
                    } else {
                        stats.skipped++;
                    }
                } else {
                    // Create new Firestore user doc
                    await userRef.set({
                        ...updates,
                        uid: firebaseUser.uid,
                        role: (firebaseUser.customClaims?.role as string) || 'employee',
                        isActive: !wsUser.suspended,
                        createdAt: FieldValue.serverTimestamp(),
                    });
                    stats.created++;
                }

                stats.synced++;
            } catch (userErr) {
                console.warn(`[WorkspaceSync] Failed for ${wsUser.primaryEmail}:`, userErr);
                stats.skipped++;
            }
        }

        // Audit trail
        await adminDb.collection('auditTrails').add({
            entityId: 'SYSTEM',
            entityType: 'workspace_sync',
            action: 'synced',
            actionBy: callerUid,
            actionByName: callerRecord.displayName || 'Admin',
            timestamp: FieldValue.serverTimestamp(),
            details: `Google Workspace sync: ${stats.synced} synced, ${stats.created} created, ${stats.updated} updated, ${stats.skipped} skipped.`,
        });

        return { success: true, data: stats };
    } catch (error: unknown) {
        console.error('[WorkspaceSync] Error:', error);
        const message = error instanceof Error ? error.message : 'Gagal sinkronisasi Workspace';
        return { success: false, error: message };
    }
}
