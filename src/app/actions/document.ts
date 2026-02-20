'use server';

import {  adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * Create a handover/return document for an asset
 */
export async function createHandoverDocument(
    assetId: string,
    recipientUid: string,
    type: 'handover' | 'return',
    creatorUid: string,
    creatorName: string,
    notes?: string
): Promise<{ success: boolean; docId?: string; error?: string }> {
    try {
        // Get asset info
        const assetSnap = await adminDb.collection('assets').doc(assetId).get();
        if (!assetSnap.exists) throw new Error('Asset not found');
        const asset = assetSnap.data()!;

        // Get recipient info
        const userSnap = await adminDb.collection('users').doc(recipientUid).get();
        const user = userSnap.data() || {};

        // Generate document number: BAST-2026-0001 or BARP-2026-0001
        const prefix = type === 'handover' ? 'BAST' : 'BARP';
        const year = new Date().getFullYear();
        const countSnap = await adminDb
            .collection('documents')
            .where('type', '==', type)
            .orderBy('createdAt', 'desc')
            .limit(1)
            .get();

        let seq = 1;
        if (!countSnap.empty) {
            const lastNum = countSnap.docs[0].data().documentNumber || '';
            const match = lastNum.match(/(\d{4})$/);
            if (match) seq = parseInt(match[1], 10) + 1;
        }
        const documentNumber = `${prefix}-${year}-${String(seq).padStart(4, '0')}`;

        const docRef = adminDb.collection('documents').doc();
        await docRef.set({
            documentNumber,
            type,
            assetId,
            assetCode: asset.assetCode || '',
            assetName: asset.name || '',
            assetBrand: asset.brand || '',
            assetModel: asset.model || '',
            assetSerialNumber: asset.serialNumber || '',
            assetCondition: asset.condition || '',
            recipientUid,
            recipientName: user.displayName || '',
            recipientEmail: user.email || '',
            recipientDepartment: user.department || '',
            recipientJobTitle: user.jobTitle || '',
            createdBy: creatorUid,
            createdByName: creatorName,
            notes: notes || '',
            status: 'pending',
            signedAt: null,
            signatureData: null,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
        });

        return { success: true, docId: docRef.id };
    } catch (error) {
        console.error('[createHandoverDocument] Error:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Failed to create document' };
    }
}

/**
 * Sign a document
 */
export async function signDocument(
    docId: string,
    signatureData: string,
    signerUid: string,
    signerName: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const docRef = adminDb.collection('documents').doc(docId);
        const docSnap = await docRef.get();

        if (!docSnap.exists) throw new Error('Document not found');
        const docData = docSnap.data()!;

        if (docData.recipientUid !== signerUid) {
            throw new Error('Unauthorized — only the recipient can sign this document');
        }

        if (docData.status === 'signed') {
            throw new Error('Document already signed');
        }

        await docRef.update({
            status: 'signed',
            signedAt: FieldValue.serverTimestamp(),
            signatureData,
            updatedAt: FieldValue.serverTimestamp(),
        });

        // Audit trail
        const auditRef = adminDb.collection('auditTrails').doc();
        await auditRef.set({
            entityId: docId,
            entityType: 'document',
            action: 'signed',
            actionBy: signerUid,
            actionByName: signerName,
            timestamp: FieldValue.serverTimestamp(),
            details: `Dokumen ${docData.documentNumber} ditandatangani oleh ${signerName}`,
        });

        return { success: true };
    } catch (error) {
        console.error('[signDocument] Error:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Failed to sign document' };
    }
}
