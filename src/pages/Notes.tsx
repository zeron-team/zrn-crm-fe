import { useState, useEffect, useRef, useCallback } from 'react';
import {
    StickyNote, Plus, Trash2, Edit3, GripVertical, LayoutGrid, List,
    X, Search, Tag, Building2, UserCircle, FileText, Receipt,
    Briefcase, TicketCheck, Users, Pin, Lock, Unlock, Globe, UserPlus
} from 'lucide-react';
import api from '../api/client';
import { useTranslation } from 'react-i18next';

interface Note {
    id: number;
    title: string;
    content: string | null;
    color: string;
    position_x: number;
    position_y: number;
    sort_order: number;
    entity_type: string | null;
    entity_id: number | null;
    created_by: number | null;
    assigned_to: number | null;
    visibility: string;
    shared_with: number[];
    creator_name: string | null;
    assignee_name: string | null;
    created_at: string;
    updated_at: string;
}

interface User {
    id: number;
    username: string;
    full_name?: string;
}

const COLORS = [
    { name: 'yellow', bg: '#fef9c3', border: '#facc15', text: '#854d0e', label: 'Amarillo', shadow: 'rgba(250,204,21,0.25)' },
    { name: 'green', bg: '#dcfce7', border: '#4ade80', text: '#166534', label: 'Verde', shadow: 'rgba(74,222,128,0.25)' },
    { name: 'blue', bg: '#dbeafe', border: '#60a5fa', text: '#1e40af', label: 'Azul', shadow: 'rgba(96,165,250,0.25)' },
    { name: 'pink', bg: '#fce7f3', border: '#f472b6', text: '#9d174d', label: 'Rosa', shadow: 'rgba(244,114,182,0.25)' },
    { name: 'purple', bg: '#f3e8ff', border: '#c084fc', text: '#6b21a8', label: 'Violeta', shadow: 'rgba(192,132,252,0.25)' },
    { name: 'orange', bg: '#ffedd5', border: '#fb923c', text: '#9a3412', label: 'Naranja', shadow: 'rgba(251,146,60,0.25)' },
];

const ENTITY_TYPES = [
    { value: 'client', label: 'Cliente', icon: Building2 },
    { value: 'lead', label: 'Prospecto', icon: UserCircle },
    { value: 'provider', label: 'Proveedor', icon: Briefcase },
    { value: 'contact', label: 'Contacto', icon: Users },
    { value: 'invoice', label: 'Factura', icon: Receipt },
    { value: 'quote', label: 'Presupuesto', icon: FileText },
    { value: 'ticket', label: 'Ticket', icon: TicketCheck },
];

const getColor = (name: string) => COLORS.find(c => c.name === name) || COLORS[0];

const getRotation = (id: number) => {
    const r = [-2.5, 1.5, -1, 2, -0.5, 1.8, -1.8, 0.8, -2, 1.2];
    return r[id % r.length];
};

export default function Notes() {
    const { t } = useTranslation();
    const [notes, setNotes] = useState<Note[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [view, setView] = useState<'board' | 'list'>('board');
    const [showModal, setShowModal] = useState(false);
    const [editNote, setEditNote] = useState<Note | null>(null);
    const [search, setSearch] = useState('');
    const [filterColor, setFilterColor] = useState('');
    const [filterEntity, setFilterEntity] = useState('');

    // Form state
    const [form, setForm] = useState({
        title: '', content: '', color: 'yellow',
        entity_type: '', entity_id: '', assigned_to: '',
        visibility: 'team', shared_with: [] as number[],
    });

    // Drag reorder state
    const [dragIndex, setDragIndex] = useState<number | null>(null);
    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

    const loadNotes = useCallback(async () => {
        try {
            const params: any = {};
            if (filterColor) params.color = filterColor;
            if (filterEntity) params.entity_type = filterEntity;
            const { data } = await api.get('/notes', { params });
            setNotes(data);
        } catch (e) { console.error(e); }
    }, [filterColor, filterEntity]);

    useEffect(() => { loadNotes(); }, [loadNotes]);

    useEffect(() => {
        api.get('/users/').then(r => setUsers(r.data)).catch(() => { });
    }, []);

    const openCreate = () => {
        setEditNote(null);
        setForm({ title: '', content: '', color: 'yellow', entity_type: '', entity_id: '', assigned_to: '', visibility: 'team', shared_with: [] });
        setShowModal(true);
    };

    const openEdit = (note: Note) => {
        setEditNote(note);
        setForm({
            title: note.title,
            content: note.content || '',
            color: note.color,
            entity_type: note.entity_type || '',
            entity_id: note.entity_id ? String(note.entity_id) : '',
            assigned_to: note.assigned_to ? String(note.assigned_to) : '',
            visibility: note.visibility || 'team',
            shared_with: note.shared_with || [],
        });
        setShowModal(true);
    };

    const saveNote = async () => {
        const payload: any = {
            title: form.title,
            content: form.content,
            color: form.color,
            entity_type: form.entity_type || null,
            entity_id: form.entity_id ? parseInt(form.entity_id) : null,
            assigned_to: form.assigned_to ? parseInt(form.assigned_to) : null,
            visibility: form.visibility,
            shared_with: form.visibility === 'shared' ? form.shared_with : null,
        };
        try {
            if (editNote) {
                await api.put(`/notes/${editNote.id}`, payload);
            } else {
                await api.post('/notes', payload);
            }
            setShowModal(false);
            loadNotes();
        } catch (e) { console.error(e); }
    };

    const deleteNote = async (id: number) => {
        if (!confirm('¿Eliminar esta nota?')) return;
        try {
            await api.delete(`/notes/${id}`);
            loadNotes();
        } catch (e) { console.error(e); }
    };

    // Drag & Drop reorder
    const handleDragStart = (idx: number) => { setDragIndex(idx); };
    const handleDragOver = (e: React.DragEvent, idx: number) => { e.preventDefault(); setDragOverIndex(idx); };
    const handleDragEnd = async () => {
        if (dragIndex !== null && dragOverIndex !== null && dragIndex !== dragOverIndex) {
            const reordered = [...filteredNotes];
            const [moved] = reordered.splice(dragIndex, 1);
            reordered.splice(dragOverIndex, 0, moved);
            setNotes(reordered);
            // Persist new order
            try {
                await api.put('/notes/reorder', { order: reordered.map(n => n.id) });
            } catch (e) { console.error(e); }
        }
        setDragIndex(null);
        setDragOverIndex(null);
    };

    const filteredNotes = notes.filter(n =>
    (n.title?.toLowerCase().includes(search.toLowerCase()) ||
        n.content?.toLowerCase().includes(search.toLowerCase()))
    );

    const entityLabel = (type: string | null, id: number | null) => {
        if (!type) return null;
        const et = ENTITY_TYPES.find(e => e.value === type);
        return et ? `${et.label} #${id}` : null;
    };

    const formatDate = (ts: string) => new Date(ts).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' });

    const visibilityIcon = (v: string) => {
        if (v === 'private') return <Lock size={10} className="text-red-500" />;
        if (v === 'shared') return <UserPlus size={10} className="text-blue-500" />;
        return <Globe size={10} className="text-green-500" />;
    };

    const visibilityLabel = (v: string) => {
        if (v === 'private') return 'Privado';
        if (v === 'shared') return 'Compartido';
        return 'Equipo';
    };

    // Toggle user in shared_with
    const toggleSharedUser = (uid: number) => {
        setForm(f => ({
            ...f,
            shared_with: f.shared_with.includes(uid)
                ? f.shared_with.filter(id => id !== uid)
                : [...f.shared_with, uid],
        }));
    };

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-gray-50">
            {/* Header */}
            <div className="px-4 sm:px-6 py-4 bg-white border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between flex-shrink-0 gap-3">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center shadow-lg shadow-amber-200/50">
                        <StickyNote size={20} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-gray-900">Notas</h1>
                        <p className="text-xs text-gray-400">{filteredNotes.length} notas</p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input value={search} onChange={e => setSearch(e.target.value)}
                            placeholder="Buscar..."
                            className="pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm w-40 sm:w-48 outline-none focus:ring-2 focus:ring-amber-400" />
                    </div>

                    <div className="flex bg-gray-100 rounded-lg p-0.5 gap-0.5">
                        <button onClick={() => setFilterColor('')}
                            className={`px-2 py-1.5 rounded-md text-[10px] font-bold transition-colors ${!filterColor ? 'bg-white shadow-sm text-gray-700' : 'text-gray-400'}`}>
                            Todos
                        </button>
                        {COLORS.map(c => (
                            <button key={c.name} onClick={() => setFilterColor(filterColor === c.name ? '' : c.name)}
                                className={`w-6 h-6 rounded-md border transition-all ${filterColor === c.name ? 'ring-2 ring-offset-1 ring-amber-400 scale-110' : 'hover:scale-110'}`}
                                style={{ backgroundColor: c.bg, borderColor: c.border + '60' }}
                                title={c.label} />
                        ))}
                    </div>

                    <select value={filterEntity} onChange={e => setFilterEntity(e.target.value)}
                        className="hidden sm:block px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-amber-400">
                        <option value="">Entidades</option>
                        {ENTITY_TYPES.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
                    </select>

                    <div className="flex bg-gray-100 rounded-lg p-0.5">
                        <button onClick={() => setView('board')}
                            className={`p-2 rounded-md transition-colors ${view === 'board' ? 'bg-white shadow-sm text-amber-600' : 'text-gray-400 hover:text-gray-600'}`}>
                            <LayoutGrid size={16} />
                        </button>
                        <button onClick={() => setView('list')}
                            className={`p-2 rounded-md transition-colors ${view === 'list' ? 'bg-white shadow-sm text-amber-600' : 'text-gray-400 hover:text-gray-600'}`}>
                            <List size={16} />
                        </button>
                    </div>

                    <button onClick={openCreate}
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg font-bold text-sm shadow-lg shadow-amber-200/50 hover:shadow-xl hover:shadow-amber-300/40 transition-all hover:scale-[1.02]">
                        <Plus size={16} /> <span className="hidden sm:inline">Nueva Nota</span><span className="sm:hidden">+</span>
                    </button>
                </div>
            </div>

            {/* Board View — Grid with Drag-and-Drop Reorder */}
            {view === 'board' && (
                <div className="flex-1 overflow-auto p-4 sm:p-6">
                    {filteredNotes.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3">
                            <div className="w-24 h-24 bg-amber-50 rounded-full flex items-center justify-center">
                                <StickyNote size={40} className="text-amber-300" />
                            </div>
                            <p className="text-sm font-medium">No hay notas. ¡Creá una!</p>
                            <button onClick={openCreate} className="px-4 py-2 bg-amber-50 text-amber-600 rounded-lg text-xs font-bold hover:bg-amber-100">+ Nueva Nota</button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                            {filteredNotes.map((note, idx) => {
                                const color = getColor(note.color);
                                const entLabel = entityLabel(note.entity_type, note.entity_id);
                                const rotation = getRotation(note.id);
                                const isDragging = dragIndex === idx;
                                const isOver = dragOverIndex === idx;

                                return (
                                    <div
                                        key={note.id}
                                        draggable
                                        onDragStart={() => handleDragStart(idx)}
                                        onDragOver={(e) => handleDragOver(e, idx)}
                                        onDragEnd={handleDragEnd}
                                        className={`group select-none cursor-grab active:cursor-grabbing transition-all duration-200 ${isDragging ? 'opacity-40 scale-95' : ''} ${isOver ? 'scale-[1.03]' : ''}`}
                                        style={{ transform: isDragging ? 'rotate(0deg) scale(0.95)' : `rotate(${rotation}deg)` }}
                                    >
                                        <div
                                            className={`rounded-2xl overflow-hidden transition-all duration-300 hover:scale-[1.03] ${isOver ? 'ring-2 ring-amber-400 ring-offset-2' : ''}`}
                                            style={{
                                                backgroundColor: color.bg,
                                                boxShadow: `0 4px 16px ${color.shadow}, 0 1px 3px rgba(0,0,0,0.06)`,
                                            }}
                                        >
                                            {/* Pin */}
                                            <div className="relative px-4 pt-3 pb-0">
                                                <div className="absolute top-2 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full flex items-center justify-center"
                                                    style={{ backgroundColor: color.border + '40' }}>
                                                    <Pin size={10} style={{ color: color.text }} className="rotate-45" />
                                                </div>
                                                {/* Actions */}
                                                <div className="absolute top-2 right-3 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all duration-200">
                                                    <span className="p-1 cursor-grab"><GripVertical size={12} style={{ color: color.text + '80' }} /></span>
                                                    <button onClick={() => openEdit(note)} className="p-1.5 rounded-lg hover:bg-white/40">
                                                        <Edit3 size={13} style={{ color: color.text }} />
                                                    </button>
                                                    <button onClick={() => deleteNote(note.id)} className="p-1.5 rounded-lg hover:bg-red-100/60">
                                                        <Trash2 size={13} className="text-red-500" />
                                                    </button>
                                                </div>
                                                {/* Visibility badge */}
                                                <div className="absolute top-2 left-3 flex items-center gap-1">
                                                    {visibilityIcon(note.visibility)}
                                                </div>
                                            </div>

                                            {/* Content */}
                                            <div className="px-5 pt-4 pb-4">
                                                {note.title && (
                                                    <h3 className="font-black text-sm mb-2 leading-tight" style={{ color: color.text }}>
                                                        {note.title}
                                                    </h3>
                                                )}
                                                {note.content && (
                                                    <p className="text-xs leading-relaxed whitespace-pre-wrap line-clamp-6"
                                                        style={{ color: color.text + 'cc' }}>
                                                        {note.content}
                                                    </p>
                                                )}

                                                {/* Footer */}
                                                <div className="mt-3 pt-2 border-t flex flex-wrap items-center gap-1.5"
                                                    style={{ borderColor: color.border + '30' }}>
                                                    {entLabel && (
                                                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                                                            style={{ backgroundColor: color.border + '25', color: color.text }}>
                                                            <Tag size={8} className="inline mr-0.5 -mt-0.5" />{entLabel}
                                                        </span>
                                                    )}
                                                    {note.assignee_name && (
                                                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/50"
                                                            style={{ color: color.text }}>
                                                            <UserCircle size={8} className="inline mr-0.5 -mt-0.5" />{note.assignee_name}
                                                        </span>
                                                    )}
                                                    {note.creator_name && (
                                                        <span className="text-[9px] px-1.5 py-0.5 rounded-full opacity-60"
                                                            style={{ color: color.text }}>
                                                            @{note.creator_name}
                                                        </span>
                                                    )}
                                                    <span className="text-[9px] ml-auto opacity-50" style={{ color: color.text }}>
                                                        {formatDate(note.updated_at)}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* List View */}
            {view === 'list' && (
                <div className="flex-1 overflow-auto p-4 sm:p-6">
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                        {filteredNotes.length === 0 ? (
                            <div className="p-8 text-center text-gray-400 text-sm">No hay notas</div>
                        ) : filteredNotes.map(note => {
                            const color = getColor(note.color);
                            const entLabel = entityLabel(note.entity_type, note.entity_id);
                            return (
                                <div key={note.id} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 px-4 sm:px-5 py-3.5 hover:bg-gray-50/50 transition-colors group border-b border-gray-100 last:border-0">
                                    <div className="w-5 h-5 rounded-lg flex-shrink-0 shadow-sm"
                                        style={{ backgroundColor: color.bg, border: `2px solid ${color.border}` }} />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1.5">
                                            {visibilityIcon(note.visibility)}
                                            <p className="font-bold text-sm text-gray-900 truncate">{note.title || 'Sin título'}</p>
                                        </div>
                                        {note.content && <p className="text-xs text-gray-400 truncate mt-0.5">{note.content}</p>}
                                    </div>
                                    <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                                        {entLabel && (
                                            <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full flex-shrink-0"
                                                style={{ backgroundColor: color.bg, color: color.text, border: `1px solid ${color.border}40` }}>
                                                {entLabel}
                                            </span>
                                        )}
                                        {note.creator_name && (
                                            <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full flex-shrink-0 bg-gray-50 text-gray-500 border border-gray-200">
                                                @{note.creator_name}
                                            </span>
                                        )}
                                        <span className="text-xs text-gray-400 flex-shrink-0">{formatDate(note.updated_at)}</span>
                                        <div className="flex items-center gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity ml-auto">
                                            <button onClick={() => openEdit(note)} className="p-1.5 hover:bg-gray-200 rounded-lg">
                                                <Edit3 size={14} className="text-gray-500" />
                                            </button>
                                            <button onClick={() => deleteNote(note.id)} className="p-1.5 hover:bg-red-50 rounded-lg">
                                                <Trash2 size={14} className="text-red-400" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Create/Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden max-h-[90vh] flex flex-col">
                        <div className="px-6 py-4 flex items-center justify-between"
                            style={{ background: `linear-gradient(135deg, ${getColor(form.color).border}, ${getColor(form.color).text})` }}>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                                    <StickyNote size={20} className="text-white" />
                                </div>
                                <div>
                                    <h3 className="font-black text-lg text-white">{editNote ? 'Editar Nota' : 'Nueva Nota'}</h3>
                                    <p className="text-white/70 text-xs">Complete los datos de la nota</p>
                                </div>
                            </div>
                            <button onClick={() => setShowModal(false)} className="p-1.5 hover:bg-white/20 rounded-lg">
                                <X size={18} className="text-white" />
                            </button>
                        </div>

                        <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
                            {/* Title & Content */}
                            <div className="border border-gray-100 rounded-xl p-4 bg-gray-50/50 space-y-3">
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Título</label>
                                    <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
                                        placeholder="Título de la nota..."
                                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-amber-400 bg-white" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Contenido</label>
                                    <textarea value={form.content} onChange={e => setForm({ ...form, content: e.target.value })}
                                        placeholder="Escribí el contenido..." rows={5}
                                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-amber-400 resize-none bg-white" />
                                </div>
                            </div>

                            {/* Color picker */}
                            <div className="border border-gray-100 rounded-xl p-4 bg-gray-50/50">
                                <label className="text-xs font-bold text-gray-500 uppercase mb-3 block">Color</label>
                                <div className="flex gap-2 flex-wrap">
                                    {COLORS.map(c => (
                                        <button key={c.name} onClick={() => setForm({ ...form, color: c.name })}
                                            className={`w-12 h-12 rounded-xl border-2 transition-all hover:scale-110 flex flex-col items-center justify-center gap-0.5 ${form.color === c.name ? 'ring-2 ring-offset-2 ring-amber-400 scale-110 shadow-lg' : ''}`}
                                            style={{ backgroundColor: c.bg, borderColor: c.border, boxShadow: form.color === c.name ? `0 4px 12px ${c.shadow}` : 'none' }}>
                                            <Pin size={10} style={{ color: c.text }} className="rotate-45" />
                                            <span className="text-[8px] font-bold" style={{ color: c.text }}>{c.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Privacy / Sharing */}
                            <div className="border border-gray-100 rounded-xl p-4 bg-gray-50/50">
                                <label className="text-xs font-bold text-gray-500 uppercase mb-3 block">Visibilidad</label>
                                <div className="flex gap-2 flex-wrap">
                                    {[
                                        { value: 'private', label: 'Privado', desc: 'Solo vos', icon: Lock, color: 'bg-red-50 border-red-200 text-red-600' },
                                        { value: 'team', label: 'Equipo', desc: 'Todos ven', icon: Globe, color: 'bg-green-50 border-green-200 text-green-600' },
                                        { value: 'shared', label: 'Compartido', desc: 'Elegir', icon: UserPlus, color: 'bg-blue-50 border-blue-200 text-blue-600' },
                                    ].map(opt => (
                                        <button key={opt.value} onClick={() => setForm({ ...form, visibility: opt.value })}
                                            className={`flex-1 min-w-[100px] flex flex-col items-center gap-1 px-3 py-3 rounded-xl border-2 transition-all ${form.visibility === opt.value ? opt.color + ' ring-2 ring-offset-1 ring-amber-400 scale-[1.02]' : 'border-gray-200 bg-white text-gray-400 hover:border-gray-300'}`}>
                                            <opt.icon size={18} />
                                            <span className="text-xs font-bold">{opt.label}</span>
                                            <span className="text-[9px] opacity-70">{opt.desc}</span>
                                        </button>
                                    ))}
                                </div>

                                {/* User selector for 'shared' */}
                                {form.visibility === 'shared' && (
                                    <div className="mt-3 border border-blue-100 rounded-lg p-3 bg-blue-50/50">
                                        <label className="text-xs font-bold text-blue-600 mb-2 block">Compartir con:</label>
                                        <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                                            {users.map(u => {
                                                const selected = form.shared_with.includes(u.id);
                                                return (
                                                    <button key={u.id} onClick={() => toggleSharedUser(u.id)}
                                                        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${selected
                                                            ? 'bg-blue-100 text-blue-700 border border-blue-300 shadow-sm'
                                                            : 'bg-white text-gray-500 border border-gray-200 hover:border-blue-300'
                                                            }`}>
                                                        <UserCircle size={12} />
                                                        {u.full_name || u.username}
                                                        {selected && <X size={10} className="ml-0.5" />}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Assignment & Entity */}
                            <div className="border border-gray-100 rounded-xl p-4 bg-gray-50/50 space-y-3">
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Asignar a usuario</label>
                                    <select value={form.assigned_to} onChange={e => setForm({ ...form, assigned_to: e.target.value })}
                                        className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-amber-400 bg-white">
                                        <option value="">Sin asignar</option>
                                        {users.map(u => <option key={u.id} value={u.id}>{u.full_name || u.username}</option>)}
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Asociar a</label>
                                        <select value={form.entity_type} onChange={e => setForm({ ...form, entity_type: e.target.value })}
                                            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-amber-400 bg-white">
                                            <option value="">Sin asociación</option>
                                            {ENTITY_TYPES.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
                                        </select>
                                    </div>
                                    {form.entity_type && (
                                        <div>
                                            <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">ID</label>
                                            <input value={form.entity_id} onChange={e => setForm({ ...form, entity_id: e.target.value })}
                                                type="number" placeholder="ID"
                                                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-amber-400 bg-white" />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="px-4 sm:px-6 py-4 border-t border-gray-100 flex justify-end gap-3 flex-shrink-0">
                            <button onClick={() => setShowModal(false)}
                                className="px-4 py-2 text-sm text-gray-500 hover:bg-gray-100 rounded-lg">
                                Cancelar
                            </button>
                            <button onClick={saveNote} disabled={!form.title.trim()}
                                className="px-5 py-2 text-sm font-bold text-white rounded-lg shadow-sm hover:shadow-md transition-all disabled:opacity-40"
                                style={{ background: `linear-gradient(135deg, ${getColor(form.color).border}, ${getColor(form.color).text})` }}>
                                {editNote ? 'Guardar' : 'Crear Nota'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
