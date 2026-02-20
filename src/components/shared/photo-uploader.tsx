'use client';

import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { X, UploadCloud, Image as ImageIcon } from 'lucide-react';
import { uploadFileToStorage } from '@/lib/firebase/storage';
import { Progress } from '../ui/progress';
import { Button } from '../ui/button';

export interface PhotoUploaderProps {
    onUploadSuccess: (urls: string[]) => void;
    maxFiles?: number;
    assetId: string;
}

interface UploadingFile {
    file: File;
    progress: number;
    url?: string;
    error?: string;
}

export function PhotoUploader({ onUploadSuccess, maxFiles = 5, assetId }: PhotoUploaderProps) {
    const [files, setFiles] = useState<UploadingFile[]>([]);
    const [isUploading, setIsUploading] = useState(false);

    const onDrop = useCallback((acceptedFiles: File[]) => {
        const newFiles = acceptedFiles.map((file) => ({ file, progress: 0 }));
        setFiles((prev) => {
            const combined = [...prev, ...newFiles];
            return combined.slice(0, maxFiles);
        });
    }, [maxFiles]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'image/*': ['.jpeg', '.jpg', '.png', '.webp'] },
        maxFiles,
        disabled: isUploading || files.length >= maxFiles,
    });

    const removeFile = (index: number) => {
        setFiles((prev) => prev.filter((_, i) => i !== index));
    };

    const handleUpload = async () => {
        if (files.length === 0) return;
        setIsUploading(true);

        const uploadedUrls: string[] = [];
        const updatedFiles = [...files];

        // Array of promises for concurrent uploads
        const uploadPromises = updatedFiles.map(async (f, i) => {
            if (f.url) {
                uploadedUrls.push(f.url);
                return;
            }

            try {
                const fileName = `${Date.now()}_${f.file.name.replace(/[^a-zA-Z0-9.\-_]/g, '')}`;
                const path = `assets/photos/${assetId}/${fileName}`;

                const result = await uploadFileToStorage(f.file, path, (progress) => {
                    setFiles((prev) => {
                        const newArr = [...prev];
                        if (newArr[i]) {
                            newArr[i].progress = progress;
                        }
                        return newArr;
                    });
                });

                updatedFiles[i].url = result.url;
                updatedFiles[i].progress = 100;
                uploadedUrls.push(result.url);
            } catch (error) {
                console.error('Upload failed:', error);
                updatedFiles[i].error = 'Gagal memuat naik';
            }
        });

        await Promise.all(uploadPromises);

        setFiles(updatedFiles);
        setIsUploading(false);
        onUploadSuccess(uploadedUrls);
    };

    return (
        <div className="space-y-4">
            <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors
          ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-slate-300 hover:border-blue-400 bg-slate-50'}
          ${(isUploading || files.length >= maxFiles) && 'opacity-50 cursor-not-allowed'}`}
            >
                <input {...getInputProps()} />
                <UploadCloud className="mx-auto h-10 w-10 text-slate-400 mb-4" />
                <p className="text-sm text-slate-600 font-medium">
                    {isDragActive ? 'Lepaskan gambar di sini' : 'Drag & drop foto aset, atau klik untuk milih'}
                </p>
                <p className="text-xs text-slate-400 mt-2">
                    Maks. {maxFiles} file. Mendukung JPG, PNG, WEBP.
                </p>
            </div>

            {files.length > 0 && (
                <div className="space-y-3">
                    {files.map((f, i) => (
                        <div key={i} className="flex items-center gap-4 bg-white border border-slate-200 p-3 rounded-lg shadow-sm">
                            <div className="h-10 w-10 bg-slate-100 rounded flex items-center justify-center shrink-0">
                                {f.url ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={f.url} alt="preview" className="h-full w-full object-cover rounded" />
                                ) : (
                                    <ImageIcon className="h-5 w-5 text-slate-500" />
                                )}
                            </div>

                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-slate-700 truncate">{f.file.name}</p>
                                {f.error ? (
                                    <p className="text-xs text-red-500">{f.error}</p>
                                ) : (
                                    <Progress value={f.progress} className="h-1.5 mt-2" />
                                )}
                            </div>

                            {!isUploading && !f.url && (
                                <button
                                    type="button"
                                    onClick={() => removeFile(i)}
                                    className="p-1.5 text-slate-400 hover:bg-slate-100 hover:text-red-500 rounded-md transition-colors"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            )}
                        </div>
                    ))}

                    <div className="flex justify-end pt-2">
                        <Button
                            type="button"
                            onClick={handleUpload}
                            disabled={isUploading || files.every(f => !!f.url)}
                        >
                            {isUploading ? 'Mengunggah...' : 'Unggah Semua Foto'}
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
