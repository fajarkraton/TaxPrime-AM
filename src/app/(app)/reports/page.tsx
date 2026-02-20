'use client';

import { useRBAC } from '@/hooks/use-rbac';
import { ReportTabs } from '@/components/reports/report-tabs';
import { ShieldAlert } from 'lucide-react';

export default function ReportsPage() {
    const { can } = useRBAC();

    if (!can('report:view')) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
                <div className="bg-red-50 p-4 rounded-full mb-4">
                    <ShieldAlert className="h-8 w-8 text-red-500" />
                </div>
                <h2 className="text-xl font-semibold text-slate-800">Akses Ditolak</h2>
                <p className="text-slate-500 mt-2 max-w-md">
                    Anda tidak memiliki izin untuk melihat halaman laporan. Hubungi administrator untuk mendapatkan akses.
                </p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Laporan &amp; Analitik</h1>
                <p className="text-muted-foreground mt-1">
                    Analisis data aset, tiket helpdesk, dan biaya langganan perusahaan.
                </p>
            </div>

            <ReportTabs />
        </div>
    );
}
