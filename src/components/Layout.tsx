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
import registry from "../modules/registry";

// Icon lookup map for dynamic sidebar rendering from module manifests
const ICON_MAP: Record<string, any> = {
    Home, Users, Building2, Contact, Package, Clock, Truck, FileText, Calendar,
    Settings, LineChart, Globe, UserPlus, Menu, X, LogOut, FolderTree, Ticket,
    LayoutDashboard, ChevronDown, ChevronRight, Briefcase, HeadphonesIcon, Receipt,
    BookOpen, Cog, CreditCard, ShoppingCart, Warehouse, Building, BarChart3,
    Mail, MessageCircle, StickyNote, FolderKanban, UserCheck, Shield, Banknote,
};

interface SidebarSectionProps {
    title: string;
    icon: React.ReactNode;
    children: React.ReactNode;
    defaultOpen?: boolean;
}

function SidebarSection({ title, icon, children, defaultOpen = true }: SidebarSectionProps) {
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
    const [companyInfo, setCompanyInfo] = useState<{ company_name?: string; legal_name?: string; cuit?: string; logo_url?: string } | null>(null);

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

    // Fetch company settings for header
    useEffect(() => {
        api.get('/company-settings/').then(r => {
            if (r.data) setCompanyInfo(r.data);
        }).catch(() => { });
    }, []);

    const userRoles = (user?.role || '').split(',').map(r => r.trim());
    const isAdmin = userRoles.includes('admin') || userRoles.includes('superadmin');
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
                <div className="relative border-b border-gray-100">
                    {/* Mobile close */}
                    <button onClick={toggleMobileMenu} className="md:hidden absolute top-3 right-3 text-gray-500 hover:text-gray-700 z-10">
                        <X size={20} />
                    </button>
                    <div className="flex flex-col items-center px-4 py-4 gap-2">
                        {companyInfo?.logo_url ? (
                            <img src={companyInfo.logo_url} alt="Logo" className="w-20 h-14 object-contain" />
                        ) : (
                            <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl shadow-md flex items-center justify-center">
                                <div className="w-4 h-4 bg-white rounded-full"></div>
                            </div>
                        )}
                        <div className="text-center min-w-0 w-full">
                            <h1 className="text-xs font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 truncate leading-tight">
                                {companyInfo?.legal_name || companyInfo?.company_name || 'ZRN360°'}
                            </h1>
                            {companyInfo?.cuit && (
                                <p className="text-[9px] text-gray-400 font-mono">CUIT {companyInfo.cuit}</p>
                            )}
                        </div>
                    </div>
                </div>

                <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto scrollbar-thin">
                    {/* ═══ DYNAMIC MODULE SIDEBAR ═══ */}
                    {registry.getEnabledModules().map(mod => {
                        if (!mod.sidebarSection) return null;
                        const section = mod.sidebarSection;
                        const SectionIcon = ICON_MAP[section.icon] || LayoutDashboard;

                        // "Principal" gets a flat header (always visible, no collapse)
                        if (mod.slug === "core") {
                            return (
                                <div key={mod.slug} className="mb-2" onClick={closeMobile}>
                                    <div className="px-3 mb-1 text-[11px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                                        <SectionIcon size={12} className="text-gray-300" />
                                        {section.title}
                                    </div>
                                    {section.items.map(item => {
                                        const ItemIcon = ICON_MAP[item.icon] || LayoutDashboard;
                                        const path = item.permissionPath || item.to;
                                        return canAccess(path) ? (
                                            <SidebarItem key={item.to} to={item.to} icon={<ItemIcon size={18} />} label={item.label} />
                                        ) : null;
                                    })}
                                </div>
                            );
                        }

                        // All other modules get collapsible sections
                        return (
                            <SidebarSection
                                key={mod.slug}
                                title={section.title}
                                icon={<SectionIcon size={12} />}
                                defaultOpen={section.defaultOpen}
                            >
                                <div onClick={closeMobile}>
                                    {section.items.map(item => {
                                        const ItemIcon = ICON_MAP[item.icon] || LayoutDashboard;
                                        const path = item.permissionPath || item.to;
                                        return canAccess(path) ? (
                                            <SidebarItem key={item.to} to={item.to} icon={<ItemIcon size={18} />} label={item.label} />
                                        ) : null;
                                    })}
                                </div>
                            </SidebarSection>
                        );
                    })}
                </nav>

                {/* User footer */}
                <div className="p-3 border-t border-gray-100 bg-gray-50/50">
                    <div className="flex items-center gap-3 px-2">
                        <div
                            className="w-9 h-9 rounded-full flex-shrink-0 overflow-hidden shadow-sm cursor-pointer hover:ring-2 hover:ring-indigo-400 transition-all"
                            onClick={() => navigate('/profile')}
                            title="Mi Perfil"
                        >
                            {user?.avatar_url ? (
                                <img src={`${(import.meta as any).env?.VITE_API_URL?.replace('/api/v1', '') || ''}${user.avatar_url}`} alt="" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xs">
                                    {(user?.full_name || user?.email || 'U').charAt(0).toUpperCase()}
                                </div>
                            )}
                        </div>
                        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => navigate('/profile')}>
                            <p className="text-xs font-semibold text-gray-800 truncate hover:text-indigo-600 transition-colors">{user?.full_name || 'Usuario'}</p>
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
