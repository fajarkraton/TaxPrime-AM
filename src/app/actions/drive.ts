'use server';

import { uploadToDrive, listAssetFiles } from '@/lib/google/drive';

/**
 * List files associated with an asset from Google Drive
 */
export async function getAssetDriveFiles(assetCode: string) {
    try {
        const result = await listAssetFiles(assetCode);
        return result;
    } catch (error) {
        console.error('[Drive Action] listAssetFiles error:', error);
        return { success: false, error: 'Gagal memuat file dari Google Drive.', files: [] };
    }
}

/**
 * Upload a file to Google Drive for an asset
 */
export async function uploadAssetFileToDrive(
    formData: FormData,
    assetCode: string,
) {
    try {
        const file = formData.get('file') as File;
        if (!file) {
            return { success: false, error: 'File tidak ditemukan.' };
        }

        // Max 25MB
        if (file.size > 25 * 1024 * 1024) {
            return { success: false, error: 'Ukuran file maksimal 25MB.' };
        }

        const buffer = Buffer.from(await file.arrayBuffer());

        const result = await uploadToDrive({
            fileName: file.name,
            mimeType: file.type || 'application/octet-stream',
            fileBuffer: buffer,
            assetCode,
        });

        return result;
    } catch (error) {
        console.error('[Drive Action] uploadToDrive error:', error);
        return { success: false, error: 'Gagal mengunggah file ke Google Drive.' };
    }
}
