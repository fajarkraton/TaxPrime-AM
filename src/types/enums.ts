// ── Asset ──────────────────────────────────────────────────────

/** Kategori aset IT */
export enum AssetCategory {
    COMPUTER = 'computer',
    LAPTOP = 'laptop',
    PRINTER = 'printer',
    MONITOR = 'monitor',
    NETWORK = 'network',
    PERIPHERAL = 'peripheral',
    STORAGE = 'storage',
    SERVER = 'server',
    CABLE = 'cable',
    SOFTWARE = 'software',
    SUBSCRIPTION = 'subscription',
    CLOUD = 'cloud',
    SECURITY = 'security',
    DOMAIN = 'domain',
    DEVTOOLS = 'devtools',
    DATABASE = 'database'
}

/** Tipe aset */
export enum AssetType {
    TANGIBLE = 'tangible',
    INTANGIBLE = 'intangible'
}

/** Status lifecycle aset */
export enum AssetStatus {
    PROCUREMENT = 'procurement',
    IN_STOCK = 'in_stock',
    DEPLOYED = 'deployed',
    MAINTENANCE = 'maintenance',
    RESERVED = 'reserved',
    RETIRED = 'retired',
    LOST = 'lost'
}

/** Kondisi fisik aset (tangible only) */
export type AssetCondition =
    | 'excellent' | 'good' | 'fair' | 'poor' | 'damaged';

// ── Service Ticket ─────────────────────────────────────────────

/** Kategori ticket */
export type TicketCategory =
    | 'hardware_repair' | 'software_issue' | 'replacement' | 'new_request';

/** Prioritas ticket */
export type TicketPriority = 'low' | 'medium' | 'high' | 'critical';

/** Status ticket */
export type TicketStatus =
    | 'open' | 'in_progress' | 'waiting_parts' | 'resolved' | 'closed';

// ── Subscription ───────────────────────────────────────────────

/** Tipe lisensi */
export type LicenseType = 'per_user' | 'per_device' | 'site' | 'enterprise';

/** Siklus billing */
export type BillingCycle = 'monthly' | 'quarterly' | 'annually';

/** Status subscription */
export type SubscriptionStatus =
    | 'active' | 'expiring_soon' | 'expired' | 'cancelled';

// ── User ───────────────────────────────────────────────────────

/** Role pengguna (RBAC) */
export type UserRole =
    | 'super_admin' | 'admin' | 'it_staff' | 'manager' | 'employee';

// ── Hardware Spec ──────────────────────────────────────────────

/** Tipe GPU */
export type GpuType = 'integrated' | 'discrete';

/** Status enkripsi */
export type EncryptionStatus = 'active' | 'inactive' | 'not_supported';

/** Tipe OS License */
export type OsLicenseType = 'OEM' | 'Retail' | 'Volume' | 'Subscription';

// ── Audit ──────────────────────────────────────────────────────

/** Aksi audit trail */
export type AuditAction =
    | 'created' | 'updated' | 'assigned' | 'returned'
    | 'maintenance' | 'retired' | 'lost' | 'found';

// ── Report ─────────────────────────────────────────────────────

/** Tipe report */
export type ReportType =
    | 'asset_summary' | 'subscription_cost' | 'ticket_analytics'
    | 'asset_assignment' | 'depreciation' | 'vendor_performance' | 'audit_trail';
