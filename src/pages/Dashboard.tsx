import { useState, useEffect, useMemo, useCallback } from "react";
import api from "../api/client";
import { Users, Building2, Package, FileText, TrendingUp, AlertCircle, Calendar as CalendarIcon, UserPlus, Settings2, BarChart3, GripVertical, ShieldCheck, Contact, FolderTree, DollarSign } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import DashboardCustomizer from "../components/DashboardCustomizer";
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragOverlay } from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { SortableContext, useSortable, rectSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface RecentInvoice {
    id: number;
    invoice_number: string;
    type: string;
    issue_date: string;
    amount: number;
    status_id?: number;
    currency?: string;
}

interface UpcomingEvent {
    id: number;
    title: string;
    start_date: string;
    end_date: string;
}

interface InvoiceStatus {
    id: number;
    name: string;
    color: string;
}

interface Lead {
    id: number;
    company_name: string;
    contact_name: string;
    status: string;
    created_at: string;
}

interface Quote {
    id: number;
    quote_number: string;
    status: string;
    total_amount: number;
    currency: string;
    issue_date: string;
}

// KPI widget definitions
const KPI_DEFINITIONS: Record<string, { icon: any; color: string; bgColor: string; statKey: string; labelKey: string; format?: string }> = {
    kpi_clients: { icon: Building2, color: "text-blue-600", bgColor: "bg-blue-50", statKey: "clientsCount", labelKey: "dashboard.widgets.kpi_clients" },
    kpi_providers: { icon: Users, color: "text-purple-600", bgColor: "bg-purple-50", statKey: "providersCount", labelKey: "dashboard.widgets.kpi_providers" },
    kpi_products: { icon: Package, color: "text-orange-600", bgColor: "bg-orange-50", statKey: "productsCount", labelKey: "dashboard.widgets.kpi_products" },
    kpi_users: { icon: TrendingUp, color: "text-green-600", bgColor: "bg-green-50", statKey: "usersCount", labelKey: "dashboard.widgets.kpi_users" },
    kpi_invoices_issued: { icon: FileText, color: "text-teal-600", bgColor: "bg-teal-50", statKey: "issuedInvoicesCount", labelKey: "dashboard.widgets.kpi_invoices_issued" },
    kpi_invoices_received: { icon: FileText, color: "text-rose-600", bgColor: "bg-rose-50", statKey: "receivedInvoicesCount", labelKey: "dashboard.widgets.kpi_invoices_received" },
    kpi_leads: { icon: UserPlus, color: "text-indigo-600", bgColor: "bg-indigo-50", statKey: "leadsCount", labelKey: "dashboard.widgets.kpi_leads" },
    kpi_quotes: { icon: FileText, color: "text-amber-600", bgColor: "bg-amber-50", statKey: "quotesCount", labelKey: "dashboard.widgets.kpi_quotes" },
    kpi_active_services: { icon: ShieldCheck, color: "text-emerald-600", bgColor: "bg-emerald-50", statKey: "activeServicesCount", labelKey: "dashboard.widgets.kpi_active_services" },
    kpi_contacts: { icon: Contact, color: "text-cyan-600", bgColor: "bg-cyan-50", statKey: "contactsCount", labelKey: "dashboard.widgets.kpi_contacts" },
    kpi_categories: { icon: FolderTree, color: "text-pink-600", bgColor: "bg-pink-50", statKey: "categoriesCount", labelKey: "dashboard.widgets.kpi_categories" },
    kpi_monthly_cost: { icon: DollarSign, color: "text-red-600", bgColor: "bg-red-50", statKey: "monthlyCost", labelKey: "dashboard.widgets.kpi_monthly_cost", format: "currency" },
};

const DEFAULT_WIDGETS = ["kpi_clients", "kpi_providers", "kpi_products", "kpi_users", "table_recent_invoices", "table_upcoming_events"];

export default function Dashboard() {
    const { t } = useTranslation();
    const { user } = useAuth();
    const [stats, setStats] = useState<Record<string, number>>({});
    const [recentInvoices, setRecentInvoices] = useState<RecentInvoice[]>([]);
    const [allInvoices, setAllInvoices] = useState<RecentInvoice[]>([]);
    const [upcomingEvents, setUpcomingEvents] = useState<UpcomingEvent[]>([]);
    const [invoiceStatuses, setInvoiceStatuses] = useState<InvoiceStatus[]>([]);
    const [leads, setLeads] = useState<Lead[]>([]);
    const [quotes, setQuotes] = useState<Quote[]>([]);
    const [providerServices, setProviderServices] = useState<any[]>([]);
    const [servicePayments, setServicePayments] = useState<any[]>([]);
    const [providers, setProviders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeWidgets, setActiveWidgets] = useState<string[]>(DEFAULT_WIDGETS);
    const [showCustomizer, setShowCustomizer] = useState(false);

    useEffect(() => {
        fetchDashboardData();
        if (user?.id) fetchWidgetConfig();
    }, [user?.id]);

    const fetchWidgetConfig = async () => {
        try {
            const res = await api.get(`/dashboard-config/${user!.id}`);
            if (res.data?.widgets?.length > 0) {
                setActiveWidgets(res.data.widgets);
            }
        } catch {
            // Use defaults
        }
    };

    const fetchDashboardData = async () => {
        try {
            // Use allSettled so one failing endpoint doesn't blank the whole dashboard
            const safeGet = async (url: string) => {
                try { return (await api.get(url)).data; } catch { return []; }
            };

            const [clients, providersData, products, users, invoices, events, statuses, leads, quotes, contacts, categories, provServices, svcPayments] = await Promise.all([
                safeGet("/clients/"),
                safeGet("/providers/"),
                safeGet("/products/"),
                safeGet("/users/"),
                safeGet("/invoices/"),
                safeGet("/calendar/"),
                safeGet("/invoices/statuses"),
                safeGet("/leads/"),
                safeGet("/quotes/"),
                safeGet("/contacts/"),
                safeGet("/categories/"),
                safeGet("/provider-services/"),
                safeGet("/service-payments/"),
            ]);

            const activeServices = Array.isArray(provServices) ? provServices.filter((s: any) => s.status === 'Active') : [];
            const monthlyCost = activeServices.reduce((sum: number, s: any) => {
                if (s.billing_cycle === 'Monthly' || !s.billing_cycle) return sum + Number(s.cost_price || 0);
                if (s.billing_cycle === 'Yearly') return sum + Number(s.cost_price || 0) / 12;
                if (s.billing_cycle === 'Bimonthly') return sum + Number(s.cost_price || 0) / 2;
                return sum + Number(s.cost_price || 0);
            }, 0);

            setStats({
                clientsCount: clients.length,
                providersCount: providersData.length,
                productsCount: products.length,
                usersCount: users.length,
                issuedInvoicesCount: invoices.filter((i: any) => i.type === "issued").length,
                receivedInvoicesCount: invoices.filter((i: any) => i.type === "received").length,
                leadsCount: leads.length,
                quotesCount: quotes.length,
                activeServicesCount: activeServices.length,
                contactsCount: Array.isArray(contacts) ? contacts.length : 0,
                categoriesCount: Array.isArray(categories) ? categories.length : 0,
                monthlyCost: Math.round(monthlyCost),
            });

            setAllInvoices(invoices);
            setProviders(providersData);
            setProviderServices(provServices);
            setServicePayments(Array.isArray(svcPayments) ? svcPayments : []);

            const recentIssues = invoices
                .filter((i: RecentInvoice) => i.type === "issued")
                .sort((a: RecentInvoice, b: RecentInvoice) => new Date(b.issue_date).getTime() - new Date(a.issue_date).getTime())
                .slice(0, 5);

            const upcoming = events
                .filter((e: UpcomingEvent) => new Date(e.start_date).getTime() >= new Date().getTime())
                .sort((a: UpcomingEvent, b: UpcomingEvent) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())
                .slice(0, 5);

            setRecentInvoices(recentIssues);
            setUpcomingEvents(upcoming);
            setInvoiceStatuses(statuses);
            setLeads(leads.slice(0, 5));
            setQuotes(quotes.slice(0, 5));
        } catch (error) {
            console.error("Failed to load dashboard data", error);
        } finally {
            setLoading(false);
        }
    };

    // Chart data: Income vs Expenses (last 6 months) — includes service costs as expenses
    const chartData = useMemo(() => {
        const now = new Date();
        const months: { label: string; month: number; year: number; Income: number; Expense: number }[] = [];
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            months.push({
                label: d.toLocaleDateString(undefined, { month: 'short', year: '2-digit' }),
                month: d.getMonth(),
                year: d.getFullYear(),
                Income: 0,
                Expense: 0,
            });
        }
        // Add invoice amounts
        allInvoices.forEach((inv) => {
            const d = new Date(inv.issue_date);
            const m = months.find((mo) => mo.month === d.getMonth() && mo.year === d.getFullYear());
            if (m) {
                const amount = Number(inv.amount) || 0;
                const isNC = inv.invoice_number.startsWith('NC-');
                if (inv.type === 'issued') m.Income += isNC ? -amount : amount;
                else if (inv.type === 'received') m.Expense += amount;
            }
        });
        // Add active service costs as expenses distributed by billing cycle
        const activeServices = providerServices.filter((s: any) => s.status === 'Active');
        activeServices.forEach((svc: any) => {
            const cost = Number(svc.cost_price) || 0;
            if (cost === 0) return;
            const cycle = svc.billing_cycle || 'Monthly';
            const expDate = svc.expiration_date ? new Date(svc.expiration_date) : null;
            months.forEach((mo) => {
                if (expDate) {
                    const monthsDiff = (mo.year - expDate.getUTCFullYear()) * 12 + (mo.month - expDate.getUTCMonth());
                    if (monthsDiff < 0) return;
                    if (cycle === 'One-time' && monthsDiff !== 0) return;
                    if (cycle === 'Bimonthly' && monthsDiff % 2 !== 0) return;
                    if (cycle === 'Yearly' && monthsDiff % 12 !== 0) return;
                }
                if (cycle === 'Monthly' || cycle === 'One-time' || cycle === 'Bimonthly' || cycle === 'Yearly') {
                    // Convert to ARS rough estimate (use localStorage rate)
                    const usdRate = parseFloat(localStorage.getItem('usdToArs') || '1000');
                    const eurRate = parseFloat(localStorage.getItem('eurToArs') || '1100');
                    let arsAmount = cost;
                    if (svc.currency === 'USD') arsAmount = cost * usdRate;
                    else if (svc.currency === 'EUR') arsAmount = cost * eurRate;
                    mo.Expense += arsAmount;
                }
            });
        });
        return months;
    }, [allInvoices, providerServices]);

    // Cashflow summary — includes service costs as accounts payable
    const cashflowSummary = useMemo(() => {
        let totalIncome = 0;
        let totalExpense = 0;
        allInvoices.forEach(i => {
            const amt = Number(i.amount) || 0;
            if (i.type === 'issued') {
                const isNC = i.invoice_number.startsWith('NC-');
                totalIncome += isNC ? -amt : amt;
            } else if (i.type === 'received') {
                totalExpense += amt;
            }
        });
        // Add monthly service costs (annualized for YTD)
        const usdRate = parseFloat(localStorage.getItem('usdToArs') || '1000');
        const eurRate = parseFloat(localStorage.getItem('eurToArs') || '1100');
        const now = new Date();
        const monthsElapsed = now.getMonth() + 1;
        providerServices.filter((s: any) => s.status === 'Active').forEach((svc: any) => {
            const cost = Number(svc.cost_price) || 0;
            let arsCost = cost;
            if (svc.currency === 'USD') arsCost = cost * usdRate;
            else if (svc.currency === 'EUR') arsCost = cost * eurRate;
            const cycle = svc.billing_cycle || 'Monthly';
            if (cycle === 'Monthly') totalExpense += arsCost * monthsElapsed;
            else if (cycle === 'Yearly') totalExpense += arsCost * (monthsElapsed / 12);
            else if (cycle === 'Bimonthly') totalExpense += arsCost * Math.ceil(monthsElapsed / 2);
            else totalExpense += arsCost;
        });
        const margin = totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome * 100) : 0;
        return { totalIncome, totalExpense, margin, net: totalIncome - totalExpense };
    }, [allInvoices, providerServices]);

    const handleWidgetsSave = (widgets: string[]) => {
        setActiveWidgets(widgets);
        setShowCustomizer(false);
    };

    // Drag & Drop
    const [dragActiveId, setDragActiveId] = useState<string | null>(null);
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
    );

    const handleDragStart = (event: DragStartEvent) => {
        setDragActiveId(event.active.id as string);
    };

    const handleDragEnd = useCallback(async (event: DragEndEvent) => {
        setDragActiveId(null);
        const { active, over } = event;
        if (!over || active.id === over.id) return;
        const oldIndex = activeWidgets.indexOf(active.id as string);
        const newIndex = activeWidgets.indexOf(over.id as string);
        if (oldIndex === -1 || newIndex === -1) return;
        const newOrder = arrayMove(activeWidgets, oldIndex, newIndex);
        setActiveWidgets(newOrder);
        // Persist to backend
        try {
            if (user?.id) await api.put(`/dashboard-config/${user.id}`, { widgets: newOrder });
        } catch (e) { console.error('Failed to save widget order', e); }
    }, [activeWidgets, user?.id]);

    const activeKpis = activeWidgets.filter((w) => w.startsWith("kpi_"));
    const activeTables = activeWidgets.filter((w) => w.startsWith("table_"));
    const activeCharts = activeWidgets.filter((w) => w.startsWith("chart_"));

    if (loading) {
        return (
            <div className="flex justify-center items-center h-full">
                <div className="text-gray-500">{t('dashboard.loading')}</div>
            </div>
        );
    }

    const renderKpiCard = (widgetId: string) => {
        const def = KPI_DEFINITIONS[widgetId];
        if (!def) return null;
        const IconComponent = def.icon;
        const value = stats[def.statKey] ?? 0;
        const displayValue = def.format === 'currency'
            ? `AR$ ${value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
            : value.toLocaleString();
        return (
            <div key={widgetId} className="bg-white rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-100/80 p-5 md:p-6 flex items-start gap-4 relative overflow-hidden group">
                <div className={`absolute inset-0 bg-gradient-to-br ${def.bgColor} opacity-[0.03] group-hover:opacity-[0.06] transition-opacity`}></div>
                <div className={`p-3 rounded-xl bg-gradient-to-br ${def.bgColor} ${def.color} shrink-0 relative z-10 shadow-sm`}>
                    <IconComponent size={22} strokeWidth={2} />
                </div>
                <div className="relative z-10 min-w-0">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">{t(def.labelKey)}</p>
                    <p className={`${def.format === 'currency' ? 'text-xl md:text-2xl' : 'text-2xl md:text-3xl'} font-black text-gray-900 leading-none`}>{displayValue}</p>
                </div>
            </div>
        );
    };

    const renderTableWidget = (widgetId: string) => {
        if (widgetId === "table_recent_invoices") {
            return (
                <div key={widgetId} className="bg-white rounded-2xl shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-gray-100 overflow-hidden flex flex-col">
                    <div className="p-4 md:p-6 border-b border-gray-50 flex flex-col sm:flex-row sm:justify-between sm:items-center bg-gray-50/30 gap-3 sm:gap-0">
                        <div className="flex items-center space-x-3">
                            <div className="p-2 bg-blue-50 rounded-lg text-blue-600"><TrendingUp size={18} strokeWidth={2.5} /></div>
                            <h3 className="font-bold text-gray-900 tracking-tight">{t('dashboard.invoices.title')}</h3>
                        </div>
                        <Link to="/billing" className="text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors">{t('dashboard.invoices.viewAll')}</Link>
                    </div>
                    <div className="p-0 flex-1">
                        {recentInvoices.length === 0 ? (
                            <div className="p-8 text-center text-sm text-gray-500">{t('dashboard.invoices.empty')}</div>
                        ) : (
                            <ul className="divide-y divide-gray-50">
                                {recentInvoices.map((inv) => {
                                    const statusObj = invoiceStatuses.find(s => s.id === inv.status_id);
                                    return (
                                        <li key={inv.id} className="p-4 hover:bg-gray-50/50 transition-colors flex justify-between items-center">
                                            <div className="flex items-center space-x-3">
                                                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500"><FileText size={16} /></div>
                                                <div>
                                                    <div className="flex items-center space-x-2">
                                                        <p className="text-sm font-medium text-gray-900">{inv.invoice_number}</p>
                                                        {statusObj && (
                                                            <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: `${statusObj.color}20`, color: statusObj.color }}>{statusObj.name}</span>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-gray-500">{t('dashboard.invoices.issuedPrefix')}{new Date(inv.issue_date).toLocaleDateString()}</p>
                                                </div>
                                            </div>
                                            <p className="text-sm font-bold text-gray-900">{inv.currency === 'USD' ? 'u$d' : inv.currency === 'EUR' ? '€' : 'AR$'} {Number(inv.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </div>
                </div>
            );
        }

        if (widgetId === "table_upcoming_events") {
            return (
                <div key={widgetId} className="bg-white rounded-2xl shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-gray-100 overflow-hidden flex flex-col">
                    <div className="p-4 md:p-6 border-b border-gray-50 flex flex-col sm:flex-row sm:justify-between sm:items-center bg-gray-50/30 gap-3 sm:gap-0">
                        <div className="flex items-center space-x-3">
                            <div className="p-2 bg-orange-50 rounded-lg text-orange-600"><CalendarIcon size={18} strokeWidth={2.5} /></div>
                            <h3 className="font-bold text-gray-900 tracking-tight">{t('dashboard.activities.title')}</h3>
                        </div>
                        <Link to="/calendar" className="text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors">{t('dashboard.activities.viewCalendar')}</Link>
                    </div>
                    <div className="p-0 flex-1">
                        {upcomingEvents.length === 0 ? (
                            <div className="p-8 text-center text-sm text-gray-500">{t('dashboard.activities.empty')}</div>
                        ) : (
                            <ul className="divide-y divide-gray-50">
                                {upcomingEvents.map((evt) => (
                                    <li key={evt.id} className="p-4 hover:bg-gray-50/50 transition-colors flex justify-between items-center">
                                        <div className="flex items-center space-x-3">
                                            <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center text-orange-500"><AlertCircle size={16} /></div>
                                            <div>
                                                <p className="text-sm font-medium text-gray-900">{evt.title}</p>
                                                <p className="text-xs text-gray-500">{t('dashboard.activities.duePrefix')}{new Date(evt.start_date).toLocaleString()}</p>
                                            </div>
                                        </div>
                                        <Link to="/calendar" className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition-colors">{t('dashboard.activities.manage')}</Link>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            );
        }

        if (widgetId === "table_recent_leads") {
            return (
                <div key={widgetId} className="bg-white rounded-2xl shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-gray-100 overflow-hidden flex flex-col">
                    <div className="p-4 md:p-6 border-b border-gray-50 flex flex-col sm:flex-row sm:justify-between sm:items-center bg-gray-50/30 gap-3 sm:gap-0">
                        <div className="flex items-center space-x-3">
                            <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600"><UserPlus size={18} strokeWidth={2.5} /></div>
                            <h3 className="font-bold text-gray-900 tracking-tight">{t('dashboard.widgets.table_recent_leads')}</h3>
                        </div>
                        <Link to="/leads" className="text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors">{t('dashboard.invoices.viewAll')}</Link>
                    </div>
                    <div className="p-0 flex-1">
                        {leads.length === 0 ? (
                            <div className="p-8 text-center text-sm text-gray-500">{t('dashboard.widgets.table_recent_leads')}: 0</div>
                        ) : (
                            <ul className="divide-y divide-gray-50">
                                {leads.map((lead) => (
                                    <li key={lead.id} className="p-4 hover:bg-gray-50/50 transition-colors flex justify-between items-center">
                                        <div className="flex items-center space-x-3">
                                            <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-500"><UserPlus size={16} /></div>
                                            <div>
                                                <p className="text-sm font-medium text-gray-900">{lead.company_name}</p>
                                                <p className="text-xs text-gray-500">{lead.contact_name}</p>
                                            </div>
                                        </div>
                                        <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600">{lead.status}</span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            );
        }

        if (widgetId === "table_recent_quotes") {
            return (
                <div key={widgetId} className="bg-white rounded-2xl shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-gray-100 overflow-hidden flex flex-col">
                    <div className="p-4 md:p-6 border-b border-gray-50 flex flex-col sm:flex-row sm:justify-between sm:items-center bg-gray-50/30 gap-3 sm:gap-0">
                        <div className="flex items-center space-x-3">
                            <div className="p-2 bg-amber-50 rounded-lg text-amber-600"><FileText size={18} strokeWidth={2.5} /></div>
                            <h3 className="font-bold text-gray-900 tracking-tight">{t('dashboard.widgets.table_recent_quotes')}</h3>
                        </div>
                        <Link to="/quotes" className="text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors">{t('dashboard.invoices.viewAll')}</Link>
                    </div>
                    <div className="p-0 flex-1">
                        {quotes.length === 0 ? (
                            <div className="p-8 text-center text-sm text-gray-500">{t('dashboard.widgets.table_recent_quotes')}: 0</div>
                        ) : (
                            <ul className="divide-y divide-gray-50">
                                {quotes.map((q) => (
                                    <li key={q.id} className="p-4 hover:bg-gray-50/50 transition-colors flex justify-between items-center">
                                        <div className="flex items-center space-x-3">
                                            <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center text-amber-500"><FileText size={16} /></div>
                                            <div>
                                                <p className="text-sm font-medium text-gray-900">{q.quote_number}</p>
                                                <p className="text-xs text-gray-500">{new Date(q.issue_date).toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-bold text-gray-900">{q.currency} {Number(q.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                                            <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-600">{q.status}</span>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            );
        }

        if (widgetId === "table_service_payments") {
            const recentPayments = [...servicePayments]
                .sort((a: any, b: any) => new Date(b.payment_date || b.created_at).getTime() - new Date(a.payment_date || a.created_at).getTime())
                .slice(0, 5);
            return (
                <div key={widgetId} className="bg-white rounded-2xl shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-gray-100 overflow-hidden flex flex-col">
                    <div className="p-4 md:p-6 border-b border-gray-50 flex justify-between items-center bg-gray-50/30">
                        <div className="flex items-center space-x-3">
                            <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600"><DollarSign size={18} strokeWidth={2.5} /></div>
                            <h3 className="font-bold text-gray-900 tracking-tight">{t('dashboard.widgets.table_service_payments')}</h3>
                        </div>
                    </div>
                    <div className="flex-1 p-4 md:p-6">
                        {recentPayments.length === 0 ? (
                            <p className="text-gray-400 text-sm text-center py-4">{t('dashboard.noData')}</p>
                        ) : (
                            <div className="space-y-3">
                                {recentPayments.map((p: any) => {
                                    const svc = providerServices.find((s: any) => s.id === p.provider_service_id);
                                    return (
                                        <div key={p.id} className="flex justify-between items-center p-3 bg-gray-50/70 rounded-xl">
                                            <div>
                                                <p className="text-sm font-semibold text-gray-900">{svc?.name || `#${p.provider_service_id}`}</p>
                                                <p className="text-xs text-gray-500">{p.period_month}/{p.period_year}</p>
                                            </div>
                                            <span className="text-sm font-bold text-emerald-600">AR$ {Number(p.amount).toLocaleString()}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            );
        }

        if (widgetId === "table_top_providers") {
            const providerCosts = providers.map((prov: any) => {
                const services = providerServices.filter((s: any) => s.provider_id === prov.id && s.status === 'Active');
                const totalCost = services.reduce((sum: number, s: any) => sum + Number(s.cost_price || 0), 0);
                return { ...prov, totalCost, serviceCount: services.length };
            }).filter((p: any) => p.totalCost > 0).sort((a: any, b: any) => b.totalCost - a.totalCost).slice(0, 5);

            return (
                <div key={widgetId} className="bg-white rounded-2xl shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-gray-100 overflow-hidden flex flex-col">
                    <div className="p-4 md:p-6 border-b border-gray-50 flex justify-between items-center bg-gray-50/30">
                        <div className="flex items-center space-x-3">
                            <div className="p-2 bg-purple-50 rounded-lg text-purple-600"><Users size={18} strokeWidth={2.5} /></div>
                            <h3 className="font-bold text-gray-900 tracking-tight">{t('dashboard.widgets.table_top_providers')}</h3>
                        </div>
                    </div>
                    <div className="flex-1 p-4 md:p-6">
                        {providerCosts.length === 0 ? (
                            <p className="text-gray-400 text-sm text-center py-4">{t('dashboard.noData')}</p>
                        ) : (
                            <div className="space-y-3">
                                {providerCosts.map((prov: any, idx: number) => (
                                    <div key={prov.id} className="flex justify-between items-center p-3 bg-gray-50/70 rounded-xl">
                                        <div className="flex items-center space-x-3">
                                            <span className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 text-xs font-bold flex items-center justify-center">{idx + 1}</span>
                                            <div>
                                                <p className="text-sm font-semibold text-gray-900">{prov.name}</p>
                                                <p className="text-xs text-gray-500">{prov.serviceCount} {t('dashboard.services')}</p>
                                            </div>
                                        </div>
                                        <span className="text-sm font-bold text-purple-600">AR$ {prov.totalCost.toLocaleString()}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            );
        }

        return null;
    };

    const renderChartWidget = (widgetId: string) => {
        if (widgetId === "chart_income_vs_expenses") {
            return (
                <div key={widgetId} className="bg-white rounded-2xl shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-gray-100 overflow-hidden p-6">
                    <div className="flex items-center space-x-3 mb-6">
                        <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600"><BarChart3 size={18} strokeWidth={2.5} /></div>
                        <h3 className="font-bold text-gray-900 tracking-tight">{t('dashboard.widgets.chart_income_vs_expenses')}</h3>
                    </div>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                <XAxis dataKey="label" tick={{ fontSize: 12 }} tickMargin={8} />
                                <YAxis tick={{ fontSize: 12 }} tickMargin={8} tickFormatter={(v: number) => `AR$ ${v >= 1000000 ? (v / 1000000).toFixed(1) + 'M' : v >= 1000 ? (v / 1000).toFixed(0) + 'K' : v}`} />
                                <Tooltip
                                    contentStyle={{
                                        borderRadius: '12px',
                                        border: '1px solid #e5e7eb',
                                        boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                                    }}
                                    formatter={(value: number | undefined) => `AR$ ${(value ?? 0).toLocaleString()}`}
                                />
                                <Legend />
                                <Bar dataKey="Income" name={t('finances.charts.income')} fill="#10B981" radius={[4, 4, 0, 0]} maxBarSize={40} />
                                <Bar dataKey="Expense" name={t('finances.charts.expense')} fill="#EF4444" radius={[4, 4, 0, 0]} maxBarSize={40} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            );
        }

        if (widgetId === "chart_cashflow_distribution") {
            return (
                <div key={widgetId} className="bg-white rounded-2xl shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-gray-100 overflow-hidden p-6">
                    <div className="flex items-center space-x-3 mb-6">
                        <div className="p-2 bg-violet-50 rounded-lg text-violet-600"><BarChart3 size={18} strokeWidth={2.5} /></div>
                        <h3 className="font-bold text-gray-900 tracking-tight">{t('dashboard.widgets.chart_cashflow_distribution')}</h3>
                    </div>
                    <div className="space-y-4">
                        {/* Profit Margin */}
                        <div className="flex items-center justify-between">
                            <span className="text-gray-600 font-medium">{t('finances.charts.profitMargin')}</span>
                            <span className={`text-2xl font-black ${cashflowSummary.margin >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                {cashflowSummary.margin.toFixed(1)}%
                            </span>
                        </div>
                        {/* Progress bar */}
                        <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all duration-700 ${cashflowSummary.margin >= 0 ? 'bg-gradient-to-r from-emerald-400 to-emerald-600' : 'bg-gradient-to-r from-red-400 to-red-600'}`}
                                style={{ width: `${Math.min(Math.abs(cashflowSummary.margin), 100)}%` }}
                            />
                        </div>
                        {/* Summary rows */}
                        <div className="mt-4 space-y-3 border-t border-gray-100 pt-4">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">{t('finances.charts.incomingCash')}</span>
                                <span className="font-bold text-emerald-600">AR$ {cashflowSummary.totalIncome.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">{t('finances.charts.pendingPayables')}</span>
                                <span className="font-bold text-red-600">AR$ {cashflowSummary.totalExpense.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                            </div>
                            <div className="flex justify-between text-sm border-t border-gray-100 pt-3">
                                <span className="font-bold text-gray-900">{t('finances.charts.netProjection')}</span>
                                <span className={`font-black ${cashflowSummary.net >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                    AR$ {cashflowSummary.net.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            );
        }

        if (widgetId === "chart_service_costs") {
            const providerCostData = providers.map((prov: any) => {
                const services = providerServices.filter((s: any) => s.provider_id === prov.id && s.status === 'Active');
                const total = services.reduce((sum: number, s: any) => sum + Number(s.cost_price || 0), 0);
                return { name: prov.name.length > 12 ? prov.name.slice(0, 12) + '\u2026' : prov.name, Cost: total };
            }).filter((d: any) => d.Cost > 0).sort((a: any, b: any) => b.Cost - a.Cost).slice(0, 8);

            return (
                <div key={widgetId} className="bg-white rounded-2xl shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-gray-100 overflow-hidden p-6">
                    <div className="flex items-center space-x-3 mb-6">
                        <div className="p-2 bg-orange-50 rounded-lg text-orange-600"><BarChart3 size={18} strokeWidth={2.5} /></div>
                        <h3 className="font-bold text-gray-900 tracking-tight">{t('dashboard.widgets.chart_service_costs')}</h3>
                    </div>
                    <div className="h-64">
                        {providerCostData.length === 0 ? (
                            <p className="text-gray-400 text-sm text-center py-8">{t('dashboard.noData')}</p>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={providerCostData} layout="vertical" margin={{ top: 0, right: 0, left: 10, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                    <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v: number) => `u$d ${v.toLocaleString()}`} />
                                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={90} />
                                    <Tooltip formatter={(value: number | undefined) => `u$d ${(value ?? 0).toLocaleString()}`} contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb' }} />
                                    <Bar dataKey="Cost" fill="#F97316" radius={[0, 4, 4, 0]} maxBarSize={28} />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>
            );
        }

        if (widgetId === "chart_invoice_status") {
            const statusCounts: Record<string, { count: number; color: string }> = {};
            allInvoices.forEach((inv) => {
                const status = invoiceStatuses.find((s) => s.id === inv.status_id);
                const name = status?.name || (inv.status_id ? `Status ${inv.status_id}` : 'Unknown');
                if (!statusCounts[name]) statusCounts[name] = { count: 0, color: status?.color || '#94a3b8' };
                statusCounts[name].count++;
            });
            const statusData = Object.entries(statusCounts).map(([name, { count, color }]) => ({ name, count, color }));
            const total = allInvoices.length || 1;

            return (
                <div key={widgetId} className="bg-white rounded-2xl shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-gray-100 overflow-hidden p-6">
                    <div className="flex items-center space-x-3 mb-6">
                        <div className="p-2 bg-blue-50 rounded-lg text-blue-600"><FileText size={18} strokeWidth={2.5} /></div>
                        <h3 className="font-bold text-gray-900 tracking-tight">{t('dashboard.widgets.chart_invoice_status')}</h3>
                    </div>
                    <div className="space-y-3">
                        {statusData.length === 0 ? (
                            <p className="text-gray-400 text-sm text-center py-4">{t('dashboard.noData')}</p>
                        ) : statusData.map((s) => (
                            <div key={s.name}>
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="font-medium text-gray-700">{s.name}</span>
                                    <span className="font-bold text-gray-900">{s.count}</span>
                                </div>
                                <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${(s.count / total * 100)}%`, backgroundColor: s.color }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            );
        }

        return null;
    };
    const SortableWidget = ({ id, children }: { id: string; children: React.ReactNode }) => {
        const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
        const style = {
            transform: CSS.Transform.toString(transform),
            transition,
            opacity: isDragging ? 0.4 : 1,
            position: 'relative' as const,
        };
        return (
            <div ref={setNodeRef} style={style} {...attributes}>
                <div
                    {...listeners}
                    className="absolute top-2 right-2 z-20 p-1.5 text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing rounded-lg hover:bg-gray-100/80 transition-colors"
                    title={t('dashboard.dragToReorder')}
                >
                    <GripVertical size={16} />
                </div>
                {children}
            </div>
        );
    };

    return (
        <div className="space-y-6">
            {/* Hero Section */}
            <div className="relative overflow-hidden bg-white p-6 md:p-8 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 mb-6 md:mb-8">
                <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-full blur-3xl opacity-70 -mr-20 -mt-20 pointer-events-none"></div>
                <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h2 className="text-2xl md:text-3xl font-black tracking-tight text-gray-900 mb-2">{t('dashboard.welcome')}</h2>
                        <p className="text-gray-500 text-base md:text-lg">{t('dashboard.snapshot')}</p>
                    </div>
                    <button
                        onClick={() => setShowCustomizer(true)}
                        className="self-start sm:self-center flex items-center space-x-2 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-sm rounded-xl transition-colors"
                    >
                        <Settings2 size={16} />
                        <span>{t('dashboard.customize.button')}</span>
                    </button>
                </div>
            </div>

            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                <SortableContext items={activeWidgets} strategy={rectSortingStrategy}>
                    {/* Dynamic KPI Cards */}
                    {activeKpis.length > 0 && (
                        <div className={`grid grid-cols-1 sm:grid-cols-2 ${activeKpis.length >= 4 ? 'lg:grid-cols-4' : activeKpis.length === 3 ? 'lg:grid-cols-3' : 'lg:grid-cols-2'} gap-4 md:gap-6`}>
                            {activeKpis.map(id => (
                                <SortableWidget key={id} id={id}>
                                    {renderKpiCard(id)}
                                </SortableWidget>
                            ))}
                        </div>
                    )}

                    {/* Dynamic Table Widgets */}
                    {activeTables.length > 0 && (
                        <div className={`grid grid-cols-1 ${activeTables.length >= 2 ? 'lg:grid-cols-2' : ''} gap-6`}>
                            {activeTables.map(id => (
                                <SortableWidget key={id} id={id}>
                                    {renderTableWidget(id)}
                                </SortableWidget>
                            ))}
                        </div>
                    )}

                    {/* Dynamic Chart Widgets */}
                    {activeCharts.length > 0 && (
                        <div className={`grid grid-cols-1 ${activeCharts.length >= 2 ? 'lg:grid-cols-2' : ''} gap-6`}>
                            {activeCharts.map(id => (
                                <SortableWidget key={id} id={id}>
                                    {renderChartWidget(id)}
                                </SortableWidget>
                            ))}
                        </div>
                    )}
                </SortableContext>

                <DragOverlay>
                    {dragActiveId ? (
                        <div className="opacity-80 shadow-2xl rounded-2xl border-2 border-blue-300 bg-white p-4 pointer-events-none">
                            <div className="text-sm font-bold text-blue-600 text-center">
                                {t(`dashboard.widgets.${dragActiveId}`) || dragActiveId}
                            </div>
                        </div>
                    ) : null}
                </DragOverlay>
            </DndContext>

            {/* Customizer Modal */}
            {showCustomizer && user && (
                <DashboardCustomizer
                    userId={user.id}
                    currentWidgets={activeWidgets}
                    onSave={handleWidgetsSave}
                    onClose={() => setShowCustomizer(false)}
                />
            )}
        </div>
    );
}
