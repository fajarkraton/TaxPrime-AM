import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions/v1';
import { UserRecord } from 'firebase-admin/auth';

export const onUserCreate = functions.auth.user().onCreate(async (user: UserRecord) => {
    const email = user.email || '';

    // S1-AUTH-2: Domain restriction
    if (!email.endsWith('@taxprime.net')) {
        console.error(`Unauthorized domain for user: ${email}`);
        // Optional: Delete user if domain is not allowed
        // await admin.auth().deleteUser(user.uid);
        return;
    }

    // S1-AUTH-4: Auto-set default role "employee"
    const defaultRole = 'employee';

    try {
        // S1-AUTH-3: Custom Claims RBAC
        await admin.auth().setCustomUserClaims(user.uid, {
            role: defaultRole,
            department: 'Unassigned',
        });

        // Populate user to Firestore users collection
        await admin.firestore().collection('users').doc(user.uid).set({
            uid: user.uid,
            email: user.email,
            displayName: user.displayName || '',
            photoUrl: user.photoURL || '',
            role: defaultRole,
            department: 'Unassigned',
            jobTitle: '',
            isActive: true,
            assignedAssets: [],
            assignedAssetsCount: 0,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            lastLoginAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        console.log(`Custom claims set for user ${user.uid} with default role: ${defaultRole}`);
    } catch (error) {
        console.error(`Failed to set default role for user ${user.uid}`, error);
    }
});
