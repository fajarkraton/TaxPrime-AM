const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

const layout = (content: string) => `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:24px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
  <tr><td style="background:linear-gradient(135deg,#3b82f6,#6366f1);padding:20px 28px;">
    <h1 style="margin:0;color:#fff;font-size:18px;letter-spacing:0.5px;">📦 TaxPrime AM</h1>
  </td></tr>
  <tr><td style="padding:28px;">${content}</td></tr>
  <tr><td style="padding:12px 28px 20px;border-top:1px solid #e2e8f0;text-align:center;">
    <p style="margin:0;color:#94a3b8;font-size:11px;">IT Asset Management System — TaxPrime &copy; ${new Date().getFullYear()}</p>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;

const btn = (label: string, url: string) =>
    `<a href="${url}" style="display:inline-block;background:#3b82f6;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;margin-top:16px;">${label}</a>`;

const badge = (text: string, color: string) =>
    `<span style="display:inline-block;background:${color};color:#fff;padding:3px 10px;border-radius:12px;font-size:12px;font-weight:600;">${text}</span>`;

// ─────────────────────────────────────────────
// 1. Asset Assignment
// ─────────────────────────────────────────────
export function assetAssignedEmail(data: {
    userName: string;
    assetCode: string;
    assetName: string;
    category: string;
    brand: string;
    model: string;
    department: string;
}) {
    const subject = `[TaxPrime AM] Aset Baru Ditetapkan: ${data.assetCode}`;
    const html = layout(`
        <h2 style="margin:0 0 8px;color:#1e293b;font-size:20px;">Aset Baru Ditetapkan ke Anda</h2>
        <p style="color:#64748b;margin:0 0 20px;">Halo ${data.userName}, aset berikut telah ditetapkan kepada Anda:</p>
        <table width="100%" style="border-collapse:collapse;">
            <tr><td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;color:#64748b;font-size:13px;width:140px;">Kode Aset</td><td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;font-weight:600;font-family:monospace;">${data.assetCode}</td></tr>
            <tr><td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;color:#64748b;font-size:13px;">Nama Aset</td><td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;font-weight:600;">${data.assetName}</td></tr>
            <tr><td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;color:#64748b;font-size:13px;">Kategori</td><td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;">${data.category}</td></tr>
            <tr><td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;color:#64748b;font-size:13px;">Merk / Model</td><td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;">${data.brand} ${data.model}</td></tr>
            <tr><td style="padding:8px 12px;color:#64748b;font-size:13px;">Departemen</td><td style="padding:8px 12px;">${data.department}</td></tr>
        </table>
        <p style="color:#64748b;font-size:13px;margin-top:16px;">Mohon jaga aset ini dengan baik. Hubungi IT untuk pertanyaan.</p>
    `);
    return { subject, html };
}

// ─────────────────────────────────────────────
// 2. Asset Return
// ─────────────────────────────────────────────
export function assetReturnedEmail(data: {
    userName: string;
    assetCode: string;
    assetName: string;
}) {
    const subject = `[TaxPrime AM] Aset Dikembalikan: ${data.assetCode}`;
    const html = layout(`
        <h2 style="margin:0 0 8px;color:#1e293b;font-size:20px;">Aset Telah Dikembalikan</h2>
        <p style="color:#64748b;margin:0 0 16px;">Halo ${data.userName}, aset berikut telah dicabut dari akun Anda:</p>
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;">
            <p style="margin:0;"><strong>${data.assetCode}</strong> — ${data.assetName}</p>
        </div>
        <p style="color:#64748b;font-size:13px;margin-top:16px;">Jika Anda memiliki pertanyaan, hubungi IT Support.</p>
    `);
    return { subject, html };
}

// ─────────────────────────────────────────────
// 3. Ticket Created
// ─────────────────────────────────────────────
export function ticketCreatedEmail(data: {
    userName: string;
    ticketNumber: string;
    title: string;
    category: string;
    priority: string;
    slaHours: number;
}) {
    const priorityColors: Record<string, string> = {
        critical: '#dc2626', high: '#f97316', medium: '#eab308', low: '#94a3b8'
    };
    const subject = `[TaxPrime AM] Tiket Dibuat: ${data.ticketNumber}`;
    const html = layout(`
        <h2 style="margin:0 0 8px;color:#1e293b;font-size:20px;">Tiket Berhasil Dibuat</h2>
        <p style="color:#64748b;margin:0 0 20px;">Halo ${data.userName}, tiket Anda telah berhasil dibuat:</p>
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;">
            <p style="margin:0 0 8px;font-family:monospace;font-size:14px;font-weight:700;">${data.ticketNumber}</p>
            <p style="margin:0 0 8px;font-size:16px;font-weight:600;color:#1e293b;">${data.title}</p>
            <p style="margin:0;">
                ${badge(data.category, '#6366f1')}
                ${badge(data.priority, priorityColors[data.priority] || '#94a3b8')}
            </p>
        </div>
        <p style="color:#64748b;font-size:13px;margin-top:16px;">⏱ Target penyelesaian SLA: <strong>${data.slaHours} jam</strong></p>
        ${btn('Lihat Tiket', `${BASE_URL}/tickets`)}
    `);
    return { subject, html };
}

// ─────────────────────────────────────────────
// 4. Ticket Status Update
// ─────────────────────────────────────────────
export function ticketStatusUpdateEmail(data: {
    userName: string;
    ticketNumber: string;
    title: string;
    oldStatus: string;
    newStatus: string;
    ticketId: string;
}) {
    const statusLabels: Record<string, string> = {
        open: 'Buka', in_progress: 'Sedang Dikerjakan', waiting_parts: 'Menunggu Sparepart',
        resolved: 'Selesai', confirmed: 'Terkonfirmasi', closed: 'Ditutup',
    };
    const subject = `[TaxPrime AM] Status Tiket Diperbarui: ${data.ticketNumber}`;
    const html = layout(`
        <h2 style="margin:0 0 8px;color:#1e293b;font-size:20px;">Status Tiket Diperbarui</h2>
        <p style="color:#64748b;margin:0 0 20px;">Halo ${data.userName}, tiket Anda telah diperbarui:</p>
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;">
            <p style="margin:0 0 8px;font-family:monospace;font-weight:700;">${data.ticketNumber} — ${data.title}</p>
            <p style="margin:0;">
                ${badge(statusLabels[data.oldStatus] || data.oldStatus, '#94a3b8')}
                <span style="margin:0 8px;color:#64748b;">→</span>
                ${badge(statusLabels[data.newStatus] || data.newStatus, '#3b82f6')}
            </p>
        </div>
        ${data.newStatus === 'resolved' ? `<p style="color:#059669;font-size:14px;margin-top:16px;font-weight:600;">✅ Tiket telah diselesaikan. Silakan konfirmasi atau reopen jika masih ada masalah.</p>` : ''}
        ${btn('Lihat Detail Tiket', `${BASE_URL}/tickets/${data.ticketId}`)}
    `);
    return { subject, html };
}

// ─────────────────────────────────────────────
// 5. Subscription Expiry Reminder
// ─────────────────────────────────────────────
export function subscriptionExpiryEmail(data: {
    adminName: string;
    subscriptionName: string;
    provider: string;
    expiryDate: string;
    daysLeft: number;
    costPerPeriod: number;
    billingCycle: string;
    subscriptionId: string;
}) {
    const urgencyColor = data.daysLeft <= 7 ? '#dc2626' : data.daysLeft <= 14 ? '#f97316' : '#eab308';
    const formatCurrency = (val: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);

    const subject = `[TaxPrime AM] ⚠️ Langganan Akan Habis: ${data.subscriptionName} (${data.daysLeft} hari lagi)`;
    const html = layout(`
        <h2 style="margin:0 0 8px;color:#1e293b;font-size:20px;">⚠️ Langganan Mendekati Kadaluarsa</h2>
        <p style="color:#64748b;margin:0 0 20px;">Halo ${data.adminName}, langganan berikut akan berakhir dalam <strong style="color:${urgencyColor};">${data.daysLeft} hari</strong>:</p>
        <table width="100%" style="border-collapse:collapse;">
            <tr><td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;color:#64748b;font-size:13px;width:140px;">Langganan</td><td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;font-weight:600;">${data.subscriptionName}</td></tr>
            <tr><td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;color:#64748b;font-size:13px;">Provider</td><td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;">${data.provider}</td></tr>
            <tr><td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;color:#64748b;font-size:13px;">Jatuh Tempo</td><td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;font-weight:600;color:${urgencyColor};">${data.expiryDate}</td></tr>
            <tr><td style="padding:8px 12px;color:#64748b;font-size:13px;">Biaya</td><td style="padding:8px 12px;">${formatCurrency(data.costPerPeriod)} / ${data.billingCycle}</td></tr>
        </table>
        <p style="color:#64748b;font-size:13px;margin-top:16px;">Segera lakukan perpanjangan untuk menghindari gangguan layanan.</p>
        ${btn('Lihat Langganan', `${BASE_URL}/subscriptions/${data.subscriptionId}`)}
    `);
    return { subject, html };
}
