import { useState, useEffect } from 'react';
import {
    Clock, LogIn, LogOut, Coffee, UtensilsCrossed, Play, Square, UserCircle,
    CalendarDays, BarChart3, Trash2, ChevronLeft, ChevronRight, Users
} from 'lucide-react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
    Legend, ResponsiveContainer
} from 'recharts';
import api from '../api/client';

interface Employee { id: number; full_name: string; legajo: string; department: string | null; is_active: boolean; }
interface TimeEntry {
    id: number; employee_id: number; employee_name: string | null;
    entry_type: string; timestamp: string; notes: string | null;
}
interface DaySummary { date: string; worked_hours: number; break_hours: number; meal_hours: number; entries: number; }

const ENTRY_TYPES = {
    check_in: { label: 'Ingreso', icon: LogIn, color: 'from-green-500 to-emerald-600', bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
    check_out: { label: 'Salida', icon: LogOut, color: 'from-red-500 to-rose-600', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
    meal_start: { label: 'Comida', icon: UtensilsCrossed, color: 'from-amber-500 to-orange-600', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
    meal_end: { label: 'Fin Comida', icon: UtensilsCrossed, color: 'from-amber-400 to-yellow-500', bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200' },
    break_start: { label: 'Descanso', icon: Coffee, color: 'from-blue-500 to-indigo-600', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
    break_end: { label: 'Fin Descanso', icon: Coffee, color: 'from-blue-400 to-cyan-500', bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200' },
};

const CHART_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#06b6d4'];

export default function TimeTracking() {
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [selectedEmployee, setSelectedEmployee] = useState<number | ''>('');
    const [todayEntries, setTodayEntries] = useState<TimeEntry[]>([]);
    const [summary, setSummary] = useState<{ total_days: number; total_hours: number; avg_hours_per_day: number; days: DaySummary[] } | null>(null);
    const [loading, setLoading] = useState(false);
    const [view, setView] = useState<'clock' | 'history'>('clock');

    // Overview data (all employees)
    const [overviewChart, setOverviewChart] = useState<any[]>([]);
    const [overviewMeta, setOverviewMeta] = useState<{ id: number; prefix: string; name: string }[]>([]);
    const [overviewLoading, setOverviewLoading] = useState(false);

    // Month navigation for history
    const [histMonth, setHistMonth] = useState(new Date());

    const fetchEmployees = async () => {
        try {
            const { data } = await api.get('/employees/', { params: { is_active: true } });
            setEmployees(data.filter((e: any) => !e._is_stub));
        } catch (e) { console.error(e); }
    };

    const fetchOverview = async () => {
        setOverviewLoading(true);
        try {
            const today = new Date();
            const start = new Date(today);
            start.setDate(start.getDate() - 30);
            const startStr = start.toISOString().split('T')[0];
            const endStr = today.toISOString().split('T')[0];
            const { data } = await api.get('/time-entries/all-daily-summary', { params: { start: startStr, end: endStr } });
            setOverviewChart(data.chart || []);
            setOverviewMeta(data.employees || []);
        } catch (e) { console.error(e); }
        finally { setOverviewLoading(false); }
    };

    const fetchToday = async () => {
        if (!selectedEmployee) return;
        try {
            const { data } = await api.get(`/time-entries/today/${selectedEmployee}`);
            setTodayEntries(data);
        } catch (e) { console.error(e); }
    };

    const fetchSummary = async () => {
        if (!selectedEmployee) return;
        const y = histMonth.getFullYear();
        const m = histMonth.getMonth();
        const start = `${y}-${String(m + 1).padStart(2, '0')}-01`;
        const lastDay = new Date(y, m + 1, 0).getDate();
        const end = `${y}-${String(m + 1).padStart(2, '0')}-${lastDay}`;
        try {
            const { data } = await api.get(`/employees/${selectedEmployee}/time-summary`, { params: { start, end } });
            setSummary(data);
        } catch (e) { console.error(e); }
    };

    useEffect(() => { fetchEmployees(); fetchOverview(); }, []);
    useEffect(() => { if (selectedEmployee) { fetchToday(); fetchSummary(); } }, [selectedEmployee]);
    useEffect(() => { if (selectedEmployee) fetchSummary(); }, [histMonth]);

    const clockAction = async (entryType: string) => {
        if (!selectedEmployee) return;
        setLoading(true);
        try {
            await api.post('/time-entries/', { employee_id: selectedEmployee, entry_type: entryType });
            fetchToday();
            fetchSummary();
            fetchOverview();
        } catch (e: any) {
            alert(e.response?.data?.detail || 'Error');
        } finally { setLoading(false); }
    };

    const deleteEntry = async (id: number) => {
        if (!confirm('¿Eliminar este registro?')) return;
        await api.delete(`/time-entries/${id}`);
        fetchToday();
        fetchSummary();
        fetchOverview();
    };

    // Determine current status from today's entries
    const lastEntry = todayEntries.length > 0 ? todayEntries[todayEntries.length - 1] : null;
    const currentStatus = lastEntry?.entry_type || 'none';

    const getStatusText = () => {
        switch (currentStatus) {
            case 'check_in': return '🟢 Trabajando';
            case 'meal_start': return '🍽️ En comida';
            case 'break_start': return '☕ En descanso';
            case 'check_out': return '🔴 Jornada finalizada';
            default: return '⚪ Sin fichar hoy';
        }
    };

    // Helper: ensure timestamp is parsed as UTC (server sends without "Z")
    const utc = (ts: string) => ts.endsWith('Z') ? ts : ts + 'Z';

    // Calculate today's worked time
    let todayWorkedMs = 0;
    let lastCheckIn: Date | null = null;
    for (const e of todayEntries) {
        const t = new Date(utc(e.timestamp));
        if (e.entry_type === 'check_in') lastCheckIn = t;
        else if ((e.entry_type === 'check_out' || e.entry_type === 'break_start' || e.entry_type === 'meal_start') && lastCheckIn) {
            todayWorkedMs += t.getTime() - lastCheckIn.getTime();
            lastCheckIn = null;
        } else if ((e.entry_type === 'break_end' || e.entry_type === 'meal_end')) {
            lastCheckIn = t;
        }
    }
    if (lastCheckIn && currentStatus !== 'check_out') {
        todayWorkedMs += Math.max(0, Date.now() - lastCheckIn.getTime());
    }
    todayWorkedMs = Math.max(0, todayWorkedMs);
    const todayHrs = Math.floor(todayWorkedMs / 3600000);
    const todayMin = Math.floor((todayWorkedMs % 3600000) / 60000);

    const selEmp = employees.find(e => e.id === selectedEmployee);

    const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

    // ─── OVERVIEW: No employee selected ─────────────────────────────
    const renderOverview = () => (
        <>
            {/* Employee Status Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {employees.map(emp => (
                    <div key={emp.id}
                        onClick={() => setSelectedEmployee(emp.id)}
                        className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 hover:shadow-md hover:border-violet-200 cursor-pointer transition-all group">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                                {emp.full_name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-gray-900 truncate group-hover:text-violet-700 transition-colors">{emp.full_name}</p>
                                <p className="text-[10px] text-gray-400">{emp.department || 'Sin departamento'} · {emp.legajo}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Daily Hours Chart */}
            {overviewLoading ? (
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8 text-center text-gray-400">Cargando datos...</div>
            ) : overviewChart.length > 0 ? (
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                    <div className="mb-4">
                        <h3 className="text-sm font-bold text-gray-800">Horas Trabajadas por Día — Últimos 30 Días</h3>
                        <p className="text-[11px] text-gray-400">Línea de tiempo de todos los empleados</p>
                    </div>
                    <ResponsiveContainer width="100%" height={350}>
                        <LineChart data={overviewChart} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                            <XAxis
                                dataKey="date"
                                tick={{ fontSize: 10, fill: '#9ca3af' }}
                                tickFormatter={(v: string) => { const d = new Date(v + 'T12:00:00'); return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' }); }}
                            />
                            <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} unit="h" />
                            <Tooltip
                                contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', fontSize: '12px' }}
                                labelFormatter={(v: string) => { const d = new Date(v + 'T12:00:00'); return d.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' }); }}
                                formatter={(value: number, name: string) => [`${value}h`, name]}
                            />
                            <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                            {overviewMeta.map((emp, i) => (
                                <Line
                                    key={emp.id}
                                    type="monotone"
                                    dataKey={`${emp.prefix}_hours`}
                                    name={emp.name}
                                    stroke={CHART_COLORS[i % CHART_COLORS.length]}
                                    strokeWidth={2.5}
                                    dot={{ r: 3 }}
                                    activeDot={{ r: 5 }}
                                    connectNulls
                                />
                            ))}
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            ) : (
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center">
                    <BarChart3 size={40} className="mx-auto mb-3 text-gray-300" />
                    <p className="text-gray-500 font-medium">No hay registros de fichadas todavía</p>
                    <p className="text-xs text-gray-400 mt-1">Seleccioná un empleado y empezá a fichar para ver el gráfico</p>
                </div>
            )}
        </>
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100 gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center shadow-sm">
                        <Clock size={20} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-gray-900">Fichadas</h1>
                        <p className="text-xs text-gray-400">Control de asistencia y horarios</p>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <select value={selectedEmployee} onChange={e => setSelectedEmployee(e.target.value ? Number(e.target.value) : '')}
                        className="px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-violet-400 min-w-[200px]">
                        <option value="">Todos los empleados</option>
                        {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.full_name} ({emp.legajo})</option>)}
                    </select>
                    {selectedEmployee && (
                        <div className="flex bg-gray-100 rounded-lg p-0.5">
                            <button onClick={() => setView('clock')}
                                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${view === 'clock' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>
                                <Clock size={14} className="inline mr-1" /> Fichar
                            </button>
                            <button onClick={() => setView('history')}
                                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${view === 'history' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>
                                <CalendarDays size={14} className="inline mr-1" /> Historial
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {!selectedEmployee ? renderOverview() : view === 'clock' ? (
                <>
                    {/* Current Status */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 text-center">
                        <div className="flex items-center justify-center gap-3 mb-2">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center text-white font-bold text-lg">
                                {selEmp?.full_name?.[0] || '?'}
                            </div>
                            <div className="text-left">
                                <p className="text-lg font-bold text-gray-900">{selEmp?.full_name}</p>
                                <p className="text-xs text-gray-400">{selEmp?.department || 'Sin departamento'} · {selEmp?.legajo}</p>
                            </div>
                        </div>
                        <div className="text-3xl font-black text-gray-800 my-4">{getStatusText()}</div>
                        <p className="text-sm text-gray-500">Hoy: <span className="font-bold text-gray-800">{todayHrs}h {todayMin}m</span> trabajadas</p>
                    </div>

                    {/* Clock Buttons — state machine */}
                    {(() => {
                        // Determine which buttons are allowed based on current state
                        const allowedMap: Record<string, string[]> = {
                            'none': ['check_in'],
                            'check_in': ['check_out', 'meal_start', 'break_start'],
                            'break_end': ['check_out', 'meal_start', 'break_start'],
                            'meal_end': ['check_out', 'meal_start', 'break_start'],
                            'break_start': ['break_end'],
                            'meal_start': ['meal_end'],
                            'check_out': ['check_in'],
                        };
                        const allowed = new Set(allowedMap[currentStatus] || ['check_in']);

                        return (
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                                {(Object.entries(ENTRY_TYPES) as [string, typeof ENTRY_TYPES.check_in][]).map(([type, config]) => {
                                    const Icon = config.icon;
                                    const isStart = type === 'check_in' || type === 'meal_start' || type === 'break_start';
                                    const isAllowed = allowed.has(type);
                                    return (
                                        <button key={type} onClick={() => clockAction(type)} disabled={loading || !isAllowed}
                                            className={`p-4 rounded-xl border shadow-sm transition-all text-center ${isAllowed ? `${config.bg} ${config.border} hover:shadow-md cursor-pointer` : 'bg-gray-50 border-gray-200 opacity-40 cursor-not-allowed'}`}>
                                            <div className={`w-12 h-12 bg-gradient-to-br ${isAllowed ? config.color : 'from-gray-300 to-gray-400'} rounded-xl flex items-center justify-center mx-auto mb-2 shadow-sm`}>
                                                {isStart ? <Play size={20} className="text-white" /> : <Square size={20} className="text-white" />}
                                            </div>
                                            <p className={`text-xs font-bold ${isAllowed ? config.text : 'text-gray-400'}`}>{config.label}</p>
                                            <Icon size={14} className={`mx-auto mt-1 ${isAllowed ? config.text : 'text-gray-300'} opacity-50`} />
                                        </button>
                                    );
                                })}
                            </div>
                        );
                    })()}

                    {/* Today Timeline */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100">
                        <div className="px-5 py-3 border-b border-gray-100 flex justify-between items-center">
                            <h3 className="font-bold text-gray-800 text-sm">Registros de Hoy</h3>
                            <span className="text-xs text-gray-400">{todayEntries.length} fichada(s)</span>
                        </div>
                        {todayEntries.length === 0 ? (
                            <div className="p-8 text-center text-gray-400 text-sm">No hay fichadas hoy</div>
                        ) : (
                            <div className="divide-y divide-gray-50">
                                {todayEntries.map(entry => {
                                    const cfg = ENTRY_TYPES[entry.entry_type as keyof typeof ENTRY_TYPES] || ENTRY_TYPES.check_in;
                                    const Icon = cfg.icon;
                                    const time = new Date(entry.timestamp);
                                    return (
                                        <div key={entry.id} className="flex items-center px-5 py-3 hover:bg-gray-50 transition-colors">
                                            <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${cfg.color} flex items-center justify-center mr-3 shadow-sm`}>
                                                <Icon size={14} className="text-white" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-bold text-gray-900">{cfg.label}</p>
                                                <p className="text-xs text-gray-400">
                                                    {time.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                                </p>
                                            </div>
                                            <button onClick={() => deleteEntry(entry.id)} className="p-1 text-gray-300 hover:text-red-500 transition-colors">
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </>
            ) : (
                /* History View */
                <>
                    {/* Summary Stats */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                            <p className="text-xs text-gray-500 font-medium">Días Trabajados</p>
                            <p className="text-2xl font-black text-gray-900">{summary?.total_days || 0}</p>
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-violet-100 shadow-sm">
                            <p className="text-xs text-violet-600 font-medium">Horas Totales</p>
                            <p className="text-2xl font-black text-violet-700">{summary?.total_hours?.toFixed(1) || '0'}</p>
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-blue-100 shadow-sm">
                            <p className="text-xs text-blue-600 font-medium">Promedio/Día</p>
                            <p className="text-2xl font-black text-blue-700">{summary?.avg_hours_per_day?.toFixed(1) || '0'}h</p>
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-green-100 shadow-sm">
                            <p className="text-xs text-green-600 font-medium">Fichadas</p>
                            <p className="text-2xl font-black text-green-700">{summary?.days?.reduce((s, d) => s + d.entries, 0) || 0}</p>
                        </div>
                    </div>

                    {/* Month Nav */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="px-5 py-3 border-b border-gray-100 flex justify-between items-center">
                            <button onClick={() => setHistMonth(new Date(histMonth.getFullYear(), histMonth.getMonth() - 1, 1))}
                                className="p-1.5 hover:bg-gray-100 rounded-lg"><ChevronLeft size={18} /></button>
                            <h3 className="font-bold text-gray-800">{monthNames[histMonth.getMonth()]} {histMonth.getFullYear()}</h3>
                            <button onClick={() => setHistMonth(new Date(histMonth.getFullYear(), histMonth.getMonth() + 1, 1))}
                                className="p-1.5 hover:bg-gray-100 rounded-lg"><ChevronRight size={18} /></button>
                        </div>

                        {!summary?.days?.length ? (
                            <div className="p-8 text-center text-gray-400 text-sm">No hay registros en este mes</div>
                        ) : (
                            /* Desktop Table */
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="text-left px-4 py-2.5 font-bold text-gray-600 text-xs uppercase">Fecha</th>
                                            <th className="text-right px-4 py-2.5 font-bold text-gray-600 text-xs uppercase">Horas Netas</th>
                                            <th className="text-right px-4 py-2.5 font-bold text-gray-600 text-xs uppercase">Descanso</th>
                                            <th className="text-right px-4 py-2.5 font-bold text-gray-600 text-xs uppercase">Comida</th>
                                            <th className="text-right px-4 py-2.5 font-bold text-gray-600 text-xs uppercase">Fichadas</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {summary.days.map(day => {
                                            const d = new Date(day.date + 'T12:00:00');
                                            const dayName = d.toLocaleDateString('es-AR', { weekday: 'short' });
                                            return (
                                                <tr key={day.date} className="hover:bg-gray-50">
                                                    <td className="px-4 py-2.5 font-medium text-gray-900">
                                                        <span className="text-gray-400 text-xs uppercase">{dayName}</span> {day.date.split('-').reverse().join('/')}
                                                    </td>
                                                    <td className="px-4 py-2.5 text-right font-bold text-violet-700">{day.worked_hours.toFixed(1)}h</td>
                                                    <td className="px-4 py-2.5 text-right text-blue-600">{day.break_hours > 0 ? `${day.break_hours.toFixed(1)}h` : '—'}</td>
                                                    <td className="px-4 py-2.5 text-right text-amber-600">{day.meal_hours > 0 ? `${day.meal_hours.toFixed(1)}h` : '—'}</td>
                                                    <td className="px-4 py-2.5 text-right text-gray-500">{day.entries}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                    <tfoot className="bg-gray-50 font-bold">
                                        <tr>
                                            <td className="px-4 py-2.5 text-gray-700">Total: {summary.days.length} días</td>
                                            <td className="px-4 py-2.5 text-right text-violet-800">{summary.total_hours.toFixed(1)}h</td>
                                            <td className="px-4 py-2.5 text-right text-blue-700">{summary.days.reduce((s, d) => s + d.break_hours, 0).toFixed(1)}h</td>
                                            <td className="px-4 py-2.5 text-right text-amber-700">{summary.days.reduce((s, d) => s + d.meal_hours, 0).toFixed(1)}h</td>
                                            <td className="px-4 py-2.5 text-right text-gray-600">{summary.days.reduce((s, d) => s + d.entries, 0)}</td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
