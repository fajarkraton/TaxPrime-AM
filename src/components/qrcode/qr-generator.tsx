'use client';

import { QRCodeSVG } from 'qrcode.react';

interface QRCodeGeneratorProps {
    assetCode: string;
    size?: number;
    showLabel?: boolean;
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://asset.taxprime.net';

export function QRCodeGenerator({
    assetCode, size = 128, showLabel = true,
}: QRCodeGeneratorProps) {
    const url = `${APP_URL}/asset/${assetCode}`;

    return (
        <div className="inline-flex flex-col items-center gap-1">
            <QRCodeSVG
                value={url}
                size={size}
                level="M"
                includeMargin={true}
            />
            {showLabel && (
                <span className="text-xs font-mono text-muted-foreground">{assetCode}</span>
            )}
        </div>
    );
}
