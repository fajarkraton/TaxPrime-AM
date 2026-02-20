'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { StatusBadge } from '@/components/shared/status-badge';
import { Laptop, Printer, Monitor, Wifi, HardDrive, Keyboard } from 'lucide-react';
import type { Asset } from '@/types';

const CATEGORY_ICONS: Record<string, React.ElementType> = {
    laptop: Laptop, computer: Monitor, printer: Printer,
    monitor: Monitor, network: Wifi, storage: HardDrive,
    peripheral: Keyboard,
};

interface AssetCardProps {
    asset: Asset;
    onClick?: () => void;
}

export function AssetCard({ asset, onClick }: AssetCardProps) {
    const Icon = CATEGORY_ICONS[asset.category] || HardDrive;

    return (
        <Card
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={onClick}
        >
            <CardContent className="p-4">
                <div className="flex items-start gap-3">
                    <div className="rounded-lg bg-muted p-2">
                        <Icon className="h-6 w-6 text-muted-foreground" />
                    </div>

                    <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{asset.name}</p>
                        <p className="text-xs text-muted-foreground">{asset.assetCode}</p>

                        <p className="text-sm text-muted-foreground mt-1">
                            {asset.brand} {asset.model}
                        </p>

                        <div className="mt-2 flex">
                            <StatusBadge status={asset.status} size="sm" />
                        </div>

                        {asset.assignedToName && (
                            <div className="flex items-center gap-2 mt-2">
                                <Avatar className="h-5 w-5">
                                    <AvatarFallback className="text-[10px]">
                                        {asset.assignedToName.charAt(0)}
                                    </AvatarFallback>
                                </Avatar>
                                <span className="text-xs text-muted-foreground truncate">
                                    {asset.assignedToName}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
