"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onAssetWrite = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const audit_1 = require("../utils/audit");
exports.onAssetWrite = (0, firestore_1.onDocumentWritten)('assets/{assetId}', async (event) => {
    const snapshot = event.data;
    if (!snapshot)
        return;
    const before = snapshot.before.data();
    const after = snapshot.after.data();
    if (!before && after) {
        // Created
        await (0, audit_1.tulisAuditTrail)({
            collectionPath: `assets/${event.params.assetId}`,
            action: 'created',
            description: 'Asset registered in system',
            newValue: after,
            performedBy: 'system',
            performedByName: 'System',
        });
    }
    else if (before && after) {
        // Updated
        await (0, audit_1.tulisAuditTrail)({
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
//# sourceMappingURL=on-asset-write.js.map