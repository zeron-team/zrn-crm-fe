import { useState, useEffect } from "react";
import api from "../api/client";
import { Plus, Search, CreditCard, Pencil, Trash2, X, FileText, ArrowRight, DollarSign, Building2, Link2 } from "lucide-react";

interface PaymentOrder {
    id: number; number: string; date: string;
    client_id: number | null; client_name?: string;
    provider_id: number | null; provider_name?: string;
    invoice_id: number | null; invoice_number?: string;
    amount: number; currency: string; payment_method: string;
    status: string; reference: string; notes: string; created_at: string;
}
interface Client { id: number; name: string; }
interface Provider { id: number; name: string; }
interface InvoiceRef { id: number; invoice_number: string; client_id?: number; }

export default function PaymentOrders() {
    const [orders, setOrders] = useState<PaymentOrder[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [providers, setProviders] = useState<Provider[]>([]);
    const [invoices, setInvoices] = useState<InvoiceRef[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [autoNumber, setAutoNumber] = useState("");
    const [formData, setFormData] = useState({
        number: "", date: new Date().toISOString().split("T")[0],
        client_id: "", provider_id: "", invoice_id: "",
        amount: "", currency: "ARS", payment_method: "Transferencia", status: "Pendiente",
        reference: "", notes: "",
    });

    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        try {
            const [r1, r2, r3, r4] = await Promise.all([
                api.get("/payment-orders").catch(() => ({ data: [] })),
                api.get("/clients/").catch(() => ({ data: [] })),
                api.get("/providers/").catch(() => ({ data: [] })),
                api.get("/invoices/").catch(() => ({ data: [] })),
            ]);
            setOrders(Array.isArray(r1.data) ? r1.data : []);
            setClients(Array.isArray(r2.data) ? r2.data : []);
            setProviders(Array.isArray(r3.data) ? r3.data : []);
            setInvoices(Array.isArray(r4.data) ? r4.data.map((i: any) => ({ id: i.id, invoice_number: i.invoice_number, client_id: i.client_id })) : []);
        } catch { /* */ } finally { setLoading(false); }
    };

    const fetchNextNumber = async () => {
        try { const r = await api.get("/payment-orders/next-number"); setAutoNumber(r.data.next_number); } catch { setAutoNumber(""); }
    };

    const handleSubmit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        try {
            const payload = { ...formData, number: editingId ? formData.number : autoNumber, client_id: formData.client_id ? Number(formData.client_id) : null, provider_id: formData.provider_id ? Number(formData.provider_id) : null, invoice_id: formData.invoice_id ? Number(formData.invoice_id) : null, amount: Number(formData.amount) };
            if (editingId) await api.put(`/payment-orders/${editingId}`, payload);
            else await api.post("/payment-orders", payload);
            setIsModalOpen(false); resetForm(); fetchData();
        } catch (error) { console.error("Failed to save", error); }
    };

    const handleDelete = async (id: number) => { if (!confirm("¿Eliminar esta orden de pago?")) return; try { await api.delete(`/payment-orders/${id}`); fetchData(); } catch { /* */ } };

    const resetForm = () => {
        setEditingId(null);
        setFormData({ number: "", date: new Date().toISOString().split("T")[0], client_id: "", provider_id: "", invoice_id: "", amount: "", currency: "ARS", payment_method: "Transferencia", status: "Pendiente", reference: "", notes: "" });
    };

    const openEdit = (o: PaymentOrder) => {
        setEditingId(o.id);
        setFormData({ number: o.number, date: o.date, client_id: o.client_id?.toString() || "", provider_id: o.provider_id?.toString() || "", invoice_id: o.invoice_id?.toString() || "", amount: o.amount.toString(), currency: o.currency, payment_method: o.payment_method, status: o.status, reference: o.reference || "", notes: o.notes || "" });
        setIsModalOpen(true);
    };

    const handleInvoiceChange = (invId: string) => {
        setFormData(p => ({ ...p, invoice_id: invId }));
        if (invId) {
            const inv = invoices.find(i => i.id === Number(invId));
            if (inv?.client_id) setFormData(p => ({ ...p, invoice_id: invId, client_id: inv.client_id!.toString() }));
        }
    };

    const filtered = orders.filter(o => o.number?.toLowerCase().includes(search.toLowerCase()) || o.provider_name?.toLowerCase().includes(search.toLowerCase()) || o.client_name?.toLowerCase().includes(search.toLowerCase()));
    const statusColors: Record<string, string> = { "Pendiente": "bg-yellow-100 text-yellow-800", "Aprobada": "bg-blue-100 text-blue-800", "Pagada": "bg-green-100 text-green-800", "Rechazada": "bg-red-100 text-red-800" };

    if (loading) return <div className="flex justify-center items-center h-64"><div className="text-gray-500">Cargando...</div></div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100 gap-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-gray-900">Órdenes de Pago</h2>
                    <p className="text-sm text-gray-500">Gestión de órdenes de pago a proveedores</p>
                </div>
                <button onClick={() => { resetForm(); fetchNextNumber(); setIsModalOpen(true); }} className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-5 py-2.5 rounded-xl font-medium transition-all shadow-lg shadow-blue-200">
                    <Plus size={18} /><span>Nueva Orden de Pago</span>
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                <div className="relative">
                    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input type="text" placeholder="Buscar por número, proveedor o cliente..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                {filtered.length === 0 ? (
                    <div className="p-12 text-center">
                        <CreditCard size={48} className="mx-auto text-gray-300 mb-4" />
                        <h3 className="text-lg font-semibold text-gray-700 mb-2">No hay órdenes de pago</h3>
                        <p className="text-gray-500 text-sm">Creá tu primera orden de pago</p>
                    </div>
                ) : (
                    <>
                        <div className="hidden md:block">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider">
                                    <tr>
                                        <th className="p-4 text-left font-semibold">Número</th>
                                        <th className="p-4 text-left font-semibold">Fecha</th>
                                        <th className="p-4 text-left font-semibold">Cliente</th>
                                        <th className="p-4 text-left font-semibold">Proveedor</th>
                                        <th className="p-4 text-left font-semibold">Factura</th>
                                        <th className="p-4 text-right font-semibold">Monto</th>
                                        <th className="p-4 text-left font-semibold">Estado</th>
                                        <th className="p-4 text-center font-semibold">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {filtered.map(o => (
                                        <tr key={o.id} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="p-4 font-medium text-gray-900">{o.number}</td>
                                            <td className="p-4 text-gray-600">{new Date(o.date).toLocaleDateString()}</td>
                                            <td className="p-4 text-gray-600">{o.client_name || "-"}</td>
                                            <td className="p-4 text-gray-600">{o.provider_name || "-"}</td>
                                            <td className="p-4 text-gray-600">{o.invoice_number ? <span className="inline-flex items-center gap-1 text-indigo-600 font-medium"><Link2 size={12} />{o.invoice_number}</span> : "-"}</td>
                                            <td className="p-4 text-right font-mono font-medium text-gray-900">{o.currency} {Number(o.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                            <td className="p-4"><span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[o.status] || "bg-gray-100 text-gray-800"}`}>{o.status}</span></td>
                                            <td className="p-4 text-center">
                                                <div className="flex items-center justify-center space-x-1">
                                                    <button onClick={() => openEdit(o)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Pencil size={16} /></button>
                                                    <button onClick={() => handleDelete(o.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={16} /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="md:hidden divide-y divide-gray-100">
                            {filtered.map(o => (
                                <div key={o.id} className="p-4 flex items-center justify-between">
                                    <div>
                                        <p className="font-medium text-gray-900">{o.number}</p>
                                        <p className="text-xs text-gray-500">{o.client_name || o.provider_name || "-"} · {o.currency} {Number(o.amount).toLocaleString()}</p>
                                        {o.invoice_number && <p className="text-xs text-indigo-600 flex items-center gap-1 mt-0.5"><Link2 size={10} />{o.invoice_number}</p>}
                                        <span className={`inline-flex mt-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${statusColors[o.status] || "bg-gray-100 text-gray-800"}`}>{o.status}</span>
                                    </div>
                                    <div className="flex space-x-1">
                                        <button onClick={() => openEdit(o)} className="p-2 text-gray-400 hover:text-blue-600"><Pencil size={16} /></button>
                                        <button onClick={() => handleDelete(o.id)} className="p-2 text-gray-400 hover:text-red-600"><Trash2 size={16} /></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-5 text-white flex-shrink-0">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                    <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm"><CreditCard size={22} /></div>
                                    <div>
                                        <h2 className="text-lg font-bold">{editingId ? "Editar Orden de Pago" : "Nueva Orden de Pago"}</h2>
                                        <p className="text-blue-100 text-sm">{editingId ? `Orden: ${formData.number}` : 'Registrá los datos de la orden de pago'}</p>
                                        {!editingId && autoNumber && <p className="text-blue-200 text-xs mt-0.5">Próximo Nº: {autoNumber}</p>}
                                    </div>
                                </div>
                                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white/20 rounded-lg transition-colors"><X size={20} /></button>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 p-6 space-y-6">
                            {/* Datos Generales */}
                            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 space-y-4">
                                <h4 className="text-xs font-semibold text-indigo-700 uppercase tracking-wide flex items-center"><FileText size={14} className="mr-1.5" /> Datos Generales</h4>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-xs text-gray-600 mb-1">Número</label>
                                        <input type="text" readOnly value={editingId ? formData.number : autoNumber} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-gray-100 text-gray-600 cursor-not-allowed" />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-600 mb-1">Fecha *</label>
                                        <input type="date" required value={formData.date} onChange={e => setFormData(p => ({ ...p, date: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 bg-white" />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-600 mb-1">Estado</label>
                                        <select value={formData.status} onChange={e => setFormData(p => ({ ...p, status: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 bg-white">
                                            <option>Pendiente</option><option>Aprobada</option><option>Pagada</option><option>Rechazada</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Cliente, Proveedor y Factura */}
                            <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-3">
                                <h4 className="text-xs font-semibold text-green-700 uppercase tracking-wide flex items-center"><Link2 size={14} className="mr-1.5" /> Cliente, Proveedor y Factura</h4>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-xs text-gray-600 mb-1">Cliente</label>
                                        <select value={formData.client_id} onChange={e => setFormData(p => ({ ...p, client_id: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 bg-white">
                                            <option value="">Seleccionar cliente...</option>
                                            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-600 mb-1">Proveedor</label>
                                        <select value={formData.provider_id} onChange={e => setFormData(p => ({ ...p, provider_id: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 bg-white">
                                            <option value="">Seleccionar proveedor...</option>
                                            {providers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-600 mb-1">Factura Asociada</label>
                                        <select value={formData.invoice_id} onChange={e => handleInvoiceChange(e.target.value)} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 bg-white">
                                            <option value="">Sin factura</option>
                                            {invoices.map(i => <option key={i.id} value={i.id}>{i.invoice_number}</option>)}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Importe */}
                            <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 space-y-4">
                                <h4 className="text-xs font-semibold text-orange-700 uppercase tracking-wide flex items-center"><DollarSign size={14} className="mr-1.5" /> Importe y Método de Pago</h4>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-xs text-gray-600 mb-1">Monto *</label>
                                        <input type="number" step="0.01" required value={formData.amount} onChange={e => setFormData(p => ({ ...p, amount: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-400 bg-white" placeholder="0.00" />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-600 mb-1">Moneda</label>
                                        <select value={formData.currency} onChange={e => setFormData(p => ({ ...p, currency: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-400 bg-white">
                                            <option>ARS</option><option>USD</option><option>EUR</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-600 mb-1">Método de Pago</label>
                                        <select value={formData.payment_method} onChange={e => setFormData(p => ({ ...p, payment_method: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-400 bg-white">
                                            <option>Transferencia</option><option>Efectivo</option><option>Cheque</option><option>Tarjeta</option><option>Otro</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">Referencia / Nº Comprobante</label>
                                    <input type="text" value={formData.reference} onChange={e => setFormData(p => ({ ...p, reference: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500" placeholder="Nro. de transferencia, cheque, etc." />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">Observaciones</label>
                                    <textarea value={formData.notes} onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))} rows={2} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500" placeholder="Notas adicionales..." />
                                </div>
                            </div>
                        </form>

                        <div className="p-5 border-t border-gray-100 flex justify-between items-center flex-shrink-0 bg-gray-50">
                            <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2.5 text-gray-600 hover:text-gray-900 text-sm font-medium">Cancelar</button>
                            <button onClick={handleSubmit} className="flex items-center px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-medium hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-200 transition-all">
                                {editingId ? "Actualizar Orden" : "Crear Orden"} <ArrowRight size={16} className="ml-2" />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
