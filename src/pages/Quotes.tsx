import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/client";
import { Plus, Pencil, Trash2, FileText, UploadCloud, X, ChevronRight, CreditCard, CheckCircle2, Clock, AlertCircle, ArrowLeft, Receipt, FolderKanban, AlertTriangle, List, LayoutGrid, GripVertical, ClipboardList } from "lucide-react";
import { useTranslation } from "react-i18next";

interface Quote {
    id: number;
    quote_number: string;
    client_id: number | null;
    lead_id: number | null;
    issue_date: string;
    expiry_date: string;
    status: string;
    currency: string;
    subtotal: number;
    tax_amount: number;
    total_amount: number;
    notes: string;
    file_url?: string;
    items?: QuoteItem[];
    seller_id?: number | null;
    commission_pct?: number;
}

interface QuoteItem {
    id?: number;
    product_id: number | null;
    description: string;
    quantity: number;
    unit_price: number;
    total_price: number;
}

interface Client {
    id: number;
    name: string;
}

interface Lead {
    id: number;
    company_name: string;
}

interface Product {
    id: number;
    name: string;
    description: string;
    price: number;
}

interface Installment {
    id: number;
    quote_id: number;
    installment_number: number;
    amount: number;
    due_date: string;
    status: string;
    invoice_id: number | null;
    invoice_number: string | null;
    notes: string | null;
}

interface InvoiceOption {
    id: number;
    invoice_number: string;
}

export default function Quotes() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [quotes, setQuotes] = useState<Quote[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [leads, setLeads] = useState<Lead[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [sellers, setSellers] = useState<{ id: number; full_name: string; commission_pct?: number }[]>([]);
    const [loading, setLoading] = useState(true);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingQuoteId, setEditingQuoteId] = useState<number | null>(null);
    const [formData, setFormData] = useState({
        client_id: "" as string | number,
        lead_id: "" as string | number,
        issue_date: new Date().toISOString().split('T')[0],
        expiry_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: "Draft",
        currency: "ARS",
        notes: "",
        file_url: "" as string | undefined,
        custom_amount: 0,
        items: [] as QuoteItem[],
        seller_id: "" as string | number,
        commission_pct: 0,
    });
    const [entityType, setEntityType] = useState<"client" | "lead">("client");
    const [quoteFile, setQuoteFile] = useState<File | null>(null);

    // Installment state
    const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
    const [installments, setInstallments] = useState<Installment[]>([]);
    const [installmentsLoading, setInstallmentsLoading] = useState(false);
    const [invoiceOptions, setInvoiceOptions] = useState<InvoiceOption[]>([]);
    const [showGenerateModal, setShowGenerateModal] = useState(false);
    const [genForm, setGenForm] = useState({ num: 1, start_date: new Date().toISOString().split('T')[0] });

    // Lead-to-client conversion warning for project creation
    const [convertWarningQuote, setConvertWarningQuote] = useState<Quote | null>(null);
    const [converting, setConverting] = useState(false);
    const [viewMode, setViewMode] = useState<'list' | 'kanban'>('kanban');
    const [draggedQuoteId, setDraggedQuoteId] = useState<number | null>(null);

    const statuses = ["Draft", "Sent", "Accepted", "Rejected"];
    const currencies = ["ARS", "USD", "EUR"];

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [quoRes, cliRes, leaRes, proRes, sellRes] = await Promise.all([
                api.get("/quotes/"),
                api.get("/clients/"),
                api.get("/leads/"),
                api.get("/products/"),
                api.get("/users/"),
            ]);
            setQuotes(quoRes.data);
            setClients(cliRes.data);
            setLeads(leaRes.data);
            setProducts(proRes.data);
            setSellers(sellRes.data.filter((u: any) => u.role === 'vendedor'));
        } catch (error) {
            console.error("Failed to fetch data", error);
        } finally {
            setLoading(false);
        }
    };

    const openAddModal = () => {
        setEditingQuoteId(null);
        setFormData({
            client_id: "",
            lead_id: "",
            issue_date: new Date().toISOString().split('T')[0],
            expiry_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            status: "Draft",
            currency: "ARS",
            notes: "",
            file_url: "",
            custom_amount: 0,
            items: []
        });
        setEntityType("client");
        setQuoteFile(null);
        setIsModalOpen(true);
    };

    const openEditModal = (quote: Quote) => {
        setEditingQuoteId(quote.id);
        setFormData({
            client_id: quote.client_id || "",
            lead_id: quote.lead_id || "",
            issue_date: quote.issue_date,
            expiry_date: quote.expiry_date,
            status: quote.status,
            currency: quote.currency,
            notes: quote.notes || "",
            file_url: quote.file_url || "",
            items: (quote.items || []).map(item => ({
                ...item,
                quantity: Number(item.quantity),
                unit_price: Number(item.unit_price),
                total_price: Number(item.total_price),
            })),
            custom_amount: Number(quote.subtotal) - (quote.items || []).reduce((sum, item) => sum + Number(item.total_price), 0),
            seller_id: (quote as any).seller_id || "",
            commission_pct: (quote as any).commission_pct || 0,
        });
        setEntityType(quote.lead_id ? "lead" : "client");
        setQuoteFile(null);
        setIsModalOpen(true);
    };

    const handleDelete = async (id: number) => {
        if (confirm("Are you sure you want to delete this quote?")) {
            try {
                await api.delete(`/quotes/${id}`);
                fetchData();
            } catch (error) {
                console.error("Delete failed", error);
            }
        }
    };

    const handleAddItem = () => {
        setFormData({
            ...formData,
            items: [...formData.items, { product_id: null, description: "", quantity: 1, unit_price: 0, total_price: 0 }]
        });
    };

    const handleRemoveItem = (index: number) => {
        const newItems = formData.items.filter((_, i) => i !== index);
        setFormData({ ...formData, items: newItems });
    };

    const handleItemChange = (index: number, field: string, value: any) => {
        const newItems = [...formData.items];
        const item = newItems[index];

        if (field === 'product_id') {
            const product = products.find(p => p.id === Number(value));
            item.product_id = value ? Number(value) : null;
            if (product) {
                item.description = product.name;
                item.unit_price = product.price;
                item.total_price = Number((item.quantity * product.price).toFixed(2));
            }
        } else if (field === 'quantity') {
            item.quantity = Number(value);
            item.total_price = Number((item.quantity * item.unit_price).toFixed(2));
        } else if (field === 'unit_price') {
            item.unit_price = Number(value);
            item.total_price = Number((item.quantity * item.unit_price).toFixed(2));
        } else if (field === 'description') {
            item.description = value;
        }

        setFormData({ ...formData, items: newItems });
    };

    const calculateTotals = () => {
        const itemSubtotal = formData.items.reduce((sum, item) => sum + Number(item.total_price || 0), 0);
        const subtotal = itemSubtotal + Number(formData.custom_amount || 0);
        const tax_amount = 0;
        const total_amount = subtotal + tax_amount;
        return { itemSubtotal, subtotal, tax_amount, total_amount };
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const totals = calculateTotals();

        const payload = {
            ...formData,
            client_id: entityType === "client" && formData.client_id ? Number(formData.client_id) : null,
            lead_id: entityType === "lead" && formData.lead_id ? Number(formData.lead_id) : null,
            subtotal: totals.subtotal,
            tax_amount: totals.tax_amount,
            total_amount: totals.total_amount,
            seller_id: formData.seller_id ? Number(formData.seller_id) : null,
            commission_pct: formData.commission_pct || 0,
        };

        try {
            let finalFileUrl = formData.file_url;
            if (quoteFile) {
                const fileData = new FormData();
                fileData.append("file", quoteFile);
                const uploadRes = await api.post("/upload/", fileData, {
                    headers: { "Content-Type": "multipart/form-data" }
                });
                finalFileUrl = uploadRes.data.file_url;
                payload.file_url = finalFileUrl;
            }

            if (editingQuoteId) {
                await api.put(`/quotes/${editingQuoteId}`, payload);
            } else {
                await api.post("/quotes/", payload);
            }
            setIsModalOpen(false);
            fetchData();
        } catch (error) {
            console.error("Save failed", error);
            alert("Failed to save quote. Please check the inputs.");
        }
    };

    const getEntityName = (quote: Quote) => {
        if (quote.client_id) {
            return clients.find(c => c.id === quote.client_id)?.name || "Unknown Account";
        }
        if (quote.lead_id) {
            return leads.find(l => l.id === quote.lead_id)?.company_name || "Unknown Lead";
        }
        return "N/A";
    };

    // --- Installment handlers ---
    const openQuoteDetail = async (quote: Quote) => {
        setSelectedQuote(quote);
        setInstallmentsLoading(true);
        try {
            const [instRes, invRes] = await Promise.all([
                api.get(`/quotes/${quote.id}/installments`),
                api.get('/invoices/'),
            ]);
            setInstallments(instRes.data);
            setInvoiceOptions(invRes.data.map((i: any) => ({ id: i.id, invoice_number: i.invoice_number })));
        } catch (err) {
            console.error('Failed to load installments', err);
        } finally {
            setInstallmentsLoading(false);
        }
    };

    const handleGenerateInstallments = async () => {
        if (!selectedQuote) return;
        try {
            const res = await api.post(`/quotes/${selectedQuote.id}/installments/bulk`, {
                num_installments: genForm.num,
                total_amount: selectedQuote.total_amount,
                start_date: genForm.start_date,
            });
            setInstallments(res.data);
            setShowGenerateModal(false);
        } catch (err) {
            console.error('Failed to generate installments', err);
        }
    };

    const handleLinkInvoice = async (installmentId: number, invoiceId: number | null) => {
        try {
            await api.put(`/quotes/installments/${installmentId}`, {
                invoice_id: invoiceId,
                status: invoiceId ? 'invoiced' : 'pending',
            });
            if (selectedQuote) {
                const res = await api.get(`/quotes/${selectedQuote.id}/installments`);
                setInstallments(res.data);
            }
        } catch (err) {
            console.error('Failed to link invoice', err);
        }
    };

    const handleMarkPaid = async (installmentId: number) => {
        try {
            await api.put(`/quotes/installments/${installmentId}`, { status: 'paid' });
            if (selectedQuote) {
                const res = await api.get(`/quotes/${selectedQuote.id}/installments`);
                setInstallments(res.data);
            }
        } catch (err) {
            console.error('Failed to mark paid', err);
        }
    };

    const handleDeleteInstallment = async (id: number) => {
        try {
            await api.delete(`/quotes/installments/${id}`);
            setInstallments(prev => prev.filter(i => i.id !== id));
        } catch (err) {
            console.error('Failed to delete installment', err);
        }
    };

    // --- Project creation from quote ---
    const handleCreateProject = (quote: Quote) => {
        if (quote.client_id) {
            navigate(`/projects?from_quote=${quote.id}`);
        } else if (quote.lead_id) {
            setConvertWarningQuote(quote);
        } else {
            navigate(`/projects?from_quote=${quote.id}`);
        }
    };

    const handleConvertAndCreateProject = async () => {
        if (!convertWarningQuote) return;
        setConverting(true);
        try {
            await api.post(`/leads/${convertWarningQuote.lead_id}/convert-to-client`);
            setConvertWarningQuote(null);
            navigate(`/projects?from_quote=${convertWarningQuote.id}`);
        } catch (error: any) {
            alert(error.response?.data?.detail || 'Error al convertir el prospecto.');
        } finally {
            setConverting(false);
        }
    };

    const handleCreateSalesOrder = async (quote: Quote) => {
        if (quote.status !== 'Accepted') {
            alert('Solo se pueden generar pedidos de presupuestos aceptados.');
            return;
        }
        try {
            const res = await api.post(`/sales-orders/from-quote/${quote.id}`);
            alert(`✅ Pedido ${res.data.order_number} creado exitosamente`);
            navigate('/sales-orders');
        } catch (error: any) {
            const msg = error.response?.data?.detail || 'Error al crear el pedido';
            alert(msg);
        }
    };

    const handleStatusChange = async (quoteId: number, newStatus: string) => {
        try {
            const quote = quotes.find(q => q.id === quoteId);
            if (!quote || quote.status === newStatus) return;
            await api.put(`/quotes/${quoteId}`, { ...quote, status: newStatus });
            setQuotes(prev => prev.map(q => q.id === quoteId ? { ...q, status: newStatus } : q));
        } catch (error) {
            console.error('Failed to update quote status', error);
        }
    };

    const kanbanColumns = [
        { status: 'Draft', label: 'Borrador', icon: '📝', gradient: 'from-slate-500 to-gray-600', bg: 'bg-slate-50', border: 'border-slate-200', badge: 'bg-slate-100 text-slate-700' },
        { status: 'Sent', label: 'Enviado', icon: '📤', gradient: 'from-blue-500 to-indigo-600', bg: 'bg-blue-50', border: 'border-blue-200', badge: 'bg-blue-100 text-blue-700' },
        { status: 'Accepted', label: 'Aceptado', icon: '✅', gradient: 'from-emerald-500 to-green-600', bg: 'bg-emerald-50', border: 'border-emerald-200', badge: 'bg-emerald-100 text-emerald-700' },
        { status: 'Rejected', label: 'Rechazado', icon: '❌', gradient: 'from-red-500 to-rose-600', bg: 'bg-red-50', border: 'border-red-200', badge: 'bg-red-100 text-red-700' },
    ];

    if (loading) return <div className="p-8 text-center text-gray-500">{t('clients.loading')}</div>;

    // --- INSTALLMENT DETAIL VIEW ---
    if (selectedQuote) {
        const paidCount = installments.filter(i => i.status === 'paid').length;
        const invoicedCount = installments.filter(i => i.status === 'invoiced').length;
        const totalCount = installments.length;
        const paidAmount = installments.filter(i => i.status === 'paid').reduce((s, i) => s + Number(i.amount), 0);
        const totalAmount = installments.reduce((s, i) => s + Number(i.amount), 0);
        const progress = totalCount > 0 ? Math.round(((paidCount + invoicedCount) / totalCount) * 100) : 0;

        return (
            <div className="space-y-6 max-w-5xl mx-auto">
                {/* Header */}
                <div className="flex items-center gap-3">
                    <button onClick={() => setSelectedQuote(null)} className="p-2 bg-white rounded-full shadow-sm border border-gray-100 hover:bg-gray-50">
                        <ArrowLeft size={18} />
                    </button>
                    <div className="flex-1">
                        <div className="flex items-center gap-3">
                            <h2 className="text-xl font-bold text-gray-900">{selectedQuote.quote_number}</h2>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${selectedQuote.status === 'Accepted' ? 'bg-green-100 text-green-800' : selectedQuote.status === 'Sent' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>{selectedQuote.status}</span>
                        </div>
                        <p className="text-sm text-gray-500 mt-0.5">{getEntityName(selectedQuote)} — Total: <strong>{Number(selectedQuote.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })} {selectedQuote.currency}</strong></p>
                    </div>
                </div>

                {/* Progress */}
                {totalCount > 0 && (
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-semibold text-gray-700">Progreso de Cuotas</span>
                            <span className="text-xs text-gray-500">{paidCount} pagadas / {invoicedCount} facturadas / {totalCount} total</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3">
                            <div className="bg-gradient-to-r from-green-500 to-emerald-400 h-3 rounded-full transition-all" style={{ width: `${progress}%` }} />
                        </div>
                        <div className="flex justify-between mt-2 text-xs text-gray-500">
                            <span>Cobrado: {paidAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })} {selectedQuote.currency}</span>
                            <span>Pendiente: {(totalAmount - paidAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })} {selectedQuote.currency}</span>
                        </div>
                    </div>
                )}

                {/* Actions */}
                <div className="flex gap-3">
                    <button onClick={() => { setGenForm({ num: 1, start_date: new Date().toISOString().split('T')[0] }); setShowGenerateModal(true); }}
                        className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl text-sm font-semibold hover:from-blue-700 hover:to-indigo-700 shadow-sm">
                        <CreditCard size={16} /> Generar Cuotas
                    </button>
                </div>

                {/* Installments list */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="px-5 py-4 bg-gray-50/50 border-b border-gray-100 flex items-center gap-2">
                        <CreditCard size={16} className="text-indigo-500" />
                        <h4 className="font-semibold text-gray-900 text-sm">Cuotas ({totalCount})</h4>
                    </div>

                    {installmentsLoading ? (
                        <div className="p-8 text-center text-gray-500 text-sm">Cargando cuotas...</div>
                    ) : installments.length === 0 ? (
                        <div className="p-8 text-center text-gray-400">
                            <CreditCard size={32} className="mx-auto mb-2 text-gray-300" />
                            <p className="text-sm">No hay cuotas generadas</p>
                            <p className="text-xs mt-1">Hacé clic en "Generar Cuotas" para desagregar el presupuesto</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-50">
                            {installments.map(inst => {
                                const statusCfg = inst.status === 'paid'
                                    ? { label: 'Pagada', bg: 'bg-green-100 text-green-700 border-green-200', Icon: CheckCircle2 }
                                    : inst.status === 'invoiced'
                                        ? { label: 'Facturada', bg: 'bg-blue-100 text-blue-700 border-blue-200', Icon: Receipt }
                                        : { label: 'Pendiente', bg: 'bg-amber-50 text-amber-700 border-amber-200', Icon: Clock };
                                const isOverdue = inst.status === 'pending' && new Date(inst.due_date) < new Date();
                                return (
                                    <div key={inst.id} className={`px-5 py-4 flex flex-col md:flex-row md:items-center gap-3 ${isOverdue ? 'bg-red-50/30' : ''}`}>
                                        <div className="flex items-center gap-3 flex-1 min-w-0">
                                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                                {inst.installment_number}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-semibold text-gray-900">Cuota {inst.installment_number}</span>
                                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${statusCfg.bg}`}>
                                                        <statusCfg.Icon size={10} /> {statusCfg.label}
                                                    </span>
                                                    {isOverdue && <span className="text-[10px] px-1.5 py-0.5 bg-red-100 text-red-600 rounded font-medium">Vencida</span>}
                                                </div>
                                                <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                                                    <span>Vence: {new Date(inst.due_date).toLocaleDateString('es-AR')}</span>
                                                    {inst.invoice_number && <span className="flex items-center gap-1"><Receipt size={10} />{inst.invoice_number}</span>}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="font-bold text-gray-900 text-lg">
                                            {Number(inst.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })} <span className="text-xs text-gray-500">{selectedQuote.currency}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {inst.status === 'pending' && (
                                                <select
                                                    value={inst.invoice_id || ''}
                                                    onChange={e => handleLinkInvoice(inst.id, e.target.value ? Number(e.target.value) : null)}
                                                    className="px-2 py-1.5 text-xs border border-gray-200 rounded-lg bg-white"
                                                >
                                                    <option value="">Vincular factura...</option>
                                                    {invoiceOptions.map(inv => <option key={inv.id} value={inv.id}>{inv.invoice_number}</option>)}
                                                </select>
                                            )}
                                            {(inst.status === 'invoiced' || inst.status === 'pending') && (
                                                <button onClick={() => handleMarkPaid(inst.id)} className="px-3 py-1.5 text-xs font-medium bg-green-50 text-green-700 border border-green-200 rounded-lg hover:bg-green-100 transition-colors">
                                                    Marcar pagada
                                                </button>
                                            )}
                                            <button onClick={() => handleDeleteInstallment(inst.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={14} /></button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Generate Modal */}
                {showGenerateModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                            <div className="px-6 py-4 bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center"><CreditCard size={20} className="text-white" /></div>
                                    <div>
                                        <h3 className="text-lg font-bold text-white">Generar Cuotas</h3>
                                        <p className="text-blue-100 text-xs">Desagregar presupuesto en cuotas</p>
                                    </div>
                                </div>
                                <button onClick={() => setShowGenerateModal(false)} className="p-1.5 hover:bg-white/20 rounded-lg"><X size={18} className="text-white" /></button>
                            </div>
                            <div className="p-6">
                                <p className="text-sm text-gray-500 mb-4">Se generarán cuotas iguales por el total del presupuesto: <strong>{Number(selectedQuote.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })} {selectedQuote.currency}</strong></p>
                                <div className="space-y-4">
                                    <div className="border border-blue-100 rounded-xl p-4 bg-blue-50/30">
                                        <label className="block text-xs font-semibold text-gray-500 mb-1.5">Cantidad de cuotas</label>
                                        <input type="number" min={1} max={60} value={genForm.num} onChange={e => setGenForm({ ...genForm, num: Number(e.target.value) })}
                                            className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-lg text-sm" />
                                        {genForm.num > 0 && (
                                            <p className="text-xs text-gray-400 mt-1">Monto por cuota: ~{(Number(selectedQuote.total_amount) / genForm.num).toLocaleString(undefined, { minimumFractionDigits: 2 })} {selectedQuote.currency}</p>
                                        )}
                                    </div>
                                    <div className="border border-purple-100 rounded-xl p-4 bg-purple-50/30">
                                        <label className="block text-xs font-semibold text-gray-500 mb-1.5">Fecha primera cuota</label>
                                        <input type="date" value={genForm.start_date} onChange={e => setGenForm({ ...genForm, start_date: e.target.value })}
                                            className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-lg text-sm" />
                                    </div>
                                </div>
                            </div>
                            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
                                <button onClick={() => setShowGenerateModal(false)} className="px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg font-medium">Cancelar</button>
                                <button onClick={handleGenerateInstallments} className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg text-sm font-semibold shadow-sm hover:shadow-md transition-all">Generar</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0 h-auto sm:h-16 py-4 sm:py-0 bg-white sm:bg-transparent px-4 sm:px-0 rounded-xl sm:rounded-none shadow-sm sm:shadow-none border border-gray-100 sm:border-transparent">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">{t('quotes.title')}</h1>
                    <p className="text-sm text-gray-500 mt-1">{t('quotes.subtitle')}</p>
                </div>
                <div className="flex items-center gap-3">
                    {/* View Toggle */}
                    <div className="flex bg-gray-100 p-1 rounded-lg border border-gray-200">
                        <button
                            onClick={() => setViewMode('list')}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${viewMode === 'list' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            <List size={16} />
                            Lista
                        </button>
                        <button
                            onClick={() => setViewMode('kanban')}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${viewMode === 'kanban' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            <LayoutGrid size={16} />
                            Kanban
                        </button>
                    </div>
                    <button
                        onClick={openAddModal}
                        className="h-10 inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm font-medium text-sm"
                    >
                        <Plus size={18} />
                        {t('quotes.newQuote')}
                    </button>
                </div>
            </div>

            {/* ══════ KANBAN VIEW ══════ */}
            {viewMode === 'kanban' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                    {kanbanColumns.map(col => {
                        const columnQuotes = quotes.filter(q => q.status === col.status);
                        const columnTotal = columnQuotes.reduce((sum, q) => sum + Number(q.total_amount), 0);
                        return (
                            <div
                                key={col.status}
                                className={`rounded-2xl border-2 ${col.border} ${col.bg} min-h-[400px] flex flex-col transition-all duration-200`}
                                onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('ring-2', 'ring-offset-2', 'ring-blue-400', 'scale-[1.01]'); }}
                                onDragLeave={(e) => { e.currentTarget.classList.remove('ring-2', 'ring-offset-2', 'ring-blue-400', 'scale-[1.01]'); }}
                                onDrop={(e) => {
                                    e.preventDefault();
                                    e.currentTarget.classList.remove('ring-2', 'ring-offset-2', 'ring-blue-400', 'scale-[1.01]');
                                    if (draggedQuoteId !== null) {
                                        handleStatusChange(draggedQuoteId, col.status);
                                        setDraggedQuoteId(null);
                                    }
                                }}
                            >
                                {/* Column header */}
                                <div className={`px-4 py-3 bg-gradient-to-r ${col.gradient} rounded-t-xl`}>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="text-lg">{col.icon}</span>
                                            <h3 className="font-bold text-white text-sm">{col.label}</h3>
                                        </div>
                                        <span className="bg-white/20 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                                            {columnQuotes.length}
                                        </span>
                                    </div>
                                    <p className="text-white/80 text-xs mt-1 font-medium">
                                        Total: {columnTotal.toLocaleString('es-AR', { minimumFractionDigits: 0 })}
                                    </p>
                                </div>

                                {/* Column body - cards */}
                                <div className="flex-1 p-3 space-y-3 overflow-y-auto max-h-[calc(100vh-320px)]">
                                    {columnQuotes.length === 0 && (
                                        <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                                            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-2">
                                                <FileText size={20} className="text-gray-300" />
                                            </div>
                                            <p className="text-xs">Sin presupuestos</p>
                                            <p className="text-[10px] mt-0.5">Arrastrá aquí para mover</p>
                                        </div>
                                    )}
                                    {columnQuotes.map(quote => (
                                        <div
                                            key={quote.id}
                                            draggable
                                            onDragStart={() => setDraggedQuoteId(quote.id)}
                                            onDragEnd={() => setDraggedQuoteId(null)}
                                            className={`bg-white rounded-xl border border-gray-100 shadow-sm p-4 cursor-grab active:cursor-grabbing hover:shadow-md transition-all duration-200 group ${draggedQuoteId === quote.id ? 'opacity-50 scale-95 rotate-1' : ''
                                                }`}
                                        >
                                            {/* Drag handle + number */}
                                            <div className="flex items-start justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    <GripVertical size={14} className="text-gray-300 group-hover:text-gray-400 flex-shrink-0" />
                                                    <span className="font-bold text-gray-900 text-sm">{quote.quote_number}</span>
                                                </div>
                                                {quote.file_url && (
                                                    <a href={quote.file_url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-700" onClick={e => e.stopPropagation()}>
                                                        <FileText size={14} />
                                                    </a>
                                                )}
                                            </div>

                                            {/* Entity name */}
                                            <div className="mb-3">
                                                <p className="text-sm font-medium text-gray-800 leading-tight">{getEntityName(quote)}</p>
                                                <p className="text-[10px] text-gray-400 mt-0.5">
                                                    {quote.client_id ? 'Cliente' : quote.lead_id ? 'Lead' : ''}
                                                </p>
                                            </div>

                                            {/* Amount */}
                                            <div className="bg-gray-50 rounded-lg px-3 py-2 mb-3">
                                                <p className="text-lg font-bold text-gray-900">
                                                    {Number(quote.total_amount).toLocaleString('es-AR', { minimumFractionDigits: 0 })}
                                                    <span className="text-xs font-medium text-gray-500 ml-1">{quote.currency}</span>
                                                </p>
                                            </div>

                                            {/* Footer: dates + actions */}
                                            <div className="flex items-center justify-between">
                                                <div className="text-[10px] text-gray-400 space-y-0.5">
                                                    <p>Emitido: {new Date(quote.issue_date).toLocaleDateString('es-AR')}</p>
                                                    <p>Vence: {new Date(quote.expiry_date).toLocaleDateString('es-AR')}</p>
                                                </div>
                                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={(e) => { e.stopPropagation(); openQuoteDetail(quote); }} className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg" title="Cuotas">
                                                        <CreditCard size={14} />
                                                    </button>
                                                    {quote.status === 'Accepted' && (
                                                        <button onClick={(e) => { e.stopPropagation(); handleCreateSalesOrder(quote); }} className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg" title="Generar Pedido">
                                                            <ClipboardList size={14} />
                                                        </button>
                                                    )}
                                                    <button onClick={(e) => { e.stopPropagation(); handleCreateProject(quote); }} className="p-1.5 text-gray-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg" title="Crear Proyecto">
                                                        <FolderKanban size={14} />
                                                    </button>
                                                    <button onClick={(e) => { e.stopPropagation(); openEditModal(quote); }} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg" title="Editar">
                                                        <Pencil size={14} />
                                                    </button>
                                                    <button onClick={(e) => { e.stopPropagation(); handleDelete(quote.id); }} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg" title="Eliminar">
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Seller badge */}
                                            {quote.seller_id && (
                                                <div className="mt-2 pt-2 border-t border-gray-50">
                                                    <p className="text-[10px] text-gray-400">
                                                        🧑‍💼 {sellers.find(s => s.id === quote.seller_id)?.full_name || '—'}
                                                        {(quote.commission_pct ?? 0) > 0 && (
                                                            <span className="text-green-600 font-semibold ml-1">
                                                                ({quote.commission_pct}%)
                                                            </span>
                                                        )}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ══════ LIST VIEW ══════ */}
            {viewMode === 'list' && <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden w-full">
                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto w-full">
                    <table className="w-full text-sm text-left min-w-[800px]">
                        <thead className="text-xs text-gray-500 bg-gray-50/80 uppercase border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-4 font-semibold">{t('quotes.quoteNumber')}</th>
                                <th className="px-6 py-4 font-semibold">{t('quotes.entity')}</th>
                                <th className="px-6 py-4 font-semibold">{t('quotes.date')}</th>
                                <th className="px-6 py-4 font-semibold">{t('common.status')}</th>
                                <th className="px-6 py-4 font-semibold text-right">{t('quotes.amount')}</th>
                                <th className="px-6 py-4 font-semibold">Vendedor</th>
                                <th className="px-6 py-4 font-semibold text-right">{t('common.actions')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {quotes.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                                        {t('quotes.noQuotes')}
                                    </td>
                                </tr>
                            ) : (
                                quotes.map((quote) => (
                                    <tr key={quote.id} className="hover:bg-gray-50/50 transition-colors cursor-pointer" onClick={() => openQuoteDetail(quote)}>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className="font-medium text-gray-900">{quote.quote_number}</div>
                                                {quote.file_url && (
                                                    <a href={quote.file_url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-700" title="View Document">
                                                        <FileText size={16} />
                                                    </a>
                                                )}
                                            </div>
                                            <div className="text-xs text-gray-500 hidden md:block">{t('quotes.validUntil')} {quote.expiry_date}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-gray-900">
                                                {getEntityName(quote)}
                                            </div>
                                            <div className="text-xs text-gray-500">
                                                {quote.client_id ? t('quotes.account') : (quote.lead_id ? t('quotes.lead') : '')}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-gray-600">{quote.issue_date}</td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium 
                                                ${quote.status === 'Accepted' ? 'bg-green-100 text-green-800' :
                                                    quote.status === 'Sent' ? 'bg-blue-100 text-blue-800' :
                                                        quote.status === 'Rejected' ? 'bg-red-100 text-red-800' :
                                                            'bg-gray-100 text-gray-800'}`}>
                                                {quote.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="font-medium text-gray-900">
                                                {quote.total_amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </div>
                                            <div className="text-xs text-gray-500 font-medium">{quote.currency}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {quote.seller_id ? (
                                                <div>
                                                    <div className="text-sm font-medium text-gray-800">
                                                        {sellers.find(s => s.id === quote.seller_id)?.full_name || '—'}
                                                    </div>
                                                    {(quote.commission_pct ?? 0) > 0 && (
                                                        <div className="text-[11px] text-green-600 font-semibold">
                                                            {quote.commission_pct}% → {(quote.total_amount * (quote.commission_pct || 0) / 100).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} {quote.currency}
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="text-xs text-gray-400">—</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleCreateProject(quote); }}
                                                    className="p-1.5 text-gray-400 hover:text-violet-600 bg-white hover:bg-violet-50 rounded-lg shadow-sm border border-transparent hover:border-violet-100 transition-colors"
                                                    title="Crear Proyecto"
                                                >
                                                    <FolderKanban size={18} />
                                                </button>
                                                {quote.status === 'Accepted' && (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleCreateSalesOrder(quote); }}
                                                        className="p-1.5 text-gray-400 hover:text-emerald-600 bg-white hover:bg-emerald-50 rounded-lg shadow-sm border border-transparent hover:border-emerald-100 transition-colors"
                                                        title="Generar Pedido"
                                                    >
                                                        <ClipboardList size={18} />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); openEditModal(quote); }}
                                                    className="p-1.5 text-gray-400 hover:text-blue-600 bg-white hover:bg-blue-50 rounded-lg shadow-sm border border-transparent hover:border-blue-100 transition-colors"
                                                    title={t('common.edit')}
                                                >
                                                    <Pencil size={18} />
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleDelete(quote.id); }}
                                                    className="p-1.5 text-gray-400 hover:text-red-600 bg-white hover:bg-red-50 rounded-lg shadow-sm border border-transparent hover:border-red-100 transition-colors"
                                                    title={t('common.delete')}
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden grid grid-cols-1 gap-4 p-4 bg-gray-50">
                    {quotes.map((quote) => (
                        <div key={quote.id} className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex flex-col space-y-4">
                            <div className="flex justify-between items-start">
                                <div className="flex items-center gap-2">
                                    <h3 className="font-bold text-gray-900 text-lg leading-tight">{quote.quote_number}</h3>
                                    {quote.file_url && (
                                        <a href={quote.file_url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-700 bg-blue-50 p-1.5 rounded-md" title="View Document">
                                            <FileText size={16} />
                                        </a>
                                    )}
                                </div>
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium shrink-0 ml-2
                                    ${quote.status === 'Accepted' ? 'bg-green-100 text-green-800' :
                                        quote.status === 'Sent' ? 'bg-blue-100 text-blue-800' :
                                            quote.status === 'Rejected' ? 'bg-red-100 text-red-800' :
                                                'bg-gray-100 text-gray-800'}`}>
                                    {quote.status}
                                </span>
                            </div>

                            <div className="bg-gray-50 p-3 rounded-lg border border-gray-100/50">
                                <p className="font-medium text-gray-900">{getEntityName(quote)}</p>
                                <p className="text-xs text-gray-500 mt-0.5">
                                    {quote.client_id ? t('quotes.account') : (quote.lead_id ? t('quotes.lead') : '')}
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-sm">
                                <div>
                                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-0.5">{t('quotes.date')}</p>
                                    <p className="font-medium text-gray-700">{quote.issue_date}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-0.5">{t('quotes.validUntil')}</p>
                                    <p className="font-medium text-gray-700">{quote.expiry_date}</p>
                                </div>
                            </div>

                            <div className="flex justify-between items-end border-t border-gray-50 pt-4 mt-2">
                                <div>
                                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">{t('quotes.amount')}</p>
                                    <p className="font-mono font-bold text-gray-900 text-xl">
                                        {Number(quote.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        <span className="text-sm font-medium text-gray-500 ml-1">{quote.currency}</span>
                                    </p>
                                </div>
                                <div className="flex space-x-2">
                                    <button
                                        onClick={() => handleCreateProject(quote)}
                                        className="p-2 text-gray-500 hover:text-violet-600 transition-colors bg-gray-50 hover:bg-violet-50 rounded-lg"
                                        title="Crear Proyecto"
                                    >
                                        <FolderKanban size={18} />
                                    </button>
                                    <button
                                        onClick={() => openEditModal(quote)}
                                        className="p-2 text-gray-500 hover:text-blue-600 transition-colors bg-gray-50 hover:bg-blue-50 rounded-lg"
                                        title={t('common.edit')}
                                    >
                                        <Pencil size={18} />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(quote.id)}
                                        className="p-2 text-gray-500 hover:text-red-600 transition-colors bg-gray-50 hover:bg-red-50 rounded-lg"
                                        title={t('common.delete')}
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                    {quotes.length === 0 && (
                        <div className="p-8 text-center text-gray-500 bg-white rounded-xl border border-dashed border-gray-300">
                            {t('quotes.noQuotes')}
                        </div>
                    )}
                </div>
            </div>}

            {/* Quote Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-xl mx-4">
                        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4 flex items-center justify-between z-10">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center"><FileText size={20} className="text-white" /></div>
                                <div>
                                    <h3 className="text-lg font-bold text-white">
                                        {editingQuoteId ? t('quotes.editQuote') : t('quotes.newQuote')}
                                    </h3>
                                    <p className="text-blue-100 text-xs">Complete los datos del presupuesto</p>
                                </div>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors">
                                <X size={18} className="text-white" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="col-span-1 md:col-span-2 flex gap-4">
                                    <div className="w-1/3">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">{t('quotes.entityType')}</label>
                                        <div className="flex bg-gray-100 p-1 rounded-lg">
                                            <button
                                                type="button"
                                                onClick={() => setEntityType("client")}
                                                className={`flex-1 text-sm py-1.5 rounded-md transition-colors ${entityType === "client" ? "bg-white text-gray-900 shadow-sm font-medium" : "text-gray-500 hover:text-gray-700"}`}
                                            >
                                                {t('quotes.account')}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setEntityType("lead")}
                                                className={`flex-1 text-sm py-1.5 rounded-md transition-colors ${entityType === "lead" ? "bg-white text-gray-900 shadow-sm font-medium" : "text-gray-500 hover:text-gray-700"}`}
                                            >
                                                {t('quotes.lead')}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="w-2/3">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            {entityType === "client" ? t('quotes.linkToAccount') : t('quotes.linkToLead')}
                                        </label>
                                        {entityType === "client" ? (
                                            <select
                                                required
                                                value={formData.client_id}
                                                onChange={(e) => setFormData({ ...formData, client_id: e.target.value, lead_id: "" })}
                                                className="w-full border border-gray-200 rounded-lg px-4 py-2 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                            >
                                                <option value="">{t('quotes.selectAccount')}</option>
                                                {clients.map(c => (
                                                    <option key={c.id} value={c.id}>{c.name}</option>
                                                ))}
                                            </select>
                                        ) : (
                                            <select
                                                required
                                                value={formData.lead_id}
                                                onChange={(e) => setFormData({ ...formData, lead_id: e.target.value, client_id: "" })}
                                                className="w-full border border-gray-200 rounded-lg px-4 py-2 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                            >
                                                <option value="">{t('quotes.selectLead')}</option>
                                                {leads.map(l => (
                                                    <option key={l.id} value={l.id}>{l.company_name}</option>
                                                ))}
                                            </select>
                                        )}
                                    </div>
                                </div>

                                {/* Seller */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Vendedor</label>
                                    <select
                                        value={formData.seller_id}
                                        onChange={(e) => {
                                            const sid = e.target.value;
                                            const seller = sellers.find(s => s.id === Number(sid));
                                            setFormData({ ...formData, seller_id: sid, commission_pct: seller?.commission_pct || formData.commission_pct });
                                        }}
                                        className="w-full border border-gray-200 rounded-lg px-4 py-2 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                    >
                                        <option value="">— Sin vendedor —</option>
                                        {sellers.map(s => (
                                            <option key={s.id} value={s.id}>{s.full_name}{s.commission_pct ? ` (${s.commission_pct}%)` : ''}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Commission */}
                                {formData.seller_id && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Comisión (%)</label>
                                        <div className="flex items-center gap-3">
                                            <input
                                                type="number"
                                                min="0"
                                                max="100"
                                                step="0.5"
                                                value={formData.commission_pct}
                                                onChange={(e) => setFormData({ ...formData, commission_pct: Number(e.target.value) })}
                                                className="w-24 border border-gray-200 rounded-lg px-3 py-2 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-center"
                                            />
                                            <span className="text-sm text-gray-500">%</span>
                                            {formData.commission_pct > 0 && (
                                                <span className="text-sm text-green-600 font-semibold">
                                                    ≈ {((calculateTotals().total_amount) * formData.commission_pct / 100).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} {formData.currency}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('quotes.issueDate')}</label>
                                    <input
                                        type="date"
                                        required
                                        value={formData.issue_date}
                                        onChange={(e) => setFormData({ ...formData, issue_date: e.target.value })}
                                        className="w-full border border-gray-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('quotes.expiryDate')}</label>
                                    <input
                                        type="date"
                                        required
                                        value={formData.expiry_date}
                                        onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                                        className="w-full border border-gray-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('common.status')}</label>
                                    <select
                                        value={formData.status}
                                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                        className="w-full border border-gray-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
                                    >
                                        {statuses.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('quotes.currency')}</label>
                                    <select
                                        value={formData.currency}
                                        onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                                        className="w-full border border-gray-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
                                    >
                                        {currencies.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                            </div>

                            {/* Quote Items Section */}
                            <div className="pt-6 border-t border-gray-100">
                                <div className="flex justify-between items-center mb-4">
                                    <h4 className="text-md font-bold text-gray-900">{t('quotes.lineItems')}</h4>
                                    <button
                                        type="button"
                                        onClick={handleAddItem}
                                        className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                                    >
                                        <Plus size={16} /> {t('quotes.addItem')}
                                    </button>
                                </div>

                                <div className="space-y-3">
                                    {formData.items.map((item, index) => (
                                        <div key={index} className="flex flex-wrap md:flex-nowrap gap-3 items-start bg-gray-50 p-3 rounded-xl border border-gray-100">
                                            <div className="w-full md:w-1/3">
                                                <select
                                                    value={item.product_id || ""}
                                                    onChange={(e) => handleItemChange(index, "product_id", e.target.value)}
                                                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                                                >
                                                    <option value="">{t('quotes.customItem')}</option>
                                                    {products.map(p => (
                                                        <option key={p.id} value={p.id}>{p.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="w-full md:w-1/4">
                                                <input
                                                    type="text"
                                                    placeholder={t('quotes.description')}
                                                    value={item.description}
                                                    onChange={(e) => handleItemChange(index, "description", e.target.value)}
                                                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                                                    required
                                                />
                                            </div>
                                            <div className="w-1/3 md:w-24">
                                                <input
                                                    type="number"
                                                    min="0.01" step="0.01"
                                                    placeholder={t('quotes.qty')}
                                                    value={item.quantity}
                                                    onChange={(e) => handleItemChange(index, "quantity", e.target.value)}
                                                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                                                    required
                                                />
                                            </div>
                                            <div className="w-1/3 md:w-32">
                                                <input
                                                    type="number"
                                                    min="0" step="0.01"
                                                    placeholder={t('quotes.price')}
                                                    value={item.unit_price}
                                                    onChange={(e) => handleItemChange(index, "unit_price", e.target.value)}
                                                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                                                    required
                                                />
                                            </div>
                                            <div className="w-1/3 md:w-32 pt-2 px-2 text-right font-medium text-gray-900 border border-transparent">
                                                {item.total_price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveItem(index)}
                                                className="mt-1 p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    ))}
                                    {formData.items.length === 0 && (
                                        <div className="text-center py-6 text-sm text-gray-500 bg-gray-50 rounded-xl border border-gray-100 border-dashed">
                                            {t('quotes.noItems')}
                                        </div>
                                    )}
                                </div>

                                <div className="mt-4 flex flex-col md:flex-row justify-between gap-6">
                                    <div className="w-full md:w-1/2">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">{t('quotes.customAmount')}</label>
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-medium text-gray-500">{formData.currency}</span>
                                            <input
                                                type="number"
                                                min="0" step="0.01"
                                                value={formData.custom_amount || ""}
                                                onChange={(e) => setFormData({ ...formData, custom_amount: Number(e.target.value) })}
                                                className="w-full border border-gray-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                                placeholder={t('quotes.customAmountPlaceholder')}
                                            />
                                        </div>
                                    </div>

                                    <div className="bg-gray-50 rounded-xl p-4 w-full md:min-w-[240px] border border-gray-100 h-fit">
                                        {formData.items.length > 0 && (
                                            <div className="flex justify-between items-center text-sm font-medium text-gray-500 mb-1">
                                                <span>{t('quotes.lineItems')}</span>
                                                <span>{calculateTotals().itemSubtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                            </div>
                                        )}
                                        {Number(formData.custom_amount) > 0 && (
                                            <div className="flex justify-between items-center text-sm font-medium text-gray-500 mb-1">
                                                <span>{t('quotes.customAmount')}</span>
                                                <span>{Number(formData.custom_amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                            </div>
                                        )}
                                        <div className="flex justify-between items-center text-sm font-medium text-gray-600 mb-1">
                                            <span>{t('quotes.subtotal')} ({formData.currency})</span>
                                            <span>{calculateTotals().subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-lg font-bold text-gray-900 pt-2 border-t border-gray-200 mt-2">
                                            <span>{t('quotes.total')} ({formData.currency})</span>
                                            <span>{calculateTotals().total_amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('quotes.notes')}</label>
                                    <textarea
                                        value={formData.notes}
                                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                        rows={3}
                                        className="w-full border border-gray-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                        placeholder={t('quotes.notesPlaceholder')}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('quotes.attachment')}</label>
                                    <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-xl hover:border-blue-500 transition-colors bg-gray-50">
                                        <div className="space-y-1 text-center">
                                            <UploadCloud className="mx-auto h-12 w-12 text-gray-400" />
                                            <div className="flex text-sm text-gray-600 justify-center">
                                                <label className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 px-2 py-1">
                                                    <span>{t('quotes.uploadFile')}</span>
                                                    <input type="file" className="sr-only" onChange={(e) => setQuoteFile(e.target.files?.[0] || null)} />
                                                </label>
                                            </div>
                                            <p className="text-xs text-gray-500">
                                                {quoteFile ? quoteFile.name : (formData.file_url ? "Current file: " + formData.file_url.split('/').pop() : "PDF, DOCX up to 10MB")}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-4">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-gray-700 hover:bg-gray-100 rounded-xl transition-colors font-medium">
                                    {t('common.cancel')}
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:shadow-md rounded-xl transition-all font-medium shadow-sm"
                                    disabled={!formData.client_id && !formData.lead_id}
                                >
                                    {editingQuoteId ? t('quotes.editQuote') : t('quotes.newQuote')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Lead-to-Client Conversion Warning Modal */}
            {convertWarningQuote && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
                        <div className="px-6 py-4 bg-gradient-to-r from-amber-500 to-orange-500 flex items-center gap-3">
                            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                                <AlertTriangle size={20} className="text-white" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-white">Prospecto sin convertir</h3>
                                <p className="text-amber-100 text-xs">Se requiere conversión a cuenta</p>
                            </div>
                            <button onClick={() => setConvertWarningQuote(null)} className="ml-auto p-1.5 hover:bg-white/20 rounded-lg transition-colors">
                                <X size={18} className="text-white" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <p className="text-gray-700">
                                El presupuesto <span className="font-bold">{convertWarningQuote.quote_number}</span> está vinculado al prospecto <span className="font-bold text-orange-600">{getEntityName(convertWarningQuote)}</span>.
                            </p>
                            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                                <p className="text-sm text-amber-800">
                                    Para crear un proyecto, primero se debe convertir el prospecto en una cuenta (cliente). Esta acción:
                                </p>
                                <ul className="text-sm text-amber-700 mt-2 space-y-1 list-disc list-inside">
                                    <li>Creará una nueva cuenta con los datos del prospecto</li>
                                    <li>Reasignará los presupuestos vinculados a la nueva cuenta</li>
                                    <li>Marcará el prospecto como "Convertido"</li>
                                </ul>
                            </div>
                        </div>
                        <div className="px-6 py-4 bg-gray-50 flex justify-end gap-3">
                            <button
                                onClick={() => setConvertWarningQuote(null)}
                                className="px-4 py-2.5 text-gray-600 hover:bg-gray-200 rounded-xl font-medium transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleConvertAndCreateProject}
                                disabled={converting}
                                className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:shadow-md rounded-xl transition-all font-medium shadow-sm disabled:opacity-50"
                            >
                                {converting ? 'Convirtiendo...' : 'Convertir y Crear Proyecto'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
