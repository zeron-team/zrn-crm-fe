/**
 * ZeRoN 360° — Frontend Module Registry
 * =======================================
 * Defines all modules, their routes, and sidebar items.
 * The Layout and App.tsx consume this registry to dynamically
 * render navigation and routes.
 */

import { lazy, ComponentType } from "react";

// ─── Types ───────────────────────────────────────────────
export interface RouteConfig {
    path: string;
    component: ComponentType<any>;
}

export interface SidebarItem {
    to: string;
    label: string;
    icon: string; // Lucide icon name
    permissionPath?: string; // path used for canAccess check
}

export interface ModuleManifest {
    name: string;
    slug: string;
    version: string;
    description: string;
    icon: string;
    category: "core" | "business" | "addon";
    dependencies: string[];
    sidebarSection?: {
        title: string;
        icon: string;
        defaultOpen: boolean;
        items: SidebarItem[];
    };
    routes: RouteConfig[];
    enabled: boolean;
}

// ─── Lazy Page Imports ───────────────────────────────────
const Home = lazy(() => import("../pages/Home"));
const Dashboard = lazy(() => import("../pages/Dashboard"));
const DashboardHub = lazy(() => import("../pages/DashboardHub"));
const Notes = lazy(() => import("../pages/Notes"));
const Calendar = lazy(() => import("../pages/Calendar"));
const Leads = lazy(() => import("../pages/Leads"));
const LeadProfile = lazy(() => import("../pages/LeadProfile"));
const Quotes = lazy(() => import("../pages/Quotes"));
const Clients = lazy(() => import("../pages/Clients"));
const ClientProfile = lazy(() => import("../pages/ClientProfile"));
const Contacts = lazy(() => import("../pages/Contacts"));
const Support = lazy(() => import("../pages/Support"));
const Sellers = lazy(() => import("../pages/Sellers"));
const Projects = lazy(() => import("../pages/Projects"));
const ProjectBoard = lazy(() => import("../pages/ProjectBoard"));
const Wiki = lazy(() => import("../pages/Wiki"));
const Employees = lazy(() => import("../pages/Employees"));
const TimeTracking = lazy(() => import("../pages/TimeTracking"));
const Payroll = lazy(() => import("../pages/Payroll"));
const EmployeeNovelties = lazy(() => import("../pages/EmployeeNovelties"));
const Email = lazy(() => import("../pages/Email"));
const WhatsApp = lazy(() => import("../pages/WhatsApp"));
const Billing = lazy(() => import("../pages/Billing"));
const Finances = lazy(() => import("../pages/Finances"));
const ServicePurchases = lazy(() => import("../pages/ServicePurchases"));
const DeliveryNotes = lazy(() => import("../pages/DeliveryNotes"));
const PaymentOrders = lazy(() => import("../pages/PaymentOrders"));
const PurchaseOrders = lazy(() => import("../pages/PurchaseOrders"));
const Inventory = lazy(() => import("../pages/Inventory"));
const Warehouses = lazy(() => import("../pages/Warehouses"));
const ExchangeRates = lazy(() => import("../pages/ExchangeRates"));
const Providers = lazy(() => import("../pages/Providers"));
const Products = lazy(() => import("../pages/Products"));
const Categories = lazy(() => import("../pages/Categories"));
const Settings = lazy(() => import("../pages/Settings"));
const Users = lazy(() => import("../pages/Users"));
const RolePermissions = lazy(() => import("../pages/RolePermissions"));


// ═══════════════════════════════════════════════════════════
// MODULE DEFINITIONS
// ═══════════════════════════════════════════════════════════

const coreModule: ModuleManifest = {
    name: "Principal",
    slug: "core",
    version: "1.0.0",
    description: "Módulo base: inicio, dashboard, notas, calendario",
    icon: "LayoutDashboard",
    category: "core",
    dependencies: [],
    enabled: true,
    sidebarSection: {
        title: "Principal",
        icon: "LayoutDashboard",
        defaultOpen: true,
        items: [
            { to: "/", label: "Inicio", icon: "Home" },
            { to: "/dashboard", label: "Panel de Control", icon: "LayoutDashboard" },
            { to: "/dashboards", label: "Dashboards", icon: "BarChart3" },
            { to: "/notes", label: "Notas", icon: "StickyNote" },
        ],
    },
    routes: [
        { path: "", component: Home },
        { path: "dashboard", component: Dashboard },
        { path: "dashboards", component: DashboardHub },
        { path: "notes", component: Notes },
        { path: "calendar", component: Calendar },
    ],
};

const crmModule: ModuleManifest = {
    name: "CRM",
    slug: "crm",
    version: "1.0.0",
    description: "Gestión comercial: leads, cuentas, contactos, presupuestos",
    icon: "Briefcase",
    category: "business",
    dependencies: ["core"],
    enabled: true,
    sidebarSection: {
        title: "CRM",
        icon: "Briefcase",
        defaultOpen: true,
        items: [
            { to: "/leads", label: "Leads", icon: "UserPlus" },
            { to: "/quotes", label: "Presupuestos", icon: "FileText" },
            { to: "/clients", label: "Cuentas", icon: "Building2" },
            { to: "/providers", label: "Proveedores", icon: "Truck" },
            { to: "/contacts", label: "Contactos", icon: "Contact" },
            { to: "/calendar", label: "Actividades", icon: "Calendar" },
            { to: "/support", label: "Soporte", icon: "Ticket" },
            { to: "/sellers", label: "Vendedores", icon: "BarChart3" },
        ],
    },
    routes: [
        { path: "leads", component: Leads },
        { path: "leads/:id", component: LeadProfile },
        { path: "quotes", component: Quotes },
        { path: "clients", component: Clients },
        { path: "clients/:id", component: ClientProfile },
        { path: "contacts", component: Contacts },
        { path: "support", component: Support },
        { path: "sellers", component: Sellers },
    ],
};

const projectsModule: ModuleManifest = {
    name: "Proyectos",
    slug: "projects",
    version: "1.0.0",
    description: "Gestión de proyectos con tablero Kanban y Wiki",
    icon: "FolderKanban",
    category: "business",
    dependencies: ["core"],
    enabled: true,
    sidebarSection: {
        title: "Proyectos",
        icon: "FolderKanban",
        defaultOpen: true,
        items: [
            { to: "/projects", label: "Mis Proyectos", icon: "FolderKanban" },
            { to: "/wiki", label: "Wiki", icon: "BookOpen" },
        ],
    },
    routes: [
        { path: "projects", component: Projects },
        { path: "projects/:id", component: ProjectBoard },
        { path: "wiki", component: Wiki },
    ],
};

const hrModule: ModuleManifest = {
    name: "RRHH",
    slug: "hr",
    version: "1.0.0",
    description: "Recursos Humanos: empleados, fichadas, liquidación",
    icon: "UserCheck",
    category: "business",
    dependencies: ["core"],
    enabled: true,
    sidebarSection: {
        title: "RRHH",
        icon: "UserCheck",
        defaultOpen: true,
        items: [
            { to: "/employees", label: "Empleados", icon: "Users" },
            { to: "/time-tracking", label: "Fichadas", icon: "Clock" },
            { to: "/payroll", label: "Liquidación", icon: "Banknote" },
            { to: "/employee-novelties", label: "Novedades", icon: "CalendarDays" },
        ],
    },
    routes: [
        { path: "employees", component: Employees },
        { path: "time-tracking", component: TimeTracking },
        { path: "payroll", component: Payroll },
        { path: "employee-novelties", component: EmployeeNovelties },
    ],
};

const communicationsModule: ModuleManifest = {
    name: "Comunicaciones",
    slug: "communications",
    version: "1.0.0",
    description: "Email corporativo, WhatsApp integrado",
    icon: "Mail",
    category: "business",
    dependencies: ["core"],
    enabled: true,
    sidebarSection: {
        title: "Comunicaciones",
        icon: "Mail",
        defaultOpen: true,
        items: [
            { to: "/email", label: "Email", icon: "Mail" },
            { to: "/whatsapp", label: "WhatsApp", icon: "MessageCircle" },
        ],
    },
    routes: [
        { path: "email", component: Email },
        { path: "whatsapp", component: WhatsApp },
    ],
};

const erpModule: ModuleManifest = {
    name: "ERP",
    slug: "erp",
    version: "1.0.0",
    description: "Facturación, ARCA/AFIP, remitos, inventario, depósitos",
    icon: "Receipt",
    category: "business",
    dependencies: ["core", "crm"],
    enabled: true,
    sidebarSection: {
        title: "ERP",
        icon: "Receipt",
        defaultOpen: true,
        items: [
            { to: "/billing", label: "Facturación", icon: "FileText" },
            { to: "/service-purchases", label: "Compras de Servicios", icon: "CreditCard" },
            { to: "/delivery-notes", label: "Remitos", icon: "Truck" },
            { to: "/payment-orders", label: "Orden de Pago", icon: "CreditCard" },
            { to: "/purchase-orders", label: "Orden de Compra", icon: "ShoppingCart" },
            { to: "/inventory", label: "Inventario", icon: "Warehouse" },
            { to: "/warehouses", label: "Depósitos", icon: "Building" },
            { to: "/exchange-rates", label: "Tipo de Cambio", icon: "LineChart" },
        ],
    },
    routes: [
        { path: "billing", component: Billing },
        { path: "finances", component: Finances },
        { path: "service-purchases", component: ServicePurchases },
        { path: "delivery-notes", component: DeliveryNotes },
        { path: "payment-orders", component: PaymentOrders },
        { path: "purchase-orders", component: PurchaseOrders },
        { path: "inventory", component: Inventory },
        { path: "warehouses", component: Warehouses },
        { path: "exchange-rates", component: ExchangeRates },
        { path: "providers", component: Providers },
    ],
};

const catalogModule: ModuleManifest = {
    name: "Catálogo",
    slug: "catalog",
    version: "1.0.0",
    description: "Productos, servicios y categorías",
    icon: "Package",
    category: "business",
    dependencies: ["core"],
    enabled: true,
    sidebarSection: {
        title: "Catálogo",
        icon: "BookOpen",
        defaultOpen: false,
        items: [
            { to: "/products", label: "Productos", icon: "Package" },
            { to: "/categories", label: "Categorías", icon: "FolderTree" },
        ],
    },
    routes: [
        { path: "products", component: Products },
        { path: "categories", component: Categories },
    ],
};

const systemModule: ModuleManifest = {
    name: "Sistema",
    slug: "system",
    version: "1.0.0",
    description: "Configuración, seguridad, auditoría, roles",
    icon: "Cog",
    category: "core",
    dependencies: ["core"],
    enabled: true,
    sidebarSection: {
        title: "Sistema",
        icon: "Cog",
        defaultOpen: false,
        items: [
            { to: "/users", label: "Usuarios", icon: "Users" },
            { to: "/role-permissions", label: "Roles y Permisos", icon: "Shield" },
            { to: "/settings", label: "Ajustes", icon: "Settings" },
        ],
    },
    routes: [
        { path: "users", component: Users },
        { path: "role-permissions", component: RolePermissions },
        { path: "settings", component: Settings },
    ],
};


// ═══════════════════════════════════════════════════════════
// REGISTRY
// ═══════════════════════════════════════════════════════════

class ModuleRegistry {
    private modules: Map<string, ModuleManifest> = new Map();

    register(manifest: ModuleManifest) {
        this.modules.set(manifest.slug, manifest);
    }

    getModule(slug: string): ModuleManifest | undefined {
        return this.modules.get(slug);
    }

    isEnabled(slug: string): boolean {
        return this.modules.get(slug)?.enabled ?? false;
    }

    getAllModules(): ModuleManifest[] {
        return Array.from(this.modules.values());
    }

    getEnabledModules(): ModuleManifest[] {
        return this.getAllModules().filter(m => m.enabled);
    }

    getAllRoutes(): RouteConfig[] {
        return this.getEnabledModules().flatMap(m => m.routes);
    }

    getSidebarSections(): ModuleManifest["sidebarSection"][] {
        return this.getEnabledModules()
            .filter(m => m.sidebarSection)
            .map(m => m.sidebarSection!);
    }
}

// Create and populate registry
const registry = new ModuleRegistry();
registry.register(coreModule);
registry.register(crmModule);
registry.register(projectsModule);
registry.register(hrModule);
registry.register(communicationsModule);
registry.register(erpModule);
registry.register(catalogModule);
registry.register(systemModule);

export default registry;
export { ModuleRegistry };
export type { ModuleManifest as ModuleManifestType };
