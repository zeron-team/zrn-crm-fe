import { useState, useEffect } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
    Users, Building2, Contact, Package, Clock,
    Truck, FileText, Calendar, Settings, LineChart, Globe, UserPlus, Menu, X, LogOut,
    FolderTree, Ticket, LayoutDashboard, ChevronDown, ChevronRight, Home,
    Briefcase, HeadphonesIcon, Receipt, BookOpen, Cog, CreditCard, ShoppingCart, Warehouse, Building, BarChart3, Mail, MessageCircle, StickyNote, FolderKanban, UserCheck, Shield, Banknote
} from "lucide-react";
import SidebarItem from "./SidebarItem";
import NotificationBar from "./NotificationBar";
import HelpManual from "./HelpManual";
import { useAuth } from "../context/AuthContext";
import api from "../api/client";
import HeaderClock from "./HeaderClock";
import OnlineUsers from "./OnlineUsers";
import AiChatWidget from "./AiChatWidget";

interface SidebarSectionProps {
    title: string;
    icon: React.ReactNode;
    children: React.ReactNode;
    defaultOpen?: boolean;
}

function SidebarSection({ title, icon, children, defaultOpen = false }: SidebarSectionProps) {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <div className="mb-1">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between px-3 py-2 text-[11px] font-bold text-gray-400 uppercase tracking-wider hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors group"
            >
                <div className="flex items-center gap-2">
                    <span className="text-gray-300 group-hover:text-gray-500 transition-colors">{icon}</span>
                    {title}
                </div>
                {isOpen
                    ? <ChevronDown size={14} className="text-gray-300" />
                    : <ChevronRight size={14} className="text-gray-300" />
                }
            </button>
            <div
                className={`overflow-hidden transition-all duration-200 ease-in-out ${isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}
            >
                <div className="ml-1 pl-2 border-l-2 border-gray-100 space-y-0.5 py-1">
                    {children}
                </div>
            </div>
        </div>
    );
}

export default function Layout() {
    const { t, i18n } = useTranslation();
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [allowedPages, setAllowedPages] = useState<string[]>([]);
    const [permLoaded, setPermLoaded] = useState(false);

    // Fetch user permissions
    useEffect(() => {
        const fetchPerms = async () => {
            if (!user?.id) return;
            try {
                const { data } = await api.get(`/role-configs/user-permissions/${user.id}`);
                setAllowedPages(data.allowed_pages || []);
            } catch {
                // Fallback: show everything if permissions fail to load
                setAllowedPages([]);
            } finally { setPermLoaded(true); }
        };
        fetchPerms();
    }, [user?.id]);

    const isAdmin = (user?.role || '').split(',').map(r => r.trim()).includes('admin');
    const canAccess = (path: string) => isAdmin || !permLoaded || allowedPages.includes(path);

    const handleLogout = () => {
        logout();
        navigate('/login', { replace: true });
    };

    const changeLanguage = (lng: string) => {
        i18n.changeLanguage(lng);
        localStorage.setItem('appLanguage', lng);
    };

    const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);

    const closeMobile = () => setIsMobileMenuOpen(false);

    return (
        <div className="flex h-screen bg-gray-50 text-gray-900 font-sans overflow-hidden">
            {/* Mobile Backdrop */}
            {isMobileMenuOpen && (
                <div
                    className="md:hidden fixed inset-0 z-20 bg-gray-900/50 backdrop-blur-sm"
                    onClick={toggleMobileMenu}
                ></div>
            )}

            {/* Sidebar */}
            <aside className={`fixed md:static inset-y-0 left-0 z-30 w-64 bg-white border-r border-gray-200 flex flex-col transform transition-transform duration-300 ease-in-out ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
                <div className="h-16 flex items-center justify-between px-5 border-b border-gray-100">
                    <div className="flex items-center">
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg shadow-md flex items-center justify-center mr-3">
                            <div className="w-3 h-3 bg-white rounded-full"></div>
                        </div>
                        <h1 className="text-xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600">ZRN360°</h1>
                    </div>
                    <button onClick={toggleMobileMenu} className="md:hidden text-gray-500 hover:text-gray-700">
                        <X size={24} />
                    </button>
                </div>

                <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto scrollbar-thin">
                    {/* ═══ PRINCIPAL ═══ */}
                    <div className="mb-2" onClick={closeMobile}>
                        <div className="px-3 mb-1 text-[11px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                            <LayoutDashboard size={12} className="text-gray-300" />
                            Principal
                        </div>
                        {canAccess('/') && <SidebarItem to="/" icon={<Home size={18} />} label="Inicio" />}
                        {canAccess('/dashboard') && <SidebarItem to="/dashboard" icon={<LayoutDashboard size={18} />} label="Panel de Control" />}
                        {canAccess('/dashboards') && <SidebarItem to="/dashboards" icon={<BarChart3 size={18} />} label="Dashboards" />}
                        {canAccess('/notes') && <SidebarItem to="/notes" icon={<StickyNote size={18} />} label="Notas" />}
                    </div>

                    {/* ═══ CRM ═══ */}
                    <SidebarSection title="CRM" icon={<Briefcase size={12} />} defaultOpen={true}>
                        <div onClick={closeMobile}>
                            {canAccess('/leads') && <SidebarItem to="/leads" icon={<UserPlus size={18} />} label={t('layout.leads')} />}
                            {canAccess('/quotes') && <SidebarItem to="/quotes" icon={<FileText size={18} />} label="Presupuestos" />}
                            {canAccess('/clients') && <SidebarItem to="/clients" icon={<Building2 size={18} />} label="Cuentas" />}
                            {canAccess('/providers') && <SidebarItem to="/providers" icon={<Truck size={18} />} label={t('layout.providers')} />}
                            {canAccess('/contacts') && <SidebarItem to="/contacts" icon={<Contact size={18} />} label={t('layout.contacts')} />}
                            {canAccess('/calendar') && <SidebarItem to="/calendar" icon={<Calendar size={18} />} label={t('layout.activities')} />}
                            {canAccess('/support') && <SidebarItem to="/support" icon={<Ticket size={18} />} label="Soporte" />}
                            {canAccess('/sellers') && <SidebarItem to="/sellers" icon={<BarChart3 size={18} />} label="Vendedores" />}
                        </div>
                    </SidebarSection>

                    {/* ═══ PROYECTOS ═══ */}
                    <SidebarSection title="Proyectos" icon={<FolderKanban size={12} />} defaultOpen={true}>
                        <div onClick={closeMobile}>
                            {canAccess('/projects') && <SidebarItem to="/projects" icon={<FolderKanban size={18} />} label="Mis Proyectos" />}
                            {canAccess('/wiki') && <SidebarItem to="/wiki" icon={<BookOpen size={18} />} label="Wiki" />}
                        </div>
                    </SidebarSection>

                    {/* ═══ RRHH ═══ */}
                    <SidebarSection title="RRHH" icon={<UserCheck size={12} />} defaultOpen={true}>
                        <div onClick={closeMobile}>
                            {canAccess('/employees') && <SidebarItem to="/employees" icon={<Users size={18} />} label="Empleados" />}
                            {canAccess('/time-tracking') && <SidebarItem to="/time-tracking" icon={<Clock size={18} />} label="Fichadas" />}
                            {canAccess('/payroll') && <SidebarItem to="/payroll" icon={<Banknote size={18} />} label="Liquidación" />}
                        </div>
                    </SidebarSection>

                    {/* ═══ COMUNICACIONES ═══ */}
                    <SidebarSection title="Comunicaciones" icon={<Mail size={12} />} defaultOpen={true}>
                        <div onClick={closeMobile}>
                            {canAccess('/email') && <SidebarItem to="/email" icon={<Mail size={18} />} label="Email" />}
                            {canAccess('/whatsapp') && <SidebarItem to="/whatsapp" icon={<MessageCircle size={18} />} label="WhatsApp" />}
                        </div>
                    </SidebarSection>

                    {/* ═══ ERP ═══ */}
                    <SidebarSection title="ERP" icon={<Receipt size={12} />} defaultOpen={true}>
                        <div onClick={closeMobile}>
                            {canAccess('/billing') && <SidebarItem to="/billing" icon={<FileText size={18} />} label={t('layout.billing')} />}
                            {canAccess('/service-purchases') && <SidebarItem to="/service-purchases" icon={<CreditCard size={18} />} label="Compras de Servicios" />}
                            {canAccess('/delivery-notes') && <SidebarItem to="/delivery-notes" icon={<Truck size={18} />} label="Remitos" />}
                            {canAccess('/payment-orders') && <SidebarItem to="/payment-orders" icon={<CreditCard size={18} />} label="Orden de Pago" />}
                            {canAccess('/purchase-orders') && <SidebarItem to="/purchase-orders" icon={<ShoppingCart size={18} />} label="Orden de Compra" />}
                            {canAccess('/inventory') && <SidebarItem to="/inventory" icon={<Warehouse size={18} />} label="Inventario" />}
                            {canAccess('/warehouses') && <SidebarItem to="/warehouses" icon={<Building size={18} />} label="Depósitos" />}
                            {canAccess('/exchange-rates') && <SidebarItem to="/exchange-rates" icon={<LineChart size={18} />} label="Tipo de Cambio" />}
                        </div>
                    </SidebarSection>

                    {/* ═══ CATÁLOGO ═══ */}
                    <SidebarSection title="Catálogo" icon={<BookOpen size={12} />} defaultOpen={false}>
                        <div onClick={closeMobile}>
                            {canAccess('/products') && <SidebarItem to="/products" icon={<Package size={18} />} label={t('layout.products')} />}
                            {canAccess('/categories') && <SidebarItem to="/categories" icon={<FolderTree size={18} />} label={t('layout.categories')} />}
                        </div>
                    </SidebarSection>

                    {/* ═══ SISTEMA ═══ */}
                    <SidebarSection title="Sistema" icon={<Cog size={12} />} defaultOpen={false}>
                        <div onClick={closeMobile}>
                            {canAccess('/users') && <SidebarItem to="/users" icon={<Users size={18} />} label="Usuarios" />}
                            {canAccess('/role-permissions') && <SidebarItem to="/role-permissions" icon={<Shield size={18} />} label="Roles y Permisos" />}
                            {canAccess('/settings') && <SidebarItem to="/settings" icon={<Settings size={18} />} label={t('layout.settings')} />}
                        </div>
                    </SidebarSection>
                </nav>

                {/* User footer */}
                <div className="p-3 border-t border-gray-100 bg-gray-50/50">
                    <div className="flex items-center gap-3 px-2">
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 shadow-sm rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                            {(user?.full_name || user?.email || 'U').charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-gray-800 truncate">{user?.full_name || 'Usuario'}</p>
                            <p className="text-[10px] text-gray-400 truncate">{user?.email || ''}</p>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="p-1.5 text-gray-400 hover:text-red-600 transition-colors rounded-lg hover:bg-red-50"
                            title={t('login.logout')}
                        >
                            <LogOut size={16} />
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Top Header */}
                <header className="h-14 bg-white/80 backdrop-blur-md border-b border-gray-100 flex items-center justify-between px-4 md:px-8 sticky top-0 z-10">
                    <div className="flex items-center gap-3">
                        <button onClick={toggleMobileMenu} className="md:hidden mr-2 text-gray-600 hover:text-gray-900">
                            <Menu size={24} />
                        </button>
                        <div className="bg-gradient-to-r from-gray-800 to-gray-900 rounded-xl shadow-md">
                            <HeaderClock userEmail={user?.email} />
                        </div>
                    </div>

                    <div className="flex items-center space-x-3 md:space-x-4">

                        {/* Online Users Indicator */}
                        <OnlineUsers />

                        {/* Language Switcher */}
                        <NotificationBar />

                        <div className="hidden sm:flex items-center space-x-1.5 bg-gray-100 p-0.5 rounded-lg">
                            <Globe size={14} className="text-gray-500 ml-2" />
                            <button
                                onClick={() => changeLanguage('en')}
                                className={`px-2 py-1 text-xs font-bold rounded-md transition-colors ${i18n.language === 'en' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                EN
                            </button>
                            <button
                                onClick={() => changeLanguage('es')}
                                className={`px-2 py-1 text-xs font-bold rounded-md transition-colors ${i18n.language === 'es' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                ES
                            </button>
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <main className="flex-1 p-4 md:p-6 overflow-auto bg-gray-50">
                    <Outlet />
                </main>
            </div>
            <AiChatWidget />
        </div>
    );
}
