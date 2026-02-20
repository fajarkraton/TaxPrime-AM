'use client';

import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Cpu, Monitor, HardDrive, Wifi, Battery, Settings } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Specs = Record<string, any>;

function SpecRow({ label, value }: { label: string; value?: string | number | null }) {
    if (!value && value !== 0) return null;
    return (
        <div className="flex justify-between py-1.5 border-b border-slate-100 last:border-0">
            <span className="text-sm text-slate-500">{label}</span>
            <span className="text-sm font-medium text-slate-800">{String(value)}</span>
        </div>
    );
}

function SpecSection({ icon: Icon, title, color, children }: {
    icon: React.ComponentType<{ className?: string }>;
    title: string;
    color: string;
    children: React.ReactNode;
}) {
    return (
        <Card className="border shadow-sm">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Icon className={`w-4 h-4 ${color}`} />
                    {title}
                </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">{children}</CardContent>
        </Card>
    );
}

export function HardwareSpecsDisplay({ assetId }: { assetId: string }) {
    const [specs, setSpecs] = useState<Specs | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchSpecs() {
            try {
                const specRef = doc(db, 'assets', assetId, 'hardwareSpecs', 'specs');
                const snap = await getDoc(specRef);
                if (snap.exists()) {
                    setSpecs(snap.data());
                }
            } catch (err) {
                console.error('Failed to fetch hardware specs:', err);
            }
            setLoading(false);
        }
        fetchSpecs();
    }, [assetId]);

    if (loading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-40" />)}
            </div>
        );
    }

    if (!specs) {
        return (
            <Card className="border-dashed">
                <CardContent className="py-12 text-center text-slate-400">
                    <Settings className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p className="font-medium">Spesifikasi hardware belum diisi</p>
                    <p className="text-sm mt-1">Silakan edit aset ini untuk menambahkan data spesifikasi.</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* CPU */}
            <SpecSection icon={Cpu} title="Processor (CPU)" color="text-blue-600">
                <SpecRow label="Brand" value={specs.cpuBrand} />
                <SpecRow label="Model" value={specs.cpuModel} />
                <SpecRow label="Generasi" value={specs.cpuGeneration} />
                <SpecRow label="Cores" value={specs.cpuCores} />
                <SpecRow label="Threads" value={specs.cpuThreads} />
                <SpecRow label="Clock Speed" value={specs.cpuClockSpeed} />
            </SpecSection>

            {/* GPU */}
            <SpecSection icon={Monitor} title="Grafis (GPU)" color="text-green-600">
                <SpecRow label="Brand" value={specs.gpuBrand} />
                <SpecRow label="Model" value={specs.gpuModel} />
                <SpecRow label="VRAM" value={specs.gpuVram} />
                <SpecRow label="Tipe" value={specs.gpuType === 'integrated' ? 'Integrated' : specs.gpuType === 'discrete' ? 'Discrete' : specs.gpuType} />
            </SpecSection>

            {/* RAM */}
            <SpecSection icon={Cpu} title="Memory (RAM)" color="text-violet-600">
                <SpecRow label="Total" value={specs.ramTotal ? `${specs.ramTotal} GB` : undefined} />
                <SpecRow label="Tipe" value={specs.ramType} />
                <SpecRow label="Speed" value={specs.ramSpeed} />
                <SpecRow label="Slot" value={specs.ramSlots} />
            </SpecSection>

            {/* Storage */}
            <SpecSection icon={HardDrive} title="Storage" color="text-amber-600">
                <SpecRow label="Primary Tipe" value={specs.storagePrimaryType} />
                <SpecRow label="Primary Kapasitas" value={specs.storagePrimaryCapacity} />
                <SpecRow label="Primary Model" value={specs.storagePrimaryModel} />
                <SpecRow label="Secondary Tipe" value={specs.storageSecondaryType} />
                <SpecRow label="Secondary Kapasitas" value={specs.storageSecondaryCapacity} />
            </SpecSection>

            {/* Display */}
            <SpecSection icon={Monitor} title="Display" color="text-cyan-600">
                <SpecRow label="Ukuran" value={specs.displaySize ? `${specs.displaySize}"` : undefined} />
                <SpecRow label="Resolusi" value={specs.displayResolution} />
                <SpecRow label="Panel" value={specs.displayPanel} />
                <SpecRow label="Refresh Rate" value={specs.displayRefreshRate ? `${specs.displayRefreshRate} Hz` : undefined} />
            </SpecSection>

            {/* OS */}
            <SpecSection icon={Settings} title="Sistem Operasi" color="text-indigo-600">
                <SpecRow label="Nama" value={specs.osName} />
                <SpecRow label="Versi" value={specs.osVersion} />
                <SpecRow label="Lisensi" value={specs.osLicenseType} />
            </SpecSection>

            {/* Network */}
            <SpecSection icon={Wifi} title="Network" color="text-rose-600">
                <SpecRow label="WiFi" value={specs.wifi} />
                <SpecRow label="Bluetooth" value={specs.bluetooth} />
                <SpecRow label="Ethernet" value={specs.ethernet} />
                <SpecRow label="MAC Address" value={specs.macAddress} />
            </SpecSection>

            {/* Battery */}
            <SpecSection icon={Battery} title="Battery" color="text-emerald-600">
                <SpecRow label="Kapasitas" value={specs.batteryCapacity ? `${specs.batteryCapacity} Wh` : undefined} />
                <SpecRow label="Kesehatan" value={specs.batteryHealth} />
                <SpecRow label="Cycle Count" value={specs.batteryCycleCount} />
            </SpecSection>

            {/* Misc */}
            {(specs.hostname || specs.biosVersion || specs.antivirus || specs.encryptionStatus || specs.benchmarkScore) && (
                <SpecSection icon={Settings} title="Lainnya" color="text-slate-600">
                    <SpecRow label="Hostname" value={specs.hostname} />
                    <SpecRow label="BIOS" value={specs.biosVersion} />
                    <SpecRow label="Antivirus" value={specs.antivirus} />
                    <SpecRow label="Encryption" value={specs.encryptionStatus} />
                    <SpecRow label="Benchmark" value={specs.benchmarkScore} />
                </SpecSection>
            )}
        </div>
    );
}
