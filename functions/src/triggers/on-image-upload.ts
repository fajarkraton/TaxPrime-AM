import * as functions from 'firebase-functions/v2';
import * as admin from 'firebase-admin';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import sharp from 'sharp';

export const optimizeAssetImage = functions.storage.onObjectFinalized(async (event) => {
    const fileBucket = event.data.bucket;
    const filePath = event.data.name;
    const contentType = event.data.contentType;

    // Exit if not an image or if it's already a thumbnail to prevent infinite loops
    if (!contentType?.startsWith('image/') || filePath.includes('_thumb')) {
        return;
    }

    const fileName = path.basename(filePath);
    const bucket = admin.storage().bucket(fileBucket);
    const tempFilePath = path.join(os.tmpdir(), fileName);
    const thumbFileName = `${path.parse(fileName).name}_thumb.jpg`;
    const tempThumbPath = path.join(os.tmpdir(), thumbFileName);
    const thumbFilePath = path.join(path.dirname(filePath), thumbFileName);

    try {
        // Automatically download the original file to a temp directory
        await bucket.file(filePath).download({ destination: tempFilePath });

        // Resize and optimize image using Sharp to 1080x1080 JPEG
        await sharp(tempFilePath)
            .resize(1080, 1080, { fit: 'inside', withoutEnlargement: true })
            .jpeg({ quality: 80 })
            .toFile(tempThumbPath);

        // Upload the resized thumbnail
        await bucket.upload(tempThumbPath, {
            destination: thumbFilePath,
            metadata: { contentType: 'image/jpeg' },
        });

        // Optionally, delete the original oversized file to save space
        // await bucket.file(filePath).delete();

        // Clean up temporary files
        fs.unlinkSync(tempFilePath);
        fs.unlinkSync(tempThumbPath);

        console.log(`Successfully generated thumbnail: ${thumbFilePath}`);
    } catch (error) {
        console.error('Image optimization failed:', error);
    }
});
