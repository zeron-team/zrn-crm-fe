import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp, FileText, ClipboardList, Receipt, ArrowRight, Building2,
  DollarSign, Clock, CheckCircle, Ban, Package, Truck, Send, ChevronRight,
  BarChart3, ArrowUpRight, Calendar, AlertCircle
} from 'lucide-react';
import api from '../api/client';

/* ─── helpers ───────────────────────────────────────────────── */
function fmt(n: number, cur = 'ARS') {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: cur, minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
}
function fmtDate(d: string | null) { if (!d) return '—'; return new Date(d).toLocaleDateString('es-AR'); }

/* ─── status configs ────────────────────────────────────────── */
const QUOTE_STATUS: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  Draft:    { label: 'Borrador', color: 'text-slate-700',   bg: 'bg-slate-100 border-slate-200',   icon: FileText },
  Sent:     { label: 'Enviado',  color: 'text-blue-700',    bg: 'bg-blue-100 border-blue-200',     icon: Send },
  Accepted: { label: 'Aceptado', color: 'text-emerald-700', bg: 'bg-emerald-100 border-emerald-200', icon: CheckCircle },
  Rejected: { label: 'Rechazado', color: 'text-red-700',   bg: 'bg-red-100 border-red-200',       icon: Ban },
};

const ORDER_STATUS: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  pending:        { label: 'Pendiente',      color: 'text-amber-700',   bg: 'bg-amber-100 border-amber-200',     icon: Clock },
  confirmed:      { label: 'Confirmado',     color: 'text-blue-700',    bg: 'bg-blue-100 border-blue-200',       icon: CheckCircle },
  in_preparation: { label: 'En Preparación', color: 'text-purple-700',  bg: 'bg-purple-100 border-purple-200',   icon: Package },
  delivered:      { label: 'Entregado',      color: 'text-emerald-700', bg: 'bg-emerald-100 border-emerald-200', icon: Truck },
  invoiced:       { label: 'Facturado',      color: 'text-green-700',   bg: 'bg-green-100 border-green-200',     icon: Receipt },
  cancelled:      { label: 'Cancelado',      color: 'text-red-700',     bg: 'bg-red-100 border-red-200',         icon: Ban },
};

/* ─── types ─────────────────────────────────────────────────── */
interface PipelineData {
  quotes: {
    by_status: Record<string, { count: number; total: number }>;
    total_amount: number; total_count: number;
    recent: { id: number; quote_number: string; status: string; total_amount: number; currency: string; client_name: string | null; issue_date: string | null; expiry_date: string | null }[];
  };
  orders: {
    by_status: Record<string, { count: number; total: number }>;
    total_amount: number; total_count: number;
    recent: { id: number; order_number: string; status: string; total_amount: number; currency: string; client_name: string | null; quote_number: string | null; delivery_date: string | null }[];
  };
  invoices: {
    total_invoiced: number; count: number;
    recent: { id: number; invoice_number: string; amount: number; currency: string; client_name: string | null; sales_order_id: number | null }[];
  };
  funnel: {
    quotes_total: number; orders_total: number; invoiced_total: number; conversion_quote_to_order: number;
  };
}

/* ═══════════════════════════════════════════════════════════════ */
export default function SalesPipeline() {
  const navigate = useNavigate();
  const [data, setData] = useState<PipelineData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/sales-orders/pipeline/summary')
      .then(res => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400"><div className="text-center"><BarChart3 size={40} className="mx-auto mb-2 animate-pulse" /><p className="text-sm">Cargando pipeline...</p></div></div>;
  if (!data) return <div className="p-8 text-center text-red-500">Error al cargar datos</div>;

  const quoteStatuses = ['Draft', 'Sent', 'Accepted', 'Rejected'];
  const orderStatuses = ['pending', 'confirmed', 'in_preparation', 'delivered', 'invoiced', 'cancelled'];

  return (
    <div className="space-y-6">
      {/* ═══ HEADER ═══ */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl text-white shadow-lg shadow-emerald-200"><TrendingUp size={24} /></div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Pipeline de Ventas</h1>
            <p className="text-sm text-gray-500">Flujo completo: Presupuestos → Pedidos → Facturación</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => navigate('/quotes')} className="px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors">Presupuestos</button>
          <button onClick={() => navigate('/sales-orders')} className="px-4 py-2 text-sm font-medium text-purple-600 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors">Pedidos</button>
          <button onClick={() => navigate('/billing')} className="px-4 py-2 text-sm font-medium text-green-600 bg-green-50 hover:bg-green-100 rounded-lg transition-colors">Facturación</button>
        </div>
      </div>

      {/* ═══ FUNNEL KPIs ═══ */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <FunnelCard icon={FileText} label="Presupuestos" count={data.quotes.total_count} amount={data.quotes.total_amount}
          gradient="from-blue-500 to-indigo-600" bgLight="bg-blue-50" />
        <div className="hidden md:flex items-center justify-center"><ArrowRight size={24} className="text-gray-300" /></div>
        <FunnelCard icon={ClipboardList} label="Órdenes de Pedido" count={data.orders.total_count} amount={data.orders.total_amount}
          gradient="from-purple-500 to-violet-600" bgLight="bg-purple-50" />
        <FunnelCard icon={Receipt} label="Facturado" count={data.invoices.count} amount={data.invoices.total_invoiced}
          gradient="from-emerald-500 to-green-600" bgLight="bg-emerald-50" />
      </div>

      {/* ═══ CONVERSION RATE ═══ */}
      <div className="bg-gradient-to-r from-gray-50 to-white border border-gray-200 rounded-xl p-4 flex flex-col md:flex-row md:items-center gap-4">
        <div className="flex items-center gap-3 flex-1">
          <div className="p-2 bg-amber-100 rounded-lg"><BarChart3 size={18} className="text-amber-600" /></div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Tasa de Conversión</p>
            <p className="text-2xl font-bold text-gray-900">{data.funnel.conversion_quote_to_order}%</p>
          </div>
          <p className="text-xs text-gray-400 ml-2">Presupuestos → Pedidos</p>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-center">
            <p className="text-xs text-gray-500">Presupuestos</p>
            <p className="text-lg font-bold text-blue-600">{fmt(data.funnel.quotes_total)}</p>
          </div>
          <ArrowRight size={16} className="text-gray-300" />
          <div className="text-center">
            <p className="text-xs text-gray-500">Pedidos</p>
            <p className="text-lg font-bold text-purple-600">{fmt(data.funnel.orders_total)}</p>
          </div>
          <ArrowRight size={16} className="text-gray-300" />
          <div className="text-center">
            <p className="text-xs text-gray-500">Facturado</p>
            <p className="text-lg font-bold text-emerald-600">{fmt(data.funnel.invoiced_total)}</p>
          </div>
        </div>
      </div>

      {/* ═══ QUOTES SECTION ═══ */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText size={18} className="text-blue-600" />
            <h2 className="font-bold text-gray-900">Presupuestos</h2>
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">{data.quotes.total_count}</span>
          </div>
          <button onClick={() => navigate('/quotes')} className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1">
            Ver todos <ChevronRight size={14} />
          </button>
        </div>

        {/* Status pills */}
        <div className="px-5 py-3 flex flex-wrap gap-2 bg-gray-50/50 border-b border-gray-100">
          {quoteStatuses.map(s => {
            const cfg = QUOTE_STATUS[s];
            const stat = data.quotes.by_status[s];
            if (!stat) return null;
            const Icon = cfg.icon;
            return (
              <div key={s} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${cfg.bg}`}>
                <Icon size={14} className={cfg.color} />
                <span className={`text-xs font-semibold ${cfg.color}`}>{cfg.label}: {stat.count}</span>
                <span className="text-xs text-gray-500">({fmt(stat.total)})</span>
              </div>
            );
          })}
        </div>

        {/* Recent quotes table */}
        <div className="hidden md:block">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-xs text-gray-500">
                <th className="text-left px-5 py-2.5 font-semibold"># Presupuesto</th>
                <th className="text-left px-5 py-2.5 font-semibold">Cliente</th>
                <th className="text-left px-5 py-2.5 font-semibold">Estado</th>
                <th className="text-right px-5 py-2.5 font-semibold">Monto</th>
                <th className="text-left px-5 py-2.5 font-semibold">Vence</th>
              </tr>
            </thead>
            <tbody>
              {data.quotes.recent.slice(0, 10).map(q => (
                <tr key={q.id} className="border-b border-gray-50 hover:bg-blue-50/30 cursor-pointer transition-colors" onClick={() => navigate('/quotes')}>
                  <td className="px-5 py-2.5 font-mono text-sm font-semibold text-blue-600">{q.quote_number}</td>
                  <td className="px-5 py-2.5 text-gray-800">{q.client_name || '—'}</td>
                  <td className="px-5 py-2.5">
                    <StatusPill config={QUOTE_STATUS} status={q.status} />
                  </td>
                  <td className="px-5 py-2.5 text-right font-semibold text-gray-800">{fmt(q.total_amount, q.currency)}</td>
                  <td className="px-5 py-2.5 text-gray-500 text-xs">{fmtDate(q.expiry_date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Mobile cards */}
        <div className="md:hidden divide-y divide-gray-50">
          {data.quotes.recent.slice(0, 8).map(q => (
            <div key={q.id} className="px-5 py-3 flex items-center justify-between" onClick={() => navigate('/quotes')}>
              <div>
                <p className="text-sm font-semibold text-blue-600 font-mono">{q.quote_number}</p>
                <p className="text-xs text-gray-500">{q.client_name || '—'}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold">{fmt(q.total_amount, q.currency)}</p>
                <StatusPill config={QUOTE_STATUS} status={q.status} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ═══ ORDERS SECTION ═══ */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 bg-gradient-to-r from-purple-50 to-violet-50 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClipboardList size={18} className="text-purple-600" />
            <h2 className="font-bold text-gray-900">Órdenes de Pedido</h2>
            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">{data.orders.total_count}</span>
          </div>
          <button onClick={() => navigate('/sales-orders')} className="text-xs text-purple-600 hover:text-purple-800 font-medium flex items-center gap-1">
            Ver todos <ChevronRight size={14} />
          </button>
        </div>

        {/* Status pills */}
        <div className="px-5 py-3 flex flex-wrap gap-2 bg-gray-50/50 border-b border-gray-100">
          {orderStatuses.map(s => {
            const cfg = ORDER_STATUS[s];
            const stat = data.orders.by_status[s];
            if (!stat) return null;
            const Icon = cfg.icon;
            return (
              <div key={s} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${cfg.bg}`}>
                <Icon size={14} className={cfg.color} />
                <span className={`text-xs font-semibold ${cfg.color}`}>{cfg.label}: {stat.count}</span>
                <span className="text-xs text-gray-500">({fmt(stat.total)})</span>
              </div>
            );
          })}
          {data.orders.total_count === 0 && (
            <p className="text-xs text-gray-400 py-1">No hay pedidos aún</p>
          )}
        </div>

        {/* Recent orders table */}
        <div className="hidden md:block">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-xs text-gray-500">
                <th className="text-left px-5 py-2.5 font-semibold"># Pedido</th>
                <th className="text-left px-5 py-2.5 font-semibold">Cliente</th>
                <th className="text-left px-5 py-2.5 font-semibold">Presupuesto</th>
                <th className="text-left px-5 py-2.5 font-semibold">Estado</th>
                <th className="text-right px-5 py-2.5 font-semibold">Monto</th>
                <th className="text-left px-5 py-2.5 font-semibold">Entrega</th>
              </tr>
            </thead>
            <tbody>
              {data.orders.recent.length === 0 ? (
                <tr><td colSpan={6} className="text-center text-gray-400 py-8 text-sm">Sin pedidos — generá desde un presupuesto aceptado o creá manualmente</td></tr>
              ) : data.orders.recent.slice(0, 10).map(o => (
                <tr key={o.id} className="border-b border-gray-50 hover:bg-purple-50/30 cursor-pointer transition-colors" onClick={() => navigate('/sales-orders')}>
                  <td className="px-5 py-2.5 font-mono text-sm font-semibold text-purple-600">{o.order_number}</td>
                  <td className="px-5 py-2.5 text-gray-800">{o.client_name || '—'}</td>
                  <td className="px-5 py-2.5">{o.quote_number ? <span className="text-xs font-mono text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">{o.quote_number}</span> : <span className="text-gray-300 text-xs">Manual</span>}</td>
                  <td className="px-5 py-2.5"><StatusPill config={ORDER_STATUS} status={o.status} /></td>
                  <td className="px-5 py-2.5 text-right font-semibold text-gray-800">{fmt(o.total_amount, o.currency)}</td>
                  <td className="px-5 py-2.5 text-gray-500 text-xs">{fmtDate(o.delivery_date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Mobile cards */}
        <div className="md:hidden divide-y divide-gray-50">
          {data.orders.recent.slice(0, 8).map(o => (
            <div key={o.id} className="px-5 py-3 flex items-center justify-between" onClick={() => navigate('/sales-orders')}>
              <div>
                <p className="text-sm font-semibold text-purple-600 font-mono">{o.order_number}</p>
                <p className="text-xs text-gray-500">{o.client_name || '—'}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold">{fmt(o.total_amount, o.currency)}</p>
                <StatusPill config={ORDER_STATUS} status={o.status} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ═══ INVOICES SECTION ═══ */}
      {data.invoices.count > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 bg-gradient-to-r from-emerald-50 to-green-50 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Receipt size={18} className="text-emerald-600" />
              <h2 className="font-bold text-gray-900">Facturas de Pedidos</h2>
              <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">{data.invoices.count}</span>
            </div>
            <button onClick={() => navigate('/billing')} className="text-xs text-emerald-600 hover:text-emerald-800 font-medium flex items-center gap-1">
              Ver facturación <ChevronRight size={14} />
            </button>
          </div>
          <div className="hidden md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-xs text-gray-500">
                  <th className="text-left px-5 py-2.5 font-semibold"># Factura</th>
                  <th className="text-left px-5 py-2.5 font-semibold">Cliente</th>
                  <th className="text-right px-5 py-2.5 font-semibold">Monto</th>
                </tr>
              </thead>
              <tbody>
                {data.invoices.recent.map(inv => (
                  <tr key={inv.id} className="border-b border-gray-50 hover:bg-emerald-50/30 cursor-pointer transition-colors" onClick={() => navigate('/billing')}>
                    <td className="px-5 py-2.5 font-mono text-sm font-semibold text-emerald-600">{inv.invoice_number}</td>
                    <td className="px-5 py-2.5 text-gray-800">{inv.client_name || '—'}</td>
                    <td className="px-5 py-2.5 text-right font-semibold text-gray-800">{fmt(inv.amount, inv.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="md:hidden divide-y divide-gray-50">
            {data.invoices.recent.map(inv => (
              <div key={inv.id} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-emerald-600 font-mono">{inv.invoice_number}</p>
                  <p className="text-xs text-gray-500">{inv.client_name || '—'}</p>
                </div>
                <p className="font-semibold">{fmt(inv.amount, inv.currency)}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Sub-components ─────────────────────────────────────────── */
function FunnelCard({ icon: Icon, label, count, amount, gradient, bgLight }: { icon: any; label: string; count: number; amount: number; gradient: string; bgLight: string }) {
  return (
    <div className={`relative overflow-hidden bg-gradient-to-br ${gradient} rounded-xl p-5 text-white shadow-lg`}>
      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-3">
          <div className="p-1.5 bg-white/20 rounded-lg"><Icon size={18} /></div>
          <span className="text-sm font-medium opacity-90">{label}</span>
        </div>
        <p className="text-3xl font-extrabold">{count}</p>
        <p className="text-sm opacity-80 mt-1">{fmt(amount)}</p>
      </div>
      <div className="absolute -right-4 -bottom-4 opacity-10"><Icon size={80} /></div>
    </div>
  );
}

function StatusPill({ config, status }: { config: Record<string, any>; status: string }) {
  const cfg = config[status] || { label: status, color: 'text-gray-600', bg: 'bg-gray-100 border-gray-200', icon: AlertCircle };
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border ${cfg.bg} ${cfg.color}`}>
      <Icon size={11} /> {cfg.label}
    </span>
  );
}
