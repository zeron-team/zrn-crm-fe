import { useState, useEffect, useCallback } from 'react';
import {
    CalendarDays, Plus, X, Search, Filter, CheckCircle2, Clock, XCircle,
    AlertTriangle, Briefcase, Heart, Baby, BookOpen, Umbrella, Coffee,
    UserCircle, ChevronDown, Trash2, Edit3, FileText
} from 'lucide-react';
import api from '../api/client';

interface Novelty {
    id: number;
    employee_id: number;
    employee_name: string;
    employee_legajo: string | null;
    employee_department: string | null;
    type: string;
    status: string;
    start_date: string;
    end_date: string;
    days_count: number;
    reason: string | null;
    notes: string | null;
    attachment_url: string | null;
    requested_by_name: string | null;
    approved_by_name: string | null;
    approved_at: string | null;
    created_at: string;
}

interface Employee {
    id: number;
    first_name: string;
    last_name: string;
    legajo: string;
    department: string | null;
    is_active: boolean;
}

const TYPES: Record<string, { label: string; icon: any; color: string; bg: string }> = {
    vacation: { label: 'Vacaciones', icon: Umbrella, color: '#2563eb', bg: '#dbeafe' },
    medical_leave: { label: 'Licencia Médica', icon: Heart, color: '#dc2626', bg: '#fee2e2' },
    personal_leave: { label: 'Licencia Personal', icon: UserCircle, color: '#7c3aed', bg: '#f3e8ff' },
    absence: { label: 'Ausencia', icon: XCircle, color: '#f59e0b', bg: '#fef3c7' },
    overtime: { label: 'Horas Extra', icon: Clock, color: '#059669', bg: '#d1fae5' },
    late_arrival: { label: 'Llegada Tarde', icon: Coffee, color: '#d97706', bg: '#ffedd5' },
    maternity: { label: 'Maternidad', icon: Baby, color: '#ec4899', bg: '#fce7f3' },
    paternity: { label: 'Paternidad', icon: Baby, color: '#3b82f6', bg: '#dbeafe' },
    study_leave: { label: 'Licencia por Estudio', icon: BookOpen, color: '#6366f1', bg: '#e0e7ff' },
    bereavement: { label: 'Duelo', icon: Heart, color: '#6b7280', bg: '#f3f4f6' },
    compensatory: { label: 'Franco Compensatorio', icon: CalendarDays, color: '#0891b2', bg: '#cffafe' },
    other: { label: 'Otro', icon: FileText, color: '#9ca3af', bg: '#f9fafb' },
};

const STATUS_COLORS: Record<string, { label: string; bg: string; text: string; icon: any }> = {
    pending: { label: 'Pendiente', bg: '#fef3c7', text: '#92400e', icon: Clock },
    approved: { label: 'Aprobado', bg: '#d1fae5', text: '#065f46', icon: CheckCircle2 },
    rejected: { label: 'Rechazado', bg: '#fee2e2', text: '#991b1b', icon: XCircle },
    cancelled: { label: 'Cancelado', bg: '#f3f4f6', text: '#6b7280', icon: AlertTriangle },
};

export default function EmployeeNovelties() {
    const [novelties, setNovelties] = useState<Novelty[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState<Novelty | null>(null);
    const [search, setSearch] = useState('');
    const [filterType, setFilterType] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [filterEmployee, setFilterEmployee] = useState('');

    const [form, setForm] = useState({
        employee_id: '', type: 'vacation', start_date: '', end_date: '',
        days_count: 1, reason: '', notes: '',
    });

    const load = useCallback(async () => {
        const params: any = {};
        if (filterType) params.type = filterType;
        if (filterStatus) params.status = filterStatus;
        if (filterEmployee) params.employee_id = filterEmployee;
        const { data } = await api.get('/employee-novelties', { params });
        setNovelties(data);
    }, [filterType, filterStatus, filterEmployee]);

    useEffect(() => { load(); }, [load]);
    useEffect(() => { api.get('/employees').then(r => setEmployees(r.data.filter((e: Employee) => e.is_active))).catch(() => { }); }, []);

    const openCreate = () => {
        setEditing(null);
        setForm({ employee_id: '', type: 'vacation', start_date: '', end_date: '', days_count: 1, reason: '', notes: '' });
        setShowModal(true);
    };

    const openEdit = (n: Novelty) => {
        setEditing(n);
        setForm({
            employee_id: String(n.employee_id), type: n.type,
            start_date: n.start_date, end_date: n.end_date,
            days_count: n.days_count, reason: n.reason || '', notes: n.notes || '',
        });
        setShowModal(true);
    };

    const save = async () => {
        const payload = {
            ...form,
            employee_id: parseInt(form.employee_id),
            days_count: Number(form.days_count),
        };
        if (editing) {
            await api.put(`/employee-novelties/${editing.id}`, payload);
        } else {
            await api.post('/employee-novelties', payload);
        }
        setShowModal(false);
        load();
    };

    const changeStatus = async (id: number, status: string) => {
        await api.patch(`/employee-novelties/${id}/status`, { status });
        load();
    };

    const deleteNovelty = async (id: number) => {
        if (!confirm('¿Eliminar esta novedad?')) return;
        await api.delete(`/employee-novelties/${id}`);
        load();
    };

    const filtered = novelties.filter(n =>
        n.employee_name.toLowerCase().includes(search.toLowerCase()) ||
        n.reason?.toLowerCase().includes(search.toLowerCase()) ||
        TYPES[n.type]?.label.toLowerCase().includes(search.toLowerCase())
    );

    const formatDate = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' });

    // Summary counts
    const pendingCount = novelties.filter(n => n.status === 'pending').length;
    const approvedCount = novelties.filter(n => n.status === 'approved').length;

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-gray-50">
            {/* Header */}
            <div className="px-4 sm:px-6 py-4 bg-white border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between flex-shrink-0 gap-3">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-rose-500 to-pink-600 rounded-xl flex items-center justify-center shadow-lg shadow-rose-200/50">
                        <CalendarDays size={20} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-gray-900">Novedades</h1>
                        <p className="text-xs text-gray-400">{filtered.length} registros · {pendingCount} pendientes · {approvedCount} aprobadas</p>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar..."
                            className="pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm w-40 outline-none focus:ring-2 focus:ring-rose-400" />
                    </div>
                    <select value={filterType} onChange={e => setFilterType(e.target.value)}
                        className="px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-rose-400">
                        <option value="">Todos los tipos</option>
                        {Object.entries(TYPES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                    </select>
                    <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                        className="px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-rose-400">
                        <option value="">Todos estados</option>
                        {Object.entries(STATUS_COLORS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                    </select>
                    <select value={filterEmployee} onChange={e => setFilterEmployee(e.target.value)}
                        className="hidden sm:block px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-rose-400">
                        <option value="">Todos empleados</option>
                        {employees.map(e => <option key={e.id} value={e.id}>{e.last_name}, {e.first_name} ({e.legajo})</option>)}
                    </select>
                    <button onClick={openCreate}
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-rose-500 to-pink-600 text-white rounded-lg font-bold text-sm shadow-lg shadow-rose-200/50 hover:shadow-xl transition-all hover:scale-[1.02]">
                        <Plus size={16} /> <span className="hidden sm:inline">Nueva Novedad</span><span className="sm:hidden">+</span>
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="px-4 sm:px-6 py-3 flex gap-3 overflow-x-auto flex-shrink-0">
                {Object.entries(STATUS_COLORS).map(([k, v]) => {
                    const count = novelties.filter(n => n.status === k).length;
                    return (
                        <button key={k} onClick={() => setFilterStatus(filterStatus === k ? '' : k)}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all flex-shrink-0 ${filterStatus === k ? 'ring-2 ring-rose-400 ring-offset-1 scale-[1.02]' : 'hover:scale-[1.01]'}`}
                            style={{ backgroundColor: v.bg, borderColor: v.text + '30' }}>
                            <v.icon size={16} style={{ color: v.text }} />
                            <span className="text-xs font-bold" style={{ color: v.text }}>{count}</span>
                            <span className="text-[10px] font-medium" style={{ color: v.text }}>{v.label}</span>
                        </button>
                    );
                })}
            </div>

            {/* Table */}
            <div className="flex-1 overflow-auto px-4 sm:px-6 pb-4">
                {/* Desktop Table */}
                <div className="hidden md:block bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-200">
                                <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase">Empleado</th>
                                <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase">Tipo</th>
                                <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase">Período</th>
                                <th className="text-center px-4 py-3 text-xs font-bold text-gray-500 uppercase">Días</th>
                                <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase">Estado</th>
                                <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase">Motivo</th>
                                <th className="text-right px-4 py-3 text-xs font-bold text-gray-500 uppercase">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.length === 0 ? (
                                <tr><td colSpan={7} className="text-center py-12 text-gray-400">No hay novedades registradas</td></tr>
                            ) : filtered.map(n => {
                                const tp = TYPES[n.type] || TYPES.other;
                                const st = STATUS_COLORS[n.status] || STATUS_COLORS.pending;
                                const Icon = tp.icon;
                                return (
                                    <tr key={n.id} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors group">
                                        <td className="px-4 py-3">
                                            <p className="font-bold text-gray-900 text-sm">{n.employee_name}</p>
                                            <p className="text-[10px] text-gray-400">{n.employee_legajo} · {n.employee_department || '—'}</p>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
                                                style={{ backgroundColor: tp.bg, color: tp.color }}>
                                                <Icon size={12} /> {tp.label}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-xs text-gray-700">
                                            {formatDate(n.start_date)} → {formatDate(n.end_date)}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <span className="font-bold text-sm text-gray-900">{n.days_count}</span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold"
                                                style={{ backgroundColor: st.bg, color: st.text }}>
                                                <st.icon size={12} /> {st.label}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-xs text-gray-600 max-w-[200px] truncate">{n.reason || '—'}</td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                {n.status === 'pending' && (
                                                    <>
                                                        <button onClick={() => changeStatus(n.id, 'approved')} className="p-1.5 bg-green-50 hover:bg-green-100 rounded-lg" title="Aprobar">
                                                            <CheckCircle2 size={14} className="text-green-600" />
                                                        </button>
                                                        <button onClick={() => changeStatus(n.id, 'rejected')} className="p-1.5 bg-red-50 hover:bg-red-100 rounded-lg" title="Rechazar">
                                                            <XCircle size={14} className="text-red-500" />
                                                        </button>
                                                    </>
                                                )}
                                                <button onClick={() => openEdit(n)} className="p-1.5 hover:bg-gray-100 rounded-lg"><Edit3 size={14} className="text-gray-500" /></button>
                                                <button onClick={() => deleteNovelty(n.id)} className="p-1.5 hover:bg-red-50 rounded-lg"><Trash2 size={14} className="text-red-400" /></button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Mobile Cards */}
                <div className="md:hidden space-y-3">
                    {filtered.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-3">
                            <CalendarDays size={40} className="text-gray-300" />
                            <p className="text-sm">No hay novedades</p>
                        </div>
                    ) : filtered.map(n => {
                        const tp = TYPES[n.type] || TYPES.other;
                        const st = STATUS_COLORS[n.status] || STATUS_COLORS.pending;
                        const Icon = tp.icon;
                        return (
                            <div key={n.id} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                                <div className="flex items-start justify-between mb-2">
                                    <div>
                                        <p className="font-bold text-sm text-gray-900">{n.employee_name}</p>
                                        <p className="text-[10px] text-gray-400">{n.employee_legajo}</p>
                                    </div>
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
                                        style={{ backgroundColor: st.bg, color: st.text }}>
                                        <st.icon size={10} /> {st.label}
                                    </span>
                                </div>
                                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold mb-2"
                                    style={{ backgroundColor: tp.bg, color: tp.color }}>
                                    <Icon size={10} /> {tp.label}
                                </span>
                                <p className="text-xs text-gray-500 mb-1">{formatDate(n.start_date)} → {formatDate(n.end_date)} ({n.days_count} días)</p>
                                {n.reason && <p className="text-xs text-gray-600 line-clamp-2">{n.reason}</p>}
                                <div className="flex items-center gap-1 mt-3 pt-2 border-t border-gray-100">
                                    {n.status === 'pending' && (
                                        <>
                                            <button onClick={() => changeStatus(n.id, 'approved')} className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-green-50 text-green-600 rounded-lg text-xs font-bold">
                                                <CheckCircle2 size={12} /> Aprobar
                                            </button>
                                            <button onClick={() => changeStatus(n.id, 'rejected')} className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-red-50 text-red-500 rounded-lg text-xs font-bold">
                                                <XCircle size={12} /> Rechazar
                                            </button>
                                        </>
                                    )}
                                    <button onClick={() => openEdit(n)} className="p-2 hover:bg-gray-100 rounded-lg"><Edit3 size={14} className="text-gray-500" /></button>
                                    <button onClick={() => deleteNovelty(n.id)} className="p-2 hover:bg-red-50 rounded-lg"><Trash2 size={14} className="text-red-400" /></button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Create/Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden max-h-[90vh] flex flex-col">
                        <div className="px-6 py-4 bg-gradient-to-r from-rose-500 to-pink-600 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center"><CalendarDays size={20} className="text-white" /></div>
                                <div>
                                    <h3 className="font-black text-lg text-white">{editing ? 'Editar Novedad' : 'Nueva Novedad'}</h3>
                                    <p className="text-white/70 text-xs">Licencias, ausencias, vacaciones...</p>
                                </div>
                            </div>
                            <button onClick={() => setShowModal(false)} className="p-1.5 hover:bg-white/20 rounded-lg"><X size={18} className="text-white" /></button>
                        </div>
                        <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
                            <div className="border border-gray-100 rounded-xl p-4 bg-gray-50/50 space-y-3">
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Empleado</label>
                                    <select value={form.employee_id} onChange={e => setForm({ ...form, employee_id: e.target.value })}
                                        className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-rose-400 bg-white">
                                        <option value="">Seleccionar empleado...</option>
                                        {employees.map(e => <option key={e.id} value={e.id}>{e.last_name}, {e.first_name} ({e.legajo})</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Tipo de Novedad</label>
                                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
                                        {Object.entries(TYPES).map(([k, v]) => {
                                            const Icon = v.icon;
                                            return (
                                                <button key={k} onClick={() => setForm({ ...form, type: k })}
                                                    className={`flex flex-col items-center gap-1 px-2 py-2.5 rounded-xl border transition-all text-center ${form.type === k ? 'ring-2 ring-rose-400 ring-offset-1 scale-[1.02] shadow-sm' : 'border-gray-200 hover:border-gray-300'}`}
                                                    style={{ backgroundColor: form.type === k ? v.bg : 'white', borderColor: form.type === k ? v.color + '40' : undefined }}>
                                                    <Icon size={16} style={{ color: v.color }} />
                                                    <span className="text-[9px] font-bold leading-tight" style={{ color: form.type === k ? v.color : '#6b7280' }}>{v.label}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                            <div className="border border-gray-100 rounded-xl p-4 bg-gray-50/50 space-y-3">
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Desde</label>
                                        <input type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })}
                                            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-rose-400 bg-white" />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Hasta</label>
                                        <input type="date" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })}
                                            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-rose-400 bg-white" />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Cantidad de Días</label>
                                    <input type="number" step="0.5" min="0.5" value={form.days_count} onChange={e => setForm({ ...form, days_count: Number(e.target.value) })}
                                        className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-rose-400 bg-white" />
                                </div>
                            </div>
                            <div className="border border-gray-100 rounded-xl p-4 bg-gray-50/50 space-y-3">
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Motivo</label>
                                    <textarea value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} rows={3} placeholder="Motivo de la novedad..."
                                        className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-rose-400 resize-none bg-white" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Notas Internas</label>
                                    <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} placeholder="Notas para RRHH..."
                                        className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-rose-400 resize-none bg-white" />
                                </div>
                            </div>
                        </div>
                        <div className="px-4 sm:px-6 py-4 border-t border-gray-100 flex justify-end gap-3 flex-shrink-0">
                            <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-gray-500 hover:bg-gray-100 rounded-lg">Cancelar</button>
                            <button onClick={save} disabled={!form.employee_id || !form.start_date || !form.end_date}
                                className="px-5 py-2 text-sm font-bold bg-gradient-to-r from-rose-500 to-pink-600 text-white rounded-lg shadow-sm hover:shadow-md transition-all disabled:opacity-40">
                                {editing ? 'Guardar' : 'Crear'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
