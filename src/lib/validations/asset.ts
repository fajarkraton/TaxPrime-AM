import { z } from 'zod';
import { AssetCategory, AssetStatus, AssetType } from '@/types';

export const hardwareSpecSchema = z.object({
    // CPU
    cpuBrand: z.string().optional(),
    cpuModel: z.string().optional(),
    cpuGeneration: z.string().optional(),
    cpuCores: z.coerce.number().optional(),
    cpuThreads: z.coerce.number().optional(),
    cpuClockSpeed: z.string().optional(),

    // GPU
    gpuBrand: z.string().optional(),
    gpuModel: z.string().optional(),
    gpuVram: z.string().optional(),
    gpuType: z.enum(['integrated', 'discrete']).optional(),

    // RAM
    ramTotal: z.coerce.number().optional(),
    ramType: z.string().optional(),
    ramSpeed: z.string().optional(),
    ramSlots: z.coerce.number().optional(),

    // Storage
    storagePrimaryType: z.enum(['SSD', 'HDD', 'NVMe']).optional(),
    storagePrimaryCapacity: z.string().optional(),
    storagePrimaryModel: z.string().optional(),
    storageSecondaryType: z.enum(['SSD', 'HDD', 'NVMe']).optional(),
    storageSecondaryCapacity: z.string().optional(),

    // Display
    displaySize: z.coerce.number().optional(),
    displayResolution: z.string().optional(),
    displayPanel: z.string().optional(),
    displayRefreshRate: z.coerce.number().optional(),

    // OS
    osName: z.string().optional(),
    osVersion: z.string().optional(),
    osLicenseType: z.string().optional(),

    // Network
    wifi: z.string().optional(),
    bluetooth: z.string().optional(),
    ethernet: z.string().optional(),
    macAddress: z.string().optional(),

    // Battery
    batteryCapacity: z.coerce.number().optional(),
    batteryHealth: z.string().optional(),
    batteryCycleCount: z.coerce.number().optional(),

    // Misc
    benchmarkScore: z.coerce.number().optional(),
    biosVersion: z.string().optional(),
    hostname: z.string().optional(),
    antivirus: z.string().optional(),
    encryptionStatus: z.string().optional(),
});

export const assetFormSchema = z.object({
    name: z.string().min(3, 'Nama aset minimal 3 karakter').max(100),
    category: z.nativeEnum(AssetCategory),
    type: z.nativeEnum(AssetType),
    brand: z.string().min(1, 'Merk harus diisi'),
    model: z.string().min(1, 'Model harus diisi'),
    serialNumber: z.string().min(1, 'Serial Number / License Key harus diisi'),
    status: z.nativeEnum(AssetStatus),
    condition: z.enum(['excellent', 'good', 'fair', 'poor']),
    department: z.string().min(1, 'Pilih departemen'),
    location: z.string().min(1, 'Lokasi aset harus diisi'),
    purchaseDate: z.string().min(1, 'Tanggal pembelian harus diisi'),
    purchasePrice: z.coerce.number().min(0, 'Harga tidak bisa negatif'),
    vendor: z.string().min(1, 'Vendor harus diisi'),
    notes: z.string().optional(),

    // Conditionally required hardware specs for computers/laptops
    hardwareSpecs: hardwareSpecSchema.optional(),
});

export type AssetFormValues = z.infer<typeof assetFormSchema>;
export type HardwareSpecValues = z.infer<typeof hardwareSpecSchema>;
