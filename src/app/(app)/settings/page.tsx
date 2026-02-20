'use client';

import { useRBAC } from '@/hooks/use-rbac';
import { SettingsForm } from '@/components/settings/settings-form';
import { SystemInfo } from '@/components/settings/system-info';
import { NotificationPreferencesCard } from '@/components/settings/notification-preferences';
import { ShieldAlert } from 'lucide-react';

export default function SettingsPage() {
    const { can } = useRBAC();
    const isAdmin = can('system:config');

    return (
        <div className="flex flex-col gap-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Pengaturan</h1>
                <p className="text-muted-foreground mt-1">
                    {isAdmin ? 'Konfigurasi sistem dan preferensi pribadi.' : 'Kelola preferensi notifikasi Anda.'}
                </p>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                <div className="lg:col-span-2 space-y-6">
                    {/* Notification Preferences — visible to ALL users */}
                    <NotificationPreferencesCard />

                    {/* System Config — Admin only */}
                    {isAdmin && <SettingsForm />}
                </div>
                <div className="space-y-6">
                    {isAdmin && <SystemInfo />}
                </div>
            </div>
        </div>
    );
}

