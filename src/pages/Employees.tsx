import { useState, useEffect } from 'react';
import {
    Users, Plus, Pencil, Trash2, Search, X, Building2, Briefcase,
    Phone, Mail, MapPin, Shield, CreditCard, Clock, UserCircle, ChevronDown, ChevronRight, AlertTriangle
} from 'lucide-react';
import api from '../api/client';

interface Employee {
    id: number; legajo: string; first_name: string; last_name: string; full_name: string;
    dni: string; cuil: string | null; birth_date: string | null; gender: string | null;
    marital_status: string | null; nationality: string | null; photo_url: string | null;
    phone: string | null; email: string | null; address: string | null; city: string | null;
    province: string | null; postal_code: string | null; hire_date: string | null;
    termination_date: string | null; department: string | null; position: string | null;
    supervisor_id: number | null; supervisor_name: string | null;
    contract_type: string | null; billing_type: string | null; work_schedule: string | null;
    weekly_hours: number | null; obra_social: string | null; obra_social_plan: string | null;
    obra_social_number: string | null; emergency_contact: string | null; emergency_phone: string | null;
    bank_name: string | null; bank_cbu: string | null; salary: number | null;
    salary_currency: string | null; notes: string | null; is_active: boolean;
    data_complete?: boolean; _is_stub?: boolean; user_id?: number;
    created_at?: string | null; updated_at?: string | null;
}

function fmtDate(iso: string | null | undefined): string {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' });
}

const DEPARTMENTS = ['IT', 'Administración', 'Ventas', 'RRHH', 'Operaciones', 'Marketing', 'Dirección', 'Soporte', 'Logística', 'Finanzas'];
const CONTRACT_TYPES = [
    { value: 'permanent', label: 'Efectivo' }, { value: 'temporary', label: 'Temporal' },
    { value: 'freelance', label: 'Freelance' }, { value: 'internship', label: 'Pasantía' },
];
const BILLING_TYPES = [
    { value: 'payroll', label: 'Relación de dependencia' }, { value: 'monotributo', label: 'Monotributo' },
    { value: 'invoice', label: 'Factura' },
];
const WORK_SCHEDULES = [
    { value: 'full_time', label: 'Tiempo completo' }, { value: 'part_time', label: 'Medio tiempo' },
    { value: 'shift', label: 'Por turnos' },
];
const GENDERS = [
    { value: 'male', label: 'Masculino' }, { value: 'female', label: 'Femenino' },
    { value: 'other', label: 'Otro' }, { value: 'prefer_not_to_say', label: 'Prefiero no decir' },
];
const MARITAL = [
    { value: 'single', label: 'Soltero/a' }, { value: 'married', label: 'Casado/a' },
    { value: 'divorced', label: 'Divorciado/a' }, { value: 'widowed', label: 'Viudo/a' },
];

const emptyForm = {
    legajo: '', first_name: '', last_name: '', dni: '', cuil: '', birth_date: '', gender: '',
    marital_status: '', nationality: 'Argentina', phone: '', email: '', address: '', city: '',
    province: '', postal_code: '', hire_date: '', termination_date: '', department: '',
    position: '', supervisor_id: '', contract_type: 'permanent', billing_type: 'payroll',
    work_schedule: 'full_time', weekly_hours: '45', obra_social: '', obra_social_plan: '',
    obra_social_number: '', emergency_contact: '', emergency_phone: '', bank_name: '',
    bank_cbu: '', salary: '', salary_currency: 'ARS', notes: '', is_active: true,
    user_id: null as number | null,
};

function SectionToggle({ title, icon, children, defaultOpen = true }: { title: string; icon: React.ReactNode; children: React.ReactNode; defaultOpen?: boolean }) {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <div className="border border-gray-200 rounded-xl overflow-hidden">
            <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors">
                <div className="flex items-center gap-2 text-sm font-bold text-gray-700">{icon} {title}</div>
                {open ? <ChevronDown size={16} className="text-gray-400" /> : <ChevronRight size={16} className="text-gray-400" />}
            </button>
            {open && <div className="p-4 space-y-3">{children}</div>}
        </div>
    );
}

export default function Employees() {
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterDept, setFilterDept] = useState('');
    const [filterContract, setFilterContract] = useState('');
    const [filterActive, setFilterActive] = useState<string>('true');
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [form, setForm] = useState<any>({ ...emptyForm });

    const fetchEmployees = async () => {
        try {
            const params: any = {};
            if (filterDept) params.department = filterDept;
            if (filterContract) params.contract_type = filterContract;
            if (filterActive !== '') params.is_active = filterActive === 'true';
            const [empRes, unlinkedRes] = await Promise.all([
                api.get('/employees/', { params }),
                api.get('/employees/unlinked-users'),
            ]);
            // Merge: real employees + stub records for users without employee records
            const all = [...empRes.data, ...unlinkedRes.data];
            setEmployees(all);
        } catch (e) { console.error(e); } finally { setLoading(false); }
    };

    useEffect(() => { fetchEmployees(); }, [filterDept, filterContract, filterActive]);

    const openCreate = (stub?: any) => {
        setEditingId(null);
        if (stub && stub._is_stub) {
            // Pre-fill from user stub data
            setForm({
                ...emptyForm,
                first_name: stub.first_name || '',
                last_name: stub.last_name || '',
                email: stub.email || '',
                user_id: stub.user_id,
            });
        } else {
            setForm({ ...emptyForm });
        }
        setShowModal(true);
    };

    const openEdit = (emp: Employee) => {
        setEditingId(emp.id);
        setForm({
            legajo: emp.legajo, first_name: emp.first_name, last_name: emp.last_name,
            dni: emp.dni, cuil: emp.cuil || '', birth_date: emp.birth_date || '',
            gender: emp.gender || '', marital_status: emp.marital_status || '',
            nationality: emp.nationality || 'Argentina', phone: emp.phone || '',
            email: emp.email || '', address: emp.address || '', city: emp.city || '',
            province: emp.province || '', postal_code: emp.postal_code || '',
            hire_date: emp.hire_date || '', termination_date: emp.termination_date || '',
            department: emp.department || '', position: emp.position || '',
            supervisor_id: emp.supervisor_id ? String(emp.supervisor_id) : '',
            contract_type: emp.contract_type || 'permanent', billing_type: emp.billing_type || 'payroll',
            work_schedule: emp.work_schedule || 'full_time', weekly_hours: emp.weekly_hours ? String(emp.weekly_hours) : '45',
            obra_social: emp.obra_social || '', obra_social_plan: emp.obra_social_plan || '',
            obra_social_number: emp.obra_social_number || '', emergency_contact: emp.emergency_contact || '',
            emergency_phone: emp.emergency_phone || '', bank_name: emp.bank_name || '',
            bank_cbu: emp.bank_cbu || '', salary: emp.salary ? String(emp.salary) : '',
            salary_currency: emp.salary_currency || 'ARS', notes: emp.notes || '',
            is_active: emp.is_active,
        });
        setShowModal(true);
    };

    const handleSave = async () => {
        const payload: any = {
            ...form,
            supervisor_id: form.supervisor_id ? parseInt(form.supervisor_id) : null,
            weekly_hours: form.weekly_hours ? parseInt(form.weekly_hours) : null,
            salary: form.salary ? parseFloat(form.salary) : null,
            birth_date: form.birth_date || null,
            hire_date: form.hire_date || null,
            termination_date: form.termination_date || null,
            user_id: form.user_id || null,
        };
        // Clean empty strings to null
        for (const key in payload) {
            if (payload[key] === '') payload[key] = null;
        }
        try {
            if (editingId) { await api.put(`/employees/${editingId}`, payload); }
            else { await api.post('/employees/', payload); }
            setShowModal(false);
            fetchEmployees();
        } catch (e: any) {
            alert(e.response?.data?.detail || 'Error al guardar');
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('¿Eliminar este empleado?')) return;
        await api.delete(`/employees/${id}`);
        fetchEmployees();
    };

    const f = (v: any) => v || '—';
    const contractLabel = (v: string | null) => CONTRACT_TYPES.find(c => c.value === v)?.label || v || '—';
    const billingLabel = (v: string | null) => BILLING_TYPES.find(b => b.value === v)?.label || v || '—';
    const scheduleLabel = (v: string | null) => WORK_SCHEDULES.find(s => s.value === v)?.label || v || '—';

    const filtered = employees.filter(e =>
    (e.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        e.legajo?.toLowerCase().includes(search.toLowerCase()) ||
        e.dni?.toLowerCase().includes(search.toLowerCase()) ||
        e.department?.toLowerCase().includes(search.toLowerCase()))
    );

    const stats = {
        total: employees.length,
        active: employees.filter(e => e.is_active).length,
        departments: [...new Set(employees.map(e => e.department).filter(Boolean))].length,
    };

    const inputCls = "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-400 bg-white";
    const selectCls = inputCls;
    const set = (key: string, val: any) => setForm((p: any) => ({ ...p, [key]: val }));

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100 gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-sm">
                        <Users size={20} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-gray-900">Empleados</h1>
                        <p className="text-xs text-gray-400">{stats.active} activos · {stats.departments} departamentos</p>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar..."
                            className="pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm w-40 sm:w-48 outline-none focus:ring-2 focus:ring-teal-400" />
                    </div>
                    <select value={filterDept} onChange={e => setFilterDept(e.target.value)}
                        className="px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none">
                        <option value="">Área</option>
                        {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                    <select value={filterContract} onChange={e => setFilterContract(e.target.value)}
                        className="hidden sm:block px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none">
                        <option value="">Contrato</option>
                        {CONTRACT_TYPES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                    <select value={filterActive} onChange={e => setFilterActive(e.target.value)}
                        className="hidden sm:block px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none">
                        <option value="true">Activos</option>
                        <option value="false">Inactivos</option>
                        <option value="">Todos</option>
                    </select>
                    <button onClick={openCreate}
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-teal-500 to-emerald-600 text-white rounded-lg font-bold text-sm shadow-sm hover:shadow-md transition-all">
                        <Plus size={16} /> <span className="hidden sm:inline">Nuevo Empleado</span><span className="sm:hidden">+</span>
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                    <p className="text-xs text-gray-500 font-medium">Total</p>
                    <p className="text-2xl font-black text-gray-900">{stats.total}</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-green-100 shadow-sm">
                    <p className="text-xs text-green-600 font-medium">Activos</p>
                    <p className="text-2xl font-black text-green-700">{stats.active}</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-blue-100 shadow-sm">
                    <p className="text-xs text-blue-600 font-medium">Departamentos</p>
                    <p className="text-2xl font-black text-blue-700">{stats.departments}</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-orange-100 shadow-sm">
                    <p className="text-xs text-orange-600 font-medium">Inactivos</p>
                    <p className="text-2xl font-black text-orange-700">{stats.total - stats.active}</p>
                </div>
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th className="text-left px-4 py-3 font-bold text-gray-600 text-xs uppercase">Legajo</th>
                            <th className="text-left px-4 py-3 font-bold text-gray-600 text-xs uppercase">Empleado</th>
                            <th className="text-left px-4 py-3 font-bold text-gray-600 text-xs uppercase">DNI</th>
                            <th className="text-left px-4 py-3 font-bold text-gray-600 text-xs uppercase">Departamento</th>
                            <th className="text-left px-4 py-3 font-bold text-gray-600 text-xs uppercase">Puesto</th>
                            <th className="text-left px-4 py-3 font-bold text-gray-600 text-xs uppercase">Contrato</th>
                            <th className="text-left px-4 py-3 font-bold text-gray-600 text-xs uppercase">Estado</th>
                            <th className="text-left px-4 py-3 font-bold text-gray-600 text-xs uppercase">Alta</th>
                            <th className="text-left px-4 py-3 font-bold text-gray-600 text-xs uppercase">Últ. Modif.</th>
                            <th className="text-right px-4 py-3 font-bold text-gray-600 text-xs uppercase">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {loading ? (
                            <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">Cargando...</td></tr>
                        ) : filtered.length === 0 ? (
                            <tr><td colSpan={10} className="px-4 py-8 text-center text-gray-400">No hay empleados</td></tr>
                        ) : filtered.map(emp => (
                            <tr key={emp.id || `stub-${emp.user_id}`} className={`hover:bg-gray-50 transition-colors ${emp._is_stub ? 'bg-amber-50/50' : ''}`}>
                                <td className="px-4 py-3 font-mono text-xs font-bold text-teal-600">{emp.legajo || <span className="text-amber-500 italic">—</span>}</td>
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs ${emp._is_stub ? 'bg-gradient-to-br from-amber-400 to-orange-500' : 'bg-gradient-to-br from-teal-400 to-emerald-500'}`}>
                                            {emp._is_stub ? <AlertTriangle size={14} /> : <>{emp.first_name[0]}{emp.last_name[0]}</>}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <p className="font-bold text-gray-900">{emp.full_name}</p>
                                                {(emp._is_stub || emp.data_complete === false) && (
                                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-700 border border-amber-200">Datos Incompletos</span>
                                                )}
                                            </div>
                                            {emp.email && <p className="text-xs text-gray-400">{emp.email}</p>}
                                        </div>
                                    </div>
                                </td>
                                <td className="px-4 py-3 text-gray-600">{emp.dni}</td>
                                <td className="px-4 py-3"><span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs font-medium rounded-full">{f(emp.department)}</span></td>
                                <td className="px-4 py-3 text-gray-600">{f(emp.position)}</td>
                                <td className="px-4 py-3"><span className="text-xs">{contractLabel(emp.contract_type)}</span></td>
                                <td className="px-4 py-3">
                                    <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${emp.is_active ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                                        {emp.is_active ? 'Activo' : 'Inactivo'}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-xs text-gray-500">{fmtDate(emp.created_at)}</td>
                                <td className="px-4 py-3 text-xs text-gray-500">{fmtDate(emp.updated_at)}</td>
                                <td className="px-4 py-3 text-right">
                                    {!emp._is_stub && (
                                        <div className="flex items-center justify-end gap-1">
                                            <button onClick={() => openEdit(emp)} className="p-1.5 text-gray-400 hover:text-blue-600 transition-colors"><Pencil size={14} /></button>
                                            <button onClick={() => handleDelete(emp.id)} className="p-1.5 text-gray-400 hover:text-red-600 transition-colors"><Trash2 size={14} /></button>
                                        </div>
                                    )}
                                    {emp._is_stub && (
                                        <button onClick={() => openCreate(emp)}
                                            className="px-2 py-1 text-[10px] font-bold bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 transition-colors">
                                            Completar
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-3">
                {loading ? (
                    <div className="p-8 text-center text-gray-400">Cargando...</div>
                ) : filtered.length === 0 ? (
                    <div className="p-8 text-center text-gray-400 bg-white rounded-xl border">No hay empleados</div>
                ) : filtered.map(emp => (
                    <div key={emp.id || `stub-${emp.user_id}`} className={`bg-white rounded-xl border shadow-sm p-4 ${emp._is_stub ? 'border-amber-200 bg-amber-50/30' : 'border-gray-100'}`}>
                        <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm ${emp._is_stub ? 'bg-gradient-to-br from-amber-400 to-orange-500' : 'bg-gradient-to-br from-teal-400 to-emerald-500'}`}>
                                    {emp._is_stub ? <AlertTriangle size={16} /> : <>{emp.first_name[0]}{emp.last_name[0]}</>}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <p className="font-bold text-gray-900">{emp.full_name}</p>
                                        {(emp._is_stub || emp.data_complete === false) && (
                                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-700 border border-amber-200">Incompleto</span>
                                        )}
                                    </div>
                                    <p className="text-xs text-gray-400">{emp._is_stub ? emp.email : `Legajo: ${emp.legajo}`}</p>
                                </div>
                            </div>
                            <div className="flex gap-1">
                                <button onClick={() => openEdit(emp)} className="p-1.5 text-gray-400 hover:text-blue-600"><Pencil size={14} /></button>
                                <button onClick={() => handleDelete(emp.id)} className="p-1.5 text-gray-400 hover:text-red-600"><Trash2 size={14} /></button>
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-2 text-xs">
                            <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full font-medium">{f(emp.department)}</span>
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">{f(emp.position)}</span>
                            <span className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded-full">{contractLabel(emp.contract_type)}</span>
                            <span className={`px-2 py-0.5 rounded-full font-bold ${emp.is_active ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                                {emp.is_active ? 'Activo' : 'Inactivo'}
                            </span>
                        </div>
                        <div className="flex gap-3 mt-1 text-[10px] text-gray-400">
                            <span className="flex items-center gap-1"><Clock size={10} /> Alta: {fmtDate(emp.created_at)}</span>
                            <span className="flex items-center gap-1"><Clock size={10} /> Modif: {fmtDate(emp.updated_at)}</span>
                        </div>
                        {(emp.phone || emp.email) && (
                            <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-500">
                                {emp.phone && <span className="flex items-center gap-1"><Phone size={12} /> {emp.phone}</span>}
                                {emp.email && <span className="flex items-center gap-1"><Mail size={12} /> {emp.email}</span>}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Create / Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 backdrop-blur-sm overflow-y-auto p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-4 overflow-hidden">
                        {/* Header */}
                        <div className="px-6 py-4 bg-gradient-to-r from-teal-600 to-emerald-600 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center"><Users size={20} className="text-white" /></div>
                                <div>
                                    <h3 className="font-black text-lg text-white">{editingId ? 'Editar Empleado' : 'Nuevo Empleado'}</h3>
                                    <p className="text-teal-100 text-xs">Legajo completo del empleado</p>
                                </div>
                            </div>
                            <button onClick={() => setShowModal(false)} className="p-1.5 hover:bg-white/20 rounded-lg"><X size={18} className="text-white" /></button>
                        </div>

                        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
                            {/* Personal */}
                            <SectionToggle title="Datos Personales" icon={<UserCircle size={16} className="text-teal-600" />}>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div><label className="text-xs font-bold text-gray-500 uppercase block mb-1">Legajo *</label>
                                        <input value={form.legajo} onChange={e => set('legajo', e.target.value)} className={inputCls} placeholder="EMP-001" /></div>
                                    <div><label className="text-xs font-bold text-gray-500 uppercase block mb-1">DNI *</label>
                                        <input value={form.dni} onChange={e => set('dni', e.target.value)} className={inputCls} placeholder="12345678" /></div>
                                    <div><label className="text-xs font-bold text-gray-500 uppercase block mb-1">Nombre *</label>
                                        <input value={form.first_name} onChange={e => set('first_name', e.target.value)} className={inputCls} /></div>
                                    <div><label className="text-xs font-bold text-gray-500 uppercase block mb-1">Apellido *</label>
                                        <input value={form.last_name} onChange={e => set('last_name', e.target.value)} className={inputCls} /></div>
                                    <div><label className="text-xs font-bold text-gray-500 uppercase block mb-1">CUIL</label>
                                        <input value={form.cuil} onChange={e => set('cuil', e.target.value)} className={inputCls} placeholder="20-12345678-9" /></div>
                                    <div><label className="text-xs font-bold text-gray-500 uppercase block mb-1">Fecha Nacimiento</label>
                                        <input type="date" value={form.birth_date} onChange={e => set('birth_date', e.target.value)} className={inputCls} /></div>
                                    <div><label className="text-xs font-bold text-gray-500 uppercase block mb-1">Género</label>
                                        <select value={form.gender} onChange={e => set('gender', e.target.value)} className={selectCls}>
                                            <option value="">Seleccionar</option>
                                            {GENDERS.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
                                        </select></div>
                                    <div><label className="text-xs font-bold text-gray-500 uppercase block mb-1">Estado Civil</label>
                                        <select value={form.marital_status} onChange={e => set('marital_status', e.target.value)} className={selectCls}>
                                            <option value="">Seleccionar</option>
                                            {MARITAL.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                                        </select></div>
                                    <div><label className="text-xs font-bold text-gray-500 uppercase block mb-1">Nacionalidad</label>
                                        <input value={form.nationality} onChange={e => set('nationality', e.target.value)} className={inputCls} /></div>
                                </div>
                            </SectionToggle>

                            {/* Contact */}
                            <SectionToggle title="Contacto" icon={<Phone size={16} className="text-blue-600" />} defaultOpen={false}>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div><label className="text-xs font-bold text-gray-500 uppercase block mb-1">Teléfono</label>
                                        <input value={form.phone} onChange={e => set('phone', e.target.value)} className={inputCls} /></div>
                                    <div><label className="text-xs font-bold text-gray-500 uppercase block mb-1">Email</label>
                                        <input type="email" value={form.email} onChange={e => set('email', e.target.value)} className={inputCls} /></div>
                                    <div className="sm:col-span-2"><label className="text-xs font-bold text-gray-500 uppercase block mb-1">Dirección</label>
                                        <input value={form.address} onChange={e => set('address', e.target.value)} className={inputCls} /></div>
                                    <div><label className="text-xs font-bold text-gray-500 uppercase block mb-1">Ciudad</label>
                                        <input value={form.city} onChange={e => set('city', e.target.value)} className={inputCls} /></div>
                                    <div><label className="text-xs font-bold text-gray-500 uppercase block mb-1">Provincia</label>
                                        <input value={form.province} onChange={e => set('province', e.target.value)} className={inputCls} /></div>
                                    <div><label className="text-xs font-bold text-gray-500 uppercase block mb-1">Código Postal</label>
                                        <input value={form.postal_code} onChange={e => set('postal_code', e.target.value)} className={inputCls} /></div>
                                </div>
                            </SectionToggle>

                            {/* Labor */}
                            <SectionToggle title="Datos Laborales" icon={<Briefcase size={16} className="text-indigo-600" />}>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div><label className="text-xs font-bold text-gray-500 uppercase block mb-1">Fecha Ingreso</label>
                                        <input type="date" value={form.hire_date} onChange={e => set('hire_date', e.target.value)} className={inputCls} /></div>
                                    <div><label className="text-xs font-bold text-gray-500 uppercase block mb-1">Fecha Baja</label>
                                        <input type="date" value={form.termination_date} onChange={e => set('termination_date', e.target.value)} className={inputCls} /></div>
                                    <div><label className="text-xs font-bold text-gray-500 uppercase block mb-1">Departamento</label>
                                        <select value={form.department} onChange={e => set('department', e.target.value)} className={selectCls}>
                                            <option value="">Seleccionar</option>
                                            {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                                        </select></div>
                                    <div><label className="text-xs font-bold text-gray-500 uppercase block mb-1">Puesto / Cargo</label>
                                        <input value={form.position} onChange={e => set('position', e.target.value)} className={inputCls} /></div>
                                    <div><label className="text-xs font-bold text-gray-500 uppercase block mb-1">Jefe (ID empleado)</label>
                                        <select value={form.supervisor_id} onChange={e => set('supervisor_id', e.target.value)} className={selectCls}>
                                            <option value="">Sin jefe directo</option>
                                            {employees.filter(e => e.id !== editingId).map(e => <option key={e.id} value={e.id}>{e.full_name} ({e.legajo})</option>)}
                                        </select></div>
                                    <div><label className="text-xs font-bold text-gray-500 uppercase block mb-1">Tipo Contrato</label>
                                        <select value={form.contract_type} onChange={e => set('contract_type', e.target.value)} className={selectCls}>
                                            {CONTRACT_TYPES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                                        </select></div>
                                    <div><label className="text-xs font-bold text-gray-500 uppercase block mb-1">Facturación</label>
                                        <select value={form.billing_type} onChange={e => set('billing_type', e.target.value)} className={selectCls}>
                                            {BILLING_TYPES.map(b => <option key={b.value} value={b.value}>{b.label}</option>)}
                                        </select></div>
                                    <div><label className="text-xs font-bold text-gray-500 uppercase block mb-1">Jornada</label>
                                        <select value={form.work_schedule} onChange={e => set('work_schedule', e.target.value)} className={selectCls}>
                                            {WORK_SCHEDULES.map(w => <option key={w.value} value={w.value}>{w.label}</option>)}
                                        </select></div>
                                    <div><label className="text-xs font-bold text-gray-500 uppercase block mb-1">Horas Semanales</label>
                                        <input type="number" value={form.weekly_hours} onChange={e => set('weekly_hours', e.target.value)} className={inputCls} /></div>
                                    <div className="flex items-center gap-2 sm:col-span-2">
                                        <input type="checkbox" checked={form.is_active} onChange={e => set('is_active', e.target.checked)} className="rounded" />
                                        <label className="text-sm text-gray-700 font-medium">Empleado activo</label>
                                    </div>
                                </div>
                            </SectionToggle>

                            {/* Health */}
                            <SectionToggle title="Salud y Emergencia" icon={<Shield size={16} className="text-red-600" />} defaultOpen={false}>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div><label className="text-xs font-bold text-gray-500 uppercase block mb-1">Obra Social</label>
                                        <input value={form.obra_social} onChange={e => set('obra_social', e.target.value)} className={inputCls} /></div>
                                    <div><label className="text-xs font-bold text-gray-500 uppercase block mb-1">Plan</label>
                                        <input value={form.obra_social_plan} onChange={e => set('obra_social_plan', e.target.value)} className={inputCls} /></div>
                                    <div><label className="text-xs font-bold text-gray-500 uppercase block mb-1">Nro Afiliado</label>
                                        <input value={form.obra_social_number} onChange={e => set('obra_social_number', e.target.value)} className={inputCls} /></div>
                                    <div></div>
                                    <div><label className="text-xs font-bold text-gray-500 uppercase block mb-1">Contacto Emergencia</label>
                                        <input value={form.emergency_contact} onChange={e => set('emergency_contact', e.target.value)} className={inputCls} /></div>
                                    <div><label className="text-xs font-bold text-gray-500 uppercase block mb-1">Teléfono Emergencia</label>
                                        <input value={form.emergency_phone} onChange={e => set('emergency_phone', e.target.value)} className={inputCls} /></div>
                                </div>
                            </SectionToggle>

                            {/* Banking */}
                            <SectionToggle title="Datos Bancarios y Salario" icon={<CreditCard size={16} className="text-amber-600" />} defaultOpen={false}>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div><label className="text-xs font-bold text-gray-500 uppercase block mb-1">Banco</label>
                                        <input value={form.bank_name} onChange={e => set('bank_name', e.target.value)} className={inputCls} /></div>
                                    <div><label className="text-xs font-bold text-gray-500 uppercase block mb-1">CBU / CVU</label>
                                        <input value={form.bank_cbu} onChange={e => set('bank_cbu', e.target.value)} className={inputCls} /></div>
                                    <div><label className="text-xs font-bold text-gray-500 uppercase block mb-1">Salario Bruto</label>
                                        <input type="number" value={form.salary} onChange={e => set('salary', e.target.value)} className={inputCls} /></div>
                                    <div><label className="text-xs font-bold text-gray-500 uppercase block mb-1">Moneda</label>
                                        <select value={form.salary_currency} onChange={e => set('salary_currency', e.target.value)} className={selectCls}>
                                            <option value="ARS">ARS</option><option value="USD">USD</option>
                                        </select></div>
                                </div>
                            </SectionToggle>

                            {/* Notes */}
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Observaciones</label>
                                <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={3} className={inputCls + " resize-none"} />
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
                            <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-gray-500 hover:bg-gray-100 rounded-lg">Cancelar</button>
                            <button onClick={handleSave} disabled={!form.legajo.trim() || !form.first_name.trim() || !form.last_name.trim() || !form.dni.trim()}
                                className="px-5 py-2 text-sm font-bold bg-gradient-to-r from-teal-600 to-emerald-600 text-white rounded-lg shadow-sm hover:shadow-md disabled:opacity-40">
                                {editingId ? 'Guardar Cambios' : 'Crear Empleado'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
