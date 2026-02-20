'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AssetCategory, AssetStatus, AssetType } from '@/types';
import { assetFormSchema, AssetFormValues } from '@/lib/validations/asset';
import { createAsset } from '@/app/actions/asset';
import { PhotoUploader } from '@/components/shared/photo-uploader';
import { useAuthContext } from '@/lib/firebase/auth-provider';
import { useRouter } from 'next/navigation';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export function CreateAssetForm() {
    const router = useRouter();
    const { user } = useAuthContext();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [createdAssetId, setCreatedAssetId] = useState<string | null>(null);

    const form = useForm<AssetFormValues>({
        resolver: zodResolver(assetFormSchema),
        defaultValues: {
            name: '',
            brand: '',
            model: '',
            serialNumber: '',
            category: AssetCategory.LAPTOP,
            type: AssetType.TANGIBLE,
            status: AssetStatus.IN_STOCK,
            condition: 'excellent',
            department: '',
            location: '',
            purchaseDate: new Date().toISOString().split('T')[0],
            purchasePrice: 0,
            vendor: '',
            notes: '',
            hardwareSpecs: {
                cpuBrand: '', cpuModel: '', cpuGeneration: '', cpuCores: undefined, cpuThreads: undefined, cpuClockSpeed: '',
                gpuBrand: '', gpuModel: '', gpuVram: '', gpuType: undefined,
                ramTotal: 8, ramType: '', ramSpeed: '', ramSlots: undefined,
                storagePrimaryType: undefined, storagePrimaryCapacity: '', storagePrimaryModel: '',
                storageSecondaryType: undefined, storageSecondaryCapacity: '',
                displaySize: undefined, displayResolution: '', displayPanel: '', displayRefreshRate: undefined,
                osName: '', osVersion: '', osLicenseType: '',
                wifi: '', bluetooth: '', ethernet: '', macAddress: '',
                batteryCapacity: undefined, batteryHealth: '', batteryCycleCount: undefined,
                benchmarkScore: undefined, biosVersion: '', hostname: '', antivirus: '', encryptionStatus: '',
            }
        },
    });

    const watchCategory = form.watch('category');
    const showHardwareSpecs = watchCategory === AssetCategory.LAPTOP || watchCategory === AssetCategory.COMPUTER;

    async function onSubmit(data: AssetFormValues) {
        if (!user) return;
        setIsSubmitting(true);
        try {
            const response = await createAsset(data, user.uid, user.displayName || 'Unknown');

            if (response.success && response.assetId) {
                setCreatedAssetId(response.assetId);
            } else {
                console.error(response.error);
                alert(response.error);
            }
        } catch (error) {
            console.error(error);
            alert('Gagal registrasi aset');
        }
        setIsSubmitting(false);
    }

    // Handle successful photo uploads
    const handlePhotoUploads = async () => {
        if (!createdAssetId) return;
        // Photos uploaded successfully directly to Storage.
        // Firestore `photoUrls` string array update logic to follow.
        alert('Foto berhasil diunggah!');
        router.push(`/assets/${createdAssetId}`);
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            {!createdAssetId ? (
                <Card>
                    <CardHeader>
                        <CardTitle>Registrasi Aset Baru</CardTitle>
                        <CardDescription>Masukkan detail informasi aset beserta spesifikasi hardware jika ada.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

                                {/* Basic Info Section */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <FormField
                                        control={form.control}
                                        name="name"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Nama Aset *</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="ThinkPad X1 Carbon Gen 12" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="category"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Kategori *</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Pilih Kategori" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        {Object.values(AssetCategory).map((cat) => (
                                                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="brand"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Merk *</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="Lenovo" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="model"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Model *</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="Type 20XX" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="serialNumber"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Serial Number / S/N *</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="PF1234AB" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="status"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Status Awal *</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Pilih Status" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="in_stock">In Stock (Tersedia)</SelectItem>
                                                        <SelectItem value="procurement">Procurement (Pengadaan)</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="condition"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Kondisi *</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Pilih Kondisi" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="excellent">Sangat Baik (Excellent)</SelectItem>
                                                        <SelectItem value="good">Baik (Good)</SelectItem>
                                                        <SelectItem value="fair">Cukup (Fair)</SelectItem>
                                                        <SelectItem value="poor">Buruk (Poor)</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="department"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Departemen Pemilik *</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Pilih Departemen" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="IT">IT</SelectItem>
                                                        <SelectItem value="Tax Advisory">Tax Advisory</SelectItem>
                                                        <SelectItem value="Tax Compliance">Tax Compliance</SelectItem>
                                                        <SelectItem value="Administration">Administration</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="location"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Lokasi Aset *</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="Gudang IT, Lantai 3" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="vendor"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Vendor / Toko *</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="Lenovo Indonesia" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="purchaseDate"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Tanggal Pembelian *</FormLabel>
                                                <FormControl>
                                                    <Input type="date" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="purchasePrice"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Harga Pembelian (IDR) *</FormLabel>
                                                <FormControl>
                                                    <Input type="number" min={0} {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <FormField
                                    control={form.control}
                                    name="notes"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Catatan Tambahan</FormLabel>
                                            <FormControl>
                                                <Textarea placeholder="Contoh: Termasuk lisensi Windows 11 Pro OEM" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                {showHardwareSpecs && (
                                    <div className="mt-8 pt-8 border-t border-slate-200">
                                        <h3 className="text-lg font-semibold text-slate-800 mb-1">Spesifikasi Hardware</h3>
                                        <p className="text-sm text-slate-500 mb-6">Detail teknis perangkat. Semua field opsional.</p>

                                        {/* CPU */}
                                        <h4 className="text-sm font-semibold text-blue-600 mb-3 flex items-center gap-1.5">🔲 Processor (CPU)</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                                            <FormField control={form.control} name="hardwareSpecs.cpuBrand" render={({ field }) => (<FormItem><FormLabel>Brand CPU</FormLabel><FormControl><Input placeholder="Intel / AMD" {...field} /></FormControl></FormItem>)} />
                                            <FormField control={form.control} name="hardwareSpecs.cpuModel" render={({ field }) => (<FormItem><FormLabel>Model CPU</FormLabel><FormControl><Input placeholder="Core i7-13700H" {...field} /></FormControl></FormItem>)} />
                                            <FormField control={form.control} name="hardwareSpecs.cpuGeneration" render={({ field }) => (<FormItem><FormLabel>Generasi</FormLabel><FormControl><Input placeholder="13th Gen" {...field} /></FormControl></FormItem>)} />
                                            <FormField control={form.control} name="hardwareSpecs.cpuCores" render={({ field }) => (<FormItem><FormLabel>Cores</FormLabel><FormControl><Input type="number" placeholder="14" {...field} /></FormControl></FormItem>)} />
                                            <FormField control={form.control} name="hardwareSpecs.cpuThreads" render={({ field }) => (<FormItem><FormLabel>Threads</FormLabel><FormControl><Input type="number" placeholder="20" {...field} /></FormControl></FormItem>)} />
                                            <FormField control={form.control} name="hardwareSpecs.cpuClockSpeed" render={({ field }) => (<FormItem><FormLabel>Clock Speed</FormLabel><FormControl><Input placeholder="2.4 GHz (Turbo 5.0)" {...field} /></FormControl></FormItem>)} />
                                        </div>

                                        {/* GPU */}
                                        <h4 className="text-sm font-semibold text-green-600 mb-3 flex items-center gap-1.5">🎮 Grafis (GPU)</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                            <FormField control={form.control} name="hardwareSpecs.gpuBrand" render={({ field }) => (<FormItem><FormLabel>Brand GPU</FormLabel><FormControl><Input placeholder="NVIDIA / AMD / Intel" {...field} /></FormControl></FormItem>)} />
                                            <FormField control={form.control} name="hardwareSpecs.gpuModel" render={({ field }) => (<FormItem><FormLabel>Model GPU</FormLabel><FormControl><Input placeholder="RTX 4060" {...field} /></FormControl></FormItem>)} />
                                            <FormField control={form.control} name="hardwareSpecs.gpuVram" render={({ field }) => (<FormItem><FormLabel>VRAM</FormLabel><FormControl><Input placeholder="8 GB GDDR6" {...field} /></FormControl></FormItem>)} />
                                            <FormField control={form.control} name="hardwareSpecs.gpuType" render={({ field }) => (
                                                <FormItem><FormLabel>Tipe GPU</FormLabel>
                                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                        <FormControl><SelectTrigger><SelectValue placeholder="Pilih tipe" /></SelectTrigger></FormControl>
                                                        <SelectContent>
                                                            <SelectItem value="integrated">Integrated</SelectItem>
                                                            <SelectItem value="discrete">Discrete (Dedicated)</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </FormItem>)} />
                                        </div>

                                        {/* RAM */}
                                        <h4 className="text-sm font-semibold text-violet-600 mb-3 flex items-center gap-1.5">💾 Memory (RAM)</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                            <FormField control={form.control} name="hardwareSpecs.ramTotal" render={({ field }) => (<FormItem><FormLabel>Total RAM (GB)</FormLabel><FormControl><Input type="number" min={0} {...field} /></FormControl></FormItem>)} />
                                            <FormField control={form.control} name="hardwareSpecs.ramType" render={({ field }) => (<FormItem><FormLabel>Tipe RAM</FormLabel><FormControl><Input placeholder="DDR5" {...field} /></FormControl></FormItem>)} />
                                            <FormField control={form.control} name="hardwareSpecs.ramSpeed" render={({ field }) => (<FormItem><FormLabel>Speed</FormLabel><FormControl><Input placeholder="4800 MHz" {...field} /></FormControl></FormItem>)} />
                                            <FormField control={form.control} name="hardwareSpecs.ramSlots" render={({ field }) => (<FormItem><FormLabel>Jumlah Slot</FormLabel><FormControl><Input type="number" placeholder="2" {...field} /></FormControl></FormItem>)} />
                                        </div>

                                        {/* Storage */}
                                        <h4 className="text-sm font-semibold text-amber-600 mb-3 flex items-center gap-1.5">💿 Storage</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-2">
                                            <FormField control={form.control} name="hardwareSpecs.storagePrimaryType" render={({ field }) => (
                                                <FormItem><FormLabel>Tipe Primary</FormLabel>
                                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                        <FormControl><SelectTrigger><SelectValue placeholder="Pilih tipe" /></SelectTrigger></FormControl>
                                                        <SelectContent>
                                                            <SelectItem value="NVMe">NVMe SSD</SelectItem>
                                                            <SelectItem value="SSD">SATA SSD</SelectItem>
                                                            <SelectItem value="HDD">HDD</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </FormItem>)} />
                                            <FormField control={form.control} name="hardwareSpecs.storagePrimaryCapacity" render={({ field }) => (<FormItem><FormLabel>Kapasitas Primary</FormLabel><FormControl><Input placeholder="512 GB" {...field} /></FormControl></FormItem>)} />
                                            <FormField control={form.control} name="hardwareSpecs.storagePrimaryModel" render={({ field }) => (<FormItem><FormLabel>Model Drive</FormLabel><FormControl><Input placeholder="Samsung 980 Pro" {...field} /></FormControl></FormItem>)} />
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                            <FormField control={form.control} name="hardwareSpecs.storageSecondaryType" render={({ field }) => (
                                                <FormItem><FormLabel>Tipe Secondary (Opsional)</FormLabel>
                                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                        <FormControl><SelectTrigger><SelectValue placeholder="Tidak ada" /></SelectTrigger></FormControl>
                                                        <SelectContent>
                                                            <SelectItem value="NVMe">NVMe SSD</SelectItem>
                                                            <SelectItem value="SSD">SATA SSD</SelectItem>
                                                            <SelectItem value="HDD">HDD</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </FormItem>)} />
                                            <FormField control={form.control} name="hardwareSpecs.storageSecondaryCapacity" render={({ field }) => (<FormItem><FormLabel>Kapasitas Secondary</FormLabel><FormControl><Input placeholder="1 TB" {...field} /></FormControl></FormItem>)} />
                                        </div>

                                        {/* Display */}
                                        <h4 className="text-sm font-semibold text-cyan-600 mb-3 flex items-center gap-1.5">🖥️ Display</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                            <FormField control={form.control} name="hardwareSpecs.displaySize" render={({ field }) => (<FormItem><FormLabel>Ukuran Layar (inch)</FormLabel><FormControl><Input type="number" step="0.1" placeholder="15.6" {...field} /></FormControl></FormItem>)} />
                                            <FormField control={form.control} name="hardwareSpecs.displayResolution" render={({ field }) => (<FormItem><FormLabel>Resolusi</FormLabel><FormControl><Input placeholder="1920x1080 (FHD)" {...field} /></FormControl></FormItem>)} />
                                            <FormField control={form.control} name="hardwareSpecs.displayPanel" render={({ field }) => (<FormItem><FormLabel>Tipe Panel</FormLabel><FormControl><Input placeholder="IPS / OLED / TN" {...field} /></FormControl></FormItem>)} />
                                            <FormField control={form.control} name="hardwareSpecs.displayRefreshRate" render={({ field }) => (<FormItem><FormLabel>Refresh Rate (Hz)</FormLabel><FormControl><Input type="number" placeholder="144" {...field} /></FormControl></FormItem>)} />
                                        </div>

                                        {/* OS */}
                                        <h4 className="text-sm font-semibold text-indigo-600 mb-3 flex items-center gap-1.5">📀 Sistem Operasi</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                                            <FormField control={form.control} name="hardwareSpecs.osName" render={({ field }) => (<FormItem><FormLabel>Nama OS</FormLabel><FormControl><Input placeholder="Windows 11 Pro" {...field} /></FormControl></FormItem>)} />
                                            <FormField control={form.control} name="hardwareSpecs.osVersion" render={({ field }) => (<FormItem><FormLabel>Versi</FormLabel><FormControl><Input placeholder="23H2" {...field} /></FormControl></FormItem>)} />
                                            <FormField control={form.control} name="hardwareSpecs.osLicenseType" render={({ field }) => (<FormItem><FormLabel>Tipe Lisensi</FormLabel><FormControl><Input placeholder="OEM / Retail / Volume" {...field} /></FormControl></FormItem>)} />
                                        </div>

                                        {/* Network */}
                                        <h4 className="text-sm font-semibold text-rose-600 mb-3 flex items-center gap-1.5">🌐 Network</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                            <FormField control={form.control} name="hardwareSpecs.wifi" render={({ field }) => (<FormItem><FormLabel>WiFi</FormLabel><FormControl><Input placeholder="Wi-Fi 6E (802.11ax)" {...field} /></FormControl></FormItem>)} />
                                            <FormField control={form.control} name="hardwareSpecs.bluetooth" render={({ field }) => (<FormItem><FormLabel>Bluetooth</FormLabel><FormControl><Input placeholder="5.3" {...field} /></FormControl></FormItem>)} />
                                            <FormField control={form.control} name="hardwareSpecs.ethernet" render={({ field }) => (<FormItem><FormLabel>Ethernet</FormLabel><FormControl><Input placeholder="1 Gbps RJ-45" {...field} /></FormControl></FormItem>)} />
                                            <FormField control={form.control} name="hardwareSpecs.macAddress" render={({ field }) => (<FormItem><FormLabel>MAC Address</FormLabel><FormControl><Input placeholder="AA:BB:CC:DD:EE:FF" {...field} /></FormControl></FormItem>)} />
                                        </div>

                                        {/* Battery */}
                                        <h4 className="text-sm font-semibold text-emerald-600 mb-3 flex items-center gap-1.5">🔋 Battery</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                                            <FormField control={form.control} name="hardwareSpecs.batteryCapacity" render={({ field }) => (<FormItem><FormLabel>Kapasitas (Wh)</FormLabel><FormControl><Input type="number" placeholder="57" {...field} /></FormControl></FormItem>)} />
                                            <FormField control={form.control} name="hardwareSpecs.batteryHealth" render={({ field }) => (<FormItem><FormLabel>Kesehatan Baterai</FormLabel><FormControl><Input placeholder="85% / Normal" {...field} /></FormControl></FormItem>)} />
                                            <FormField control={form.control} name="hardwareSpecs.batteryCycleCount" render={({ field }) => (<FormItem><FormLabel>Cycle Count</FormLabel><FormControl><Input type="number" placeholder="120" {...field} /></FormControl></FormItem>)} />
                                        </div>

                                        {/* Misc */}
                                        <h4 className="text-sm font-semibold text-slate-600 mb-3 flex items-center gap-1.5">⚙️ Lainnya</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <FormField control={form.control} name="hardwareSpecs.hostname" render={({ field }) => (<FormItem><FormLabel>Hostname</FormLabel><FormControl><Input placeholder="TXP-LPT-001" {...field} /></FormControl></FormItem>)} />
                                            <FormField control={form.control} name="hardwareSpecs.biosVersion" render={({ field }) => (<FormItem><FormLabel>BIOS Version</FormLabel><FormControl><Input placeholder="F.20" {...field} /></FormControl></FormItem>)} />
                                            <FormField control={form.control} name="hardwareSpecs.antivirus" render={({ field }) => (<FormItem><FormLabel>Antivirus</FormLabel><FormControl><Input placeholder="Windows Defender" {...field} /></FormControl></FormItem>)} />
                                            <FormField control={form.control} name="hardwareSpecs.encryptionStatus" render={({ field }) => (<FormItem><FormLabel>Encryption</FormLabel><FormControl><Input placeholder="BitLocker Active" {...field} /></FormControl></FormItem>)} />
                                            <FormField control={form.control} name="hardwareSpecs.benchmarkScore" render={({ field }) => (<FormItem><FormLabel>Benchmark Score</FormLabel><FormControl><Input type="number" placeholder="12500" {...field} /></FormControl></FormItem>)} />
                                        </div>
                                    </div>
                                )}

                                <div className="flex justify-end gap-4 pt-4">
                                    <Button type="button" variant="outline" onClick={() => router.back()}>
                                        Batal
                                    </Button>
                                    <Button type="submit" disabled={isSubmitting}>
                                        {isSubmitting ? 'Memproses...' : 'Daftarkan Aset'}
                                    </Button>
                                </div>
                            </form>
                        </Form>
                    </CardContent>
                </Card>
            ) : (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-green-600">Aset Berhasil Didaftarkan!</CardTitle>
                        <CardDescription>Tahap 2: Unggah foto fisik dari aset (Opsional tapi disarankan).</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <PhotoUploader assetId={createdAssetId} onUploadSuccess={handlePhotoUploads} />
                        <div className="mt-6 flex justify-end">
                            <Button variant="secondary" onClick={() => router.push(`/assets/${createdAssetId}`)}>
                                Lewati & Lihat Detail Aset
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
