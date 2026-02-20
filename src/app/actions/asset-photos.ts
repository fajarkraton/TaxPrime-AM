'use server';

import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * Update the photoUrls array on an asset document after upload.
 * Appends new URLs to existing array.
 */
export async function updateAssetPhotos(
    assetId: string,
    newPhotoUrls: string[],
    actionBy: string,
    actionByName: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const assetRef = adminDb.collection('assets').doc(assetId);
        const assetSnap = await assetRef.get();

        if (!assetSnap.exists) {
            return { success: false, error: 'Aset tidak ditemukan.' };
        }

        // Append new URLs to existing array
        await assetRef.update({
            photoUrls: FieldValue.arrayUnion(...newPhotoUrls),
            updatedAt: FieldValue.serverTimestamp(),
        });

        // Audit trail
        await adminDb.collection('auditTrails').add({
            entityId: assetId,
            entityType: 'asset',
            action: 'updated',
            actionBy,
            actionByName,
            timestamp: FieldValue.serverTimestamp(),
            details: `Mengunggah ${newPhotoUrls.length} foto baru untuk aset.`,
        });

        return { success: true };
    } catch (error: unknown) {
        console.error('Update Asset Photos Error:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Gagal memperbarui foto.' };
    }
}

/**
 * Remove a photo URL from an asset document.
 */
export async function removeAssetPhoto(
    assetId: string,
    photoUrl: string,
    actionBy: string,
    actionByName: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const assetRef = adminDb.collection('assets').doc(assetId);

        await assetRef.update({
            photoUrls: FieldValue.arrayRemove(photoUrl),
            updatedAt: FieldValue.serverTimestamp(),
        });

        // Audit trail
        await adminDb.collection('auditTrails').add({
            entityId: assetId,
            entityType: 'asset',
            action: 'updated',
            actionBy,
            actionByName,
            timestamp: FieldValue.serverTimestamp(),
            details: 'Menghapus foto aset.',
        });

        return { success: true };
    } catch (error: unknown) {
        console.error('Remove Asset Photo Error:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Gagal menghapus foto.' };
    }
}
