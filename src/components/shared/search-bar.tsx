'use client';

import { useState, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, QrCode } from 'lucide-react';
import { useDebouncedCallback } from 'use-debounce';

interface SearchBarProps {
    placeholder?: string;
    onSearch: (query: string) => void;
    onQrScan?: () => void;
    showQrButton?: boolean;
}

export function SearchBar({
    placeholder = 'Cari aset...',
    onSearch,
    onQrScan,
    showQrButton = false,
}: SearchBarProps) {
    const [value, setValue] = useState('');

    const debouncedSearch = useDebouncedCallback((query: string) => {
        onSearch(query);
    }, 300);

    const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        setValue(newValue);
        debouncedSearch(newValue);
    }, [debouncedSearch]);

    return (
        <div className="relative flex items-center gap-2">
            <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder={placeholder}
                    value={value}
                    onChange={handleChange}
                    className="pl-10"
                />
            </div>
            {showQrButton && onQrScan && (
                <Button variant="outline" size="icon" onClick={onQrScan} aria-label="Scan QR Code">
                    <QrCode className="h-4 w-4" />
                </Button>
            )}
        </div>
    );
}
