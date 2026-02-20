'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Bell, Package, Ticket, CreditCard, FileBarChart } from 'lucide-react';
import { useAuthContext } from '@/lib/firebase/auth-provider';
import {
    getNotificationPreferences,
    updateNotificationPreferences,
    type NotificationPreferences,
} from '@/app/actions/user-preferences';
import { toast } from 'sonner';

const NOTIFICATION_ITEMS: {
    key: keyof NotificationPreferences;
    label: string;
    description: string;
    icon: typeof Bell;
}[] = [
        {
            key: 'assetAssignment',
            label: 'Penugasan Aset',
            description: 'Notifikasi saat aset ditugaskan atau dikembalikan',
            icon: Package,
        },
        {
            key: 'ticketUpdates',
            label: 'Update Tiket',
            description: 'Notifikasi status, komentar, dan assign tiket',
            icon: Ticket,
        },
        {
            key: 'subscriptionReminders',
            label: 'Reminder Subscription',
            description: 'Pengingat perpanjangan langganan H-30/14/7/1',
            icon: CreditCard,
        },
        {
            key: 'monthlyReports',
            label: 'Laporan Bulanan',
            description: 'Email ringkasan laporan bulanan otomatis',
            icon: FileBarChart,
        },
    ];

export function NotificationPreferencesCard() {
    const { user } = useAuthContext();
    const [prefs, setPrefs] = useState<NotificationPreferences | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user?.uid) return;
        getNotificationPreferences(user.uid).then(p => {
            setPrefs(p);
            setLoading(false);
        });
    }, [user?.uid]);

    const handleToggle = async (key: keyof NotificationPreferences, value: boolean) => {
        if (!user?.uid || !prefs) return;
        const updated = { ...prefs, [key]: value };
        setPrefs(updated);

        const result = await updateNotificationPreferences(user.uid, { [key]: value });
        if (result.success) {
            toast.success(`Preferensi "${NOTIFICATION_ITEMS.find(n => n.key === key)?.label}" diperbarui.`);
        } else {
            setPrefs(prefs); // rollback
            toast.error(result.error || 'Gagal menyimpan.');
        }
    };

    if (loading) {
        return (
            <Card>
                <CardContent className="p-6">
                    <Skeleton className="h-5 w-48 mb-4" />
                    <div className="space-y-4">
                        {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-12 w-full" />)}
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (!prefs) return null;

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center gap-2">
                    <div className="bg-blue-50 dark:bg-blue-950 p-1.5 rounded-lg">
                        <Bell className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                        <CardTitle className="text-base">Preferensi Notifikasi</CardTitle>
                        <CardDescription>Pilih jenis notifikasi email yang ingin Anda terima.</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {NOTIFICATION_ITEMS.map(item => {
                        const Icon = item.icon;
                        return (
                            <div key={item.key} className="flex items-center justify-between gap-4 py-2">
                                <div className="flex items-center gap-3">
                                    <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
                                    <div>
                                        <Label htmlFor={item.key} className="font-medium cursor-pointer">{item.label}</Label>
                                        <p className="text-xs text-muted-foreground">{item.description}</p>
                                    </div>
                                </div>
                                <Switch
                                    id={item.key}
                                    checked={prefs[item.key]}
                                    onCheckedChange={(v) => handleToggle(item.key, v)}
                                />
                            </div>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
}
