import { useState, useEffect } from "react";
import api from "../api/client";
import { CheckCircle2, XCircle, X, RefreshCw, Activity, Server, Database, Shield, LayoutDashboard, Save, BarChart3, Table2, Gauge, Building2, UserPlus, FileText, Package, Users, DollarSign, Calendar as CalendarIcon, Contact, FolderTree, ShieldCheck, TrendingUp } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import ArcaConfigPanel from "../components/ArcaConfigPanel";

// Widget catalog grouped by module
const WIDGET_MODULES = [
    {
        module: "CRM",
        color: "indigo",
        icon: "UserPlus",
        widgets: [
            { id: "kpi_clients", type: "kpi", label: "Cuentas / Clientes", icon: "Building2" },
            { id: "kpi_leads", type: "kpi", label: "Leads", icon: "UserPlus" },
            { id: "kpi_contacts", type: "kpi", label: "Contactos", icon: "Contact" },
            { id: "kpi_quotes", type: "kpi", label: "Presupuestos", icon: "FileText" },
            { id: "table_recent_leads", type: "table", label: "Últimos Leads" },
            { id: "table_recent_quotes", type: "table", label: "Últimos Presupuestos" },
        ],
    },
    {
        module: "ERP / Contabilidad",
        color: "emerald",
        icon: "FileText",
        widgets: [
            { id: "kpi_invoices_issued", type: "kpi", label: "Facturas Emitidas", icon: "FileText" },
            { id: "kpi_invoices_received", type: "kpi", label: "Facturas Recibidas", icon: "FileText" },
            { id: "table_recent_invoices", type: "table", label: "Últimas Facturas" },
            { id: "chart_invoice_status", type: "chart", label: "Estado de Facturas" },
        ],
    },
    {
        module: "Proveedores y Servicios",
        color: "purple",
        icon: "Users",
        widgets: [
            { id: "kpi_providers", type: "kpi", label: "Proveedores", icon: "Users" },
            { id: "kpi_active_services", type: "kpi", label: "Servicios Activos", icon: "ShieldCheck" },
            { id: "kpi_monthly_cost", type: "kpi", label: "Costo Mensual Servicios", icon: "DollarSign" },
            { id: "table_service_payments", type: "table", label: "Últimos Pagos de Servicios" },
            { id: "table_top_providers", type: "table", label: "Top Proveedores por Costo" },
            { id: "chart_service_costs", type: "chart", label: "Costos por Proveedor" },
        ],
    },
    {
        module: "Financiero / Cashflow",
        color: "green",
        icon: "DollarSign",
        widgets: [
            { id: "chart_income_vs_expenses", type: "chart", label: "Ingresos vs Egresos (6 meses)" },
            { id: "chart_cashflow_distribution", type: "chart", label: "Distribución Cashflow" },
        ],
    },
    {
        module: "Catálogo y General",
        color: "orange",
        icon: "Package",
        widgets: [
            { id: "kpi_products", type: "kpi", label: "Productos / Servicios", icon: "Package" },
            { id: "kpi_categories", type: "kpi", label: "Categorías", icon: "FolderTree" },
            { id: "kpi_users", type: "kpi", label: "Usuarios del Sistema", icon: "TrendingUp" },
            { id: "table_upcoming_events", type: "table", label: "Próximas Actividades" },
        ],
    },
];

const TYPE_BADGES: Record<string, { label: string; color: string }> = {
    kpi: { label: "KPI", color: "bg-blue-100 text-blue-700" },
    table: { label: "Tabla", color: "bg-amber-100 text-amber-700" },
    chart: { label: "Gráfico", color: "bg-violet-100 text-violet-700" },
};
const MODULE_COLORS: Record<string, string> = {
    indigo: "border-indigo-200 bg-indigo-50/30",
    emerald: "border-emerald-200 bg-emerald-50/30",
    purple: "border-purple-200 bg-purple-50/30",
    green: "border-green-200 bg-green-50/30",
    orange: "border-orange-200 bg-orange-50/30",
};
const MODULE_HEADER_COLORS: Record<string, string> = {
    indigo: "text-indigo-700 bg-indigo-100",
    emerald: "text-emerald-700 bg-emerald-100",
    purple: "text-purple-700 bg-purple-100",
    green: "text-green-700 bg-green-100",
    orange: "text-orange-700 bg-orange-100",
};

const CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
    core: { label: "INFRAESTRUCTURA", color: "bg-blue-100 text-blue-700" },
    security: { label: "SEGURIDAD", color: "bg-red-100 text-red-700" },
    fiscal: { label: "FISCAL", color: "bg-green-100 text-green-700" },
    infra: { label: "OPERACIONES", color: "bg-purple-100 text-purple-700" },
    ai: { label: "INTELIGENCIA ARTIFICIAL", color: "bg-amber-100 text-amber-700" },
};

const STATUS_STYLES: Record<string, { bg: string; border: string; badge: string; icon: string }> = {
    ok: { bg: "bg-emerald-50/60", border: "border-emerald-200", badge: "bg-emerald-100 text-emerald-700", icon: "✅" },
    warning: { bg: "bg-amber-50/60", border: "border-amber-200", badge: "bg-amber-100 text-amber-700", icon: "⚠️" },
    error: { bg: "bg-red-50/60", border: "border-red-200", badge: "bg-red-100 text-red-700", icon: "❌" },
    checking: { bg: "bg-gray-50", border: "border-gray-200", badge: "bg-gray-100 text-gray-500", icon: "⏳" },
};

function IntegrationCard({ integration }: { integration: any }) {
    const st = STATUS_STYLES[integration.status] || STATUS_STYLES.checking;
    const cat = CATEGORY_LABELS[integration.category] || CATEGORY_LABELS.core;
    const details = integration.details || {};
    const detailEntries = Object.entries(details).filter(([k]) => k !== "error");

    return (
        <div className={`rounded-xl border-2 ${st.border} ${st.bg} p-5 transition-all duration-300 hover:shadow-md`}>
            <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${st.badge}`}>
                        {st.icon}
                    </div>
                    <div>
                        <h4 className="font-bold text-gray-900 text-sm">{integration.name}</h4>
                        <p className="text-[11px] text-gray-500">{integration.description}</p>
                    </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${st.badge}`}>
                        {integration.status === "ok" ? "ACTIVO" : integration.status === "warning" ? "PARCIAL" : integration.status === "error" ? "INACTIVO" : "..."}
                    </span>
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${cat.color}`}>
                        {cat.label}
                    </span>
                </div>
            </div>
            {details.error && (
                <div className="px-3 py-2 bg-red-100 border border-red-200 rounded-lg text-xs text-red-700 mb-3">
                    ⚠️ {details.error}
                </div>
            )}
            {detailEntries.length > 0 && (
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2">
                    {detailEntries.map(([key, val]) => (
                        <div key={key} className="flex justify-between text-[11px] py-0.5">
                            <span className="text-gray-400 font-medium">{key.replace(/_/g, " ")}</span>
                            <span className="text-gray-700 font-bold truncate ml-2">
                                {typeof val === "boolean" ? (val ? "✅" : "❌") : String(val)}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default function Settings() {
    const { t } = useTranslation();
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState("dashboard");
    const isSuperAdmin = (user?.role || '').split(',').map((r: string) => r.trim()).includes('superadmin');
    const [isChecking, setIsChecking] = useState(false);
    const [systemData, setSystemData] = useState<any>(null);
    const [lastChecked, setLastChecked] = useState<Date | null>(null);

    // Audit logs state
    const [auditLogs, setAuditLogs] = useState<any[]>([]);
    const [loadingLogs, setLoadingLogs] = useState(false);
    const [logsFilter, setLogsFilter] = useState<string>("");
    const [logsDays, setLogsDays] = useState(7);

    // Module management state
    const [modulesData, setModulesData] = useState<any[]>([]);
    const [loadingModules, setLoadingModules] = useState(false);
    const [togglingModule, setTogglingModule] = useState<string | null>(null);
    const [expandedModule, setExpandedModule] = useState<string | null>(null);
    const [moduleInfo, setModuleInfo] = useState<Record<string, any>>({});
    const [routesModal, setRoutesModal] = useState<any | null>(null);

    // Dashboard config state
    const [selectedWidgets, setSelectedWidgets] = useState<string[]>([]);
    const [loadingWidgets, setLoadingWidgets] = useState(false);
    const [savingWidgets, setSavingWidgets] = useState(false);
    const [savedNotice, setSavedNotice] = useState(false);

    useEffect(() => {
        if (activeTab === "health") { runHealthCheck(); fetchLogs(); }
        if (activeTab === "modules") fetchModules();
        if (activeTab === "dashboard" && user?.id) loadWidgetConfig();
    }, [activeTab, user?.id]);

    const loadWidgetConfig = async () => {
        setLoadingWidgets(true);
        try {
            const res = await api.get(`/dashboard-config/${user!.id}`);
            if (res.data?.widgets?.length > 0) setSelectedWidgets(res.data.widgets);
            else setSelectedWidgets(["kpi_clients", "kpi_providers", "kpi_products", "kpi_users", "table_recent_invoices", "table_upcoming_events"]);
        } catch { setSelectedWidgets(["kpi_clients", "kpi_providers", "kpi_products", "kpi_users", "table_recent_invoices", "table_upcoming_events"]); }
        finally { setLoadingWidgets(false); }
    };

    const toggleWidget = (id: string) => {
        setSelectedWidgets(prev => prev.includes(id) ? prev.filter(w => w !== id) : [...prev, id]);
    };

    const selectAllInModule = (widgets: { id: string }[]) => {
        const ids = widgets.map(w => w.id);
        const allSelected = ids.every(id => selectedWidgets.includes(id));
        if (allSelected) {
            setSelectedWidgets(prev => prev.filter(w => !ids.includes(w)));
        } else {
            setSelectedWidgets(prev => [...prev, ...ids.filter(id => !prev.includes(id))]);
        }
    };

    const saveWidgetConfig = async () => {
        if (!user?.id) return;
        setSavingWidgets(true);
        try {
            await api.put(`/dashboard-config/${user.id}`, { widgets: selectedWidgets });
            setSavedNotice(true);
            setTimeout(() => setSavedNotice(false), 3000);
        } catch (e) { console.error(e); }
        finally { setSavingWidgets(false); }
    };

    const fetchModules = async () => {
        setLoadingModules(true);
        try {
            const res = await api.get("/system/modules");
            setModulesData(res.data.modules || []);
        } catch (e) { console.error(e); }
        finally { setLoadingModules(false); }
    };

    const toggleModule = async (slug: string) => {
        setTogglingModule(slug);
        try {
            const res = await api.put(`/system/modules/${slug}/toggle`);
            await fetchModules();
            alert(res.data.message);
        } catch (e: any) {
            alert(e.response?.data?.detail || 'Error');
        }
        finally { setTogglingModule(null); }
    };

    const fetchModuleInfo = async (slug: string) => {
        if (expandedModule === slug) { setExpandedModule(null); return; }
        setExpandedModule(slug);
        if (moduleInfo[slug]) return;
        try {
            const res = await api.get(`/system/modules/${slug}/info`);
            setModuleInfo(prev => ({ ...prev, [slug]: res.data }));
        } catch (e) { console.error(e); }
    };

    const generateLicense = async (slug: string, days: number = 365, plan: string = 'professional') => {
        try {
            const res = await api.post(`/system/modules/${slug}/generate-license?days=${days}&plan=${plan}&max_users=0`);
            alert(res.data.message);
            fetchModules();
        } catch (e: any) { alert(e.response?.data?.detail || 'Error'); }
    };

    const activateTrial = async (slug: string, days: number = 30) => {
        try {
            const res = await api.post(`/system/modules/${slug}/activate-trial?days=${days}`);
            alert(res.data.message);
            fetchModules();
        } catch (e: any) { alert(e.response?.data?.detail || 'Error'); }
    };

    const checkExpirations = async () => {
        try {
            const res = await api.post('/system/modules/check-expirations');
            alert(res.data.message);
            fetchModules();
        } catch (e: any) { alert(e.response?.data?.detail || 'Error'); }
    };

    const fetchLogs = async (filter = logsFilter, days = logsDays) => {
        setLoadingLogs(true);
        try {
            const params = new URLSearchParams();
            if (filter) params.set("action", filter);
            params.set("days", String(days));
            params.set("limit", "100");
            const res = await api.get(`/audit/?${params.toString()}`);
            setAuditLogs(res.data.logs || []);
        } catch (e) { console.error(e); }
        finally { setLoadingLogs(false); }
    };

    const runHealthCheck = async () => {
        setIsChecking(true);
        setSystemData(null);
        try {
            const res = await api.get("/system/status");
            setSystemData(res.data);
        } catch (e) {
            console.error(e);
        }
        setLastChecked(new Date());
        setIsChecking(false);
    };

    const totalWidgets = WIDGET_MODULES.reduce((s, m) => s + m.widgets.length, 0);

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100 gap-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-gray-900">{t('settings.title')}</h2>
                    <p className="text-sm text-gray-500">{t('settings.description')}</p>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="flex border-b border-gray-100 overflow-x-auto">
                    <button
                        className={`flex-1 min-w-[140px] py-4 text-sm font-medium transition-colors flex items-center justify-center space-x-2 ${activeTab === "dashboard" ? "text-indigo-600 border-b-2 border-indigo-600" : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"}`}
                        onClick={() => setActiveTab("dashboard")}
                    >
                        <LayoutDashboard size={16} />
                        <span>Panel de Control</span>
                    </button>
                    <button
                        className={`flex-1 min-w-[140px] py-4 text-sm font-medium transition-colors flex items-center justify-center space-x-2 ${activeTab === "arca" ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"}`}
                        onClick={() => setActiveTab("arca")}
                    >
                        <Shield size={16} />
                        <span>ARCA</span>
                    </button>
                    <button
                        className={`flex-1 min-w-[140px] py-4 text-sm font-medium transition-colors ${activeTab === "general" ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"}`}
                        onClick={() => setActiveTab("general")}
                    >
                        {t('settings.tabs.general')}
                    </button>
                    <button
                        className={`flex-1 min-w-[140px] py-4 text-sm font-medium transition-colors flex items-center justify-center space-x-2 ${activeTab === "health" ? "text-emerald-600 border-b-2 border-emerald-600" : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"}`}
                        onClick={() => setActiveTab("health")}
                    >
                        <Activity size={16} />
                        <span>Integraciones</span>
                    </button>
                    {isSuperAdmin && (
                        <button
                            className={`flex-1 min-w-[140px] py-4 text-sm font-medium transition-colors flex items-center justify-center space-x-2 ${activeTab === "modules" ? "text-purple-600 border-b-2 border-purple-600" : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"}`}
                            onClick={() => setActiveTab("modules")}
                        >
                            <Server size={16} />
                            <span>Módulos</span>
                        </button>
                    )}
                </div>

                <div className="p-6 cursor-default">
                    {/* ═══ PANEL DE CONTROL ═══ */}
                    {activeTab === "dashboard" && (
                        <div className="space-y-6">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                        <LayoutDashboard size={20} className="text-indigo-600" />
                                        Personalizar Panel de Control
                                    </h3>
                                    <p className="text-sm text-gray-500 mt-1">
                                        Elegí qué KPIs, tablas y gráficos se muestran en tu panel de inicio.
                                        <span className="ml-2 px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-full text-xs font-bold">
                                            {selectedWidgets.length} / {totalWidgets} seleccionados
                                        </span>
                                    </p>
                                </div>
                                <button onClick={saveWidgetConfig} disabled={savingWidgets}
                                    className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl shadow-lg shadow-indigo-200 hover:shadow-xl transition-all text-sm font-bold disabled:opacity-50 self-start sm:self-auto">
                                    <Save size={16} />
                                    {savingWidgets ? "Guardando..." : "Guardar Configuración"}
                                </button>
                            </div>

                            {savedNotice && (
                                <div className="flex items-center gap-2 px-4 py-3 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm font-medium">
                                    <CheckCircle2 size={16} /> Configuración guardada. Los cambios se reflejan al recargar el Panel de Control.
                                </div>
                            )}

                            {loadingWidgets ? (
                                <div className="py-12 text-center text-gray-400 animate-pulse">Cargando configuración...</div>
                            ) : (
                                <div className="space-y-6">
                                    {WIDGET_MODULES.map(mod => {
                                        const allSelected = mod.widgets.every(w => selectedWidgets.includes(w.id));
                                        const selectedCount = mod.widgets.filter(w => selectedWidgets.includes(w.id)).length;
                                        return (
                                            <div key={mod.module} className={`rounded-xl border-2 ${MODULE_COLORS[mod.color]} overflow-hidden`}>
                                                <div className="px-5 py-3 flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <span className={`px-2.5 py-1 rounded-lg text-xs font-black ${MODULE_HEADER_COLORS[mod.color]}`}>{mod.module}</span>
                                                        <span className="text-xs text-gray-400">{selectedCount}/{mod.widgets.length} activos</span>
                                                    </div>
                                                    <button onClick={() => selectAllInModule(mod.widgets)} className="text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors">
                                                        {allSelected ? "Deseleccionar todos" : "Seleccionar todos"}
                                                    </button>
                                                </div>
                                                <div className="px-5 pb-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                                    {mod.widgets.map(widget => {
                                                        const isActive = selectedWidgets.includes(widget.id);
                                                        const badge = TYPE_BADGES[widget.type];
                                                        return (
                                                            <label key={widget.id}
                                                                className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all duration-200
                                                                    ${isActive ? 'border-indigo-400 bg-white shadow-sm ring-1 ring-indigo-100' : 'border-transparent bg-white/60 hover:bg-white hover:border-gray-200'}`}>
                                                                <input type="checkbox" checked={isActive} onChange={() => toggleWidget(widget.id)}
                                                                    className="w-4 h-4 text-indigo-600 bg-gray-100 border-gray-300 rounded focus:ring-indigo-500 focus:ring-2 shrink-0" />
                                                                <div className="flex-1 min-w-0"><p className="text-sm font-medium text-gray-800 truncate">{widget.label}</p></div>
                                                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0 ${badge.color}`}>{badge.label}</span>
                                                            </label>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === "arca" && <ArcaConfigPanel />}

                    {/* ═══ MÓDULOS ═══ */}
                    {activeTab === "modules" && (
                        <div className="space-y-6">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                        <Server size={20} className="text-purple-600" />
                                        Gestión de Módulos
                                    </h3>
                                    <p className="text-sm text-gray-500 mt-1">
                                        Activa, desactiva y gestiona los módulos de la plataforma ZeRoN 360°.
                                        <span className="ml-2 px-2 py-0.5 bg-purple-50 text-purple-600 rounded-full text-xs font-bold">
                                            {modulesData.filter(m => m.enabled).length} / {modulesData.length} activos
                                        </span>
                                    </p>
                                </div>
                                <button onClick={fetchModules} disabled={loadingModules}
                                    className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl shadow-lg shadow-purple-200 hover:shadow-xl transition-all text-sm font-bold disabled:opacity-50">
                                    <RefreshCw size={16} className={loadingModules ? "animate-spin" : ""} />
                                    {loadingModules ? "Cargando..." : "Actualizar"}
                                </button>
                            </div>

                            {/* Architecture Info Bar */}
                            <div className="flex flex-wrap gap-3">
                                <div className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-700 to-indigo-800 rounded-xl text-white">
                                    <Server size={14} />
                                    <span className="text-xs font-bold">Arquitectura Modular</span>
                                </div>
                                <div className="flex items-center gap-2 px-4 py-2.5 bg-purple-50 border border-purple-200 rounded-xl">
                                    <span className="text-xs font-bold text-purple-700">📦 {modulesData.length} Módulos</span>
                                </div>
                                <div className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 border border-emerald-200 rounded-xl">
                                    <CheckCircle2 size={14} className="text-emerald-600" />
                                    <span className="text-xs font-bold text-emerald-700">{modulesData.filter(m => m.enabled).length} Activos</span>
                                </div>
                                <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-xl">
                                    <span className="text-xs font-bold text-amber-700">🔑 {modulesData.filter(m => m.license_status === 'active').length} Licenciados</span>
                                </div>
                            </div>

                            {/* Module Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {modulesData.map((mod: any) => {
                                    const isExpanded = expandedModule === mod.slug;
                                    const info = moduleInfo[mod.slug];
                                    const isCore = mod.is_core || mod.slug === "core";
                                    const licColor = mod.license_status === "active" ? "emerald" : mod.license_status === "expired" ? "red" : "amber";

                                    return (
                                        <div key={mod.slug}
                                            className={`rounded-2xl border-2 transition-all duration-300 overflow-hidden ${mod.enabled ? 'border-purple-200 bg-white shadow-sm' : 'border-gray-200 bg-gray-50 opacity-70'
                                                }`}>
                                            <div className="p-5">
                                                <div className="flex items-start justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold shadow-sm ${mod.enabled
                                                            ? 'bg-gradient-to-br from-purple-500 to-indigo-600 text-white'
                                                            : 'bg-gray-200 text-gray-400'
                                                            }`}>
                                                            {mod.name.charAt(0)}
                                                        </div>
                                                        <div>
                                                            <h4 className="font-bold text-gray-900 flex items-center gap-2">
                                                                {mod.name}
                                                                <span className="text-[10px] font-mono text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">v{mod.version}</span>
                                                            </h4>
                                                            <p className="text-xs text-gray-500 mt-0.5">{mod.description}</p>
                                                        </div>
                                                    </div>

                                                    {/* Toggle Switch */}
                                                    <button
                                                        onClick={() => !isCore && toggleModule(mod.slug)}
                                                        disabled={isCore || togglingModule === mod.slug}
                                                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${isCore ? 'bg-purple-600 cursor-not-allowed' :
                                                            mod.enabled ? 'bg-purple-600 hover:bg-purple-700 cursor-pointer' : 'bg-gray-300 cursor-pointer'
                                                            }`}
                                                        title={isCore ? "Módulo base - siempre activo" : mod.enabled ? "Desactivar" : "Activar"}
                                                    >
                                                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${mod.enabled ? 'translate-x-6' : 'translate-x-1'
                                                            }`} />
                                                    </button>
                                                </div>

                                                {/* Badges */}
                                                <div className="flex flex-wrap items-center gap-2 mt-3">
                                                    {isCore && (
                                                        <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-[10px] font-bold">
                                                            🔒 BASE
                                                        </span>
                                                    )}
                                                    <span className={`px-2 py-0.5 bg-${licColor}-100 text-${licColor}-700 rounded-full text-[10px] font-bold`}>
                                                        {mod.license_status === "active" ? "✅ Licenciado" :
                                                            mod.license_status === "expired" ? "❌ Expirado" : "🔑 Trial"}
                                                    </span>
                                                    <button
                                                        onClick={() => setRoutesModal(mod)}
                                                        className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-[10px] font-bold hover:bg-indigo-100 hover:text-indigo-700 transition-colors cursor-pointer"
                                                    >
                                                        🔗 {mod.routes_count} rutas
                                                    </button>
                                                    {mod.dependencies_status?.length > 0 && (
                                                        <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full text-[10px] font-bold">
                                                            Deps: {mod.dependencies_status.map((d: any) => (
                                                                <span key={d.slug} className={`mr-1 ${d.found && d.enabled ? 'text-emerald-600' : 'text-red-600'}`}>
                                                                    {d.found && d.enabled ? '✅' : '❌'} {d.name}
                                                                </span>
                                                            ))}
                                                        </span>
                                                    )}
                                                </div>

                                                {/* License Expiration + Days Left */}
                                                {mod.license_expires_at && (
                                                    <div className="mt-2 flex items-center gap-2">
                                                        <span className="text-[11px] text-gray-500">
                                                            📅 Vence: {new Date(mod.license_expires_at).toLocaleDateString('es-AR')}
                                                        </span>
                                                        {(() => {
                                                            const daysLeft = Math.ceil((new Date(mod.license_expires_at).getTime() - Date.now()) / 86400000);
                                                            return (
                                                                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${daysLeft > 30 ? 'bg-emerald-100 text-emerald-700' :
                                                                    daysLeft > 7 ? 'bg-amber-100 text-amber-700' :
                                                                        daysLeft > 0 ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500'
                                                                    }`}>
                                                                    {daysLeft > 0 ? `${daysLeft} días restantes` : 'Expirado'}
                                                                </span>
                                                            );
                                                        })()}
                                                    </div>
                                                )}

                                                {/* License Action Buttons */}
                                                <div className="mt-3 flex flex-wrap gap-2">
                                                    {!isCore && (
                                                        <>
                                                            <button
                                                                onClick={() => generateLicense(mod.slug, 365, 'professional')}
                                                                className="px-3 py-1.5 text-[11px] font-bold bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-lg hover:shadow-md transition-all"
                                                            >
                                                                🔑 Licencia 1 Año
                                                            </button>
                                                            <button
                                                                onClick={() => generateLicense(mod.slug, 90, 'starter')}
                                                                className="px-3 py-1.5 text-[11px] font-bold bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:shadow-md transition-all"
                                                            >
                                                                📋 Licencia 90d
                                                            </button>
                                                            <button
                                                                onClick={() => activateTrial(mod.slug, 30)}
                                                                className="px-3 py-1.5 text-[11px] font-bold bg-amber-100 text-amber-700 border border-amber-200 rounded-lg hover:bg-amber-200 transition-all"
                                                            >
                                                                ⏳ Trial 30d
                                                            </button>
                                                        </>
                                                    )}
                                                </div>

                                                {/* Expand for Info */}
                                                <button
                                                    onClick={() => fetchModuleInfo(mod.slug)}
                                                    className="mt-3 text-xs text-purple-600 hover:text-purple-800 font-bold flex items-center gap-1"
                                                >
                                                    {isExpanded ? "▲ Cerrar detalle" : "▼ Ver tablas y detalles"}
                                                </button>

                                                {/* Expanded Info */}
                                                {isExpanded && info && (
                                                    <div className="mt-3 p-3 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl border border-purple-100">
                                                        <div className="flex items-center justify-between mb-2">
                                                            <span className="text-xs font-bold text-purple-700">
                                                                📊 {info.total_records} registros totales
                                                            </span>
                                                            <span className="text-[10px] text-gray-500">
                                                                {Object.keys(info.tables || {}).length} tablas
                                                            </span>
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-1">
                                                            {Object.entries(info.tables || {}).map(([table, count]: [string, any]) => (
                                                                <div key={table} className="flex items-center justify-between px-2 py-1 bg-white rounded-lg text-[11px]">
                                                                    <span className="text-gray-600 font-mono truncate mr-2">{table}</span>
                                                                    <span className={`font-bold ${count > 0 ? 'text-purple-600' : count < 0 ? 'text-gray-300' : 'text-gray-400'}`}>
                                                                        {count < 0 ? '—' : count}
                                                                    </span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Footer Note */}
                            <div className="p-4 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl border border-purple-100">
                                <div className="flex items-center justify-between">
                                    <p className="text-xs text-purple-700 font-medium">
                                        ⚠️ <strong>Nota</strong>: Al desactivar un módulo, sus rutas de API y menú lateral dejarán de estar disponibles
                                        tras reiniciar el servidor. Los datos del módulo se conservan intactos en la base de datos.
                                    </p>
                                    <button onClick={checkExpirations}
                                        className="ml-4 px-3 py-1.5 text-[11px] font-bold bg-purple-100 text-purple-700 border border-purple-200 rounded-lg hover:bg-purple-200 transition-all whitespace-nowrap flex-shrink-0">
                                        🔍 Verificar Vencimientos
                                    </button>
                                </div>
                            </div>

                            {/* Routes Detail Modal */}
                            {routesModal && (
                                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setRoutesModal(null)}>
                                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
                                        {/* Modal Header */}
                                        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-5 text-white flex-shrink-0">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-12 h-12 bg-white/15 rounded-xl flex items-center justify-center text-2xl font-black backdrop-blur-sm">
                                                        {routesModal.name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <h2 className="text-lg font-black">{routesModal.name}</h2>
                                                        <p className="text-indigo-100 text-xs">v{routesModal.version} · {routesModal.routes_count} endpoints · {routesModal.slug}</p>
                                                    </div>
                                                </div>
                                                <button onClick={() => setRoutesModal(null)} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
                                                    <X size={20} />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Modal Body */}
                                        <div className="overflow-y-auto flex-1 p-5 space-y-4">
                                            {/* Dependencies */}
                                            <div>
                                                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">📦 Dependencias</h3>
                                                {routesModal.dependencies_status?.length > 0 ? (
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                        {routesModal.dependencies_status.map((dep: any) => (
                                                            <div key={dep.slug}
                                                                className={`flex items-center justify-between px-3 py-2 rounded-lg border ${dep.found && dep.enabled
                                                                    ? 'bg-emerald-50 border-emerald-200'
                                                                    : dep.found
                                                                        ? 'bg-amber-50 border-amber-200'
                                                                        : 'bg-red-50 border-red-200'
                                                                    }`}>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-sm">{dep.found && dep.enabled ? '✅' : dep.found ? '⚠️' : '❌'}</span>
                                                                    <div>
                                                                        <span className="text-sm font-bold text-gray-800">{dep.name}</span>
                                                                        <span className="text-[10px] text-gray-400 ml-1 font-mono">({dep.slug})</span>
                                                                    </div>
                                                                </div>
                                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${dep.found && dep.enabled ? 'bg-emerald-100 text-emerald-700' :
                                                                    dep.found ? 'bg-amber-100 text-amber-700' :
                                                                        'bg-red-100 text-red-700'
                                                                    }`}>
                                                                    {dep.found && dep.enabled ? 'OK' : dep.found ? 'Desactivado' : 'No encontrado'}
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <p className="text-xs text-gray-400 italic">Sin dependencias (módulo independiente)</p>
                                                )}
                                            </div>

                                            {/* Routes */}
                                            <div>
                                                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">🔗 Rutas API ({routesModal.routes_count} endpoints)</h3>
                                                {routesModal.routes_detail?.map((group: any, gi: number) => (
                                                    <div key={gi} className="mb-3">
                                                        {group.tags?.length > 0 && (
                                                            <div className="flex items-center gap-2 mb-1">
                                                                {group.tags.map((tag: string) => (
                                                                    <span key={tag} className="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded text-[10px] font-bold uppercase">
                                                                        {tag}
                                                                    </span>
                                                                ))}
                                                                {group.prefix && (
                                                                    <span className="text-[10px] text-gray-400 font-mono">prefix: {group.prefix}</span>
                                                                )}
                                                            </div>
                                                        )}
                                                        <div className="border border-gray-100 rounded-xl overflow-hidden">
                                                            {group.endpoints?.map((ep: any, ei: number) => (
                                                                <div key={ei} className={`flex items-center gap-3 px-3 py-2 text-sm ${ei > 0 ? 'border-t border-gray-50' : ''} hover:bg-gray-50 transition-colors`}>
                                                                    <div className="flex gap-1 flex-shrink-0">
                                                                        {ep.methods?.map((method: string) => {
                                                                            const colors: Record<string, string> = {
                                                                                GET: 'bg-emerald-100 text-emerald-700',
                                                                                POST: 'bg-blue-100 text-blue-700',
                                                                                PUT: 'bg-amber-100 text-amber-700',
                                                                                PATCH: 'bg-orange-100 text-orange-700',
                                                                                DELETE: 'bg-red-100 text-red-700',
                                                                            };
                                                                            return (
                                                                                <span key={method} className={`px-1.5 py-0.5 rounded text-[9px] font-black ${colors[method] || 'bg-gray-100 text-gray-600'}`}>
                                                                                    {method}
                                                                                </span>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                    <span className="font-mono text-xs text-gray-700 truncate">{ep.path || '/'}</span>
                                                                    {ep.name && (
                                                                        <span className="text-[10px] text-gray-400 truncate ml-auto">{ep.name}</span>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Modal Footer */}
                                        <div className="p-4 border-t border-gray-100 bg-gray-50 flex-shrink-0">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <span className={`w-2 h-2 rounded-full ${routesModal.enabled ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                                                    <span className="text-xs text-gray-500">
                                                        {routesModal.enabled ? 'Módulo activo' : 'Módulo desactivado'}
                                                    </span>
                                                </div>
                                                <button onClick={() => setRoutesModal(null)}
                                                    className="px-4 py-2 text-sm font-bold text-gray-600 hover:text-gray-900 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors">
                                                    Cerrar
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === "general" && <CompanySettingsPanel />}

                    {/* ═══ INTEGRACIONES ═══ */}
                    {activeTab === "health" && (
                        <div className="space-y-6">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                        <Activity size={20} className="text-emerald-600" />
                                        Estado de Integraciones
                                    </h3>
                                    <p className="text-sm text-gray-500 mt-1">
                                        Monitoreo en tiempo real de todos los servicios y módulos de seguridad.
                                        {lastChecked && (
                                            <span className="ml-2 text-xs text-gray-400">
                                                Última verificación: {lastChecked.toLocaleTimeString()}
                                            </span>
                                        )}
                                    </p>
                                </div>
                                <button onClick={runHealthCheck} disabled={isChecking}
                                    className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl shadow-lg shadow-emerald-200 hover:shadow-xl transition-all text-sm font-bold disabled:opacity-50">
                                    <RefreshCw size={16} className={isChecking ? "animate-spin" : ""} />
                                    {isChecking ? "Verificando..." : "Verificar Todo"}
                                </button>
                            </div>

                            {/* Summary Bar */}
                            {systemData?.summary && (
                                <div className="flex flex-wrap gap-3">
                                    <div className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-slate-700 to-slate-800 rounded-xl text-white">
                                        <Server size={14} />
                                        <span className="text-xs font-bold">v{systemData.version}</span>
                                    </div>
                                    <div className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 border border-emerald-200 rounded-xl">
                                        <CheckCircle2 size={14} className="text-emerald-600" />
                                        <span className="text-xs font-bold text-emerald-700">{systemData.summary.ok} Activos</span>
                                    </div>
                                    {systemData.summary.warning > 0 && (
                                        <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-xl">
                                            <span className="text-xs font-bold text-amber-700">⚠️ {systemData.summary.warning} Alertas</span>
                                        </div>
                                    )}
                                    {systemData.summary.error > 0 && (
                                        <div className="flex items-center gap-2 px-4 py-2.5 bg-red-50 border border-red-200 rounded-xl">
                                            <XCircle size={14} className="text-red-600" />
                                            <span className="text-xs font-bold text-red-700">{systemData.summary.error} Errores</span>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl">
                                        <span className="text-xs font-bold text-gray-600">Total: {systemData.summary.total} servicios</span>
                                    </div>
                                </div>
                            )}

                            {/* Cards Grid */}
                            {isChecking ? (
                                <div className="py-16 text-center">
                                    <RefreshCw size={32} className="mx-auto text-emerald-500 animate-spin mb-4" />
                                    <p className="text-gray-500 font-medium">Verificando integraciones...</p>
                                    <p className="text-xs text-gray-400 mt-1">Testeando Redis, Rust, ARCA, Backups y más</p>
                                </div>
                            ) : systemData?.integrations ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                    {systemData.integrations.map((i: any) => <IntegrationCard key={i.id} integration={i} />)}
                                </div>
                            ) : (
                                <div className="py-16 text-center">
                                    <Activity size={32} className="mx-auto text-gray-300 mb-4" />
                                    <p className="text-gray-400 font-medium">Hacé clic en "Verificar Todo" para comenzar</p>
                                </div>
                            )}

                            {/* ═══ AUDIT LOG VIEWER ═══ */}
                            <div className="border-t border-gray-200 pt-6 mt-6">
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                                    <div>
                                        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                            📋 Registro de Auditoría
                                        </h3>
                                        <p className="text-sm text-gray-500 mt-1">
                                            Historial de acciones críticas del sistema.
                                        </p>
                                    </div>
                                    <button onClick={() => fetchLogs()} disabled={loadingLogs}
                                        className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl text-sm font-bold transition-colors disabled:opacity-50">
                                        <RefreshCw size={14} className={loadingLogs ? "animate-spin" : ""} />
                                        Actualizar
                                    </button>
                                </div>

                                {/* Filters */}
                                <div className="flex flex-wrap gap-2 mb-4">
                                    {["", "LOGIN", "LOGIN_FAILED", "CREATE", "UPDATE", "DELETE"].map(f => (
                                        <button key={f} onClick={() => { setLogsFilter(f); fetchLogs(f); }}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${logsFilter === f
                                                ? 'bg-slate-800 text-white shadow-md'
                                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                                }`}>
                                            {f || "Todos"}
                                        </button>
                                    ))}
                                    <select value={logsDays} onChange={e => { setLogsDays(Number(e.target.value)); fetchLogs(logsFilter, Number(e.target.value)); }}
                                        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-gray-100 text-gray-600 border-0 outline-none">
                                        <option value={1}>Hoy</option>
                                        <option value={7}>7 días</option>
                                        <option value={30}>30 días</option>
                                        <option value={90}>90 días</option>
                                    </select>
                                </div>

                                {/* Logs Table */}
                                {loadingLogs ? (
                                    <div className="py-8 text-center text-gray-400 animate-pulse">Cargando logs...</div>
                                ) : auditLogs.length === 0 ? (
                                    <div className="py-8 text-center text-gray-400">No hay registros para este filtro.</div>
                                ) : (
                                    <div className="rounded-xl border border-gray-200 overflow-hidden">
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-sm">
                                                <thead className="bg-gradient-to-r from-slate-50 to-gray-50">
                                                    <tr>
                                                        <th className="px-4 py-3 text-left text-[11px] font-black text-gray-500 uppercase">Fecha/Hora</th>
                                                        <th className="px-4 py-3 text-left text-[11px] font-black text-gray-500 uppercase">Acción</th>
                                                        <th className="px-4 py-3 text-left text-[11px] font-black text-gray-500 uppercase">Usuario</th>
                                                        <th className="px-4 py-3 text-left text-[11px] font-black text-gray-500 uppercase">Entidad</th>
                                                        <th className="px-4 py-3 text-left text-[11px] font-black text-gray-500 uppercase">IP</th>
                                                        <th className="px-4 py-3 text-left text-[11px] font-black text-gray-500 uppercase">Detalles</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100">
                                                    {auditLogs.map((log: any) => {
                                                        const actionColors: Record<string, string> = {
                                                            LOGIN: "bg-emerald-100 text-emerald-700",
                                                            LOGIN_FAILED: "bg-red-100 text-red-700",
                                                            CREATE: "bg-blue-100 text-blue-700",
                                                            UPDATE: "bg-amber-100 text-amber-700",
                                                            DELETE: "bg-red-100 text-red-700",
                                                            LOGOUT: "bg-gray-100 text-gray-700",
                                                            EXPORT: "bg-purple-100 text-purple-700",
                                                            EMIT_INVOICE: "bg-indigo-100 text-indigo-700",
                                                        };
                                                        const sevColors: Record<string, string> = {
                                                            info: "",
                                                            warning: "border-l-4 border-l-amber-400",
                                                            critical: "border-l-4 border-l-red-500 bg-red-50/30",
                                                        };
                                                        return (
                                                            <tr key={log.id} className={`hover:bg-gray-50 transition-colors ${sevColors[log.severity] || ""}`}>
                                                                <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                                                                    {log.timestamp ? new Date(log.timestamp).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-'}
                                                                </td>
                                                                <td className="px-4 py-3">
                                                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${actionColors[log.action] || 'bg-gray-100 text-gray-700'}`}>
                                                                        {log.action}
                                                                    </span>
                                                                </td>
                                                                <td className="px-4 py-3 text-xs text-gray-700 font-medium">{log.user_email || '-'}</td>
                                                                <td className="px-4 py-3 text-xs text-gray-500">
                                                                    {log.entity_type && <span className="text-gray-700">{log.entity_type}</span>}
                                                                    {log.entity_name && <span className="text-gray-400 ml-1">({log.entity_name})</span>}
                                                                </td>
                                                                <td className="px-4 py-3 text-xs text-gray-400 font-mono">{log.ip_address || '-'}</td>
                                                                <td className="px-4 py-3 text-xs text-gray-400 max-w-[200px] truncate">
                                                                    {log.details ? JSON.stringify(log.details) : '-'}
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                        <div className="px-4 py-2 bg-gray-50 text-xs text-gray-400 font-medium">
                                            {auditLogs.length} registros encontrados
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function CompanySettingsPanel() {
    const [settings, setSettings] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState<string | null>(null);
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const [openSections, setOpenSections] = useState<Record<string, boolean>>({
        identity: true, contact: true, address: true, hours: true, timezone: true, fiscal: false, notes: false,
    });

    const toggleSection = (key: string) => setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            const { data } = await api.get('/company-settings/');
            setSettings(data);
            if (data.logo_url) setLogoPreview(data.logo_url);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    const set = (key: string, val: any) => setSettings((prev: any) => ({ ...prev, [key]: val }));

    const handleSave = async () => {
        setSaving(true);
        try {
            const { id, logo_url, created_at, updated_at, ...payload } = settings;
            await api.put('/company-settings/', payload);
            setToast('✅ Configuración guardada correctamente');
            setTimeout(() => setToast(null), 3000);
        } catch (e: any) {
            setToast(`❌ ${e.response?.data?.detail || 'Error al guardar'}`);
            setTimeout(() => setToast(null), 4000);
        } finally { setSaving(false); }
    };

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const formData = new FormData();
        formData.append('file', file);
        try {
            const { data } = await api.post('/company-settings/logo', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            setLogoPreview(data.logo_url);
            setSettings((prev: any) => ({ ...prev, logo_url: data.logo_url }));
            setToast('✅ Logo actualizado');
            setTimeout(() => setToast(null), 3000);
        } catch (e: any) {
            setToast(`❌ ${e.response?.data?.detail || 'Error al subir logo'}`);
            setTimeout(() => setToast(null), 4000);
        }
    };

    if (loading) return <div className="py-12 text-center text-gray-400 animate-pulse">Cargando configuración...</div>;
    if (!settings) return <div className="py-12 text-center text-red-400">Error al cargar configuración</div>;

    const inputCls = "w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-400 bg-white";
    const labelCls = "text-xs font-bold text-gray-500 uppercase block mb-1";

    const renderSection = (id: string, title: string, icon: string, children: React.ReactNode) => (
        <div key={id} className="border border-gray-200 rounded-xl overflow-hidden">
            <button onClick={() => toggleSection(id)}
                className="w-full flex items-center justify-between px-5 py-3.5 bg-gradient-to-r from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-150 transition-colors">
                <span className="flex items-center gap-2 text-sm font-bold text-gray-700">{icon} {title}</span>
                <span className="text-gray-400 text-xs">{openSections[id] ? '▲' : '▼'}</span>
            </button>
            {openSections[id] && <div className="p-5 space-y-4 bg-white">{children}</div>}
        </div>
    );

    return (
        <div className="max-w-4xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <Building2 size={20} className="text-blue-600" />
                        Configuración de la Empresa
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                        Datos generales, horarios, dirección y logotipo de la empresa.
                    </p>
                </div>
                <button onClick={handleSave} disabled={saving}
                    className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl shadow-lg shadow-blue-200 hover:shadow-xl transition-all text-sm font-bold disabled:opacity-50 self-start sm:self-auto">
                    <Save size={16} />
                    {saving ? 'Guardando...' : 'Guardar Configuración'}
                </button>
            </div>

            {/* Logo Section */}
            <div className="bg-gradient-to-br from-slate-600 to-slate-800 rounded-2xl p-6 flex flex-col sm:flex-row items-center gap-6">
                <div className="w-28 h-28 bg-white/10 border-2 border-dashed border-white/30 rounded-2xl flex items-center justify-center overflow-hidden shrink-0">
                    {logoPreview ? (
                        <img src={logoPreview} alt="Logo" className="w-full h-full object-contain p-2" />
                    ) : (
                        <span className="text-white/40 text-xs text-center px-2">Sin logo</span>
                    )}
                </div>
                <div className="flex-1 text-center sm:text-left">
                    <h4 className="text-white font-bold text-lg">{settings.company_name || 'Tu Empresa'}</h4>
                    {settings.slogan && <p className="text-white/60 text-sm mt-0.5">{settings.slogan}</p>}
                    <label className="inline-flex items-center gap-2 mt-3 px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg text-sm font-medium cursor-pointer transition-colors">
                        📤 Subir Logo
                        <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                    </label>
                    <p className="text-white/40 text-[10px] mt-1.5">PNG, JPG, SVG o WebP. Máximo 2MB.</p>
                </div>
            </div>

            {renderSection("identity", "Identidad de la Empresa", "🏢",
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div><label className={labelCls}>Nombre de la Empresa *</label>
                        <input value={settings.company_name || ''} onChange={e => set('company_name', e.target.value)} className={inputCls} placeholder="Ej: ZRN360 SRL" /></div>
                    <div><label className={labelCls}>CUIT</label>
                        <input value={settings.cuit || ''} onChange={e => set('cuit', e.target.value)} className={inputCls} placeholder="30-12345678-9" /></div>
                    <div><label className={labelCls}>Razón Social</label>
                        <input value={settings.legal_name || ''} onChange={e => set('legal_name', e.target.value)} className={inputCls} placeholder="Razón social legal" /></div>
                    <div><label className={labelCls}>Nombre de Fantasía</label>
                        <input value={settings.fantasy_name || ''} onChange={e => set('fantasy_name', e.target.value)} className={inputCls} placeholder="Nombre comercial" /></div>
                    <div><label className={labelCls}>Rubro / Industria</label>
                        <input value={settings.industry || ''} onChange={e => set('industry', e.target.value)} className={inputCls} placeholder="Ej: Tecnología, Servicios, etc." /></div>
                    <div><label className={labelCls}>Slogan</label>
                        <input value={settings.slogan || ''} onChange={e => set('slogan', e.target.value)} className={inputCls} placeholder="Tu frase corporativa" /></div>
                </div>
            )}

            {renderSection("contact", "Contacto", "📞",
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div><label className={labelCls}>Teléfono</label>
                        <input value={settings.phone || ''} onChange={e => set('phone', e.target.value)} className={inputCls} placeholder="+54 11 1234-5678" /></div>
                    <div><label className={labelCls}>Email de la Empresa</label>
                        <input type="email" value={settings.email || ''} onChange={e => set('email', e.target.value)} className={inputCls} placeholder="info@empresa.com" /></div>
                    <div><label className={labelCls}>Sitio Web</label>
                        <input value={settings.website || ''} onChange={e => set('website', e.target.value)} className={inputCls} placeholder="https://www.empresa.com" /></div>
                </div>
            )}

            {renderSection("address", "Dirección", "📍",
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2"><label className={labelCls}>Dirección</label>
                        <input value={settings.address || ''} onChange={e => set('address', e.target.value)} className={inputCls} placeholder="Calle y número" /></div>
                    <div><label className={labelCls}>Localidad / Ciudad</label>
                        <input value={settings.city || ''} onChange={e => set('city', e.target.value)} className={inputCls} placeholder="Ciudad" /></div>
                    <div><label className={labelCls}>Provincia</label>
                        <input value={settings.province || ''} onChange={e => set('province', e.target.value)} className={inputCls} placeholder="Provincia" /></div>
                    <div><label className={labelCls}>Código Postal</label>
                        <input value={settings.postal_code || ''} onChange={e => set('postal_code', e.target.value)} className={inputCls} placeholder="CP" /></div>
                    <div><label className={labelCls}>País</label>
                        <input value={settings.country || 'Argentina'} onChange={e => set('country', e.target.value)} className={inputCls} /></div>
                </div>
            )}

            {renderSection("hours", "Horarios", "🕐",
                <div className="space-y-5">
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                        <h5 className="text-xs font-bold text-blue-700 uppercase mb-3">🏢 Horario de Trabajo</h5>
                        <div className="grid grid-cols-2 gap-4">
                            <div><label className={labelCls}>Desde</label>
                                <input type="time" value={settings.work_start || '09:00'} onChange={e => set('work_start', e.target.value)} className={inputCls} /></div>
                            <div><label className={labelCls}>Hasta</label>
                                <input type="time" value={settings.work_end || '18:00'} onChange={e => set('work_end', e.target.value)} className={inputCls} /></div>
                        </div>
                    </div>
                    <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                        <h5 className="text-xs font-bold text-green-700 uppercase mb-3">🎧 Horario de Soporte</h5>
                        <div className="grid grid-cols-2 gap-4">
                            <div><label className={labelCls}>Desde</label>
                                <input type="time" value={settings.support_start || '08:00'} onChange={e => set('support_start', e.target.value)} className={inputCls} /></div>
                            <div><label className={labelCls}>Hasta</label>
                                <input type="time" value={settings.support_end || '20:00'} onChange={e => set('support_end', e.target.value)} className={inputCls} /></div>
                        </div>
                    </div>
                    <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                        <h5 className="text-xs font-bold text-purple-700 uppercase mb-3">📅 Rango Visible en Calendario</h5>
                        <div className="grid grid-cols-2 gap-4">
                            <div><label className={labelCls}>Desde</label>
                                <input type="time" value={settings.calendar_start || '00:00'} onChange={e => set('calendar_start', e.target.value)} className={inputCls} /></div>
                            <div><label className={labelCls}>Hasta</label>
                                <input type="time" value={settings.calendar_end || '23:00'} onChange={e => set('calendar_end', e.target.value)} className={inputCls} /></div>
                        </div>
                        <p className="text-[10px] text-purple-500 mt-2">Define el rango de horas visibles en la vista semanal del calendario.</p>
                    </div>
                </div>
            )}

            {renderSection("timezone", "Zona Horaria y Monedas", "🌍",
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                        <label className={labelCls}>Huso Horario</label>
                        <select value={settings.timezone || 'America/Argentina/Buenos_Aires'} onChange={e => set('timezone', e.target.value)} className={inputCls}>
                            <option value="America/Argentina/Buenos_Aires">Argentina (GMT-3)</option>
                            <option value="America/Montevideo">Uruguay (GMT-3)</option>
                            <option value="America/Santiago">Chile (GMT-4)</option>
                            <option value="America/Sao_Paulo">Brasil (GMT-3)</option>
                            <option value="America/Bogota">Colombia (GMT-5)</option>
                            <option value="America/Lima">Perú (GMT-5)</option>
                            <option value="America/Mexico_City">México (GMT-6)</option>
                            <option value="America/New_York">EEUU Este (GMT-5)</option>
                            <option value="Europe/Madrid">España (GMT+1)</option>
                            <option value="UTC">UTC (GMT+0)</option>
                        </select>
                    </div>
                    <div>
                        <label className={labelCls}>Moneda por Defecto</label>
                        <select value={settings.default_currency || 'ARS'} onChange={e => set('default_currency', e.target.value)} className={inputCls}>
                            <option value="ARS">🇦🇷 ARS - Peso Argentino</option>
                            <option value="USD">🇺🇸 USD - Dólar Estadounidense</option>
                            <option value="EUR">🇪🇺 EUR - Euro</option>
                            <option value="BRL">🇧🇷 BRL - Real Brasileño</option>
                            <option value="UYU">🇺🇾 UYU - Peso Uruguayo</option>
                            <option value="CLP">🇨🇱 CLP - Peso Chileno</option>
                            <option value="MXN">🇲🇽 MXN - Peso Mexicano</option>
                            <option value="COP">🇨🇴 COP - Peso Colombiano</option>
                            <option value="PEN">🇵🇪 PEN - Sol Peruano</option>
                            <option value="GBP">🇬🇧 GBP - Libra Esterlina</option>
                        </select>
                    </div>
                    <div>
                        <label className={labelCls}>Moneda Secundaria</label>
                        <select value={settings.secondary_currency || 'USD'} onChange={e => set('secondary_currency', e.target.value)} className={inputCls}>
                            <option value="">Sin moneda secundaria</option>
                            <option value="ARS">🇦🇷 ARS - Peso Argentino</option>
                            <option value="USD">🇺🇸 USD - Dólar Estadounidense</option>
                            <option value="EUR">🇪🇺 EUR - Euro</option>
                            <option value="BRL">🇧🇷 BRL - Real Brasileño</option>
                            <option value="UYU">🇺🇾 UYU - Peso Uruguayo</option>
                            <option value="CLP">🇨🇱 CLP - Peso Chileno</option>
                            <option value="MXN">🇲🇽 MXN - Peso Mexicano</option>
                            <option value="GBP">🇬🇧 GBP - Libra Esterlina</option>
                        </select>
                    </div>
                    <div>
                        <label className={labelCls}>Moneda Terciaria</label>
                        <select value={settings.tertiary_currency || ''} onChange={e => set('tertiary_currency', e.target.value)} className={inputCls}>
                            <option value="">Sin moneda terciaria</option>
                            <option value="ARS">🇦🇷 ARS - Peso Argentino</option>
                            <option value="USD">🇺🇸 USD - Dólar Estadounidense</option>
                            <option value="EUR">🇪🇺 EUR - Euro</option>
                            <option value="BRL">🇧🇷 BRL - Real Brasileño</option>
                            <option value="UYU">🇺🇾 UYU - Peso Uruguayo</option>
                            <option value="CLP">🇨🇱 CLP - Peso Chileno</option>
                            <option value="MXN">🇲🇽 MXN - Peso Mexicano</option>
                            <option value="GBP">🇬🇧 GBP - Libra Esterlina</option>
                        </select>
                    </div>
                </div>
            )}

            {renderSection("fiscal", "Datos Fiscales", "📋",
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div><label className={labelCls}>Condición IVA</label>
                        <select value={settings.iva_condition || ''} onChange={e => set('iva_condition', e.target.value)} className={inputCls}>
                            <option value="">Seleccionar</option>
                            <option value="RI">Responsable Inscripto</option>
                            <option value="Monotributo">Monotributo</option>
                            <option value="Exento">Exento</option>
                            <option value="CF">Consumidor Final</option>
                        </select></div>
                    <div><label className={labelCls}>Nro Ingresos Brutos</label>
                        <input value={settings.iibb_number || ''} onChange={e => set('iibb_number', e.target.value)} className={inputCls} placeholder="IIBB" /></div>
                    <div><label className={labelCls}>Inicio Ejercicio Fiscal</label>
                        <select value={settings.fiscal_start_month || 1} onChange={e => set('fiscal_start_month', Number(e.target.value))} className={inputCls}>
                            {['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'].map((m, i) => (
                                <option key={i + 1} value={i + 1}>{m}</option>
                            ))}
                        </select></div>
                </div>
            )}

            {renderSection("notes", "Observaciones", "📝",
                <textarea value={settings.notes || ''} onChange={e => set('notes', e.target.value)}
                    rows={4} className={inputCls + " resize-none"} placeholder="Notas internas sobre la empresa..." />
            )}

            <div className="flex justify-end">
                <button onClick={handleSave} disabled={saving}
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl shadow-lg hover:shadow-xl transition-all text-sm font-bold disabled:opacity-50">
                    <Save size={16} />
                    {saving ? 'Guardando...' : 'Guardar Configuración'}
                </button>
            </div>

            {
                toast && (
                    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-6 py-3 bg-gray-900 text-white rounded-xl shadow-2xl text-sm font-bold">
                        {toast}
                    </div>
                )
            }
        </div >
    );
}

function SettingsIcon(props: any) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
            <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
            <circle cx="12" cy="12" r="3" />
        </svg>
    );
}
