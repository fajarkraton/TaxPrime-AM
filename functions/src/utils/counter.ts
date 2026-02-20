import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

const db = admin.firestore();

/**
 * Generate kode unik berikutnya menggunakan Firestore transaction
 * Contoh: generateKodeBerikutnya('asset_laptop_2026', 'TPR-LPT-2026', 3)
 *         → 'TPR-LPT-2026-001'
 */
export async function generateKodeBerikutnya(
    counterId: string,
    prefix: string,
    paddingLength: number = 3
): Promise<string> {
    const counterRef = db.collection('counters').doc(counterId);

    return db.runTransaction(async (transaction) => {
        const counterDoc = await transaction.get(counterRef);
        const currentValue = counterDoc.exists ? counterDoc.data()!.currentValue : 0;
        const nextValue = currentValue + 1;

        transaction.set(counterRef, {
            currentValue: nextValue,
            prefix,
            updatedAt: FieldValue.serverTimestamp(),
        });

        return `${prefix}-${String(nextValue).padStart(paddingLength, '0')}`;
    });
}
