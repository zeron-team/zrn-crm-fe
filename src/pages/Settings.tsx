import { useState, useEffect } from "react";
import api from "../api/client";
import { CheckCircle2, XCircle, RefreshCw, Activity, Server, Database, Shield, LayoutDashboard, Save, BarChart3, Table2, Gauge, Building2, UserPlus, FileText, Package, Users, DollarSign, Calendar as CalendarIcon, Contact, FolderTree, ShieldCheck, TrendingUp } from "lucide-react";
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

export default function Settings() {
    const { t } = useTranslation();
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState("dashboard");
    const [healthStatus, setHealthStatus] = useState({
        backend: "checking",
        database: "checking",
        lastChecked: null as Date | null,
    });
    const [isChecking, setIsChecking] = useState(false);

    // Dashboard config state
    const [selectedWidgets, setSelectedWidgets] = useState<string[]>([]);
    const [loadingWidgets, setLoadingWidgets] = useState(false);
    const [savingWidgets, setSavingWidgets] = useState(false);
    const [savedNotice, setSavedNotice] = useState(false);

    useEffect(() => {
        if (activeTab === "health") runHealthCheck();
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

    const runHealthCheck = async () => {
        setIsChecking(true);
        setHealthStatus(prev => ({ ...prev, backend: "checking", database: "checking" }));
        let backendOk = false;
        try {
            const res = await fetch(`/health`);
            if (res.ok) {
                backendOk = true;
                setHealthStatus(prev => ({ ...prev, backend: "ok" }));
            } else {
                setHealthStatus(prev => ({ ...prev, backend: "error" }));
            }
        } catch {
            setHealthStatus(prev => ({ ...prev, backend: "error" }));
        }
        if (backendOk) {
            try {
                const res = await api.get("/users/?limit=1");
                if (res.status === 200) {
                    setHealthStatus(prev => ({ ...prev, database: "ok" }));
                } else {
                    setHealthStatus(prev => ({ ...prev, database: "error" }));
                }
            } catch {
                setHealthStatus(prev => ({ ...prev, database: "error" }));
            }
        } else {
            setHealthStatus(prev => ({ ...prev, database: "error" }));
        }
        setHealthStatus(prev => ({ ...prev, lastChecked: new Date() }));
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
                        className={`flex-1 min-w-[140px] py-4 text-sm font-medium transition-colors ${activeTab === "health" ? "text-green-600 border-b-2 border-green-600" : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"}`}
                        onClick={() => setActiveTab("health")}
                    >
                        {t('settings.tabs.health')}
                    </button>
                </div>

                <div className="p-6 cursor-default">
                    {/* ═══ PANEL DE CONTROL ═══ */}
                    {activeTab === "dashboard" && (
                        <div className="space-y-6">
                            {/* Header */}
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
                                <button
                                    onClick={saveWidgetConfig}
                                    disabled={savingWidgets}
                                    className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl shadow-lg shadow-indigo-200 hover:shadow-xl transition-all text-sm font-bold disabled:opacity-50 self-start sm:self-auto"
                                >
                                    <Save size={16} />
                                    {savingWidgets ? "Guardando..." : "Guardar Configuración"}
                                </button>
                            </div>

                            {savedNotice && (
                                <div className="flex items-center gap-2 px-4 py-3 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm font-medium animate-in">
                                    <CheckCircle2 size={16} /> Configuración guardada. Los cambios se reflejan al recargar el Panel de Control.
                                </div>
                            )}

                            {loadingWidgets ? (
                                <div className="py-12 text-center text-gray-400 animate-pulse">Cargando configuración...</div>
                            ) : (
                                <div className="space-y-6">
                                    {WIDGET_MODULES.map(mod => {
                                        const allSelected = mod.widgets.every(w => selectedWidgets.includes(w.id));
                                        const someSelected = mod.widgets.some(w => selectedWidgets.includes(w.id));
                                        const selectedCount = mod.widgets.filter(w => selectedWidgets.includes(w.id)).length;

                                        return (
                                            <div key={mod.module} className={`rounded-xl border-2 ${MODULE_COLORS[mod.color]} overflow-hidden`}>
                                                {/* Module header */}
                                                <div className="px-5 py-3 flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <span className={`px-2.5 py-1 rounded-lg text-xs font-black ${MODULE_HEADER_COLORS[mod.color]}`}>
                                                            {mod.module}
                                                        </span>
                                                        <span className="text-xs text-gray-400">{selectedCount}/{mod.widgets.length} activos</span>
                                                    </div>
                                                    <button
                                                        onClick={() => selectAllInModule(mod.widgets)}
                                                        className="text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors"
                                                    >
                                                        {allSelected ? "Deseleccionar todos" : "Seleccionar todos"}
                                                    </button>
                                                </div>

                                                {/* Widgets grid */}
                                                <div className="px-5 pb-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                                    {mod.widgets.map(widget => {
                                                        const isActive = selectedWidgets.includes(widget.id);
                                                        const badge = TYPE_BADGES[widget.type];
                                                        return (
                                                            <label
                                                                key={widget.id}
                                                                className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all duration-200
                                                                    ${isActive
                                                                        ? 'border-indigo-400 bg-white shadow-sm ring-1 ring-indigo-100'
                                                                        : 'border-transparent bg-white/60 hover:bg-white hover:border-gray-200'
                                                                    }`}
                                                            >
                                                                <input
                                                                    type="checkbox"
                                                                    checked={isActive}
                                                                    onChange={() => toggleWidget(widget.id)}
                                                                    className="w-4 h-4 text-indigo-600 bg-gray-100 border-gray-300 rounded focus:ring-indigo-500 focus:ring-2 shrink-0"
                                                                />
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="text-sm font-medium text-gray-800 truncate">{widget.label}</p>
                                                                </div>
                                                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0 ${badge.color}`}>
                                                                    {badge.label}
                                                                </span>
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

                    {activeTab === "arca" && (
                        <ArcaConfigPanel />
                    )}

                    {activeTab === "general" && (
                        <CompanySettingsPanel />
                    )}

                    {activeTab === "health" && (
                        <div className="max-w-4xl space-y-6">
                            <div className="flex justify-between items-center">
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                                        <Activity className="mr-2 text-green-600" size={20} />
                                        {t('settings.health.title')}
                                    </h3>
                                    <p className="text-sm text-gray-500 mt-1">
                                        {t('settings.health.lastChecked')} {healthStatus.lastChecked ? healthStatus.lastChecked.toLocaleTimeString() : t('settings.health.never')}
                                    </p>
                                </div>
                                <button
                                    onClick={runHealthCheck}
                                    disabled={isChecking}
                                    className="flex items-center px-4 py-2 bg-green-50 text-green-700 hover:bg-green-100 rounded-lg font-medium transition-colors disabled:opacity-50"
                                >
                                    <RefreshCw size={16} className={`mr-2 ${isChecking ? "animate-spin" : ""}`} />
                                    {isChecking ? t('settings.health.verifying') : t('settings.health.runCheck')}
                                </button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className={`p-5 rounded-xl border ${healthStatus.backend === "ok" ? "bg-green-50/50 border-green-100" : healthStatus.backend === "error" ? "bg-red-50/50 border-red-100" : "bg-gray-50 border-gray-100"}`}>
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-center space-x-3">
                                            <div className={`p-2 rounded-lg ${healthStatus.backend === "ok" ? "bg-green-100 text-green-600" : healthStatus.backend === "error" ? "bg-red-100 text-red-600" : "bg-gray-200 text-gray-500"}`}>
                                                <Server size={20} />
                                            </div>
                                            <div>
                                                <h4 className="font-semibold text-gray-900">{t('settings.health.api')}</h4>
                                                <p className="text-xs text-gray-500">{t('settings.health.apiDesc')}</p>
                                            </div>
                                        </div>
                                        {healthStatus.backend === "ok" ? <CheckCircle2 size={24} className="text-green-500" /> : healthStatus.backend === "error" ? <XCircle size={24} className="text-red-500" /> : <RefreshCw size={24} className="text-gray-400 animate-spin" />}
                                    </div>
                                    <div className="text-sm">
                                        {healthStatus.backend === "ok" ? <p className="text-green-700">{t('settings.health.apiOk')}</p> : healthStatus.backend === "error" ? <p className="text-red-700">{t('settings.health.apiError')}</p> : <p className="text-gray-500">{t('settings.health.apiChecking')}</p>}
                                    </div>
                                </div>
                                <div className={`p-5 rounded-xl border ${healthStatus.database === "ok" ? "bg-green-50/50 border-green-100" : healthStatus.database === "error" ? "bg-red-50/50 border-red-100" : "bg-gray-50 border-gray-100"}`}>
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-center space-x-3">
                                            <div className={`p-2 rounded-lg ${healthStatus.database === "ok" ? "bg-green-100 text-green-600" : healthStatus.database === "error" ? "bg-red-100 text-red-600" : "bg-gray-200 text-gray-500"}`}>
                                                <Database size={20} />
                                            </div>
                                            <div>
                                                <h4 className="font-semibold text-gray-900">{t('settings.health.db')}</h4>
                                                <p className="text-xs text-gray-500">{t('settings.health.dbDesc')}</p>
                                            </div>
                                        </div>
                                        {healthStatus.database === "ok" ? <CheckCircle2 size={24} className="text-green-500" /> : healthStatus.database === "error" ? <XCircle size={24} className="text-red-500" /> : <RefreshCw size={24} className="text-gray-400 animate-spin" />}
                                    </div>
                                    <div className="text-sm">
                                        {healthStatus.database === "ok" ? <p className="text-green-700">{t('settings.health.dbOk')}</p> : healthStatus.database === "error" ? <p className="text-red-700">{t('settings.health.dbError')}</p> : <p className="text-gray-500">{t('settings.health.dbChecking')}</p>}
                                    </div>
                                </div>
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
        identity: true, contact: true, address: true, hours: true, fiscal: false, notes: false,
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

    const Section = ({ id, title, icon, children }: { id: string; title: string; icon: string; children: React.ReactNode }) => (
        <div className="border border-gray-200 rounded-xl overflow-hidden">
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

            {/* Identity */}
            <Section id="identity" title="Identidad de la Empresa" icon="🏢">
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
            </Section>

            {/* Contact */}
            <Section id="contact" title="Contacto" icon="📞">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div><label className={labelCls}>Teléfono</label>
                        <input value={settings.phone || ''} onChange={e => set('phone', e.target.value)} className={inputCls} placeholder="+54 11 1234-5678" /></div>
                    <div><label className={labelCls}>Email de la Empresa</label>
                        <input type="email" value={settings.email || ''} onChange={e => set('email', e.target.value)} className={inputCls} placeholder="info@empresa.com" /></div>
                    <div><label className={labelCls}>Sitio Web</label>
                        <input value={settings.website || ''} onChange={e => set('website', e.target.value)} className={inputCls} placeholder="https://www.empresa.com" /></div>
                </div>
            </Section>

            {/* Address */}
            <Section id="address" title="Dirección" icon="📍">
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
            </Section>

            {/* Hours */}
            <Section id="hours" title="Horarios" icon="🕐">
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
            </Section>

            {/* Fiscal */}
            <Section id="fiscal" title="Datos Fiscales" icon="📋">
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
            </Section>

            {/* Notes */}
            <Section id="notes" title="Observaciones" icon="📝">
                <textarea value={settings.notes || ''} onChange={e => set('notes', e.target.value)}
                    rows={4} className={inputCls + " resize-none"} placeholder="Notas internas sobre la empresa..." />
            </Section>

            {/* Bottom save */}
            <div className="flex justify-end">
                <button onClick={handleSave} disabled={saving}
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl shadow-lg hover:shadow-xl transition-all text-sm font-bold disabled:opacity-50">
                    <Save size={16} />
                    {saving ? 'Guardando...' : 'Guardar Configuración'}
                </button>
            </div>

            {/* Toast */}
            {toast && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-6 py-3 bg-gray-900 text-white rounded-xl shadow-2xl text-sm font-bold">
                    {toast}
                </div>
            )}
        </div>
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
