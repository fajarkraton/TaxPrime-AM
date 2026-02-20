import { Timestamp } from 'firebase-admin/firestore';

interface SlaTargets {
    responseMinutes: number;
    resolutionMinutes: number;
}

const SLA_CONFIG: Record<string, SlaTargets> = {
    critical: { responseMinutes: 30, resolutionMinutes: 240 },
    high: { responseMinutes: 60, resolutionMinutes: 480 },
    medium: { responseMinutes: 240, resolutionMinutes: 1440 },
    low: { responseMinutes: 480, resolutionMinutes: 4320 },
};

/**
 * Hitung SLA target timestamps berdasarkan priority
 */
export function hitungSlaTargets(priority: string, createdAt: Timestamp): {
    slaResponseTarget: Timestamp;
    slaResolutionTarget: Timestamp;
} {
    const config = SLA_CONFIG[priority] || SLA_CONFIG.medium;
    const createdMs = createdAt.toMillis();

    return {
        slaResponseTarget: Timestamp.fromMillis(createdMs + config.responseMinutes * 60 * 1000),
        slaResolutionTarget: Timestamp.fromMillis(createdMs + config.resolutionMinutes * 60 * 1000),
    };
}
