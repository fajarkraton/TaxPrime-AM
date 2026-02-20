import { getDriveClient } from './auth';
import { Readable } from 'stream';

const ITAMS_ROOT_FOLDER = process.env.GOOGLE_DRIVE_FOLDER_ID || '';

/**
 * Upload a file to Google Drive folder for an asset.
 * Folder structure: TaxPrime Assets > {Year} > {AssetCode}
 * Falls back gracefully if credentials are not configured.
 */
export async function uploadToDrive(data: {
    fileName: string;
    mimeType: string;
    fileBuffer: Buffer;
    assetCode: string;
    year?: string;
}): Promise<{ success: boolean; fileId?: string; webViewLink?: string; error?: string }> {
    try {
        if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_SERVICE_ACCOUNT_KEY || !ITAMS_ROOT_FOLDER) {
            console.log(`[Drive] Skipped (no credentials/folder): "${data.fileName}"`);
            return { success: true };
        }

        const drive = getDriveClient();
        const year = data.year || new Date().getFullYear().toString();

        // Find or create year folder
        const yearFolderId = await findOrCreateFolder(drive, year, ITAMS_ROOT_FOLDER);

        // Find or create asset folder
        const assetFolderId = await findOrCreateFolder(drive, data.assetCode, yearFolderId);

        // Upload file
        const stream = new Readable();
        stream.push(data.fileBuffer);
        stream.push(null);

        const file = await drive.files.create({
            requestBody: {
                name: data.fileName,
                parents: [assetFolderId],
            },
            media: {
                mimeType: data.mimeType,
                body: stream,
            },
            fields: 'id, webViewLink',
        });

        console.log(`[Drive] Uploaded: "${data.fileName}" → ${file.data.id}`);
        return {
            success: true,
            fileId: file.data.id || undefined,
            webViewLink: file.data.webViewLink || undefined,
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error(`[Drive] Failed: "${data.fileName}":`, message);
        return { success: false, error: message };
    }
}

/**
 * List files in an asset's Drive folder
 */
export async function listAssetFiles(assetCode: string): Promise<{
    success: boolean;
    files?: { id: string; name: string; mimeType: string; webViewLink: string; size: string; createdTime: string }[];
    error?: string;
}> {
    try {
        if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_SERVICE_ACCOUNT_KEY || !ITAMS_ROOT_FOLDER) {
            return { success: true, files: [] };
        }

        const drive = getDriveClient();
        const year = new Date().getFullYear().toString();

        // Find year folder
        const yearFolderId = await findFolderId(drive, year, ITAMS_ROOT_FOLDER);
        if (!yearFolderId) return { success: true, files: [] };

        // Find asset folder
        const assetFolderId = await findFolderId(drive, assetCode, yearFolderId);
        if (!assetFolderId) return { success: true, files: [] };

        const response = await drive.files.list({
            q: `'${assetFolderId}' in parents and trashed = false`,
            fields: 'files(id, name, mimeType, webViewLink, size, createdTime)',
            orderBy: 'createdTime desc',
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const files = (response.data.files || []).map((f: any) => ({
            id: f.id || '',
            name: f.name || '',
            mimeType: f.mimeType || '',
            webViewLink: f.webViewLink || '',
            size: f.size || '0',
            createdTime: f.createdTime || '',
        }));

        return { success: true, files };
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return { success: false, error: message };
    }
}

// ─── Helper functions ───

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function findFolderId(drive: any, name: string, parentId: string): Promise<string | null> {
    const response = await drive.files.list({
        q: `name='${name}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
        fields: 'files(id)',
    });
    return response.data.files?.[0]?.id || null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function findOrCreateFolder(drive: any, name: string, parentId: string): Promise<string> {
    const existing = await findFolderId(drive, name, parentId);
    if (existing) return existing;

    const folder = await drive.files.create({
        requestBody: {
            name,
            mimeType: 'application/vnd.google-apps.folder',
            parents: [parentId],
        },
        fields: 'id',
    });
    return folder.data.id!;
}
