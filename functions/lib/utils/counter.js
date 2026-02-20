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
exports.generateKodeBerikutnya = generateKodeBerikutnya;
const admin = __importStar(require("firebase-admin"));
const firestore_1 = require("firebase-admin/firestore");
const db = admin.firestore();
/**
 * Generate kode unik berikutnya menggunakan Firestore transaction
 * Contoh: generateKodeBerikutnya('asset_laptop_2026', 'TPR-LPT-2026', 3)
 *         → 'TPR-LPT-2026-001'
 */
async function generateKodeBerikutnya(counterId, prefix, paddingLength = 3) {
    const counterRef = db.collection('counters').doc(counterId);
    return db.runTransaction(async (transaction) => {
        const counterDoc = await transaction.get(counterRef);
        const currentValue = counterDoc.exists ? counterDoc.data().currentValue : 0;
        const nextValue = currentValue + 1;
        transaction.set(counterRef, {
            currentValue: nextValue,
            prefix,
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
        });
        return `${prefix}-${String(nextValue).padStart(paddingLength, '0')}`;
    });
}
//# sourceMappingURL=counter.js.map