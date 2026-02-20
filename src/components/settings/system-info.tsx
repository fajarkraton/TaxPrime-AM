'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useFirestoreCollection } from '@/hooks/use-firestore-collection';
import { getWorkspaceStatus } from '@/app/actions/get-workspace-status';
import { Server, Users, Database, Shield, ExternalLink, Cloud, Flame } from 'lucide-react';

interface WorkspaceConfig {
    configured: boolean;
    serviceAccountEmail: string;
    delegatedUser: string;
    workspaceDomain: string;
}

export function SystemInfo() {
    const { data: users } = useFirestoreCollection({ collectionPath: 'users', pageSize: 1000 });
    const { data: assets } = useFirestoreCollection({ collectionPath: 'assets', pageSize: 1000 });
    const { data: tickets } = useFirestoreCollection({ collectionPath: 'serviceTickets', pageSize: 1000 });
    const [wsConfig, setWsConfig] = useState<WorkspaceConfig | null>(null);

    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'Tidak diketahui';

    useEffect(() => {
        getWorkspaceStatus().then(setWsConfig).catch(() => { });
    }, []);

    const infoItems = [
        { icon: Server, label: 'Versi Aplikasi', value: 'TaxPrime AM v1.0.0', color: 'text-blue-600', bg: 'bg-blue-50' },
        { icon: Database, label: 'Firebase Project', value: projectId, color: 'text-emerald-600', bg: 'bg-emerald-50' },
        { icon: Users, label: 'Total Pengguna', value: `${users?.length || 0} pengguna`, color: 'text-violet-600', bg: 'bg-violet-50' },
        { icon: Shield, label: 'Total Aset', value: `${assets?.length || 0} aset terdaftar`, color: 'text-amber-600', bg: 'bg-amber-50' },
    ];

    const quickLinks = [
        { label: 'Firebase Console', url: `https://console.firebase.google.com/project/${projectId}`, icon: Flame, color: 'text-orange-600' },
        { label: 'Google Cloud', url: `https://console.cloud.google.com/home/dashboard?project=${projectId}`, icon: Cloud, color: 'text-blue-600' },
    ];

    return (
        <div className="space-y-6">
            {/* System Info */}
            <Card className="border-none shadow-sm outline outline-1 outline-slate-200">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-base">Tentang Sistem</CardTitle>
                            <CardDescription>Informasi teknis aplikasi TaxPrime AM</CardDescription>
                        </div>
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                            Aktif
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4 sm:grid-cols-2">
                        {infoItems.map((item, i) => {
                            const Icon = item.icon;
                            return (
                                <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-slate-50/50 border border-slate-100">
                                    <div className={`${item.bg} p-2 rounded-lg shrink-0`}>
                                        <Icon className={`h-4 w-4 ${item.color}`} />
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500">{item.label}</p>
                                        <p className="text-sm font-medium text-slate-800 mt-0.5">{item.value}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    <div className="mt-4 p-3 rounded-lg bg-slate-50/50 border border-slate-100">
                        <p className="text-xs text-slate-500">Statistik Tiket</p>
                        <p className="text-sm font-medium text-slate-800 mt-0.5">{tickets?.length || 0} tiket tercatat dalam sistem</p>
                    </div>
                </CardContent>
            </Card>

            {/* G-SET-03: Google Workspace Integration Status */}
            <Card className="border-none shadow-sm outline outline-1 outline-slate-200">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-base">Integrasi Google Workspace</CardTitle>
                            <CardDescription>Status koneksi ke Google Workspace</CardDescription>
                        </div>
                        {wsConfig && (
                            <Badge
                                variant="outline"
                                className={wsConfig.configured
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : 'bg-red-50 text-red-700 border-red-200'
                                }
                            >
                                {wsConfig.configured ? 'Terhubung' : 'Tidak Terhubung'}
                            </Badge>
                        )}
                    </div>
                </CardHeader>
                <CardContent className="space-y-3">
                    {wsConfig ? (
                        <>
                            <div className="p-3 rounded-lg bg-slate-50/50 border border-slate-100">
                                <p className="text-xs text-slate-500">Service Account</p>
                                <p className="text-sm font-medium text-slate-800 mt-0.5 truncate">{wsConfig.serviceAccountEmail}</p>
                            </div>
                            <div className="p-3 rounded-lg bg-slate-50/50 border border-slate-100">
                                <p className="text-xs text-slate-500">Delegated User</p>
                                <p className="text-sm font-medium text-slate-800 mt-0.5">{wsConfig.delegatedUser}</p>
                            </div>
                            <div className="p-3 rounded-lg bg-slate-50/50 border border-slate-100">
                                <p className="text-xs text-slate-500">Workspace Domain</p>
                                <p className="text-sm font-medium text-slate-800 mt-0.5">{wsConfig.workspaceDomain}</p>
                            </div>
                        </>
                    ) : (
                        <div className="text-sm text-slate-400 italic">Memuat konfigurasi...</div>
                    )}
                </CardContent>
            </Card>

            {/* G-SET-05: Quick Links */}
            <Card className="border-none shadow-sm outline outline-1 outline-slate-200">
                <CardHeader>
                    <CardTitle className="text-base">Akses Cepat</CardTitle>
                    <CardDescription>Link ke console eksternal</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                    {quickLinks.map((link, i) => {
                        const Icon = link.icon;
                        return (
                            <Button
                                key={i}
                                variant="outline"
                                className="w-full justify-start gap-3 h-auto py-3"
                                asChild
                            >
                                <a href={link.url} target="_blank" rel="noopener noreferrer">
                                    <Icon className={`h-4 w-4 ${link.color} shrink-0`} />
                                    <span className="flex-1 text-left text-sm">{link.label}</span>
                                    <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
                                </a>
                            </Button>
                        );
                    })}
                </CardContent>
            </Card>
        </div>
    );
}
