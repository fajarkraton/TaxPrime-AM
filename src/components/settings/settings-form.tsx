'use client';

import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useAuthContext } from '@/lib/firebase/auth-provider';
import { saveSystemSettings, type SystemSettings } from '@/app/actions/settings';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Save, Building2, Bell, Tag, Mail, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

const defaultSettings: SystemSettings = {
    orgName: 'TaxPrime',
    orgDomain: 'taxprime.net',
    emailOnNewTicket: true,
    emailOnAssetAssign: true,
    emailOnAssetReturn: true,
    emailOnTicketResolved: true,
    emailOnSlaBreach: true,
    subscriptionReminder: true,
    reminderDaysBefore: 14,
    assetCodePrefix: 'AST',
};

export function SettingsForm() {
    const { user } = useAuthContext();
    const [settings, setSettings] = useState<SystemSettings>(defaultSettings);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const loadSettings = async () => {
            try {
                const docRef = doc(db, 'settings', 'organization');
                const snap = await getDoc(docRef);
                if (snap.exists()) {
                    setSettings({ ...defaultSettings, ...snap.data() as Partial<SystemSettings> });
                }
            } catch (err) {
                console.error('Gagal memuat pengaturan:', err);
            } finally {
                setLoading(false);
            }
        };
        loadSettings();
    }, []);

    const handleSave = async () => {
        if (!user) return;
        setSaving(true);
        try {
            const result = await saveSystemSettings(user.uid, user.displayName || 'Super Admin', settings);
            if (result.success) {
                toast.success('Pengaturan berhasil disimpan.');
            } else {
                toast.error(result.error || 'Gagal menyimpan pengaturan.');
            }
        } catch (err) {
            console.error('Gagal menyimpan pengaturan:', err);
            toast.error('Gagal menyimpan pengaturan. Periksa koneksi.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="space-y-6">
                {[1, 2, 3].map(i => (
                    <Card key={i}><CardContent className="pt-6"><Skeleton className="h-32 w-full" /></CardContent></Card>
                ))}
            </div>
        );
    }

    const notificationToggles = [
        {
            key: 'emailOnNewTicket' as const,
            label: 'Email Tiket Baru',
            desc: 'Kirim notifikasi email saat ada tiket helpdesk baru',
            icon: Mail,
        },
        {
            key: 'emailOnTicketResolved' as const,
            label: 'Email Tiket Selesai',
            desc: 'Kirim notifikasi email saat tiket helpdesk diselesaikan',
            icon: Mail,
        },
        {
            key: 'emailOnSlaBreach' as const,
            label: 'Email SLA Breach',
            desc: 'Kirim alert email jika tiket melewati target SLA',
            icon: AlertTriangle,
        },
        {
            key: 'emailOnAssetAssign' as const,
            label: 'Email Penugasan Aset',
            desc: 'Kirim notifikasi email saat aset ditugaskan ke karyawan',
            icon: Mail,
        },
        {
            key: 'emailOnAssetReturn' as const,
            label: 'Email Pengembalian Aset',
            desc: 'Kirim notifikasi email saat aset dikembalikan',
            icon: Mail,
        },
    ];

    return (
        <div className="space-y-6">
            {/* Informasi Organisasi */}
            <Card className="border-none shadow-sm outline outline-1 outline-slate-200">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <div className="bg-blue-50 p-2 rounded-lg"><Building2 className="h-4 w-4 text-blue-600" /></div>
                        <div>
                            <CardTitle className="text-base">Informasi Organisasi</CardTitle>
                            <CardDescription>Identitas perusahaan yang menggunakan TaxPrime AM</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="orgName">Nama Organisasi</Label>
                            <Input
                                id="orgName"
                                value={settings.orgName}
                                onChange={e => setSettings(s => ({ ...s, orgName: e.target.value }))}
                                placeholder="Nama perusahaan"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="orgDomain">Domain Email</Label>
                            <Input
                                id="orgDomain"
                                value={settings.orgDomain}
                                onChange={e => setSettings(s => ({ ...s, orgDomain: e.target.value }))}
                                placeholder="contoh: company.com"
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Konfigurasi Notifikasi */}
            <Card className="border-none shadow-sm outline outline-1 outline-slate-200">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <div className="bg-amber-50 p-2 rounded-lg"><Bell className="h-4 w-4 text-amber-600" /></div>
                        <div>
                            <CardTitle className="text-base">Konfigurasi Notifikasi</CardTitle>
                            <CardDescription>Pengaturan email dan reminder otomatis</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-3">
                    {notificationToggles.map(toggle => {
                        const Icon = toggle.icon;
                        return (
                            <div key={toggle.key} className="flex items-center justify-between p-4 rounded-lg bg-slate-50 border border-slate-100">
                                <div className="flex items-center gap-3">
                                    <Icon className="h-4 w-4 text-slate-400 shrink-0" />
                                    <div className="space-y-0.5">
                                        <Label className="text-sm font-medium">{toggle.label}</Label>
                                        <p className="text-xs text-slate-500">{toggle.desc}</p>
                                    </div>
                                </div>
                                <Switch
                                    checked={settings[toggle.key]}
                                    onCheckedChange={checked => setSettings(s => ({ ...s, [toggle.key]: checked }))}
                                />
                            </div>
                        );
                    })}

                    {/* Subscription Reminder — with interval */}
                    <div className="flex items-center justify-between p-4 rounded-lg bg-slate-50 border border-slate-100">
                        <div className="flex items-center gap-3">
                            <Bell className="h-4 w-4 text-slate-400 shrink-0" />
                            <div className="space-y-0.5">
                                <Label className="text-sm font-medium">Reminder Langganan</Label>
                                <p className="text-xs text-slate-500">Kirim reminder sebelum langganan software kadaluarsa</p>
                            </div>
                        </div>
                        <Switch
                            checked={settings.subscriptionReminder}
                            onCheckedChange={checked => setSettings(s => ({ ...s, subscriptionReminder: checked }))}
                        />
                    </div>
                    {settings.subscriptionReminder && (
                        <div className="space-y-2 pl-4 border-l-2 border-amber-200 ml-2">
                            <Label htmlFor="reminderDays">Kirim Reminder (hari sebelum kadaluarsa)</Label>
                            <Select
                                value={String(settings.reminderDaysBefore)}
                                onValueChange={v => setSettings(s => ({ ...s, reminderDaysBefore: Number(v) }))}
                            >
                                <SelectTrigger className="w-[200px] bg-white" id="reminderDays">
                                    <SelectValue placeholder="Pilih interval" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="7">7 hari sebelum</SelectItem>
                                    <SelectItem value="14">14 hari sebelum</SelectItem>
                                    <SelectItem value="30">30 hari sebelum</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Konfigurasi Aset */}
            <Card className="border-none shadow-sm outline outline-1 outline-slate-200">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <div className="bg-emerald-50 p-2 rounded-lg"><Tag className="h-4 w-4 text-emerald-600" /></div>
                        <div>
                            <CardTitle className="text-base">Konfigurasi Aset</CardTitle>
                            <CardDescription>Pengaturan default untuk manajemen aset IT</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="assetPrefix">Prefix Kode Aset</Label>
                        <div className="flex items-center gap-3">
                            <Input
                                id="assetPrefix"
                                value={settings.assetCodePrefix}
                                onChange={e => setSettings(s => ({ ...s, assetCodePrefix: e.target.value.toUpperCase() }))}
                                placeholder="AST"
                                className="w-[120px] uppercase font-mono"
                                maxLength={5}
                            />
                            <span className="text-sm text-slate-500">
                                Contoh: <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs font-mono">{settings.assetCodePrefix}-2026-0001</code>
                            </span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Save Button */}
            <div className="flex justify-end pt-2">
                <Button onClick={handleSave} disabled={saving} className="gap-2 min-w-[160px]">
                    <Save className="h-4 w-4" />
                    {saving ? 'Menyimpan...' : 'Simpan Pengaturan'}
                </Button>
            </div>
        </div>
    );
}
