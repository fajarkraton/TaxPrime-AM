import { type Timestamp } from 'firebase/firestore';
import type { UserRole } from './enums';

export interface User {
    uid: string;
    email: string;
    displayName: string;
    department: string;
    jobTitle: string;
    role: UserRole;
    photoUrl: string;
    isActive: boolean;
    assignedAssets: string[];
    assignedAssetsCount: number;
    lastLoginAt: Timestamp;
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

export interface SetRoleInput {
    userId: string;
    role: UserRole;
}
