import { useState, useEffect } from 'react';

const API = '/api/v1/portal';

interface TicketType {
    id: number;
    ticket_number: string;
    subject: string;
    description?: string;
    status: string;
    priority: string;
    category?: string;
    ticket_type?: string;
    assigned_to_name?: string;
    estimated_hours?: number;
    actual_hours?: number;
    estimated_date?: string;
    created_at: string;
    updated_at?: string;
    closed_at?: string;
    comments?: CommentType[];
}

interface CommentType {
    id: number;
    content: string;
    comment_type?: string;
    created_at: string;
}

interface KpiData {
    total: number;
    by_status: Record<string, number>;
    by_type: Record<string, number>;
    total_estimated_hours: number;
    total_actual_hours: number;
    avg_hours_per_ticket: number;
    avg_resolution_days: number;
    resolved_count: number;
}

const statusConfig: Record<string, { label: string; color: string; bg: string; headerBg: string; icon: string }> = {
    open: { label: 'Abierto', color: 'text-yellow-700', bg: 'bg-yellow-50 border-yellow-200', headerBg: 'from-yellow-400 to-amber-500', icon: '📋' },
    in_progress: { label: 'En Progreso', color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200', headerBg: 'from-blue-400 to-blue-600', icon: '🔄' },
    pending: { label: 'Pendiente', color: 'text-orange-700', bg: 'bg-orange-50 border-orange-200', headerBg: 'from-orange-400 to-orange-600', icon: '⏳' },
    resolved: { label: 'Resuelto', color: 'text-green-700', bg: 'bg-green-50 border-green-200', headerBg: 'from-green-400 to-emerald-600', icon: '✅' },
    closed: { label: 'Cerrado', color: 'text-gray-700', bg: 'bg-gray-50 border-gray-200', headerBg: 'from-gray-400 to-gray-600', icon: '🔒' },
};

const priorityConfig: Record<string, { label: string; color: string; dot: string }> = {
    low: { label: 'Baja', color: 'text-green-600', dot: 'bg-green-400' },
    medium: { label: 'Media', color: 'text-yellow-600', dot: 'bg-yellow-400' },
    high: { label: 'Alta', color: 'text-orange-600', dot: 'bg-orange-400' },
    critical: { label: 'Crítica', color: 'text-red-600', dot: 'bg-red-500' },
};

const typeConfig: Record<string, { label: string; icon: string; color: string }> = {
    bug: { label: 'Bug', icon: '🐛', color: 'text-red-600 bg-red-50 border-red-200' },
    feature: { label: 'Requerimiento', icon: '✨', color: 'text-purple-600 bg-purple-50 border-purple-200' },
    consultation: { label: 'Consulta', icon: '💬', color: 'text-blue-600 bg-blue-50 border-blue-200' },
};

const KANBAN_COLUMNS = ['open', 'in_progress', 'pending', 'resolved', 'closed'];

export default function ClientPortal() {
    const [token, setToken] = useState<string | null>(localStorage.getItem('portal_token'));
    const [clientName, setClientName] = useState(localStorage.getItem('portal_client_name') || '');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loginError, setLoginError] = useState('');
    const [loginLoading, setLoginLoading] = useState(false);

    const [view, setView] = useState<'list' | 'kanban' | 'create' | 'detail' | 'kpis'>('list');
    const [tickets, setTickets] = useState<TicketType[]>([]);
    const [selectedTicket, setSelectedTicket] = useState<TicketType | null>(null);
    const [loading, setLoading] = useState(false);
    const [kpis, setKpis] = useState<KpiData | null>(null);

    // Create form
    const [subject, setSubject] = useState('');
    const [description, setDescription] = useState('');
    const [priority, setPriority] = useState('medium');
    const [ticketType, setTicketType] = useState('consultation');
    const [creating, setCreating] = useState(false);

    // Comment
    const [comment, setComment] = useState('');
    const [commenting, setCommenting] = useState(false);

    // Drag & Drop
    const [draggedTicket, setDraggedTicket] = useState<number | null>(null);
    const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

    // Status note modal
    const [statusNoteModal, setStatusNoteModal] = useState<{ticketId: number; targetStatus: string} | null>(null);
    const [statusNote, setStatusNote] = useState('');

    useEffect(() => {
        if (token) { fetchTickets(); fetchKpis(); }
    }, [token]);

    const headers = () => ({
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
    });

    async function handleLogin(e: React.FormEvent) {
        e.preventDefault();
        setLoginLoading(true);
        setLoginError('');
        try {
            const res = await fetch(`${API}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email.trim(), password }),
            });
            if (!res.ok) {
                const data = await res.json();
                setLoginError(data.detail || 'Error al iniciar sesión');
                return;
            }
            const data = await res.json();
            localStorage.setItem('portal_token', data.token);
            localStorage.setItem('portal_client_name', data.client_name);
            setToken(data.token);
            setClientName(data.client_name);
        } catch {
            setLoginError('Error de conexión');
        } finally {
            setLoginLoading(false);
        }
    }

    function logout() {
        localStorage.removeItem('portal_token');
        localStorage.removeItem('portal_client_name');
        setToken(null);
        setClientName('');
        setTickets([]);
        setView('list');
    }

    async function fetchTickets() {
        setLoading(true);
        try {
            const res = await fetch(`${API}/tickets`, { headers: headers() });
            if (res.status === 401) { logout(); return; }
            setTickets(await res.json());
        } catch { /* ignore */ }
        finally { setLoading(false); }
    }

    async function fetchKpis() {
        try {
            const res = await fetch(`${API}/kpis`, { headers: headers() });
            if (res.ok) setKpis(await res.json());
        } catch { /* ignore */ }
    }

    async function fetchTicketDetail(id: number) {
        try {
            const res = await fetch(`${API}/tickets/${id}`, { headers: headers() });
            if (res.status === 401) { logout(); return; }
            setSelectedTicket(await res.json());
            setView('detail');
        } catch { /* ignore */ }
    }

    async function createTicket(e: React.FormEvent) {
        e.preventDefault();
        if (!subject.trim() || !description.trim()) return;
        setCreating(true);
        try {
            const res = await fetch(`${API}/tickets`, {
                method: 'POST',
                headers: headers(),
                body: JSON.stringify({ subject, description, priority, ticket_type: ticketType }),
            });
            if (res.ok) {
                setSubject(''); setDescription(''); setPriority('medium'); setTicketType('consultation');
                fetchTickets(); fetchKpis();
                setView('list');
            }
        } catch { /* ignore */ }
        finally { setCreating(false); }
    }

    async function addComment(e: React.FormEvent) {
        e.preventDefault();
        if (!comment.trim() || !selectedTicket) return;
        setCommenting(true);
        try {
            const res = await fetch(`${API}/tickets/${selectedTicket.id}/comments`, {
                method: 'POST',
                headers: headers(),
                body: JSON.stringify({ content: comment }),
            });
            if (res.ok) { setComment(''); fetchTicketDetail(selectedTicket.id); }
        } catch { /* ignore */ }
        finally { setCommenting(false); }
    }

    async function updateTicketStatus(ticketId: number, newStatus: string, noteText?: string) {
        // Always show modal to optionally add a note
        if (noteText === undefined) {
            setStatusNoteModal({ ticketId, targetStatus: newStatus });
            return;
        }

        setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, status: newStatus } : t));
        try {
            const body: Record<string, unknown> = { status: newStatus };
            const res = await fetch(`${API}/tickets/${ticketId}/status`, {
                method: 'PATCH',
                headers: headers(),
                body: JSON.stringify(body),
            });
            // If note was provided, post it as a comment
            if (noteText && noteText.trim()) {
                await fetch(`${API}/tickets/${ticketId}/comments`, {
                    method: 'POST',
                    headers: headers(),
                    body: JSON.stringify({ content: noteText.trim() }),
                });
            }
            if (!res.ok) fetchTickets();
            else { fetchTickets(); fetchKpis(); }
        } catch {
            fetchTickets();
        }
    }

    function handleStatusConfirm() {
        if (!statusNoteModal) return;
        updateTicketStatus(statusNoteModal.ticketId, statusNoteModal.targetStatus, statusNote);
        setStatusNoteModal(null);
        setStatusNote('');
    }

    // ═══════════════════════════════════════
    //  LOGIN
    // ═══════════════════════════════════════
    if (!token) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
                <div className="w-full max-w-md">
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-2xl shadow-lg shadow-blue-500/30 mb-4">
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
                        </div>
                        <h1 className="text-3xl font-bold text-white tracking-tight">Zeron 360°</h1>
                        <p className="text-blue-300 mt-1 text-sm">Portal de Soporte</p>
                    </div>
                    <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-8 shadow-2xl">
                        <h2 className="text-xl font-semibold text-white mb-6">Iniciar Sesión</h2>
                        <form onSubmit={handleLogin} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-blue-200 mb-1.5">Email de la empresa</label>
                                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="info@empresa.com" required
                                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 outline-none focus:ring-2 focus:ring-blue-400 transition-all" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-blue-200 mb-1.5">Contraseña</label>
                                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required
                                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 outline-none focus:ring-2 focus:ring-blue-400 transition-all" />
                            </div>
                            {loginError && <div className="px-4 py-2.5 bg-red-500/20 border border-red-400/30 rounded-xl text-red-200 text-sm">{loginError}</div>}
                            <button type="submit" disabled={loginLoading}
                                className="w-full py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/30 hover:shadow-xl transition-all disabled:opacity-50">
                                {loginLoading ? 'Verificando...' : 'Acceder al Portal'}
                            </button>
                        </form>
                        <p className="text-center text-white/40 text-xs mt-6">Usá el email y contraseña proporcionados por tu proveedor</p>
                    </div>
                </div>
            </div>
        );
    }

    // ═══════════════════════════════════════
    //  RESOLVE HOURS MODAL
    // ═══════════════════════════════════════
    const StatusNoteModal = () => {
        if (!statusNoteModal) return null;
        const targetLabel = statusConfig[statusNoteModal.targetStatus]?.label || statusNoteModal.targetStatus;
        return (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setStatusNoteModal(null)}>
                <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
                    <h3 className="text-lg font-bold text-gray-900 mb-1">Cambiar a {targetLabel}</h3>
                    <p className="text-sm text-gray-500 mb-4">¿Querés agregar una nota al cambio de estado? (opcional)</p>
                    <textarea value={statusNote} onChange={(e) => setStatusNote(e.target.value)}
                        placeholder="Escribí una nota..." autoFocus rows={3}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-400 mb-4 resize-none" />
                    <div className="flex gap-2">
                        <button onClick={() => setStatusNoteModal(null)}
                            className="flex-1 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50">
                            Cancelar
                        </button>
                        <button onClick={handleStatusConfirm}
                            className="flex-1 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl text-sm font-semibold shadow-sm hover:shadow-md">
                            Confirmar
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    // ═══════════════════════════════════════
    //  HEADER  +  NAV
    // ═══════════════════════════════════════
    const Header = () => (
        <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-30">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-lg flex items-center justify-center shadow-sm">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
                    </div>
                    <div>
                        <h1 className="text-sm font-bold text-gray-900 leading-tight">Zeron 360° — Soporte</h1>
                        <p className="text-xs text-gray-500">{clientName}</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={() => { setView('kpis'); fetchKpis(); }}
                        className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-all ${view === 'kpis' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:text-gray-700'}`}>
                        📊 KPIs
                    </button>
                    <button onClick={logout} className="text-sm text-gray-500 hover:text-red-500 transition-colors font-medium">
                        Cerrar sesión
                    </button>
                </div>
            </div>
        </header>
    );

    // ═══════ TICKET CARD ═══════
    const TicketCard = ({ ticket, compact = false }: { ticket: TicketType; compact?: boolean }) => {
        const st = statusConfig[ticket.status] || statusConfig.open;
        const pr = priorityConfig[ticket.priority] || priorityConfig.medium;
        const tt = typeConfig[ticket.ticket_type || 'consultation'] || typeConfig.consultation;
        return (
            <button
                onClick={() => fetchTicketDetail(ticket.id)}
                draggable
                onDragStart={(e) => {
                    setDraggedTicket(ticket.id);
                    e.dataTransfer.effectAllowed = 'move';
                    e.dataTransfer.setData('text/plain', String(ticket.id));
                    (e.currentTarget as HTMLElement).style.opacity = '0.5';
                }}
                onDragEnd={(e) => {
                    setDraggedTicket(null);
                    setDragOverColumn(null);
                    (e.currentTarget as HTMLElement).style.opacity = '1';
                }}
                className={`w-full bg-white rounded-xl border border-gray-200 hover:border-blue-200 hover:shadow-md transition-all text-left group cursor-grab active:cursor-grabbing ${compact ? 'p-2.5' : 'p-4'} ${draggedTicket === ticket.id ? 'opacity-50 scale-95' : ''}`}
            >
                <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                    <span className="text-[10px] font-mono text-gray-400">{ticket.ticket_number}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${tt.color}`}>{tt.icon} {tt.label}</span>
                    {!compact && <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${st.bg} ${st.color}`}>{st.label}</span>}
                    <span className="flex items-center gap-1 text-[10px] font-medium">
                        <span className={`w-1.5 h-1.5 rounded-full ${pr.dot}`}></span>
                        <span className={pr.color}>{pr.label}</span>
                    </span>
                </div>
                <h3 className={`font-semibold text-gray-900 group-hover:text-blue-600 transition-colors ${compact ? 'text-xs line-clamp-2' : 'text-sm truncate'}`}>{ticket.subject}</h3>
                <div className="flex items-center justify-between mt-1.5 gap-2">
                    <div className="flex items-center gap-2 text-[10px] text-gray-400">
                        <span>{new Date(ticket.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}</span>
                        {ticket.actual_hours != null && <span className="text-green-600 font-medium">⏱ {ticket.actual_hours}h</span>}
                        {ticket.estimated_hours != null && !ticket.actual_hours && <span className="text-blue-500 font-medium">~{ticket.estimated_hours}h est.</span>}
                    </div>
                    {ticket.assigned_to_name && (
                        <span className="flex items-center gap-1 text-[10px] text-gray-500">
                            <span className="w-4 h-4 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white text-[8px] font-bold">
                                {ticket.assigned_to_name.charAt(0).toUpperCase()}
                            </span>
                            {!compact && ticket.assigned_to_name.split(' ')[0]}
                        </span>
                    )}
                </div>
            </button>
        );
    };

    // ═══════════════════════════════════════
    //  VIEW TOGGLE
    // ═══════════════════════════════════════
    const ViewToggle = ({ current }: { current: 'list' | 'kanban' }) => (
        <div className="flex items-center gap-2">
            <div className="flex bg-gray-100 rounded-lg p-0.5">
                <button onClick={() => setView('list')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${current === 'list' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                    ☰ Lista
                </button>
                <button onClick={() => setView('kanban')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${current === 'kanban' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                    ▦ Kanban
                </button>
            </div>
            <button onClick={() => setView('create')}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl text-sm font-semibold shadow-sm hover:shadow-md transition-all">
                + Nuevo Ticket
            </button>
        </div>
    );

    // ═══════════════════════════════════════
    //  KPI DASHBOARD
    // ═══════════════════════════════════════
    if (view === 'kpis') {
        return (
            <div className="min-h-screen bg-gray-50">
                <Header />
                <StatusNoteModal />
                <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
                    <button onClick={() => setView('list')} className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium mb-4">← Volver a tickets</button>
                    <h2 className="text-xl font-bold text-gray-900 mb-5">📊 KPIs de Soporte</h2>

                    {!kpis ? <p className="text-gray-500">Cargando KPIs...</p> : (
                        <>
                            {/* Summary cards */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                                <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
                                    <p className="text-2xl font-bold text-gray-900">{kpis.total}</p>
                                    <p className="text-xs text-gray-500 mt-1">Total Tickets</p>
                                </div>
                                <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
                                    <p className="text-2xl font-bold text-green-600">{kpis.resolved_count}</p>
                                    <p className="text-xs text-gray-500 mt-1">Resueltos</p>
                                </div>
                                <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
                                    <p className="text-2xl font-bold text-blue-600">{kpis.total_actual_hours}h</p>
                                    <p className="text-xs text-gray-500 mt-1">Horas Reales</p>
                                </div>
                                <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
                                    <p className="text-2xl font-bold text-purple-600">{kpis.avg_hours_per_ticket}h</p>
                                    <p className="text-xs text-gray-500 mt-1">Promedio/Ticket</p>
                                </div>
                            </div>

                            {/* By Status */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                                <div className="bg-white rounded-xl border border-gray-200 p-5">
                                    <h3 className="text-sm font-bold text-gray-700 mb-3">Tickets por Estado</h3>
                                    <div className="space-y-2">
                                        {KANBAN_COLUMNS.map(s => {
                                            const st = statusConfig[s];
                                            const count = kpis.by_status[s] || 0;
                                            const pct = kpis.total > 0 ? (count / kpis.total) * 100 : 0;
                                            return (
                                                <div key={s}>
                                                    <div className="flex items-center justify-between text-xs mb-0.5">
                                                        <span className="font-medium text-gray-600">{st.icon} {st.label}</span>
                                                        <span className="font-bold text-gray-900">{count}</span>
                                                    </div>
                                                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                                        <div className={`h-full bg-gradient-to-r ${st.headerBg} rounded-full transition-all`} style={{ width: `${pct}%` }}></div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="bg-white rounded-xl border border-gray-200 p-5">
                                    <h3 className="text-sm font-bold text-gray-700 mb-3">Tickets por Tipo</h3>
                                    <div className="space-y-3">
                                        {Object.entries(typeConfig).map(([key, tc]) => {
                                            const count = kpis.by_type[key] || 0;
                                            const pct = kpis.total > 0 ? (count / kpis.total) * 100 : 0;
                                            return (
                                                <div key={key}>
                                                    <div className="flex items-center justify-between text-xs mb-0.5">
                                                        <span className="font-medium text-gray-600">{tc.icon} {tc.label}</span>
                                                        <span className="font-bold text-gray-900">{count}</span>
                                                    </div>
                                                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                                        <div className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full transition-all" style={{ width: `${pct}%` }}></div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    <div className="mt-4 pt-4 border-t border-gray-100">
                                        <h3 className="text-sm font-bold text-gray-700 mb-2">Horas</h3>
                                        <div className="grid grid-cols-2 gap-3 text-center">
                                            <div className="bg-blue-50 rounded-lg p-2">
                                                <p className="text-lg font-bold text-blue-700">{kpis.total_estimated_hours}h</p>
                                                <p className="text-[10px] text-blue-500">Estimadas</p>
                                            </div>
                                            <div className="bg-green-50 rounded-lg p-2">
                                                <p className="text-lg font-bold text-green-700">{kpis.total_actual_hours}h</p>
                                                <p className="text-[10px] text-green-500">Reales</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-3 bg-gray-50 rounded-lg p-3 text-center">
                                        <p className="text-sm font-bold text-gray-700">{kpis.avg_resolution_days} días</p>
                                        <p className="text-[10px] text-gray-500">Tiempo promedio de resolución</p>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        );
    }

    // ═══════════════════════════════════════
    //  TICKET DETAIL
    // ═══════════════════════════════════════
    if (view === 'detail' && selectedTicket) {
        const st = statusConfig[selectedTicket.status] || statusConfig.open;
        const pr = priorityConfig[selectedTicket.priority] || priorityConfig.medium;
        const tt = typeConfig[selectedTicket.ticket_type || 'consultation'] || typeConfig.consultation;
        return (
            <div className="min-h-screen bg-gray-50">
                <Header />
                <StatusNoteModal />
                <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
                    <button onClick={() => { setView('list'); fetchTickets(); }} className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium mb-4">← Volver a tickets</button>
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="px-6 py-5 border-b border-gray-100">
                            <div className="flex items-start justify-between gap-3 flex-wrap">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-xs font-mono text-gray-400">{selectedTicket.ticket_number}</span>
                                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${tt.color}`}>{tt.icon} {tt.label}</span>
                                    </div>
                                    <h2 className="text-lg font-bold text-gray-900">{selectedTicket.subject}</h2>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${st.bg} ${st.color}`}>{st.label}</span>
                                    <span className={`text-xs font-medium ${pr.color}`}>{pr.label}</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 mt-2 text-xs text-gray-400 flex-wrap">
                                <span>Creado: {new Date(selectedTicket.created_at).toLocaleString('es-AR')}</span>
                                {selectedTicket.assigned_to_name && (
                                    <span className="flex items-center gap-1">
                                        <span className="w-5 h-5 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white text-[9px] font-bold">
                                            {selectedTicket.assigned_to_name.charAt(0).toUpperCase()}
                                        </span>
                                        Asignado: <strong className="text-gray-600">{selectedTicket.assigned_to_name}</strong>
                                    </span>
                                )}
                                {selectedTicket.estimated_hours != null && <span className="text-blue-500 font-medium">~{selectedTicket.estimated_hours}h estimadas</span>}
                                {selectedTicket.actual_hours != null && <span className="text-green-600 font-medium">⏱ {selectedTicket.actual_hours}h reales</span>}
                                {selectedTicket.estimated_date && <span>📅 Tentativa: {new Date(selectedTicket.estimated_date).toLocaleDateString('es-AR')}</span>}
                            </div>
                        </div>

                        {selectedTicket.description && (
                            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Descripción</h3>
                                <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedTicket.description}</p>
                            </div>
                        )}

                        <div className="px-6 py-4">
                            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Conversación ({selectedTicket.comments?.length || 0})</h3>
                            {(!selectedTicket.comments || selectedTicket.comments.length === 0) ? (
                                <p className="text-sm text-gray-400 italic">Sin mensajes aún</p>
                            ) : (
                                <div className="space-y-3">
                                    {selectedTicket.comments.map(c => (
                                        <div key={c.id} className={`p-3 rounded-xl text-sm ${
                                            c.comment_type === 'client_reply' ? 'bg-blue-50 border border-blue-100 ml-4'
                                            : c.comment_type === 'status_change' ? 'bg-amber-50 border border-amber-100 text-center text-amber-700 text-xs italic'
                                            : 'bg-gray-50 border border-gray-100 mr-4'
                                        }`}>
                                            <p className="text-gray-700 whitespace-pre-wrap">{c.content}</p>
                                            <p className="text-[10px] text-gray-400 mt-1.5">
                                                {new Date(c.created_at).toLocaleString('es-AR')}
                                                {c.comment_type === 'client_reply' ? ' · Vos' : c.comment_type === 'status_change' ? '' : ' · Soporte'}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {selectedTicket.status !== 'closed' && (
                                <form onSubmit={addComment} className="mt-4 flex gap-2">
                                    <input type="text" value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Escribí un mensaje..."
                                        className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-400" />
                                    <button type="submit" disabled={commenting || !comment.trim()}
                                        className="px-4 py-2.5 bg-blue-500 text-white rounded-xl text-sm font-medium shadow-sm hover:bg-blue-600 disabled:opacity-50">
                                        {commenting ? '...' : 'Enviar'}
                                    </button>
                                </form>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // ═══════════════════════════════════════
    //  CREATE TICKET
    // ═══════════════════════════════════════
    if (view === 'create') {
        return (
            <div className="min-h-screen bg-gray-50">
                <Header />
                <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6">
                    <button onClick={() => setView('list')} className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium mb-4">← Volver</button>
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                        <h2 className="text-lg font-bold text-gray-900 mb-5">Nuevo Ticket de Soporte</h2>
                        <form onSubmit={createTicket} className="space-y-4">
                            {/* Type */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de solicitud *</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {Object.entries(typeConfig).map(([key, tc]) => (
                                        <button key={key} type="button" onClick={() => setTicketType(key)}
                                            className={`p-3 rounded-xl border-2 text-center transition-all ${ticketType === key ? 'border-blue-500 bg-blue-50 shadow-sm' : 'border-gray-200 hover:border-gray-300'}`}>
                                            <span className="text-xl">{tc.icon}</span>
                                            <p className="text-xs font-semibold text-gray-700 mt-1">{tc.label}</p>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Subject */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Asunto *</label>
                                <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)}
                                    placeholder="Resumen breve del problema" required maxLength={120}
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-400" />
                            </div>

                            {/* Description */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción *</label>
                                <textarea value={description} onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Describí el problema con el mayor detalle posible..." required rows={5}
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-400 resize-none" />
                            </div>

                            {/* Priority */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Criticidad</label>
                                <select value={priority} onChange={(e) => setPriority(e.target.value)}
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-400">
                                    <option value="low">🟢 Baja</option>
                                    <option value="medium">🟡 Media</option>
                                    <option value="high">🟠 Alta / Urgente</option>
                                    <option value="critical">🔴 Crítica</option>
                                </select>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setView('list')}
                                    className="px-5 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50">
                                    Cancelar
                                </button>
                                <button type="submit" disabled={creating}
                                    className="flex-1 py-2.5 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl text-sm font-semibold shadow-sm hover:shadow-md disabled:opacity-50">
                                    {creating ? 'Creando...' : 'Crear Ticket'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        );
    }

    // ═══════════════════════════════════════
    //  KANBAN VIEW
    // ═══════════════════════════════════════
    if (view === 'kanban') {
        const grouped: Record<string, TicketType[]> = {};
        KANBAN_COLUMNS.forEach(s => grouped[s] = []);
        tickets.forEach(t => {
            if (grouped[t.status]) grouped[t.status].push(t);
            else grouped.open?.push(t);
        });

        return (
            <div className="min-h-screen bg-gray-50">
                <Header />
                <StatusNoteModal />
                <div className="max-w-full mx-auto px-4 sm:px-6 py-6">
                    <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">Mis Tickets</h2>
                            <p className="text-sm text-gray-500">{tickets.length} tickets</p>
                        </div>
                        <ViewToggle current="kanban" />
                    </div>

                    <div className="flex gap-4 overflow-x-auto pb-4" style={{ minHeight: 'calc(100vh - 200px)' }}>
                        {KANBAN_COLUMNS.map(status => {
                            const st = statusConfig[status] || statusConfig.open;
                            const count = grouped[status]?.length || 0;
                            const isOver = dragOverColumn === status;
                            return (
                                <div key={status} className="flex-shrink-0 w-64 sm:w-72">
                                    <div className={`bg-gradient-to-r ${st.headerBg} rounded-t-xl px-3 py-2 flex items-center justify-between`}>
                                        <span className="text-white text-xs font-bold uppercase tracking-wider">{st.label}</span>
                                        <span className="bg-white/30 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{count}</span>
                                    </div>
                                    <div
                                        className={`rounded-b-xl p-2 space-y-2 min-h-[200px] transition-all duration-200 ${
                                            isOver ? 'bg-blue-100/80 border-2 border-dashed border-blue-400 shadow-inner' : 'bg-gray-100/60'
                                        }`}
                                        onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDragOverColumn(status); }}
                                        onDragLeave={() => setDragOverColumn(null)}
                                        onDrop={(e) => {
                                            e.preventDefault();
                                            setDragOverColumn(null);
                                            const ticketId = parseInt(e.dataTransfer.getData('text/plain'));
                                            if (ticketId && !isNaN(ticketId)) {
                                                const ticket = tickets.find(t => t.id === ticketId);
                                                if (ticket && ticket.status !== status) {
                                                    updateTicketStatus(ticketId, status);
                                                }
                                            }
                                            setDraggedTicket(null);
                                        }}
                                    >
                                        {isOver && draggedTicket && (
                                            <div className="border-2 border-dashed border-blue-300 rounded-xl p-3 text-center text-xs text-blue-500 font-medium bg-blue-50/50">
                                                Soltar aquí → {st.label}
                                            </div>
                                        )}
                                        {count === 0 && !isOver ? (
                                            <p className="text-center text-gray-400 text-xs py-8">Sin tickets</p>
                                        ) : (
                                            grouped[status].map(ticket => (
                                                <TicketCard key={ticket.id} ticket={ticket} compact />
                                            ))
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    }

    // ═══════════════════════════════════════
    //  LIST VIEW (default)
    // ═══════════════════════════════════════
    return (
        <div className="min-h-screen bg-gray-50">
            <Header />
            <StatusNoteModal />
            <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
                <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">Mis Tickets</h2>
                        <p className="text-sm text-gray-500">{tickets.length} tickets en total</p>
                    </div>
                    <ViewToggle current="list" />
                </div>

                {loading ? (
                    <div className="text-center py-12 text-gray-500">Cargando tickets...</div>
                ) : tickets.length === 0 ? (
                    <div className="text-center py-16 bg-white rounded-2xl border border-gray-200 shadow-sm">
                        <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-50 rounded-full mb-4">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2"><path d="M12.89 1.45l8 4A2 2 0 0122 7.24v9.53a2 2 0 01-1.11 1.79l-8 4a2 2 0 01-1.79 0l-8-4a2 2 0 01-1.1-1.8V7.24a2 2 0 011.11-1.79l8-4a2 2 0 011.78 0z"/><polyline points="2.32 6.16 12 11 21.68 6.16"/><line x1="12" y1="22.76" x2="12" y2="11"/></svg>
                        </div>
                        <p className="text-gray-500 font-medium">No tenés tickets aún</p>
                        <p className="text-sm text-gray-400 mt-1">Creá tu primer ticket de soporte</p>
                        <button onClick={() => setView('create')}
                            className="mt-4 px-5 py-2.5 bg-blue-500 text-white rounded-xl text-sm font-medium hover:bg-blue-600">
                            Crear Ticket
                        </button>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {tickets.map(ticket => (
                            <TicketCard key={ticket.id} ticket={ticket} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
