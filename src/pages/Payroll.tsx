import { useState, useEffect } from 'react';
import {
    Banknote, Plus, Trash2, Search, X, FileText, CalendarDays, Settings2,
    ChevronRight, CheckCircle2, Clock, DollarSign, Users, Download, Eye,
    ArrowLeft, Pencil, AlertTriangle, Check
} from 'lucide-react';
import api from '../api/client';

// ─── Types ────────────────────────────────────────────────────────
interface Concept {
    id: number; code: string; name: string; type: string; category: string;
    calc_mode: string; default_rate: number; applies_to: string;
    is_mandatory: boolean; is_active: boolean; sort_order: number;
}
interface Period {
    id: number; year: number; month: number; description: string;
    period_type: string; status: string; notes: string | null;
    slip_count: number; total_net: number; total_employer_cost: number;
    created_at: string | null;
}
interface Slip {
    id: number; period_id: number; employee_id: number;
    employee_name: string; legajo: string; department: string;
    gross_salary: number; total_remunerativo: number;
    total_no_remunerativo: number; total_deductions: number;
    net_salary: number; total_employer_cost: number;
    status: string; payment_date: string | null; notes: string | null;
    items?: SlipItem[];
}
interface SlipItem {
    id: number; concept_id: number | null; concept_code: string | null;
    concept_name: string; type: string; rate: number | null;
    base_amount: number | null; amount: number; sort_order: number;
}

const MONTHS = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
    draft: { label: 'Borrador', color: 'text-gray-600', bg: 'bg-gray-100' },
    confirmed: { label: 'Confirmado', color: 'text-blue-700', bg: 'bg-blue-100' },
    paid: { label: 'Pagado', color: 'text-green-700', bg: 'bg-green-100' },
};

const TYPE_LABELS: Record<string, string> = {
    remunerativo: 'Remunerativo', no_remunerativo: 'No Remunerativo',
    deduccion: 'Deducción', employer_cost: 'Costo Empleador',
};

const fmt = (n: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(n);

export default function Payroll() {
    const [tab, setTab] = useState<'periods' | 'slip' | 'concepts'>('periods');
    const [periods, setPeriods] = useState<Period[]>([]);
    const [concepts, setConcepts] = useState<Concept[]>([]);
    const [slips, setSlips] = useState<Slip[]>([]);
    const [selectedPeriod, setSelectedPeriod] = useState<Period | null>(null);
    const [selectedSlip, setSelectedSlip] = useState<Slip | null>(null);
    const [loading, setLoading] = useState(false);

    // Modals
    const [showNewPeriod, setShowNewPeriod] = useState(false);
    const [showNewConcept, setShowNewConcept] = useState(false);
    const [editConcept, setEditConcept] = useState<Concept | null>(null);
    const [newMonth, setNewMonth] = useState(new Date().getMonth() + 1);
    const [newYear, setNewYear] = useState(new Date().getFullYear());

    // Concept form
    const [cForm, setCForm] = useState({ code: '', name: '', type: 'deduccion', category: 'otro', calc_mode: 'porcentaje', default_rate: 0, applies_to: 'employee', is_mandatory: false, sort_order: 0 });

    // ─── Data Fetching ──────────────────────────────────────────
    const fetchPeriods = async () => {
        try {
            const { data } = await api.get('/payroll/periods');
            setPeriods(data);
        } catch (e) { console.error(e); }
    };

    const fetchConcepts = async () => {
        try {
            const { data } = await api.get('/payroll/concepts');
            setConcepts(data);
        } catch (e) { console.error(e); }
    };

    const fetchSlips = async (periodId: number) => {
        try {
            const { data } = await api.get('/payroll/slips', { params: { period_id: periodId } });
            setSlips(data);
        } catch (e) { console.error(e); }
    };

    const fetchSlipDetail = async (slipId: number) => {
        try {
            const { data } = await api.get(`/payroll/slips/${slipId}`);
            setSelectedSlip(data);
        } catch (e) { console.error(e); }
    };

    useEffect(() => { fetchPeriods(); fetchConcepts(); }, []);

    // ─── Actions ──────────────────────────────────────────────────
    const createPeriod = async () => {
        try {
            await api.post('/payroll/periods', { year: newYear, month: newMonth });
            setShowNewPeriod(false);
            fetchPeriods();
        } catch (e: any) { alert(e.response?.data?.detail || 'Error'); }
    };

    const generateSlips = async (pid: number) => {
        if (!confirm('¿Generar recibos para todos los empleados activos?')) return;
        setLoading(true);
        try {
            const { data } = await api.post(`/payroll/periods/${pid}/generate`);
            alert(`${data.message}`);
            fetchPeriods();
            if (selectedPeriod?.id === pid) fetchSlips(pid);
        } catch (e: any) { alert(e.response?.data?.detail || 'Error'); }
        finally { setLoading(false); }
    };

    const confirmPeriod = async (pid: number) => {
        if (!confirm('¿Confirmar este período? Los recibos no podrán modificarse.')) return;
        await api.put(`/payroll/periods/${pid}/confirm`);
        fetchPeriods();
        if (selectedPeriod?.id === pid) fetchSlips(pid);
    };

    const markPaid = async (pid: number) => {
        if (!confirm('¿Marcar como pagado?')) return;
        await api.put(`/payroll/periods/${pid}/pay`);
        fetchPeriods();
        if (selectedPeriod?.id === pid) fetchSlips(pid);
    };

    const deletePeriod = async (pid: number) => {
        if (!confirm('¿Eliminar este período y todos sus recibos?')) return;
        await api.delete(`/payroll/periods/${pid}`);
        fetchPeriods();
        if (selectedPeriod?.id === pid) { setSelectedPeriod(null); setSlips([]); }
    };

    const saveConcept = async () => {
        try {
            if (editConcept) {
                await api.put(`/payroll/concepts/${editConcept.id}`, cForm);
            } else {
                await api.post('/payroll/concepts', cForm);
            }
            setShowNewConcept(false);
            setEditConcept(null);
            fetchConcepts();
        } catch (e: any) { alert(e.response?.data?.detail || 'Error'); }
    };

    const deleteConcept = async (cid: number) => {
        if (!confirm('¿Eliminar este concepto?')) return;
        await api.delete(`/payroll/concepts/${cid}`);
        fetchConcepts();
    };

    const openEditConcept = (c: Concept) => {
        setCForm({ code: c.code, name: c.name, type: c.type, category: c.category, calc_mode: c.calc_mode, default_rate: c.default_rate, applies_to: c.applies_to, is_mandatory: c.is_mandatory, sort_order: c.sort_order });
        setEditConcept(c);
        setShowNewConcept(true);
    };

    const openNewConcept = () => {
        setCForm({ code: '', name: '', type: 'deduccion', category: 'otro', calc_mode: 'porcentaje', default_rate: 0, applies_to: 'employee', is_mandatory: false, sort_order: 0 });
        setEditConcept(null);
        setShowNewConcept(true);
    };

    const openPeriodSlips = (p: Period) => {
        setSelectedPeriod(p);
        setSelectedSlip(null);
        fetchSlips(p.id);
        setTab('periods');
    };

    // ─── Render ───────────────────────────────────────────────────
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100 gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-sm">
                        <Banknote size={20} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-gray-900">Liquidación de Sueldos</h1>
                        <p className="text-xs text-gray-400">Planillas, recibos y conceptos de haberes</p>
                    </div>
                </div>
                <div className="flex bg-gray-100 rounded-lg p-0.5">
                    <button onClick={() => { setTab('periods'); setSelectedSlip(null); }}
                        className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${tab === 'periods' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>
                        <CalendarDays size={14} className="inline mr-1" /> Períodos
                    </button>
                    <button onClick={() => { setTab('concepts'); setSelectedSlip(null); }}
                        className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${tab === 'concepts' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>
                        <Settings2 size={14} className="inline mr-1" /> Conceptos
                    </button>
                </div>
            </div>

            {/* ─── SLIP DETAIL VIEW ────────────────────────────── */}
            {selectedSlip ? (
                <div className="space-y-4">
                    <button onClick={() => setSelectedSlip(null)} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 transition-colors">
                        <ArrowLeft size={16} /> Volver a recibos
                    </button>

                    {/* Slip Header */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                        <div className="flex flex-col sm:flex-row justify-between gap-4">
                            <div>
                                <h2 className="text-lg font-black text-gray-900">{selectedSlip.employee_name}</h2>
                                <p className="text-xs text-gray-400">Legajo: {selectedSlip.legajo} · {selectedSlip.department}</p>
                            </div>
                            <div className="text-right">
                                <span className={`px-2 py-1 rounded-full text-xs font-bold ${STATUS_MAP[selectedSlip.status]?.bg} ${STATUS_MAP[selectedSlip.status]?.color}`}>
                                    {STATUS_MAP[selectedSlip.status]?.label}
                                </span>
                            </div>
                        </div>

                        {/* Summary Cards */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                            <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-100">
                                <p className="text-[10px] font-bold text-emerald-600 uppercase">Bruto</p>
                                <p className="text-xl font-black text-emerald-800">{fmt(selectedSlip.gross_salary)}</p>
                            </div>
                            <div className="bg-red-50 p-3 rounded-xl border border-red-100">
                                <p className="text-[10px] font-bold text-red-600 uppercase">Deducciones</p>
                                <p className="text-xl font-black text-red-800">{fmt(selectedSlip.total_deductions)}</p>
                            </div>
                            <div className="bg-blue-50 p-3 rounded-xl border border-blue-100">
                                <p className="text-[10px] font-bold text-blue-600 uppercase">Neto</p>
                                <p className="text-xl font-black text-blue-800">{fmt(selectedSlip.net_salary)}</p>
                            </div>
                            <div className="bg-amber-50 p-3 rounded-xl border border-amber-100">
                                <p className="text-[10px] font-bold text-amber-600 uppercase">Costo Empleador</p>
                                <p className="text-xl font-black text-amber-800">{fmt(selectedSlip.total_employer_cost)}</p>
                            </div>
                        </div>
                    </div>

                    {/* Items Table */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="px-5 py-3 border-b border-gray-100">
                            <h3 className="font-bold text-gray-800 text-sm">Detalle del Recibo</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="text-left px-4 py-2.5 font-bold text-gray-600 text-xs uppercase">Concepto</th>
                                        <th className="text-left px-4 py-2.5 font-bold text-gray-600 text-xs uppercase">Tipo</th>
                                        <th className="text-right px-4 py-2.5 font-bold text-gray-600 text-xs uppercase">Tasa %</th>
                                        <th className="text-right px-4 py-2.5 font-bold text-gray-600 text-xs uppercase">Base</th>
                                        <th className="text-right px-4 py-2.5 font-bold text-gray-600 text-xs uppercase">Haberes</th>
                                        <th className="text-right px-4 py-2.5 font-bold text-gray-600 text-xs uppercase">Deducciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {selectedSlip.items?.map(item => {
                                        const isRem = item.type === 'remunerativo' || item.type === 'no_remunerativo';
                                        const isDed = item.type === 'deduccion';
                                        const isEmp = item.type === 'employer_cost';
                                        return (
                                            <tr key={item.id} className={`hover:bg-gray-50 ${isEmp ? 'bg-amber-50/50' : ''}`}>
                                                <td className="px-4 py-2.5 font-medium text-gray-900">
                                                    {item.concept_code && <span className="text-gray-400 text-xs mr-1">{item.concept_code}</span>}
                                                    {item.concept_name}
                                                </td>
                                                <td className="px-4 py-2.5">
                                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold
                                                        ${isRem ? 'bg-green-100 text-green-700' : isDed ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                                                        {TYPE_LABELS[item.type] || item.type}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-2.5 text-right text-gray-500">{item.rate != null ? `${item.rate}%` : '—'}</td>
                                                <td className="px-4 py-2.5 text-right text-gray-500">{item.base_amount != null ? fmt(item.base_amount) : '—'}</td>
                                                <td className="px-4 py-2.5 text-right font-bold text-green-700">{isRem ? fmt(item.amount) : ''}</td>
                                                <td className="px-4 py-2.5 text-right font-bold text-red-700">{(isDed || isEmp) ? fmt(item.amount) : ''}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                                <tfoot className="bg-gray-50 font-bold">
                                    <tr>
                                        <td colSpan={4} className="px-4 py-2.5 text-right text-gray-700">Totales:</td>
                                        <td className="px-4 py-2.5 text-right text-green-800">{fmt(selectedSlip.total_remunerativo + selectedSlip.total_no_remunerativo)}</td>
                                        <td className="px-4 py-2.5 text-right text-red-800">{fmt(selectedSlip.total_deductions)}</td>
                                    </tr>
                                    <tr className="bg-blue-50">
                                        <td colSpan={4} className="px-4 py-3 text-right text-blue-900 text-base font-black">NETO A COBRAR:</td>
                                        <td colSpan={2} className="px-4 py-3 text-right text-blue-900 text-lg font-black">{fmt(selectedSlip.net_salary)}</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>
                </div>
            ) : tab === 'periods' ? (
                /* ─── PERIODS TAB ──────────────────────────── */
                <div className="space-y-4">
                    {!selectedPeriod ? (
                        <>
                            <div className="flex justify-between items-center">
                                <h2 className="text-sm font-bold text-gray-700">Períodos de Liquidación</h2>
                                <button onClick={() => setShowNewPeriod(true)}
                                    className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-lg text-sm font-bold shadow-sm hover:shadow-md transition-all">
                                    <Plus size={16} /> Nuevo Período
                                </button>
                            </div>

                            {periods.length === 0 ? (
                                <div className="bg-white rounded-xl border p-12 text-center text-gray-400">
                                    <CalendarDays size={40} className="mx-auto mb-3 text-gray-300" />
                                    <p className="font-medium">No hay períodos creados</p>
                                    <p className="text-xs mt-1">Creá uno para empezar a liquidar</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {periods.map(p => {
                                        const st = STATUS_MAP[p.status] || STATUS_MAP.draft;
                                        return (
                                            <div key={p.id} className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all overflow-hidden">
                                                <div className="p-4">
                                                    <div className="flex justify-between items-start mb-3">
                                                        <div>
                                                            <h3 className="font-black text-gray-900">{p.description}</h3>
                                                            <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${st.bg} ${st.color}`}>{st.label}</span>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-xs text-gray-400">{p.slip_count} recibos</p>
                                                        </div>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-2 mb-3">
                                                        <div className="bg-blue-50 p-2 rounded-lg text-center">
                                                            <p className="text-[9px] font-bold text-blue-600 uppercase">Total Neto</p>
                                                            <p className="text-sm font-black text-blue-800">{fmt(p.total_net)}</p>
                                                        </div>
                                                        <div className="bg-amber-50 p-2 rounded-lg text-center">
                                                            <p className="text-[9px] font-bold text-amber-600 uppercase">Costo Emp.</p>
                                                            <p className="text-sm font-black text-amber-800">{fmt(p.total_employer_cost)}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="border-t border-gray-100 px-4 py-2 flex items-center justify-between bg-gray-50/50">
                                                    <button onClick={() => openPeriodSlips(p)} className="text-xs font-bold text-emerald-600 hover:text-emerald-800 flex items-center gap-1">
                                                        <Eye size={12} /> Ver Recibos
                                                    </button>
                                                    <div className="flex items-center gap-1">
                                                        {p.status === 'draft' && (
                                                            <>
                                                                <button onClick={() => generateSlips(p.id)} disabled={loading}
                                                                    className="px-2 py-1 text-[10px] font-bold bg-violet-100 text-violet-700 rounded-lg hover:bg-violet-200 transition-colors disabled:opacity-50">
                                                                    Generar
                                                                </button>
                                                                <button onClick={() => confirmPeriod(p.id)}
                                                                    className="px-2 py-1 text-[10px] font-bold bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors">
                                                                    Confirmar
                                                                </button>
                                                                <button onClick={() => deletePeriod(p.id)}
                                                                    className="p-1 text-gray-400 hover:text-red-600 transition-colors">
                                                                    <Trash2 size={12} />
                                                                </button>
                                                            </>
                                                        )}
                                                        {p.status === 'confirmed' && (
                                                            <button onClick={() => markPaid(p.id)}
                                                                className="px-2 py-1 text-[10px] font-bold bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors">
                                                                <Check size={10} className="inline mr-0.5" /> Marcar Pagado
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </>
                    ) : (
                        /* ─── SLIPS LIST FOR A PERIOD ─────────── */
                        <>
                            <div className="flex items-center gap-3">
                                <button onClick={() => { setSelectedPeriod(null); setSlips([]); }} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800">
                                    <ArrowLeft size={16} /> Volver
                                </button>
                                <h2 className="font-black text-gray-900">Recibos — {selectedPeriod.description}</h2>
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${STATUS_MAP[selectedPeriod.status]?.bg} ${STATUS_MAP[selectedPeriod.status]?.color}`}>
                                    {STATUS_MAP[selectedPeriod.status]?.label}
                                </span>
                            </div>

                            {slips.length === 0 ? (
                                <div className="bg-white rounded-xl border p-12 text-center text-gray-400">
                                    <FileText size={40} className="mx-auto mb-3 text-gray-300" />
                                    <p className="font-medium">No hay recibos generados</p>
                                    {selectedPeriod.status === 'draft' && (
                                        <button onClick={() => generateSlips(selectedPeriod.id)}
                                            className="mt-3 px-4 py-2 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-lg text-sm font-bold shadow-sm">
                                            Generar Recibos
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                                    {/* Summary bar */}
                                    <div className="px-5 py-3 border-b border-gray-100 grid grid-cols-2 sm:grid-cols-4 gap-3">
                                        <div><p className="text-[10px] text-gray-400 font-bold">Empleados</p><p className="font-black text-gray-900">{slips.length}</p></div>
                                        <div><p className="text-[10px] text-gray-400 font-bold">Total Bruto</p><p className="font-black text-emerald-700">{fmt(slips.reduce((s, r) => s + r.gross_salary, 0))}</p></div>
                                        <div><p className="text-[10px] text-gray-400 font-bold">Total Neto</p><p className="font-black text-blue-700">{fmt(slips.reduce((s, r) => s + r.net_salary, 0))}</p></div>
                                        <div><p className="text-[10px] text-gray-400 font-bold">Costo Empleador</p><p className="font-black text-amber-700">{fmt(slips.reduce((s, r) => s + r.total_employer_cost, 0))}</p></div>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th className="text-left px-4 py-2.5 font-bold text-gray-600 text-xs uppercase">Empleado</th>
                                                    <th className="text-left px-4 py-2.5 font-bold text-gray-600 text-xs uppercase">Legajo</th>
                                                    <th className="text-right px-4 py-2.5 font-bold text-gray-600 text-xs uppercase">Bruto</th>
                                                    <th className="text-right px-4 py-2.5 font-bold text-gray-600 text-xs uppercase">Deducciones</th>
                                                    <th className="text-right px-4 py-2.5 font-bold text-gray-600 text-xs uppercase">Neto</th>
                                                    <th className="text-right px-4 py-2.5 font-bold text-gray-600 text-xs uppercase">Costo Emp.</th>
                                                    <th className="text-right px-4 py-2.5 font-bold text-gray-600 text-xs uppercase">Acción</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-50">
                                                {slips.map(s => (
                                                    <tr key={s.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => fetchSlipDetail(s.id)}>
                                                        <td className="px-4 py-2.5 font-bold text-gray-900">{s.employee_name}</td>
                                                        <td className="px-4 py-2.5 font-mono text-xs text-teal-600">{s.legajo}</td>
                                                        <td className="px-4 py-2.5 text-right text-gray-700">{fmt(s.gross_salary)}</td>
                                                        <td className="px-4 py-2.5 text-right text-red-600">{fmt(s.total_deductions)}</td>
                                                        <td className="px-4 py-2.5 text-right font-bold text-blue-700">{fmt(s.net_salary)}</td>
                                                        <td className="px-4 py-2.5 text-right text-amber-600">{fmt(s.total_employer_cost)}</td>
                                                        <td className="px-4 py-2.5 text-right">
                                                            <button className="text-emerald-600 hover:text-emerald-800"><Eye size={14} /></button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            ) : (
                /* ─── CONCEPTS TAB ─────────────────────────── */
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h2 className="text-sm font-bold text-gray-700">Conceptos de Haberes y Deducciones</h2>
                        <button onClick={openNewConcept}
                            className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-lg text-sm font-bold shadow-sm hover:shadow-md transition-all">
                            <Plus size={16} /> Nuevo Concepto
                        </button>
                    </div>

                    {/* Concepts split: Employee vs Employer */}
                    {['employee', 'employer'].map(scope => (
                        <div key={scope} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="px-5 py-3 border-b border-gray-100">
                                <h3 className="font-bold text-gray-800 text-sm">{scope === 'employee' ? '🧑 Conceptos del Empleado' : '🏢 Contribuciones Patronales'}</h3>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="text-left px-4 py-2 font-bold text-gray-600 text-xs uppercase">Código</th>
                                            <th className="text-left px-4 py-2 font-bold text-gray-600 text-xs uppercase">Nombre</th>
                                            <th className="text-left px-4 py-2 font-bold text-gray-600 text-xs uppercase">Tipo</th>
                                            <th className="text-right px-4 py-2 font-bold text-gray-600 text-xs uppercase">Tasa %</th>
                                            <th className="text-center px-4 py-2 font-bold text-gray-600 text-xs uppercase">Obligatorio</th>
                                            <th className="text-right px-4 py-2 font-bold text-gray-600 text-xs uppercase">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {concepts.filter(c => c.applies_to === scope || c.applies_to === 'both').map(c => (
                                            <tr key={c.id} className="hover:bg-gray-50">
                                                <td className="px-4 py-2 font-mono text-xs font-bold text-teal-600">{c.code}</td>
                                                <td className="px-4 py-2 font-medium text-gray-900">{c.name}</td>
                                                <td className="px-4 py-2">
                                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${c.type === 'remunerativo' ? 'bg-green-100 text-green-700' : c.type === 'deduccion' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'}`}>
                                                        {TYPE_LABELS[c.type] || c.type}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-2 text-right">{c.calc_mode === 'porcentaje' ? `${c.default_rate}%` : fmt(c.default_rate)}</td>
                                                <td className="px-4 py-2 text-center">{c.is_mandatory ? <CheckCircle2 size={14} className="text-green-600 mx-auto" /> : '—'}</td>
                                                <td className="px-4 py-2 text-right">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <button onClick={() => openEditConcept(c)} className="p-1 text-gray-400 hover:text-blue-600"><Pencil size={13} /></button>
                                                        <button onClick={() => deleteConcept(c.id)} className="p-1 text-gray-400 hover:text-red-600"><Trash2 size={13} /></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* ─── NEW PERIOD MODAL ────────────────────────── */}
            {showNewPeriod && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowNewPeriod(false)}>
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
                        <h3 className="text-lg font-black text-gray-900 mb-4">Nuevo Período</h3>
                        <div className="space-y-3">
                            <div>
                                <label className="text-xs font-bold text-gray-600">Mes</label>
                                <select value={newMonth} onChange={e => setNewMonth(Number(e.target.value))}
                                    className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm">
                                    {MONTHS.slice(1).map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-600">Año</label>
                                <input type="number" value={newYear} onChange={e => setNewYear(Number(e.target.value))}
                                    className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 mt-5">
                            <button onClick={() => setShowNewPeriod(false)} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700">Cancelar</button>
                            <button onClick={createPeriod} className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-lg text-sm font-bold">Crear</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── CONCEPT MODAL ───────────────────────────── */}
            {showNewConcept && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => { setShowNewConcept(false); setEditConcept(null); }}>
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6" onClick={e => e.stopPropagation()}>
                        <h3 className="text-lg font-black text-gray-900 mb-4">{editConcept ? 'Editar' : 'Nuevo'} Concepto</h3>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-bold text-gray-600">Código</label>
                                <input value={cForm.code} onChange={e => setCForm({ ...cForm, code: e.target.value })}
                                    className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" placeholder="JUB_EMP" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-600">Nombre</label>
                                <input value={cForm.name} onChange={e => setCForm({ ...cForm, name: e.target.value })}
                                    className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" placeholder="Jubilación" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-600">Tipo</label>
                                <select value={cForm.type} onChange={e => setCForm({ ...cForm, type: e.target.value })}
                                    className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm">
                                    <option value="remunerativo">Remunerativo</option>
                                    <option value="no_remunerativo">No Remunerativo</option>
                                    <option value="deduccion">Deducción</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-600">Categoría</label>
                                <select value={cForm.category} onChange={e => setCForm({ ...cForm, category: e.target.value })}
                                    className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm">
                                    <option value="jubilacion">Jubilación</option>
                                    <option value="pami">PAMI</option>
                                    <option value="obra_social">Obra Social</option>
                                    <option value="sindicato">Sindicato</option>
                                    <option value="ganancias">Imp. Ganancias</option>
                                    <option value="sac">SAC/Aguinaldo</option>
                                    <option value="vacaciones">Vacaciones</option>
                                    <option value="sueldo">Sueldo</option>
                                    <option value="otro">Otro</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-600">Cálculo</label>
                                <select value={cForm.calc_mode} onChange={e => setCForm({ ...cForm, calc_mode: e.target.value })}
                                    className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm">
                                    <option value="porcentaje">Porcentaje</option>
                                    <option value="fijo">Monto Fijo</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-600">{cForm.calc_mode === 'porcentaje' ? 'Tasa %' : 'Monto Fijo'}</label>
                                <input type="number" step="0.01" value={cForm.default_rate}
                                    onChange={e => setCForm({ ...cForm, default_rate: parseFloat(e.target.value) || 0 })}
                                    className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-600">Aplica a</label>
                                <select value={cForm.applies_to} onChange={e => setCForm({ ...cForm, applies_to: e.target.value })}
                                    className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm">
                                    <option value="employee">Empleado</option>
                                    <option value="employer">Empleador</option>
                                    <option value="both">Ambos</option>
                                </select>
                            </div>
                            <div className="flex items-center gap-2 mt-auto">
                                <input type="checkbox" checked={cForm.is_mandatory} onChange={e => setCForm({ ...cForm, is_mandatory: e.target.checked })} />
                                <label className="text-xs font-bold text-gray-600">Obligatorio</label>
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 mt-5">
                            <button onClick={() => { setShowNewConcept(false); setEditConcept(null); }} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700">Cancelar</button>
                            <button onClick={saveConcept} className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-lg text-sm font-bold">
                                {editConcept ? 'Guardar' : 'Crear'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
