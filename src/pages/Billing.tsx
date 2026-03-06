import { useState, useEffect, useRef } from "react";
import api from "../api/client";
import { Plus, Pencil, Trash2, CheckCircle, FileText, Download, TrendingUp, TrendingDown, AlertCircle, Scale, Zap, BadgeCheck, ChevronDown, FileEdit, Link2, Eye, ArrowUpDown, ArrowUp, ArrowDown, Search, Filter, X, History, Clock, UserCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import ArcaInvoiceModal from "../components/ArcaInvoiceModal";

interface Invoice {
    id: number;
    invoice_number: string;
    client_id: number | null;
    provider_id: number | null;
    quote_id: number | null;
    seller_id: number | null;
    amount: number;
    issue_date: string;
    due_date: string;
    payment_date: string | null;
    status_id: number | null;
    notes: string;
    type: string;
    currency: string;
    exchange_rate: number;
    amount_ars: number;
    file_url?: string;
    items?: InvoiceItem[];
    // ARCA fields
    cae?: string | null;
    cae_vto?: string | null;
    arca_cbte_tipo?: number | null;
    arca_cbte_nro?: number | null;
    arca_punto_vta?: number | null;
    arca_result?: string | null;
}

interface InvoiceItem {
    id?: number;
    product_id: number | null;
    description?: string;
    quantity: number;
    unit_price: number;
    total_price: number;
}

interface InvoiceStatus {
    id: number;
    name: string;
    color_code: string;
}

interface Client {
    id: number;
    name: string;
    cuit_dni?: string;
    address?: string;
}

interface Provider {
    id: number;
    name: string;
}

interface Product {
    id: number;
    name: string;
    description: string;
    price: number;
    type: string;
}

interface Quote {
    id: number;
    quote_number: string;
    client_id: number | null;
    status: string;
    currency: string;
    total_amount: number;
    items: QuoteItem[];
}

interface QuoteItem {
    id: number;
    product_id: number | null;
    description: string;
    quantity: number;
    unit_price: number;
    total_price: number;
}

interface Seller { id: number; full_name: string; }

export default function Billing() {
    const { t } = useTranslation();
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [statuses, setStatuses] = useState<InvoiceStatus[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [providers, setProviders] = useState<Provider[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [quotes, setQuotes] = useState<Quote[]>([]);
    const [sellers, setSellers] = useState<Seller[]>([]);
    const [loading, setLoading] = useState(true);

    // Tabs for Issued vs Received
    const [activeTab, setActiveTab] = useState<"issued" | "received">("issued");
    const [kpiCurrency, setKpiCurrency] = useState("ARS");

    // Chart filters
    const [chartMonthRange, setChartMonthRange] = useState(6);
    const [chartSelectedClients, setChartSelectedClients] = useState<number[]>([]);

    // Invoice Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingInvoiceId, setEditingInvoiceId] = useState<number | null>(null);
    // New invoice dropdown
    const [showNewInvoiceDropdown, setShowNewInvoiceDropdown] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // ARCA Direct Mode (generate from ARCA without pre-existing invoice)
    const [arcaDirectMode, setArcaDirectMode] = useState(false);

    // PDF Preview modal
    const [showPreview, setShowPreview] = useState(false);
    const [previewUrl, setPreviewUrl] = useState("");
    const [previewTitle, setPreviewTitle] = useState("");

    // Status dropdown
    const [statusDropdownId, setStatusDropdownId] = useState<number | null>(null);

    // Audit History modal
    const [auditModalInvoiceId, setAuditModalInvoiceId] = useState<number | null>(null);
    const [auditData, setAuditData] = useState<any>(null);
    const [auditLoading, setAuditLoading] = useState(false);

    // Filter & Sort state
    const [filterNumber, setFilterNumber] = useState("");
    const [filterDateFrom, setFilterDateFrom] = useState("");
    const [filterDateTo, setFilterDateTo] = useState("");
    const [filterStatusId, setFilterStatusId] = useState<string>("");
    const [filterOrigin, setFilterOrigin] = useState<string>(""); // "" | "arca" | "manual" | "uploaded"
    const [showFilters, setShowFilters] = useState(false);
    const [sortField, setSortField] = useState<string>("issue_date");
    const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

    const handleSort = (field: string) => {
        if (sortField === field) {
            setSortDir(sortDir === "asc" ? "desc" : "asc");
        } else {
            setSortField(field);
            setSortDir(field === "invoice_number" ? "asc" : "desc");
        }
    };

    const SortIcon = ({ field }: { field: string }) => {
        if (sortField !== field) return <ArrowUpDown size={14} className="ml-1 text-gray-300" />;
        return sortDir === "asc" ? <ArrowUp size={14} className="ml-1 text-blue-500" /> : <ArrowDown size={14} className="ml-1 text-blue-500" />;
    };

    const activeFilterCount = [filterNumber, filterDateFrom, filterDateTo, filterStatusId, filterOrigin].filter(Boolean).length;

    const clearFilters = () => {
        setFilterNumber("");
        setFilterDateFrom("");
        setFilterDateTo("");
        setFilterStatusId("");
        setFilterOrigin("");
    };

    const handleQuickStatusChange = async (invoiceId: number, newStatusId: number) => {
        try {
            await api.patch(`/invoices/${invoiceId}/status`, { status_id: newStatusId });
            setInvoices(prev => prev.map(inv => inv.id === invoiceId ? { ...inv, status_id: newStatusId } : inv));
            setStatusDropdownId(null);
        } catch (e) {
            console.error("Status change failed", e);
        }
    };

    const openAuditModal = async (invoiceId: number) => {
        setAuditModalInvoiceId(invoiceId);
        setAuditLoading(true);
        try {
            const res = await api.get(`/invoices/${invoiceId}/audit-log`);
            setAuditData(res.data);
        } catch (e) {
            console.error("Failed to load audit log", e);
            setAuditData(null);
        } finally {
            setAuditLoading(false);
        }
    };

    const getActionIcon = (action: string) => {
        switch (action) {
            case 'created': return <Plus size={14} className="text-green-500" />;
            case 'status_changed': return <CheckCircle size={14} className="text-blue-500" />;
            case 'arca_emitted': return <Zap size={14} className="text-yellow-500" />;
            case 'nc_associated': return <Link2 size={14} className="text-purple-500" />;
            case 'edited': return <Pencil size={14} className="text-orange-500" />;
            default: return <Clock size={14} className="text-gray-400" />;
        }
    };

    const getActionColor = (action: string) => {
        switch (action) {
            case 'created': return 'border-green-300 bg-green-50';
            case 'status_changed': return 'border-blue-300 bg-blue-50';
            case 'arca_emitted': return 'border-yellow-300 bg-yellow-50';
            case 'nc_associated': return 'border-purple-300 bg-purple-50';
            default: return 'border-gray-300 bg-gray-50';
        }
    };

    const [formData, setFormData] = useState({
        invoice_number: "",
        client_id: "" as string | number,
        provider_id: "" as string | number,
        quote_id: "" as string | number,
        seller_id: "" as string | number,
        amount: 0,
        issue_date: new Date().toISOString().split('T')[0],
        due_date: new Date().toISOString().split('T')[0],
        payment_date: "" as string,
        status_id: "" as string | number,
        notes: "",
        type: "issued",
        currency: "ARS",
        exchange_rate: 1,
        file_url: "" as string | undefined,
        items: [] as InvoiceItem[]
    });

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowNewInvoiceDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const [invoiceFile, setInvoiceFile] = useState<File | null>(null);

    // Status Management Modal
    const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
    const [editingStatusId, setEditingStatusId] = useState<number | null>(null);
    const [statusName, setStatusName] = useState("");
    const [statusColor, setStatusColor] = useState("#3B82F6");

    // ARCA Modal
    const [arcaModalOpen, setArcaModalOpen] = useState(false);
    const [arcaInvoice, setArcaInvoice] = useState<Invoice | null>(null);

    const openArcaModal = (invoice: Invoice) => {
        setArcaInvoice(invoice);
        setArcaModalOpen(true);
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Close status dropdown on outside click
    useEffect(() => {
        if (statusDropdownId === null) return;
        const handler = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (!target.closest('[data-status-dropdown]')) {
                setStatusDropdownId(null);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [statusDropdownId]);

    const fetchData = async () => {
        try {
            const [invRes, statRes, clipRes, provRes, prodRes, quoteRes, sellerRes] = await Promise.all([
                api.get("/invoices/"),
                api.get("/invoices/statuses"),
                api.get("/clients/"),
                api.get("/providers/"),
                api.get("/products/"),
                api.get("/quotes/"),
                api.get("/sellers/").catch(() => ({ data: [] })),
            ]);
            setInvoices(invRes.data);
            setStatuses(statRes.data);
            setClients(clipRes.data);
            setProviders(provRes.data);
            setProducts(prodRes.data);
            setQuotes(quoteRes.data);
            setSellers(Array.isArray(sellerRes.data) ? sellerRes.data.map((s: any) => ({ id: s.id, full_name: s.full_name || s.username })) : []);
        } catch (error) {
            console.error("Failed to fetch data", error);
        } finally {
            setLoading(false);
        }
    };

    const openAddModal = () => {
        setEditingInvoiceId(null);
        setFormData({
            invoice_number: "",
            client_id: "",
            provider_id: "",
            quote_id: "",
            seller_id: "",
            amount: 0,
            issue_date: new Date().toISOString().split('T')[0],
            due_date: new Date().toISOString().split('T')[0],
            payment_date: "",
            status_id: statuses.length > 0 ? statuses[0].id : "",
            notes: "",
            type: activeTab,
            currency: "ARS",
            exchange_rate: 1,
            file_url: "",
            items: [],
        });
        setInvoiceFile(null);
        setShowNewInvoiceDropdown(false);
        setIsModalOpen(true);
    };

    const openArcaDirect = () => {
        setArcaDirectMode(true);
        setArcaInvoice(null);
        setArcaModalOpen(true);
        setShowNewInvoiceDropdown(false);
    };

    const handleQuoteChange = (quoteId: string | number) => {
        const qId = quoteId ? Number(quoteId) : null;
        const quote = quotes.find(q => q.id === qId);
        if (quote) {
            // Auto-populate items from quote
            const newItems: InvoiceItem[] = quote.items.map(qi => ({
                product_id: qi.product_id,
                quantity: Number(qi.quantity),
                unit_price: Number(qi.unit_price),
                total_price: Number(qi.total_price),
            }));
            const total = newItems.reduce((sum, item) => sum + item.total_price, 0);
            setFormData({
                ...formData,
                quote_id: qId || "",
                client_id: quote.client_id || formData.client_id,
                currency: quote.currency || formData.currency,
                items: newItems,
                amount: total,
            });
        } else {
            setFormData({ ...formData, quote_id: quoteId });
        }
    };

    const openEditModal = (invoice: Invoice) => {
        setEditingInvoiceId(invoice.id);
        setFormData({
            invoice_number: invoice.invoice_number,
            client_id: invoice.client_id || "",
            provider_id: invoice.provider_id || "",
            quote_id: invoice.quote_id || "",
            seller_id: (invoice as any).seller_id || "",
            amount: invoice.amount,
            issue_date: invoice.issue_date,
            due_date: invoice.due_date,
            payment_date: invoice.payment_date ? invoice.payment_date.split('T')[0] : "",
            status_id: invoice.status_id || "",
            notes: invoice.notes || "",
            type: invoice.type,
            currency: invoice.currency || "ARS",
            exchange_rate: invoice.exchange_rate || 1,
            file_url: invoice.file_url || "",
            items: invoice.items || [],
        });
        setInvoiceFile(null);
        setIsModalOpen(true);
    };

    const handleDelete = async (id: number) => {
        if (confirm("Are you sure you want to delete this invoice?")) {
            try {
                await api.delete(`/invoices/${id}`);
                fetchData();
            } catch (error) {
                console.error("Delete failed", error);
            }
        }
    };

    const handleAddItem = () => {
        setFormData({
            ...formData,
            items: [...formData.items, { product_id: null, description: '', quantity: 1, unit_price: 0, total_price: 0 }]
        });
    };

    const handleRemoveItem = (index: number) => {
        const newItems = formData.items.filter((_, i) => i !== index);
        updateAmountFromItems(newItems);
    };

    const handleItemChange = (index: number, field: string, value: any) => {
        const newItems = [...formData.items];
        const item = newItems[index];

        if (field === 'product_id') {
            const product = products.find(p => p.id === Number(value));
            item.product_id = value ? Number(value) : null;
            if (product) {
                item.unit_price = product.price;
                item.total_price = Number((item.quantity * product.price).toFixed(2));
                item.description = product.name; // Auto-fill description from product
            }
        } else if (field === 'description') {
            item.description = value;
        } else if (field === 'quantity') {
            item.quantity = Number(value);
            item.total_price = Number((item.quantity * item.unit_price).toFixed(2));
        } else if (field === 'unit_price') {
            item.unit_price = Number(value);
            item.total_price = Number((item.quantity * item.unit_price).toFixed(2));
        }

        updateAmountFromItems(newItems);
    };

    const updateAmountFromItems = (items: InvoiceItem[]) => {
        const total = items.reduce((sum, item) => sum + item.total_price, 0);
        setFormData({
            ...formData,
            items,
            amount: items.length > 0 ? total : formData.amount
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (isStatusPaid(formData.status_id) && !formData.payment_date) {
                alert(t('billing.validation.paymentDateRequired'));
                return;
            }
            const payload = {
                ...formData,
                client_id: formData.type === "issued" && formData.client_id ? Number(formData.client_id) : null,
                provider_id: formData.type === "received" && formData.provider_id ? Number(formData.provider_id) : null,
                quote_id: formData.quote_id ? Number(formData.quote_id) : null,
                seller_id: formData.seller_id ? Number(formData.seller_id) : null,
                status_id: formData.status_id ? Number(formData.status_id) : null,
                payment_date: formData.payment_date || null,
            };

            let currentInvoiceId = editingInvoiceId;

            if (editingInvoiceId) {
                await api.put(`/invoices/${editingInvoiceId}`, payload);
            } else {
                const res = await api.post("/invoices/", payload);
                currentInvoiceId = res.data.id;
            }

            if (invoiceFile && currentInvoiceId) {
                const formDataFile = new FormData();
                formDataFile.append("file", invoiceFile);
                await api.post(`/invoices/${currentInvoiceId}/upload`, formDataFile, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
            }

            setIsModalOpen(false);
            fetchData();
        } catch (error) {
            console.error("Submit failed", error);
            alert("An error occurred while saving.");
        }
    };

    const handleEditStatus = (status: InvoiceStatus) => {
        setEditingStatusId(status.id);
        setStatusName(status.name);
        setStatusColor(status.color_code || "#3B82F6");
    };

    const handleDeleteStatus = async (id: number) => {
        if (confirm("Are you sure you want to delete this status? Invoices linked to this might lose their status indicator.")) {
            try {
                await api.delete(`/invoices/statuses/${id}`);
                fetchData();
            } catch (error) {
                console.error("Delete status failed", error);
                alert("Failed to delete status. It might be in use.");
            }
        }
    };

    const handleStatusSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingStatusId) {
                await api.put(`/invoices/statuses/${editingStatusId}`, { name: statusName, color_code: statusColor });
            } else {
                await api.post("/invoices/statuses", { name: statusName, color_code: statusColor });
            }

            setEditingStatusId(null);
            setStatusName("");
            setStatusColor("#3B82F6");
            fetchData();
        } catch (error) {
            console.error("Failed to save status", error);
        }
    };

    const getEntityName = (invoice: Invoice) => {
        if (invoice.type === "issued" && invoice.client_id) {
            return clients.find((c) => c.id === invoice.client_id)?.name || "Unknown Client";
        }
        if (invoice.type === "received" && invoice.provider_id) {
            return providers.find((p) => p.id === invoice.provider_id)?.name || "Unknown Provider";
        }
        return "-";
    };

    const getStatus = (id: number | null) => {
        if (!id) return { name: t('common.none'), color_code: "#9CA3AF" };
        return statuses.find((s) => s.id === id) || { name: "Unknown", color_code: "#9CA3AF" };
    };

    const filteredInvoices = invoices
        .filter((inv) => inv.type === activeTab)
        .filter((inv) => {
            // Number search
            if (filterNumber && !inv.invoice_number.toLowerCase().includes(filterNumber.toLowerCase())) return false;
            // Date range
            if (filterDateFrom && inv.issue_date) {
                const invDate = inv.issue_date.split('T')[0];
                if (invDate < filterDateFrom) return false;
            }
            if (filterDateTo && inv.issue_date) {
                const invDate = inv.issue_date.split('T')[0];
                if (invDate > filterDateTo) return false;
            }
            // Status
            if (filterStatusId && inv.status_id !== Number(filterStatusId)) return false;
            // Origin
            if (filterOrigin === 'arca' && !inv.cae) return false;
            if (filterOrigin === 'manual' && (inv.cae || inv.file_url)) return false;
            if (filterOrigin === 'uploaded' && !inv.file_url) return false;
            return true;
        })
        .sort((a, b) => {
            let va: any, vb: any;
            switch (sortField) {
                case 'invoice_number': va = a.invoice_number; vb = b.invoice_number; break;
                case 'amount': va = Number(a.amount); vb = Number(b.amount); break;
                case 'issue_date': va = a.issue_date || ''; vb = b.issue_date || ''; break;
                case 'status': va = a.status_id || 0; vb = b.status_id || 0; break;
                case 'client': {
                    const ca = clients.find(c => c.id === a.client_id);
                    const cb = clients.find(c => c.id === b.client_id);
                    va = ca?.name || ''; vb = cb?.name || '';
                    break;
                }
                default: va = a.id; vb = b.id;
            }
            if (va < vb) return sortDir === 'asc' ? -1 : 1;
            if (va > vb) return sortDir === 'asc' ? 1 : -1;
            return 0;
        });

    const isStatusPaid = (statusId: any) => {
        const s = statuses.find(st => st.id === Number(statusId));
        if (!s) return false;
        const n = s.name.toLowerCase();
        return n.includes('pagad') || n.includes('cobrad') || n.includes('paid');
    };

    const isStatusDeuda = (statusId: any) => {
        const s = statuses.find(st => st.id === Number(statusId));
        if (!s) return false;
        const n = s.name.toLowerCase();
        return n.includes('deuda') || n.includes('overdue') || n.includes('vencid');
    };

    const calculateKPIs = () => {
        let collectedIssued = 0;
        let pendingIssued = 0;
        let deudaIssued = 0;
        let totalIssued = 0;
        let paidReceived = 0;
        let pendingReceived = 0;

        invoices.forEach(inv => {
            if (inv.currency !== kpiCurrency) return;
            const amt = Number(inv.amount);
            const isNC = inv.invoice_number.startsWith('NC-') || (inv as any).arca_cbte_tipo === 13 || (inv as any).arca_cbte_tipo === 8 || (inv as any).arca_cbte_tipo === 3;
            const sign = isNC ? -1 : 1;

            if (inv.type === 'issued') {
                totalIssued += amt * sign;
                if (isStatusPaid(inv.status_id)) {
                    collectedIssued += amt * sign;
                } else if (isStatusDeuda(inv.status_id)) {
                    deudaIssued += amt * sign;
                } else {
                    pendingIssued += amt * sign;
                }
            } else if (inv.type === 'received') {
                if (isStatusPaid(inv.status_id)) {
                    paidReceived += amt;
                } else {
                    pendingReceived += amt;
                }
            }
        });

        const balance = collectedIssued - paidReceived;

        return { collectedIssued, pendingIssued, deudaIssued, totalIssued, paidReceived, pendingReceived, balance };
    };

    const kpis = calculateKPIs();

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100 gap-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-gray-900">{t('billing.title')}</h2>
                    <p className="text-sm text-gray-500">{t('billing.description')}</p>
                </div>
                <div className="flex space-x-3 w-full sm:w-auto">
                    <button
                        onClick={() => setIsStatusModalOpen(true)}
                        className="flex-1 sm:flex-none flex items-center justify-center space-x-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium transition-colors"
                    >
                        <CheckCircle size={18} />
                        <span>{t('billing.manageStatusBtn')}</span>
                    </button>
                    <div className="relative" ref={dropdownRef}>
                        <button
                            onClick={() => setShowNewInvoiceDropdown(!showNewInvoiceDropdown)}
                            className="flex-1 sm:flex-none flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm"
                        >
                            <Plus size={18} />
                            <span>{t('billing.newBtn')}</span>
                            <ChevronDown size={16} className={`transition-transform ${showNewInvoiceDropdown ? 'rotate-180' : ''}`} />
                        </button>
                        {showNewInvoiceDropdown && (
                            <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden animate-in fade-in slide-in-from-top-1">
                                <button
                                    onClick={openAddModal}
                                    className="w-full flex items-start gap-3 px-4 py-3.5 hover:bg-blue-50 transition-colors text-left group"
                                >
                                    <div className="p-2 bg-blue-100 rounded-lg text-blue-600 group-hover:bg-blue-200 transition-colors mt-0.5">
                                        <FileEdit size={18} />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-gray-900 text-sm">{t('billing.dropdown.manualTitle')}</p>
                                        <p className="text-xs text-gray-500 mt-0.5">{t('billing.dropdown.manualDesc')}</p>
                                    </div>
                                </button>
                                <div className="border-t border-gray-100" />
                                <button
                                    onClick={openArcaDirect}
                                    className="w-full flex items-start gap-3 px-4 py-3.5 hover:bg-amber-50 transition-colors text-left group"
                                >
                                    <div className="p-2 bg-amber-100 rounded-lg text-amber-600 group-hover:bg-amber-200 transition-colors mt-0.5">
                                        <Zap size={18} />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-gray-900 text-sm">{t('billing.dropdown.arcaTitle')}</p>
                                        <p className="text-xs text-gray-500 mt-0.5">{t('billing.dropdown.arcaDesc')}</p>
                                    </div>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex justify-between items-end mb-2">
                <h3 className="text-lg font-bold text-gray-900">{t('billing.title')} KPIs</h3>
                <div className="flex bg-gray-100 p-1 rounded-lg w-max shadow-sm border border-gray-200">
                    {['ARS', 'USD', 'EUR'].map(curr => (
                        <button
                            key={curr}
                            onClick={() => setKpiCurrency(curr)}
                            className={`px-4 py-1.5 text-sm font-bold rounded-md transition-all ${kpiCurrency === curr ? 'bg-white text-blue-600 shadow border border-gray-200' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            {curr}
                        </button>
                    ))}
                </div>
            </div>
            {/* KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
                {/* Total Facturado */}
                <div className="bg-gradient-to-br from-slate-50 to-gray-50 p-4 rounded-xl shadow-sm border border-gray-200 flex items-center justify-between hover:shadow-md transition-shadow gap-2 overflow-hidden">
                    <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-gray-600 mb-1 truncate">Total Facturado</p>
                        <h4 className="text-base xl:text-xl font-bold text-gray-900 truncate" title={`$${kpis.totalIssued.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}>
                            ${kpis.totalIssued.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </h4>
                    </div>
                    <div className="w-9 h-9 flex-shrink-0 rounded-full bg-gray-100 flex items-center justify-center text-gray-600">
                        <FileText className="w-4 h-4" />
                    </div>
                </div>

                {/* Balance */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-xl shadow-sm border border-blue-100 flex items-center justify-between hover:shadow-md transition-shadow gap-2 overflow-hidden">
                    <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-blue-800 mb-1 truncate">Balance Real</p>
                        <h4 className={`text-base xl:text-xl font-bold truncate ${kpis.balance >= 0 ? 'text-green-600' : 'text-red-600'}`} title={`$${kpis.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}>
                            ${kpis.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </h4>
                    </div>
                    <div className="w-9 h-9 flex-shrink-0 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                        <Scale className="w-4 h-4" />
                    </div>
                </div>

                {/* Cobrado */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-green-100 flex items-center justify-between hover:shadow-md transition-shadow gap-2 overflow-hidden">
                    <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-gray-500 mb-1 truncate">Cobrado</p>
                        <h4 className="text-base xl:text-xl font-bold text-green-700 truncate" title={`$${kpis.collectedIssued.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}>
                            ${kpis.collectedIssued.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </h4>
                    </div>
                    <div className="w-9 h-9 flex-shrink-0 rounded-full bg-green-50 flex items-center justify-center text-green-600">
                        <TrendingUp className="w-4 h-4" />
                    </div>
                </div>

                {/* Pendiente Cobro */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-orange-100 flex items-center justify-between hover:shadow-md transition-shadow gap-2 overflow-hidden">
                    <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-gray-500 mb-1 truncate">Pendiente Cobro</p>
                        <h4 className="text-base xl:text-xl font-bold text-orange-600 truncate" title={`$${kpis.pendingIssued.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}>
                            ${kpis.pendingIssued.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </h4>
                    </div>
                    <div className="w-9 h-9 flex-shrink-0 rounded-full bg-orange-50 flex items-center justify-center text-orange-600">
                        <AlertCircle className="w-4 h-4" />
                    </div>
                </div>

                {/* Deuda */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-red-200 flex items-center justify-between hover:shadow-md transition-shadow gap-2 overflow-hidden">
                    <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-red-600 mb-1 truncate">Deuda</p>
                        <h4 className="text-base xl:text-xl font-bold text-red-700 truncate" title={`$${kpis.deudaIssued.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}>
                            ${kpis.deudaIssued.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </h4>
                    </div>
                    <div className="w-9 h-9 flex-shrink-0 rounded-full bg-red-50 flex items-center justify-center text-red-600">
                        <TrendingDown className="w-4 h-4" />
                    </div>
                </div>

                {/* Pagado Proveedores */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-purple-100 flex items-center justify-between hover:shadow-md transition-shadow gap-2 overflow-hidden">
                    <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-gray-500 mb-1 truncate">Pagado (Prov.)</p>
                        <h4 className="text-base xl:text-xl font-bold text-gray-900 truncate" title={`$${kpis.paidReceived.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}>
                            ${kpis.paidReceived.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </h4>
                    </div>
                    <div className="w-9 h-9 flex-shrink-0 rounded-full bg-purple-50 flex items-center justify-center text-purple-600">
                        <CheckCircle className="w-4 h-4" />
                    </div>
                </div>

                {/* Pendiente Pago Proveedores */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-red-100 flex items-center justify-between hover:shadow-md transition-shadow gap-2 overflow-hidden">
                    <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-gray-500 mb-1 truncate">Pend. Pago</p>
                        <h4 className="text-base xl:text-xl font-bold text-gray-900 truncate" title={`$${kpis.pendingReceived.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}>
                            ${kpis.pendingReceived.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </h4>
                    </div>
                    <div className="w-9 h-9 flex-shrink-0 rounded-full bg-red-50 flex items-center justify-center text-red-500">
                        <TrendingDown className="w-4 h-4" />
                    </div>
                </div>
            </div>

            {/* Client Revenue Timeline Chart */}
            {
                (() => {
                    // Colors for client lines
                    const lineColors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316', '#6366F1', '#84CC16', '#06B6D4', '#E11D48'];

                    // Build month labels
                    const monthLabels: { label: string; key: string; month: number; year: number }[] = [];
                    const now = new Date();
                    for (let i = chartMonthRange - 1; i >= 0; i--) {
                        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                        monthLabels.push({
                            label: d.toLocaleString('default', { month: 'short' }) + ' ' + d.getFullYear(),
                            key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
                            month: d.getMonth(),
                            year: d.getFullYear()
                        });
                    }

                    // Filter invoices to issued only for chart
                    const issuedInvoices = invoices.filter(inv => inv.type === 'issued' && inv.client_id);

                    // Get unique clients with invoices
                    const clientsWithInvoices = clients.filter(c =>
                        issuedInvoices.some(inv => inv.client_id === c.id)
                    );

                    // Active clients for chart
                    const activeClients = chartSelectedClients.length > 0
                        ? clientsWithInvoices.filter(c => chartSelectedClients.includes(c.id))
                        : clientsWithInvoices;

                    // Build chart data
                    const chartData = monthLabels.map(ml => {
                        const point: Record<string, any> = { name: ml.label };
                        activeClients.forEach(client => {
                            const total = issuedInvoices
                                .filter(inv => {
                                    if (inv.client_id !== client.id) return false;
                                    const d = new Date(inv.issue_date || inv.due_date);
                                    return d.getMonth() === ml.month && d.getFullYear() === ml.year;
                                })
                                .reduce((sum, inv) => sum + Number(inv.amount), 0);
                            point[client.name] = total;
                        });
                        return point;
                    });

                    const toggleClient = (id: number) => {
                        setChartSelectedClients(prev =>
                            prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
                        );
                    };

                    return (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
                                <h3 className="text-lg font-bold text-gray-900">{t('billing.chart.title')}</h3>
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200">
                                        <span className="text-xs font-medium text-gray-500">{t('billing.chart.months')}:</span>
                                        {[3, 6, 12].map(m => (
                                            <button
                                                key={m}
                                                onClick={() => setChartMonthRange(m)}
                                                className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all ${chartMonthRange === m
                                                    ? 'bg-white text-blue-600 shadow border border-gray-200'
                                                    : 'text-gray-500 hover:text-gray-700'
                                                    }`}
                                            >
                                                {m}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Client filter pills */}
                            {clientsWithInvoices.length > 1 && (
                                <div className="flex flex-wrap gap-1.5 mb-4">
                                    <button
                                        onClick={() => setChartSelectedClients([])}
                                        className={`px-3 py-1 text-xs font-medium rounded-full transition-all ${chartSelectedClients.length === 0
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                            }`}
                                    >
                                        {t('billing.chart.allClients')}
                                    </button>
                                    {clientsWithInvoices.map((client, idx) => (
                                        <button
                                            key={client.id}
                                            onClick={() => toggleClient(client.id)}
                                            className={`px-3 py-1 text-xs font-medium rounded-full transition-all flex items-center gap-1.5 ${chartSelectedClients.includes(client.id)
                                                ? 'text-white shadow-sm'
                                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                                }`}
                                            style={chartSelectedClients.includes(client.id) ? { backgroundColor: lineColors[idx % lineColors.length] } : {}}
                                        >
                                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: lineColors[idx % lineColors.length] }} />
                                            {client.name}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {activeClients.length > 0 ? (
                                <ResponsiveContainer width="100%" height={320}>
                                    <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                                        <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#6B7280' }} />
                                        <YAxis tick={{ fontSize: 12, fill: '#6B7280' }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                                        <Tooltip
                                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '13px' }}
                                            formatter={(value: number | undefined) => [`$${(value ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, '']}
                                        />
                                        <Legend wrapperStyle={{ paddingTop: '10px' }} />
                                        {activeClients.map((client, idx) => (
                                            <Line
                                                key={client.id}
                                                type="monotone"
                                                dataKey={client.name}
                                                stroke={lineColors[idx % lineColors.length]}
                                                strokeWidth={2.5}
                                                dot={{ r: 4, fill: lineColors[idx % lineColors.length] }}
                                                activeDot={{ r: 6 }}
                                            />
                                        ))}
                                    </LineChart>
                                </ResponsiveContainer>
                            ) : (
                                <p className="text-center text-gray-400 py-12">{t('billing.chart.noData')}</p>
                            )}
                        </div>
                    );
                })()
            }

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="flex border-b border-gray-100">
                    <button
                        className={`flex-1 py-4 text-sm font-medium transition-colors ${activeTab === "issued" ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                            }`}
                        onClick={() => setActiveTab("issued")}
                    >
                        Issued to Clients
                    </button>
                    <button
                        className={`flex-1 py-4 text-sm font-medium transition-colors ${activeTab === "received" ? "text-purple-600 border-b-2 border-purple-600" : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                            }`}
                        onClick={() => setActiveTab("received")}
                    >
                        Received from Providers
                    </button>
                </div>

                {/* Filter Bar */}
                <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50">
                    <div className="flex items-center gap-3 flex-wrap">
                        {/* Quick Search */}
                        <div className="relative flex-1 min-w-[200px] max-w-xs">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Buscar por N° factura..."
                                value={filterNumber}
                                onChange={(e) => setFilterNumber(e.target.value)}
                                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                            />
                        </div>

                        {/* Toggle Filters */}
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${showFilters || activeFilterCount > 0
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                                }`}
                        >
                            <Filter size={16} />
                            Filtros
                            {activeFilterCount > 0 && (
                                <span className="ml-1 px-1.5 py-0.5 text-xs bg-blue-500 text-white rounded-full">{activeFilterCount}</span>
                            )}
                        </button>

                        {activeFilterCount > 0 && (
                            <button
                                onClick={clearFilters}
                                className="flex items-center gap-1 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg border border-red-200 transition-colors"
                            >
                                <X size={14} /> Limpiar
                            </button>
                        )}

                        <span className="text-xs text-gray-400 ml-auto">
                            {filteredInvoices.length} resultado{filteredInvoices.length !== 1 ? 's' : ''}
                        </span>
                    </div>

                    {/* Expanded Filters */}
                    {showFilters && (
                        <div className="mt-3 pt-3 border-t border-gray-200 grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">Fecha desde</label>
                                <input
                                    type="date"
                                    value={filterDateFrom}
                                    onChange={(e) => setFilterDateFrom(e.target.value)}
                                    className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">Fecha hasta</label>
                                <input
                                    type="date"
                                    value={filterDateTo}
                                    onChange={(e) => setFilterDateTo(e.target.value)}
                                    className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">Estado</label>
                                <select
                                    value={filterStatusId}
                                    onChange={(e) => setFilterStatusId(e.target.value)}
                                    className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white"
                                >
                                    <option value="">Todos</option>
                                    {statuses.map(s => (
                                        <option key={s.id} value={s.id}>{s.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">Origen</label>
                                <select
                                    value={filterOrigin}
                                    onChange={(e) => setFilterOrigin(e.target.value)}
                                    className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white"
                                >
                                    <option value="">Todos</option>
                                    <option value="arca">ARCA (con CAE)</option>
                                    <option value="manual">Creada sin ARCA</option>
                                    <option value="uploaded">Archivo subido</option>
                                </select>
                            </div>
                        </div>
                    )}
                </div>

                {loading ? (
                    <div className="p-8 text-center text-gray-500">{t('billing.loading')}</div>
                ) : (
                    <div>
                        {/* Desktop Table View */}
                        <div className="hidden md:block overflow-x-auto w-full">
                            <table className="w-full text-left border-collapse min-w-[800px]">
                                <thead>
                                    <tr className="bg-gray-50 border-b border-gray-100">
                                        <th className="p-4 font-semibold text-gray-600 text-sm cursor-pointer hover:text-blue-600 select-none" onClick={() => handleSort('invoice_number')}>
                                            <span className="flex items-center">{t('billing.table.invoiceNum')}<SortIcon field="invoice_number" /></span>
                                        </th>
                                        <th className="p-4 font-semibold text-gray-600 text-sm cursor-pointer hover:text-blue-600 select-none" onClick={() => handleSort('client')}>
                                            <span className="flex items-center">{activeTab === "issued" ? "Client" : "Provider"}<SortIcon field="client" /></span>
                                        </th>
                                        <th className="p-4 font-semibold text-gray-600 text-sm cursor-pointer hover:text-blue-600 select-none" onClick={() => handleSort('issue_date')}>
                                            <span className="flex items-center">{t('billing.table.dates')}<SortIcon field="issue_date" /></span>
                                        </th>
                                        <th className="p-4 font-semibold text-gray-600 text-sm cursor-pointer hover:text-blue-600 select-none" onClick={() => handleSort('amount')}>
                                            <span className="flex items-center">{t('billing.table.amount')}<SortIcon field="amount" /></span>
                                        </th>
                                        <th className="p-4 font-semibold text-gray-600 text-sm cursor-pointer hover:text-blue-600 select-none" onClick={() => handleSort('status')}>
                                            <span className="flex items-center">{t('billing.table.status')}<SortIcon field="status" /></span>
                                        </th>
                                        <th className="p-4 font-semibold text-gray-600 text-sm text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredInvoices.map((invoice) => {
                                        const status = getStatus(invoice.status_id);
                                        return (
                                            <tr key={invoice.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                                                <td className="p-4">
                                                    <div className="flex items-center space-x-2">
                                                        <FileText size={16} className={invoice.cae ? "text-green-500" : "text-gray-400"} />
                                                        <div>
                                                            <span className="font-medium text-gray-900">{invoice.invoice_number}</span>
                                                            {invoice.cae && (
                                                                <div className="flex items-center mt-0.5">
                                                                    <BadgeCheck size={12} className="text-green-500 mr-1" />
                                                                    <span className="text-xs text-green-600 font-mono">CAE: {invoice.cae.slice(0, 8)}...</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-4 text-gray-800">{getEntityName(invoice)}</td>
                                                <td className="p-4 text-sm">
                                                    <div className="text-gray-900">Issued: {new Date(invoice.issue_date).toLocaleDateString()}</div>
                                                    <div className="text-gray-500 mt-1">Due: {new Date(invoice.due_date).toLocaleDateString()}</div>
                                                </td>
                                                <td className="p-4 font-mono font-medium text-gray-900">
                                                    {Number(invoice.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {invoice.currency}
                                                </td>
                                                <td className="p-4 relative" data-status-dropdown>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); setStatusDropdownId(statusDropdownId === invoice.id ? null : invoice.id); }}
                                                        className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium cursor-pointer hover:ring-2 hover:ring-blue-300 transition-all"
                                                        style={{ backgroundColor: `${status.color_code}20`, color: status.color_code }}
                                                    >
                                                        {status.name} <ChevronDown size={12} className="ml-1" />
                                                    </button>
                                                    {statusDropdownId === invoice.id && (
                                                        <div className="absolute z-30 top-full left-4 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl py-1 min-w-[160px]">
                                                            {statuses.map(s => (
                                                                <button
                                                                    key={s.id}
                                                                    onClick={(e) => { e.stopPropagation(); handleQuickStatusChange(invoice.id, s.id); }}
                                                                    className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2 ${invoice.status_id === s.id ? 'bg-blue-50 font-medium' : ''}`}
                                                                >
                                                                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color_code }} />
                                                                    {s.name}
                                                                    {invoice.status_id === s.id && <CheckCircle size={14} className="ml-auto text-blue-500" />}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="p-4 flex justify-end space-x-2">
                                                    {/* History button */}
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); openAuditModal(invoice.id); }}
                                                        className="p-1.5 text-gray-400 hover:text-purple-600 transition-colors bg-white hover:bg-purple-50 rounded-lg shadow-sm border border-transparent hover:border-purple-200"
                                                        title="Historial"
                                                    >
                                                        <History size={18} />
                                                    </button>
                                                    {/* Eye preview button */}
                                                    {(invoice.file_url || invoice.cae) && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                const url = invoice.cae
                                                                    ? `${import.meta.env.VITE_API_URL || '/api/v1'}/arca/invoice-pdf/${invoice.id}`
                                                                    : `/api/v1${invoice.file_url}`;
                                                                setPreviewUrl(url);
                                                                setPreviewTitle(`${invoice.invoice_number}`);
                                                                setShowPreview(true);
                                                            }}
                                                            className="p-1.5 text-blue-400 hover:text-blue-600 transition-colors bg-white hover:bg-blue-50 rounded-lg shadow-sm border border-transparent hover:border-blue-200"
                                                            title="Previsualizar"
                                                        >
                                                            <Eye size={18} />
                                                        </button>
                                                    )}
                                                    {invoice.file_url ? (
                                                        <a
                                                            href={`/api/v1${invoice.file_url}`}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="p-1.5 text-gray-400 hover:text-green-600 transition-colors bg-white hover:bg-green-50 rounded-lg shadow-sm border border-transparent hover:border-green-100"
                                                            title={t('common.downloadAttachment')}
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            <Download size={18} />
                                                        </a>
                                                    ) : invoice.cae ? (
                                                        <a
                                                            href={`${import.meta.env.VITE_API_URL || '/api/v1'}/arca/invoice-pdf/${invoice.id}?download=1`}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="p-1.5 text-green-500 hover:text-green-700 transition-colors bg-white hover:bg-green-50 rounded-lg shadow-sm border border-transparent hover:border-green-200"
                                                            title="Descargar PDF Fiscal"
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            <Download size={18} />
                                                        </a>
                                                    ) : (
                                                        <button disabled className="p-1.5 text-gray-200 cursor-not-allowed bg-gray-50 rounded-lg border border-transparent" title="No Attachment">
                                                            <Download size={18} />
                                                        </button>
                                                    )}
                                                    {invoice.type === "issued" && !invoice.cae && (
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); openArcaModal(invoice); }}
                                                            className="p-1.5 text-yellow-500 hover:text-yellow-600 transition-colors bg-white hover:bg-yellow-50 rounded-lg shadow-sm border border-transparent hover:border-yellow-200"
                                                            title="Facturar en ARCA"
                                                        >
                                                            <Zap size={18} />
                                                        </button>
                                                    )}
                                                    {invoice.cae && (
                                                        <span className="px-2 py-1 text-xs font-medium bg-green-50 text-green-700 rounded-lg border border-green-200" title={`CAE: ${invoice.cae}`}>
                                                            ARCA ✓
                                                        </span>
                                                    )}
                                                    {invoice.cae ? (
                                                        <span className="p-1.5 text-gray-300 cursor-not-allowed bg-gray-50 rounded-lg shadow-sm border border-transparent" title="No se puede editar una factura emitida en ARCA">
                                                            <Pencil size={18} />
                                                        </span>
                                                    ) : (
                                                        <button
                                                            onClick={() => openEditModal(invoice)}
                                                            className="p-1.5 text-gray-400 hover:text-blue-600 transition-colors bg-white hover:bg-blue-50 rounded-lg shadow-sm border border-transparent hover:border-blue-100"
                                                            title={t("common.edit")}
                                                        >
                                                            <Pencil size={18} />
                                                        </button>
                                                    )}
                                                    {invoice.cae ? (
                                                        <span className="p-1.5 text-gray-300 cursor-not-allowed bg-gray-50 rounded-lg shadow-sm border border-transparent" title="No se puede eliminar una factura emitida en ARCA">
                                                            <Trash2 size={18} />
                                                        </span>
                                                    ) : (
                                                        <button
                                                            onClick={() => handleDelete(invoice.id)}
                                                            className="p-1.5 text-gray-400 hover:text-red-600 transition-colors bg-white hover:bg-red-50 rounded-lg shadow-sm border border-transparent hover:border-red-100"
                                                            title={t("common.delete")}
                                                        >
                                                            <Trash2 size={18} />
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {filteredInvoices.length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="p-8 text-center text-gray-500">
                                                No {activeTab} invoices found.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile Card View */}
                        <div className="md:hidden grid grid-cols-1 gap-4 p-4 bg-gray-50">
                            {filteredInvoices.map((invoice) => {
                                const status = getStatus(invoice.status_id);
                                return (
                                    <div key={invoice.id} className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex flex-col space-y-4">
                                        <div className="flex justify-between items-start">
                                            <div className="flex items-center space-x-2">
                                                <FileText size={18} className="text-gray-400" />
                                                <h3 className="font-bold text-gray-900 text-lg">{invoice.invoice_number}</h3>
                                            </div>
                                            <div className="relative" data-status-dropdown>
                                                <button
                                                    onClick={() => setStatusDropdownId(statusDropdownId === invoice.id ? null : invoice.id)}
                                                    className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium cursor-pointer hover:ring-2 hover:ring-blue-300"
                                                    style={{ backgroundColor: `${status.color_code}20`, color: status.color_code }}
                                                >
                                                    {status.name} <ChevronDown size={12} className="ml-1" />
                                                </button>
                                                {statusDropdownId === invoice.id && (
                                                    <div className="absolute z-30 top-full right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl py-1 min-w-[160px]">
                                                        {statuses.map(s => (
                                                            <button
                                                                key={s.id}
                                                                onClick={() => handleQuickStatusChange(invoice.id, s.id)}
                                                                className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2 ${invoice.status_id === s.id ? 'bg-blue-50 font-medium' : ''}`}
                                                            >
                                                                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color_code }} />
                                                                {s.name}
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                                            <p className="text-xs text-gray-500 font-medium mb-1 uppercase tracking-wider">{activeTab === "issued" ? "Client" : "Provider"}</p>
                                            <p className="font-semibold text-gray-800">{getEntityName(invoice)}</p>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4 text-sm">
                                            <div>
                                                <p className="text-gray-500 mb-1">Issued</p>
                                                <p className="font-medium text-gray-900">{new Date(invoice.issue_date).toLocaleDateString()}</p>
                                            </div>
                                            <div>
                                                <p className="text-gray-500 mb-1">Due</p>
                                                <p className="font-medium text-gray-900">{new Date(invoice.due_date).toLocaleDateString()}</p>
                                            </div>
                                        </div>

                                        <div className="flex justify-between items-center bg-blue-50/50 p-4 rounded-xl border border-blue-50/50">
                                            <span className="text-sm font-medium text-gray-600">Amount</span>
                                            <span className="font-mono font-bold text-gray-900 text-xl">
                                                {Number(invoice.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {invoice.currency}
                                            </span>
                                        </div>

                                        <div className="flex justify-end space-x-2 border-t border-gray-50 pt-4 mt-2">
                                            {invoice.type === "issued" && !invoice.cae && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); openArcaModal(invoice); }}
                                                    className="p-2 text-yellow-500 hover:text-yellow-600 transition-colors bg-yellow-50 hover:bg-yellow-100 rounded-lg flex-1 flex justify-center items-center border border-yellow-200"
                                                    title="Facturar en ARCA"
                                                >
                                                    <Zap size={18} />
                                                </button>
                                            )}
                                            {invoice.cae && (
                                                <span className="px-3 py-2 text-xs font-medium bg-green-50 text-green-700 rounded-lg border border-green-200 flex items-center justify-center flex-1">
                                                    ARCA ✓
                                                </span>
                                            )}
                                            {/* Eye preview button - mobile */}
                                            {(invoice.file_url || invoice.cae) && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        const url = invoice.cae
                                                            ? `${import.meta.env.VITE_API_URL || '/api/v1'}/arca/invoice-pdf/${invoice.id}`
                                                            : `/api/v1${invoice.file_url}`;
                                                        setPreviewUrl(url);
                                                        setPreviewTitle(`${invoice.invoice_number}`);
                                                        setShowPreview(true);
                                                    }}
                                                    className="p-2 text-blue-500 hover:text-blue-700 transition-colors bg-blue-50 hover:bg-blue-100 rounded-lg flex-1 flex justify-center items-center border border-blue-200"
                                                    title="Previsualizar"
                                                >
                                                    <Eye size={18} />
                                                </button>
                                            )}
                                            {invoice.file_url ? (
                                                <a
                                                    href={`/api/v1${invoice.file_url}`}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="p-2 text-gray-500 hover:text-green-600 transition-colors bg-gray-50 hover:bg-green-50 rounded-lg flex-1 text-center flex justify-center items-center"
                                                    title={t('common.downloadAttachment')}
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <Download size={18} />
                                                </a>
                                            ) : invoice.cae ? (
                                                <a
                                                    href={`${import.meta.env.VITE_API_URL || '/api/v1'}/arca/invoice-pdf/${invoice.id}?download=1`}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="p-2 text-green-500 hover:text-green-700 transition-colors bg-green-50 hover:bg-green-100 rounded-lg flex-1 text-center flex justify-center items-center border border-green-200"
                                                    title="Descargar PDF Fiscal"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <Download size={18} />
                                                </a>
                                            ) : (
                                                <button disabled className="p-2 text-gray-300 cursor-not-allowed bg-gray-50 rounded-lg flex-1 flex justify-center items-center" title="No Attachment">
                                                    <Download size={18} />
                                                </button>
                                            )}
                                            {invoice.cae ? (
                                                <span className="p-2 text-gray-300 cursor-not-allowed bg-gray-100 rounded-lg flex-1 flex justify-center items-center" title="No editable (ARCA)">
                                                    <Pencil size={18} />
                                                </span>
                                            ) : (
                                                <button
                                                    onClick={() => openEditModal(invoice)}
                                                    className="p-2 text-gray-500 hover:text-blue-600 transition-colors bg-gray-50 hover:bg-blue-50 rounded-lg flex-1 flex justify-center items-center"
                                                    title={t("common.edit")}
                                                >
                                                    <Pencil size={18} />
                                                </button>
                                            )}
                                            {invoice.cae ? (
                                                <span className="p-2 text-gray-300 cursor-not-allowed bg-gray-100 rounded-lg flex-1 flex justify-center items-center" title="No eliminable (ARCA)">
                                                    <Trash2 size={18} />
                                                </span>
                                            ) : (
                                                <button
                                                    onClick={() => handleDelete(invoice.id)}
                                                    className="p-2 text-gray-500 hover:text-red-600 transition-colors bg-gray-50 hover:bg-red-50 rounded-lg flex-1 flex justify-center items-center"
                                                    title={t("common.delete")}
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                            {filteredInvoices.length === 0 && (
                                <div className="p-8 text-center text-gray-500 bg-white rounded-xl border border-dashed border-gray-300">
                                    No {activeTab} invoices found.
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Invoice Form Modal */}
            {
                isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
                        <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden max-h-[90vh] overflow-y-auto flex flex-col">
                            <div className="px-6 py-4 bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center"><FileText size={20} className="text-white" /></div>
                                    <div>
                                        <h3 className="text-lg font-bold text-white">
                                            {editingInvoiceId ? "Edit Invoice" : `New ${formData.type === "issued" ? "Issued" : "Received"} Invoice`}
                                        </h3>
                                        <p className="text-blue-100 text-xs">Complete los datos de la factura</p>
                                    </div>
                                </div>
                                <button onClick={() => setIsModalOpen(false)} className="p-1.5 hover:bg-white/20 rounded-lg"><X size={18} className="text-white" /></button>
                            </div>
                            <form onSubmit={handleSubmit} className="p-6 grid grid-cols-2 gap-4 overflow-y-auto flex-1">
                                <div className="col-span-2 sm:col-span-1">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('billing.modal.invoiceNum')}</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.invoice_number}
                                        onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
                                        className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                        placeholder="INV-001"
                                    />
                                </div>

                                <div className="col-span-2 sm:col-span-1">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        {formData.type === "issued" ? t('billing.table.client') || "Client" : t('billing.table.provider') || "Provider"}
                                    </label>
                                    <select
                                        required
                                        value={formData.type === "issued" ? formData.client_id : formData.provider_id}
                                        onChange={(e) => {
                                            if (formData.type === "issued") setFormData({ ...formData, client_id: e.target.value, quote_id: "" });
                                            else setFormData({ ...formData, provider_id: e.target.value });
                                        }}
                                        className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    >
                                        <option value="">{t('billing.modal.selectClient')}</option>
                                        {(formData.type === "issued" ? clients : providers).map(entity => (
                                            <option key={entity.id} value={entity.id}>{entity.name}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Quote Association - only for issued invoices */}
                                {formData.type === "issued" && formData.client_id && (
                                    <div className="col-span-2 sm:col-span-1">
                                        <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1.5">
                                            <Link2 size={14} className="text-indigo-500" />
                                            {t('billing.modal.linkedQuote')}
                                        </label>
                                        <select
                                            value={formData.quote_id}
                                            onChange={(e) => handleQuoteChange(e.target.value)}
                                            className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                        >
                                            <option value="">{t('billing.modal.noQuote')}</option>
                                            {quotes
                                                .filter(q => q.client_id === Number(formData.client_id))
                                                .map(q => (
                                                    <option key={q.id} value={q.id}>
                                                        {q.quote_number} — {q.status} — ${Number(q.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })} {q.currency}
                                                    </option>
                                                ))
                                            }
                                        </select>
                                        {formData.quote_id && (
                                            <p className="text-xs text-indigo-600 mt-1 flex items-center gap-1">
                                                <CheckCircle size={12} />
                                                {t('billing.modal.quoteLinked')}
                                            </p>
                                        )}
                                    </div>
                                )}

                                {/* Seller Association */}
                                <div className="col-span-2 sm:col-span-1">
                                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1.5">
                                        <UserCheck size={14} className="text-purple-500" />
                                        Vendedor
                                    </label>
                                    <select
                                        value={formData.seller_id}
                                        onChange={(e) => setFormData({ ...formData, seller_id: e.target.value })}
                                        className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                                    >
                                        <option value="">Sin vendedor asignado</option>
                                        {sellers.map(s => (
                                            <option key={s.id} value={s.id}>{s.full_name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('billing.modal.issueDate')}</label>
                                    <input
                                        type="date"
                                        required
                                        value={formData.issue_date}
                                        onChange={(e) => setFormData({ ...formData, issue_date: e.target.value })}
                                        className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('billing.modal.dueDate')}</label>
                                    <input
                                        type="date"
                                        required
                                        value={formData.due_date}
                                        onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                                        className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                </div>

                                <div className="col-span-2 sm:col-span-1">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                                    <select
                                        required
                                        value={formData.currency}
                                        onChange={(e) => {
                                            const cur = e.target.value;
                                            setFormData({ ...formData, currency: cur, exchange_rate: cur === 'ARS' ? 1 : formData.exchange_rate });
                                        }}
                                        className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    >
                                        <option value="ARS">ARS</option>
                                        <option value="USD">USD</option>
                                        <option value="EUR">EUR</option>
                                    </select>
                                </div>

                                <div className="col-span-2 sm:col-span-1">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('billing.table.amount')}</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <span className="text-gray-500">$</span>
                                        </div>
                                        <input
                                            type="number"
                                            step="0.01"
                                            required
                                            value={formData.amount}
                                            onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                                            className={`w-full pl-7 pr-4 py-2 ${formData.items.length > 0 ? "bg-gray-100 text-gray-500 cursor-not-allowed" : "bg-gray-50 focus:ring-2 focus:ring-blue-500"} border border-gray-200 rounded-lg outline-none`}
                                            placeholder="0.00"
                                            readOnly={formData.items.length > 0}
                                            title={formData.items.length > 0 ? t('common.amountCalculated') : ""}
                                        />
                                    </div>
                                </div>

                                {formData.currency !== 'ARS' && (
                                    <div className="col-span-2 sm:col-span-1">
                                        <label className="block text-sm font-medium text-yellow-700 mb-1">💱 Tipo de Cambio a ARS</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            required
                                            value={formData.exchange_rate}
                                            onChange={(e) => {
                                                const rate = parseFloat(e.target.value) || 1;
                                                setFormData({ ...formData, exchange_rate: rate });
                                            }}
                                            className="w-full px-4 py-2 bg-yellow-50 border border-yellow-300 rounded-lg focus:ring-2 focus:ring-yellow-500 outline-none"
                                            placeholder="1050.00"
                                        />
                                        {formData.exchange_rate > 1 && formData.amount > 0 && (
                                            <p className="text-xs text-gray-500 mt-1">
                                                Equivale a <strong className="text-green-600">$ {(formData.amount * formData.exchange_rate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ARS</strong>
                                            </p>
                                        )}
                                    </div>
                                )}

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('billing.table.status')}</label>
                                    <select
                                        value={formData.status_id}
                                        onChange={(e) => {
                                            const newStatusId = e.target.value;
                                            const wasPaid = isStatusPaid(formData.status_id);
                                            const nowPaid = isStatusPaid(newStatusId);
                                            setFormData({
                                                ...formData,
                                                status_id: newStatusId,
                                                payment_date: nowPaid && !wasPaid ? new Date().toISOString().split('T')[0] : (nowPaid ? formData.payment_date : ""),
                                            });
                                        }}
                                        className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    >
                                        <option value="">{t('billing.modal.noStatus')}</option>
                                        {statuses.map(s => (
                                            <option key={s.id} value={s.id}>{s.name}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Payment Date - shown only when status is Paid */}
                                {isStatusPaid(formData.status_id) && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            {t('billing.modal.paymentDate')} <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="date"
                                            value={formData.payment_date}
                                            onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                                            required
                                            className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                        />
                                    </div>
                                )}

                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('billing.modal.notes')}</label>
                                    <textarea
                                        value={formData.notes}
                                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                        className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                                        rows={2}
                                    />
                                </div>

                                {/* Invoice Items Section */}
                                <div className="col-span-2 mt-2 space-y-4">
                                    <div className="flex justify-between items-center bg-gray-100 px-4 py-2 rounded-lg border border-gray-200">
                                        <label className="text-sm font-semibold text-gray-700">Line Items (Servicios/Productos)</label>
                                        <button type="button" onClick={handleAddItem} className="text-sm px-3 py-1.5 bg-white border border-gray-200 rounded shadow-sm text-blue-600 hover:text-blue-800 hover:bg-gray-50 flex items-center transition-colors">
                                            <Plus size={16} className="mr-1" /> Add Item
                                        </button>
                                    </div>
                                    {formData.items.map((item, index) => (
                                        <div key={index} className="flex flex-wrap sm:flex-nowrap gap-2 items-end bg-gray-50 p-3 rounded-xl border border-gray-100">
                                            <div className="flex-1 min-w-[120px]">
                                                <label className="block text-xs text-gray-500 mb-1">{t('billing.modal.itemLabel')}</label>
                                                <select
                                                    value={item.product_id || ""}
                                                    onChange={(e) => handleItemChange(index, 'product_id', e.target.value)}
                                                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                                >
                                                    <option value="">{t('billing.modal.selectItem')}</option>
                                                    {products.map(p => <option key={p.id} value={p.id}>{p.name} - ${Number(p.price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</option>)}
                                                </select>
                                            </div>
                                            <div className="flex-1 min-w-[150px]">
                                                <label className="block text-xs text-gray-500 mb-1">Descripción</label>
                                                <input
                                                    type="text"
                                                    value={item.description || (item.product_id ? (products.find(p => p.id === item.product_id)?.name || '') : '')}
                                                    onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                                                    placeholder="Descripción del ítem"
                                                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                                />
                                            </div>
                                            <div className="w-20 sm:w-24">
                                                <label className="block text-xs text-gray-500 mb-1">{t('billing.modal.qty')}</label>
                                                <input type="number" min="1" step="any" required value={item.quantity} onChange={(e) => handleItemChange(index, 'quantity', e.target.value)} className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                                            </div>
                                            <div className="w-24 sm:w-32">
                                                <label className="block text-xs text-gray-500 mb-1">{t('billing.modal.price')}</label>
                                                <input type="number" min="0" step="any" required value={item.unit_price} onChange={(e) => handleItemChange(index, 'unit_price', e.target.value)} className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                                            </div>
                                            <div className="w-24 sm:w-32">
                                                <label className="block text-xs text-gray-500 mb-1">{t('billing.modal.total')}</label>
                                                <input type="number" readOnly value={item.total_price} className="w-full px-3 py-2 bg-gray-100 border border-gray-200 rounded-lg text-gray-500 cursor-not-allowed font-medium" />
                                            </div>
                                            <button type="button" onClick={() => handleRemoveItem(index)} className="p-2 mb-0.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100">
                                                <Trash2 size={20} />
                                            </button>
                                        </div>
                                    ))}
                                    {formData.items.length === 0 && (
                                        <div className="text-center py-4 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                                            <p className="text-sm text-gray-500">{t('billing.modal.noItems')}</p>
                                        </div>
                                    )}
                                </div>

                                <div className="col-span-2 mt-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Attachment (Documento)</label>
                                    <input
                                        type="file"
                                        onChange={(e) => setInvoiceFile(e.target.files ? e.target.files[0] : null)}
                                        className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                    {editingInvoiceId && formData.file_url && (
                                        <p className="mt-2 text-sm text-blue-600 flex items-center hover:underline cursor-pointer w-max">
                                            <FileText size={16} className="mr-1" />
                                            <a href={`/api/v1${formData.file_url}`} target="_blank" rel="noreferrer">{t('billing.modal.viewAttachment')}</a>
                                        </p>
                                    )}
                                </div>

                                <div className="col-span-2 pt-4 flex justify-end space-x-3 border-t border-gray-100">
                                    <button
                                        type="button"
                                        onClick={() => setIsModalOpen(false)}
                                        className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:shadow-md text-white rounded-lg font-medium transition-all shadow-sm"
                                    >
                                        Save Invoice
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }

            {/* Add Status Modal */}
            {
                isStatusModalOpen && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
                        <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col max-h-[90vh]">
                            <div className="px-6 py-4 bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center"><AlertCircle size={20} className="text-white" /></div>
                                    <div>
                                        <h3 className="text-lg font-bold text-white">{t('billing.statusModal.title')}</h3>
                                        <p className="text-blue-100 text-xs">Administrar estados de factura</p>
                                    </div>
                                </div>
                                <button onClick={() => setIsStatusModalOpen(false)} className="p-1.5 hover:bg-white/20 rounded-lg"><X size={18} className="text-white" /></button>
                            </div>

                            {/* List of existing statuses */}
                            <div className="p-4 overflow-y-auto border-b border-gray-100 flex-1">
                                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">{t('billing.statusModal.existing')}</h4>
                                {statuses.length === 0 ? (
                                    <p className="text-sm text-gray-500 text-center py-4">{t('billing.statusModal.none')}</p>
                                ) : (
                                    <ul className="space-y-2">
                                        {statuses.map(s => (
                                            <li key={s.id} className="flex justify-between items-center bg-gray-50 p-2 rounded-lg border border-gray-100">
                                                <span className="text-sm font-medium text-gray-900">{s.name}</span>
                                                <div className="flex items-center space-x-2">
                                                    <span
                                                        className="w-4 h-4 rounded-full border border-gray-200"
                                                        style={{ backgroundColor: s.color_code }}
                                                        title={s.color_code}
                                                    />
                                                    <button
                                                        onClick={() => handleEditStatus(s)}
                                                        className="p-1 text-gray-400 hover:text-blue-600 transition-colors bg-white rounded shadow-sm border border-gray-100"
                                                        title={t('common.editStatus')}
                                                    >
                                                        <Pencil size={12} />
                                                    </button>
                                                    {/* Protect 'Por facturar' from deletion since it's system-critical but allow edits */}
                                                    {s.name.toLowerCase() !== "por facturar" && s.name.toLowerCase() !== "pending" && (
                                                        <button
                                                            onClick={() => handleDeleteStatus(s.id)}
                                                            className="p-1 text-gray-400 hover:text-red-600 transition-colors bg-white rounded shadow-sm border border-gray-100"
                                                            title={t('common.deleteStatus')}
                                                        >
                                                            <Trash2 size={12} />
                                                        </button>
                                                    )}
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>

                            {/* Add/Edit new status form */}
                            <form onSubmit={handleStatusSubmit} className="p-4 bg-gray-50 space-y-4">
                                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex justify-between items-center">
                                    <span>{editingStatusId ? t("billing.statusModal.editTitle") : t("billing.statusModal.addTitle")}</span>
                                    {editingStatusId && (
                                        <button
                                            type="button"
                                            onClick={() => { setEditingStatusId(null); setStatusName(""); setStatusColor("#3B82F6"); }}
                                            className="text-[10px] text-blue-600 hover:underline normal-case"
                                        >
                                            Cancel Edit
                                        </button>
                                    )}
                                </h4>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('billing.statusModal.name')}</label>
                                    <input
                                        type="text"
                                        required
                                        value={statusName}
                                        onChange={(e) => setStatusName(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-200 bg-white rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="e.g. Paid, Pending, Overdue"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('billing.statusModal.color')}</label>
                                    <div className="flex space-x-2">
                                        <input
                                            type="color"
                                            required
                                            value={statusColor}
                                            onChange={(e) => setStatusColor(e.target.value)}
                                            className="h-10 w-10 border-0 p-0 rounded cursor-pointer"
                                        />
                                        <input
                                            type="text"
                                            value={statusColor}
                                            onChange={(e) => setStatusColor(e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-200 bg-white rounded-lg outline-none uppercase font-mono text-sm focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                </div>
                                <div className="flex justify-end space-x-2 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setIsStatusModalOpen(false)}
                                        className="px-4 py-2 text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-lg text-sm font-medium transition-colors"
                                    >
                                        Done
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:shadow-md text-white rounded-lg text-sm font-medium transition-all shadow-sm"
                                    >
                                        {editingStatusId ? t('common.updateStatus') : t('common.addStatus')}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }

            {/* ARCA Invoice Modal — from existing invoice */}
            {
                arcaInvoice && !arcaDirectMode && (
                    <ArcaInvoiceModal
                        isOpen={arcaModalOpen}
                        onClose={() => { setArcaModalOpen(false); setArcaInvoice(null); }}
                        invoiceId={arcaInvoice.id}
                        invoiceNumber={arcaInvoice.invoice_number}
                        invoiceAmount={arcaInvoice.amount}
                        clientName={clients.find(c => c.id === arcaInvoice.client_id)?.name || ""}
                        clientCuit={clients.find(c => c.id === arcaInvoice.client_id)?.cuit_dni || ""}
                        onSuccess={fetchData}
                        products={products}
                    />
                )
            }

            {/* ARCA Direct Mode — generate directly from ARCA without pre-existing invoice */}
            {
                arcaDirectMode && (
                    <ArcaInvoiceModal
                        isOpen={arcaModalOpen}
                        onClose={() => { setArcaModalOpen(false); setArcaDirectMode(false); }}
                        invoiceId={0}
                        invoiceNumber=""
                        invoiceAmount={0}
                        clientName=""
                        clientCuit=""
                        onSuccess={fetchData}
                        directMode={true}
                        clients={clients}
                        products={products}
                        quotes={quotes}
                    />
                )
            }

            {/* Audit History Modal */}
            {
                auditModalInvoiceId && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => { setAuditModalInvoiceId(null); setAuditData(null); }}>
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-blue-600 to-purple-600">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center"><History size={20} className="text-white" /></div>
                                    <div>
                                        <h3 className="text-lg font-bold text-white">Historial</h3>
                                        {auditData && <p className="text-blue-100 text-xs">{auditData.invoice_number}</p>}
                                    </div>
                                </div>
                                <button onClick={() => { setAuditModalInvoiceId(null); setAuditData(null); }} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"><X size={18} className="text-white" /></button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-6">
                                {auditLoading ? (
                                    <div className="text-center py-8 text-gray-500">Cargando historial...</div>
                                ) : auditData ? (
                                    <div className="space-y-6">
                                        {/* Timeline */}
                                        <div className="relative">
                                            <div className="absolute left-4 top-3 bottom-3 w-0.5 bg-gray-200" />
                                            {auditData.logs.map((log: any, idx: number) => (
                                                <div key={log.id || idx} className="relative flex items-start gap-4 mb-4">
                                                    <div className={`relative z-10 w-8 h-8 rounded-full border-2 flex items-center justify-center ${getActionColor(log.action)}`}>
                                                        {getActionIcon(log.action)}
                                                    </div>
                                                    <div className="flex-1 pb-4">
                                                        <p className="text-sm font-medium text-gray-800">{log.description}</p>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <span className="text-xs text-gray-400">
                                                                {log.created_at ? new Date(log.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
                                                            </span>
                                                            <span className="text-xs text-gray-400">•</span>
                                                            <span className="text-xs text-purple-500 font-medium">{log.user_name}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Associated Documents */}
                                        {auditData.associated_documents && auditData.associated_documents.length > 0 && (
                                            <div>
                                                <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                                    <Link2 size={16} className="text-purple-500" />
                                                    Documentos Asociados
                                                </h4>
                                                <div className="space-y-2">
                                                    {auditData.associated_documents.map((doc: any) => (
                                                        <div key={doc.id} className="flex items-center justify-between p-3 bg-purple-50 rounded-lg border border-purple-100">
                                                            <div>
                                                                <p className="font-medium text-sm text-purple-800">{doc.type}</p>
                                                                <p className="text-xs text-purple-600">{doc.invoice_number}</p>
                                                            </div>
                                                            <div className="text-right">
                                                                <p className="font-mono text-sm font-medium text-purple-900">${Number(doc.amount).toLocaleString()}</p>
                                                                <p className="text-xs text-purple-500">{doc.date ? new Date(doc.date).toLocaleDateString('es-AR') : ''}</p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="text-center py-8 text-gray-500">No se pudo cargar el historial</div>
                                )}
                            </div>
                        </div>
                    </div>
                )
            }

            {/* PDF Preview Modal */}
            {
                showPreview && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden">
                            <div className="flex items-center justify-between px-6 py-3 border-b bg-gray-50">
                                <div className="flex items-center space-x-3">
                                    <Eye size={20} className="text-blue-500" />
                                    <h3 className="font-semibold text-gray-800">Previsualización: {previewTitle}</h3>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <a
                                        href={previewUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors"
                                    >
                                        Abrir en nueva pestaña
                                    </a>
                                    <a
                                        href={previewUrl}
                                        download
                                        className="px-3 py-1.5 text-xs font-medium text-green-600 bg-green-50 hover:bg-green-100 rounded-lg border border-green-200 transition-colors"
                                    >
                                        Descargar
                                    </a>
                                    <button
                                        onClick={() => setShowPreview(false)}
                                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                    >
                                        ✕
                                    </button>
                                </div>
                            </div>
                            <div className="flex-1 bg-gray-200">
                                <iframe
                                    src={previewUrl}
                                    className="w-full h-full border-0"
                                    title="PDF Preview"
                                />
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
}
