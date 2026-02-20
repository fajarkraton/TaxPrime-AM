'use client';

import { useMemo } from 'react';
import { useAuth } from './use-auth';
import type { UserRole } from '../types';

type Permission =
    | 'asset:create' | 'asset:edit' | 'asset:delete' | 'asset:assign'
    | 'asset:view_all' | 'asset:view_dept' | 'asset:view_own'
    | 'ticket:create' | 'ticket:handle' | 'ticket:view_all'
    | 'subscription:manage' | 'subscription:view'
    | 'report:view' | 'report:export'
    | 'user:manage' | 'system:config';

/** Matrix permission per role */
const PERMISSION_MATRIX: Record<Permission, UserRole[]> = {
    'asset:create': ['super_admin', 'admin'],
    'asset:edit': ['super_admin', 'admin', 'it_staff'],
    'asset:delete': ['super_admin', 'admin'],
    'asset:assign': ['super_admin', 'admin', 'it_staff'],
    'asset:view_all': ['super_admin', 'admin', 'it_staff'],
    'asset:view_dept': ['super_admin', 'admin', 'it_staff', 'manager'],
    'asset:view_own': ['super_admin', 'admin', 'it_staff', 'manager', 'employee'],
    'ticket:create': ['super_admin', 'admin', 'it_staff', 'manager', 'employee'],
    'ticket:handle': ['super_admin', 'admin', 'it_staff'],
    'ticket:view_all': ['super_admin', 'admin', 'it_staff'],
    'subscription:manage': ['super_admin', 'admin'],
    'subscription:view': ['super_admin', 'admin', 'it_staff', 'manager'],
    'report:view': ['super_admin', 'admin', 'it_staff', 'manager'],
    'report:export': ['super_admin', 'admin', 'it_staff', 'manager'],
    'user:manage': ['super_admin', 'admin'],
    'system:config': ['super_admin'],
};

/**
 * Hook untuk cek permission berdasarkan RBAC
 */
export function useRBAC() {
    const { role } = useAuth();

    const permissions = useMemo(() => ({
        /** Cek apakah role memiliki permission tertentu */
        can: (permission: Permission): boolean => {
            if (!role) return false;
            return PERMISSION_MATRIX[permission]?.includes(role) ?? false;
        },
        isSuperAdmin: role === 'super_admin',
        isAdmin: role === 'admin' || role === 'super_admin',
        isITStaff: role === 'it_staff' || role === 'admin' || role === 'super_admin',
        isManager: role === 'manager',
        isEmployee: role === 'employee',
    }), [role]);

    return permissions;
}
