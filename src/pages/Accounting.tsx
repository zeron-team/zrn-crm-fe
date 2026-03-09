import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../api/client";
import {
    Calculator, Plus, Trash2, Edit3, ChevronDown, ChevronUp,
    FileText, AlertTriangle, CheckCircle, Clock, DollarSign,
    TrendingUp, TrendingDown, Search, Filter, Calendar, X,
    ExternalLink, RefreshCw, Building2, Receipt, ShoppingCart
} from "lucide-react";

interface Period {
    id: number; month: number; month_name: string; year: number;
    status: string;
    total_ingresos: number; total_egresos: number;
    total_impuestos: number; total_cargas_sociales: number;
    total_retenciones: number; total_percepciones: number;
    notes: string | null; entry_count: number;
    created_by_name: string | null;
    created_at: string | null; updated_at: string | null;
    entries?: Entry[];
}

interface Entry {
    id: number; period_id: number;
    concept: string; category: string; subcategory: string | null;
    amount: number; tax_rate: number | null; tax_amount: number;
    reference: string | null; date: string | null; notes: string | null;
}

interface Obligation {
    id: number; tax_type: string;
    period_month: number | null; period_month_name: string | null;
    period_year: number; due_date: string; status: string;
    amount: number; filed_date: string | null; payment_date: string | null;
    reference_number: string | null; notes: string | null;
}

interface DashboardData {
    company: any;
    year: number;
    total_periods: number; draft_periods: number;
    confirmed_periods: number; filed_periods: number;
    pending_obligations: number; overdue_obligations: number;
    upcoming_obligations: Obligation[];
    monthly_breakdown: { month: number; month_name: string; ingresos: number; egresos: number; impuestos: number }[];
}

interface CompanyCtx {
    company: any;
    year: number;
    ventas: { count: number; total: number; neto: number; iva: number };
    compras: { count: number; total: number };
    recibidas: { count: number; total: number };
}

const STATUS_COLORS: Record<string, string> = {
    draft: "bg-gray-100 text-gray-700",
    in_review: "bg-yellow-100 text-yellow-800",
    confirmed: "bg-blue-100 text-blue-800",
    filed: "bg-green-100 text-green-800",
    pending: "bg-amber-100 text-amber-800",
    paid: "bg-green-100 text-green-800",
    overdue: "bg-red-100 text-red-800",
};

const STATUS_LABELS: Record<string, string> = {
    draft: "Borrador", in_review: "En Revisión", confirmed: "Confirmado", filed: "Presentado",
    pending: "Pendiente", paid: "Pagado", overdue: "Vencido",
};

const CATEGORY_COLORS: Record<string, string> = {
    ingreso: "bg-emerald-50 text-emerald-700 border-emerald-200",
    egreso: "bg-red-50 text-red-700 border-red-200",
    impuesto: "bg-violet-50 text-violet-700 border-violet-200",
    carga_social: "bg-blue-50 text-blue-700 border-blue-200",
    retencion: "bg-amber-50 text-amber-700 border-amber-200",
    percepcion: "bg-orange-50 text-orange-700 border-orange-200",
};

const CATEGORY_LABELS: Record<string, string> = {
    ingreso: "Ingreso", egreso: "Egreso", impuesto: "Impuesto",
    carga_social: "Carga Social", retencion: "Retención", percepcion: "Percepción",
};

const TAX_TYPES = ["IVA", "IIBB", "Ganancias", "F931", "Monotributo", "DDJJ_Annual"];

export default function Accounting() {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<"dashboard" | "periods" | "obligations">("dashboard");
    const [periods, setPeriods] = useState<Period[]>([]);
    const [obligations, setObligations] = useState<Obligation[]>([]);
    const [dashboard, setDashboard] = useState<DashboardData | null>(null);
    const [companyCtx, setCompanyCtx] = useState<CompanyCtx | null>(null);
    const [loading, setLoading] = useState(true);

    // Filters
    const [filterYear, setFilterYear] = useState(new Date().getFullYear());
    const [filterStatus, setFilterStatus] = useState("");

    // Modals
    const [showPeriodModal, setShowPeriodModal] = useState(false);
    const [showEntryModal, setShowEntryModal] = useState(false);
    const [showOblModal, setShowOblModal] = useState(false);
    const [expandedPeriod, setExpandedPeriod] = useState<number | null>(null);
    const [periodDetail, setPeriodDetail] = useState<Period | null>(null);

    // Form data — no client_id needed, company-owned
    const [periodForm, setPeriodForm] = useState({ month: new Date().getMonth() + 1, year: new Date().getFullYear(), notes: "" });
    const [entryForm, setEntryForm] = useState({ concept: "", category: "ingreso", subcategory: "", amount: 0, tax_rate: 0, tax_amount: 0, reference: "", date: "", notes: "" });
    const [oblForm, setOblForm] = useState({ tax_type: "IVA", period_month: new Date().getMonth() + 1, period_year: new Date().getFullYear(), due_date: "", amount: 0, notes: "" });

    useEffect(() => { fetchAll(); }, [filterYear, filterStatus]);

    const fetchAll = async () => {
        setLoading(true);
        try {
            const [pRes, oRes, dRes, ctxRes] = await Promise.all([
                api.get("/accounting/periods", { params: { year: filterYear || undefined, status: filterStatus || undefined } }),
                api.get("/accounting/obligations", { params: { year: filterYear || undefined, status: filterStatus || undefined } }),
                api.get("/accounting/dashboard"),
                api.get("/accounting/company-context"),
            ]);
            setPeriods(pRes.data);
            setObligations(oRes.data);
            setDashboard(dRes.data);
            setCompanyCtx(ctxRes.data);
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    const handleCreatePeriod = async () => {
        try {
            await api.post("/accounting/periods", periodForm);
            setShowPeriodModal(false);
            setPeriodForm({ month: new Date().getMonth() + 1, year: new Date().getFullYear(), notes: "" });
            fetchAll();
        } catch (e: any) { alert(e.response?.data?.detail || "Error"); }
    };

    const handleDeletePeriod = async (id: number) => {
        if (!confirm("¿Eliminar este período?")) return;
        try { await api.delete(`/accounting/periods/${id}`); fetchAll(); }
        catch (e: any) { alert(e.response?.data?.detail || "Error"); }
    };

    const handleStatusChange = async (id: number, status: string) => {
        try { await api.put(`/accounting/periods/${id}/status`, { status }); fetchAll(); }
        catch (e: any) { alert(e.response?.data?.detail || "Error"); }
    };

    const expandPeriod = async (id: number) => {
        if (expandedPeriod === id) { setExpandedPeriod(null); setPeriodDetail(null); return; }
        try {
            const res = await api.get(`/accounting/periods/${id}`);
            setPeriodDetail(res.data);
            setExpandedPeriod(id);
        } catch (e) { console.error(e); }
    };

    const handleAddEntry = async (periodId: number) => {
        try {
            await api.post(`/accounting/periods/${periodId}/entries`, {
                ...entryForm, amount: Number(entryForm.amount), tax_rate: Number(entryForm.tax_rate) || null, tax_amount: Number(entryForm.tax_amount),
                date: entryForm.date || null,
            });
            setShowEntryModal(false);
            setEntryForm({ concept: "", category: "ingreso", subcategory: "", amount: 0, tax_rate: 0, tax_amount: 0, reference: "", date: "", notes: "" });
            expandPeriod(periodId);
            fetchAll();
        } catch (e: any) { alert(e.response?.data?.detail || "Error"); }
    };

    const handleDeleteEntry = async (entryId: number, periodId: number) => {
        try { await api.delete(`/accounting/entries/${entryId}`); expandPeriod(periodId); fetchAll(); }
        catch (e) { console.error(e); }
    };

    const handleCreateObl = async () => {
        try {
            await api.post("/accounting/obligations", {
                ...oblForm, amount: Number(oblForm.amount),
                period_month: Number(oblForm.period_month) || null,
            });
            setShowOblModal(false);
            setOblForm({ tax_type: "IVA", period_month: new Date().getMonth() + 1, period_year: new Date().getFullYear(), due_date: "", amount: 0, notes: "" });
            fetchAll();
        } catch (e: any) { alert(e.response?.data?.detail || "Error"); }
    };

    const handleUpdateOblStatus = async (id: number, status: string) => {
        try {
            const extra: any = { status };
            if (status === "filed") extra.filed_date = new Date().toISOString().split("T")[0];
            if (status === "paid") extra.payment_date = new Date().toISOString().split("T")[0];
            await api.put(`/accounting/obligations/${id}`, extra);
            fetchAll();
        } catch (e) { console.error(e); }
    };

    const handleDeleteObl = async (id: number) => {
        if (!confirm("¿Eliminar esta obligación?")) return;
        try { await api.delete(`/accounting/obligations/${id}`); fetchAll(); }
        catch (e) { console.error(e); }
    };

    const fmt = (n: number) => new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(n);

    const co = companyCtx?.company || dashboard?.company || {};
    const companyName = co.company_name || "Mi Empresa";

    const tabs = [
        { id: "dashboard" as const, label: "Dashboard", icon: TrendingUp },
        { id: "periods" as const, label: "Liquidaciones", icon: FileText },
        { id: "obligations" as const, label: "Obligaciones Fiscales", icon: AlertTriangle },
    ];

    // ═══════════════════════════════════
    //  RENDER
    // ═══════════════════════════════════
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100 gap-4">
                <div className="flex items-center space-x-3">
                    <div className="p-2.5 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl shadow-lg">
                        <Calculator size={24} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">Contabilidad</h1>
                        <p className="text-sm text-gray-500">{companyName} — Ejercicio {filterYear}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <button onClick={fetchAll} className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50"><RefreshCw size={18} /></button>
                    {activeTab === "periods" && (
                        <button onClick={() => setShowPeriodModal(true)} className="flex items-center px-4 py-2 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-lg shadow-md hover:shadow-lg transition-all font-medium text-sm">
                            <Plus size={18} className="mr-1.5" /> Nuevo Período
                        </button>
                    )}
                    {activeTab === "obligations" && (
                        <button onClick={() => setShowOblModal(true)} className="flex items-center px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-lg shadow-md hover:shadow-lg transition-all font-medium text-sm">
                            <Plus size={18} className="mr-1.5" /> Nueva Obligación
                        </button>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <div className="flex space-x-1 bg-white p-1 rounded-xl shadow-sm border border-gray-100">
                {tabs.map(t => (
                    <button key={t.id} onClick={() => setActiveTab(t.id)}
                        className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === t.id ? 'bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-50'}`}>
                        <t.icon size={16} /> {t.label}
                    </button>
                ))}
            </div>

            {/* Filters */}
            {activeTab !== "dashboard" && (
                <div className="flex flex-wrap gap-3 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <select value={filterYear} onChange={e => setFilterYear(Number(e.target.value))} className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50">
                        {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                    <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50">
                        <option value="">Todos los estados</option>
                        {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                </div>
            )}

            {loading ? (
                <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500"></div></div>
            ) : (
                <>
                    {/* ═══ DASHBOARD TAB ═══ */}
                    {activeTab === "dashboard" && dashboard && (
                        <div className="space-y-6">
                            {/* Company Identity Banner */}
                            <div className="bg-gradient-to-r from-slate-700 via-slate-800 to-slate-900 rounded-2xl p-5 flex flex-col sm:flex-row items-center gap-5 shadow-lg">
                                {co.logo_url ? (
                                    <div className="w-16 h-16 bg-white/10 rounded-xl flex items-center justify-center overflow-hidden shrink-0">
                                        <img src={co.logo_url} alt="Logo" className="w-full h-full object-contain p-1.5" />
                                    </div>
                                ) : (
                                    <div className="w-16 h-16 bg-white/10 rounded-xl flex items-center justify-center shrink-0">
                                        <Building2 size={28} className="text-white/40" />
                                    </div>
                                )}
                                <div className="flex-1 text-center sm:text-left">
                                    <h3 className="text-white font-bold text-lg">{companyName}</h3>
                                    {co.fantasy_name && co.fantasy_name !== companyName && (
                                        <p className="text-white/50 text-sm">{co.fantasy_name}</p>
                                    )}
                                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 mt-2">
                                        {co.cuit && <span className="px-2.5 py-1 bg-white/10 rounded-lg text-xs font-bold text-white/80">CUIT: {co.cuit}</span>}
                                        {co.iva_condition && <span className="px-2.5 py-1 bg-violet-500/30 rounded-lg text-xs font-bold text-violet-200">{co.iva_condition}</span>}
                                        {co.default_currency && <span className="px-2.5 py-1 bg-emerald-500/30 rounded-lg text-xs font-bold text-emerald-200">💰 {co.default_currency}</span>}
                                        {co.address && (
                                            <span className="text-xs text-white/40">
                                                📍 {[co.address, co.city, co.province].filter(Boolean).join(", ")}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="text-center shrink-0">
                                    <p className="text-white/40 text-[10px] uppercase font-bold">Ejercicio</p>
                                    <p className="text-white text-2xl font-black">{dashboard.year}</p>
                                </div>
                            </div>

                            {/* Billing / Purchase KPIs from real data */}
                            {companyCtx && (
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                                        <div className="flex items-center justify-between mb-3">
                                            <span className="text-xs font-bold text-gray-500 uppercase">Facturación (Ventas)</span>
                                            <div className="p-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600"><Receipt size={14} className="text-white" /></div>
                                        </div>
                                        <p className="text-2xl font-black text-gray-800">{fmt(companyCtx.ventas.total)}</p>
                                        <div className="flex items-center gap-3 mt-2">
                                            <span className="text-[10px] text-gray-400">{companyCtx.ventas.count} facturas</span>
                                            <span className="text-[10px] text-emerald-600 font-bold">Neto: {fmt(companyCtx.ventas.neto)}</span>
                                            <span className="text-[10px] text-violet-600 font-bold">IVA: {fmt(companyCtx.ventas.iva)}</span>
                                        </div>
                                    </div>
                                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                                        <div className="flex items-center justify-between mb-3">
                                            <span className="text-xs font-bold text-gray-500 uppercase">Órdenes de Compra</span>
                                            <div className="p-1.5 rounded-lg bg-gradient-to-r from-red-500 to-rose-600"><ShoppingCart size={14} className="text-white" /></div>
                                        </div>
                                        <p className="text-2xl font-black text-gray-800">{fmt(companyCtx.compras.total)}</p>
                                        <span className="text-[10px] text-gray-400">{companyCtx.compras.count} órdenes</span>
                                    </div>
                                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                                        <div className="flex items-center justify-between mb-3">
                                            <span className="text-xs font-bold text-gray-500 uppercase">Comprobantes Recibidos</span>
                                            <div className="p-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-600"><FileText size={14} className="text-white" /></div>
                                        </div>
                                        <p className="text-2xl font-black text-gray-800">{fmt(companyCtx.recibidas.total)}</p>
                                        <span className="text-[10px] text-gray-400">{companyCtx.recibidas.count} comprobantes</span>
                                    </div>
                                </div>
                            )}

                            {/* Period KPIs */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {[
                                    { label: "Total Períodos", value: dashboard.total_periods, icon: FileText, color: "from-violet-500 to-purple-600" },
                                    { label: "En Borrador", value: dashboard.draft_periods, icon: Edit3, color: "from-gray-400 to-gray-500" },
                                    { label: "Confirmados", value: dashboard.confirmed_periods, icon: CheckCircle, color: "from-blue-500 to-cyan-600" },
                                    { label: "Presentados", value: dashboard.filed_periods, icon: FileText, color: "from-green-500 to-emerald-600" },
                                ].map((card, i) => (
                                    <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-xs font-medium text-gray-500">{card.label}</span>
                                            <div className={`p-1.5 rounded-lg bg-gradient-to-r ${card.color}`}>
                                                <card.icon size={14} className="text-white" />
                                            </div>
                                        </div>
                                        <p className="text-2xl font-bold text-gray-800">{card.value}</p>
                                    </div>
                                ))}
                            </div>

                            {/* Obligations + Monthly Breakdown */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                                    <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                                        <AlertTriangle size={16} className="text-amber-500" /> Obligaciones Pendientes
                                    </h3>
                                    <div className="flex items-center gap-6 mb-4">
                                        <div>
                                            <p className="text-3xl font-bold text-amber-600">{dashboard.pending_obligations}</p>
                                            <p className="text-xs text-gray-500">Pendientes</p>
                                        </div>
                                        <div>
                                            <p className="text-3xl font-bold text-red-600">{dashboard.overdue_obligations}</p>
                                            <p className="text-xs text-gray-500">Vencidas</p>
                                        </div>
                                    </div>
                                    {dashboard.upcoming_obligations.length > 0 && (
                                        <div className="space-y-2">
                                            <p className="text-xs font-semibold text-gray-500 uppercase">Próximos Vencimientos</p>
                                            {dashboard.upcoming_obligations.map(o => (
                                                <div key={o.id} className="flex items-center justify-between p-2 rounded-lg bg-amber-50 border border-amber-100">
                                                    <span className="text-xs font-bold text-gray-800">{o.tax_type}</span>
                                                    <div className="text-xs font-medium text-amber-700">{o.due_date}</div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Monthly Breakdown */}
                                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                                    <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                                        <DollarSign size={16} className="text-emerald-500" /> Resumen Mensual ({dashboard.year})
                                    </h3>
                                    {dashboard.monthly_breakdown && dashboard.monthly_breakdown.length > 0 ? (
                                        <div className="space-y-2">
                                            {dashboard.monthly_breakdown.map(m => (
                                                <div key={m.month} className="p-2.5 rounded-lg bg-gray-50 border border-gray-100">
                                                    <p className="text-xs font-bold text-gray-700 mb-1">{m.month_name}</p>
                                                    <div className="grid grid-cols-3 gap-2 text-xs">
                                                        <div><span className="text-emerald-600 font-medium">Ingresos</span><br />{fmt(m.ingresos)}</div>
                                                        <div><span className="text-red-600 font-medium">Egresos</span><br />{fmt(m.egresos)}</div>
                                                        <div><span className="text-violet-600 font-medium">Impuestos</span><br />{fmt(m.impuestos)}</div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-gray-400 italic py-4">Sin períodos registrados para este año. Creá uno desde la pestaña "Liquidaciones".</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ═══ PERIODS TAB ═══ */}
                    {activeTab === "periods" && (
                        <div className="space-y-4">
                            {periods.length === 0 ? (
                                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
                                    <FileText size={48} className="mx-auto text-gray-300 mb-4" />
                                    <p className="text-gray-500">No hay períodos registrados para {filterYear}</p>
                                    <p className="text-xs text-gray-400 mt-1">Cada período corresponde a un mes del ejercicio contable de {companyName}</p>
                                    <button onClick={() => setShowPeriodModal(true)} className="mt-4 px-4 py-2 bg-violet-500 text-white rounded-lg text-sm font-medium hover:bg-violet-600">Crear Primer Período</button>
                                </div>
                            ) : (
                                periods.map(p => (
                                    <div key={p.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                                        <div className="p-4 cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => expandPeriod(p.id)}>
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-violet-50 rounded-lg">
                                                        <FileText size={20} className="text-violet-600" />
                                                    </div>
                                                    <div>
                                                        <h3 className="font-bold text-gray-800">{p.month_name} {p.year}</h3>
                                                        <p className="text-xs text-gray-500">{p.entry_count} movimientos · Creado por {p.created_by_name}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${STATUS_COLORS[p.status]}`}>{STATUS_LABELS[p.status]}</span>
                                                    {expandedPeriod === p.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mt-3">
                                                <div className="text-center p-2 rounded-lg bg-emerald-50"><p className="text-[10px] text-emerald-600 font-bold">Ingresos</p><p className="text-sm font-bold text-emerald-800">{fmt(p.total_ingresos)}</p></div>
                                                <div className="text-center p-2 rounded-lg bg-red-50"><p className="text-[10px] text-red-600 font-bold">Egresos</p><p className="text-sm font-bold text-red-800">{fmt(p.total_egresos)}</p></div>
                                                <div className="text-center p-2 rounded-lg bg-violet-50"><p className="text-[10px] text-violet-600 font-bold">Impuestos</p><p className="text-sm font-bold text-violet-800">{fmt(p.total_impuestos)}</p></div>
                                                <div className="text-center p-2 rounded-lg bg-blue-50"><p className="text-[10px] text-blue-600 font-bold">Cargas Soc.</p><p className="text-sm font-bold text-blue-800">{fmt(p.total_cargas_sociales)}</p></div>
                                                <div className="text-center p-2 rounded-lg bg-amber-50"><p className="text-[10px] text-amber-600 font-bold">Retenciones</p><p className="text-sm font-bold text-amber-800">{fmt(p.total_retenciones)}</p></div>
                                                <div className="text-center p-2 rounded-lg bg-orange-50"><p className="text-[10px] text-orange-600 font-bold">Percepciones</p><p className="text-sm font-bold text-orange-800">{fmt(p.total_percepciones)}</p></div>
                                            </div>
                                        </div>

                                        {/* Expanded Detail */}
                                        {expandedPeriod === p.id && periodDetail && (
                                            <div className="border-t border-gray-100 p-4 bg-gray-50/50">
                                                <div className="flex items-center justify-between mb-3">
                                                    <h4 className="text-sm font-bold text-gray-700">Detalle de Movimientos</h4>
                                                    <div className="flex gap-2">
                                                        {p.status === "draft" && (
                                                            <>
                                                                <button onClick={(e) => { e.stopPropagation(); setShowEntryModal(true); }}
                                                                    className="flex items-center px-3 py-1.5 bg-violet-500 text-white rounded-lg text-xs font-medium hover:bg-violet-600">
                                                                    <Plus size={14} className="mr-1" /> Agregar
                                                                </button>
                                                                <button onClick={(e) => { e.stopPropagation(); handleStatusChange(p.id, "in_review"); }}
                                                                    className="px-3 py-1.5 bg-yellow-500 text-white rounded-lg text-xs font-medium hover:bg-yellow-600">Enviar a Revisión</button>
                                                                <button onClick={(e) => { e.stopPropagation(); handleDeletePeriod(p.id); }}
                                                                    className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={14} /></button>
                                                            </>
                                                        )}
                                                        {p.status === "in_review" && (
                                                            <button onClick={(e) => { e.stopPropagation(); handleStatusChange(p.id, "confirmed"); }}
                                                                className="px-3 py-1.5 bg-blue-500 text-white rounded-lg text-xs font-medium hover:bg-blue-600">Confirmar</button>
                                                        )}
                                                        {p.status === "confirmed" && (
                                                            <button onClick={(e) => { e.stopPropagation(); handleStatusChange(p.id, "filed"); }}
                                                                className="px-3 py-1.5 bg-green-500 text-white rounded-lg text-xs font-medium hover:bg-green-600">Marcar Presentado</button>
                                                        )}
                                                    </div>
                                                </div>
                                                {periodDetail.entries && periodDetail.entries.length > 0 ? (
                                                    <div className="overflow-x-auto">
                                                        <table className="w-full text-sm">
                                                            <thead>
                                                                <tr className="text-xs text-gray-500 border-b border-gray-200">
                                                                    <th className="text-left py-2 px-2">Concepto</th>
                                                                    <th className="text-left py-2 px-2">Categoría</th>
                                                                    <th className="text-right py-2 px-2">Monto</th>
                                                                    <th className="text-right py-2 px-2">Impuesto</th>
                                                                    <th className="text-left py-2 px-2">Referencia</th>
                                                                    <th className="text-center py-2 px-2">Acciones</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {periodDetail.entries.map(e => (
                                                                    <tr key={e.id} className="border-b border-gray-100 hover:bg-white">
                                                                        <td className="py-2 px-2 font-medium text-gray-800">{e.concept}</td>
                                                                        <td className="py-2 px-2">
                                                                            <span className={`px-2 py-0.5 rounded text-xs font-bold border ${CATEGORY_COLORS[e.category] || 'bg-gray-50'}`}>
                                                                                {CATEGORY_LABELS[e.category] || e.category}
                                                                            </span>
                                                                        </td>
                                                                        <td className="py-2 px-2 text-right font-mono font-bold">{fmt(e.amount)}</td>
                                                                        <td className="py-2 px-2 text-right text-gray-500">{e.tax_amount ? fmt(e.tax_amount) : "—"}</td>
                                                                        <td className="py-2 px-2 text-gray-500 text-xs">{e.reference || "—"}</td>
                                                                        <td className="py-2 px-2 text-center">
                                                                            {p.status === "draft" && (
                                                                                <button onClick={() => handleDeleteEntry(e.id, p.id)} className="text-red-400 hover:text-red-600"><Trash2 size={14} /></button>
                                                                            )}
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                ) : (
                                                    <p className="text-sm text-gray-400 italic text-center py-4">Sin movimientos registrados</p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    )}

                    {/* ═══ OBLIGATIONS TAB ═══ */}
                    {activeTab === "obligations" && (
                        <div className="space-y-3">
                            {obligations.length === 0 ? (
                                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
                                    <AlertTriangle size={48} className="mx-auto text-gray-300 mb-4" />
                                    <p className="text-gray-500">No hay obligaciones fiscales registradas para {filterYear}</p>
                                    <p className="text-xs text-gray-400 mt-1">Registrá las obligaciones impositivas de {companyName}</p>
                                    <button onClick={() => setShowOblModal(true)} className="mt-4 px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600">Crear Primera Obligación</button>
                                </div>
                            ) : (
                                obligations.map(o => (
                                    <div key={o.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2 rounded-lg ${o.status === 'overdue' ? 'bg-red-50' : o.status === 'paid' ? 'bg-green-50' : 'bg-amber-50'}`}>
                                                    {o.status === 'overdue' ? <AlertTriangle size={20} className="text-red-600" /> :
                                                        o.status === 'paid' ? <CheckCircle size={20} className="text-green-600" /> :
                                                            <Clock size={20} className="text-amber-600" />}
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-gray-800">{o.tax_type}</h3>
                                                    <p className="text-xs text-gray-500">
                                                        {o.period_month_name ? `${o.period_month_name} ${o.period_year}` : o.period_year} · Vence: {o.due_date}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="text-sm font-bold text-gray-800">{fmt(o.amount)}</span>
                                                <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${STATUS_COLORS[o.status]}`}>{STATUS_LABELS[o.status]}</span>
                                                <div className="flex gap-1">
                                                    {o.status === "pending" && (
                                                        <>
                                                            <button onClick={() => handleUpdateOblStatus(o.id, "filed")} className="px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded hover:bg-blue-100 font-medium">Presentar</button>
                                                            <button onClick={() => handleUpdateOblStatus(o.id, "paid")} className="px-2 py-1 text-xs bg-green-50 text-green-700 rounded hover:bg-green-100 font-medium">Pagar</button>
                                                        </>
                                                    )}
                                                    {(o.status === "filed" || o.status === "overdue") && (
                                                        <button onClick={() => handleUpdateOblStatus(o.id, "paid")} className="px-2 py-1 text-xs bg-green-50 text-green-700 rounded hover:bg-green-100 font-medium">Pagar</button>
                                                    )}
                                                    <button onClick={() => handleDeleteObl(o.id)} className="p-1 text-red-400 hover:text-red-600 rounded"><Trash2 size={14} /></button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </>
            )}

            {/* ═══ PERIOD MODAL — No client selection ═══ */}
            {showPeriodModal && (
                <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                        <div className="bg-gradient-to-r from-violet-500 to-purple-600 p-4 flex items-center justify-between">
                            <h3 className="text-white font-bold flex items-center gap-2"><FileText size={18} /> Nuevo Período — {companyName}</h3>
                            <button onClick={() => setShowPeriodModal(false)} className="text-white/80 hover:text-white"><X size={20} /></button>
                        </div>
                        <div className="p-5 space-y-4">
                            <p className="text-xs text-gray-500 bg-violet-50 border border-violet-100 rounded-lg p-3">
                                Este período corresponde al ejercicio contable de <strong>{companyName}</strong>.
                            </p>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Mes</label>
                                    <select value={periodForm.month} onChange={e => setPeriodForm({ ...periodForm, month: Number(e.target.value) })}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-sm">
                                        {["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"].map((m, i) => (
                                            <option key={i} value={i + 1}>{m}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Año</label>
                                    <input type="number" value={periodForm.year} onChange={e => setPeriodForm({ ...periodForm, year: Number(e.target.value) })}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-sm" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
                                <textarea value={periodForm.notes} onChange={e => setPeriodForm({ ...periodForm, notes: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-sm" rows={2} />
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                <button onClick={() => setShowPeriodModal(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancelar</button>
                                <button onClick={handleCreatePeriod}
                                    className="px-4 py-2 text-sm bg-violet-600 text-white rounded-lg font-medium hover:bg-violet-700">Crear Período</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ═══ ENTRY MODAL ═══ */}
            {showEntryModal && expandedPeriod && (
                <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
                        <div className="bg-gradient-to-r from-emerald-500 to-teal-600 p-4 flex items-center justify-between">
                            <h3 className="text-white font-bold flex items-center gap-2"><Plus size={18} /> Agregar Movimiento</h3>
                            <button onClick={() => setShowEntryModal(false)} className="text-white/80 hover:text-white"><X size={20} /></button>
                        </div>
                        <div className="p-5 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Concepto</label>
                                <input type="text" value={entryForm.concept} onChange={e => setEntryForm({ ...entryForm, concept: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-sm" placeholder="Ej: Facturación mensual" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
                                    <select value={entryForm.category} onChange={e => setEntryForm({ ...entryForm, category: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-sm">
                                        {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Subcategoría</label>
                                    <input type="text" value={entryForm.subcategory} onChange={e => setEntryForm({ ...entryForm, subcategory: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-sm" placeholder="Opcional" />
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Monto</label>
                                    <input type="number" step="0.01" value={entryForm.amount} onChange={e => setEntryForm({ ...entryForm, amount: Number(e.target.value) })}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-sm" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">% Imp.</label>
                                    <input type="number" step="0.01" value={entryForm.tax_rate} onChange={e => setEntryForm({ ...entryForm, tax_rate: Number(e.target.value) })}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-sm" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">$ Imp.</label>
                                    <input type="number" step="0.01" value={entryForm.tax_amount} onChange={e => setEntryForm({ ...entryForm, tax_amount: Number(e.target.value) })}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-sm" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Referencia</label>
                                    <input type="text" value={entryForm.reference} onChange={e => setEntryForm({ ...entryForm, reference: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-sm" placeholder="Nro comprobante" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
                                    <input type="date" value={entryForm.date} onChange={e => setEntryForm({ ...entryForm, date: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-sm" />
                                </div>
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                <button onClick={() => setShowEntryModal(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancelar</button>
                                <button onClick={() => handleAddEntry(expandedPeriod)} disabled={!entryForm.concept}
                                    className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-50">Agregar</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ═══ OBLIGATION MODAL — No client selection ═══ */}
            {showOblModal && (
                <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                        <div className="bg-gradient-to-r from-amber-500 to-orange-600 p-4 flex items-center justify-between">
                            <h3 className="text-white font-bold flex items-center gap-2"><AlertTriangle size={18} /> Nueva Obligación Fiscal</h3>
                            <button onClick={() => setShowOblModal(false)} className="text-white/80 hover:text-white"><X size={20} /></button>
                        </div>
                        <div className="p-5 space-y-4">
                            <p className="text-xs text-gray-500 bg-amber-50 border border-amber-100 rounded-lg p-3">
                                Obligación fiscal de <strong>{companyName}</strong> {co.cuit ? `(CUIT: ${co.cuit})` : ""}.
                            </p>
                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                                    <select value={oblForm.tax_type} onChange={e => setOblForm({ ...oblForm, tax_type: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-sm">
                                        {TAX_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Mes</label>
                                    <select value={oblForm.period_month} onChange={e => setOblForm({ ...oblForm, period_month: Number(e.target.value) })}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-sm">
                                        {["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"].map((m, i) => (
                                            <option key={i} value={i + 1}>{m}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Año</label>
                                    <input type="number" value={oblForm.period_year} onChange={e => setOblForm({ ...oblForm, period_year: Number(e.target.value) })}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-sm" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Vencimiento</label>
                                    <input type="date" value={oblForm.due_date} onChange={e => setOblForm({ ...oblForm, due_date: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-sm" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Monto</label>
                                    <input type="number" step="0.01" value={oblForm.amount} onChange={e => setOblForm({ ...oblForm, amount: Number(e.target.value) })}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-sm" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
                                <textarea value={oblForm.notes} onChange={e => setOblForm({ ...oblForm, notes: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-sm" rows={2} />
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                <button onClick={() => setShowOblModal(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancelar</button>
                                <button onClick={handleCreateObl} disabled={!oblForm.due_date}
                                    className="px-4 py-2 text-sm bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 disabled:opacity-50">Crear Obligación</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
