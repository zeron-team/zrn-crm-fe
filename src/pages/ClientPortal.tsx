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
    assigned_to_name?: string;
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

const statusConfig: Record<string, { label: string; color: string; bg: string; headerBg: string }> = {
    open: { label: 'Abierto', color: 'text-yellow-700', bg: 'bg-yellow-50 border-yellow-200', headerBg: 'from-yellow-400 to-amber-500' },
    in_progress: { label: 'En Progreso', color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200', headerBg: 'from-blue-400 to-blue-600' },
    pending: { label: 'Pendiente', color: 'text-orange-700', bg: 'bg-orange-50 border-orange-200', headerBg: 'from-orange-400 to-orange-600' },
    resolved: { label: 'Resuelto', color: 'text-green-700', bg: 'bg-green-50 border-green-200', headerBg: 'from-green-400 to-emerald-600' },
    closed: { label: 'Cerrado', color: 'text-gray-700', bg: 'bg-gray-50 border-gray-200', headerBg: 'from-gray-400 to-gray-600' },
};

const priorityConfig: Record<string, { label: string; color: string; dot: string }> = {
    low: { label: 'Baja', color: 'text-green-600', dot: 'bg-green-400' },
    medium: { label: 'Media', color: 'text-yellow-600', dot: 'bg-yellow-400' },
    high: { label: 'Alta', color: 'text-orange-600', dot: 'bg-orange-400' },
    critical: { label: 'Crítica', color: 'text-red-600', dot: 'bg-red-500' },
};

const KANBAN_COLUMNS = ['open', 'in_progress', 'pending', 'resolved', 'closed'];

export default function ClientPortal() {
    const [token, setToken] = useState<string | null>(localStorage.getItem('portal_token'));
    const [clientName, setClientName] = useState(localStorage.getItem('portal_client_name') || '');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loginError, setLoginError] = useState('');
    const [loginLoading, setLoginLoading] = useState(false);

    const [view, setView] = useState<'list' | 'kanban' | 'create' | 'detail'>('list');
    const [tickets, setTickets] = useState<TicketType[]>([]);
    const [selectedTicket, setSelectedTicket] = useState<TicketType | null>(null);
    const [loading, setLoading] = useState(false);

    // Create form
    const [subject, setSubject] = useState('');
    const [description, setDescription] = useState('');
    const [priority, setPriority] = useState('medium');
    const [creating, setCreating] = useState(false);

    // Comment
    const [comment, setComment] = useState('');
    const [commenting, setCommenting] = useState(false);

    useEffect(() => {
        if (token) fetchTickets();
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

    async function fetchTicketDetail(id: number) {
        try {
            const res = await fetch(`${API}/tickets/${id}`, { headers: headers() });
            if (res.status === 401) { logout(); return; }
            const data = await res.json();
            setSelectedTicket(data);
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
                body: JSON.stringify({ subject, description, priority }),
            });
            if (res.ok) {
                setSubject(''); setDescription(''); setPriority('medium');
                fetchTickets();
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
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="info@empresa.com"
                                    required
                                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-blue-200 mb-1.5">Contraseña</label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    required
                                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all"
                                />
                            </div>
                            {loginError && (
                                <div className="px-4 py-2.5 bg-red-500/20 border border-red-400/30 rounded-xl text-red-200 text-sm">
                                    {loginError}
                                </div>
                            )}
                            <button
                                type="submit"
                                disabled={loginLoading}
                                className="w-full py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 transition-all disabled:opacity-50"
                            >
                                {loginLoading ? 'Verificando...' : 'Acceder al Portal'}
                            </button>
                        </form>
                        <p className="text-center text-white/40 text-xs mt-6">
                            Usá el email y contraseña proporcionados por tu proveedor
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    // ═══════════════════════════════════════
    //  HEADER
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
                <button onClick={logout} className="text-sm text-gray-500 hover:text-red-500 transition-colors font-medium">
                    Cerrar sesión
                </button>
            </div>
        </header>
    );

    // ═══════ TICKET CARD (reused in both views) ═══════
    const TicketCard = ({ ticket, compact = false }: { ticket: TicketType; compact?: boolean }) => {
        const st = statusConfig[ticket.status] || statusConfig.open;
        const pr = priorityConfig[ticket.priority] || priorityConfig.medium;
        return (
            <button
                onClick={() => fetchTicketDetail(ticket.id)}
                className={`w-full bg-white rounded-xl border border-gray-200 hover:border-blue-200 hover:shadow-md transition-all p-3 text-left group ${compact ? 'p-2.5' : 'p-4'}`}
            >
                <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-mono text-gray-400">{ticket.ticket_number}</span>
                    {!compact && <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${st.bg} ${st.color}`}>{st.label}</span>}
                    <span className="flex items-center gap-1 text-[10px] font-medium">
                        <span className={`w-1.5 h-1.5 rounded-full ${pr.dot}`}></span>
                        <span className={pr.color}>{pr.label}</span>
                    </span>
                </div>
                <h3 className={`font-semibold text-gray-900 group-hover:text-blue-600 transition-colors ${compact ? 'text-xs line-clamp-2' : 'text-sm truncate'}`}>{ticket.subject}</h3>
                <div className="flex items-center justify-between mt-1.5">
                    <p className="text-[10px] text-gray-400">
                        {new Date(ticket.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}
                    </p>
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
    //  TICKET DETAIL
    // ═══════════════════════════════════════
    if (view === 'detail' && selectedTicket) {
        const st = statusConfig[selectedTicket.status] || statusConfig.open;
        const pr = priorityConfig[selectedTicket.priority] || priorityConfig.medium;
        return (
            <div className="min-h-screen bg-gray-50">
                <Header />
                <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
                    <button onClick={() => { setView('list'); fetchTickets(); }} className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium mb-4">
                        ← Volver a tickets
                    </button>

                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="px-6 py-5 border-b border-gray-100">
                            <div className="flex items-start justify-between gap-3 flex-wrap">
                                <div>
                                    <span className="text-xs font-mono text-gray-400">{selectedTicket.ticket_number}</span>
                                    <h2 className="text-lg font-bold text-gray-900 mt-0.5">{selectedTicket.subject}</h2>
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
                                        Asignado a: <strong className="text-gray-600">{selectedTicket.assigned_to_name}</strong>
                                    </span>
                                )}
                                {selectedTicket.closed_at && <span>Cerrado: {new Date(selectedTicket.closed_at).toLocaleString('es-AR')}</span>}
                            </div>
                        </div>

                        {selectedTicket.description && (
                            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Descripción</h3>
                                <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedTicket.description}</p>
                            </div>
                        )}

                        <div className="px-6 py-4">
                            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                                Conversación ({selectedTicket.comments?.length || 0})
                            </h3>
                            {(!selectedTicket.comments || selectedTicket.comments.length === 0) ? (
                                <p className="text-sm text-gray-400 italic">Sin mensajes aún</p>
                            ) : (
                                <div className="space-y-3">
                                    {selectedTicket.comments.map(c => (
                                        <div key={c.id} className={`p-3 rounded-xl text-sm ${
                                            c.comment_type === 'client_reply'
                                                ? 'bg-blue-50 border border-blue-100 ml-4'
                                                : 'bg-gray-50 border border-gray-100 mr-4'
                                        }`}>
                                            <p className="text-gray-700 whitespace-pre-wrap">{c.content}</p>
                                            <p className="text-[10px] text-gray-400 mt-1.5">
                                                {new Date(c.created_at).toLocaleString('es-AR')}
                                                {c.comment_type === 'client_reply' ? ' · Vos' : ' · Soporte'}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {selectedTicket.status !== 'closed' && (
                                <form onSubmit={addComment} className="mt-4 flex gap-2">
                                    <input
                                        type="text"
                                        value={comment}
                                        onChange={(e) => setComment(e.target.value)}
                                        placeholder="Escribí un mensaje..."
                                        className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                                    />
                                    <button
                                        type="submit"
                                        disabled={commenting || !comment.trim()}
                                        className="px-4 py-2.5 bg-blue-500 text-white rounded-xl text-sm font-medium shadow-sm hover:bg-blue-600 transition-colors disabled:opacity-50"
                                    >
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
                    <button onClick={() => setView('list')} className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium mb-4">
                        ← Volver
                    </button>
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                        <h2 className="text-lg font-bold text-gray-900 mb-5">Nuevo Ticket de Soporte</h2>
                        <form onSubmit={createTicket} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Asunto *</label>
                                <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)}
                                    placeholder="Resumen breve del problema" required maxLength={120}
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-400" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción *</label>
                                <textarea value={description} onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Describí el problema con el mayor detalle posible..." required rows={5}
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-400 resize-none" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Prioridad</label>
                                <select value={priority} onChange={(e) => setPriority(e.target.value)}
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-400">
                                    <option value="low">🟢 Baja</option>
                                    <option value="medium">🟡 Media</option>
                                    <option value="high">🟠 Alta</option>
                                    <option value="critical">🔴 Crítica</option>
                                </select>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setView('list')}
                                    className="px-5 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">
                                    Cancelar
                                </button>
                                <button type="submit" disabled={creating}
                                    className="flex-1 py-2.5 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl text-sm font-semibold shadow-sm hover:shadow-md transition-all disabled:opacity-50">
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
            else if (grouped.open) grouped.open.push(t);
        });

        return (
            <div className="min-h-screen bg-gray-50">
                <Header />
                <div className="max-w-full mx-auto px-4 sm:px-6 py-6">
                    <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">Mis Tickets</h2>
                            <p className="text-sm text-gray-500">{tickets.length} tickets</p>
                        </div>
                        <div className="flex items-center gap-2">
                            {/* View Toggle */}
                            <div className="flex bg-gray-100 rounded-lg p-0.5">
                                <button onClick={() => setView('list')}
                                    className="px-3 py-1.5 text-xs font-medium rounded-md transition-all text-gray-500 hover:text-gray-700">
                                    ☰ Lista
                                </button>
                                <button
                                    className="px-3 py-1.5 text-xs font-medium rounded-md transition-all bg-white text-gray-900 shadow-sm">
                                    ▦ Kanban
                                </button>
                            </div>
                            <button onClick={() => setView('create')}
                                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl text-sm font-semibold shadow-sm hover:shadow-md transition-all">
                                + Nuevo Ticket
                            </button>
                        </div>
                    </div>

                    <div className="flex gap-4 overflow-x-auto pb-4" style={{ minHeight: 'calc(100vh - 200px)' }}>
                        {KANBAN_COLUMNS.map(status => {
                            const st = statusConfig[status] || statusConfig.open;
                            const count = grouped[status]?.length || 0;
                            return (
                                <div key={status} className="flex-shrink-0 w-64 sm:w-72">
                                    <div className={`bg-gradient-to-r ${st.headerBg} rounded-t-xl px-3 py-2 flex items-center justify-between`}>
                                        <span className="text-white text-xs font-bold uppercase tracking-wider">{st.label}</span>
                                        <span className="bg-white/30 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{count}</span>
                                    </div>
                                    <div className="bg-gray-100/60 rounded-b-xl p-2 space-y-2 min-h-[200px]">
                                        {count === 0 ? (
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
            <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
                <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">Mis Tickets</h2>
                        <p className="text-sm text-gray-500">{tickets.length} tickets en total</p>
                    </div>
                    <div className="flex items-center gap-2">
                        {/* View Toggle */}
                        <div className="flex bg-gray-100 rounded-lg p-0.5">
                            <button
                                className="px-3 py-1.5 text-xs font-medium rounded-md transition-all bg-white text-gray-900 shadow-sm">
                                ☰ Lista
                            </button>
                            <button onClick={() => setView('kanban')}
                                className="px-3 py-1.5 text-xs font-medium rounded-md transition-all text-gray-500 hover:text-gray-700">
                                ▦ Kanban
                            </button>
                        </div>
                        <button onClick={() => setView('create')}
                            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl text-sm font-semibold shadow-sm hover:shadow-md transition-all">
                            + Nuevo Ticket
                        </button>
                    </div>
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
                            className="mt-4 px-5 py-2.5 bg-blue-500 text-white rounded-xl text-sm font-medium hover:bg-blue-600 transition-colors">
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
