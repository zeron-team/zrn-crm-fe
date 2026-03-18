import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
    LayoutDashboard, BarChart3, StickyNote, UserPlus, FileText, Building2, Truck, Contact,
    Calendar, Ticket, FolderKanban, BookOpen, Users, Clock, Banknote, Mail, MessageCircle,
    CreditCard, ShoppingCart, Warehouse, Building, LineChart, Package, FolderTree, Settings,
    Shield, Briefcase, UserCheck, Receipt, ArrowRight, Sparkles, Zap, ChevronRight,
    TrendingUp, Globe, Bot, BrainCircuit, MessageSquareText, Calculator, ClipboardList,
    FilePenLine, UserCog, Landmark, BadgeCheck, X
} from "lucide-react";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";

const VERSION = "8.2.5";

interface ModuleCard {
    title: string;
    description: string;
    icon: React.ReactNode;
    color: string;
    bgGradient: string;
    items: { label: string; path: string; icon: React.ReactNode; isNew?: boolean }[];
}

const MODULES: ModuleCard[] = [
    {
        title: "Panel de Control",
        description: "Vista general del negocio con métricas clave.",
        icon: <LayoutDashboard size={24} />,
        color: "text-blue-600",
        bgGradient: "from-blue-500 to-indigo-600",
        items: [
            { label: "Dashboard Principal", path: "/dashboard", icon: <LayoutDashboard size={14} /> },
            { label: "Centro de Dashboards (BI)", path: "/dashboards", icon: <BarChart3 size={14} /> },
            { label: "Notas Rápidas", path: "/notes", icon: <StickyNote size={14} /> },
        ],
    },
    {
        title: "CRM",
        description: "Gestión integral de relaciones con clientes.",
        icon: <Briefcase size={24} />,
        color: "text-emerald-600",
        bgGradient: "from-emerald-500 to-teal-600",
        items: [
            { label: "Leads / Prospectos", path: "/leads", icon: <UserPlus size={14} /> },
            { label: "Presupuestos", path: "/quotes", icon: <FileText size={14} /> },
            { label: "Cuentas (Clientes)", path: "/clients", icon: <Building2 size={14} /> },
            { label: "Proveedores", path: "/providers", icon: <Truck size={14} /> },
            { label: "Contactos", path: "/contacts", icon: <Contact size={14} /> },
            { label: "Calendario", path: "/calendar", icon: <Calendar size={14} /> },
            { label: "Soporte / Tickets", path: "/support", icon: <Ticket size={14} /> },
        ],
    },
    {
        title: "ERP / Facturación",
        description: "Comprobantes electrónicos ARCA, remitos, órdenes.",
        icon: <Calculator size={24} />,
        color: "text-orange-600",
        bgGradient: "from-orange-500 to-red-600",
        items: [
            { label: "Facturación ARCA", path: "/invoices", icon: <Receipt size={14} /> },
            { label: "Remitos", path: "/delivery-notes", icon: <FileText size={14} /> },
            { label: "Órdenes de Compra", path: "/purchase-orders", icon: <ShoppingCart size={14} /> },
            { label: "Órdenes de Pago", path: "/payment-orders", icon: <Banknote size={14} /> },
        ],
    },
    {
        title: "RRHH",
        description: "Empleados, fichadas, liquidación de sueldos.",
        icon: <Users size={24} />,
        color: "text-violet-600",
        bgGradient: "from-violet-500 to-purple-600",
        items: [
            { label: "Empleados", path: "/employees", icon: <UserCheck size={14} /> },
            { label: "Fichadas", path: "/time-entries", icon: <Clock size={14} /> },
            { label: "Liquidación", path: "/payroll", icon: <Banknote size={14} /> },
            { label: "Novedades", path: "/employee-novelties", icon: <ClipboardList size={14} />, isNew: true },
        ],
    },
    {
        title: "Proyectos",
        description: "Gestión de proyectos con sprints y tareas.",
        icon: <FolderKanban size={24} />,
        color: "text-cyan-600",
        bgGradient: "from-cyan-500 to-blue-600",
        items: [
            { label: "Proyectos", path: "/projects", icon: <FolderKanban size={14} /> },
            { label: "Wiki", path: "/wiki", icon: <BookOpen size={14} /> },
        ],
    },
    {
        title: "Sistema",
        description: "Configuración, roles, auditoría.",
        icon: <Settings size={24} />,
        color: "text-gray-600",
        bgGradient: "from-gray-500 to-slate-600",
        items: [
            { label: "Usuarios", path: "/users", icon: <Users size={14} /> },
            { label: "Ajustes", path: "/settings", icon: <Settings size={14} /> },
        ],
    },
];

const HIGHLIGHTS = [
    { icon: <ClipboardList size={20} />, title: "📋 Novedades RRHH", desc: "Sistema de novedades por empleado que se integran con liquidación.", isNew: true },
    { icon: <FilePenLine size={20} />, title: "📄 Documentos Digitales", desc: "Recibos de sueldo digitales, legajos y acuerdos.", isNew: true },
    { icon: <Zap size={20} />, title: "Facturación ARCA", desc: "Comprobantes A, B y C con AFIP/ARCA en tiempo real." },
    { icon: <TrendingUp size={20} />, title: "Business Intelligence", desc: "8 dashboards analíticos con KPIs en tiempo real." },
    { icon: <Globe size={20} />, title: "Bilingüe ES/EN", desc: "Interfaz traducida con cambio dinámico de idioma." },
    { icon: <UserCheck size={20} />, title: "RRHH Completo", desc: "Legajos, fichadas, liquidación automática." },
    { icon: <Sparkles size={20} />, title: "Diseño Premium", desc: "Interfaz responsive con animaciones profesionales." },
    { icon: <Shield size={20} />, title: "Roles y Permisos", desc: "Control granular de acceso por usuario y módulo." },
];

export default function WelcomeModal() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [show, setShow] = useState(false);
    const [dontShow, setDontShow] = useState(false);

    useEffect(() => {
        api.get("/news/welcome-status").then(r => {
            if (r.data.show_welcome) setShow(true);
        }).catch(() => { });
    }, []);

    const handleClose = () => {
        if (dontShow) {
            api.post("/news/dismiss-welcome").catch(() => { });
        }
        setShow(false);
    };

    if (!show) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="relative bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
                {/* Close button */}
                <button onClick={handleClose}
                    className="sticky top-3 float-right mr-3 z-10 w-9 h-9 bg-white/90 backdrop-blur-sm rounded-full shadow-lg flex items-center justify-center hover:bg-gray-100 transition-colors">
                    <X size={18} className="text-gray-600" />
                </button>

                {/* Hero */}
                <div className="relative overflow-hidden rounded-t-2xl">
                    <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950" />
                    <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(99,102,241,0.3) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(59,130,246,0.2) 0%, transparent 50%)' }} />

                    <div className="relative px-8 py-10 flex flex-col md:flex-row items-center gap-6">
                        <div className="flex-1 text-center md:text-left">
                            <div className="inline-flex items-center gap-2 bg-emerald-500/20 border border-emerald-400/30 rounded-full px-4 py-1.5 mb-4">
                                <Sparkles size={14} className="text-emerald-400" />
                                <span className="text-emerald-300 text-xs font-bold uppercase tracking-wider">Versión {VERSION}</span>
                            </div>
                            <h1 className="text-3xl lg:text-4xl font-black text-white mb-3 leading-tight">
                                Bienvenido a <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-400">ZeRoN 360°</span>
                            </h1>
                            <p className="text-blue-100/80 max-w-xl leading-relaxed text-sm">
                                Plataforma integral de gestión empresarial 360°. CRM, ERP, Contabilidad, RRHH, Facturación Electrónica ARCA, Proyectos, Business Intelligence e IA.
                            </p>
                            {user && (
                                <p className="mt-3 text-xs text-blue-200/50">
                                    Conectado como <span className="text-blue-200/80 font-semibold">{user.full_name || user.email}</span>
                                </p>
                            )}
                        </div>
                        <div className="flex-shrink-0">
                            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-2xl shadow-purple-600/30">
                                <p className="text-2xl font-black text-white">v{VERSION}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ZeRoN IA Banner */}
                <div className="mx-6 -mt-4 relative z-10 mb-6">
                    <div className="relative overflow-hidden bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 rounded-xl shadow-lg">
                        <div className="relative p-5 flex items-center gap-4">
                            <div className="w-14 h-14 bg-white/15 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/20 flex-shrink-0">
                                <Bot size={28} className="text-white" />
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-white mb-1">
                                    ZeRoN IA <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full ml-2">Google Gemini</span>
                                </h3>
                                <p className="text-purple-100/80 text-xs leading-relaxed">
                                    Asistente inteligente que conoce tu negocio: consultá clientes, facturas, leads, tickets, inventario y más.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Highlights */}
                <div className="px-6 pb-4">
                    <h2 className="text-lg font-black text-gray-900 mb-3">🚀 Destacados</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        {HIGHLIGHTS.map(h => (
                            <div key={h.title} className={`p-3 rounded-xl border ${h.isNew ? 'border-purple-200 bg-purple-50/50' : 'border-gray-100 bg-white'} text-xs`}>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className={h.isNew ? 'text-purple-600' : 'text-blue-600'}>{h.icon}</span>
                                    <span className="font-bold text-gray-900 text-[11px]">{h.title}</span>
                                </div>
                                <p className="text-gray-500 leading-relaxed">{h.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Module Quick Access */}
                <div className="px-6 pb-4">
                    <h2 className="text-lg font-black text-gray-900 mb-3">Módulos del Sistema</h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                        {MODULES.map(mod => (
                            <div key={mod.title}
                                onClick={() => { navigate(mod.items[0]?.path || '/dashboard'); handleClose(); }}
                                className={`bg-gradient-to-r ${mod.bgGradient} p-4 rounded-xl cursor-pointer hover:shadow-lg transition-all text-center`}>
                                <div className="text-white mb-2 flex justify-center">{mod.icon}</div>
                                <h3 className="font-bold text-white text-xs">{mod.title}</h3>
                                <p className="text-white/60 text-[10px] mt-1">{mod.items.length} func.</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Dismiss option + Actions */}
                <div className="px-6 py-5 bg-gray-50 rounded-b-2xl border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-600 hover:text-gray-800 transition-colors">
                        <input type="checkbox" checked={dontShow} onChange={e => setDontShow(e.target.checked)}
                            className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                        No volver a mostrar esta versión
                    </label>
                    <div className="flex gap-3">
                        <button onClick={() => { navigate('/dashboard'); handleClose(); }}
                            className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold px-5 py-2.5 rounded-xl hover:from-blue-500 hover:to-indigo-500 transition-all text-sm">
                            Ir al Dashboard <ArrowRight size={14} />
                        </button>
                        <button onClick={handleClose}
                            className="inline-flex items-center gap-2 bg-white text-gray-700 font-bold px-5 py-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 transition-all text-sm">
                            Cerrar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
