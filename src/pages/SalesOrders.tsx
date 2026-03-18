import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ClipboardList, Search, Package, FileText, Receipt, Building2, User, Calendar,
  DollarSign, Plus, X, Truck, CheckCircle, Clock, AlertCircle, Ban, Eye, Pencil, Trash2, Save,
  LayoutList, Columns3
} from 'lucide-react';
import api from '../api/client';

/* ─── types ─────────────────────────────────────────────────── */
interface SOItem {
  id?: number; sales_order_id?: number; product_id: number | null;
  description: string; quantity: number; unit_price: number; total_price: number;
}
interface SalesOrder {
  id: number; order_number: string; quote_id: number | null; client_id: number | null;
  seller_id: number | null; status: string; currency: string;
  subtotal: number; tax_amount: number; total_amount: number;
  notes: string | null; delivery_date: string | null;
  created_at: string; updated_at: string;
  client_name: string | null; seller_name: string | null; quote_number: string | null;
  items: SOItem[]; invoice_count: number;
}
interface Client { id: number; name: string; }
interface Product { id: number; name: string; price: number; }

/* ─── constants ─────────────────────────────────────────────── */
const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  pending:        { label: 'Pendiente',       color: 'text-amber-700',  bg: 'bg-amber-50 border-amber-200',     icon: Clock },
  confirmed:      { label: 'Confirmado',      color: 'text-blue-700',   bg: 'bg-blue-50 border-blue-200',       icon: CheckCircle },
  in_preparation: { label: 'En Preparación',  color: 'text-purple-700', bg: 'bg-purple-50 border-purple-200',   icon: Package },
  delivered:      { label: 'Entregado',       color: 'text-emerald-700',bg: 'bg-emerald-50 border-emerald-200', icon: Truck },
  invoiced:       { label: 'Facturado',       color: 'text-green-700',  bg: 'bg-green-50 border-green-200',     icon: Receipt },
  cancelled:      { label: 'Cancelado',       color: 'text-red-700',    bg: 'bg-red-50 border-red-200',         icon: Ban },
};
const STATUS_ORDER = ['pending', 'confirmed', 'in_preparation', 'delivered', 'invoiced', 'cancelled'];
const CURRENCIES = ['ARS', 'USD', 'EUR'];

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] || { label: status, color: 'text-gray-600', bg: 'bg-gray-50 border-gray-200', icon: AlertCircle };
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.bg} ${cfg.color}`}>
      <Icon size={12} /> {cfg.label}
    </span>
  );
}

function fmt(n: number, cur = 'ARS') { return new Intl.NumberFormat('es-AR', { style: 'currency', currency: cur, minimumFractionDigits: 2 }).format(n); }
function fmtDate(d: string | null) { if (!d) return '—'; return new Date(d).toLocaleDateString('es-AR'); }

/* ═══════════════════════════════════════════════════════════════ */
export default function SalesOrders() {
  const { t } = useTranslation();
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [sellers, setSellers] = useState<{ id: number; full_name: string; username: string }[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [selected, setSelected] = useState<SalesOrder | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({
    client_id: '' as string | number,
    seller_id: '' as string | number,
    currency: 'ARS',
    notes: '',
    delivery_date: '',
    items: [] as SOItem[],
  });

  /* ── fetch ───────────────────────────────────────────────── */
  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (filterStatus) params.status = filterStatus;
      const res = await api.get('/sales-orders/', { params });
      setOrders(res.data);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }, [filterStatus]);

  useEffect(() => {
    fetchOrders();
    Promise.all([
      api.get('/clients/'),
      api.get('/users/'),
      api.get('/products/'),
    ]).then(([cRes, uRes, pRes]) => {
      setClients(cRes.data);
      setSellers(uRes.data);
      setProducts(pRes.data);
    }).catch(console.error);
  }, [fetchOrders]);

  /* ── filter ──────────────────────────────────────────────── */
  const filtered = orders.filter(o => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      o.order_number.toLowerCase().includes(s) ||
      (o.client_name || '').toLowerCase().includes(s) ||
      (o.quote_number || '').toLowerCase().includes(s) ||
      (o.seller_name || '').toLowerCase().includes(s)
    );
  });

  /* ── status change ───────────────────────────────────────── */
  const changeStatus = async (id: number, status: string) => {
    try {
      await api.put(`/sales-orders/${id}`, { status });
      fetchOrders();
      if (selected?.id === id) setSelected(prev => prev ? { ...prev, status } : prev);
    } catch (e) { console.error(e); }
  };

  /* ── detail panel ────────────────────────────────────────── */
  const openDetail = (o: SalesOrder) => { setSelected(o); setDetailOpen(true); };
  const closeDetail = () => { setDetailOpen(false); };

  /* ── delete ──────────────────────────────────────────────── */
  const deleteOrder = async (id: number) => {
    if (!confirm('¿Eliminar esta orden de pedido?')) return;
    try {
      await api.delete(`/sales-orders/${id}`);
      fetchOrders();
      if (selected?.id === id) closeDetail();
    } catch (e) { console.error(e); }
  };

  /* ── modal ───────────────────────────────────────────────── */
  const openCreate = () => {
    setEditingId(null);
    setForm({ client_id: '', seller_id: '', currency: 'ARS', notes: '', delivery_date: '', items: [] });
    setModalOpen(true);
  };

  const openEdit = (o: SalesOrder) => {
    setEditingId(o.id);
    setForm({
      client_id: o.client_id || '',
      seller_id: o.seller_id || '',
      currency: o.currency,
      notes: o.notes || '',
      delivery_date: o.delivery_date || '',
      items: o.items.map(i => ({
        product_id: i.product_id, description: i.description,
        quantity: Number(i.quantity), unit_price: Number(i.unit_price), total_price: Number(i.total_price),
      })),
    });
    setModalOpen(true);
    closeDetail();
  };

  const addItem = () => {
    setForm(f => ({ ...f, items: [...f.items, { product_id: null, description: '', quantity: 1, unit_price: 0, total_price: 0 }] }));
  };

  const removeItem = (idx: number) => {
    setForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));
  };

  const updateItem = (idx: number, field: string, value: any) => {
    setForm(f => {
      const items = [...f.items];
      const item = { ...items[idx] };

      if (field === 'product_id') {
        const prod = products.find(p => p.id === Number(value));
        item.product_id = value ? Number(value) : null;
        if (prod) { item.description = prod.name; item.unit_price = prod.price; item.total_price = Number((item.quantity * prod.price).toFixed(2)); }
      } else if (field === 'quantity') {
        item.quantity = Number(value);
        item.total_price = Number((item.quantity * item.unit_price).toFixed(2));
      } else if (field === 'unit_price') {
        item.unit_price = Number(value);
        item.total_price = Number((item.quantity * item.unit_price).toFixed(2));
      } else if (field === 'description') {
        item.description = value;
      }

      items[idx] = item;
      return { ...f, items };
    });
  };

  const formTotal = form.items.reduce((s, i) => s + Number(i.total_price || 0), 0);

  const handleSave = async () => {
    const payload: any = {
      client_id: form.client_id ? Number(form.client_id) : null,
      seller_id: form.seller_id ? Number(form.seller_id) : null,
      currency: form.currency,
      notes: form.notes || null,
      delivery_date: form.delivery_date || null,
      items: form.items.map(i => ({
        product_id: i.product_id || null,
        description: i.description,
        quantity: i.quantity,
        unit_price: i.unit_price,
        total_price: i.total_price,
      })),
    };

    try {
      if (editingId) {
        await api.put(`/sales-orders/${editingId}`, payload);
      } else {
        await api.post('/sales-orders/', payload);
      }
      setModalOpen(false);
      fetchOrders();
    } catch (e: any) {
      alert(e.response?.data?.detail || 'Error al guardar');
    }
  };

  /* ── KPI row ─────────────────────────────────────────────── */
  const kpis = STATUS_ORDER.map(s => ({
    ...STATUS_CONFIG[s],
    count: orders.filter(o => o.status === s).length,
    total: orders.filter(o => o.status === s).reduce((sum, o) => sum + Number(o.total_amount || 0), 0),
    status: s,
  }));

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* ═══ HEADER ═══ */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl text-white"><ClipboardList size={22} /></div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Órdenes de Pedido</h1>
              <p className="text-xs text-gray-500">{orders.length} pedidos</p>
            </div>
          </div>
          <div className="flex-1" />
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar pedido..."
                className="pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm w-56 focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
              <option value="">Todos los estados</option>
              {STATUS_ORDER.map(s => <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>)}
            </select>
            <div className="flex border border-gray-300 rounded-lg overflow-hidden">
              <button onClick={() => setViewMode('list')}
                className={`p-2 transition-colors ${viewMode === 'list' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
                title="Vista Lista"><LayoutList size={16} /></button>
              <button onClick={() => setViewMode('kanban')}
                className={`p-2 transition-colors ${viewMode === 'kanban' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
                title="Vista Kanban"><Columns3 size={16} /></button>
            </div>
            <button onClick={openCreate}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg text-sm font-semibold hover:from-indigo-700 hover:to-purple-700 shadow-sm">
              <Plus size={16} /> Nuevo Pedido
            </button>
          </div>
        </div>
      </div>

      {/* ═══ KPIs ═══ */}
      <div className="px-6 py-3 flex gap-3 overflow-x-auto">
        {kpis.map(k => {
          const Icon = k.icon;
          return (
            <button key={k.status} onClick={() => setFilterStatus(prev => prev === k.status ? '' : k.status)}
              className={`flex-shrink-0 flex items-center gap-3 px-4 py-2.5 rounded-xl border transition-all text-left ${filterStatus === k.status ? 'ring-2 ring-indigo-500 bg-white shadow-md' : 'bg-white hover:shadow-sm border-gray-200'}`}>
              <div className={`p-1.5 rounded-lg ${k.bg}`}><Icon size={16} className={k.color} /></div>
              <div>
                <p className={`text-lg font-bold ${k.color}`}>{k.count}</p>
                <p className="text-[10px] text-gray-500 font-medium">{k.label}</p>
              </div>
              {k.total > 0 && <p className="text-[10px] text-gray-400 ml-2">{fmt(k.total)}</p>}
            </button>
          );
        })}
      </div>

      {/* ═══ CONTENT ═══ */}
      <div className="flex-1 overflow-auto px-6 pb-6">
        {loading ? (
          <div className="flex items-center justify-center h-40 text-gray-400">Cargando...</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-gray-400">
            <ClipboardList size={40} className="mb-2 opacity-30" />
            <p className="text-sm">No se encontraron pedidos</p>
            <p className="text-xs mt-1">Creá uno manualmente o generá desde un presupuesto aceptado</p>
          </div>
        ) : viewMode === 'kanban' ? (
          /* ═══ KANBAN VIEW ═══ */
          <div className="flex gap-4 overflow-x-auto pb-4 h-full">
            {STATUS_ORDER.map(status => {
              const cfg = STATUS_CONFIG[status];
              const Icon = cfg.icon;
              const columnOrders = filtered.filter(o => o.status === status);
              const colTotal = columnOrders.reduce((s, o) => s + Number(o.total_amount || 0), 0);
              return (
                <div key={status} className="flex-shrink-0 w-72 flex flex-col bg-gray-100/70 rounded-xl border border-gray-200">
                  {/* Column header */}
                  <div className={`px-3 py-2.5 rounded-t-xl border-b ${cfg.bg} flex items-center justify-between`}>
                    <div className="flex items-center gap-2">
                      <Icon size={14} className={cfg.color} />
                      <span className={`text-xs font-bold ${cfg.color}`}>{cfg.label}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${cfg.bg} ${cfg.color}`}>{columnOrders.length}</span>
                    </div>
                    {colTotal > 0 && <span className="text-[10px] text-gray-500 font-medium">{fmt(colTotal)}</span>}
                  </div>
                  {/* Cards */}
                  <div className="flex-1 overflow-y-auto p-2 space-y-2">
                    {columnOrders.length === 0 && (
                      <div className="text-center py-6 text-gray-300">
                        <ClipboardList size={20} className="mx-auto mb-1 opacity-40" />
                        <p className="text-[10px]">Sin pedidos</p>
                      </div>
                    )}
                    {columnOrders.map(o => (
                      <div key={o.id}
                        className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm hover:shadow-md cursor-pointer transition-all hover:border-indigo-300 group"
                        onClick={() => openDetail(o)}>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-mono text-xs font-bold text-indigo-600">{o.order_number}</span>
                          <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                            <button onClick={() => openEdit(o)} className="p-1 hover:bg-blue-50 rounded" title="Editar"><Pencil size={12} className="text-gray-400 hover:text-blue-600" /></button>
                            <button onClick={() => deleteOrder(o.id)} className="p-1 hover:bg-red-50 rounded" title="Eliminar"><Trash2 size={12} className="text-gray-400 hover:text-red-600" /></button>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 mb-1">
                          <Building2 size={11} className="text-gray-400 flex-shrink-0" />
                          <span className="text-xs text-gray-700 truncate">{o.client_name || 'Sin cliente'}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold text-gray-900">{fmt(o.total_amount, o.currency)}</span>
                          {o.delivery_date && (
                            <span className="text-[10px] text-gray-400 flex items-center gap-0.5"><Calendar size={10} />{fmtDate(o.delivery_date)}</span>
                          )}
                        </div>
                        {o.quote_number && (
                          <div className="mt-1.5 flex items-center gap-1">
                            <FileText size={10} className="text-purple-400" />
                            <span className="text-[10px] text-purple-500 font-mono">{o.quote_number}</span>
                          </div>
                        )}
                        {o.items.length > 0 && (
                          <div className="mt-1.5 flex items-center gap-1">
                            <Package size={10} className="text-gray-400" />
                            <span className="text-[10px] text-gray-400">{o.items.length} ítem{o.items.length !== 1 ? 's' : ''}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* ═══ LIST VIEW ═══ */
          <>
            {/* Desktop table */}
            <div className="hidden md:block bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-4 py-3 font-semibold text-gray-600"># Pedido</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Cliente</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Presupuesto</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Estado</th>
                    <th className="text-right px-4 py-3 font-semibold text-gray-600">Total</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Entrega</th>
                    <th className="text-center px-4 py-3 font-semibold text-gray-600">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(o => (
                    <tr key={o.id}
                      className="border-b border-gray-100 hover:bg-indigo-50/40 cursor-pointer transition-colors"
                      onClick={() => openDetail(o)}>
                      <td className="px-4 py-3"><span className="font-mono font-semibold text-indigo-600">{o.order_number}</span></td>
                      <td className="px-4 py-3"><div className="flex items-center gap-2"><Building2 size={14} className="text-gray-400" /><span className="text-gray-800">{o.client_name || '—'}</span></div></td>
                      <td className="px-4 py-3">{o.quote_number ? <span className="font-mono text-xs text-purple-600 bg-purple-50 px-2 py-0.5 rounded">{o.quote_number}</span> : <span className="text-gray-300 text-xs">Manual</span>}</td>
                      <td className="px-4 py-3"><StatusBadge status={o.status} /></td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-800">{fmt(o.total_amount, o.currency)}</td>
                      <td className="px-4 py-3 text-gray-600">{fmtDate(o.delivery_date)}</td>
                      <td className="px-4 py-3 text-center" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-center gap-1">
                          <button onClick={() => openDetail(o)} className="p-1.5 hover:bg-gray-100 rounded" title="Ver"><Eye size={15} className="text-gray-500" /></button>
                          <button onClick={() => openEdit(o)} className="p-1.5 hover:bg-blue-50 rounded" title="Editar"><Pencil size={15} className="text-gray-500 hover:text-blue-600" /></button>
                          <button onClick={() => deleteOrder(o.id)} className="p-1.5 hover:bg-red-50 rounded" title="Eliminar"><Trash2 size={15} className="text-gray-500 hover:text-red-600" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden space-y-3">
              {filtered.map(o => (
                <div key={o.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 space-y-2" onClick={() => openDetail(o)}>
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-semibold text-indigo-600">{o.order_number}</span>
                    <StatusBadge status={o.status} />
                  </div>
                  <p className="text-sm text-gray-800">{o.client_name || '—'}</p>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-gray-800">{fmt(o.total_amount, o.currency)}</span>
                    <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                      <button onClick={() => openEdit(o)} className="p-1.5 hover:bg-blue-50 rounded"><Pencil size={14} className="text-gray-400" /></button>
                      <button onClick={() => deleteOrder(o.id)} className="p-1.5 hover:bg-red-50 rounded"><Trash2 size={14} className="text-gray-400" /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ═══ DETAIL PANEL ═══ */}
      {detailOpen && selected && (
        <div className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/30" onClick={closeDetail} />
          <div className="absolute right-0 top-0 bottom-0 w-full max-w-lg bg-white shadow-2xl flex flex-col overflow-hidden animate-slide-in-right">
            <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-purple-50 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <ClipboardList size={20} className="text-indigo-600" /> {selected.order_number}
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">Creado {fmtDate(selected.created_at)}</p>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => openEdit(selected)} className="p-2 hover:bg-white/70 rounded-lg" title="Editar"><Pencil size={16} className="text-gray-600" /></button>
                <button onClick={closeDetail} className="p-2 hover:bg-white/70 rounded-lg"><X size={18} /></button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Status + Actions */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-600">Estado</span>
                  <StatusBadge status={selected.status} />
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {STATUS_ORDER.filter(s => s !== selected.status && s !== 'cancelled').map(s => (
                    <button key={s} onClick={() => changeStatus(selected.id, s)}
                      className={`text-xs px-2.5 py-1 rounded-lg border transition-all hover:shadow-sm ${STATUS_CONFIG[s].bg} ${STATUS_CONFIG[s].color}`}>
                      → {STATUS_CONFIG[s].label}
                    </button>
                  ))}
                  {selected.status !== 'cancelled' && (
                    <button onClick={() => changeStatus(selected.id, 'cancelled')}
                      className="text-xs px-2.5 py-1 rounded-lg border border-red-200 bg-red-50 text-red-600 hover:shadow-sm">Cancelar</button>
                  )}
                </div>
              </div>

              {/* Info */}
              <div className="grid grid-cols-2 gap-3">
                <InfoCard icon={Building2} label="Cliente" value={selected.client_name || '—'} />
                <InfoCard icon={User} label="Vendedor" value={selected.seller_name || '—'} />
                <InfoCard icon={FileText} label="Presupuesto" value={selected.quote_number || 'Manual'} accent />
                <InfoCard icon={Calendar} label="Entrega" value={fmtDate(selected.delivery_date)} />
                <InfoCard icon={DollarSign} label="Subtotal" value={fmt(selected.subtotal, selected.currency)} />
                <InfoCard icon={DollarSign} label="Total" value={fmt(selected.total_amount, selected.currency)} accent />
              </div>

              {selected.notes && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                  <p className="text-xs font-medium text-amber-700 mb-1">Notas</p>
                  <p className="text-sm text-amber-900">{selected.notes}</p>
                </div>
              )}

              {/* Items */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <Package size={16} className="text-indigo-500" /> Ítems ({selected.items.length})
                </h3>
                <div className="space-y-2">
                  {selected.items.map((item, idx) => (
                    <div key={idx} className="bg-white border border-gray-200 rounded-lg p-3 flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{item.description}</p>
                        <p className="text-xs text-gray-500">{item.quantity} × {fmt(item.unit_price, selected.currency)}</p>
                      </div>
                      <p className="text-sm font-semibold text-gray-700 ml-3">{fmt(item.total_price, selected.currency)}</p>
                    </div>
                  ))}
                  {selected.items.length === 0 && <p className="text-sm text-gray-400 text-center py-4">Sin ítems</p>}
                </div>
              </div>
            </div>

            <div className="px-6 py-3 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
              <button onClick={() => deleteOrder(selected.id)} className="text-xs text-red-500 hover:text-red-700">Eliminar</button>
              <div className="text-right">
                <p className="text-xs text-gray-500">Total del Pedido</p>
                <p className="text-lg font-bold text-indigo-700">{fmt(selected.total_amount, selected.currency)}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ CREATE/EDIT MODAL ═══ */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-8 p-4 bg-gray-900/50 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden my-4">
            {/* Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center"><ClipboardList size={20} className="text-white" /></div>
                <div>
                  <h3 className="text-lg font-bold text-white">{editingId ? 'Editar Pedido' : 'Nuevo Pedido'}</h3>
                  <p className="text-indigo-100 text-xs">{editingId ? 'Modificar orden de pedido' : 'Crear orden de pedido manual'}</p>
                </div>
              </div>
              <button onClick={() => setModalOpen(false)} className="p-1.5 hover:bg-white/20 rounded-lg"><X size={18} className="text-white" /></button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
              {/* Row: Client + Seller */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Cliente</label>
                  <select value={form.client_id} onChange={e => setForm(f => ({ ...f, client_id: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 outline-none">
                    <option value="">— Seleccionar —</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Vendedor</label>
                  <select value={form.seller_id} onChange={e => setForm(f => ({ ...f, seller_id: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 outline-none">
                    <option value="">— Sin vendedor —</option>
                    {sellers.map(s => <option key={s.id} value={s.id}>{s.full_name || s.username}</option>)}
                  </select>
                </div>
              </div>

              {/* Row: Currency + Delivery */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Moneda</label>
                  <select value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 outline-none">
                    {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Fecha de Entrega</label>
                  <input type="date" value={form.delivery_date} onChange={e => setForm(f => ({ ...f, delivery_date: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Notas</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 outline-none resize-none" placeholder="Notas internas..." />
              </div>

              {/* Items */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2"><Package size={16} className="text-indigo-500" /> Ítems</h4>
                  <button onClick={addItem} className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"><Plus size={14} /> Agregar</button>
                </div>
                <div className="space-y-3">
                  {form.items.map((item, idx) => (
                    <div key={idx} className="bg-gray-50 rounded-xl border border-gray-200 p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <select value={item.product_id || ''} onChange={e => updateItem(idx, 'product_id', e.target.value)}
                          className="flex-1 px-2 py-1.5 border border-gray-200 rounded-lg text-xs bg-white">
                          <option value="">Producto manual</option>
                          {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                        <button onClick={() => removeItem(idx)} className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded"><Trash2 size={14} /></button>
                      </div>
                      <input value={item.description} onChange={e => updateItem(idx, 'description', e.target.value)}
                        className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs bg-white" placeholder="Descripción" />
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="block text-[10px] text-gray-500 mb-0.5">Cant.</label>
                          <input type="number" min="0" step="0.01" value={item.quantity} onChange={e => updateItem(idx, 'quantity', e.target.value)}
                            className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs bg-white" />
                        </div>
                        <div>
                          <label className="block text-[10px] text-gray-500 mb-0.5">P. Unit.</label>
                          <input type="number" min="0" step="0.01" value={item.unit_price} onChange={e => updateItem(idx, 'unit_price', e.target.value)}
                            className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs bg-white" />
                        </div>
                        <div>
                          <label className="block text-[10px] text-gray-500 mb-0.5">Total</label>
                          <input type="number" value={item.total_price} readOnly
                            className="w-full px-2 py-1.5 border border-gray-100 rounded-lg text-xs bg-gray-100 font-semibold" />
                        </div>
                      </div>
                    </div>
                  ))}
                  {form.items.length === 0 && (
                    <div className="text-center py-6 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
                      <Package size={24} className="mx-auto mb-1 opacity-40" />
                      <p className="text-xs">Sin ítems — hacé clic en "Agregar"</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Total</p>
                <p className="text-xl font-bold text-indigo-700">{fmt(formTotal, form.currency)}</p>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setModalOpen(false)} className="px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg font-medium">Cancelar</button>
                <button onClick={handleSave}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg text-sm font-semibold shadow-sm hover:shadow-md">
                  <Save size={16} /> {editingId ? 'Guardar Cambios' : 'Crear Pedido'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slide-in-right { from { transform: translateX(100%); } to { transform: translateX(0); } }
        .animate-slide-in-right { animation: slide-in-right 0.25s ease-out; }
      `}</style>
    </div>
  );
}

function InfoCard({ icon: Icon, label, value, accent }: { icon: any; label: string; value: string; accent?: boolean }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3">
      <div className="flex items-center gap-1.5 mb-1">
        <Icon size={12} className="text-gray-400" />
        <span className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">{label}</span>
      </div>
      <p className={`text-sm font-semibold truncate ${accent ? 'text-indigo-600' : 'text-gray-800'}`}>{value}</p>
    </div>
  );
}
