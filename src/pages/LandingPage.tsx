import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
    LayoutDashboard, Briefcase, Receipt, UserCheck, FolderKanban, Mail,
    Calculator, Package, Settings, Shield, Brain, Smartphone,
    BarChart3, TrendingUp, ChevronRight, Sparkles,
    MessageCircle, Bot, ArrowRight, Star, CheckCircle2,
    Puzzle, ExternalLink, LogIn, X
} from "lucide-react";

const VERSION = "8.2.5";

/* ═══════════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════════ */
interface DetailItem {
    title: string;
    desc: string;
}
interface ModuleData {
    name: string;
    desc: string;
    icon: any;
    gradient: string;
    path: string;
    details: DetailItem[];
}
interface PluginData {
    name: string;
    desc: string;
    icon: any;
    gradient: string;
    path: string;
    features: string[];
    details: DetailItem[];
}

/* ═══════════════════════════════════════════════════════════
   MODULE DATA
   ═══════════════════════════════════════════════════════════ */
const MODULES: ModuleData[] = [
    {
        name: "Principal", desc: "Dashboard, notas, calendario y panel de control.",
        icon: LayoutDashboard, gradient: "from-blue-500 to-indigo-600", path: "/dashboard",
        details: [
            { title: "Panel de Control", desc: "Vista centralizada con KPIs, gráficos de ventas, tareas pendientes y actividad reciente." },
            { title: "Noticias Internas", desc: "Feed de comunicados, actualizaciones y alertas con categorías, prioridades y fotos." },
            { title: "Notas Kanban", desc: "Notas tipo post-it con drag-and-drop, privacidad configurable y colores personalizados." },
            { title: "Calendario", desc: "Vista mensual/semanal de eventos, reuniones y deadlines sincronizados con el sistema." },
            { title: "Dashboards BI", desc: "Centro de inteligencia de negocios con 8+ dashboards analíticos interactivos." },
        ]
    },
    {
        name: "CRM", desc: "Leads, cuentas, contactos, presupuestos y soporte.",
        icon: Briefcase, gradient: "from-emerald-500 to-teal-600", path: "/leads",
        details: [
            { title: "Leads", desc: "Gestión del pipeline comercial con etapas personalizables y seguimiento de conversión." },
            { title: "Cuentas", desc: "Administración de empresas clientes con datos fiscales, contactos y historial." },
            { title: "Contactos", desc: "Base de contactos con teléfonos, emails, cargos y vinculación a cuentas." },
            { title: "Presupuestos", desc: "Creación de cotizaciones con ítems del catálogo, cuotas e integración ARCA." },
            { title: "Soporte / Tickets", desc: "Sistema de tickets con estados, prioridades, comentarios internos y auditoría." },
            { title: "Pipeline de Ventas", desc: "Visualización del embudo comercial con métricas de avance por etapa." },
        ]
    },
    {
        name: "ERP", desc: "Facturación ARCA, remitos, órdenes, inventario.",
        icon: Receipt, gradient: "from-orange-500 to-red-600", path: "/billing",
        details: [
            { title: "Facturación Electrónica", desc: "Emisión de comprobantes A, B y C directamente con AFIP/ARCA. CAE automático." },
            { title: "Remitos", desc: "Notas de entrega vinculadas a facturas con control de ítems despachados." },
            { title: "Órdenes de Compra", desc: "Gestión de compras a proveedores con aprobación y seguimiento de entrega." },
            { title: "Órdenes de Pago", desc: "Control de pagos a proveedores con métodos, fechas y conciliación." },
            { title: "Inventario", desc: "Stock en tiempo real con niveles críticos, alertas y movimientos." },
            { title: "Depósitos", desc: "Múltiples almacenes con ubicaciones, responsables y capacidad." },
            { title: "Tipo de Cambio", desc: "Cotización de monedas actualizada para operaciones en dólares y euros." },
            { title: "Proveedores", desc: "Base de proveedores con datos fiscales, servicios y condiciones comerciales." },
        ]
    },
    {
        name: "RRHH", desc: "Empleados, fichadas, liquidación de sueldos.",
        icon: UserCheck, gradient: "from-violet-500 to-purple-600", path: "/employees",
        details: [
            { title: "Empleados", desc: "Legajos completos con datos personales, bancarios y contractuales." },
            { title: "Fichadas", desc: "Control de ingreso/egreso con breaks, horas extra y reportes de asistencia." },
            { title: "Liquidación de Sueldos", desc: "Cálculo automático de haberes con conceptos configurables según ley argentina." },
            { title: "Novedades", desc: "Registro de licencias, ausencias, horas extra y variaciones mensuales." },
            { title: "Dashboard RRHH", desc: "Métricas de costos salariales, demografía, evolución y análisis por departamento." },
        ]
    },
    {
        name: "Proyectos", desc: "Sprints, Kanban, Wiki y gestión de tareas.",
        icon: FolderKanban, gradient: "from-cyan-500 to-blue-600", path: "/projects",
        details: [
            { title: "Proyectos", desc: "Gestión de proyectos con versiones, sprints, backlog y progreso ponderado." },
            { title: "Tablero Kanban", desc: "Columnas arrastrables con tareas, subtareas, story points y asignados." },
            { title: "Sprints", desc: "Planificación por sprints con fechas, objetivos y métricas de velocidad." },
            { title: "Wiki / Documentación", desc: "Wiki colaborativa con markdown, categorías y sistema de privacidad." },
            { title: "Adjuntos de Tareas", desc: "Imágenes y archivos embebidos en tareas con previsualización inline." },
        ]
    },
    {
        name: "Comunicaciones", desc: "Email corporativo, WhatsApp y Bot Flows.",
        icon: Mail, gradient: "from-pink-500 to-rose-600", path: "/email",
        details: [
            { title: "Email Corporativo", desc: "Envío y recepción de correos con firmas HTML, plantillas y seguimiento." },
            { title: "WhatsApp", desc: "Canal de WhatsApp Business integrado con historial de conversaciones." },
            { title: "Bot Flows", desc: "Editor visual drag-and-drop para crear flujos conversacionales automatizados." },
            { title: "Notificaciones", desc: "Alertas multicanal: email, Telegram, Discord y WhatsApp." },
        ]
    },
    {
        name: "Contabilidad", desc: "Liquidaciones y obligaciones fiscales.",
        icon: Calculator, gradient: "from-amber-500 to-orange-600", path: "/accounting",
        details: [
            { title: "Liquidaciones", desc: "Registro de liquidaciones de empresas con conceptos y totales." },
            { title: "Obligaciones Fiscales", desc: "Seguimiento de vencimientos impositivos y previsionales." },
            { title: "Reportes Contables", desc: "Informes de ingresos, egresos y balances por período." },
        ]
    },
    {
        name: "Catálogo", desc: "Productos, servicios y categorías.",
        icon: Package, gradient: "from-lime-500 to-green-600", path: "/products",
        details: [
            { title: "Productos", desc: "Alta de productos con código, precio, IVA, stock y categorización." },
            { title: "Servicios", desc: "Registro de servicios y mano de obra con tarifas y unidades." },
            { title: "Categorías", desc: "Jerarquía de 3 niveles: Familia → Categoría → Subcategoría." },
            { title: "Búsqueda y Filtros", desc: "Búsqueda avanzada con filtros por tipo, categoría y estado." },
        ]
    },
    {
        name: "Sistema", desc: "Usuarios, roles, permisos y auditoría.",
        icon: Settings, gradient: "from-slate-500 to-gray-700", path: "/settings",
        details: [
            { title: "Usuarios", desc: "Gestión de cuentas con roles, avatares y último acceso." },
            { title: "Roles y Permisos", desc: "Control granular de acceso por página y funcionalidad." },
            { title: "Auditoría", desc: "Log completo de acciones: login, creaciones, ediciones y eliminaciones." },
            { title: "Configuración Empresa", desc: "Datos fiscales, logo, CUIT y parámetros del sistema." },
            { title: "Canales de Notificación", desc: "Configuración de Email, Telegram, Discord y WhatsApp." },
        ]
    },
];

/* ═══════════════════════════════════════════════════════════
   BENEFITS DATA
   ═══════════════════════════════════════════════════════════ */
const BENEFITS = [
    { icon: Puzzle, title: "Todo en Uno", desc: "CRM, ERP, RRHH, Facturación, Proyectos e IA en una sola plataforma. Sin integraciones complejas.", color: "text-blue-500", bg: "bg-blue-500/10" },
    { icon: Smartphone, title: "100% Responsive", desc: "Diseño adaptativo premium para desktop, tablet y móvil. Trabajá desde cualquier dispositivo.", color: "text-emerald-500", bg: "bg-emerald-500/10" },
    { icon: Brain, title: "IA Integrada", desc: "Asistente ZeRoN IA con Google Gemini que conoce tu negocio y responde consultas en tiempo real.", color: "text-purple-500", bg: "bg-purple-500/10" },
    { icon: Receipt, title: "Facturación ARCA", desc: "Emisión de comprobantes electrónicos A, B y C directamente con AFIP/ARCA. 100% fiscal.", color: "text-orange-500", bg: "bg-orange-500/10" },
    { icon: Shield, title: "Seguridad Avanzada", desc: "Criptografía Rust (AES-256-GCM), Argon2id hashing, JWT nativo y auditoría completa.", color: "text-red-500", bg: "bg-red-500/10" },
    { icon: BarChart3, title: "Business Intelligence", desc: "8+ dashboards analíticos con KPIs, gráficos interactivos y métricas en tiempo real.", color: "text-cyan-500", bg: "bg-cyan-500/10" },
];

/* ═══════════════════════════════════════════════════════════
   MARKETPLACE PLUGINS DATA
   ═══════════════════════════════════════════════════════════ */
const PLUGINS: PluginData[] = [
    {
        name: "Bot Flows",
        desc: "Creá flujos conversacionales automatizados para WhatsApp con un editor visual drag-and-drop. Atención 24/7 sin intervención humana.",
        icon: Bot, gradient: "from-violet-600 to-purple-700", path: "/bot-flows",
        features: ["Editor visual", "Respuestas automáticas", "Integración WhatsApp"],
        details: [
            { title: "Editor Visual Drag & Drop", desc: "Diseñá flujos conversacionales arrastrando nodos de preguntas, respuestas y condiciones." },
            { title: "Nodos de Pregunta", desc: "Preguntas con opciones múltiples, texto libre y validaciones automáticas." },
            { title: "Respuestas Automáticas", desc: "Mensajes predefinidos que se envían según la opción elegida por el usuario." },
            { title: "Conexión WhatsApp", desc: "Los flujos se ejecutan directamente en conversaciones de WhatsApp Business." },
            { title: "Atención 24/7", desc: "El bot responde automáticamente sin necesidad de intervención humana." },
        ]
    },
    {
        name: "WhatsApp Business",
        desc: "Envío y recepción de mensajes de WhatsApp directamente desde el CRM. Historial de conversaciones y notificaciones.",
        icon: MessageCircle, gradient: "from-green-500 to-emerald-600", path: "/whatsapp",
        features: ["Mensajes masivos", "Historial completo", "Notificaciones"],
        details: [
            { title: "Mensajes Directos", desc: "Enviar y recibir mensajes de WhatsApp sin salir del CRM." },
            { title: "Historial de Conversaciones", desc: "Registro completo de todas las interacciones con cada contacto." },
            { title: "Notificaciones en Tiempo Real", desc: "Alertas cuando se reciben nuevos mensajes o respuestas." },
            { title: "Mensajes Masivos", desc: "Envío de comunicados a múltiples contactos de forma controlada." },
            { title: "Integración con CRM", desc: "Los mensajes se vinculan automáticamente a leads, cuentas y contactos." },
        ]
    },
    {
        name: "Email Corporativo",
        desc: "Gestión de correo electrónico integrada con firmas, plantillas, envío masivo y seguimiento de apertura.",
        icon: Mail, gradient: "from-blue-500 to-indigo-600", path: "/email",
        features: ["Firmas HTML", "Plantillas", "Envío masivo"],
        details: [
            { title: "Bandeja Integrada", desc: "Lectura y escritura de emails directamente desde la plataforma." },
            { title: "Firmas HTML", desc: "Firmas corporativas personalizables con logo, datos de contacto y redes." },
            { title: "Plantillas", desc: "Templates reutilizables para comunicaciones frecuentes." },
            { title: "Envío Masivo", desc: "Campañas de email a listas de contactos segmentadas." },
            { title: "Seguimiento", desc: "Tracking de apertura y clicks en los emails enviados." },
        ]
    },
    {
        name: "Vendedores",
        desc: "Panel exclusivo para el equipo comercial con rankings, comisiones, pipeline de ventas y tasa de conversión.",
        icon: TrendingUp, gradient: "from-amber-500 to-orange-600", path: "/sellers",
        features: ["Rankings", "Comisiones", "Pipeline"],
        details: [
            { title: "Rankings de Vendedores", desc: "Tabla de posiciones con métricas de ventas, conversión y facturación." },
            { title: "Comisiones", desc: "Cálculo automático de comisiones por venta cerrada o facturada." },
            { title: "Pipeline Personal", desc: "Vista individual del embudo de ventas con oportunidades activas." },
            { title: "Tasa de Conversión", desc: "Métricas de eficiencia: leads contactados vs ventas cerradas." },
            { title: "Objetivos", desc: "Metas mensuales y trimestrales con indicadores de cumplimiento." },
        ]
    },
    {
        name: "Dashboards BI",
        desc: "Centro de inteligencia de negocios con dashboards de Ventas, Compras, Inventario, CRM, Cashflow y RRHH.",
        icon: BarChart3, gradient: "from-cyan-500 to-teal-600", path: "/dashboards",
        features: ["8 dashboards", "KPIs en vivo", "Gráficos interactivos"],
        details: [
            { title: "Dashboard de Ventas", desc: "Facturación, tickets promedio, evolución mensual y top productos." },
            { title: "Dashboard de Compras", desc: "Análisis de gastos por proveedor, categoría y período." },
            { title: "Dashboard de Inventario", desc: "Stock actual, rotación, productos críticos y valorización." },
            { title: "Dashboard CRM", desc: "Pipeline, conversión, actividad de leads y pronósticos." },
            { title: "Dashboard Cashflow", desc: "Flujo de caja, liquidez, ingresos vs egresos proyectados." },
            { title: "Dashboard RRHH", desc: "Costos salariales, headcount, evolución y métricas de asistencia." },
        ]
    },
];

/* ═══════════════════════════════════════════════════════════
   DETAIL MODAL COMPONENT
   ═══════════════════════════════════════════════════════════ */
function DetailModal({ item, onClose, onNavigate, isLoggedIn }: {
    item: ModuleData | PluginData;
    onClose: () => void;
    onNavigate: (path: string) => void;
    isLoggedIn: boolean;
}) {
    const Icon = item.icon;
    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
            <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full max-h-[85vh] overflow-hidden" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className={`bg-gradient-to-r ${item.gradient} p-6 relative`}>
                    <button onClick={onClose}
                        className="absolute top-4 right-4 w-8 h-8 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-all">
                        <X size={16} />
                    </button>
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                            <Icon size={28} className="text-white" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-white">{item.name}</h2>
                            <p className="text-white/60 text-xs mt-0.5">v{VERSION}</p>
                        </div>
                    </div>
                    <p className="text-white/70 text-sm mt-3 leading-relaxed">{item.desc}</p>
                </div>

                {/* Features list */}
                <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(85vh - 200px)' }}>
                    <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Contenido del módulo</h3>
                    <div className="space-y-3">
                        {item.details.map((d, i) => (
                            <div key={i} className="flex gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
                                <div className="flex-shrink-0 mt-0.5">
                                    <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${item.gradient} flex items-center justify-center`}>
                                        <span className="text-white font-black text-[10px]">{i + 1}</span>
                                    </div>
                                </div>
                                <div className="min-w-0">
                                    <h4 className="text-sm font-bold text-gray-900">{d.title}</h4>
                                    <p className="text-xs text-gray-500 leading-relaxed mt-0.5">{d.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Footer CTA */}
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                    <span className="text-[11px] text-gray-400">{item.details.length} funcionalidades</span>
                    <button onClick={() => onNavigate(isLoggedIn ? item.path : "/login")}
                        className={`inline-flex items-center gap-2 bg-gradient-to-r ${item.gradient} text-white font-bold text-sm px-6 py-2.5 rounded-xl shadow-lg hover:shadow-xl transition-all`}>
                        {isLoggedIn ? "Ir al Módulo" : "Ingresar"} <ArrowRight size={14} />
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════
   LANDING PAGE COMPONENT
   ═══════════════════════════════════════════════════════════ */
export default function LandingPage() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const isLoggedIn = !!user;
    const [selectedItem, setSelectedItem] = useState<ModuleData | PluginData | null>(null);

    return (
        <div className="min-h-screen bg-gray-50">

            {/* ════════════════════════════════════════════════
                STICKY NAVIGATION BAR
               ════════════════════════════════════════════════ */}
            <nav className="fixed top-0 left-0 right-0 z-50 bg-white/5 backdrop-blur-xl border-b border-white/10">
                <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                            <span className="text-white font-black text-lg">Z</span>
                        </div>
                        <span className="text-white font-black text-lg tracking-tight">ZRN 360°</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <a href="#modulos" className="hidden sm:inline-flex text-white/60 hover:text-white text-sm font-medium px-3 py-1.5 rounded-lg hover:bg-white/5 transition-all">Módulos</a>
                        <a href="#beneficios" className="hidden sm:inline-flex text-white/60 hover:text-white text-sm font-medium px-3 py-1.5 rounded-lg hover:bg-white/5 transition-all">Beneficios</a>
                        <a href="#marketplace" className="hidden sm:inline-flex text-white/60 hover:text-white text-sm font-medium px-3 py-1.5 rounded-lg hover:bg-white/5 transition-all">Plugins</a>
                        {isLoggedIn ? (
                            <button onClick={() => navigate("/dashboard")}
                                className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold text-sm px-5 py-2.5 rounded-xl shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all">
                                <LayoutDashboard size={16} /> Dashboard
                            </button>
                        ) : (
                            <button onClick={() => navigate("/login")}
                                className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold text-sm px-5 py-2.5 rounded-xl shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all">
                                <LogIn size={16} /> Ingresar
                            </button>
                        )}
                    </div>
                </div>
            </nav>

            {/* ════════════════════════════════════════════════
                HERO SECTION
               ════════════════════════════════════════════════ */}
            <section className="relative overflow-hidden pt-16">
                <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950" />
                <div className="absolute inset-0">
                    <div className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
                    <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1.5s" }} />
                    <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-purple-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "3s" }} />
                    <div className="absolute inset-0 opacity-[0.03]" style={{
                        backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
                        backgroundSize: '50px 50px'
                    }} />
                </div>

                <div className="relative max-w-6xl mx-auto px-6 py-20 lg:py-28">
                    <div className="text-center max-w-3xl mx-auto">
                        <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/10 rounded-full px-5 py-2 mb-8">
                            <Sparkles size={14} className="text-amber-400" />
                            <span className="text-white/80 text-xs font-bold tracking-wider uppercase">Versión {VERSION} — Plataforma de Gestión 360°</span>
                        </div>

                        <div className="flex items-center justify-center gap-4 mb-6">
                            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl shadow-2xl shadow-blue-500/30 flex items-center justify-center">
                                <span className="text-white font-black text-4xl tracking-tighter">Z</span>
                            </div>
                        </div>

                        <h1 className="text-5xl lg:text-7xl font-black text-white mb-4 tracking-tight leading-none">
                            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400">ZRN</span>{" "}
                            <span className="text-white">360°</span>
                        </h1>

                        <p className="text-xl lg:text-2xl text-blue-100/60 font-medium mb-4">
                            Plataforma Integral de Gestión Empresarial
                        </p>

                        <p className="text-blue-200/40 text-sm max-w-2xl mx-auto leading-relaxed mb-10">
                            CRM · ERP · Facturación Electrónica ARCA · RRHH · Proyectos · Business Intelligence · Inteligencia Artificial — Todo lo que necesitás para gestionar tu empresa en un solo lugar.
                        </p>

                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                            {isLoggedIn ? (
                                <button onClick={() => navigate("/dashboard")}
                                    className="group inline-flex items-center gap-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold px-8 py-4 rounded-2xl shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:from-blue-600 hover:to-indigo-700 transition-all text-base">
                                    Ir al Dashboard
                                    <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                                </button>
                            ) : (
                                <button onClick={() => navigate("/login")}
                                    className="group inline-flex items-center gap-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold px-8 py-4 rounded-2xl shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:from-blue-600 hover:to-indigo-700 transition-all text-base">
                                    <LogIn size={20} />
                                    Ingresar a mi Cuenta
                                    <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                                </button>
                            )}
                            <a href="#modulos"
                                className="inline-flex items-center gap-2 text-white/60 hover:text-white font-bold px-6 py-4 rounded-2xl hover:bg-white/5 transition-all text-sm border border-white/10">
                                Ver Módulos
                                <ChevronRight size={16} />
                            </a>
                        </div>

                        {isLoggedIn && (
                            <p className="mt-10 text-xs text-blue-200/30">
                                Conectado como <span className="text-blue-200/50 font-semibold">{user.full_name || user.email}</span>
                            </p>
                        )}
                    </div>
                </div>

                <div className="absolute bottom-0 left-0 right-0">
                    <svg viewBox="0 0 1440 80" fill="none" className="w-full h-auto">
                        <path d="M0 80V30C240 60 480 0 720 30C960 60 1200 0 1440 30V80H0Z" fill="#f9fafb" />
                    </svg>
                </div>
            </section>

            {/* ════════════════════════════════════════════════
                MODULES SECTION
               ════════════════════════════════════════════════ */}
            <section id="modulos" className="max-w-6xl mx-auto px-6 py-16 lg:py-20">
                <div className="text-center mb-12">
                    <span className="inline-block text-xs font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 px-4 py-1.5 rounded-full mb-4">Ecosistema Completo</span>
                    <h2 className="text-3xl lg:text-4xl font-black text-gray-900 mb-3">Módulos del Sistema</h2>
                    <p className="text-gray-500 max-w-xl mx-auto text-sm leading-relaxed">
                        9 módulos especializados que trabajan en conjunto para cubrir todas las áreas de tu empresa.
                    </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {MODULES.map(mod => (
                        <button key={mod.name} onClick={() => setSelectedItem(mod)}
                            className="group text-left bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                            <div className={`bg-gradient-to-r ${mod.gradient} p-5 flex items-center gap-4`}>
                                <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center flex-shrink-0">
                                    <mod.icon size={24} className="text-white" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-black text-white">{mod.name}</h3>
                                    <p className="text-white/60 text-xs">v{VERSION}</p>
                                </div>
                            </div>
                            <div className="p-5">
                                <p className="text-gray-600 text-sm leading-relaxed">{mod.desc}</p>
                                <div className="mt-3 flex items-center gap-1 text-xs font-bold text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity">
                                    Ver detalle <ChevronRight size={14} />
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            </section>

            {/* ════════════════════════════════════════════════
                BENEFITS SECTION
               ════════════════════════════════════════════════ */}
            <section id="beneficios" className="bg-white border-y border-gray-100">
                <div className="max-w-6xl mx-auto px-6 py-16 lg:py-20">
                    <div className="text-center mb-12">
                        <span className="inline-block text-xs font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 px-4 py-1.5 rounded-full mb-4">Ventajas</span>
                        <h2 className="text-3xl lg:text-4xl font-black text-gray-900 mb-3">¿Por qué ZRN 360°?</h2>
                        <p className="text-gray-500 max-w-xl mx-auto text-sm leading-relaxed">
                            Diseñado para empresas que buscan eficiencia, control y una experiencia premium.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {BENEFITS.map(b => (
                            <div key={b.title} className="group p-6 rounded-2xl border border-gray-100 hover:border-gray-200 hover:shadow-lg transition-all duration-300 bg-white">
                                <div className={`w-14 h-14 rounded-2xl ${b.bg} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                                    <b.icon size={26} className={b.color} />
                                </div>
                                <h3 className="text-lg font-black text-gray-900 mb-2">{b.title}</h3>
                                <p className="text-gray-500 text-sm leading-relaxed">{b.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ════════════════════════════════════════════════
                MARKETPLACE / PLUGINS SECTION
               ════════════════════════════════════════════════ */}
            <section id="marketplace" className="max-w-6xl mx-auto px-6 py-16 lg:py-20">
                <div className="text-center mb-12">
                    <span className="inline-block text-xs font-black uppercase tracking-widest text-purple-600 bg-purple-50 px-4 py-1.5 rounded-full mb-4">Marketplace</span>
                    <h2 className="text-3xl lg:text-4xl font-black text-gray-900 mb-3">Plugins y Extensiones</h2>
                    <p className="text-gray-500 max-w-xl mx-auto text-sm leading-relaxed">
                        Ampliá las capacidades de tu plataforma con plugins especializados. Ya incluidos en tu plan.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {PLUGINS.map(plugin => (
                        <div key={plugin.name}
                            className="group relative bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-2xl hover:-translate-y-1 transition-all duration-300">
                            <div className={`bg-gradient-to-r ${plugin.gradient} p-6`}>
                                <div className="flex items-start justify-between">
                                    <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                                        <plugin.icon size={28} className="text-white" />
                                    </div>
                                    <span className="inline-flex items-center gap-1 bg-white/20 backdrop-blur-sm text-white text-[10px] font-bold px-3 py-1 rounded-full border border-white/20">
                                        <CheckCircle2 size={12} /> Incluido
                                    </span>
                                </div>
                                <h3 className="text-xl font-black text-white mt-4">{plugin.name}</h3>
                            </div>

                            <div className="p-6">
                                <p className="text-gray-600 text-sm leading-relaxed mb-4">{plugin.desc}</p>
                                <div className="flex flex-wrap gap-2 mb-5">
                                    {plugin.features.map(f => (
                                        <span key={f} className="inline-flex items-center gap-1 text-[11px] font-bold text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
                                            <Star size={10} className="text-amber-400" /> {f}
                                        </span>
                                    ))}
                                </div>
                                <button onClick={() => setSelectedItem(plugin)}
                                    className="w-full inline-flex items-center justify-center gap-2 bg-gray-900 text-white font-bold text-sm px-5 py-3 rounded-xl hover:bg-gray-800 transition-all group-hover:shadow-lg">
                                    Explorar <ExternalLink size={14} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* ════════════════════════════════════════════════
                STATS RIBBON
               ════════════════════════════════════════════════ */}
            <section className="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 relative overflow-hidden">
                <div className="absolute inset-0 opacity-10" style={{
                    backgroundImage: 'radial-gradient(circle at 30% 50%, rgba(99,102,241,0.4) 0%, transparent 50%), radial-gradient(circle at 70% 50%, rgba(59,130,246,0.3) 0%, transparent 50%)'
                }} />
                <div className="relative max-w-6xl mx-auto px-6 py-14">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
                        {[
                            { value: "9", label: "Módulos" },
                            { value: "5+", label: "Plugins" },
                            { value: "120+", label: "Endpoints API" },
                            { value: "100%", label: "Responsive" },
                        ].map(stat => (
                            <div key={stat.label}>
                                <p className="text-4xl lg:text-5xl font-black bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-400">{stat.value}</p>
                                <p className="text-blue-200/50 text-sm font-medium mt-1">{stat.label}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ════════════════════════════════════════════════
                CTA FINAL + FOOTER
               ════════════════════════════════════════════════ */}
            {!isLoggedIn && (
                <section className="max-w-6xl mx-auto px-6 py-16 text-center">
                    <h2 className="text-2xl lg:text-3xl font-black text-gray-900 mb-3">¿Listo para transformar tu gestión?</h2>
                    <p className="text-gray-500 text-sm mb-8 max-w-lg mx-auto">Ingresá a la plataforma y descubrí todo lo que ZRN 360° puede hacer por tu empresa.</p>
                    <button onClick={() => navigate("/login")}
                        className="group inline-flex items-center gap-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold px-10 py-4 rounded-2xl shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:from-blue-600 hover:to-indigo-700 transition-all text-lg">
                        <LogIn size={22} />
                        Ingresar Ahora
                        <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                </section>
            )}

            <footer className="bg-white border-t border-gray-100">
                <div className="max-w-6xl mx-auto px-6 py-10">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                                <span className="text-white font-black text-lg">Z</span>
                            </div>
                            <div>
                                <p className="font-black text-gray-900">ZRN 360°</p>
                                <p className="text-[11px] text-gray-400">Plataforma de Gestión Empresarial</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-6 text-sm text-gray-400">
                            <span className="font-mono text-xs bg-gray-100 text-gray-500 px-2.5 py-1 rounded-full">v{VERSION}</span>
                            <span>© {new Date().getFullYear()} Zeron Team</span>
                        </div>
                    </div>
                </div>
            </footer>

            {/* ════════════════════════════════════════════════
                DETAIL MODAL
               ════════════════════════════════════════════════ */}
            {selectedItem && (
                <DetailModal
                    item={selectedItem}
                    onClose={() => setSelectedItem(null)}
                    onNavigate={(path) => { setSelectedItem(null); navigate(path); }}
                    isLoggedIn={isLoggedIn}
                />
            )}
        </div>
    );
}
