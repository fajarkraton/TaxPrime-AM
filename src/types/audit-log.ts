import { type Timestamp } from 'firebase/firestore';
import type { AuditAction } from './enums';

export interface AuditLog {
    id: string;
    action: AuditAction;
    description: string;
    previousValue: Record<string, unknown> | null;
    newValue: Record<string, unknown> | null;
    performedBy: string;
    performedByName: string;
    performedAt: Timestamp;
}
