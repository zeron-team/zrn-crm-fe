import { useState, useEffect } from 'react';
import { Shield, Check, X, Eye, EyeOff, Save, RefreshCw, Plus, Trash2 } from 'lucide-react';
import api from '../api/client';

interface RoleConfig {
    id: number;
    role_name: string;
    display_name: string;
    description: string | null;
    allowed_pages: string[];
    own_data_only: boolean;
}
interface PageDef { path: string; label: string; group: string; }

const BUILTIN_ROLES = new Set(['admin', 'user', 'empleado', 'vendedor']);

const ROLE_GRADIENT_POOL = [
    'from-purple-500 to-indigo-600',
    'from-blue-500 to-cyan-600',
    'from-teal-500 to-emerald-600',
    'from-green-500 to-lime-600',
    'from-amber-500 to-orange-600',
    'from-rose-500 to-pink-600',
    'from-violet-500 to-fuchsia-600',
    'from-sky-500 to-blue-600',
    'from-red-500 to-rose-600',
    'from-cyan-500 to-teal-600',
];

function getRoleGradient(roleName: string, index: number): string {
    const ROLE_COLORS: Record<string, string> = {
        admin: 'from-purple-500 to-indigo-600',
        user: 'from-blue-500 to-cyan-600',
        empleado: 'from-teal-500 to-emerald-600',
        vendedor: 'from-green-500 to-lime-600',
    };
    return ROLE_COLORS[roleName] || ROLE_GRADIENT_POOL[index % ROLE_GRADIENT_POOL.length];
}

export default function RolePermissions() {
    const [roles, setRoles] = useState<RoleConfig[]>([]);
    const [pages, setPages] = useState<PageDef[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState<string | null>(null);
    const [dirty, setDirty] = useState<Set<string>>(new Set());
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newRole, setNewRole] = useState({ role_name: '', display_name: '', description: '' });
    const [creating, setCreating] = useState(false);
    const [toast, setToast] = useState<string | null>(null);

    const fetchData = async () => {
        try {
            const [rolesRes, pagesRes] = await Promise.all([
                api.get('/role-configs/'),
                api.get('/role-configs/pages'),
            ]);
            setRoles(rolesRes.data);
            setPages(pagesRes.data);
        } catch (e) { console.error(e); } finally { setLoading(false); }
    };

    useEffect(() => { fetchData(); }, []);

    const groups = [...new Set(pages.map(p => p.group))];

    const showToast = (msg: string) => {
        setToast(msg);
        setTimeout(() => setToast(null), 3000);
    };

    const togglePage = (roleName: string, pagePath: string) => {
        setRoles(prev => prev.map(r => {
            if (r.role_name !== roleName) return r;
            const has = r.allowed_pages.includes(pagePath);
            return {
                ...r,
                allowed_pages: has
                    ? r.allowed_pages.filter(p => p !== pagePath)
                    : [...r.allowed_pages, pagePath],
            };
        }));
        setDirty(prev => new Set(prev).add(roleName));
    };

    const toggleOwnData = (roleName: string) => {
        setRoles(prev => prev.map(r =>
            r.role_name === roleName ? { ...r, own_data_only: !r.own_data_only } : r
        ));
        setDirty(prev => new Set(prev).add(roleName));
    };

    const toggleAll = (roleName: string, groupPages: string[], enable: boolean) => {
        setRoles(prev => prev.map(r => {
            if (r.role_name !== roleName) return r;
            let newPages = [...r.allowed_pages];
            if (enable) {
                groupPages.forEach(p => { if (!newPages.includes(p)) newPages.push(p); });
            } else {
                newPages = newPages.filter(p => !groupPages.includes(p));
            }
            return { ...r, allowed_pages: newPages };
        }));
        setDirty(prev => new Set(prev).add(roleName));
    };

    const saveRole = async (roleName: string) => {
        const role = roles.find(r => r.role_name === roleName);
        if (!role) return;
        setSaving(roleName);
        try {
            await api.put(`/role-configs/${roleName}`, {
                display_name: role.display_name,
                description: role.description,
                allowed_pages: role.allowed_pages,
                own_data_only: role.own_data_only,
            });
            setDirty(prev => { const n = new Set(prev); n.delete(roleName); return n; });
            showToast(`✅ Rol "${role.display_name}" guardado`);
        } catch (e: any) {
            showToast(`❌ ${e.response?.data?.detail || 'Error al guardar'}`);
        } finally { setSaving(null); }
    };

    const handleCreateRole = async () => {
        if (!newRole.display_name.trim()) return;
        setCreating(true);
        try {
            const roleName = newRole.role_name.trim() || newRole.display_name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
            await api.post('/role-configs/', {
                role_name: roleName,
                display_name: newRole.display_name,
                description: newRole.description || null,
                allowed_pages: ['/', '/dashboards'],
                own_data_only: true,
            });
            setShowCreateModal(false);
            setNewRole({ role_name: '', display_name: '', description: '' });
            showToast(`✅ Rol "${newRole.display_name}" creado`);
            fetchData();
        } catch (e: any) {
            showToast(`❌ ${e.response?.data?.detail || 'Error al crear rol'}`);
        } finally { setCreating(false); }
    };

    const handleDeleteRole = async (roleName: string, displayName: string) => {
        if (!confirm(`¿Estás seguro de eliminar el rol "${displayName}"? Esta acción no se puede deshacer.`)) return;
        try {
            await api.delete(`/role-configs/${roleName}`);
            showToast(`✅ Rol "${displayName}" eliminado`);
            fetchData();
        } catch (e: any) {
            showToast(`❌ ${e.response?.data?.detail || 'Error al eliminar'}`);
        }
    };

    if (loading) return <div className="flex justify-center p-12 text-gray-400">Cargando...</div>;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100 gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-sm">
                        <Shield size={20} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-gray-900">Roles y Permisos</h1>
                        <p className="text-xs text-gray-400">Configurá qué puede ver y hacer cada rol · {roles.length} roles</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => setShowCreateModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-bold text-sm shadow-sm hover:shadow-md transition-all">
                        <Plus size={16} /> Nuevo Rol
                    </button>
                    <button onClick={fetchData} className="flex items-center gap-2 px-3 py-2 text-sm text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
                        <RefreshCw size={14} /> Recargar
                    </button>
                </div>
            </div>

            {/* Role Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {roles.map((role, index) => {
                    const gradient = getRoleGradient(role.role_name, index);
                    const isDirty = dirty.has(role.role_name);
                    const isBuiltin = BUILTIN_ROLES.has(role.role_name);

                    return (
                        <div key={role.role_name} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                            {/* Role Header */}
                            <div className={`bg-gradient-to-r ${gradient} px-5 py-4 flex items-center justify-between`}>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-black text-white text-lg">{role.display_name}</h3>
                                        {isBuiltin && (
                                            <span className="px-1.5 py-0.5 bg-white/20 text-white text-[9px] font-bold rounded-full backdrop-blur-sm">SISTEMA</span>
                                        )}
                                    </div>
                                    <p className="text-white/70 text-xs">{role.description}</p>
                                    <p className="text-white/50 text-[10px] mt-0.5 font-mono">role: {role.role_name}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    {isDirty && (
                                        <button onClick={() => saveRole(role.role_name)}
                                            disabled={saving === role.role_name}
                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg text-xs font-bold transition-colors backdrop-blur-sm">
                                            <Save size={12} /> {saving === role.role_name ? 'Guardando...' : 'Guardar'}
                                        </button>
                                    )}
                                    {!isBuiltin && (
                                        <button onClick={() => handleDeleteRole(role.role_name, role.display_name)}
                                            className="p-1.5 bg-white/10 hover:bg-red-500/50 text-white/60 hover:text-white rounded-lg transition-colors"
                                            title="Eliminar rol">
                                            <Trash2 size={14} />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Own Data Only Toggle */}
                            <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                                <div className="flex items-center gap-2">
                                    {role.own_data_only ? <EyeOff size={16} className="text-amber-600" /> : <Eye size={16} className="text-green-600" />}
                                    <div>
                                        <p className="text-sm font-bold text-gray-800">Visibilidad de Datos</p>
                                        <p className="text-[10px] text-gray-400">
                                            {role.own_data_only
                                                ? 'Solo ve sus propios datos (prospectos, presupuestos, etc.)'
                                                : 'Ve todos los datos del sistema'}
                                        </p>
                                    </div>
                                </div>
                                <button onClick={() => toggleOwnData(role.role_name)}
                                    className={`relative w-12 h-6 rounded-full transition-colors ${role.own_data_only ? 'bg-amber-500' : 'bg-green-500'}`}>
                                    <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${role.own_data_only ? 'left-6' : 'left-0.5'}`} />
                                </button>
                            </div>

                            {/* Page Permissions */}
                            <div className="p-4 space-y-3 max-h-[400px] overflow-y-auto">
                                {groups.map(group => {
                                    const groupPages = pages.filter(p => p.group === group);
                                    const allEnabled = groupPages.every(p => role.allowed_pages.includes(p.path));

                                    return (
                                        <div key={group} className="border border-gray-100 rounded-lg overflow-hidden">
                                            <div className="flex items-center justify-between bg-gray-50 px-3 py-2">
                                                <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">{group}</span>
                                                <button
                                                    onClick={() => toggleAll(role.role_name, groupPages.map(p => p.path), !allEnabled)}
                                                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full transition-colors ${allEnabled ? 'bg-green-100 text-green-700 hover:bg-red-100 hover:text-red-700' : 'bg-gray-200 text-gray-500 hover:bg-green-100 hover:text-green-700'}`}>
                                                    {allEnabled ? 'Quitar todo' : 'Marcar todo'}
                                                </button>
                                            </div>
                                            <div className="divide-y divide-gray-50">
                                                {groupPages.map(page => {
                                                    const enabled = role.allowed_pages.includes(page.path);
                                                    return (
                                                        <button key={page.path}
                                                            onClick={() => togglePage(role.role_name, page.path)}
                                                            className="w-full flex items-center justify-between px-3 py-2 hover:bg-gray-50 transition-colors text-left">
                                                            <span className={`text-sm ${enabled ? 'text-gray-900 font-medium' : 'text-gray-400'}`}>
                                                                {page.label}
                                                            </span>
                                                            {enabled ? (
                                                                <span className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                                                                    <Check size={12} className="text-white" />
                                                                </span>
                                                            ) : (
                                                                <span className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center">
                                                                    <X size={10} className="text-gray-400" />
                                                                </span>
                                                            )}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Stats Footer */}
                            <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 flex justify-between text-xs text-gray-400">
                                <span>{role.allowed_pages.length} / {pages.length} páginas habilitadas</span>
                                <span className={`font-bold ${role.own_data_only ? 'text-amber-600' : 'text-green-600'}`}>
                                    {role.own_data_only ? 'Solo datos propios' : 'Todos los datos'}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Create Role Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-5 text-white">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm"><Plus size={22} /></div>
                                    <div>
                                        <h2 className="text-lg font-bold">Crear Nuevo Rol</h2>
                                        <p className="text-indigo-100 text-sm">Define un rol personalizado</p>
                                    </div>
                                </div>
                                <button onClick={() => setShowCreateModal(false)} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
                                    <X size={20} />
                                </button>
                            </div>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Nombre para Mostrar *</label>
                                <input value={newRole.display_name}
                                    onChange={e => setNewRole(prev => ({ ...prev, display_name: e.target.value }))}
                                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-400 outline-none"
                                    placeholder="Ej: Supervisor, Gerente, Auditor..." />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Identificador (automático)</label>
                                <input value={newRole.role_name || (newRole.display_name ? newRole.display_name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '') : '')}
                                    onChange={e => setNewRole(prev => ({ ...prev, role_name: e.target.value }))}
                                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-400 outline-none font-mono text-gray-500 bg-gray-50"
                                    placeholder="auto-generado" />
                                <p className="text-[10px] text-gray-400 mt-1">Se usa internamente. Solo letras minúsculas, números y guiones bajos.</p>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Descripción</label>
                                <input value={newRole.description}
                                    onChange={e => setNewRole(prev => ({ ...prev, description: e.target.value }))}
                                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-400 outline-none"
                                    placeholder="Descripción breve del rol" />
                            </div>
                        </div>
                        <div className="p-5 border-t border-gray-100 flex justify-between items-center bg-gray-50">
                            <button onClick={() => setShowCreateModal(false)} className="px-4 py-2.5 text-gray-600 hover:text-gray-900 text-sm font-medium">Cancelar</button>
                            <button onClick={handleCreateRole} disabled={creating || !newRole.display_name.trim()}
                                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-indigo-200 hover:shadow-xl disabled:opacity-50 transition-all">
                                <Plus size={16} />
                                {creating ? 'Creando...' : 'Crear Rol'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Toast */}
            {toast && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-6 py-3 bg-gray-900 text-white rounded-xl shadow-2xl text-sm font-bold">
                    {toast}
                </div>
            )}
        </div>
    );
}
