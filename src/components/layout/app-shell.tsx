'use client';

import { Sidebar } from './sidebar';
import { Header } from './header';
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts';
import { KeyboardShortcutDialog } from '@/components/shared/keyboard-shortcut-dialog';

export function AppShell({ children }: { children: React.ReactNode }) {
    useKeyboardShortcuts();

    return (
        <div className="flex h-screen w-screen overflow-hidden bg-background">
            <div className="hidden md:flex">
                <Sidebar />
            </div>
            <div className="flex flex-1 flex-col overflow-hidden">
                <Header />
                <main className="flex-1 overflow-y-auto bg-slate-50/50 dark:bg-background p-6 lg:p-8">
                    {children}
                </main>
            </div>
            <KeyboardShortcutDialog />
        </div>
    );
}

