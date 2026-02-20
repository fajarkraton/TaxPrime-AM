"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncAssetToAlgolia = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
// Note: Requires Algolia environment variables configured in Firebase
// ALGOLIA_APP_ID, ALGOLIA_API_KEY
// import algoliasearch from 'algoliasearch';
// const client = algoliasearch(
//   process.env.ALGOLIA_APP_ID || '',
//   process.env.ALGOLIA_API_KEY || ''
// );
// const index = client.initIndex('assets');
exports.syncAssetToAlgolia = (0, firestore_1.onDocumentWritten)('assets/{assetId}', async (event) => {
    const snapshot = event.data;
    if (!snapshot) {
        console.log('No data associated with the event');
        return;
    }
    // Determine if document was deleted
    if (!snapshot.after.exists) {
        // const objectID = snapshot.before.id;
        // await index.deleteObject(objectID);
        console.info(`[Search Index] DELETED Asset ID: ${snapshot.before.id}`);
        return;
    }
    const data = snapshot.after.data() || {};
    const objectID = snapshot.after.id;
    // Filter fields to index (never index large text blocks/history unless needed)
    const record = {
        objectID,
        assetCode: data.assetCode,
        name: data.name,
        category: data.category,
        brand: data.brand,
        model: data.model,
        serialNumber: data.serialNumber,
        status: data.status,
        department: data.department,
        assignedToName: data.assignedToName,
        location: data.location,
        purchaseDate: data.purchaseDate,
        _tags: [data.category, data.status, data.department] // Useful for rapid faceting
    };
    try {
        // await index.saveObject(record);
        console.info(`[Search Index] UPSERT Asset ID: ${objectID}`, record);
    }
    catch (error) {
        console.error(`[Search Index] Failed to sync Asset ${objectID}`, error);
    }
});
//# sourceMappingURL=on-asset-index.js.map