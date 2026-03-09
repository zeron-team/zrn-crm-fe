import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ArrowUpDown, Plus, Pencil, Trash2, DollarSign, TrendingUp, TrendingDown, Calendar, Save, X, Coins
} from 'lucide-react';
import api from '../api/client';

interface ExchangeRate {
    id: number;
    date: string;
    currency: string;
    buy_rate: number;
    sell_rate: number;
    source: string;
    created_by: string | null;
    created_at: string | null;
    updated_at: string | null;
    updated_by: string | null;
}

const CURRENCY_OPTIONS = ['USD', 'EUR', 'BRL', 'GBP', 'CLP', 'UYU', 'BTC', 'USDT'];
const CURRENCY_SYMBOLS: Record<string, string> = {
    USD: 'u$d', EUR: '€', BRL: 'R$', GBP: '£', CLP: 'CL$', UYU: 'U$', BTC: '₿', USDT: '₮',
};
const CURRENCY_COLORS: Record<string, string> = {
    USD: 'bg-green-100 text-green-700 border-green-200',
    EUR: 'bg-blue-100 text-blue-700 border-blue-200',
    BRL: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    GBP: 'bg-purple-100 text-purple-700 border-purple-200',
    CLP: 'bg-red-100 text-red-700 border-red-200',
    UYU: 'bg-cyan-100 text-cyan-700 border-cyan-200',
    BTC: 'bg-orange-100 text-orange-700 border-orange-200',
    USDT: 'bg-emerald-100 text-emerald-700 border-emerald-200',
};

export default function ExchangeRates() {
    const { t } = useTranslation();
    const [rates, setRates] = useState<ExchangeRate[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editItem, setEditItem] = useState<ExchangeRate | null>(null);
    const [activeCurrency, setActiveCurrency] = useState('USD');
    const [form, setForm] = useState({
        date: new Date().toISOString().split('T')[0],
        currency: 'USD',
        buy_rate: 0,
        sell_rate: 0,
        source: 'manual',
        created_by: 'admin',
    });

    const loadRates = async () => {
        setLoading(true);
        try {
            const res = await api.get('/exchange-rates/');
            setRates(res.data);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    useEffect(() => { loadRates(); }, []);

    // Derive available currencies from data
    const availableCurrencies = useMemo(() => {
        const set = new Set(rates.map(r => r.currency));
        // Always include the active one + any that have data
        return CURRENCY_OPTIONS.filter(c => set.has(c) || c === activeCurrency);
    }, [rates, activeCurrency]);

    // Count registrations per currency
    const currencyCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        rates.forEach(r => { counts[r.currency] = (counts[r.currency] || 0) + 1; });
        return counts;
    }, [rates]);

    // Filter rates by selected currency tab
    const filteredRates = useMemo(() => rates.filter(r => r.currency === activeCurrency), [rates, activeCurrency]);
    const latest = filteredRates.length > 0 ? filteredRates[0] : null;

    const openCreate = () => {
        setEditItem(null);
        setForm({
            date: new Date().toISOString().split('T')[0],
            currency: activeCurrency,
            buy_rate: 0,
            sell_rate: 0,
            source: 'manual',
            created_by: 'admin',
        });
        setShowModal(true);
    };

    const openEdit = (r: ExchangeRate) => {
        setEditItem(r);
        const d = r.date.includes('T') ? r.date.split('T')[0] : r.date;
        setForm({
            date: d,
            currency: r.currency,
            buy_rate: r.buy_rate,
            sell_rate: r.sell_rate,
            source: r.source,
            created_by: r.created_by || 'admin',
        });
        setShowModal(true);
    };

    const handleSave = async () => {
        try {
            if (editItem) {
                await api.put(`/exchange-rates/${editItem.id}`, {
                    date: form.date,
                    currency: form.currency,
                    buy_rate: form.buy_rate,
                    sell_rate: form.sell_rate,
                    source: form.source,
                    updated_by: form.created_by,
                });
            } else {
                await api.post('/exchange-rates/', form);
            }
            setShowModal(false);
            // Switch to the currency that was just saved
            setActiveCurrency(form.currency);
            loadRates();
        } catch (err: any) {
            console.error(err);
            const detail = err.response?.data?.detail;
            const msg = Array.isArray(detail) ? detail.map((e: any) => e.msg).join(', ') : (typeof detail === 'string' ? detail : err.message);
            alert('Error al guardar: ' + msg);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('¿Eliminar esta cotización?')) return;
        try {
            await api.delete(`/exchange-rates/${id}`);
            loadRates();
        } catch { alert('Error al eliminar'); }
    };

    const spread = (r: ExchangeRate) => (r.sell_rate - r.buy_rate).toFixed(2);
    const sym = CURRENCY_SYMBOLS[activeCurrency] || activeCurrency;

    if (loading) return <div className="p-8 text-center text-gray-400 animate-pulse">Cargando cotizaciones...</div>;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-black tracking-tight text-gray-900 flex items-center gap-2">
                        <DollarSign size={24} className="text-green-600" /> Tipo de Cambio
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">Registro diario de cotizaciones — {availableCurrencies.length} moneda{availableCurrencies.length > 1 ? 's' : ''}</p>
                </div>
                <button onClick={openCreate}
                    className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl shadow-lg shadow-green-200 hover:shadow-xl transition-all text-sm font-medium">
                    <Plus size={16} /> Nueva Cotización
                </button>
            </div>

            {/* Currency Tabs */}
            <div className="flex flex-wrap items-center gap-2">
                {availableCurrencies.map(cur => {
                    const isActive = cur === activeCurrency;
                    const count = currencyCounts[cur] || 0;
                    const colors = CURRENCY_COLORS[cur] || 'bg-gray-100 text-gray-700 border-gray-200';
                    return (
                        <button key={cur} onClick={() => setActiveCurrency(cur)}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all border
                                ${isActive
                                    ? `${colors} shadow-md ring-2 ring-offset-1 ring-current/20 scale-105`
                                    : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                                }`}>
                            <Coins size={14} />
                            {cur}
                            {count > 0 && (
                                <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-black ${isActive ? 'bg-white/60' : 'bg-gray-100'}`}>
                                    {count}
                                </span>
                            )}
                        </button>
                    );
                })}

                {/* Add currency button */}
                <div className="relative group">
                    <button className="flex items-center gap-1 px-3 py-2.5 rounded-xl text-sm text-gray-400 border border-dashed border-gray-300 hover:border-gray-400 hover:text-gray-600 transition-colors">
                        <Plus size={14} /> Moneda
                    </button>
                    <div className="absolute top-full left-0 mt-1 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-20 min-w-[140px] hidden group-hover:block">
                        {CURRENCY_OPTIONS.filter(c => !availableCurrencies.includes(c)).map(cur => (
                            <button key={cur} onClick={() => { setActiveCurrency(cur); }}
                                className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2">
                                <span className={`w-6 h-6 flex items-center justify-center rounded-md text-[10px] font-black ${CURRENCY_COLORS[cur] || 'bg-gray-100 text-gray-700'}`}>
                                    {CURRENCY_SYMBOLS[cur] || cur[0]}
                                </span>
                                {cur}
                            </button>
                        ))}
                        {CURRENCY_OPTIONS.filter(c => !availableCurrencies.includes(c)).length === 0 && (
                            <p className="px-4 py-2 text-xs text-gray-400">Todas las monedas están activas</p>
                        )}
                    </div>
                </div>
            </div>

            {/* KPIs for selected currency */}
            {latest ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                        <p className="text-xs text-gray-500 flex items-center gap-1"><Calendar size={12} /> Última fecha</p>
                        <p className="text-lg font-black text-gray-900 mt-1">{new Date(latest.date + 'T12:00:00').toLocaleDateString('es-AR')}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">{activeCurrency} / ARS</p>
                    </div>
                    <div className="bg-white rounded-xl p-4 border border-green-200 shadow-sm">
                        <p className="text-xs text-green-600 flex items-center gap-1"><TrendingUp size={12} /> Compra</p>
                        <p className="text-lg font-black text-green-700 mt-1">$ {Number(latest.buy_rate).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                    </div>
                    <div className="bg-white rounded-xl p-4 border border-red-200 shadow-sm">
                        <p className="text-xs text-red-600 flex items-center gap-1"><TrendingDown size={12} /> Venta</p>
                        <p className="text-lg font-black text-red-700 mt-1">$ {Number(latest.sell_rate).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                    </div>
                    <div className="bg-white rounded-xl p-4 border border-indigo-200 shadow-sm">
                        <p className="text-xs text-indigo-600 flex items-center gap-1"><ArrowUpDown size={12} /> Spread</p>
                        <p className="text-lg font-black text-indigo-700 mt-1">$ {spread(latest)}</p>
                    </div>
                </div>
            ) : (
                <div className="bg-white rounded-xl p-6 border border-dashed border-gray-300 text-center text-gray-400">
                    <Coins size={32} className="mx-auto mb-2 opacity-50" />
                    <p className="font-medium">No hay cotizaciones para {activeCurrency}</p>
                    <p className="text-xs mt-1">Hacé click en "Nueva Cotización" para agregar una</p>
                </div>
            )}

            {/* Table */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                    <h3 className="font-bold text-sm text-gray-700 flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-lg text-xs font-black ${CURRENCY_COLORS[activeCurrency] || 'bg-gray-100 text-gray-700'}`}>{activeCurrency}</span>
                        Historial de cotizaciones
                    </h3>
                    <span className="text-xs text-gray-400">{filteredRates.length} registros</span>
                </div>
                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-100">
                                <th className="px-4 py-3 text-left font-semibold text-gray-700">Fecha</th>
                                <th className="px-4 py-3 text-right font-semibold text-green-600">Compra</th>
                                <th className="px-4 py-3 text-right font-semibold text-red-600">Venta</th>
                                <th className="px-4 py-3 text-right font-semibold text-gray-700">Spread</th>
                                <th className="px-4 py-3 text-left font-semibold text-gray-700">Fuente</th>
                                <th className="px-4 py-3 text-left font-semibold text-gray-700">Registrado por</th>
                                <th className="px-4 py-3 text-right font-semibold text-gray-700">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {filteredRates.map(r => (
                                <tr key={r.id} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="px-4 py-3 font-medium text-gray-900">
                                        {new Date(r.date + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                                    </td>
                                    <td className="px-4 py-3 text-right font-mono font-bold text-green-600">$ {Number(r.buy_rate).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                    <td className="px-4 py-3 text-right font-mono font-bold text-red-600">$ {Number(r.sell_rate).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                    <td className="px-4 py-3 text-right font-mono text-gray-600">$ {spread(r)}</td>
                                    <td className="px-4 py-3 text-gray-500 capitalize">{r.source}</td>
                                    <td className="px-4 py-3 text-gray-500">{r.created_by || '-'}
                                        {r.updated_by && <span className="text-xs text-amber-600 ml-1">(editado por {r.updated_by})</span>}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <div className="flex justify-end gap-1">
                                            <button onClick={() => openEdit(r)} className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                                                <Pencil size={14} />
                                            </button>
                                            <button onClick={() => handleDelete(r.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredRates.length === 0 && (
                                <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-400">No hay cotizaciones para {activeCurrency}</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
                {/* Mobile Cards */}
                <div className="md:hidden grid grid-cols-1 gap-3 p-4">
                    {filteredRates.length === 0 ? (
                        <p className="text-center text-gray-400 text-sm py-8">No hay cotizaciones para {activeCurrency}</p>
                    ) : filteredRates.map(r => (
                        <div key={r.id} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                            <div className="flex items-center justify-between mb-3">
                                <span className="font-medium text-gray-900 text-sm">
                                    {new Date(r.date + 'T12:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </span>
                                <div className="flex items-center gap-1">
                                    <button onClick={() => openEdit(r)} className="p-1.5 text-gray-400 hover:text-indigo-600 rounded-lg"><Pencil size={14} /></button>
                                    <button onClick={() => handleDelete(r.id)} className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg"><Trash2 size={14} /></button>
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-2 text-center">
                                <div className="bg-green-50 rounded-lg p-2">
                                    <p className="text-[10px] text-green-600 font-semibold">Compra</p>
                                    <p className="font-mono font-bold text-green-700 text-sm">$ {Number(r.buy_rate).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                                </div>
                                <div className="bg-red-50 rounded-lg p-2">
                                    <p className="text-[10px] text-red-600 font-semibold">Venta</p>
                                    <p className="font-mono font-bold text-red-700 text-sm">$ {Number(r.sell_rate).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                                </div>
                                <div className="bg-gray-50 rounded-lg p-2">
                                    <p className="text-[10px] text-gray-500 font-semibold">Spread</p>
                                    <p className="font-mono font-bold text-gray-700 text-sm">$ {spread(r)}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
                                <span className="capitalize">{r.source}</span>
                                {r.created_by && <span>• {r.created_by}</span>}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {showModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowModal(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                        {/* Gradient Header */}
                        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-5 text-white flex-shrink-0">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                    <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                                        <DollarSign size={22} />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-bold">{editItem ? 'Editar Cotización' : 'Nueva Cotización'}</h2>
                                        <p className="text-blue-100 text-sm">Registro de tipo de cambio</p>
                                    </div>
                                </div>
                                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
                                    <X size={18} />
                                </button>
                            </div>
                        </div>

                        <div className="overflow-y-auto flex-1 p-6 space-y-6">
                            {/* Fecha y Moneda */}
                            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 space-y-4">
                                <h4 className="text-xs font-semibold text-indigo-700 uppercase tracking-wide flex items-center">
                                    <Calendar size={14} className="mr-1.5" /> Fecha y Moneda
                                </h4>
                                <div>
                                    <label className="block text-xs text-gray-600 mb-1">Fecha *</label>
                                    <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 bg-white" />
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-600 mb-1">Moneda</label>
                                    <div className="flex flex-wrap gap-2">
                                        {CURRENCY_OPTIONS.map(cur => (
                                            <button key={cur} type="button" onClick={() => setForm({ ...form, currency: cur })}
                                                className={`px-3 py-2 rounded-lg text-sm font-bold border transition-all ${form.currency === cur
                                                    ? `${CURRENCY_COLORS[cur] || 'bg-gray-200 text-gray-800'} ring-2 ring-offset-1 ring-current/20`
                                                    : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}>
                                                {cur}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Cotizaciones */}
                            <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-4">
                                <h4 className="text-xs font-semibold text-green-700 uppercase tracking-wide">💱 Cotizaciones</h4>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs text-green-600 font-medium mb-1">Compra (ARS)</label>
                                        <input type="number" step="0.01" value={form.buy_rate} onChange={e => setForm({ ...form, buy_rate: parseFloat(e.target.value) || 0 })} className="w-full px-3 py-2.5 border border-green-200 bg-white rounded-lg text-sm focus:ring-2 focus:ring-green-500" />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-red-600 font-medium mb-1">Venta (ARS)</label>
                                        <input type="number" step="0.01" value={form.sell_rate} onChange={e => setForm({ ...form, sell_rate: parseFloat(e.target.value) || 0 })} className="w-full px-3 py-2.5 border border-red-200 bg-white rounded-lg text-sm focus:ring-2 focus:ring-red-500" />
                                    </div>
                                </div>
                            </div>

                            {/* Fuente y Autor */}
                            <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 space-y-4">
                                <h4 className="text-xs font-semibold text-orange-700 uppercase tracking-wide">📋 Fuente</h4>
                                <div>
                                    <label className="block text-xs text-gray-600 mb-1">Fuente</label>
                                    <select value={form.source} onChange={e => setForm({ ...form, source: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 bg-white">
                                        <option value="manual">Manual</option>
                                        <option value="banco_nacion">Banco Nación</option>
                                        <option value="blue">Dólar Blue</option>
                                        <option value="mep">Dólar MEP</option>
                                        <option value="crypto">Crypto</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-600 mb-1">Registrado por</label>
                                    <input type="text" value={form.created_by} onChange={e => setForm({ ...form, created_by: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 bg-white" placeholder="admin" />
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-5 border-t border-gray-100 flex justify-between items-center flex-shrink-0 bg-gray-50">
                            <button onClick={() => setShowModal(false)} className="px-4 py-2.5 text-gray-600 hover:text-gray-900 text-sm font-medium">Cancelar</button>
                            <button onClick={handleSave} className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-medium hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-200 transition-all">
                                <Save size={14} /> {editItem ? 'Guardar Cambios' : 'Crear Cotización'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
