import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

const db = admin.firestore();

export async function tulisAuditTrail(params: {
    collectionPath: string;    // 'assets/{assetId}'
    action: string;
    description: string;
    previousValue?: Record<string, unknown>;
    newValue?: Record<string, unknown>;
    performedBy: string;
    performedByName: string;
}): Promise<void> {
    const historyRef = db
        .doc(params.collectionPath)
        .collection('history')
        .doc();

    await historyRef.set({
        action: params.action,
        description: params.description,
        previousValue: params.previousValue || null,
        newValue: params.newValue || null,
        performedBy: params.performedBy,
        performedByName: params.performedByName,
        performedAt: FieldValue.serverTimestamp(),
    });
}
