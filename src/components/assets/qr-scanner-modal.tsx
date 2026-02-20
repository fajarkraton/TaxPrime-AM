'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScanLine, Loader2 } from 'lucide-react';
import { Scanner } from '@yudiel/react-qr-scanner';
import { useToast } from '@/hooks/use-toast';

export function QRScannerModal() {
    const [isOpen, setIsOpen] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const router = useRouter();
    const { toast } = useToast();

    // Typical TaxPrime AM QR Code output will be: https://itams.taxprime.net/assets/TPR-LPT-2026-003 or just the raw ID string
    const handleScan = (detectedCodes: { rawValue: string }[]) => {
        if (!detectedCodes || detectedCodes.length === 0) return;

        const rawValue = detectedCodes[0].rawValue;
        if (!rawValue) return;

        setIsProcessing(true);

        try {
            console.log('Detected QR:', rawValue);

            // Coba parsing apabila formatnya URL penuh (contoh: https://domain.com/assets/123)
            let parsedId = rawValue;
            if (rawValue.includes('http')) {
                const url = new URL(rawValue);
                const pathParts = url.pathname.split('/');

                // Jika URL mengarah ke /assets/[id]
                if (pathParts.includes('assets') && pathParts.length > 2) {
                    parsedId = pathParts[pathParts.length - 1] as string;
                }
            }

            toast({
                title: 'QR Code Ditemukan',
                description: `Membuka data aset...`,
            });

            setIsOpen(false);

            // Beri jeda sikit agar Scanner sempat unmount dengan bersih sebelum navigasi halaman
            setTimeout(() => {
                router.push(`/assets/${parsedId}`);
                setIsProcessing(false);
            }, 300);

        } catch (error) {
            console.error('Failed to parse injected URL', error);
            setIsProcessing(false);
            toast({
                title: 'QR Tidak Valid',
                description: 'Format QR Code tidak dikenali TaxPrime AM.',
                variant: 'destructive',
            });
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => {
            setIsOpen(open);
            if (!open) setIsProcessing(false);
        }}>
            <DialogTrigger asChild>
                <Button variant="secondary" className="border shadow-sm">
                    <ScanLine className="w-4 h-4 mr-2" />
                    Scan QR
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Scan Label Aset Fisik</DialogTitle>
                </DialogHeader>
                <div className="flex flex-col items-center justify-center py-4 relative">
                    {isProcessing ? (
                        <div className="h-64 w-full flex flex-col items-center justify-center text-slate-500 space-y-4">
                            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                            <p>Memproses QR Code...</p>
                        </div>
                    ) : (
                        <div className="w-full aspect-square overflow-hidden rounded-xl bg-black border">
                            <Scanner
                                onScan={handleScan}
                                onError={(e) => console.log(e)}
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                components={{ audio: false } as any}
                            />
                        </div>
                    )}
                    <p className="text-center text-sm text-slate-500 mt-4 px-4">
                        Arahkan kamera ke QR Code yang menempel pada perangkat keras untuk membuka profil detailnya seketika.
                    </p>
                </div>
            </DialogContent>
        </Dialog>
    );
}
