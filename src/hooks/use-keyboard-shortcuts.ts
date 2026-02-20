'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface ShortcutMap {
    [key: string]: () => void;
}

/**
 * Global keyboard shortcut handler.
 * Supports single keys (n, /) and sequences (g d, g a).
 * Ignores shortcuts when typing in inputs/textareas.
 */
export function useKeyboardShortcuts(extraShortcuts?: ShortcutMap) {
    const router = useRouter();
    const pendingKey = useRef<string | null>(null);
    const pendingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const navigate = useCallback((path: string) => {
        router.push(path);
    }, [router]);

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            // Skip when typing in form fields
            const tag = (e.target as HTMLElement)?.tagName;
            const isInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
            const isEditable = (e.target as HTMLElement)?.isContentEditable;
            if (isInput || isEditable) return;

            // Skip if modifier keys (except shift) are held
            if (e.ctrlKey || e.metaKey || e.altKey) return;

            const key = e.key.toLowerCase();

            // Handle sequence keys (g + next key)
            if (pendingKey.current === 'g') {
                pendingKey.current = null;
                if (pendingTimer.current) clearTimeout(pendingTimer.current);

                switch (key) {
                    case 'd': e.preventDefault(); navigate('/dashboard'); return;
                    case 'a': e.preventDefault(); navigate('/assets'); return;
                    case 't': e.preventDefault(); navigate('/tickets'); return;
                    case 's': e.preventDefault(); navigate('/subscriptions'); return;
                    case 'r': e.preventDefault(); navigate('/reports'); return;
                    case 'u': e.preventDefault(); navigate('/users'); return;
                }
                return;
            }

            // Start a sequence
            if (key === 'g') {
                pendingKey.current = 'g';
                pendingTimer.current = setTimeout(() => {
                    pendingKey.current = null;
                }, 500); // 500ms window
                return;
            }

            // Single key shortcuts
            switch (key) {
                case '/':
                    e.preventDefault();
                    // Focus the first search input on the page
                    const searchInput = document.querySelector<HTMLInputElement>(
                        'input[type="search"], input[placeholder*="Cari"], input[placeholder*="cari"], input[placeholder*="Search"]'
                    );
                    if (searchInput) searchInput.focus();
                    return;
                case '?':
                    e.preventDefault();
                    // Dispatch custom event for shortcut dialog
                    window.dispatchEvent(new CustomEvent('toggle-shortcut-dialog'));
                    return;
            }

            // Extra shortcuts from props
            if (extraShortcuts?.[key]) {
                e.preventDefault();
                extraShortcuts[key]();
            }
        };

        window.addEventListener('keydown', handler);
        return () => {
            window.removeEventListener('keydown', handler);
            if (pendingTimer.current) clearTimeout(pendingTimer.current);
        };
    }, [navigate, extraShortcuts]);
}
