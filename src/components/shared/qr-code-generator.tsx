import { QRCodeSVG } from 'qrcode.react';

interface QRCodeGeneratorProps {
    value: string;
    size?: number;
}

export function QRCodeGenerator({ value, size = 128 }: QRCodeGeneratorProps) {
    return (
        <QRCodeSVG
            value={value}
            size={size}
            level="H" // High error correction level, good for physical labels that might get scratched
            includeMargin={false}
            className="max-w-full h-auto"
        />
    );
}
