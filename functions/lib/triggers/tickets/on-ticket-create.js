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
exports.onTicketCreate = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const admin = __importStar(require("firebase-admin"));
// Asumsi Business Rules SLA:
// Critical : 1 Jam Response / 4 Jam Resolution
// High     : 2 Jam Response / 12 Jam Resolution
// Medium   : 1 Hari Response / 3 Hari Resolution
// Low      : 2 Hari Response / 7 Hari Resolution
function addHours(date, hours) {
    return new Date(date.getTime() + hours * 60 * 60 * 1000);
}
function addDays(date, days) {
    return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}
exports.onTicketCreate = (0, firestore_1.onDocumentCreated)({ document: 'tickets/{ticketId}', region: 'asia-southeast2' }, async (event) => {
    const snap = event.data;
    if (!snap)
        return;
    const ticketData = snap.data();
    if (!ticketData)
        return null;
    const priority = ticketData.priority;
    const now = new Date();
    let responseTarget;
    let resolutionTarget;
    switch (priority) {
        case 'critical':
            responseTarget = addHours(now, 1);
            resolutionTarget = addHours(now, 4);
            break;
        case 'high':
            responseTarget = addHours(now, 2);
            resolutionTarget = addHours(now, 12);
            break;
        case 'medium':
            responseTarget = addDays(now, 1);
            resolutionTarget = addDays(now, 3);
            break;
        case 'low':
            responseTarget = addDays(now, 2);
            resolutionTarget = addDays(now, 7);
            break;
        default:
            responseTarget = addDays(now, 1);
            resolutionTarget = addDays(now, 3);
            break;
    }
    try {
        await snap.ref.update({
            slaResponseTarget: admin.firestore.Timestamp.fromDate(responseTarget),
            slaResolutionTarget: admin.firestore.Timestamp.fromDate(resolutionTarget),
            // Queue email notification
            "queue.emailSent": false
        });
        console.log(`[Ticket ${event.params.ticketId}] SLA calculated successfully. Response: ${responseTarget.toISOString()}, Resolution: ${resolutionTarget.toISOString()}`);
        // Menulis ke koleksi 'mail' agar ditangkap oleh Firebase Extension: Trigger Email
        await admin.firestore().collection('mail').add({
            to: ['it-support@taxprime.net'],
            message: {
                subject: `[TIKET BARU] ${ticketData.priority.toUpperCase()} - ${ticketData.ticketNumber}`,
                html: `
                        <h2>Tiket Bantuan Baru Masuk</h2>
                        <p><strong>No Tiket:</strong> ${ticketData.ticketNumber}</p>
                        <p><strong>Pelapor:</strong> ${ticketData.requesterName}</p>
                        <p><strong>Prioritas:</strong> ${ticketData.priority}</p>
                        <p><strong>Judul:</strong> ${ticketData.title}</p>
                        <hr />
                        <p>Buka dashboard ITAMS untuk melihat rincian tiket.</p>
                    `
            },
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
    }
    catch (error) {
        console.error(`[Ticket ${event.params.ticketId}] SLA update failed:`, error);
    }
    return;
});
//# sourceMappingURL=on-ticket-create.js.map