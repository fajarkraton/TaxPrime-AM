import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from './config';

export interface UploadResult {
    url: string;
    path: string;
}

export async function uploadFileToStorage(
    file: File,
    path: string,
    onProgress?: (progress: number) => void
): Promise<UploadResult> {
    return new Promise((resolve, reject) => {
        const storageRef = ref(storage, path);
        const uploadTask = uploadBytesResumable(storageRef, file);

        uploadTask.on(
            'state_changed',
            (snapshot) => {
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                if (onProgress) onProgress(progress);
            },
            (error) => {
                reject(error);
            },
            async () => {
                try {
                    const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                    resolve({
                        url: downloadURL,
                        path: uploadTask.snapshot.ref.fullPath,
                    });
                } catch (error) {
                    reject(error);
                }
            }
        );
    });
}
