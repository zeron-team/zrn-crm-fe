import { useState, useEffect } from "react";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";
import {
    Plus, Search, Filter, Ticket, AlertCircle, Clock, CheckCircle2,
    MessageSquare, ChevronRight, X, Send, User, Building2, RefreshCw,
    ArrowLeft, ShieldAlert, Info, XCircle, Tag, Code, Timer, CalendarDays, Bug, Sparkles, HelpCircle, Save
} from "lucide-react";

interface TicketData {
    id: number;
    ticket_number: string;
    subject: string;
    description: string | null;
    status: string;
    priority: string;
    category: string | null;
    ticket_type: string | null;
    client_id: number | null;
    assigned_to: number | null;
    created_by: number | null;
    estimated_hours: number | null;
    actual_hours: number | null;
    estimated_date: string | null;
    created_at: string;
    updated_at: string;
    closed_at: string | null;
    client_name: string | null;
    assignee_name: string | null;
    creator_name: string | null;
    comment_count: number;
}

interface TicketComment {
    id: number;
    ticket_id: number;
    user_id: number | null;
    user_name: string | null;
    content: string;
    is_internal: boolean;
    comment_type: string;
    created_at: string;
}

interface ClientOption {
    id: number;
    name: string;
}

interface UserOption {
    id: number;
    full_name: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any; bg: string }> = {
    open: { label: "Abierto", color: "text-blue-700", icon: AlertCircle, bg: "bg-blue-50 border-blue-200" },
    in_progress: { label: "En Progreso", color: "text-amber-700", icon: Clock, bg: "bg-amber-50 border-amber-200" },
    waiting: { label: "En Espera", color: "text-purple-700", icon: Clock, bg: "bg-purple-50 border-purple-200" },
    resolved: { label: "Resuelto", color: "text-green-700", icon: CheckCircle2, bg: "bg-green-50 border-green-200" },
    closed: { label: "Cerrado", color: "text-gray-500", icon: XCircle, bg: "bg-gray-100 border-gray-300" },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
    low: { label: "Baja", color: "text-gray-600", dot: "bg-gray-400" },
    medium: { label: "Media", color: "text-blue-600", dot: "bg-blue-500" },
    high: { label: "Alta", color: "text-orange-600", dot: "bg-orange-500" },
    critical: { label: "Crítica", color: "text-red-600", dot: "bg-red-500" },
};

const CATEGORIES = ["General", "Facturación", "Técnico", "Redes", "Software", "Hardware", "Otro"];

const TYPE_CONFIG: Record<string, { label: string; icon: any; color: string; bg: string }> = {
    bug: { label: "Bug", icon: Bug, color: "text-red-600", bg: "bg-red-50 border-red-200" },
    feature: { label: "Requerimiento", icon: Sparkles, color: "text-purple-600", bg: "bg-purple-50 border-purple-200" },
    consultation: { label: "Consulta", icon: HelpCircle, color: "text-blue-600", bg: "bg-blue-50 border-blue-200" },
};

export default function Support() {
    const { user } = useAuth();
    const [tickets, setTickets] = useState<TicketData[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState("");
    const [filterPriority, setFilterPriority] = useState("");
    const [searchQuery, setSearchQuery] = useState("");

    // Modal state
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [selectedTicket, setSelectedTicket] = useState<TicketData | null>(null);
    const [ticketDetail, setTicketDetail] = useState<any>(null);
    const [detailLoading, setDetailLoading] = useState(false);

    // Create form
    const [clients, setClients] = useState<ClientOption[]>([]);
    const [users, setUsers] = useState<UserOption[]>([]);
    const [formData, setFormData] = useState({
        subject: "", description: "", priority: "medium", category: "General",
        ticket_type: "consultation", client_id: "", assigned_to: "",
    });

    // Comment
    const [newComment, setNewComment] = useState("");
    const [sendingComment, setSendingComment] = useState(false);

    useEffect(() => {
        fetchTickets();
        fetchOptions();
    }, []);

    const fetchTickets = async () => {
        try {
            const res = await api.get("/tickets/");
            setTickets(res.data);
        } catch (err) {
            console.error("Failed to fetch tickets", err);
        } finally {
            setLoading(false);
        }
    };

    const fetchOptions = async () => {
        try {
            const [cRes, uRes] = await Promise.all([api.get("/clients/"), api.get("/users/")]);
            setClients(cRes.data);
            setUsers(uRes.data);
        } catch (err) {
            console.error("Failed to fetch options", err);
        }
    };

    const openTicketDetail = async (ticket: TicketData) => {
        setSelectedTicket(ticket);
        setDetailLoading(true);
        try {
            const res = await api.get(`/tickets/${ticket.id}`);
            setTicketDetail(res.data);
        } catch (err) {
            console.error("Failed to load ticket detail", err);
        } finally {
            setDetailLoading(false);
        }
    };

    const handleCreateTicket = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post("/tickets/", {
                ...formData,
                client_id: formData.client_id ? Number(formData.client_id) : null,
                assigned_to: formData.assigned_to ? Number(formData.assigned_to) : null,
                created_by: (user as any)?.id || null,
            });
            setShowCreateModal(false);
            setFormData({ subject: "", description: "", priority: "medium", category: "General", ticket_type: "consultation", client_id: "", assigned_to: "" });
            fetchTickets();
        } catch (err) {
            console.error("Failed to create ticket", err);
        }
    };

    const handleStatusChange = async (status: string) => {
        if (!selectedTicket) return;
        try {
            await api.put(`/tickets/${selectedTicket.id}?user_id=${(user as any)?.id || ''}`, { status });
            const res = await api.get(`/tickets/${selectedTicket.id}`);
            setTicketDetail(res.data);
            setSelectedTicket({ ...selectedTicket, status });
            fetchTickets();
        } catch (err) {
            console.error("Failed to update status", err);
        }
    };

    const handleAddComment = async () => {
        if (!newComment.trim() || !selectedTicket) return;
        setSendingComment(true);
        try {
            await api.post(`/tickets/${selectedTicket.id}/comments`, {
                content: newComment,
                user_id: (user as any)?.id || null,
            });
            setNewComment("");
            const res = await api.get(`/tickets/${selectedTicket.id}`);
            setTicketDetail(res.data);
            fetchTickets();
        } catch (err) {
            console.error("Failed to add comment", err);
        } finally {
            setSendingComment(false);
        }
    };

    // Filtered tickets
    const filtered = tickets.filter(t => {
        if (filterStatus && t.status !== filterStatus) return false;
        if (filterPriority && t.priority !== filterPriority) return false;
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            return t.subject.toLowerCase().includes(q) || t.ticket_number.toLowerCase().includes(q) || (t.client_name || "").toLowerCase().includes(q);
        }
        return true;
    });

    // --- Render comment with code blocks ---
    const renderCommentContent = (content: string) => {
        const parts = content.split(/(```[\s\S]*?```)/g);
        return (
            <div className="space-y-2">
                {parts.map((part, i) => {
                    if (part.startsWith('```') && part.endsWith('```')) {
                        const code = part.slice(3, -3).trim();
                        return (
                            <pre key={i} className="bg-gray-900 text-green-400 text-xs rounded-lg p-3 overflow-x-auto font-mono border border-gray-700 whitespace-pre-wrap">
                                <code>{code}</code>
                            </pre>
                        );
                    }
                    if (!part.trim()) return null;
                    return <span key={i} className="whitespace-pre-wrap">{part}</span>;
                })}
            </div>
        );
    };

    const stats = {
        open: tickets.filter(t => t.status === "open").length,
        in_progress: tickets.filter(t => t.status === "in_progress").length,
        resolved: tickets.filter(t => t.status === "resolved").length,
        total: tickets.length,
    };

    // ---- Ticket Detail View ----
    if (selectedTicket) {
        const sc = STATUS_CONFIG[selectedTicket.status] || STATUS_CONFIG.open;
        const pc = PRIORITY_CONFIG[selectedTicket.priority] || PRIORITY_CONFIG.medium;
        return (
            <div className="space-y-6 max-w-5xl mx-auto">
                <div className="flex items-center gap-3">
                    <button onClick={() => { setSelectedTicket(null); setTicketDetail(null); }} className="p-2 bg-white rounded-full shadow-sm border border-gray-100 hover:bg-gray-50 transition-colors">
                        <ArrowLeft size={18} />
                    </button>
                    <div className="flex-1">
                        <div className="flex items-center gap-3">
                            <h2 className="text-xl font-bold text-gray-900">{selectedTicket.ticket_number}</h2>
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${sc.bg} ${sc.color}`}>
                                <sc.icon size={12} /> {sc.label}
                            </span>
                            <span className="inline-flex items-center gap-1 text-xs font-medium">
                                <span className={`w-2 h-2 rounded-full ${pc.dot}`} />
                                <span className={pc.color}>{pc.label}</span>
                            </span>
                            {selectedTicket.ticket_type && (() => {
                                const tc = TYPE_CONFIG[selectedTicket.ticket_type] || TYPE_CONFIG.consultation;
                                return (
                                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${tc.bg} ${tc.color}`}>
                                        <tc.icon size={12} /> {tc.label}
                                    </span>
                                );
                            })()}
                        </div>
                        <h3 className="text-lg text-gray-700 mt-0.5">{selectedTicket.subject}</h3>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main content */}
                    <div className="lg:col-span-2 space-y-4">
                        {/* Description */}
                        {selectedTicket.description && (
                            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Descripción</h4>
                                <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedTicket.description}</p>
                            </div>
                        )}

                        {/* Timeline / Comments */}
                        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                            <div className="px-5 py-4 bg-gray-50/50 border-b border-gray-100 flex items-center gap-2">
                                <MessageSquare size={16} className="text-blue-500" />
                                <h4 className="font-semibold text-gray-900 text-sm">Historial y Comentarios</h4>
                                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">{ticketDetail?.comments?.length || 0}</span>
                            </div>

                            <div className="divide-y divide-gray-50 max-h-[500px] overflow-y-auto">
                                {detailLoading ? (
                                    <div className="p-8 text-center text-gray-500"><RefreshCw size={20} className="animate-spin mx-auto mb-2" />Cargando...</div>
                                ) : ticketDetail?.comments?.length === 0 ? (
                                    <div className="p-8 text-center text-gray-400 text-sm">Sin comentarios aún</div>
                                ) : (
                                    ticketDetail?.comments?.map((c: TicketComment) => (
                                        <div key={c.id} className={`px-5 py-3.5 ${c.comment_type === 'status_change' ? 'bg-blue-50/30' : ''}`}>
                                            <div className="flex items-start gap-3">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${c.comment_type === 'status_change' ? 'bg-gradient-to-br from-blue-400 to-blue-600' : 'bg-gradient-to-br from-indigo-500 to-purple-600'}`}>
                                                    {c.comment_type === 'status_change' ? <Info size={14} /> : (c.user_name || 'S').charAt(0).toUpperCase()}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-0.5">
                                                        <span className="text-sm font-semibold text-gray-900">{c.user_name || 'Sistema'}</span>
                                                        {c.comment_type === 'status_change' && (
                                                            <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-600 rounded font-medium">Cambio</span>
                                                        )}
                                                        <span className="text-[11px] text-gray-400">
                                                            {new Date(c.created_at).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-gray-700">{renderCommentContent(c.content)}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            {/* Add comment */}
                            <div className="px-5 py-4 border-t border-gray-100 bg-gray-50/30">
                                <div className="flex gap-2">
                                    <div className="flex-1 flex flex-col gap-1">
                                        <textarea
                                            value={newComment}
                                            onChange={e => setNewComment(e.target.value)}
                                            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey) { e.preventDefault(); handleAddComment(); } }}
                                            placeholder="Escribí un comentario... Usá ``` para bloques de código"
                                            rows={2}
                                            className="flex-1 px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none resize-none font-mono"
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <button
                                            onClick={() => setNewComment(prev => prev + '\n```\n// código aquí\n```\n')}
                                            className="px-3 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-1 text-xs font-medium"
                                            title="Insertar bloque de código"
                                            type="button"
                                        >
                                            <Code size={14} />
                                        </button>
                                        <button
                                            onClick={handleAddComment}
                                            disabled={!newComment.trim() || sendingComment}
                                            className="px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-1.5 text-sm font-medium flex-1"
                                        >
                                            {sendingComment ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-4">
                        {/* Status change */}
                        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Cambiar Estado</h4>
                            <div className="grid grid-cols-2 gap-2">
                                {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                                    <button
                                        key={key}
                                        onClick={() => handleStatusChange(key)}
                                        disabled={selectedTicket.status === key}
                                        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border transition-all ${selectedTicket.status === key ? `${cfg.bg} ${cfg.color} ring-2 ring-offset-1` : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'}`}
                                    >
                                        <cfg.icon size={12} /> {cfg.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Info */}
                        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-3">
                            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Detalles</h4>
                            <div className="space-y-2.5 text-sm">
                                {selectedTicket.client_name && (
                                    <div className="flex items-center gap-2"><Building2 size={14} className="text-gray-400" /><span className="text-gray-700">{selectedTicket.client_name}</span></div>
                                )}
                                {selectedTicket.assignee_name && (
                                    <div className="flex items-center gap-2"><User size={14} className="text-gray-400" /><span className="text-gray-700">Asignado: {selectedTicket.assignee_name}</span></div>
                                )}
                                {selectedTicket.creator_name && (
                                    <div className="flex items-center gap-2"><User size={14} className="text-gray-400" /><span className="text-gray-700">Creado por: {selectedTicket.creator_name}</span></div>
                                )}
                                {selectedTicket.category && (
                                    <div className="flex items-center gap-2"><Tag size={14} className="text-gray-400" /><span className="text-gray-700">{selectedTicket.category}</span></div>
                                )}
                                <div className="flex items-center gap-2"><Clock size={14} className="text-gray-400" />
                                    <span className="text-gray-500 text-xs">Creado: {new Date(selectedTicket.created_at).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                                {selectedTicket.closed_at && (
                                    <div className="flex items-center gap-2"><CheckCircle2 size={14} className="text-green-500" />
                                        <span className="text-gray-500 text-xs">Cerrado: {new Date(selectedTicket.closed_at).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Ticket Type */}
                        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-3">
                            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Tipo de Solicitud</h4>
                            <div className="grid grid-cols-1 gap-1.5">
                                {Object.entries(TYPE_CONFIG).map(([key, cfg]) => {
                                    const active = selectedTicket.ticket_type === key;
                                    return (
                                        <button key={key} onClick={async () => {
                                            try {
                                                await api.put(`/tickets/${selectedTicket.id}?user_id=${(user as any)?.id || ''}`, { ticket_type: key });
                                                setSelectedTicket({ ...selectedTicket, ticket_type: key });
                                                const res = await api.get(`/tickets/${selectedTicket.id}`);
                                                setTicketDetail(res.data);
                                                fetchTickets();
                                            } catch { }
                                        }}
                                            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold border transition-all ${active ? `${cfg.bg} ${cfg.color} ring-2 ring-offset-1` : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'}`}>
                                            <cfg.icon size={14} /> {cfg.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Hours & Estimated Date */}
                        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-3">
                            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Gestión de Tiempo</h4>
                            <div className="space-y-3">
                                <div>
                                    <label className="flex items-center gap-1.5 text-xs font-medium text-gray-500 mb-1"><Timer size={12} /> Horas Estimadas</label>
                                    <div className="flex gap-1.5">
                                        <input type="number" step="0.5" min="0" defaultValue={selectedTicket.estimated_hours ?? ''}
                                            id={`est-hours-${selectedTicket.id}`}
                                            className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-400"
                                            placeholder="0" />
                                        <button onClick={async () => {
                                            const val = parseFloat((document.getElementById(`est-hours-${selectedTicket.id}`) as HTMLInputElement)?.value || '0');
                                            try {
                                                await api.put(`/tickets/${selectedTicket.id}?user_id=${(user as any)?.id || ''}`, { estimated_hours: val });
                                                setSelectedTicket({ ...selectedTicket, estimated_hours: val });
                                                const res = await api.get(`/tickets/${selectedTicket.id}`); setTicketDetail(res.data); fetchTickets();
                                            } catch { }
                                        }} className="px-2.5 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors" title="Guardar">
                                            <Save size={14} />
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label className="flex items-center gap-1.5 text-xs font-medium text-gray-500 mb-1"><Clock size={12} /> Horas Reales</label>
                                    <div className="flex gap-1.5">
                                        <input type="number" step="0.5" min="0" defaultValue={selectedTicket.actual_hours ?? ''}
                                            id={`act-hours-${selectedTicket.id}`}
                                            className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-400"
                                            placeholder="0" />
                                        <button onClick={async () => {
                                            const val = parseFloat((document.getElementById(`act-hours-${selectedTicket.id}`) as HTMLInputElement)?.value || '0');
                                            try {
                                                await api.put(`/tickets/${selectedTicket.id}?user_id=${(user as any)?.id || ''}`, { actual_hours: val });
                                                setSelectedTicket({ ...selectedTicket, actual_hours: val });
                                                const res = await api.get(`/tickets/${selectedTicket.id}`); setTicketDetail(res.data); fetchTickets();
                                            } catch { }
                                        }} className="px-2.5 py-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors" title="Guardar">
                                            <Save size={14} />
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label className="flex items-center gap-1.5 text-xs font-medium text-gray-500 mb-1"><CalendarDays size={12} /> Fecha Tentativa</label>
                                    <div className="flex gap-1.5">
                                        <input type="date" defaultValue={selectedTicket.estimated_date ? selectedTicket.estimated_date.slice(0, 10) : ''}
                                            id={`est-date-${selectedTicket.id}`}
                                            className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-400" />
                                        <button onClick={async () => {
                                            const val = (document.getElementById(`est-date-${selectedTicket.id}`) as HTMLInputElement)?.value;
                                            try {
                                                await api.put(`/tickets/${selectedTicket.id}?user_id=${(user as any)?.id || ''}`, { estimated_date: val ? `${val}T00:00:00` : null });
                                                setSelectedTicket({ ...selectedTicket, estimated_date: val || null });
                                                const res = await api.get(`/tickets/${selectedTicket.id}`); setTicketDetail(res.data); fetchTickets();
                                            } catch { }
                                        }} className="px-2.5 py-2 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 transition-colors" title="Guardar">
                                            <Save size={14} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // ---- Main listing ----
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl shadow-md">
                        <Ticket size={22} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-gray-900">Soporte</h1>
                        <p className="text-xs text-gray-500">Gestión de tickets y seguimiento</p>
                    </div>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md text-sm font-semibold"
                >
                    <Plus size={16} /> Nuevo Ticket
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: "Abiertos", value: stats.open, color: "from-blue-500 to-blue-600", icon: AlertCircle },
                    { label: "En Progreso", value: stats.in_progress, color: "from-amber-500 to-orange-500", icon: Clock },
                    { label: "Resueltos", value: stats.resolved, color: "from-green-500 to-emerald-500", icon: CheckCircle2 },
                    { label: "Total", value: stats.total, color: "from-gray-600 to-gray-700", icon: Ticket },
                ].map(s => (
                    <div key={s.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
                        <div className={`p-2.5 rounded-xl bg-gradient-to-br ${s.color} shadow-md`}>
                            <s.icon size={18} className="text-white" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900">{s.value}</p>
                            <p className="text-xs text-gray-500">{s.label}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3 items-center">
                <div className="relative flex-1 min-w-[200px] max-w-md">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Buscar tickets..."
                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none"
                    />
                </div>
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm">
                    <option value="">Todos los estados</option>
                    {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
                <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)} className="px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm">
                    <option value="">Todas las prioridades</option>
                    {Object.entries(PRIORITY_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
            </div>

            {/* Ticket list */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                {loading ? (
                    <div className="p-12 text-center text-gray-500"><RefreshCw size={24} className="animate-spin mx-auto mb-3" />Cargando tickets...</div>
                ) : filtered.length === 0 ? (
                    <div className="p-12 text-center text-gray-400">
                        <Ticket size={40} className="mx-auto mb-3 text-gray-300" />
                        <p className="font-medium">No hay tickets</p>
                        <p className="text-sm mt-1">Creá un nuevo ticket para comenzar</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-50">
                        {filtered.map(t => {
                            const sc = STATUS_CONFIG[t.status] || STATUS_CONFIG.open;
                            const pc = PRIORITY_CONFIG[t.priority] || PRIORITY_CONFIG.medium;
                            return (
                                <div
                                    key={t.id}
                                    onClick={() => openTicketDetail(t)}
                                    className="px-5 py-4 flex items-center gap-4 hover:bg-gray-50/50 cursor-pointer transition-colors group"
                                >
                                    {/* Priority dot */}
                                    <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${pc.dot}`} title={pc.label} />

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-mono text-gray-400">{t.ticket_number}</span>
                                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${sc.bg} ${sc.color}`}>
                                                <sc.icon size={10} /> {sc.label}
                                            </span>
                                            {t.category && <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded font-medium">{t.category}</span>}
                                            {t.ticket_type && (() => {
                                                const tc = TYPE_CONFIG[t.ticket_type] || TYPE_CONFIG.consultation;
                                                return (
                                                    <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold border ${tc.bg} ${tc.color}`}>
                                                        <tc.icon size={10} /> {tc.label}
                                                    </span>
                                                );
                                            })()}
                                        </div>
                                        <h4 className="text-sm font-semibold text-gray-900 mt-0.5 truncate">{t.subject}</h4>
                                        <div className="flex items-center gap-3 mt-1 text-[11px] text-gray-400">
                                            {t.client_name && <span className="flex items-center gap-1"><Building2 size={10} />{t.client_name}</span>}
                                            {t.assignee_name && <span className="flex items-center gap-1"><User size={10} />{t.assignee_name}</span>}
                                            {t.estimated_hours != null && <span className="flex items-center gap-1 text-blue-500"><Timer size={10} />~{t.estimated_hours}h</span>}
                                            {t.actual_hours != null && <span className="flex items-center gap-1 text-green-600"><Clock size={10} />{t.actual_hours}h</span>}
                                            <span>{new Date(t.updated_at).toLocaleDateString('es-AR')}</span>
                                        </div>
                                    </div>

                                    {/* Comment count + arrow */}
                                    <div className="flex items-center gap-3 flex-shrink-0">
                                        {t.comment_count > 0 && (
                                            <span className="flex items-center gap-1 text-xs text-gray-400">
                                                <MessageSquare size={13} /> {t.comment_count}
                                            </span>
                                        )}
                                        <ChevronRight size={16} className="text-gray-300 group-hover:text-gray-500 transition-colors" />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Create Ticket Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
                        <div className="px-6 py-4 bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center"><Ticket size={20} className="text-white" /></div>
                                <div>
                                    <h3 className="text-lg font-bold text-white">Nuevo Ticket</h3>
                                    <p className="text-blue-100 text-xs">Complete los datos del ticket</p>
                                </div>
                            </div>
                            <button onClick={() => setShowCreateModal(false)} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"><X size={18} className="text-white" /></button>
                        </div>
                        <form onSubmit={handleCreateTicket} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Asunto *</label>
                                <input type="text" required value={formData.subject} onChange={e => setFormData({ ...formData, subject: e.target.value })}
                                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none"
                                    placeholder="Breve descripción del problema" />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Descripción</label>
                                <textarea rows={3} value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none resize-none"
                                    placeholder="Detalle del problema..." />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 mb-1.5">Tipo de Solicitud</label>
                                    <select value={formData.ticket_type} onChange={e => setFormData({ ...formData, ticket_type: e.target.value })}
                                        className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm">
                                        <option value="bug">🐛 Bug</option>
                                        <option value="feature">✨ Requerimiento</option>
                                        <option value="consultation">💬 Consulta</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 mb-1.5">Criticidad</label>
                                    <select value={formData.priority} onChange={e => setFormData({ ...formData, priority: e.target.value })}
                                        className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm">
                                        {Object.entries(PRIORITY_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 mb-1.5">Categoría</label>
                                    <select value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })}
                                        className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm">
                                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 mb-1.5">Cliente</label>
                                    <select value={formData.client_id} onChange={e => setFormData({ ...formData, client_id: e.target.value })}
                                        className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm">
                                        <option value="">— Sin cliente —</option>
                                        {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 mb-1.5">Asignar a</label>
                                    <select value={formData.assigned_to} onChange={e => setFormData({ ...formData, assigned_to: e.target.value })}
                                        className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm">
                                        <option value="">— Sin asignar —</option>
                                        {users.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 pt-2">
                                <button type="button" onClick={() => setShowCreateModal(false)} className="px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg font-medium">Cancelar</button>
                                <button type="submit" className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm">Crear Ticket</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
