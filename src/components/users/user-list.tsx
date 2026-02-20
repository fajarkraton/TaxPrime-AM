'use client';

import { useEffect, useState, useMemo } from 'react';
import { useAuthContext } from '@/lib/firebase/auth-provider';
import { listAllUsers, assignUserRole, updateUserDepartment, updateUserJobTitle, toggleUserStatus, type AdminUserRecord } from '@/app/actions/user';
import { syncUsersFromWorkspace } from '@/app/actions/workspace-sync';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';
import { Users, Info, Loader2, Search, ShieldCheck, Shield, UserCog, UserCheck, Pencil, Check, X, RefreshCw } from 'lucide-react';
import type { UserRole } from '@/types';

const roleLabels: Record<UserRole, string> = {
    'super_admin': 'Super Admin',
    'admin': 'Admin IT',
    'it_staff': 'Staf IT',
    'manager': 'Manager',
    'employee': 'Pegawai'
};

const roleColors: Record<UserRole, string> = {
    'super_admin': 'bg-red-100 text-red-800 hover:bg-red-100',
    'admin': 'bg-orange-100 text-orange-800 hover:bg-orange-100',
    'it_staff': 'bg-blue-100 text-blue-800 hover:bg-blue-100',
    'manager': 'bg-purple-100 text-purple-800 hover:bg-purple-100',
    'employee': 'bg-slate-100 text-slate-800 hover:bg-slate-100'
};

export function UserList() {
    const { user, role } = useAuthContext();
    const [users, setUsers] = useState<AdminUserRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [updatingUid, setUpdatingUid] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [editingDeptUid, setEditingDeptUid] = useState<string | null>(null);
    const [deptValue, setDeptValue] = useState('');
    const [editingJobUid, setEditingJobUid] = useState<string | null>(null);
    const [jobValue, setJobValue] = useState('');
    const [roleFilter, setRoleFilter] = useState<string>('all');
    const [deptFilter, setDeptFilter] = useState<string>('all');
    const [syncLoading, setSyncLoading] = useState(false);

    const isSuperAdmin = role === 'super_admin';
    const isAdmin = role === 'admin' || isSuperAdmin;

    useEffect(() => {
        let isMounted = true;

        async function fetchUsers() {
            if (!user) return;
            try {
                setLoading(true);
                const result = await listAllUsers(user.uid);
                if (result.success && result.data && isMounted) {
                    setUsers(result.data);
                    setError(null);
                } else {
                    if (isMounted) setError(result.error || 'Gagal memuat pengguna.');
                }
            } catch (err: unknown) {
                const message = err instanceof Error ? err.message : 'Terjadi kesalahan';
                if (isMounted) setError(message);
            } finally {
                if (isMounted) setLoading(false);
            }
        }

        if (isAdmin) {
            fetchUsers();
        } else {
            setLoading(false);
            setError('Akses ditolak. Anda tidak memiliki izin melihat daftar pengguna.');
        }

        return () => { isMounted = false; };
    }, [user, role, isAdmin]);

    const filteredUsers = useMemo(() => {
        let result = users;
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            result = result.filter(u =>
                u.displayName.toLowerCase().includes(q) ||
                u.email.toLowerCase().includes(q) ||
                u.department?.toLowerCase().includes(q)
            );
        }
        if (roleFilter !== 'all') result = result.filter(u => u.role === roleFilter);
        if (deptFilter !== 'all') result = result.filter(u => u.department === deptFilter);
        return result;
    }, [users, searchQuery, roleFilter, deptFilter]);

    // Role stats
    const roleStats = useMemo(() => {
        const counts: Record<string, number> = {};
        users.forEach(u => { counts[u.role] = (counts[u.role] || 0) + 1; });
        return counts;
    }, [users]);

    const handleRoleChange = async (targetUid: string, newRole: string) => {
        if (!user) return;
        if (targetUid === user.uid && newRole !== 'super_admin') {
            toast.error("Tidak dapat menurunkan hak akses akun sendiri dari Super Admin.");
            return;
        }

        try {
            setUpdatingUid(targetUid);
            const result = await assignUserRole(
                targetUid, newRole as UserRole,
                user.uid, user.displayName || 'Unknown Admin'
            );

            if (result.success) {
                toast.success('Peran pengguna berhasil diperbarui!');
                setUsers(prev => prev.map(u => u.uid === targetUid ? { ...u, role: newRole as UserRole } : u));
            } else {
                toast.error(result.error || 'Gagal mengubah peran.');
            }
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : 'Error.');
        } finally {
            setUpdatingUid(null);
        }
    };

    const handleDeptSave = async (targetUid: string) => {
        if (!user) return;
        try {
            setUpdatingUid(targetUid);
            const result = await updateUserDepartment(
                targetUid, deptValue.trim(),
                user.uid, user.displayName || 'Unknown Admin'
            );
            if (result.success) {
                toast.success('Departemen berhasil diperbarui!');
                setUsers(prev => prev.map(u => u.uid === targetUid ? { ...u, department: deptValue.trim() } : u));
                setEditingDeptUid(null);
            } else {
                toast.error(result.error || 'Gagal mengubah departemen.');
            }
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : 'Error.');
        } finally {
            setUpdatingUid(null);
        }
    };

    const handleJobSave = async (targetUid: string) => {
        if (!user) return;
        try {
            setUpdatingUid(targetUid);
            const result = await updateUserJobTitle(
                targetUid, jobValue.trim(),
                user.uid, user.displayName || 'Unknown Admin'
            );
            if (result.success) {
                toast.success('Jabatan berhasil diperbarui!');
                setUsers(prev => prev.map(u => u.uid === targetUid ? { ...u, jobTitle: jobValue.trim() } : u));
                setEditingJobUid(null);
            } else {
                toast.error(result.error || 'Gagal mengubah jabatan.');
            }
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : 'Error.');
        } finally {
            setUpdatingUid(null);
        }
    };

    const handleStatusToggle = async (targetUid: string, newStatus: boolean) => {
        if (!user) return;
        try {
            setUpdatingUid(targetUid);
            const result = await toggleUserStatus(
                targetUid, newStatus,
                user.uid, user.displayName || 'Unknown Admin'
            );
            if (result.success) {
                toast.success(newStatus ? 'Pengguna diaktifkan.' : 'Pengguna dinonaktifkan.');
                setUsers(prev => prev.map(u => u.uid === targetUid ? { ...u, isActive: newStatus } : u));
            } else {
                toast.error(result.error || 'Gagal mengubah status.');
            }
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : 'Error.');
        } finally {
            setUpdatingUid(null);
        }
    };

    const handleSync = async () => {
        if (!user) return;
        try {
            setSyncLoading(true);
            const result = await syncUsersFromWorkspace(user.uid);
            if (result.success && result.data) {
                toast.success(`Sync selesai: ${result.data.synced} user di-sync, ${result.data.created} baru, ${result.data.updated} diperbarui.`);
                // Refresh user list
                const refreshResult = await listAllUsers(user.uid);
                if (refreshResult.success && refreshResult.data) setUsers(refreshResult.data);
            } else {
                toast.error(result.error || 'Sync gagal.');
            }
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : 'Error saat sync.');
        } finally {
            setSyncLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-4">
                    {[1, 2, 3, 4].map(i => (
                        <Card key={i} className="border-none shadow-sm outline outline-1 outline-slate-200">
                            <CardContent className="pt-6"><Skeleton className="h-16 w-full" /></CardContent>
                        </Card>
                    ))}
                </div>
                <Card className="border-none shadow-sm"><CardContent className="pt-6"><div className="space-y-4">
                    {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-14 w-full" />)}
                </div></CardContent></Card>
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-red-600 bg-red-50 p-4 rounded-lg flex items-center gap-3 border border-red-100">
                <Info className="w-5 h-5 flex-shrink-0" />
                <p className="text-sm font-medium">{error}</p>
            </div>
        );
    }

    const statCards = [
        { title: 'Total Pengguna', value: users.length, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50', desc: 'Terdaftar di sistem' },
        { title: 'Super Admin', value: (roleStats['super_admin'] || 0) + (roleStats['admin'] || 0), icon: ShieldCheck, color: 'text-red-600', bg: 'bg-red-50', desc: 'Super Admin & Admin IT' },
        { title: 'Staf IT', value: roleStats['it_staff'] || 0, icon: UserCog, color: 'text-blue-600', bg: 'bg-blue-50', desc: 'Tim teknis IT' },
        { title: 'Pegawai & Manager', value: (roleStats['employee'] || 0) + (roleStats['manager'] || 0), icon: UserCheck, color: 'text-emerald-600', bg: 'bg-emerald-50', desc: 'End-user sistem' },
    ];

    return (
        <div className="space-y-6">
            {/* Stat Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {statCards.map((card, i) => {
                    const Icon = card.icon;
                    return (
                        <Card key={i} className="border-none shadow-sm outline outline-1 outline-slate-200">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium text-slate-600">{card.title}</CardTitle>
                                <div className={`${card.bg} p-2 rounded-lg`}><Icon className={`h-4 w-4 ${card.color}`} /></div>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{card.value}</div>
                                <p className="text-xs text-slate-500 mt-1">{card.desc}</p>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {/* Main Table Card */}
            <Card className="border-none shadow-sm outline outline-1 outline-slate-200">
                <CardHeader className="pb-3 border-b mb-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                            <CardTitle className="text-xl flex items-center gap-2">
                                <Shield className="w-5 h-5 text-slate-500" />
                                Manajemen Pengguna (RBAC)
                            </CardTitle>
                            <CardDescription className="mt-1">
                                Atur hak akses dan departemen staf IT serta pegawai.
                            </CardDescription>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                            {isAdmin && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleSync}
                                    disabled={syncLoading}
                                    className="h-9 text-xs gap-1.5"
                                >
                                    <RefreshCw className={`h-3.5 w-3.5 ${syncLoading ? 'animate-spin' : ''}`} />
                                    {syncLoading ? 'Syncing...' : 'Sync Workspace'}
                                </Button>
                            )}
                            <Select value={roleFilter} onValueChange={setRoleFilter}>
                                <SelectTrigger className="w-[140px] h-9 text-xs bg-white">
                                    <SelectValue placeholder="Semua Peran" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Semua Peran</SelectItem>
                                    <SelectItem value="super_admin">Super Admin</SelectItem>
                                    <SelectItem value="admin">Admin IT</SelectItem>
                                    <SelectItem value="it_staff">Staf IT</SelectItem>
                                    <SelectItem value="manager">Manager</SelectItem>
                                    <SelectItem value="employee">Pegawai</SelectItem>
                                </SelectContent>
                            </Select>
                            <Select value={deptFilter} onValueChange={setDeptFilter}>
                                <SelectTrigger className="w-[150px] h-9 text-xs bg-white">
                                    <SelectValue placeholder="Semua Departemen" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Semua Departemen</SelectItem>
                                    {[...new Set(users.map(u => u.department).filter(Boolean))].sort().map(d => (
                                        <SelectItem key={d} value={d}>{d}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <div className="relative w-full sm:w-[240px]">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <Input
                                    placeholder="Cari nama, email, departemen..."
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    className="pl-9 h-9 bg-white"
                                />
                            </div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border bg-white">
                        <Table>
                            <TableHeader className="bg-slate-50">
                                <TableRow>
                                    <TableHead className="font-semibold text-slate-600 w-[250px]">Pengguna</TableHead>
                                    <TableHead className="font-semibold text-slate-600">Departemen</TableHead>
                                    <TableHead className="font-semibold text-slate-600">Jabatan</TableHead>
                                    <TableHead className="font-semibold text-slate-600 w-[70px] text-center">Status</TableHead>
                                    <TableHead className="font-semibold text-slate-600">Terdaftar</TableHead>
                                    <TableHead className="font-semibold text-slate-600">Peran</TableHead>
                                    <TableHead className="text-right font-semibold text-slate-600 w-[160px]">Ubah Peran</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredUsers.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                                            {searchQuery ? 'Tidak ada pengguna yang cocok dengan pencarian.' : 'Belum ada pengguna terdaftar.'}
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredUsers.map((u) => (
                                        <TableRow key={u.uid}>
                                            {/* User Info with Avatar */}
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <Avatar className="h-9 w-9 shrink-0">
                                                        {u.photoURL && <AvatarImage src={u.photoURL} alt={u.displayName} />}
                                                        <AvatarFallback className="text-xs bg-slate-100 text-slate-600 font-medium">
                                                            {u.displayName?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U'}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <div className="flex flex-col min-w-0">
                                                        <span className="font-medium text-slate-900 truncate">{u.displayName}</span>
                                                        <span className="text-xs text-slate-500 truncate">{u.email}</span>
                                                    </div>
                                                </div>
                                            </TableCell>

                                            {/* Department */}
                                            <TableCell>
                                                {editingDeptUid === u.uid ? (
                                                    <div className="flex items-center gap-1">
                                                        <Input
                                                            value={deptValue}
                                                            onChange={e => setDeptValue(e.target.value)}
                                                            className="h-7 text-xs w-[120px]"
                                                            placeholder="Departemen"
                                                            autoFocus
                                                            onKeyDown={e => { if (e.key === 'Enter') handleDeptSave(u.uid); if (e.key === 'Escape') setEditingDeptUid(null); }}
                                                        />
                                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDeptSave(u.uid)} disabled={updatingUid === u.uid}>
                                                            {updatingUid === u.uid ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3 text-emerald-600" />}
                                                        </Button>
                                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingDeptUid(null)}>
                                                            <X className="h-3 w-3 text-slate-400" />
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-1 group">
                                                        <span className="text-sm text-slate-600">{u.department || <span className="text-slate-400 italic">Belum diset</span>}</span>
                                                        {isAdmin && (
                                                            <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                                                onClick={() => { setEditingDeptUid(u.uid); setDeptValue(u.department || ''); }}>
                                                                <Pencil className="h-3 w-3 text-slate-400" />
                                                            </Button>
                                                        )}
                                                    </div>
                                                )}
                                            </TableCell>

                                            {/* Job Title */}
                                            <TableCell>
                                                {editingJobUid === u.uid ? (
                                                    <div className="flex items-center gap-1">
                                                        <Input
                                                            value={jobValue}
                                                            onChange={e => setJobValue(e.target.value)}
                                                            className="h-7 text-xs w-[120px]"
                                                            placeholder="Jabatan"
                                                            autoFocus
                                                            onKeyDown={e => { if (e.key === 'Enter') handleJobSave(u.uid); if (e.key === 'Escape') setEditingJobUid(null); }}
                                                        />
                                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleJobSave(u.uid)} disabled={updatingUid === u.uid}>
                                                            {updatingUid === u.uid ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3 text-emerald-600" />}
                                                        </Button>
                                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingJobUid(null)}>
                                                            <X className="h-3 w-3 text-slate-400" />
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-1 group">
                                                        <span className="text-sm text-slate-600">{u.jobTitle || <span className="text-slate-400 italic">Belum diset</span>}</span>
                                                        {isAdmin && (
                                                            <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                                                onClick={() => { setEditingJobUid(u.uid); setJobValue(u.jobTitle || ''); }}>
                                                                <Pencil className="h-3 w-3 text-slate-400" />
                                                            </Button>
                                                        )}
                                                    </div>
                                                )}
                                            </TableCell>

                                            {/* Status Toggle */}
                                            <TableCell className="text-center">
                                                <Switch
                                                    checked={u.isActive}
                                                    onCheckedChange={(checked) => handleStatusToggle(u.uid, checked)}
                                                    disabled={!isAdmin || updatingUid === u.uid || (u.uid === user?.uid)}
                                                    className="data-[state=checked]:bg-emerald-500"
                                                />
                                            </TableCell>

                                            {/* Registration Date */}
                                            <TableCell className="text-slate-600 text-sm">
                                                {u.creationTime ? format(new Date(u.creationTime), 'd MMM yy', { locale: localeId }) : '-'}
                                            </TableCell>

                                            {/* Role Badge */}
                                            <TableCell>
                                                <Badge className={`font-medium ${roleColors[u.role]}`} variant="secondary">
                                                    {roleLabels[u.role]}
                                                </Badge>
                                            </TableCell>

                                            {/* Role Dropdown */}
                                            <TableCell className="text-right">
                                                <div className="flex justify-end items-center">
                                                    {updatingUid === u.uid && editingDeptUid !== u.uid ? (
                                                        <Loader2 className="w-5 h-5 animate-spin text-slate-400 mr-2" />
                                                    ) : (
                                                        <Select
                                                            value={u.role}
                                                            onValueChange={(val) => handleRoleChange(u.uid, val)}
                                                            disabled={!isSuperAdmin || (u.uid === user?.uid && u.role === 'super_admin')}
                                                        >
                                                            <SelectTrigger className="w-[140px] h-8 text-xs">
                                                                <SelectValue placeholder="Pilih Role" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="super_admin">Super Admin</SelectItem>
                                                                <SelectItem value="admin">Admin IT</SelectItem>
                                                                <SelectItem value="it_staff">Staf IT</SelectItem>
                                                                <SelectItem value="manager">Manager</SelectItem>
                                                                <SelectItem value="employee">Pegawai</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                    {filteredUsers.length > 0 && (
                        <p className="text-xs text-slate-500 mt-3">
                            Menampilkan {filteredUsers.length} dari {users.length} pengguna
                        </p>
                    )}
                    {!isSuperAdmin && (
                        <p className="text-xs text-amber-600 mt-4 flex items-center gap-2 bg-amber-50 p-3 rounded-lg border border-amber-100">
                            <Info className="w-4 h-4 shrink-0" />
                            Hanya <strong>Super Admin</strong> yang diperbolehkan mengubah peran pengguna. Anda hanya dapat melihat dan mengelola departemen.
                        </p>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
