import { Badge } from '@/components/ui/badge';

interface StatusBadgeProps {
    status: string;
    size?: 'sm' | 'default';
}

export function StatusBadge({ status, size = 'default' }: StatusBadgeProps) {
    let colorClass = 'bg-slate-100 text-slate-800 hover:bg-slate-200';
    let label = status;

    switch (status) {
        case 'in_stock':
            colorClass = 'bg-blue-100 text-blue-800 hover:bg-blue-200';
            label = 'Tersedia (Gudang)';
            break;
        case 'procurement':
            colorClass = 'bg-purple-100 text-purple-800 hover:bg-purple-200';
            label = 'Pengadaan';
            break;
        case 'deployed':
            colorClass = 'bg-green-100 text-green-800 hover:bg-green-200';
            label = 'Digunakan';
            break;
        case 'maintenance':
            colorClass = 'bg-orange-100 text-orange-800 hover:bg-orange-200';
            label = 'Perbaikan';
            break;
        case 'reserved':
            colorClass = 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200';
            label = 'Dipesan';
            break;
        case 'retired':
            colorClass = 'bg-slate-200 text-slate-600 hover:bg-slate-300';
            label = 'Pensiun (Retired)';
            break;
        case 'lost':
            colorClass = 'bg-red-100 text-red-800 hover:bg-red-200';
            label = 'Hilang / Rusak';
            break;
    }

    const sizeClass = size === 'sm' ? 'px-2 py-0 text-xs' : 'px-2.5 py-0.5';

    return (
        <Badge className={`${sizeClass} rounded-full font-medium shadow-none border-transparent ${colorClass}`}>
            {label}
        </Badge>
    );
}
