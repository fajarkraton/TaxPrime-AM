"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.onAssetAssignment = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const admin = __importStar(require("firebase-admin"));
exports.onAssetAssignment = (0, firestore_1.onDocumentUpdated)('assets/{assetId}', async (event) => {
    const snapshot = event.data;
    if (!snapshot)
        return;
    const before = snapshot.before.data();
    const after = snapshot.after.data();
    // Periksa apakah ada perubahan pada currentUserId (Aset dipinjamkan/dialokasikan)
    if (before.currentUserId !== after.currentUserId && after.currentUserId) {
        try {
            // Dapatkan informasi pengguna untuk mendapatkan email
            const userRecord = await admin.auth().getUser(after.currentUserId);
            if (userRecord.email) {
                // Tulis ke koleksi 'mail' untuk Firebase Extension: Trigger Email
                await admin.firestore().collection('mail').add({
                    to: [userRecord.email],
                    message: {
                        subject: `[ITAMS] Perangkat Baru Dialokasikan: ${after.name}`,
                        html: `
                            <h2>Alokasi Perangkat Baru</h2>
                            <p>Halo ${userRecord.displayName || 'Pengguna'},</p>
                            <p>Tim IT telah mengalokasikan perangkat berikut kepada Anda:</p>
                            <ul>
                                <li><strong>Nama Aset:</strong> ${after.name}</li>
                                <li><strong>Kode Aset:</strong> ${after.kodeAset || '-'}</li>
                                <li><strong>Kategori:</strong> ${after.category}</li>
                            </ul>
                            <p>Silakan periksa perangkat keras yang Anda terima. Jika ada kendala, hubungi Tim IT melalui portal ITAMS.</p>
                            <hr />
                            <p><small>Pesan ini dihasilkan secara otomatis oleh Sistem ITAMS.</small></p>
                        `
                    },
                    createdAt: admin.firestore.FieldValue.serverTimestamp()
                });
                console.log(`Email alokasi dikirim ke ${userRecord.email} untuk aset ${after.kodeAset}`);
            }
        }
        catch (error) {
            console.error('Gagal memproses email alokasi aset:', error);
        }
    }
});
//# sourceMappingURL=on-asset-assignment.js.map