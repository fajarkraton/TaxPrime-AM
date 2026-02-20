'use client';

import { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { Keyboard } from 'lucide-react';

const shortcuts = [
    {
        category: 'Navigasi', items: [
            { keys: ['g', 'd'], description: 'Buka Dashboard' },
            { keys: ['g', 'a'], description: 'Buka Aset' },
            { keys: ['g', 't'], description: 'Buka Tiket' },
            { keys: ['g', 's'], description: 'Buka Subscription' },
            { keys: ['g', 'r'], description: 'Buka Report' },
            { keys: ['g', 'u'], description: 'Buka Users' },
        ]
    },
    {
        category: 'Aksi', items: [
            { keys: ['/'], description: 'Fokus ke pencarian' },
            { keys: ['?'], description: 'Tampilkan shortcut ini' },
        ]
    },
];

export function KeyboardShortcutDialog() {
    const [open, setOpen] = useState(false);

    useEffect(() => {
        const handler = () => setOpen(prev => !prev);
        window.addEventListener('toggle-shortcut-dialog', handler);
        return () => window.removeEventListener('toggle-shortcut-dialog', handler);
    }, []);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="sm:max-w-[420px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Keyboard className="w-5 h-5" />
                        Keyboard Shortcuts
                    </DialogTitle>
                    <DialogDescription>
                        Navigasi cepat menggunakan keyboard.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-5 mt-2">
                    {shortcuts.map(group => (
                        <div key={group.category}>
                            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                                {group.category}
                            </h4>
                            <div className="space-y-1.5">
                                {group.items.map((item, i) => (
                                    <div key={i} className="flex items-center justify-between py-1">
                                        <span className="text-sm">{item.description}</span>
                                        <div className="flex items-center gap-1">
                                            {item.keys.map((key, j) => (
                                                <span key={j}>
                                                    <kbd className="inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 text-xs font-mono font-medium bg-muted border rounded">
                                                        {key}
                                                    </kbd>
                                                    {j < item.keys.length - 1 && (
                                                        <span className="text-muted-foreground mx-0.5 text-xs">+</span>
                                                    )}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </DialogContent>
        </Dialog>
    );
}
