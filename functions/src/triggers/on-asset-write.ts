import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { tulisAuditTrail } from '../utils/audit';

export const onAssetWrite = onDocumentWritten('assets/{assetId}', async (event) => {
    const snapshot = event.data;
    if (!snapshot) return;

    const before = snapshot.before.data();
    const after = snapshot.after.data();

    if (!before && after) {
        // Created
        await tulisAuditTrail({
            collectionPath: `assets/${event.params.assetId}`,
            action: 'created',
            description: 'Asset registered in system',
            newValue: after,
            performedBy: 'system',
            performedByName: 'System',
        });
    } else if (before && after) {
        // Updated
        await tulisAuditTrail({
            collectionPath: `assets/${event.params.assetId}`,
            action: 'updated',
            description: 'Asset data updated',
            previousValue: before,
            newValue: after,
            performedBy: 'system',
            performedByName: 'System',
        });
    }
});
