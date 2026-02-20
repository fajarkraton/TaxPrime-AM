'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthContext } from '@/lib/firebase/auth-provider';
import { useFirestoreCollection } from '@/hooks/use-firestore-collection';
import { addTicketComment } from '@/app/actions/ticket-comments';
import { updateTicketStatus, rateTicket } from '@/app/actions/ticket-status';
import { assignTicketTech } from '@/app/actions/ticket-assign';
import { deleteTicketComment } from '@/app/actions/ticket-delete-comment';
import { updateTicketPriority } from '@/app/actions/ticket-priority';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    User, Clock, AlertTriangle, MessageSquare, Send,
    CheckCircle2, RotateCcw, Star, ShieldCheck, UserCog, Timer,
    Paperclip, FileText, ExternalLink, X, Trash2, Lock,
    Printer, HandMetal, ChevronRight, Activity, Package,
     CircleDot,
} from 'lucide-react';
import { uploadFileToStorage } from '@/lib/firebase/storage';
import { toast } from 'sonner';

import type { ServiceTicket, TicketComment } from '@/types/service-ticket';

// ── Helper: Parse Timestamp ──
function parseTimestamp(ts: unknown): Date | null {
    if (!ts) return null;
    if (typeof ts === 'string') return new Date(ts);
    if (typeof ts === 'object' && ts !== null && 'toDate' in ts) {
        return (ts as { toDate: () => Date }).toDate();
    }
    if (ts instanceof Date) return ts;
    return null;
}

// ── Helper: Priority Badge ──
const getPriorityBadge = (priority: string) => {
    switch (priority) {
        case 'critical': return <Badge variant="destructive" className="flex gap-1 items-center"><AlertTriangle className="w-3 h-3" /> Kritis</Badge>;
        case 'high': return <Badge className="bg-orange-500 hover:bg-orange-600">Tinggi</Badge>;
        case 'medium': return <Badge className="bg-yellow-500 hover:bg-yellow-600 text-white">Sedang</Badge>;
        case 'low': return <Badge variant="secondary">Rendah</Badge>;
        default: return <Badge variant="outline">{priority}</Badge>;
    }
};

// ── Helper: Status Badge ──
const getStatusBadge = (status: string) => {
    switch (status) {
        case 'open': return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Terbuka</Badge>;
        case 'in_progress': return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200"><Clock className="w-3 h-3 mr-1" /> Dalam Proses</Badge>;
        case 'waiting_parts': return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200"><Timer className="w-3 h-3 mr-1" /> Menunggu Sparepart</Badge>;
        case 'resolved': return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200"><CheckCircle2 className="w-3 h-3 mr-1" /> Selesai</Badge>;
        case 'closed': return <Badge variant="secondary"><ShieldCheck className="w-3 h-3 mr-1" /> Ditutup</Badge>;
        default: return <Badge variant="outline">{status}</Badge>;
    }
};

// ── Helper: Status Label ──
const STATUS_LABELS: Record<string, string> = {
    open: 'Terbuka',
    in_progress: 'Dalam Proses',
    waiting_parts: 'Menunggu Sparepart',
    resolved: 'Selesai',
    closed: 'Ditutup',
};

// ── Helper: Allowed Transitions ──
const ALLOWED_TRANSITIONS: Record<string, { value: string; label: string }[]> = {
    open: [{ value: 'in_progress', label: 'Mulai Proses' }],
    in_progress: [
        { value: 'waiting_parts', label: 'Menunggu Sparepart' },
        { value: 'resolved', label: 'Tandai Selesai' },
    ],
    waiting_parts: [{ value: 'in_progress', label: 'Lanjut Proses' }],
    resolved: [
        { value: 'closed', label: 'Konfirmasi Tutup' },
        { value: 'in_progress', label: 'Buka Kembali' },
    ],
};

// ── Helper: Status step order ──
const STATUS_STEPS = ['open', 'in_progress', 'resolved', 'closed'];

// ── Helper: SLA Countdown ──
interface SlaInfo {
    label: string;
    remaining: string;
    color: 'green' | 'yellow' | 'red';
    breached: boolean;
}

function getSlaInfo(targetTimestamp: unknown, met: boolean | null): SlaInfo | null {
    if (!targetTimestamp) return null;

    let targetDate: Date;
    try {
        if (typeof targetTimestamp === 'string') {
            targetDate = new Date(targetTimestamp);
        } else if (typeof targetTimestamp === 'object' && targetTimestamp !== null && 'toDate' in targetTimestamp) {
            targetDate = (targetTimestamp as { toDate: () => Date }).toDate();
        } else if (targetTimestamp instanceof Date) {
            targetDate = targetTimestamp;
        } else {
            return null;
        }
        if (isNaN(targetDate.getTime())) return null;
    } catch {
        return null;
    }

    const now = new Date();
    const diff = targetDate.getTime() - now.getTime();

    if (met === true) {
        return { label: 'Terpenuhi', remaining: '✓', color: 'green', breached: false };
    }
    if (met === false || diff <= 0) {
        const overMs = Math.abs(diff);
        return { label: 'Breach', remaining: `Terlewat ${formatPreciseDuration(overMs)}`, color: 'red', breached: true };
    }

    const totalMs = targetDate.getTime() - (now.getTime() - diff);
    const pctRemaining = diff / Math.max(totalMs, 1);
    const remaining = formatPreciseDuration(diff);

    if (pctRemaining < 0.1) {
        return { label: 'Kritis', remaining: `${remaining} tersisa`, color: 'red', breached: false };
    }
    if (pctRemaining < 0.5) {
        return { label: 'Segera', remaining: `${remaining} tersisa`, color: 'yellow', breached: false };
    }
    return { label: 'Aman', remaining: `${remaining} tersisa`, color: 'green', breached: false };
}

function formatPreciseDuration(ms: number): string {
    const totalSec = Math.floor(ms / 1000);
    const days = Math.floor(totalSec / 86400);
    const hrs = Math.floor((totalSec % 86400) / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    if (days > 0) return `${days}h ${hrs}j ${mins}m`;
    if (hrs > 0) return `${hrs}j ${mins}m ${secs}d`;
    if (mins > 0) return `${mins}m ${secs}d`;
    return `${secs}d`;
}

function SlaCountdownBadge({ info }: { info: SlaInfo }) {
    const colorClasses = {
        green: 'bg-green-50 text-green-700 border-green-200',
        yellow: 'bg-yellow-50 text-yellow-700 border-yellow-200 animate-pulse',
        red: 'bg-red-50 text-red-700 border-red-200',
    };

    return (
        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm ${colorClasses[info.color]}`}>
            <Timer className="w-4 h-4" />
            <div>
                <div className="font-semibold" suppressHydrationWarning>{info.label}</div>
                <div className="text-xs opacity-80 tabular-nums" suppressHydrationWarning>{info.remaining}</div>
            </div>
        </div>
    );
}

// ── Status Timeline Component ──
function StatusTimeline({ currentStatus }: { currentStatus: string }) {
    const currentIndex = STATUS_STEPS.indexOf(currentStatus);
    // Handle waiting_parts as between in_progress and resolved 
    const effectiveIndex = currentStatus === 'waiting_parts' ? 1 : currentIndex;

    return (
        <div className="flex items-center justify-between relative">
            {/* Connecting line */}
            <div className="absolute top-4 left-4 right-4 h-0.5 bg-slate-200 z-0" />
            <div
                className="absolute top-4 left-4 h-0.5 bg-violet-500 z-0 transition-all"
                style={{ width: `${Math.max(0, effectiveIndex / (STATUS_STEPS.length - 1)) * 100}%` }}
            />

            {STATUS_STEPS.map((step, idx) => {
                const isPast = idx < effectiveIndex;
                const isCurrent = idx === effectiveIndex;
                const labels: Record<string, string> = {
                    open: 'Terbuka',
                    in_progress: 'Proses',
                    resolved: 'Selesai',
                    closed: 'Ditutup',
                };
                return (
                    <div key={step} className="flex flex-col items-center z-10 relative">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${isPast
                            ? 'bg-violet-500 text-white'
                            : isCurrent
                                ? 'bg-violet-500 text-white ring-4 ring-violet-100'
                                : 'bg-slate-200 text-slate-400'
                            }`}>
                            {isPast ? '✓' : idx + 1}
                        </div>
                        <span className={`text-[10px] mt-1.5 font-medium ${isCurrent ? 'text-violet-700' : isPast ? 'text-slate-600' : 'text-slate-400'}`}>
                            {labels[step]}
                        </span>
                        {currentStatus === 'waiting_parts' && step === 'in_progress' && (
                            <span className="text-[9px] text-purple-600 font-medium mt-0.5">Menunggu</span>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

// ── Main Component ──
export function TicketDetailClient({ ticket, ticketId }: { ticket: ServiceTicket; ticketId: string }) {
    const { user, claims } = useAuthContext() as unknown as {
        user: { uid: string; displayName: string };
        claims: { role?: string };
    };
    const router = useRouter();

    const [commentText, setCommentText] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [statusLoading, setStatusLoading] = useState(false);
    const [assignLoading, setAssignLoading] = useState(false);
    const [commentAttachments, setCommentAttachments] = useState<File[]>([]);
    const [isInternalNote, setIsInternalNote] = useState(false);
    const [deletingComment, setDeletingComment] = useState<string | null>(null);
    const commentFileRef = useRef<HTMLInputElement>(null);

    // Status update state
    const [selectedStatus, setSelectedStatus] = useState('');
    const [resolution, setResolution] = useState('');

    // Tech assignment state
    const [selectedTechId, setSelectedTechId] = useState('');
    const [showAssignPanel, setShowAssignPanel] = useState(false);

    // Priority state
    const [priorityLoading, setPriorityLoading] = useState(false);

    // Rating state
    const [showRating, setShowRating] = useState(false);
    const [ratingValue, setRatingValue] = useState(0);
    const [ratingSubmitting, setRatingSubmitting] = useState(false);

    // SLA countdown refresh
    const [, setTick] = useState(0);
    useEffect(() => {
        const interval = setInterval(() => setTick(t => t + 1), 30000);
        return () => clearInterval(interval);
    }, []);

    // Fetch comments
    const { data: commentsData, loading: loadingComments, refresh: refreshComments } = useFirestoreCollection({
        collectionPath: `serviceTickets/${ticketId}/comments`,
        pageSize: 50
    });
    const comments = commentsData as unknown as TicketComment[];

    // Fetch IT staff for assignment
    const { data: itStaff } = useFirestoreCollection<{ id: string; displayName: string; department: string }>({
        collectionPath: 'users',
        enabled: showAssignPanel,
    });
    const techUsers = itStaff.filter((u: Record<string, unknown>) =>
        ['it_staff', 'admin', 'super_admin'].includes(u.role as string)
    );

    // Fetch audit trail
    const { data: auditData } = useFirestoreCollection({
        collectionPath: 'auditTrails',
        pageSize: 100,
    });
    const auditEntries = useMemo(() => {
        return (auditData as unknown as Array<{
            id: string;
            entityId: string;
            entityType: string;
            action: string;
            actionByName: string;
            details: string;
            timestamp: { seconds: number } | string;
        }>)
            .filter(a => a.entityId === ticketId && a.entityType === 'ticket')
            .sort((a, b) => {
                const aTime = typeof a.timestamp === 'string' ? new Date(a.timestamp).getTime() : (a.timestamp?.seconds || 0) * 1000;
                const bTime = typeof b.timestamp === 'string' ? new Date(b.timestamp).getTime() : (b.timestamp?.seconds || 0) * 1000;
                return bTime - aTime;
            })
            .slice(0, 8);
    }, [auditData, ticketId]);

    const userRole = claims?.role || 'employee';
    const isITStaffOrAdmin = ['it_staff', 'admin', 'super_admin'].includes(userRole);
    const isRequester = user?.uid === ticket.requesterId;
    const canUpdateStatus = isITStaffOrAdmin && ticket.status !== 'closed';
    const canAssignTech = isITStaffOrAdmin && !['closed', 'resolved'].includes(ticket.status);
    const canConfirmOrReopen = isRequester && ticket.status === 'resolved';
    const isUnassigned = !ticket.assignedTechId;

    // Filter internal notes for non-IT users
    const visibleComments = useMemo(() => {
        if (isITStaffOrAdmin) return comments;
        return comments.filter(c => !c.isInternal);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [comments, isITStaffOrAdmin]);

    // SLA info
    const slaResponse = getSlaInfo(ticket.slaResponseTarget, ticket.slaResponseMet);
    const slaResolution = getSlaInfo(ticket.slaResolutionTarget, ticket.slaResolutionMet);

    // ── Handlers ──
    const handleAddComment = useCallback(async () => {
        if (!commentText.trim() && commentAttachments.length === 0) return;
        setIsSubmitting(true);
        try {
            let attachmentUrls: string[] = [];
            if (commentAttachments.length > 0) {
                const uploads = commentAttachments.map((file, idx) => {
                    const path = `tickets/${ticketId}/comments/${Date.now()}_${idx}_${file.name}`;
                    return uploadFileToStorage(file, path);
                });
                const results = await Promise.all(uploads);
                attachmentUrls = results.map(r => r.url);
            }
            await addTicketComment(
                ticketId,
                commentText.trim() || '(Lampiran)',
                user.uid,
                user.displayName || 'Unknown User',
                isInternalNote,
                attachmentUrls
            );
            setCommentText('');
            setCommentAttachments([]);
            setIsInternalNote(false);
            toast.success(isInternalNote ? 'Catatan internal ditambahkan' : 'Komentar dikirim');
        } catch (error) {
            console.error(error);
            toast.error('Gagal mengirim komentar');
        } finally {
            setIsSubmitting(false);
        }
    }, [commentText, commentAttachments, ticketId, user, isInternalNote]);

    const handleDeleteComment = async (commentId: string) => {
        setDeletingComment(commentId);
        try {
            const result = await deleteTicketComment(ticketId, commentId, user.uid, user.displayName || '', userRole);
            if (result.success) {
                toast.success('Komentar dihapus');
                refreshComments();
            } else {
                toast.error(result.error || 'Gagal menghapus komentar');
            }
        } catch {
            toast.error('Gagal menghapus komentar');
        } finally {
            setDeletingComment(null);
        }
    };

    const handleStatusUpdate = async () => {
        if (!selectedStatus) return;
        setStatusLoading(true);
        const res = await updateTicketStatus(
            ticketId, selectedStatus, user.uid, user.displayName || 'Unknown',
            selectedStatus === 'resolved' ? resolution : undefined
        );
        setStatusLoading(false);
        if (res.success) {
            setSelectedStatus('');
            setResolution('');
            toast.success(`Status diubah ke "${STATUS_LABELS[selectedStatus] || selectedStatus}"`);
            router.refresh();
        } else {
            toast.error(res.error || 'Gagal mengubah status');
        }
    };

    const handleConfirmClose = async () => {
        setStatusLoading(true);
        const res = await updateTicketStatus(ticketId, 'closed', user.uid, user.displayName || 'Unknown');
        setStatusLoading(false);
        if (res.success) {
            setShowRating(true);
            toast.success('Tiket ditutup');
            router.refresh();
        } else {
            toast.error(res.error || 'Gagal menutup tiket');
        }
    };

    const handleReopen = async () => {
        setStatusLoading(true);
        const res = await updateTicketStatus(ticketId, 'in_progress', user.uid, user.displayName || 'Unknown');
        setStatusLoading(false);
        if (res.success) {
            toast.success('Tiket dibuka kembali');
            router.refresh();
        } else {
            toast.error(res.error || 'Gagal membuka kembali tiket');
        }
    };

    const handleSelfAssign = async () => {
        setAssignLoading(true);
        const res = await assignTicketTech(ticketId, user.uid, user.displayName || 'Unknown', user.uid, user.displayName || 'Unknown');
        setAssignLoading(false);
        if (res.success) {
            toast.success('Tiket diambil!');
            router.refresh();
        } else {
            toast.error(res.error || 'Gagal mengambil tiket');
        }
    };

    const handleAssignTech = async () => {
        if (!selectedTechId) return;
        setAssignLoading(true);
        const tech = techUsers.find((u: { id: string }) => u.id === selectedTechId);
        const res = await assignTicketTech(ticketId, selectedTechId, tech?.displayName || 'Unknown', user.uid, user.displayName || 'Unknown');
        setAssignLoading(false);
        if (res.success) {
            setSelectedTechId('');
            setShowAssignPanel(false);
            toast.success(`Ditugaskan ke ${tech?.displayName}`);
            router.refresh();
        } else {
            toast.error(res.error || 'Gagal menugaskan tiket');
        }
    };

    const handlePriorityChange = async (newPriority: string) => {
        setPriorityLoading(true);
        const res = await updateTicketPriority(ticketId, newPriority, user.uid, user.displayName || 'Unknown');
        setPriorityLoading(false);
        if (res.success) {
            toast.success('Prioritas diubah');
            router.refresh();
        } else {
            toast.error(res.error || 'Gagal mengubah prioritas');
        }
    };

    const handleRate = async () => {
        if (ratingValue < 1) return;
        setRatingSubmitting(true);
        const res = await rateTicket(ticketId, ratingValue, user.uid);
        setRatingSubmitting(false);
        if (res.success) {
            setShowRating(false);
            toast.success('Rating dikirim. Terima kasih!');
            router.refresh();
        } else {
            toast.error(res.error || 'Gagal memberikan rating');
        }
    };

    const handlePrint = () => window.print();

    return (
        <div className="space-y-6">
            {/* ══════════ QUICK ACTION BAR ══════════ */}
            <div className="flex items-center justify-between flex-wrap gap-3 print:hidden">
                <div className="flex items-center gap-3 flex-wrap">
                    {getStatusBadge(ticket.status)}
                    {getPriorityBadge(ticket.priority)}
                    {ticket.assignedTechName && (
                        <Badge variant="outline" className="gap-1">
                            <User className="w-3 h-3" /> {ticket.assignedTechName}
                        </Badge>
                    )}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    {/* Self-assign */}
                    {isITStaffOrAdmin && isUnassigned && ticket.status !== 'closed' && (
                        <Button variant="default" size="sm" className="gap-2" onClick={handleSelfAssign} disabled={assignLoading}>
                            <HandMetal className="w-4 h-4" />
                            {assignLoading ? 'Mengambil...' : 'Ambil Tiket'}
                        </Button>
                    )}
                    {/* Quick status change */}
                    {canUpdateStatus && (ALLOWED_TRANSITIONS[ticket.status] || []).length > 0 && (
                        <>
                            {(ALLOWED_TRANSITIONS[ticket.status] || []).map(opt => (
                                <Button
                                    key={opt.value}
                                    variant={opt.value === 'resolved' ? 'default' : 'outline'}
                                    size="sm"
                                    className="gap-1.5"
                                    onClick={async () => {
                                        if (opt.value === 'resolved') {
                                            setSelectedStatus('resolved');
                                            // Scroll to resolution input
                                        } else {
                                            setStatusLoading(true);
                                            const res = await updateTicketStatus(ticketId, opt.value, user.uid, user.displayName || 'Unknown');
                                            setStatusLoading(false);
                                            if (res.success) {
                                                toast.success(`Status diubah ke "${STATUS_LABELS[opt.value]}"`);
                                                router.refresh();
                                            } else {
                                                toast.error(res.error || 'Gagal');
                                            }
                                        }
                                    }}
                                    disabled={statusLoading}
                                >
                                    <ChevronRight className="w-3.5 h-3.5" />
                                    {opt.label}
                                </Button>
                            ))}
                        </>
                    )}
                    <Button variant="outline" size="sm" className="gap-1.5" onClick={handlePrint}>
                        <Printer className="w-3.5 h-3.5" /> Cetak
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* ══════════ LEFT: Main content ══════════ */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Ticket Info Card */}
                    <Card className="border-none shadow-sm outline outline-1 outline-slate-200">
                        <CardHeader className="pb-4 border-b">
                            <div className="flex justify-between items-start mb-2">
                                <h2 className="text-2xl font-semibold">{ticket.title}</h2>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                                <span className="font-mono text-primary font-medium">{ticket.ticketNumber}</span>
                                <span>•</span>
                                <span className="flex items-center gap-1"><User className="w-3 h-3" /> {ticket.requesterName}</span>
                                {ticket.requesterDepartment && ticket.requesterDepartment !== '-' && (
                                    <>
                                        <span>•</span>
                                        <span>{ticket.requesterDepartment}</span>
                                    </>
                                )}
                                <span>•</span>
                                <span>{(() => { const d = parseTimestamp(ticket.createdAt); return d ? format(d, 'dd MMM yyyy, HH:mm', { locale: idLocale }) : '-'; })()}</span>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <div className="prose prose-sm max-w-none">
                                <p className="whitespace-pre-wrap">{ticket.description}</p>
                            </div>

                            {/* Linked Asset */}
                            {ticket.assetCode !== '-' && (
                                <Link href={ticket.assetRef ? `/assets/${ticket.assetRef}` : '#'}>
                                    <div className="mt-8 p-4 bg-slate-50 border rounded-lg hover:bg-slate-100 hover:border-blue-200 transition-all group cursor-pointer">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="bg-blue-50 p-2 rounded-lg group-hover:bg-blue-100 transition-colors">
                                                    <Package className="w-4 h-4 text-blue-600" />
                                                </div>
                                                <div>
                                                    <h4 className="text-sm font-semibold">Terkait Aset</h4>
                                                    <div className="text-sm text-slate-600">
                                                        {ticket.assetName} <span className="font-mono text-xs text-muted-foreground">({ticket.assetCode})</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <ExternalLink className="w-4 h-4 text-slate-300 group-hover:text-blue-500 transition-colors" />
                                        </div>
                                    </div>
                                </Link>
                            )}

                            {/* Resolution display */}
                            {ticket.resolution && (
                                <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                                    <h4 className="text-sm font-semibold text-green-800 mb-1 flex items-center gap-2">
                                        <CheckCircle2 className="w-4 h-4" /> Resolusi
                                    </h4>
                                    <p className="text-sm text-green-700 whitespace-pre-wrap">{ticket.resolution}</p>
                                </div>
                            )}

                            {/* Resolution input for resolved status */}
                            {selectedStatus === 'resolved' && (
                                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-3 print:hidden">
                                    <h4 className="text-sm font-semibold text-blue-800 flex items-center gap-2">
                                        <CheckCircle2 className="w-4 h-4" /> Masukkan Resolusi
                                    </h4>
                                    <Textarea
                                        placeholder="Jelaskan bagaimana masalah diselesaikan..."
                                        value={resolution}
                                        onChange={e => setResolution(e.target.value)}
                                        className="min-h-[80px] bg-white"
                                    />
                                    <div className="flex gap-2">
                                        <Button size="sm" onClick={handleStatusUpdate} disabled={!resolution.trim() || statusLoading}>
                                            {statusLoading ? 'Menyimpan...' : 'Konfirmasi Selesai'}
                                        </Button>
                                        <Button size="sm" variant="outline" onClick={() => { setSelectedStatus(''); setResolution(''); }}>
                                            Batal
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {/* Rating display */}
                            {ticket.rating && (
                                <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                                    <span>Rating:</span>
                                    {[1, 2, 3, 4, 5].map(i => (
                                        <Star key={i} className={`w-4 h-4 ${i <= ticket.rating! ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Requester: Confirm / Reopen */}
                    {canConfirmOrReopen && (
                        <Card className="border-none shadow-sm outline outline-1 outline-green-200 bg-green-50/30 print:hidden">
                            <CardContent className="pt-6">
                                <h3 className="text-sm font-semibold mb-3">Apakah masalah Anda sudah terselesaikan?</h3>
                                <div className="flex gap-3">
                                    <Button onClick={handleConfirmClose} disabled={statusLoading} className="bg-green-600 hover:bg-green-700">
                                        <CheckCircle2 className="w-4 h-4 mr-2" /> Ya, Konfirmasi Selesai
                                    </Button>
                                    <Button variant="outline" onClick={handleReopen} disabled={statusLoading}>
                                        <RotateCcw className="w-4 h-4 mr-2" /> Belum, Buka Kembali
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Rating prompt */}
                    {showRating && (
                        <Card className="border-none shadow-sm outline outline-1 outline-yellow-200 bg-yellow-50/30 print:hidden">
                            <CardContent className="pt-6">
                                <h3 className="text-sm font-semibold mb-3">Berikan rating untuk layanan ini (opsional)</h3>
                                <div className="flex items-center gap-1 mb-4">
                                    {[1, 2, 3, 4, 5].map(i => (
                                        <button key={i} onClick={() => setRatingValue(i)} className="p-1">
                                            <Star className={`w-6 h-6 cursor-pointer transition-colors ${i <= ratingValue ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300 hover:text-yellow-300'}`} />
                                        </button>
                                    ))}
                                </div>
                                <Button onClick={handleRate} disabled={ratingValue < 1 || ratingSubmitting} size="sm">
                                    {ratingSubmitting ? 'Menyimpan...' : 'Kirim Rating'}
                                </Button>
                            </CardContent>
                        </Card>
                    )}

                    {/* ══════════ COMMENTS THREAD ══════════ */}
                    <Card className="border-none shadow-sm outline outline-1 outline-slate-200">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <MessageSquare className="w-5 h-5" /> Diskusi & Lampiran
                                {comments.length > 0 && (
                                    <Badge variant="secondary" className="ml-2">{comments.length}</Badge>
                                )}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4 mb-6">
                                {loadingComments ? (
                                    <div className="space-y-4">
                                        <Skeleton className="h-16 w-full" />
                                        <Skeleton className="h-16 w-3/4" />
                                    </div>
                                ) : visibleComments.length === 0 ? (
                                    <div className="text-center py-6 text-muted-foreground text-sm">
                                        Belum ada diskusi untuk tiket ini.
                                    </div>
                                ) : (
                                    visibleComments.map(comment => {
                                        const isOwn = comment.authorId === user.uid;
                                        const canDelete = isOwn || isITStaffOrAdmin;
                                        const isDeleting = deletingComment === comment.id;

                                        return (
                                            <div key={comment.id} className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'} group`}>
                                                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                                                    <span className="font-medium text-foreground">{comment.authorName}</span>
                                                    {comment.isInternal && (
                                                        <Badge variant="outline" className="text-[10px] bg-purple-50 text-purple-600 border-purple-200 gap-0.5 px-1.5 py-0">
                                                            <Lock className="w-2.5 h-2.5" /> Internal
                                                        </Badge>
                                                    )}
                                                    <span>
                                                        {(() => { const d = parseTimestamp(comment.createdAt); return d ? format(d, 'dd MMM yyyy, HH:mm') : 'Baru saja'; })()}
                                                    </span>
                                                    {canDelete && (
                                                        <button
                                                            onClick={() => handleDeleteComment(comment.id)}
                                                            disabled={isDeleting}
                                                            className="opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-600 p-0.5"
                                                            title="Hapus komentar"
                                                        >
                                                            <Trash2 className="w-3 h-3" />
                                                        </button>
                                                    )}
                                                </div>
                                                <div className={`p-3 rounded-lg max-w-[80%] text-sm ${comment.isInternal
                                                    ? 'bg-purple-50 text-purple-900 border border-purple-200 rounded-tl-none'
                                                    : isOwn
                                                        ? 'bg-primary text-primary-foreground rounded-tr-none'
                                                        : 'bg-slate-100 text-slate-900 rounded-tl-none'
                                                    }`}>
                                                    <p className="whitespace-pre-wrap">{comment.content}</p>
                                                    {/* Comment attachments */}
                                                    {comment.attachmentUrls && comment.attachmentUrls.length > 0 && (
                                                        <div className="mt-2 pt-2 border-t border-black/10 space-y-1">
                                                            {comment.attachmentUrls.map((url, i) => {
                                                                const filename = decodeURIComponent(url.split('/').pop()?.split('?')[0] || `file_${i + 1}`);
                                                                return (
                                                                    <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                                                                        className={`flex items-center gap-1.5 text-xs ${isOwn ? 'text-primary-foreground/80 hover:text-primary-foreground' : 'text-blue-600 hover:underline'}`}>
                                                                        <FileText className="w-3 h-3" />
                                                                        <span className="truncate max-w-[200px]">{filename.replace(/^\d+_\d+_/, '')}</span>
                                                                        <ExternalLink className="w-3 h-3 shrink-0" />
                                                                    </a>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>

                            {/* Comment input */}
                            {ticket.status !== 'closed' && (
                                <div className="border-t pt-4 space-y-3 print:hidden">
                                    <Textarea
                                        placeholder={isInternalNote ? 'Catatan internal (hanya terlihat oleh IT Staff)...' : 'Tulis komentar atau status update...'}
                                        value={commentText}
                                        onChange={(e) => setCommentText(e.target.value)}
                                        className={`min-h-[100px] ${isInternalNote ? 'border-purple-300 bg-purple-50/30' : ''}`}
                                    />

                                    {/* Attachment preview */}
                                    {commentAttachments.length > 0 && (
                                        <div className="flex flex-wrap gap-2">
                                            {commentAttachments.map((f, i) => (
                                                <div key={i} className="flex items-center gap-1 text-xs bg-slate-100 rounded-full px-3 py-1">
                                                    <Paperclip className="w-3 h-3" />
                                                    <span className="truncate max-w-[120px]">{f.name}</span>
                                                    <button type="button" onClick={() => setCommentAttachments(prev => prev.filter((_, idx) => idx !== i))} className="text-red-500 ml-1">
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-2">
                                            <input ref={commentFileRef} type="file" multiple accept="image/*,.pdf,.doc,.docx,.txt" className="hidden"
                                                onChange={(e) => {
                                                    const files = Array.from(e.target.files || []);
                                                    setCommentAttachments(prev => [...prev, ...files].slice(0, 5));
                                                    if (commentFileRef.current) commentFileRef.current.value = '';
                                                }}
                                            />
                                            <Button type="button" variant="ghost" size="sm" onClick={() => commentFileRef.current?.click()}>
                                                <Paperclip className="w-4 h-4 mr-1" /> Lampiran
                                            </Button>
                                            {isITStaffOrAdmin && (
                                                <button
                                                    type="button"
                                                    onClick={() => setIsInternalNote(!isInternalNote)}
                                                    className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full transition-all ${isInternalNote
                                                        ? 'bg-purple-100 text-purple-700 ring-1 ring-purple-300'
                                                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                                        }`}
                                                >
                                                    <Lock className="w-3 h-3" />
                                                    Catatan Internal
                                                </button>
                                            )}
                                        </div>
                                        <Button onClick={handleAddComment} disabled={(!commentText.trim() && commentAttachments.length === 0) || isSubmitting}>
                                            <Send className="w-4 h-4 mr-2" />
                                            {isSubmitting ? 'Mengirim...' : isInternalNote ? 'Kirim Internal' : 'Kirim Komentar'}
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* ══════════ RIGHT: Sidebar ══════════ */}
                <div className="space-y-6 print:hidden">
                    {/* Status Timeline */}
                    <Card className="border-none shadow-sm outline outline-1 outline-slate-200">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base">Progress Tiket</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <StatusTimeline currentStatus={ticket.status} />
                        </CardContent>
                    </Card>

                    {/* Detail Status */}
                    <Card className="border-none shadow-sm outline outline-1 outline-slate-200">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base">Detail Tiket</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <div className="text-xs text-muted-foreground mb-1">Status Saat Ini</div>
                                {getStatusBadge(ticket.status)}
                            </div>
                            <div>
                                <div className="text-xs text-muted-foreground mb-1">Ditugaskan Kepada</div>
                                <div className="font-medium text-sm">
                                    {ticket.assignedTechName || <span className="text-muted-foreground italic">Belum ada</span>}
                                </div>
                            </div>
                            <div>
                                <div className="text-xs text-muted-foreground mb-1">Kategori</div>
                                <Badge variant="outline" className="capitalize">
                                    {ticket.category.replace('_', ' ')}
                                </Badge>
                            </div>
                            <div>
                                <div className="text-xs text-muted-foreground mb-1">Prioritas</div>
                                {isITStaffOrAdmin && ticket.status !== 'closed' ? (
                                    <Select
                                        value={ticket.priority}
                                        onValueChange={handlePriorityChange}
                                        disabled={priorityLoading}
                                    >
                                        <SelectTrigger className="h-8 w-full">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="critical">🔴 Kritis</SelectItem>
                                            <SelectItem value="high">🟠 Tinggi</SelectItem>
                                            <SelectItem value="medium">🟡 Sedang</SelectItem>
                                            <SelectItem value="low">⚪ Rendah</SelectItem>
                                        </SelectContent>
                                    </Select>
                                ) : (
                                    getPriorityBadge(ticket.priority)
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* IT Staff: Assign Tech Panel */}
                    {canAssignTech && (
                        <Card className="border-none shadow-sm outline outline-1 outline-slate-200">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <UserCog className="w-4 h-4" /> Tugaskan Teknisi
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {!showAssignPanel ? (
                                    <Button variant="outline" size="sm" className="w-full" onClick={() => setShowAssignPanel(true)}>
                                        {ticket.assignedTechName ? 'Ganti Teknisi' : 'Tugaskan Teknisi'}
                                    </Button>
                                ) : (
                                    <>
                                        <div>
                                            <Label className="text-xs">Pilih IT Staff</Label>
                                            <Select value={selectedTechId} onValueChange={setSelectedTechId}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Pilih teknisi..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {techUsers.map((u: { id: string; displayName: string; department: string }) => (
                                                        <SelectItem key={u.id} value={u.id}>
                                                            {u.displayName} — {u.department || 'IT'}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button size="sm" onClick={handleAssignTech} disabled={!selectedTechId || assignLoading} className="flex-1">
                                                {assignLoading ? 'Menyimpan...' : 'Konfirmasi'}
                                            </Button>
                                            <Button size="sm" variant="outline" onClick={() => setShowAssignPanel(false)}>
                                                Batal
                                            </Button>
                                        </div>
                                    </>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {/* SLA Card */}
                    <Card className="border-none shadow-sm outline outline-1 outline-slate-200">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base">Target SLA</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <div className="text-xs text-muted-foreground mb-2">Respon Awal</div>
                                {slaResponse ? (
                                    <SlaCountdownBadge info={slaResponse} />
                                ) : (
                                    <div className="text-sm text-muted-foreground">-</div>
                                )}
                            </div>
                            <div>
                                <div className="text-xs text-muted-foreground mb-2">Penyelesaian</div>
                                {slaResolution ? (
                                    <SlaCountdownBadge info={slaResolution} />
                                ) : (
                                    <div className="text-sm text-muted-foreground">-</div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Activity Log */}
                    <Card className="border-none shadow-sm outline outline-1 outline-slate-200">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base flex items-center gap-2">
                                <Activity className="w-4 h-4" /> Riwayat Aktivitas
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {auditEntries.length === 0 ? (
                                <p className="text-xs text-muted-foreground">Belum ada aktivitas.</p>
                            ) : (
                                <div className="space-y-3">
                                    {auditEntries.map((entry, idx) => {
                                        const ts = typeof entry.timestamp === 'string'
                                            ? new Date(entry.timestamp)
                                            : entry.timestamp?.seconds
                                                ? new Date(entry.timestamp.seconds * 1000)
                                                : null;

                                        return (
                                            <div key={entry.id} className="flex gap-3">
                                                <div className="flex flex-col items-center">
                                                    <CircleDot className={`w-3.5 h-3.5 shrink-0 ${idx === 0 ? 'text-violet-500' : 'text-slate-300'}`} />
                                                    {idx < auditEntries.length - 1 && (
                                                        <div className="w-px flex-1 bg-slate-200 mt-1" />
                                                    )}
                                                </div>
                                                <div className="pb-3 -mt-0.5">
                                                    <p className="text-xs text-slate-700 leading-snug">{entry.details}</p>
                                                    <p className="text-[10px] text-slate-400 mt-0.5">
                                                        {entry.actionByName} • {ts ? format(ts, 'dd MMM, HH:mm') : '-'}
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
