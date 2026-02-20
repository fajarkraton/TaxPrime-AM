'use client';

import { useState } from 'react';
import { Check, ChevronsUpDown, Laptop, Monitor, Package } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { useFirestoreCollection } from '@/hooks/use-firestore-collection';
import { where } from 'firebase/firestore';

interface AssetItem {
    id: string;
    assetCode: string;
    name: string;
    brand?: string;
    category?: string;
    status?: string;
}

interface AssetPickerComboboxProps {
    userId: string;
    value: string;
    onChange: (value: string) => void;
}

const getCategoryIcon = (cat?: string) => {
    switch (cat) {
        case 'laptop': return <Laptop className="w-4 h-4 text-blue-500" />;
        case 'computer': return <Monitor className="w-4 h-4 text-indigo-500" />;
        default: return <Package className="w-4 h-4 text-slate-400" />;
    }
};

export function AssetPickerCombobox({ userId, value, onChange }: AssetPickerComboboxProps) {
    const [open, setOpen] = useState(false);

    const { data: rawAssets, loading } = useFirestoreCollection<AssetItem>({
        collectionPath: 'assets',
        constraints: [
            where('assignedTo', '==', userId),
        ],
        enabled: !!userId,
    });

    // Also allow available/deployed assets
    const assets = rawAssets.filter(
        (a) => a.status === 'deployed' || a.status === 'available'
    );

    const selectedAsset = assets.find(a => a.assetCode === value || a.id === value);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between font-normal"
                    disabled={loading}
                >
                    {loading ? (
                        <span className="text-muted-foreground">Memuat aset...</span>
                    ) : selectedAsset ? (
                        <span className="flex items-center gap-2 truncate">
                            {getCategoryIcon(selectedAsset.category)}
                            <span className="font-mono text-xs text-muted-foreground">{selectedAsset.assetCode}</span>
                            <span className="truncate">{selectedAsset.name}</span>
                        </span>
                    ) : (
                        <span className="text-muted-foreground">Pilih aset yang bermasalah...</span>
                    )}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                <Command>
                    <CommandInput placeholder="Cari nama atau kode aset..." />
                    <CommandList>
                        <CommandEmpty>
                            {assets.length === 0
                                ? 'Tidak ada aset yang ditugaskan ke Anda.'
                                : 'Aset tidak ditemukan.'}
                        </CommandEmpty>
                        <CommandGroup heading="Aset Anda">
                            {/* Clear option */}
                            <CommandItem
                                value="__clear__"
                                onSelect={() => {
                                    onChange('');
                                    setOpen(false);
                                }}
                            >
                                <Check className={cn('mr-2 h-4 w-4', !value ? 'opacity-100' : 'opacity-0')} />
                                <span className="text-muted-foreground italic">Tidak terkait aset tertentu</span>
                            </CommandItem>

                            {assets.map((asset) => (
                                <CommandItem
                                    key={asset.id}
                                    value={`${asset.assetCode} ${asset.name} ${asset.brand || ''}`}
                                    onSelect={() => {
                                        onChange(asset.assetCode);
                                        setOpen(false);
                                    }}
                                >
                                    <Check
                                        className={cn(
                                            'mr-2 h-4 w-4',
                                            value === asset.assetCode ? 'opacity-100' : 'opacity-0'
                                        )}
                                    />
                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                        {getCategoryIcon(asset.category)}
                                        <div className="flex flex-col min-w-0">
                                            <span className="text-sm font-medium truncate">{asset.name}</span>
                                            <span className="text-xs text-muted-foreground font-mono">
                                                {asset.assetCode}{asset.brand ? ` • ${asset.brand}` : ''}
                                            </span>
                                        </div>
                                    </div>
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
