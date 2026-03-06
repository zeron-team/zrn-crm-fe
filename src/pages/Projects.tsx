import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
    FolderKanban, Plus, Search, Trash2, Edit3, X, Users, ChevronRight,
    LayoutGrid, Columns3, Building2, FileText
} from 'lucide-react';
import api from '../api/client';

interface Project {
    id: number;
    name: string;
    description: string | null;
    key: string;
    status: string;
    methodology: string;
    client_id: number | null;
    client_name: string | null;
    quote_id: number | null;
    quote_number: string | null;
    task_count: number;
    done_count: number;
    member_count: number;
    created_at: string;
    updated_at: string;
}
interface ClientInfo { id: number; company_name: string; }
interface QuoteInfo { id: number; quote_number: string; client_id: number | null; total_amount: number; }

const STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
    active: { bg: '#dcfce7', text: '#166534', label: 'Activo' },
    completed: { bg: '#dbeafe', text: '#1e40af', label: 'Completado' },
    archived: { bg: '#f3f4f6', text: '#6b7280', label: 'Archivado' },
};

export default function Projects() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [projects, setProjects] = useState<Project[]>([]);
    const [clients, setClients] = useState<ClientInfo[]>([]);
    const [quotes, setQuotes] = useState<QuoteInfo[]>([]);
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editProject, setEditProject] = useState<Project | null>(null);
    const [form, setForm] = useState({ name: '', description: '', key: '', methodology: 'kanban', client_id: '', quote_id: '' });

    const load = async () => {
        try {
            const params: any = {};
            if (filterStatus) params.status = filterStatus;
            const { data } = await api.get('/projects', { params });
            setProjects(data);
        } catch (e) { console.error(e); }
    };

    useEffect(() => { load(); }, [filterStatus]);
    useEffect(() => {
        api.get('/clients').then(r => setClients(r.data)).catch(() => { });
        api.get('/quotes').then(r => setQuotes(r.data)).catch(() => { });
    }, []);

    // Auto-open create from quote (via URL param)
    useEffect(() => {
        const quoteId = searchParams.get('from_quote');
        if (quoteId && quotes.length > 0) {
            const q = quotes.find(x => x.id === parseInt(quoteId));
            if (q) {
                setEditProject(null);
                setForm({
                    name: `Proyecto ${q.quote_number}`,
                    description: `Proyecto generado desde presupuesto ${q.quote_number}`,
                    key: '', methodology: 'kanban',
                    client_id: q.client_id ? String(q.client_id) : '',
                    quote_id: String(q.id),
                });
                setShowModal(true);
            }
        }
    }, [searchParams, quotes]);

    const openCreate = () => {
        setEditProject(null);
        setForm({ name: '', description: '', key: '', methodology: 'kanban', client_id: '', quote_id: '' });
        setShowModal(true);
    };

    const openEdit = (p: Project) => {
        setEditProject(p);
        setForm({
            name: p.name, description: p.description || '', key: p.key, methodology: p.methodology,
            client_id: p.client_id ? String(p.client_id) : '', quote_id: p.quote_id ? String(p.quote_id) : '',
        });
        setShowModal(true);
    };

    const save = async () => {
        try {
            if (editProject) {
                await api.put(`/projects/${editProject.id}`, {
                    name: form.name, description: form.description || null,
                    methodology: form.methodology,
                    client_id: form.client_id ? parseInt(form.client_id) : null,
                    quote_id: form.quote_id ? parseInt(form.quote_id) : null,
                });
            } else {
                await api.post('/projects', {
                    name: form.name, description: form.description || null,
                    key: form.key.toUpperCase(), methodology: form.methodology,
                    client_id: form.client_id ? parseInt(form.client_id) : null,
                    quote_id: form.quote_id ? parseInt(form.quote_id) : null,
                });
            }
            setShowModal(false);
            load();
        } catch (e: any) {
            alert(e.response?.data?.detail || 'Error');
        }
    };

    const remove = async (id: number) => {
        if (!confirm('¿Eliminar proyecto y todas sus tareas?')) return;
        await api.delete(`/projects/${id}`);
        load();
    };

    // When selecting a quote, auto-fill client
    const handleQuoteChange = (quoteId: string) => {
        setForm(prev => {
            const newForm = { ...prev, quote_id: quoteId };
            if (quoteId) {
                const q = quotes.find(x => x.id === parseInt(quoteId));
                if (q && q.client_id) newForm.client_id = String(q.client_id);
            }
            return newForm;
        });
    };

    const filtered = projects.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.key.toLowerCase().includes(search.toLowerCase()) ||
        (p.client_name && p.client_name.toLowerCase().includes(search.toLowerCase()))
    );

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-gray-50">
            {/* Header */}
            <div className="px-6 py-4 bg-white border-b border-gray-200 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center shadow-sm">
                        <FolderKanban size={20} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-gray-900">Proyectos</h1>
                        <p className="text-xs text-gray-400">{filtered.length} proyectos</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input value={search} onChange={e => setSearch(e.target.value)}
                            placeholder="Buscar..."
                            className="pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm w-48 outline-none focus:ring-2 focus:ring-violet-400" />
                    </div>
                    <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                        className="px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-violet-400">
                        <option value="">Todos</option>
                        <option value="active">Activos</option>
                        <option value="completed">Completados</option>
                        <option value="archived">Archivados</option>
                    </select>
                    <button onClick={openCreate}
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-lg font-bold text-sm shadow-sm hover:shadow-md transition-all">
                        <Plus size={16} /> Nuevo Proyecto
                    </button>
                </div>
            </div>

            {/* Projects grid */}
            <div className="flex-1 overflow-auto p-6">
                {filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-gray-400 gap-3">
                        <FolderKanban size={48} className="text-gray-300" />
                        <p className="text-sm">No hay proyectos. ¡Creá uno!</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filtered.map(p => {
                            const st = STATUS_COLORS[p.status] || STATUS_COLORS.active;
                            const pct = p.task_count > 0 ? Math.round((p.done_count / p.task_count) * 100) : 0;
                            return (
                                <div key={p.id}
                                    className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-200 cursor-pointer group overflow-hidden"
                                    onClick={() => navigate(`/projects/${p.id}`)}>
                                    <div className="h-1.5 bg-gradient-to-r from-violet-500 to-purple-600" />
                                    <div className="p-5">
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                    <span className="text-xs font-bold text-violet-500 bg-violet-50 px-2 py-0.5 rounded">{p.key}</span>
                                                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                                                        style={{ backgroundColor: st.bg, color: st.text }}>
                                                        {st.label}
                                                    </span>
                                                </div>
                                                <h3 className="font-bold text-gray-900 text-base truncate">{p.name}</h3>

                                                {/* Client badge */}
                                                {p.client_name && (
                                                    <div className="flex items-center gap-1 mt-1">
                                                        <Building2 size={11} className="text-gray-400" />
                                                        <span className="text-[10px] text-gray-500 font-medium">{p.client_name}</span>
                                                    </div>
                                                )}
                                                {/* Quote badge */}
                                                {p.quote_number && (
                                                    <div className="flex items-center gap-1 mt-0.5">
                                                        <FileText size={11} className="text-violet-400" />
                                                        <span className="text-[10px] text-violet-500 font-medium">Presupuesto {p.quote_number}</span>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                                                <button onClick={(e) => { e.stopPropagation(); openEdit(p); }}
                                                    className="p-1.5 hover:bg-gray-100 rounded-lg">
                                                    <Edit3 size={14} className="text-gray-400" />
                                                </button>
                                                <button onClick={(e) => { e.stopPropagation(); remove(p.id); }}
                                                    className="p-1.5 hover:bg-red-50 rounded-lg">
                                                    <Trash2 size={14} className="text-red-400" />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Progress bar */}
                                        <div className="mb-3">
                                            <div className="flex items-center justify-between text-[10px] text-gray-400 mb-1">
                                                <span>{p.done_count}/{p.task_count} tareas</span>
                                                <span>{pct}%</span>
                                            </div>
                                            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                                <div className="h-full bg-gradient-to-r from-violet-400 to-purple-500 rounded-full transition-all duration-300"
                                                    style={{ width: `${pct}%` }} />
                                            </div>
                                        </div>

                                        {/* Footer */}
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className="flex items-center gap-1 text-[10px] text-gray-400">
                                                    {p.methodology === 'scrum' ? <Columns3 size={12} /> : <LayoutGrid size={12} />}
                                                    {p.methodology === 'scrum' ? 'Scrum' : 'Kanban'}
                                                </span>
                                                <span className="flex items-center gap-1 text-[10px] text-gray-400">
                                                    <Users size={12} /> {p.member_count}
                                                </span>
                                            </div>
                                            <ChevronRight size={16} className="text-gray-300 group-hover:text-violet-400 transition-colors" />
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
                        {/* ARCA Modal header */}
                        <div className="px-6 py-4 bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-between sticky top-0 z-10">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                                    <FolderKanban size={20} className="text-white" />
                                </div>
                                <div>
                                    <h3 className="font-black text-lg text-white">
                                        {editProject ? 'Editar Proyecto' : 'Nuevo Proyecto'}
                                    </h3>
                                    <p className="text-blue-100 text-xs">Complete los datos del proyecto</p>
                                </div>
                            </div>
                            <button onClick={() => setShowModal(false)} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors">
                                <X size={18} className="text-white" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            {/* Name & Key section */}
                            <div className="border border-blue-100 rounded-xl p-4 bg-blue-50/30 space-y-3">
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Nombre</label>
                                    <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                                        placeholder="Nombre del proyecto..."
                                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-400 bg-white" />
                                </div>
                                {!editProject && (
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Key (2-5 letras)</label>
                                        <input value={form.key} onChange={e => setForm({ ...form, key: e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 5) })}
                                            placeholder="ZRN"
                                            className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-400 font-mono bg-white" />
                                    </div>
                                )}
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Descripción</label>
                                    <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                                        placeholder="Descripción..."
                                        rows={2}
                                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-400 resize-none bg-white" />
                                </div>
                            </div>

                            {/* Quote + Client section */}
                            <div className="border border-purple-100 rounded-xl p-4 bg-purple-50/30">
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Presupuesto origen</label>
                                        <select value={form.quote_id} onChange={e => handleQuoteChange(e.target.value)}
                                            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-400 bg-white">
                                            <option value="">Sin presupuesto</option>
                                            {quotes.map(q => <option key={q.id} value={q.id}>{q.quote_number}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Cuenta</label>
                                        <select value={form.client_id} onChange={e => setForm({ ...form, client_id: e.target.value })}
                                            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-400 bg-white">
                                            <option value="">Sin cuenta</option>
                                            {clients.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Methodology section */}
                            <div className="border border-green-100 rounded-xl p-4 bg-green-50/30">
                                <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Metodología</label>
                                <div className="flex gap-3">
                                    {[
                                        { v: 'kanban', label: 'Kanban', icon: LayoutGrid, desc: 'Flujo continuo' },
                                        { v: 'scrum', label: 'Scrum', icon: Columns3, desc: 'Sprints iterativos' }
                                    ].map(m => (
                                        <button key={m.v} onClick={() => setForm({ ...form, methodology: m.v })}
                                            className={`flex-1 p-4 rounded-xl border-2 transition-all text-left ${form.methodology === m.v
                                                ? 'border-blue-400 bg-blue-50 ring-2 ring-blue-200'
                                                : 'border-gray-200 hover:border-gray-300'
                                                }`}>
                                            <m.icon size={20} className={form.methodology === m.v ? 'text-blue-500' : 'text-gray-400'} />
                                            <p className={`font-bold text-sm mt-2 ${form.methodology === m.v ? 'text-blue-700' : 'text-gray-700'}`}>{m.label}</p>
                                            <p className="text-[10px] text-gray-400 mt-0.5">{m.desc}</p>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
                            <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-gray-500 hover:bg-gray-100 rounded-lg">
                                Cancelar
                            </button>
                            <button onClick={save} disabled={!form.name.trim() || (!editProject && !form.key.trim())}
                                className="px-5 py-2 text-sm font-bold bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg shadow-sm hover:shadow-md disabled:opacity-40">
                                {editProject ? 'Guardar' : 'Crear Proyecto'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
