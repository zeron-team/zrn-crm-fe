import { useState, useEffect } from "react";
import api from "../api/client";
import {
    Users, DollarSign, FileText, Building2, Award, Pencil,
    ChevronRight, ArrowLeft, X, Percent, Filter, TrendingUp,
    CheckCircle2, XCircle, Clock, Send, Hash
} from "lucide-react";
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
    Legend, ResponsiveContainer
} from "recharts";

interface SellerStat {
    clients_assigned: number;
    clients_won: number;
    quotes_total: number;
    quotes_accepted: number;
    quotes_rejected: number;
    quotes_sent: number;
    quotes_draft: number;
    quotes_amount: number;
    quotes_accepted_amount: number;
    quotes_rejected_amount: number;
    invoices: number;
    invoices_total: number;
}

interface SellerQuote {
    id: number;
    quote_number: string;
    status: string;
    total_amount: number;
    commission_pct: number;
    commission_amount: number;
    client_id: number | null;
    client_name: string;
    lead_id: number | null;
    issue_date: string | null;
    currency: string;
}

interface SellerClient {
    id: number;
    name: string;
    cuit_dni: string;
    email: string;
    quotes_total: number;
    quotes_won: number;
    quotes_lost: number;
    quotes_pending: number;
    amount_won: number;
    is_won: boolean;
}

interface Seller {
    id: number;
    full_name: string;
    email: string;
    role: string;
    is_active: boolean;
    commission_pct?: number;
    data_complete?: boolean;
    stats: SellerStat;
    quotes?: SellerQuote[];
    clients?: SellerClient[];
}

export default function Sellers() {
    const [sellers, setSellers] = useState<Seller[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedSeller, setSelectedSeller] = useState<Seller | null>(null);

    // Edit modal
    const [editModal, setEditModal] = useState(false);
    const [editForm, setEditForm] = useState({ full_name: "", email: "", commission_pct: 0, is_active: true });
    const [editingSellerId, setEditingSellerId] = useState<number | null>(null);

    // Filters for detail view
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [clientFilter, setClientFilter] = useState<string>("all");
    const [detailTab, setDetailTab] = useState<"timeline" | "clients">("timeline");

    // Monthly chart
    const [monthlyData, setMonthlyData] = useState<any[]>([]);
    const [sellerMeta, setSellerMeta] = useState<{ id: number; prefix: string; name: string }[]>([]);
    const [chartMode, setChartMode] = useState<"qty" | "amount">("qty");
    const [chartSellerFilter, setChartSellerFilter] = useState<string>("all");

    useEffect(() => { fetchSellers(); }, []);

    const fetchSellers = async () => {
        try {
            const [selRes, monthRes] = await Promise.all([
                api.get("/sellers/"),
                api.get("/sellers/monthly-stats"),
            ]);
            setSellers(selRes.data);
            setMonthlyData(monthRes.data.months || []);
            setSellerMeta(monthRes.data.sellers || []);
        }
        catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const openSeller = async (seller: Seller) => {
        try {
            const res = await api.get(`/sellers/${seller.id}`);
            setSelectedSeller(res.data);
            setStatusFilter("all");
            setClientFilter("all");
            setDetailTab("timeline");
        } catch (err) { console.error(err); }
    };

    const openEditModal = (seller: Seller, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        setEditingSellerId(seller.id);
        setEditForm({ full_name: seller.full_name, email: seller.email, commission_pct: seller.commission_pct || 0, is_active: seller.is_active });
        setEditModal(true);
    };

    const handleEditSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingSellerId) return;
        try {
            await api.put(`/users/${editingSellerId}`, { ...editForm, role: "vendedor" });
            setEditModal(false);
            fetchSellers();
            if (selectedSeller && selectedSeller.id === editingSellerId) {
                const res = await api.get(`/sellers/${editingSellerId}`);
                setSelectedSeller(res.data);
            }
        } catch (err) { console.error(err); alert("Error al guardar"); }
    };

    const fmt = (n: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);

    const statusConfig: Record<string, { label: string; bg: string; text: string; icon: any }> = {
        Accepted: { label: "Ganado", bg: "bg-green-100", text: "text-green-700", icon: CheckCircle2 },
        Rejected: { label: "Perdido", bg: "bg-red-100", text: "text-red-700", icon: XCircle },
        Sent: { label: "Enviado", bg: "bg-blue-100", text: "text-blue-700", icon: Send },
        Draft: { label: "Borrador", bg: "bg-gray-100", text: "text-gray-700", icon: Clock },
    };

    // ═══════════════════════════════════════════
    // Detail view
    // ═══════════════════════════════════════════
    if (selectedSeller) {
        const s = selectedSeller;
        const quotes = s.quotes || [];
        const clients = s.clients || [];

        // Filtered quotes
        const filteredQuotes = quotes.filter(q => {
            if (statusFilter !== "all" && q.status !== statusFilter) return false;
            if (clientFilter !== "all" && String(q.client_id) !== clientFilter) return false;
            return true;
        });

        // Unique clients from quotes for filter
        const uniqueClients = Array.from(new Map(quotes.filter(q => q.client_id).map(q => [q.client_id, q.client_name])).entries());

        // Conversion rate
        const convRate = s.stats.quotes_total > 0 ? ((s.stats.quotes_accepted / s.stats.quotes_total) * 100).toFixed(0) : "0";

        return (
            <div className="space-y-6 max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex items-center gap-3 flex-wrap">
                    <button onClick={() => setSelectedSeller(null)} className="p-2 bg-white rounded-full shadow-sm border border-gray-100 hover:bg-gray-50"><ArrowLeft size={18} /></button>
                    <div className="flex-1 min-w-0">
                        <h2 className="text-xl font-bold text-gray-900">{s.full_name}</h2>
                        <p className="text-sm text-gray-500">{s.email}</p>
                    </div>
                    <button onClick={() => openEditModal(s)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm">
                        <Pencil size={14} /> Editar
                    </button>
                    {s.commission_pct ? (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">{s.commission_pct}% comisión</span>
                    ) : null}
                    {!s.data_complete && (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 border border-amber-200 animate-pulse">
                            ⚠️ Datos Incompletos
                        </span>
                    )}
                </div>

                {/* KPI Row 1: Clients */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                        <div className="flex items-center gap-2 mb-1">
                            <Building2 size={14} className="text-blue-500" />
                            <span className="text-[11px] text-gray-500 font-medium">Clientes Asignados</span>
                        </div>
                        <span className="text-2xl font-bold text-blue-600">{s.stats.clients_assigned}</span>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                        <div className="flex items-center gap-2 mb-1">
                            <Award size={14} className="text-green-500" />
                            <span className="text-[11px] text-gray-500 font-medium">Clientes Ganados</span>
                        </div>
                        <span className="text-2xl font-bold text-green-600">{s.stats.clients_won}</span>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                        <div className="flex items-center gap-2 mb-1">
                            <TrendingUp size={14} className="text-indigo-500" />
                            <span className="text-[11px] text-gray-500 font-medium">Tasa Conversión</span>
                        </div>
                        <span className="text-2xl font-bold text-indigo-600">{convRate}%</span>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                        <div className="flex items-center gap-2 mb-1">
                            <DollarSign size={14} className="text-emerald-500" />
                            <span className="text-[11px] text-gray-500 font-medium">Total Facturado</span>
                        </div>
                        <span className="text-xl font-bold text-emerald-600">{fmt(s.stats.invoices_total)}</span>
                    </div>
                </div>

                {/* KPI Row 2: Quote status breakdown */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-white rounded-xl border-l-4 border-l-gray-400 border border-gray-100 shadow-sm p-3 cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => { setStatusFilter("all"); setDetailTab("timeline"); }}>
                        <p className="text-[11px] text-gray-500 font-medium">Presupuestos Asignados</p>
                        <p className="text-xl font-bold text-gray-800">{s.stats.quotes_total}</p>
                        <p className="text-[10px] text-gray-400">{fmt(s.stats.quotes_amount)}</p>
                    </div>
                    <div className="bg-white rounded-xl border-l-4 border-l-green-500 border border-gray-100 shadow-sm p-3 cursor-pointer hover:bg-green-50/50 transition-colors" onClick={() => { setStatusFilter("Accepted"); setDetailTab("timeline"); }}>
                        <p className="text-[11px] text-green-600 font-medium">Presupuestos Ganados</p>
                        <p className="text-xl font-bold text-green-700">{s.stats.quotes_accepted}</p>
                        <p className="text-[10px] text-green-500">{fmt(s.stats.quotes_accepted_amount)}</p>
                    </div>
                    <div className="bg-white rounded-xl border-l-4 border-l-red-400 border border-gray-100 shadow-sm p-3 cursor-pointer hover:bg-red-50/50 transition-colors" onClick={() => { setStatusFilter("Rejected"); setDetailTab("timeline"); }}>
                        <p className="text-[11px] text-red-500 font-medium">Presupuestos Perdidos</p>
                        <p className="text-xl font-bold text-red-600">{s.stats.quotes_rejected}</p>
                        <p className="text-[10px] text-red-400">{fmt(s.stats.quotes_rejected_amount)}</p>
                    </div>
                    <div className="bg-white rounded-xl border-l-4 border-l-blue-400 border border-gray-100 shadow-sm p-3 cursor-pointer hover:bg-blue-50/50 transition-colors" onClick={() => { setStatusFilter("Sent"); setDetailTab("timeline"); }}>
                        <p className="text-[11px] text-blue-500 font-medium">En Proceso</p>
                        <p className="text-xl font-bold text-blue-600">{s.stats.quotes_sent + s.stats.quotes_draft}</p>
                        <p className="text-[10px] text-blue-400">{s.stats.quotes_sent} enviados · {s.stats.quotes_draft} borradores</p>
                    </div>
                </div>

                {/* Tabs + Filters */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                    <div className="flex bg-gray-100 rounded-lg p-0.5">
                        <button onClick={() => setDetailTab("timeline")}
                            className={`px-4 py-1.5 text-sm rounded-md transition-colors font-medium ${detailTab === "timeline" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
                            Línea de Tiempo
                        </button>
                        <button onClick={() => setDetailTab("clients")}
                            className={`px-4 py-1.5 text-sm rounded-md transition-colors font-medium ${detailTab === "clients" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
                            Por Cliente
                        </button>
                    </div>

                    {detailTab === "timeline" && (
                        <div className="flex items-center gap-2 flex-wrap ml-auto">
                            <Filter size={14} className="text-gray-400" />
                            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
                                className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:ring-2 focus:ring-blue-500">
                                <option value="all">Todos los estados</option>
                                <option value="Accepted">✅ Ganados</option>
                                <option value="Rejected">❌ Perdidos</option>
                                <option value="Sent">📤 Enviados</option>
                                <option value="Draft">📝 Borradores</option>
                            </select>
                            <select value={clientFilter} onChange={(e) => setClientFilter(e.target.value)}
                                className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:ring-2 focus:ring-blue-500">
                                <option value="all">Todos los clientes</option>
                                {uniqueClients.map(([id, name]) => (
                                    <option key={id} value={String(id)}>{name}</option>
                                ))}
                            </select>
                            {(statusFilter !== "all" || clientFilter !== "all") && (
                                <button onClick={() => { setStatusFilter("all"); setClientFilter("all"); }}
                                    className="text-xs text-blue-600 hover:text-blue-800 font-medium">Limpiar</button>
                            )}
                        </div>
                    )}
                </div>

                {/* Timeline Tab */}
                {detailTab === "timeline" && (
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                        {filteredQuotes.length === 0 ? (
                            <div className="p-10 text-center text-gray-400">
                                <FileText size={32} className="mx-auto mb-2 text-gray-300" />
                                <p className="text-sm">No hay presupuestos {statusFilter !== "all" ? "con ese filtro" : ""}</p>
                            </div>
                        ) : (
                            <div className="relative">
                                {/* Timeline line */}
                                <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gray-100"></div>

                                {filteredQuotes.map((q, i) => {
                                    const cfg = statusConfig[q.status] || statusConfig.Draft;
                                    const Icon = cfg.icon;
                                    return (
                                        <div key={q.id} className="relative flex items-start gap-4 px-5 py-4 hover:bg-gray-50/50 transition-colors">
                                            {/* Timeline dot */}
                                            <div className={`relative z-10 w-7 h-7 rounded-full ${cfg.bg} flex items-center justify-center flex-shrink-0`}>
                                                <Icon size={14} className={cfg.text} />
                                            </div>

                                            {/* Content */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="text-sm font-semibold text-gray-900">{q.quote_number}</span>
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${cfg.bg} ${cfg.text}`}>
                                                        {cfg.label}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                                                    <span className="flex items-center gap-1"><Building2 size={11} /> {q.client_name}</span>
                                                    {q.issue_date && <span>{q.issue_date}</span>}
                                                </div>
                                            </div>

                                            {/* Amount + commission */}
                                            <div className="text-right flex-shrink-0">
                                                <div className="text-sm font-bold text-gray-900">
                                                    {q.total_amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} <span className="text-xs text-gray-400">{q.currency}</span>
                                                </div>
                                                {q.commission_pct > 0 && (
                                                    <div className="text-[11px] text-green-600 font-medium">
                                                        {q.commission_pct}% → {q.commission_amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* Clients Tab */}
                {detailTab === "clients" && (
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                        {clients.length === 0 ? (
                            <div className="p-10 text-center text-gray-400">
                                <Building2 size={32} className="mx-auto mb-2 text-gray-300" />
                                <p className="text-sm">No hay clientes asignados</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-50">
                                {clients.map(c => (
                                    <div key={c.id} className="px-5 py-4 hover:bg-gray-50/50 transition-colors">
                                        <div className="flex items-center gap-3 flex-wrap">
                                            <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${c.is_won ? 'bg-green-100' : 'bg-gray-100'}`}>
                                                {c.is_won ? <Award size={16} className="text-green-600" /> : <Building2 size={16} className="text-gray-400" />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-semibold text-gray-900">{c.name}</span>
                                                    {c.is_won && (
                                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-green-100 text-green-700">GANADO</span>
                                                    )}
                                                </div>
                                                <p className="text-[11px] text-gray-400">{c.cuit_dni || ''} {c.email ? `· ${c.email}` : ''}</p>
                                            </div>

                                            {/* Quote stats per client */}
                                            <div className="flex items-center gap-3 text-center text-xs flex-shrink-0">
                                                <div>
                                                    <p className="text-gray-400">Total</p>
                                                    <p className="font-bold text-gray-700">{c.quotes_total}</p>
                                                </div>
                                                <div>
                                                    <p className="text-green-500">Ganados</p>
                                                    <p className="font-bold text-green-600">{c.quotes_won}</p>
                                                </div>
                                                <div>
                                                    <p className="text-red-400">Perdidos</p>
                                                    <p className="font-bold text-red-500">{c.quotes_lost}</p>
                                                </div>
                                                <div>
                                                    <p className="text-blue-400">Pendiente</p>
                                                    <p className="font-bold text-blue-500">{c.quotes_pending}</p>
                                                </div>
                                                {c.amount_won > 0 && (
                                                    <div className="pl-2 border-l border-gray-100">
                                                        <p className="text-green-500">Monto Ganado</p>
                                                        <p className="font-bold text-green-700">{fmt(c.amount_won)}</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Mini progress bar: won vs lost vs pending */}
                                        {c.quotes_total > 0 && (
                                            <div className="mt-2 ml-12 flex rounded-full overflow-hidden h-1.5 bg-gray-100">
                                                {c.quotes_won > 0 && <div className="bg-green-500" style={{ width: `${(c.quotes_won / c.quotes_total) * 100}%` }}></div>}
                                                {c.quotes_pending > 0 && <div className="bg-blue-400" style={{ width: `${(c.quotes_pending / c.quotes_total) * 100}%` }}></div>}
                                                {c.quotes_lost > 0 && <div className="bg-red-400" style={{ width: `${(c.quotes_lost / c.quotes_total) * 100}%` }}></div>}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {editModal && renderEditModal()}
            </div>
        );
    }

    // ═══════════════════════════════════════════
    // Edit Modal
    // ═══════════════════════════════════════════
    const renderEditModal = () => (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
                {/* Gradient Header */}
                <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-5 text-white flex-shrink-0">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                                <Users size={22} />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold">Editar Vendedor</h2>
                                <p className="text-blue-100 text-sm">Datos del vendedor y comisión</p>
                            </div>
                        </div>
                        <button onClick={() => setEditModal(false)} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
                            <X size={18} />
                        </button>
                    </div>
                </div>

                <form onSubmit={handleEditSubmit} className="overflow-y-auto flex-1 p-6 space-y-6">
                    {/* Datos Personales */}
                    <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 space-y-4">
                        <h4 className="text-xs font-semibold text-indigo-700 uppercase tracking-wide flex items-center">
                            <Users size={14} className="mr-1.5" /> Datos Personales
                        </h4>
                        <div>
                            <label className="block text-xs text-gray-600 mb-1">Nombre completo *</label>
                            <input type="text" required value={editForm.full_name} onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 bg-white" />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-600 mb-1">Email *</label>
                            <input type="email" required value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 bg-white" />
                        </div>
                    </div>

                    {/* Comisión */}
                    <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-4">
                        <h4 className="text-xs font-semibold text-green-700 uppercase tracking-wide flex items-center">
                            <Percent size={14} className="mr-1.5" /> Comisión
                        </h4>
                        <div className="flex items-center gap-2">
                            <input type="number" min="0" max="100" step="0.5" value={editForm.commission_pct} onChange={(e) => setEditForm({ ...editForm, commission_pct: Number(e.target.value) })} className="w-28 px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 bg-white text-center" />
                            <Percent size={16} className="text-gray-400" />
                        </div>
                    </div>

                    {/* Estado */}
                    <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                        <div className="flex items-center gap-3">
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" checked={editForm.is_active} onChange={(e) => setEditForm({ ...editForm, is_active: e.target.checked })} className="sr-only peer" />
                                <div className="w-9 h-5 bg-gray-200 peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                            </label>
                            <span className="text-sm font-medium text-gray-700">Activo</span>
                        </div>
                    </div>
                </form>

                {/* Footer */}
                <div className="p-5 border-t border-gray-100 flex justify-between items-center flex-shrink-0 bg-gray-50">
                    <button type="button" onClick={() => setEditModal(false)} className="px-4 py-2.5 text-gray-600 hover:text-gray-900 text-sm font-medium">Cancelar</button>
                    <button onClick={handleEditSubmit} className="flex items-center px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-medium hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-200 transition-all">
                        Guardar
                    </button>
                </div>
            </div>
        </div>
    );

    // ═══════════════════════════════════════════
    // Main Listing
    // ═══════════════════════════════════════════
    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl shadow-md">
                        <Users size={22} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-gray-900">Espacio de Vendedores</h1>
                        <p className="text-xs text-gray-500">Seguimiento de ventas y clientes por vendedor</p>
                    </div>
                </div>
            </div>

            {/* Summary stats */}
            {sellers.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
                        <p className="text-[11px] text-gray-500 font-medium mb-1">Vendedores</p>
                        <p className="text-2xl font-bold text-gray-900">{sellers.length}</p>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
                        <p className="text-[11px] text-gray-500 font-medium mb-1">Total Clientes</p>
                        <p className="text-2xl font-bold text-blue-600">{sellers.reduce((a, s) => a + s.stats.clients_assigned, 0)}</p>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
                        <p className="text-[11px] text-gray-500 font-medium mb-1">Presupuestos</p>
                        <p className="text-2xl font-bold text-indigo-600">{sellers.reduce((a, s) => a + s.stats.quotes_total, 0)}</p>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
                        <p className="text-[11px] text-gray-500 font-medium mb-1">Total Facturado</p>
                        <p className="text-2xl font-bold text-emerald-600">{fmt(sellers.reduce((a, s) => a + s.stats.invoices_total, 0))}</p>
                    </div>
                </div>
            )}
            {/* Monthly Chart */}
            {sellers.length > 0 && monthlyData.length > 0 && (() => {
                // Color palette per seller
                const sellerColors = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6'];
                const filteredMeta = chartSellerFilter === "all" ? sellerMeta : sellerMeta.filter(s => String(s.id) === chartSellerFilter);
                const suffix = chartMode === "qty" ? "" : "_amount";

                return (
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
                            <div>
                                <h3 className="text-sm font-bold text-gray-800">Evolución Mensual por Vendedor</h3>
                                <p className="text-[11px] text-gray-400">Últimos 12 meses — presupuestos asignados, ganados y perdidos</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <select value={chartSellerFilter} onChange={(e) => setChartSellerFilter(e.target.value)}
                                    className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:ring-2 focus:ring-blue-500">
                                    <option value="all">Todos los vendedores</option>
                                    {sellerMeta.map(s => (
                                        <option key={s.id} value={String(s.id)}>{s.name}</option>
                                    ))}
                                </select>
                                <div className="flex bg-gray-100 rounded-lg p-0.5">
                                    <button onClick={() => setChartMode("qty")}
                                        className={`px-3 py-1 text-xs rounded-md transition-colors font-medium flex items-center gap-1 ${chartMode === 'qty' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>
                                        <Hash size={12} /> Cantidad
                                    </button>
                                    <button onClick={() => setChartMode("amount")}
                                        className={`px-3 py-1 text-xs rounded-md transition-colors font-medium flex items-center gap-1 ${chartMode === 'amount' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>
                                        <DollarSign size={12} /> Valor $
                                    </button>
                                </div>
                            </div>
                        </div>

                        <ResponsiveContainer width="100%" height={320}>
                            <LineChart data={monthlyData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                                <XAxis dataKey="month_name" tick={{ fontSize: 11, fill: '#9ca3af' }} />
                                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }}
                                    tickFormatter={chartMode === 'amount' ? (v: number) => v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(v) : undefined}
                                />
                                <Tooltip
                                    contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', fontSize: '12px' }}
                                    formatter={(value: number) => chartMode === 'amount' ? [fmt(value), ''] : [value, '']}
                                />
                                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                                {filteredMeta.map((s, i) => {
                                    const color = sellerColors[i % sellerColors.length];
                                    const shortName = s.name.split(' ')[0];
                                    return [
                                        <Line key={`${s.prefix}_assigned`} type="monotone" dataKey={`${s.prefix}${suffix}_assigned`}
                                            stroke={color} strokeWidth={2} dot={{ r: 3 }} name={`${shortName} Asignados`} />,
                                        <Line key={`${s.prefix}_won`} type="monotone" dataKey={`${s.prefix}${suffix}_won`}
                                            stroke={color} strokeWidth={2.5} strokeDasharray="" dot={{ r: 4, fill: color }}
                                            name={`${shortName} Ganados`} />,
                                        <Line key={`${s.prefix}_lost`} type="monotone" dataKey={`${s.prefix}${suffix}_lost`}
                                            stroke={color} strokeWidth={1.5} strokeDasharray="5 5" dot={{ r: 2 }}
                                            name={`${shortName} Perdidos`} opacity={0.6} />,
                                    ];
                                })}
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                );
            })()}

            {/* Seller cards */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                {loading ? (
                    <div className="p-12 text-center text-gray-500">Cargando vendedores...</div>
                ) : sellers.length === 0 ? (
                    <div className="p-12 text-center text-gray-400">
                        <Users size={40} className="mx-auto mb-3 text-gray-300" />
                        <p className="font-medium">No hay vendedores registrados</p>
                        <p className="text-sm mt-1">Andá a <strong>Usuarios</strong> y asigná el rol <strong>Vendedor</strong></p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-50">
                        {sellers.map(seller => (
                            <div key={seller.id} onClick={() => openSeller(seller)}
                                className="px-5 py-4 flex items-center gap-4 hover:bg-gray-50/50 cursor-pointer transition-colors group">
                                <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm">
                                    <span className="text-white font-bold text-sm">{seller.full_name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <h4 className="text-sm font-semibold text-gray-900">{seller.full_name}</h4>
                                        {!seller.data_complete && (
                                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-700 border border-amber-200">
                                                Datos Incompletos
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-[11px] text-gray-400">{seller.email}</p>
                                </div>
                                {seller.commission_pct ? (
                                    <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-50 text-green-600 border border-green-100">
                                        {seller.commission_pct}%
                                    </span>
                                ) : null}
                                <div className="hidden sm:flex items-center gap-4 text-center">
                                    <div>
                                        <p className="text-xs text-gray-400">Clientes</p>
                                        <p className="text-sm font-bold text-gray-800">{seller.stats.clients_assigned}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-400">Presup.</p>
                                        <p className="text-sm font-bold text-indigo-600">{seller.stats.quotes_total}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-green-500">Ganados</p>
                                        <p className="text-sm font-bold text-green-600">{seller.stats.quotes_accepted}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-400">Facturado</p>
                                        <p className="text-sm font-bold text-emerald-600">{fmt(seller.stats.invoices_total)}</p>
                                    </div>
                                </div>
                                <button onClick={(e) => openEditModal(seller, e)}
                                    className="p-1.5 text-gray-300 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100" title="Editar">
                                    <Pencil size={15} />
                                </button>
                                <ChevronRight size={16} className="text-gray-300 group-hover:text-gray-500 transition-colors flex-shrink-0" />
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {editModal && renderEditModal()}
        </div>
    );
}
