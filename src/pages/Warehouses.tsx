import { useState, useEffect } from "react";
import api from "../api/client";
import { Plus, Search, Building, Pencil, Trash2, X, FileText, ArrowRight, MapPin, Phone, Mail, User, Ruler, Tag } from "lucide-react";

interface WarehouseItem {
    id: number; code: string; name: string; address: string; city: string;
    province: string; zip_code: string; phone: string; email: string;
    manager_id: number | null; manager_name: string; manager_phone: string; manager_email: string;
    capacity: string; warehouse_type: string;
    is_active: boolean; notes: string; created_at: string;
}
interface ContactRef { id: number; name: string; phone: string; email: string; position: string; }

export default function Warehouses() {
    const [items, setItems] = useState<WarehouseItem[]>([]);
    const [contacts, setContacts] = useState<ContactRef[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [autoCode, setAutoCode] = useState("");
    const [formData, setFormData] = useState({
        code: "", name: "", address: "", city: "", province: "", zip_code: "",
        phone: "", email: "", manager_id: "", capacity: "", warehouse_type: "General",
        is_active: true, notes: "",
    });

    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        try {
            const [r1, r2] = await Promise.all([
                api.get("/warehouses").catch(() => ({ data: [] })),
                api.get("/contacts/").catch(() => ({ data: [] })),
            ]);
            setItems(Array.isArray(r1.data) ? r1.data : []);
            setContacts(Array.isArray(r2.data) ? r2.data : []);
        } catch { /* */ } finally { setLoading(false); }
    };

    const fetchNextCode = async () => {
        try { const r = await api.get("/warehouses/next-code"); setAutoCode(r.data.next_code); } catch { setAutoCode(""); }
    };

    const handleSubmit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        try {
            const payload = { ...formData, code: editingId ? formData.code : autoCode, manager_id: formData.manager_id ? Number(formData.manager_id) : null };
            if (editingId) await api.put(`/warehouses/${editingId}`, payload);
            else await api.post("/warehouses", payload);
            setIsModalOpen(false); resetForm(); fetchData();
        } catch (error: any) { alert(error?.response?.data?.detail || "Error al guardar"); }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("¿Eliminar este depósito?")) return;
        try { await api.delete(`/warehouses/${id}`); fetchData(); } catch { /* */ }
    };

    const resetForm = () => {
        setEditingId(null);
        setFormData({ code: "", name: "", address: "", city: "", province: "", zip_code: "", phone: "", email: "", manager_id: "", capacity: "", warehouse_type: "General", is_active: true, notes: "" });
    };

    const openEdit = (w: WarehouseItem) => {
        setEditingId(w.id);
        setFormData({ code: w.code, name: w.name, address: w.address || "", city: w.city || "", province: w.province || "", zip_code: w.zip_code || "", phone: w.phone || "", email: w.email || "", manager_id: w.manager_id?.toString() || "", capacity: w.capacity || "", warehouse_type: w.warehouse_type || "General", is_active: w.is_active, notes: w.notes || "" });
        setIsModalOpen(true);
    };

    const filtered = items.filter(w => w.name?.toLowerCase().includes(search.toLowerCase()) || w.code?.toLowerCase().includes(search.toLowerCase()) || w.city?.toLowerCase().includes(search.toLowerCase()) || w.manager_name?.toLowerCase().includes(search.toLowerCase()));

    const typeBadge = (t: string) => {
        const colors: Record<string, string> = { "General": "bg-blue-100 text-blue-800", "Frío": "bg-cyan-100 text-cyan-800", "Exterior": "bg-amber-100 text-amber-800", "Tránsito": "bg-purple-100 text-purple-800", "Materia Prima": "bg-orange-100 text-orange-800", "Producto Terminado": "bg-green-100 text-green-800" };
        return <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${colors[t] || "bg-gray-100 text-gray-800"}`}>{t}</span>;
    };

    if (loading) return <div className="flex justify-center items-center h-64"><div className="text-gray-500">Cargando...</div></div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100 gap-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-gray-900">Depósitos</h2>
                    <p className="text-sm text-gray-500">Gestión de depósitos y almacenes</p>
                </div>
                <button onClick={() => { resetForm(); fetchNextCode(); setIsModalOpen(true); }} className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-5 py-2.5 rounded-xl font-medium transition-all shadow-lg shadow-blue-200">
                    <Plus size={18} /><span>Nuevo Depósito</span>
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                <div className="relative">
                    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input type="text" placeholder="Buscar por nombre, código, ciudad o responsable..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                {filtered.length === 0 ? (
                    <div className="p-12 text-center">
                        <Building size={48} className="mx-auto text-gray-300 mb-4" />
                        <h3 className="text-lg font-semibold text-gray-700 mb-2">No hay depósitos</h3>
                        <p className="text-gray-500 text-sm">Creá tu primer depósito para gestionar ubicaciones</p>
                    </div>
                ) : (
                    <>
                        <div className="hidden md:block">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider">
                                    <tr>
                                        <th className="p-4 text-left font-semibold">Código</th>
                                        <th className="p-4 text-left font-semibold">Nombre</th>
                                        <th className="p-4 text-left font-semibold">Ubicación</th>
                                        <th className="p-4 text-left font-semibold">Responsable</th>
                                        <th className="p-4 text-left font-semibold">Tipo</th>
                                        <th className="p-4 text-left font-semibold">Capacidad</th>
                                        <th className="p-4 text-center font-semibold">Estado</th>
                                        <th className="p-4 text-center font-semibold">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {filtered.map(w => (
                                        <tr key={w.id} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="p-4 font-mono font-medium text-indigo-600">{w.code}</td>
                                            <td className="p-4 font-medium text-gray-900">{w.name}</td>
                                            <td className="p-4 text-gray-600">
                                                {w.address && <p className="text-xs">{w.address}</p>}
                                                <p className="text-xs text-gray-400">{[w.city, w.province].filter(Boolean).join(", ") || "-"}</p>
                                            </td>
                                            <td className="p-4">
                                                {w.manager_name ? (
                                                    <div>
                                                        <p className="text-gray-800 font-medium text-xs flex items-center gap-1"><User size={12} className="text-indigo-500" />{w.manager_name}</p>
                                                        {w.manager_phone && <p className="text-[10px] text-gray-400 flex items-center gap-1"><Phone size={9} />{w.manager_phone}</p>}
                                                    </div>
                                                ) : <span className="text-gray-400 text-xs">-</span>}
                                            </td>
                                            <td className="p-4">{typeBadge(w.warehouse_type)}</td>
                                            <td className="p-4 text-gray-600">{w.capacity || "-"}</td>
                                            <td className="p-4 text-center">
                                                {w.is_active
                                                    ? <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Activo</span>
                                                    : <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">Inactivo</span>
                                                }
                                            </td>
                                            <td className="p-4 text-center">
                                                <div className="flex items-center justify-center space-x-1">
                                                    <button onClick={() => openEdit(w)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Pencil size={16} /></button>
                                                    <button onClick={() => handleDelete(w.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={16} /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="md:hidden divide-y divide-gray-100">
                            {filtered.map(w => (
                                <div key={w.id} className="p-4 flex items-center justify-between">
                                    <div>
                                        <p className="font-medium text-gray-900">{w.name}</p>
                                        <p className="text-xs text-indigo-600 font-mono">{w.code}</p>
                                        <p className="text-xs text-gray-500">{[w.city, w.province].filter(Boolean).join(", ") || "-"}</p>
                                        {w.manager_name && <p className="text-xs text-gray-600 flex items-center gap-1 mt-0.5"><User size={10} />{w.manager_name}</p>}
                                        <div className="flex gap-2 mt-1">{typeBadge(w.warehouse_type)}{w.is_active ? <span className="text-[10px] text-green-600">● Activo</span> : <span className="text-[10px] text-gray-400">● Inactivo</span>}</div>
                                    </div>
                                    <div className="flex space-x-1">
                                        <button onClick={() => openEdit(w)} className="p-2 text-gray-400 hover:text-blue-600"><Pencil size={16} /></button>
                                        <button onClick={() => handleDelete(w.id)} className="p-2 text-gray-400 hover:text-red-600"><Trash2 size={16} /></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-5 text-white flex-shrink-0">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                    <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm"><Building size={22} /></div>
                                    <div>
                                        <h2 className="text-lg font-bold">{editingId ? "Editar Depósito" : "Nuevo Depósito"}</h2>
                                        <p className="text-blue-100 text-sm">{editingId ? `Código: ${formData.code}` : "Completá la información del depósito"}</p>
                                        {!editingId && autoCode && <p className="text-blue-200 text-xs mt-0.5">Próximo Código: {autoCode}</p>}
                                    </div>
                                </div>
                                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white/20 rounded-lg transition-colors"><X size={20} /></button>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 p-6 space-y-6">
                            {/* Datos Generales */}
                            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 space-y-4">
                                <h4 className="text-xs font-semibold text-indigo-700 uppercase tracking-wide flex items-center"><FileText size={14} className="mr-1.5" /> Datos Generales</h4>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-xs text-gray-600 mb-1">Código</label>
                                        <input type="text" readOnly value={editingId ? formData.code : autoCode} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-gray-100 text-gray-600 cursor-not-allowed" />
                                    </div>
                                    <div className="sm:col-span-2">
                                        <label className="block text-xs text-gray-600 mb-1">Nombre *</label>
                                        <input type="text" required value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 bg-white" placeholder="Depósito Central" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs text-gray-600 mb-1 flex items-center gap-1"><Tag size={10} />Tipo</label>
                                        <select value={formData.warehouse_type} onChange={e => setFormData(p => ({ ...p, warehouse_type: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 bg-white">
                                            <option>General</option><option>Frío</option><option>Exterior</option><option>Tránsito</option><option>Materia Prima</option><option>Producto Terminado</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-600 mb-1 flex items-center gap-1"><Ruler size={10} />Capacidad</label>
                                        <input type="text" value={formData.capacity} onChange={e => setFormData(p => ({ ...p, capacity: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 bg-white" placeholder='500 m², 200 pallets, etc.' />
                                    </div>
                                </div>
                            </div>

                            {/* Dirección */}
                            <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-3">
                                <h4 className="text-xs font-semibold text-green-700 uppercase tracking-wide flex items-center"><MapPin size={14} className="mr-1.5" /> Dirección</h4>
                                <div className="grid grid-cols-1 gap-3">
                                    <div>
                                        <label className="block text-xs text-gray-600 mb-1">Dirección</label>
                                        <input type="text" value={formData.address} onChange={e => setFormData(p => ({ ...p, address: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 bg-white" placeholder="Av. Corrientes 1234" />
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                        <div>
                                            <label className="block text-xs text-gray-600 mb-1">Ciudad</label>
                                            <input type="text" value={formData.city} onChange={e => setFormData(p => ({ ...p, city: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 bg-white" placeholder="Buenos Aires" />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-gray-600 mb-1">Provincia</label>
                                            <input type="text" value={formData.province} onChange={e => setFormData(p => ({ ...p, province: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 bg-white" placeholder="CABA" />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-gray-600 mb-1">Código Postal</label>
                                            <input type="text" value={formData.zip_code} onChange={e => setFormData(p => ({ ...p, zip_code: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 bg-white" placeholder="C1000" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Contacto y Responsable */}
                            <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 space-y-3">
                                <h4 className="text-xs font-semibold text-orange-700 uppercase tracking-wide flex items-center"><User size={14} className="mr-1.5" /> Responsable y Contacto</h4>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <div className="sm:col-span-3">
                                        <label className="block text-xs text-gray-600 mb-1 flex items-center gap-1"><User size={10} />Responsable (Contacto)</label>
                                        <select value={formData.manager_id} onChange={e => setFormData(p => ({ ...p, manager_id: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-400 bg-white">
                                            <option value="">Seleccionar contacto...</option>
                                            {contacts.map(c => <option key={c.id} value={c.id}>{c.name}{c.position ? ` — ${c.position}` : ""}{c.phone ? ` · ${c.phone}` : ""}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-600 mb-1 flex items-center gap-1"><Phone size={10} />Teléfono del depósito</label>
                                        <input type="text" value={formData.phone} onChange={e => setFormData(p => ({ ...p, phone: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-400 bg-white" placeholder="+54 11 1234-5678" />
                                    </div>
                                    <div className="sm:col-span-2">
                                        <label className="block text-xs text-gray-600 mb-1 flex items-center gap-1"><Mail size={10} />Email del depósito</label>
                                        <input type="email" value={formData.email} onChange={e => setFormData(p => ({ ...p, email: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-400 bg-white" placeholder="deposito@empresa.com" />
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" checked={formData.is_active} onChange={e => setFormData(p => ({ ...p, is_active: e.target.checked }))} className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500" />
                                    <span className="text-sm text-gray-700">Depósito activo</span>
                                </label>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Observaciones</label>
                                <textarea value={formData.notes} onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))} rows={2} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500" placeholder="Notas adicionales..." />
                            </div>
                        </form>

                        <div className="p-5 border-t border-gray-100 flex justify-between items-center flex-shrink-0 bg-gray-50">
                            <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2.5 text-gray-600 hover:text-gray-900 text-sm font-medium">Cancelar</button>
                            <button onClick={handleSubmit} className="flex items-center px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-medium hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-200 transition-all">
                                {editingId ? "Actualizar" : "Crear Depósito"} <ArrowRight size={16} className="ml-2" />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
