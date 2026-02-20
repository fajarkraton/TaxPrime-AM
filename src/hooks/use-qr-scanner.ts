'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

interface UseQRScannerResult {
    isScanning: boolean;
    startScan: () => Promise<void>;
    stopScan: () => Promise<void>;
    lastResult: string | null;
    error: string | null;
}

/**
 * Hook untuk QR Code scanning via webcam
 */
export function useQRScanner(
    containerId: string,
    onScan: (result: string) => void
): UseQRScannerResult {
    const [isScanning, setIsScanning] = useState(false);
    const [lastResult, setLastResult] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const scannerRef = useRef<Html5Qrcode | null>(null);

    const startScan = useCallback(async () => {
        try {
            setError(null);
            const scanner = new Html5Qrcode(containerId);
            scannerRef.current = scanner;

            await scanner.start(
                { facingMode: 'environment' },
                { fps: 10, qrbox: { width: 250, height: 250 } },
                (decodedText) => {
                    setLastResult(decodedText);
                    onScan(decodedText);
                },
                () => { } // Ignore scan failures
            );
            setIsScanning(true);
        } catch {
            setError('Gagal mengakses kamera. Pastikan izin kamera diberikan.');
        }
    }, [containerId, onScan]);

    const stopScan = useCallback(async () => {
        if (scannerRef.current?.isScanning) {
            await scannerRef.current.stop();
            setIsScanning(false);
        }
    }, []);

    useEffect(() => {
        return () => { stopScan(); };
    }, [stopScan]);

    return { isScanning, startScan, stopScan, lastResult, error };
}
