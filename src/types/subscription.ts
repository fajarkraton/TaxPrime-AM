import { type Timestamp } from 'firebase/firestore';
import type { LicenseType, BillingCycle, SubscriptionStatus } from './enums';

export interface Subscription {
    id: string;
    assetRef: string | null;
    name: string;
    provider: string;
    licenseType: LicenseType;
    totalLicenses: number;
    usedLicenses: number;
    costPerPeriod: number;
    billingCycle: BillingCycle;
    currency: string;
    startDate: Timestamp;
    expiryDate: Timestamp;
    autoRenew: boolean;
    status: SubscriptionStatus;
    reminderSentH30: boolean;
    reminderSentH14: boolean;
    reminderSentH7: boolean;
    reminderSentH1: boolean;
    assignedUsers: string[];
    vendorContact: string;
    vendorEmail: string;
    vendorPhone: string;
    notes: string;
    createdAt: Timestamp;
    updatedAt: Timestamp;
    createdBy: string;
}

export interface CreateSubscriptionInput {
    name: string;
    provider: string;
    licenseType: LicenseType;
    totalLicenses: number;
    costPerPeriod: number;
    billingCycle: BillingCycle;
    currency?: string;
    startDate: string;
    expiryDate: string;
    autoRenew?: boolean;
    assetRef?: string;
    vendorContact?: string;
    vendorEmail?: string;
    vendorPhone?: string;
    notes?: string;
}

export interface LicenseAllocation {
    id: string;
    userId: string;
    userName: string;
    department: string;
    assignedAt: Timestamp;
    assignedBy: string;
}
