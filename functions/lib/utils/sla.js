"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hitungSlaTargets = hitungSlaTargets;
const firestore_1 = require("firebase-admin/firestore");
const SLA_CONFIG = {
    critical: { responseMinutes: 30, resolutionMinutes: 240 },
    high: { responseMinutes: 60, resolutionMinutes: 480 },
    medium: { responseMinutes: 240, resolutionMinutes: 1440 },
    low: { responseMinutes: 480, resolutionMinutes: 4320 },
};
/**
 * Hitung SLA target timestamps berdasarkan priority
 */
function hitungSlaTargets(priority, createdAt) {
    const config = SLA_CONFIG[priority] || SLA_CONFIG.medium;
    const createdMs = createdAt.toMillis();
    return {
        slaResponseTarget: firestore_1.Timestamp.fromMillis(createdMs + config.responseMinutes * 60 * 1000),
        slaResolutionTarget: firestore_1.Timestamp.fromMillis(createdMs + config.resolutionMinutes * 60 * 1000),
    };
}
//# sourceMappingURL=sla.js.map