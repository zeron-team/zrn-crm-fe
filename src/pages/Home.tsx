import { useNavigate } from "react-router-dom";
import {
    LayoutDashboard, BarChart3, StickyNote, UserPlus, FileText, Building2, Truck, Contact,
    Calendar, Ticket, FolderKanban, BookOpen, Users, Clock, Banknote, Mail, MessageCircle,
    CreditCard, ShoppingCart, Warehouse, Building, LineChart, Package, FolderTree, Settings,
    Shield, Briefcase, UserCheck, Receipt, ArrowRight, Sparkles, Zap, ChevronRight,
    TrendingUp, Globe
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

const VERSION = "3.0.0";

interface ModuleCard {
    title: string;
    description: string;
    icon: React.ReactNode;
    color: string;
    bgGradient: string;
    items: { label: string; path: string; icon: React.ReactNode }[];
}

const MODULES: ModuleCard[] = [
    {
        title: "Panel de Control",
        description: "Vista general del negocio con métricas clave, actividad reciente y accesos rápidos a todas las áreas del sistema.",
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
        description: "Gestión integral de relaciones con clientes. Desde la captación de leads hasta la conversión en cuentas, seguimiento de presupuestos, soporte técnico y gestión de vendedores.",
        icon: <Briefcase size={24} />,
        color: "text-emerald-600",
        bgGradient: "from-emerald-500 to-teal-600",
        items: [
            { label: "Leads / Prospectos", path: "/leads", icon: <UserPlus size={14} /> },
            { label: "Presupuestos", path: "/quotes", icon: <FileText size={14} /> },
            { label: "Cuentas (Clientes)", path: "/clients", icon: <Building2 size={14} /> },
            { label: "Proveedores", path: "/providers", icon: <Truck size={14} /> },
            { label: "Contactos", path: "/contacts", icon: <Contact size={14} /> },
            { label: "Actividades / Calendario", path: "/calendar", icon: <Calendar size={14} /> },
            { label: "Soporte / Tickets", path: "/support", icon: <Ticket size={14} /> },
            { label: "Vendedores", path: "/sellers", icon: <BarChart3 size={14} /> },
        ],
    },
    {
        title: "Proyectos",
        description: "Gestión de proyectos con tableros Kanban interactivos, seguimiento de tareas, asignación de recursos y documentación centralizada en la Wiki.",
        icon: <FolderKanban size={24} />,
        color: "text-purple-600",
        bgGradient: "from-purple-500 to-violet-600",
        items: [
            { label: "Mis Proyectos (Kanban)", path: "/projects", icon: <FolderKanban size={14} /> },
            { label: "Wiki / Documentación", path: "/wiki", icon: <BookOpen size={14} /> },
        ],
    },
    {
        title: "RRHH",
        description: "Módulo completo de recursos humanos: legajos digitales, control de fichadas con reloj en tiempo real, liquidación de sueldos con cálculos automáticos según ley argentina.",
        icon: <UserCheck size={24} />,
        color: "text-teal-600",
        bgGradient: "from-teal-500 to-cyan-600",
        items: [
            { label: "Empleados / Legajos", path: "/employees", icon: <Users size={14} /> },
            { label: "Fichadas / Control Horario", path: "/time-tracking", icon: <Clock size={14} /> },
            { label: "Liquidación de Sueldos", path: "/payroll", icon: <Banknote size={14} /> },
        ],
    },
    {
        title: "Comunicaciones",
        description: "Canales de comunicación integrados. Envío y recepción de emails corporativos y mensajería instantánea a través de WhatsApp Business API.",
        icon: <Mail size={24} />,
        color: "text-pink-600",
        bgGradient: "from-pink-500 to-rose-600",
        items: [
            { label: "Email Corporativo", path: "/email", icon: <Mail size={14} /> },
            { label: "WhatsApp Business", path: "/whatsapp", icon: <MessageCircle size={14} /> },
        ],
    },
    {
        title: "ERP / Contabilidad",
        description: "Sistema contable completo con facturación electrónica ARCA/AFIP, remitos, órdenes de compra y pago, gestión de inventario multialmacén y tipo de cambio USD/ARS.",
        icon: <Receipt size={24} />,
        color: "text-amber-600",
        bgGradient: "from-amber-500 to-orange-600",
        items: [
            { label: "Facturación Electrónica (ARCA)", path: "/billing", icon: <FileText size={14} /> },
            { label: "Compras de Servicios", path: "/service-purchases", icon: <CreditCard size={14} /> },
            { label: "Remitos", path: "/delivery-notes", icon: <Truck size={14} /> },
            { label: "Órdenes de Pago", path: "/payment-orders", icon: <CreditCard size={14} /> },
            { label: "Órdenes de Compra", path: "/purchase-orders", icon: <ShoppingCart size={14} /> },
            { label: "Inventario", path: "/inventory", icon: <Warehouse size={14} /> },
            { label: "Depósitos", path: "/warehouses", icon: <Building size={14} /> },
            { label: "Tipo de Cambio", path: "/exchange-rates", icon: <LineChart size={14} /> },
        ],
    },
    {
        title: "Catálogo",
        description: "Administración del catálogo de productos, servicios y mano de obra. Organización jerárquica con Familias, Categorías y Subcategorías para una gestión eficiente.",
        icon: <Package size={24} />,
        color: "text-indigo-600",
        bgGradient: "from-indigo-500 to-blue-600",
        items: [
            { label: "Productos y Servicios", path: "/products", icon: <Package size={14} /> },
            { label: "Categorías (Familias)", path: "/categories", icon: <FolderTree size={14} /> },
        ],
    },
    {
        title: "Sistema",
        description: "Configuración global del sistema: gestión de usuarios, roles y permisos granulares por módulo, y parámetros de la plataforma.",
        icon: <Settings size={24} />,
        color: "text-gray-600",
        bgGradient: "from-gray-500 to-gray-700",
        items: [
            { label: "Usuarios", path: "/users", icon: <Users size={14} /> },
            { label: "Roles y Permisos", path: "/role-permissions", icon: <Shield size={14} /> },
            { label: "Configuración", path: "/settings", icon: <Settings size={14} /> },
        ],
    },
];

const HIGHLIGHTS = [
    { icon: <Zap size={20} />, title: "Facturación ARCA", desc: "Integración directa con AFIP/ARCA para emisión de comprobantes electrónicos A, B y C con validación en tiempo real." },
    { icon: <TrendingUp size={20} />, title: "Business Intelligence", desc: "8 dashboards analíticos: Ventas, Compras, Inventario, Productos, Proveedores, CRM, Cashflow y RRHH con KPIs en tiempo real." },
    { icon: <Globe size={20} />, title: "Bilingüe ES/EN", desc: "Interfaz completamente traducida al español e inglés con cambio dinámico de idioma." },
    { icon: <UserCheck size={20} />, title: "RRHH Completo", desc: "Legajos digitales, control de fichadas, liquidación de sueldos automática según legislación argentina vigente." },
    { icon: <Sparkles size={20} />, title: "Diseño Premium", desc: "Interfaz moderna, responsive y profesional con animaciones fluidas, dark mode parcial y experiencia de usuario optimizada." },
    { icon: <Shield size={20} />, title: "Roles y Permisos", desc: "Control granular de acceso por usuario y módulo. Cada rol puede tener permisos personalizados a nivel de página." },
];

export default function Home() {
    const navigate = useNavigate();
    const { user } = useAuth();

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Hero Section */}
            <div className="relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950" />
                <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(99,102,241,0.3) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(59,130,246,0.2) 0%, transparent 50%)' }} />
                {/* Grid pattern */}
                <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />

                <div className="relative max-w-7xl mx-auto px-6 py-14 lg:py-20">
                    <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
                        <div className="flex-1">
                            <div className="inline-flex items-center gap-2 bg-emerald-500/20 border border-emerald-400/30 rounded-full px-4 py-1.5 mb-6">
                                <Sparkles size={14} className="text-emerald-400" />
                                <span className="text-emerald-300 text-xs font-bold uppercase tracking-wider">Nueva Versión</span>
                            </div>

                            <h1 className="text-4xl lg:text-5xl font-black text-white mb-4 leading-tight">
                                Bienvenido a <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-400">ZeRoN 360°</span>
                            </h1>

                            <p className="text-lg text-blue-100/80 max-w-xl mb-8 leading-relaxed">
                                Plataforma integral de gestión empresarial 360°. CRM, ERP, RRHH, Facturación Electrónica ARCA, Business Intelligence y más — todo en un solo lugar.
                            </p>

                            <div className="flex flex-wrap gap-3">
                                <button onClick={() => navigate('/dashboard')}
                                    className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold px-6 py-3 rounded-xl hover:from-blue-500 hover:to-indigo-500 transition-all shadow-lg shadow-blue-600/25 hover:shadow-blue-600/40">
                                    Ir al Dashboard <ArrowRight size={16} />
                                </button>
                                <button onClick={() => navigate('/dashboards')}
                                    className="inline-flex items-center gap-2 bg-white/10 text-white font-bold px-6 py-3 rounded-xl hover:bg-white/20 transition-all border border-white/10">
                                    <BarChart3 size={16} /> Centro de Dashboards
                                </button>
                            </div>

                            {user && (
                                <p className="mt-6 text-sm text-blue-200/50">
                                    Conectado como <span className="text-blue-200/80 font-semibold">{user.full_name || user.email}</span>
                                </p>
                            )}
                        </div>

                        {/* Version badge */}
                        <div className="flex-shrink-0">
                            <div className="relative">
                                <div className="w-32 h-32 lg:w-36 lg:h-36 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-2xl shadow-purple-600/30">
                                    <div className="text-center">
                                        <p className="text-3xl lg:text-4xl font-black text-white">v{VERSION}</p>
                                    </div>
                                </div>
                                <div className="absolute -top-2 -right-2 w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg animate-pulse">
                                    <Sparkles size={14} className="text-white" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Highlights */}
            <div className="px-6 py-12">
                <h2 className="text-center text-2xl font-black text-gray-900 mb-2">Características de esta versión</h2>
                <p className="text-center text-gray-500 mb-8 text-sm">Todo lo que necesitás para gestionar tu empresa de forma profesional</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {HIGHLIGHTS.map((h) => (
                        <div key={h.title} className="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-lg hover:border-blue-100 transition-all duration-300 group">
                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center text-blue-600 mb-3 group-hover:from-blue-100 group-hover:to-indigo-100 transition-colors">
                                {h.icon}
                            </div>
                            <h3 className="font-bold text-gray-900 text-sm mb-1">{h.title}</h3>
                            <p className="text-xs text-gray-500 leading-relaxed">{h.desc}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Module Cards */}
            <div className="px-6 pb-16">
                <h2 className="text-center text-2xl font-black text-gray-900 mb-2">Módulos del Sistema</h2>
                <p className="text-center text-gray-500 mb-8 text-sm">{MODULES.length} módulos · {MODULES.reduce((s, m) => s + m.items.length, 0)} funcionalidades integradas</p>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                    {MODULES.map((mod) => (
                        <div key={mod.title}
                            className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-xl hover:border-gray-200 transition-all duration-300 group flex flex-col">

                            {/* Card header with gradient */}
                            <div className={`bg-gradient-to-r ${mod.bgGradient} p-5`}>
                                <div className="flex items-center gap-3">
                                    <div className="w-11 h-11 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center text-white">
                                        {mod.icon}
                                    </div>
                                    <div>
                                        <h3 className="font-black text-white text-lg">{mod.title}</h3>
                                        <p className="text-white/70 text-xs">{mod.items.length} funcionalidades</p>
                                    </div>
                                </div>
                            </div>

                            {/* Description */}
                            <div className="px-5 pt-4 pb-2">
                                <p className="text-sm text-gray-600 leading-relaxed">{mod.description}</p>
                            </div>

                            {/* Items list */}
                            <div className="px-5 pb-5 flex-1">
                                <div className="mt-3 space-y-1">
                                    {mod.items.map((item) => (
                                        <button key={item.path}
                                            onClick={() => navigate(item.path)}
                                            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left hover:bg-gray-50 transition-colors group/item">
                                            <span className={`${mod.color} opacity-60 group-hover/item:opacity-100 transition-opacity`}>{item.icon}</span>
                                            <span className="text-sm text-gray-700 group-hover/item:text-gray-900 font-medium flex-1">{item.label}</span>
                                            <ChevronRight size={14} className="text-gray-300 group-hover/item:text-gray-500 transition-colors" />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Footer */}
            <div className="bg-gradient-to-r from-slate-900 to-gray-900 py-8">
                <div className="px-6 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                            <div className="w-3 h-3 bg-white rounded-full" />
                        </div>
                        <span className="font-black text-white tracking-tight">ZRN360°</span>
                        <span className="text-xs text-gray-500 font-mono">v{VERSION}</span>
                    </div>
                    <p className="text-sm text-gray-500">
                        © {new Date().getFullYear()} ZeRoN 360° — Todos los derechos reservados.
                    </p>
                </div>
            </div>
        </div>
    );
}
