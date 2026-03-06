import { useState, useEffect, useMemo } from "react";
import api from "../api/client";
import {
    FileText, DollarSign, Search, Plus, X, Edit2, Trash2, Filter,
    ChevronDown, Calendar, Package, CreditCard, AlertTriangle, TrendingUp
} from "lucide-react";

interface Payment {
    id: number;
    provider_service_id: number;
    provider_name: string;
    provider_id: number;
    service_name: string;
    service_currency: string;
    service_cost: number;
    period_month: number;
    period_year: number;
    amount: number;
    currency: string;
    exchange_rate: number;
    amount_ars: number;
    payment_date: string | null;
    invoice_number: string | null;
    receipt_file: string | null;
    created_at: string | null;
    created_by: string | null;
    updated_at: string | null;
    updated_by: string | null;
}
interface ProviderOption { id: number; name: string; }
interface ServiceOption { id: number; provider_id: number; name: string; cost_price: number; currency: string; billing_cycle: string; status: string; }

const MONTH_NAMES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

export default function ServicePurchases() {
    const [payments, setPayments] = useState<Payment[]>([]);
    const [providers, setProviders] = useState<ProviderOption[]>([]);
    const [services, setServices] = useState<ServiceOption[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [filterProvider, setFilterProvider] = useState<number | "">("");
    const [filterMonth, setFilterMonth] = useState<number | "">("");
    const [filterYear, setFilterYear] = useState<number | "">("");
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);

    // Form state
    const [formProvider, setFormProvider] = useState<number | "">("");
    const [formService, setFormService] = useState<number | "">("");
    const [formAmount, setFormAmount] = useState("");
    const [formMonth, setFormMonth] = useState(new Date().getMonth() + 1);
    const [formYear, setFormYear] = useState(new Date().getFullYear());
    const [formDate, setFormDate] = useState(new Date().toISOString().split("T")[0]);
    const [formInvoice, setFormInvoice] = useState("");

    const load = async () => {
        setLoading(true);
        try {
            const r = await api.get("/service-payments/enriched");
            setPayments(r.data.payments || []);
            setProviders(r.data.providers || []);
            setServices(r.data.services || []);
        } catch { }
        finally { setLoading(false); }
    };

    useEffect(() => { load(); }, []);

    // Filter logic
    const filtered = useMemo(() => {
        let list = payments;
        if (search) {
            const s = search.toLowerCase();
            list = list.filter(p =>
                p.provider_name.toLowerCase().includes(s) ||
                p.service_name.toLowerCase().includes(s) ||
                p.invoice_number?.toLowerCase().includes(s)
            );
        }
        if (filterProvider) list = list.filter(p => p.provider_id === filterProvider);
        if (filterMonth) list = list.filter(p => p.period_month === filterMonth);
        if (filterYear) list = list.filter(p => p.period_year === filterYear);
        return list;
    }, [payments, search, filterProvider, filterMonth, filterYear]);

    // KPIs
    const totalArs = filtered.reduce((s, p) => s + p.amount_ars, 0);
    const totalCount = filtered.length;
    const uniqueProviders = new Set(filtered.map(p => p.provider_id)).size;
    const uniqueYears = [...new Set(payments.map(p => p.period_year))].sort((a, b) => b - a);

    // Services filtered by selected provider
    const filteredServices = formProvider ? services.filter(s => s.provider_id === formProvider) : services;

    const openCreate = () => {
        setEditingId(null);
        setFormProvider("");
        setFormService("");
        setFormAmount("");
        setFormMonth(new Date().getMonth() + 1);
        setFormYear(new Date().getFullYear());
        setFormDate(new Date().toISOString().split("T")[0]);
        setFormInvoice("");
        setShowModal(true);
    };

    const openEdit = (p: Payment) => {
        setEditingId(p.id);
        setFormProvider(p.provider_id);
        setFormService(p.provider_service_id);
        setFormAmount(p.amount.toString());
        setFormMonth(p.period_month);
        setFormYear(p.period_year);
        setFormDate(p.payment_date || new Date().toISOString().split("T")[0]);
        setFormInvoice(p.invoice_number || "");
        setShowModal(true);
    };

    const handleSave = async () => {
        if (!formService || !formAmount) return;
        try {
            if (editingId) {
                await api.put(`/service-payments/${editingId}`, {
                    amount: parseFloat(formAmount),
                    period_month: formMonth,
                    period_year: formYear,
                    payment_date: formDate,
                    invoice_number: formInvoice || null,
                    updated_by: "admin",
                });
            } else {
                await api.post("/service-payments", {
                    provider_service_id: formService,
                    amount: parseFloat(formAmount),
                    period_month: formMonth,
                    period_year: formYear,
                    payment_date: formDate,
                    invoice_number: formInvoice || null,
                    created_by: "admin",
                });
            }
            setShowModal(false);
            load();
        } catch (e: any) {
            alert("Error: " + (e.response?.data?.detail || e.message));
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("¿Eliminar este pago?")) return;
        try {
            await api.delete(`/service-payments/${id}`);
            load();
        } catch { }
    };

    const fmtCurrency = (amount: number, currency: string) => {
        const prefix = currency === "ARS" ? "$ " : "u$d ";
        return `${prefix}${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-black tracking-tight text-gray-900 flex items-center gap-2">
                        <CreditCard size={24} className="text-indigo-600" />
                        Compras de Servicios
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Gestión de pagos a proveedores por servicios contratados</p>
                </div>
                <button onClick={openCreate}
                    className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg text-sm font-bold shadow-lg shadow-indigo-200 hover:shadow-xl transition-all">
                    <Plus size={16} /> Registrar Pago
                </button>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                    <p className="text-[11px] text-gray-500 font-medium flex items-center gap-1"><FileText size={12} /> Total Pagos</p>
                    <p className="text-2xl font-black text-gray-900 mt-1">{totalCount}</p>
                </div>
                <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                    <p className="text-[11px] text-gray-500 font-medium flex items-center gap-1"><DollarSign size={12} /> Monto Total (ARS)</p>
                    <p className="text-2xl font-black text-gray-900 mt-1">$ {totalArs.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                </div>
                <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                    <p className="text-[11px] text-gray-500 font-medium flex items-center gap-1"><Package size={12} /> Proveedores</p>
                    <p className="text-2xl font-black text-gray-900 mt-1">{uniqueProviders}</p>
                </div>
                <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                    <p className="text-[11px] text-gray-500 font-medium flex items-center gap-1"><TrendingUp size={12} /> Ticket Promedio</p>
                    <p className="text-2xl font-black text-gray-900 mt-1">$ {totalCount > 0 ? (totalArs / totalCount).toLocaleString(undefined, { maximumFractionDigits: 0 }) : "0"}</p>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[200px]">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input type="text" placeholder="Buscar proveedor, servicio, factura..."
                        value={search} onChange={e => setSearch(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div className="flex items-center gap-2">
                    <Filter size={14} className="text-gray-400" />
                    <select value={filterProvider} onChange={e => setFilterProvider(e.target.value ? Number(e.target.value) : "")}
                        className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                        <option value="">Todos los proveedores</option>
                        {providers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    <select value={filterMonth} onChange={e => setFilterMonth(e.target.value ? Number(e.target.value) : "")}
                        className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                        <option value="">Todos los meses</option>
                        {MONTH_NAMES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                    </select>
                    <select value={filterYear} onChange={e => setFilterYear(e.target.value ? Number(e.target.value) : "")}
                        className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                        <option value="">Todos los años</option>
                        {uniqueYears.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                {loading ? (
                    <div className="py-16 text-center text-gray-400 animate-pulse">Cargando...</div>
                ) : filtered.length === 0 ? (
                    <div className="py-16 text-center text-gray-400">No hay pagos registrados</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-100">
                                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Período</th>
                                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Proveedor</th>
                                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Servicio</th>
                                    <th className="text-right px-4 py-3 font-semibold text-gray-600">Monto</th>
                                    <th className="text-right px-4 py-3 font-semibold text-gray-600">ARS equiv.</th>
                                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Fecha Pago</th>
                                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Factura</th>
                                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Auditoría</th>
                                    <th className="text-center px-4 py-3 font-semibold text-gray-600">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filtered.map(p => (
                                    <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-4 py-3">
                                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-bold">
                                                <Calendar size={12} />
                                                {MONTH_NAMES[p.period_month - 1]} {p.period_year}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 font-medium text-gray-900">{p.provider_name}</td>
                                        <td className="px-4 py-3 text-gray-600">{p.service_name}</td>
                                        <td className="px-4 py-3 text-right font-bold text-gray-900">{fmtCurrency(p.amount, p.currency)}</td>
                                        <td className="px-4 py-3 text-right text-gray-500 text-xs">
                                            {p.currency !== "ARS" && (
                                                <span>$ {p.amount_ars.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                                            )}
                                            {p.currency !== "ARS" && (
                                                <span className="block text-[10px] text-gray-400">TC: {p.exchange_rate.toLocaleString()}</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-gray-600 text-xs">{p.payment_date || "—"}</td>
                                        <td className="px-4 py-3 text-gray-600 text-xs">{p.invoice_number || "—"}</td>
                                        <td className="px-4 py-3 text-[10px] text-gray-400">
                                            {p.created_by && <span className="block">Creado: {p.created_by}</span>}
                                            {p.updated_by && <span className="block">Editado: {p.updated_by}</span>}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <div className="flex items-center justify-center gap-1">
                                                <button onClick={() => openEdit(p)}
                                                    className="p-1.5 rounded-lg hover:bg-indigo-50 text-gray-400 hover:text-indigo-600 transition-colors" title="Editar">
                                                    <Edit2 size={14} />
                                                </button>
                                                <button onClick={() => handleDelete(p.id)}
                                                    className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors" title="Eliminar">
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
                        <div className="px-6 py-4 bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-between rounded-t-2xl">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center"><CreditCard size={20} className="text-white" /></div>
                                <div>
                                    <h3 className="font-bold text-lg text-white">{editingId ? "Editar Pago" : "Registrar Pago"}</h3>
                                    <p className="text-blue-100 text-xs">Complete los datos del pago</p>
                                </div>
                            </div>
                            <button onClick={() => setShowModal(false)} className="p-1.5 hover:bg-white/20 rounded-lg"><X size={18} className="text-white" /></button>
                        </div>

                        <div className="p-5 space-y-4">
                            {!editingId && (
                                <div className="border border-blue-100 rounded-xl p-4 bg-blue-50/30 space-y-3">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600 mb-1">Proveedor</label>
                                        <select value={formProvider} onChange={e => { setFormProvider(Number(e.target.value)); setFormService(""); }}
                                            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                                            <option value="">Seleccionar proveedor...</option>
                                            {providers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600 mb-1">Servicio</label>
                                        <select value={formService} onChange={e => {
                                            const svc = services.find(s => s.id === Number(e.target.value));
                                            setFormService(Number(e.target.value));
                                            if (svc) setFormAmount(svc.cost_price.toString());
                                        }}
                                            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                                            <option value="">Seleccionar servicio...</option>
                                            {filteredServices.map(s => (
                                                <option key={s.id} value={s.id}>{s.name} — {s.currency} {s.cost_price} ({s.billing_cycle})</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            )}

                            <div className="border border-purple-100 rounded-xl p-4 bg-purple-50/30 space-y-3">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600 mb-1">Monto</label>
                                        <input type="number" step="0.01" value={formAmount} onChange={e => setFormAmount(e.target.value)}
                                            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600 mb-1">Fecha de Pago</label>
                                        <input type="date" value={formDate} onChange={e => setFormDate(e.target.value)}
                                            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600 mb-1">Mes</label>
                                        <select value={formMonth} onChange={e => setFormMonth(Number(e.target.value))}
                                            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                                            {MONTH_NAMES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600 mb-1">Año</label>
                                        <input type="number" value={formYear} onChange={e => setFormYear(Number(e.target.value))}
                                            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
                                    </div>
                                </div>
                            </div>

                            <div className="border border-green-100 rounded-xl p-4 bg-green-50/30">
                                <label className="block text-xs font-semibold text-gray-600 mb-1">Nro. Factura (opcional)</label>
                                <input type="text" value={formInvoice} onChange={e => setFormInvoice(e.target.value)}
                                    placeholder="Ej: FA-00123"
                                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 p-5 border-t border-gray-100 rounded-b-2xl">
                            <button onClick={() => setShowModal(false)}
                                className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50">
                                Cancelar
                            </button>
                            <button onClick={handleSave}
                                className="px-6 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg shadow-lg hover:shadow-xl transition-all">
                                {editingId ? "Guardar Cambios" : "Registrar Pago"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
