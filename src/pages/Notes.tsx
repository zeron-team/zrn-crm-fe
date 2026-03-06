import { useState, useEffect, useRef, useCallback } from 'react';
import {
    StickyNote, Plus, Trash2, Edit3, GripVertical, LayoutGrid, List,
    X, Search, Filter, Tag, Building2, UserCircle, FileText, Receipt,
    Briefcase, TicketCheck, Users
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
    entity_type: string | null;
    entity_id: number | null;
    assigned_to: number | null;
    created_at: string;
    updated_at: string;
}

interface User {
    id: number;
    username: string;
    full_name?: string;
}

const COLORS = [
    { name: 'yellow', bg: '#fef9c3', border: '#facc15', text: '#854d0e', label: 'Amarillo' },
    { name: 'green', bg: '#dcfce7', border: '#4ade80', text: '#166534', label: 'Verde' },
    { name: 'blue', bg: '#dbeafe', border: '#60a5fa', text: '#1e40af', label: 'Azul' },
    { name: 'pink', bg: '#fce7f3', border: '#f472b6', text: '#9d174d', label: 'Rosa' },
    { name: 'purple', bg: '#f3e8ff', border: '#c084fc', text: '#6b21a8', label: 'Violeta' },
    { name: 'orange', bg: '#ffedd5', border: '#fb923c', text: '#9a3412', label: 'Naranja' },
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
    const [form, setForm] = useState({ title: '', content: '', color: 'yellow', entity_type: '', entity_id: '', assigned_to: '' });

    // Drag state
    const dragRef = useRef<{ id: number; startX: number; startY: number; origX: number; origY: number } | null>(null);
    const boardRef = useRef<HTMLDivElement>(null);

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
        setForm({ title: '', content: '', color: 'yellow', entity_type: '', entity_id: '', assigned_to: '' });
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
        };
        try {
            if (editNote) {
                await api.put(`/notes/${editNote.id}`, payload);
            } else {
                // Auto-position: find next available slot
                const maxX = notes.reduce((m, n) => Math.max(m, n.position_x), 0);
                const maxY = notes.reduce((m, n) => Math.max(m, n.position_y), 0);
                const col = notes.length % 4;
                const row = Math.floor(notes.length / 4);
                payload.position_x = col * 280 + 20;
                payload.position_y = row * 240 + 20;
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

    // Drag & Drop handlers
    const handleMouseDown = (e: React.MouseEvent, note: Note) => {
        if ((e.target as HTMLElement).closest('.note-action')) return;
        e.preventDefault();
        dragRef.current = {
            id: note.id,
            startX: e.clientX,
            startY: e.clientY,
            origX: note.position_x,
            origY: note.position_y,
        };
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    };

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!dragRef.current) return;
        const dx = e.clientX - dragRef.current.startX;
        const dy = e.clientY - dragRef.current.startY;
        const newX = Math.max(0, dragRef.current.origX + dx);
        const newY = Math.max(0, dragRef.current.origY + dy);
        setNotes(prev => prev.map(n =>
            n.id === dragRef.current!.id ? { ...n, position_x: newX, position_y: newY } : n
        ));
    }, []);

    const handleMouseUp = useCallback(async () => {
        if (!dragRef.current) return;
        const { id, origX, origY } = dragRef.current;
        const note = notes.find(n => n.id === id);
        dragRef.current = null;
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        if (note && (note.position_x !== origX || note.position_y !== origY)) {
            try {
                await api.patch(`/notes/${id}/position`, {
                    position_x: note.position_x,
                    position_y: note.position_y,
                });
            } catch (e) { console.error(e); }
        }
    }, [notes, handleMouseMove]);

    const filteredNotes = notes.filter(n =>
    (n.title?.toLowerCase().includes(search.toLowerCase()) ||
        n.content?.toLowerCase().includes(search.toLowerCase()))
    );

    const entityLabel = (type: string | null, id: number | null) => {
        if (!type) return null;
        const et = ENTITY_TYPES.find(e => e.value === type);
        return et ? `${et.label} #${id}` : null;
    };

    const getUserName = (userId: number | null) => {
        if (!userId) return null;
        const u = users.find(u => u.id === userId);
        return u ? (u.full_name || u.username) : null;
    };

    const formatDate = (ts: string) => new Date(ts).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' });

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-gray-50">
            {/* Header */}
            <div className="px-4 sm:px-6 py-4 bg-white border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between flex-shrink-0 gap-3">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center shadow-sm">
                        <StickyNote size={20} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-gray-900">Notas</h1>
                        <p className="text-xs text-gray-400">{filteredNotes.length} notas</p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    {/* Search */}
                    <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input value={search} onChange={e => setSearch(e.target.value)}
                            placeholder="Buscar..."
                            className="pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm w-40 sm:w-48 outline-none focus:ring-2 focus:ring-amber-400" />
                    </div>

                    {/* Color filter */}
                    <select value={filterColor} onChange={e => setFilterColor(e.target.value)}
                        className="px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-amber-400">
                        <option value="">Colores</option>
                        {COLORS.map(c => <option key={c.name} value={c.name}>{c.label}</option>)}
                    </select>

                    {/* Entity filter */}
                    <select value={filterEntity} onChange={e => setFilterEntity(e.target.value)}
                        className="hidden sm:block px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-amber-400">
                        <option value="">Entidades</option>
                        {ENTITY_TYPES.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
                    </select>

                    {/* View toggle */}
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

                    {/* Create */}
                    <button onClick={openCreate}
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg font-bold text-sm shadow-sm hover:shadow-md transition-all">
                        <Plus size={16} /> <span className="hidden sm:inline">Nueva Nota</span><span className="sm:hidden">+</span>
                    </button>
                </div>
            </div>

            {/* Board View */}
            {view === 'board' && (
                <div ref={boardRef} className="flex-1 overflow-auto p-4 sm:p-6 relative" style={{ minHeight: '600px' }}>
                    {filteredNotes.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3">
                            <StickyNote size={48} className="text-gray-300" />
                            <p className="text-sm">No hay notas. ¡Creá una!</p>
                        </div>
                    ) : (
                        <>
                            {/* Desktop: absolute positioning */}
                            <div className="hidden sm:block relative" style={{ minHeight: '800px', minWidth: '100%' }}>
                                {filteredNotes.map(note => {
                                    const color = getColor(note.color);
                                    const entLabel = entityLabel(note.entity_type, note.entity_id);
                                    return (
                                        <div
                                            key={note.id}
                                            className="absolute w-64 group cursor-grab active:cursor-grabbing select-none"
                                            style={{
                                                left: note.position_x,
                                                top: note.position_y,
                                                zIndex: dragRef.current?.id === note.id ? 100 : 1,
                                            }}
                                            onMouseDown={e => handleMouseDown(e, note)}
                                        >
                                            <div className="rounded-xl shadow-md hover:shadow-xl transition-all duration-200 overflow-hidden border-2"
                                                style={{ backgroundColor: color.bg, borderColor: color.border + '60' }}>
                                                <div className="h-2" style={{ backgroundColor: color.border }} />
                                                <div className="p-4">
                                                    <div className="flex items-start justify-between mb-2">
                                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <GripVertical size={14} className="text-gray-400" />
                                                        </div>
                                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity note-action">
                                                            <button onClick={() => openEdit(note)} className="p-1 hover:bg-black/10 rounded transition-colors">
                                                                <Edit3 size={12} style={{ color: color.text }} />
                                                            </button>
                                                            <button onClick={() => deleteNote(note.id)} className="p-1 hover:bg-red-100 rounded transition-colors">
                                                                <Trash2 size={12} className="text-red-500" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                    {note.title && <h3 className="font-bold text-sm mb-1 leading-tight" style={{ color: color.text }}>{note.title}</h3>}
                                                    {note.content && <p className="text-xs leading-relaxed line-clamp-6 whitespace-pre-wrap" style={{ color: color.text + 'cc' }}>{note.content}</p>}
                                                    {entLabel && (
                                                        <div className="mt-2 flex items-center gap-1">
                                                            <Tag size={10} style={{ color: color.text }} />
                                                            <span className="text-[10px] font-medium" style={{ color: color.text + 'aa' }}>{entLabel}</span>
                                                        </div>
                                                    )}
                                                    {getUserName(note.assigned_to) && (
                                                        <div className="mt-1 flex items-center gap-1">
                                                            <UserCircle size={10} style={{ color: color.text }} />
                                                            <span className="text-[10px] font-medium" style={{ color: color.text + 'aa' }}>{getUserName(note.assigned_to)}</span>
                                                        </div>
                                                    )}
                                                    <p className="text-[10px] mt-2 opacity-50" style={{ color: color.text }}>{formatDate(note.updated_at)}</p>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            {/* Mobile: stacked cards */}
                            <div className="sm:hidden grid grid-cols-1 gap-3">
                                {filteredNotes.map(note => {
                                    const color = getColor(note.color);
                                    const entLabel = entityLabel(note.entity_type, note.entity_id);
                                    return (
                                        <div key={note.id} className="rounded-xl shadow-sm overflow-hidden border-2"
                                            style={{ backgroundColor: color.bg, borderColor: color.border + '60' }}>
                                            <div className="h-1.5" style={{ backgroundColor: color.border }} />
                                            <div className="p-4">
                                                <div className="flex items-start justify-between mb-1">
                                                    <h3 className="font-bold text-sm leading-tight flex-1" style={{ color: color.text }}>{note.title || 'Sin título'}</h3>
                                                    <div className="flex items-center gap-1 ml-2 note-action">
                                                        <button onClick={() => openEdit(note)} className="p-1.5 hover:bg-black/10 rounded">
                                                            <Edit3 size={14} style={{ color: color.text }} />
                                                        </button>
                                                        <button onClick={() => deleteNote(note.id)} className="p-1.5 hover:bg-red-100 rounded">
                                                            <Trash2 size={14} className="text-red-500" />
                                                        </button>
                                                    </div>
                                                </div>
                                                {note.content && <p className="text-xs leading-relaxed line-clamp-3 whitespace-pre-wrap" style={{ color: color.text + 'cc' }}>{note.content}</p>}
                                                <div className="flex items-center gap-2 mt-2 flex-wrap">
                                                    {entLabel && (
                                                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: color.border + '30', color: color.text }}>{entLabel}</span>
                                                    )}
                                                    {getUserName(note.assigned_to) && (
                                                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-white/50" style={{ color: color.text }}>👤 {getUserName(note.assigned_to)}</span>
                                                    )}
                                                    <span className="text-[10px] opacity-50 ml-auto" style={{ color: color.text }}>{formatDate(note.updated_at)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* List View */}
            {view === 'list' && (
                <div className="flex-1 overflow-auto p-6">
                    <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100 shadow-sm">
                        {filteredNotes.length === 0 ? (
                            <div className="p-8 text-center text-gray-400 text-sm">No hay notas</div>
                        ) : filteredNotes.map(note => {
                            const color = getColor(note.color);
                            const entLabel = entityLabel(note.entity_type, note.entity_id);
                            return (
                                <div key={note.id} className="flex items-center gap-4 px-5 py-3 hover:bg-gray-50 transition-colors group">
                                    {/* Color dot */}
                                    <div className="w-4 h-4 rounded-full flex-shrink-0 shadow-sm border-2"
                                        style={{ backgroundColor: color.bg, borderColor: color.border }} />

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-sm text-gray-900 truncate">{note.title || 'Sin título'}</p>
                                        {note.content && <p className="text-xs text-gray-400 truncate">{note.content}</p>}
                                    </div>

                                    {/* Entity */}
                                    {entLabel && (
                                        <span className="px-2 py-0.5 text-[10px] font-medium rounded-full flex-shrink-0"
                                            style={{ backgroundColor: color.bg, color: color.text, border: `1px solid ${color.border}40` }}>
                                            {entLabel}
                                        </span>
                                    )}

                                    {/* Assigned user */}
                                    {getUserName(note.assigned_to) && (
                                        <span className="px-2 py-0.5 text-[10px] font-medium rounded-full flex-shrink-0 bg-blue-50 text-blue-600 border border-blue-200">
                                            👤 {getUserName(note.assigned_to)}
                                        </span>
                                    )}

                                    {/* Date */}
                                    <span className="text-xs text-gray-400 flex-shrink-0">{formatDate(note.updated_at)}</span>

                                    {/* Actions */}
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => openEdit(note)} className="p-1.5 hover:bg-gray-200 rounded-lg">
                                            <Edit3 size={14} className="text-gray-500" />
                                        </button>
                                        <button onClick={() => deleteNote(note.id)} className="p-1.5 hover:bg-red-50 rounded-lg">
                                            <Trash2 size={14} className="text-red-400" />
                                        </button>
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
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
                        {/* ARCA Modal header */}
                        <div className="px-6 py-4 bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                                    <StickyNote size={20} className="text-white" />
                                </div>
                                <div>
                                    <h3 className="font-black text-lg text-white">
                                        {editNote ? 'Editar Nota' : 'Nueva Nota'}
                                    </h3>
                                    <p className="text-blue-100 text-xs">Complete los datos de la nota</p>
                                </div>
                            </div>
                            <button onClick={() => setShowModal(false)}
                                className="p-1.5 hover:bg-white/20 rounded-lg transition-colors">
                                <X size={18} className="text-white" />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            {/* Title & Content section */}
                            <div className="border border-blue-100 rounded-xl p-4 bg-blue-50/30 space-y-3">
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Título</label>
                                    <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
                                        placeholder="Título de la nota..."
                                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 bg-white" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Contenido</label>
                                    <textarea value={form.content} onChange={e => setForm({ ...form, content: e.target.value })}
                                        placeholder="Escribí el contenido..."
                                        rows={5}
                                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 resize-none bg-white" />
                                </div>
                            </div>

                            {/* Color picker */}
                            <div className="border border-purple-100 rounded-xl p-4 bg-purple-50/30">
                                <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Color</label>
                                <div className="flex gap-2">
                                    {COLORS.map(c => (
                                        <button key={c.name} onClick={() => setForm({ ...form, color: c.name })}
                                            className={`w-10 h-10 rounded-xl border-2 transition-all hover:scale-110 ${form.color === c.name ? 'ring-2 ring-offset-2 ring-blue-400 scale-110' : ''
                                                }`}
                                            style={{ backgroundColor: c.bg, borderColor: c.border }}
                                            title={c.label}
                                        />
                                    ))}
                                </div>
                            </div>

                            {/* Assignment section */}
                            <div className="border border-green-100 rounded-xl p-4 bg-green-50/30 space-y-3">
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Asignar a usuario</label>
                                    <select value={form.assigned_to} onChange={e => setForm({ ...form, assigned_to: e.target.value })}
                                        className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-400 bg-white">
                                        <option value="">Sin asignar</option>
                                        {users.map(u => <option key={u.id} value={u.id}>{u.full_name || u.username}</option>)}
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Asociar a</label>
                                        <select value={form.entity_type} onChange={e => setForm({ ...form, entity_type: e.target.value })}
                                            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-400 bg-white">
                                            <option value="">Sin asociación</option>
                                            {ENTITY_TYPES.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
                                        </select>
                                    </div>
                                    {form.entity_type && (
                                        <div>
                                            <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">ID</label>
                                            <input value={form.entity_id} onChange={e => setForm({ ...form, entity_id: e.target.value })}
                                                type="number" placeholder="ID de la entidad"
                                                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-400 bg-white" />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* ARCA Modal footer */}
                        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
                            <button onClick={() => setShowModal(false)}
                                className="px-4 py-2 text-sm text-gray-500 hover:bg-gray-100 rounded-lg transition-colors">
                                Cancelar
                            </button>
                            <button onClick={saveNote}
                                disabled={!form.title.trim()}
                                className="px-5 py-2 text-sm font-bold bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg shadow-sm hover:shadow-md transition-all disabled:opacity-40">
                                {editNote ? 'Guardar' : 'Crear Nota'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
