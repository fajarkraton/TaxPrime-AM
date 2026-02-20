import { type Timestamp } from 'firebase/firestore';
import type {
    AssetCategory, AssetType, AssetStatus, AssetCondition,
} from './enums';

/** Dokumen utama aset */
export interface Asset {
    id: string;
    assetCode: string;
    name: string;
    category: AssetCategory;
    type: AssetType;
    brand: string;
    model: string;
    serialNumber: string;
    vendor: string;
    notes: string;

    status: AssetStatus;
    condition: AssetCondition;

    assignedTo: string | null;
    assignedToName: string;
    assignedToDepartment: string;
    assignedAt: Timestamp | null;

    department: string;
    location: string;

    purchaseDate: Timestamp;
    purchasePrice: number;
    warrantyExpiry: Timestamp | null;

    qrCodeUrl: string;
    photoUrls: string[];
    tags: string[];

    createdAt: Timestamp;
    updatedAt: Timestamp;
    createdBy: string;
}

/** Input untuk membuat aset baru */
export interface CreateAssetInput {
    name: string;
    category: AssetCategory;
    type: AssetType;
    brand: string;
    model: string;
    serialNumber?: string;
    vendor?: string;
    notes?: string;
    status?: AssetStatus;
    condition?: AssetCondition;
    department?: string;
    location?: string;
    purchaseDate: string; // ISO date string
    purchasePrice: number;
    warrantyExpiry?: string;
    tags?: string[];
}

/** Input untuk update aset */
export interface UpdateAssetInput {
    name?: string;
    status?: AssetStatus;
    condition?: AssetCondition;
    notes?: string;
    location?: string;
    tags?: string[];
}

/** Filter untuk query aset */
export interface AssetFilters {
    status?: AssetStatus;
    category?: AssetCategory;
    type?: AssetType;
    department?: string;
    assignedTo?: string;
    vendor?: string;
    search?: string;
}
