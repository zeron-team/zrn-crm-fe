import { useState, useEffect } from "react";
import api from "../api/client";
import { Plus, Pencil, Trash2, Clock, CalendarDays } from "lucide-react";
import { useTranslation } from "react-i18next";

interface User {
    id: number;
    email: string;
    full_name: string;
    is_active: boolean;
    role: string;
    commission_pct: number;
    created_at: string | null;
    updated_at: string | null;
    last_login: string | null;
}

function formatDate(iso: string | null): string {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function timeAgo(iso: string | null): string {
    if (!iso) return 'Nunca';
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'Ahora';
    if (mins < 60) return `hace ${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `hace ${hrs}h`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `hace ${days}d`;
    return formatDate(iso);
}

const DEFAULT_ROLE_COLORS: Record<string, string> = {
    admin: 'bg-purple-100 text-purple-800',
    user: 'bg-blue-100 text-blue-800',
    empleado: 'bg-teal-100 text-teal-800',
    vendedor: 'bg-green-100 text-green-800',
};
const FALLBACK_COLORS = [
    'bg-indigo-100 text-indigo-800', 'bg-pink-100 text-pink-800',
    'bg-cyan-100 text-cyan-800', 'bg-amber-100 text-amber-800',
    'bg-rose-100 text-rose-800', 'bg-emerald-100 text-emerald-800',
];

const parseRoles = (role: string): string[] => role ? role.split(',').map(r => r.trim()).filter(Boolean) : ['user'];

export default function Users() {
    const { t } = useTranslation();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);

    // Form State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUserId, setEditingUserId] = useState<number | null>(null);
    const [formData, setFormData] = useState({
        email: "",
        full_name: "",
        password: "",
        role: "user",
        commission_pct: 0,
    });
    const [allRoles, setAllRoles] = useState<{ value: string; label: string; color: string }[]>([]);

    const roleBadgeColor = (r: string) => allRoles.find(ar => ar.value === r)?.color || DEFAULT_ROLE_COLORS[r] || 'bg-gray-100 text-gray-700';
    const roleLabel = (r: string) => allRoles.find(ar => ar.value === r)?.label || r;

    useEffect(() => {
        fetchUsers();
        fetchRoles();
    }, []);

    const fetchRoles = async () => {
        try {
            const { data } = await api.get('/role-configs/');
            const fetched = (data || []).map((rc: any, i: number) => ({
                value: rc.role_name,
                label: rc.display_name || rc.role_name,
                color: DEFAULT_ROLE_COLORS[rc.role_name] || FALLBACK_COLORS[i % FALLBACK_COLORS.length],
            }));
            // Ensure at least admin + user exist
            const roleNames = fetched.map((r: any) => r.value);
            if (!roleNames.includes('admin')) fetched.unshift({ value: 'admin', label: 'Administrador', color: DEFAULT_ROLE_COLORS.admin });
            if (!roleNames.includes('user')) fetched.splice(1, 0, { value: 'user', label: 'Usuario', color: DEFAULT_ROLE_COLORS.user });
            setAllRoles(fetched);
        } catch {
            // Fallback to defaults
            setAllRoles([
                { value: 'admin', label: 'Administrador', color: DEFAULT_ROLE_COLORS.admin },
                { value: 'user', label: 'Usuario', color: DEFAULT_ROLE_COLORS.user },
                { value: 'empleado', label: 'Empleado', color: DEFAULT_ROLE_COLORS.empleado },
                { value: 'vendedor', label: 'Vendedor', color: DEFAULT_ROLE_COLORS.vendedor },
            ]);
        }
    };

    const fetchUsers = async () => {
        try {
            const response = await api.get("/users/");
            setUsers(response.data);
        } catch (error) {
            console.error("Failed to fetch users", error);
        } finally {
            setLoading(false);
        }
    };

    const openAddModal = () => {
        setEditingUserId(null);
        setFormData({ email: "", full_name: "", password: "", role: "user,empleado", commission_pct: 0 });
        setIsModalOpen(true);
    };

    const openEditModal = (user: User) => {
        setEditingUserId(user.id);
        setFormData({ email: user.email, full_name: user.full_name, password: "", role: user.role, commission_pct: user.commission_pct || 0 });
        setIsModalOpen(true);
    };

    const handleDelete = async (id: number) => {
        if (confirm("Are you sure you want to delete this user?")) {
            try {
                await api.delete(`/users/${id}`);
                fetchUsers();
            } catch (error) {
                console.error("Delete failed", error);
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingUserId) {
                // Exclude password if empty when updating
                const { password, ...rest } = formData;
                const updateData = password ? formData : rest;
                await api.put(`/users/${editingUserId}`, updateData);
            } else {
                await api.post("/users/", formData);
            }
            setIsModalOpen(false);
            fetchUsers();
        } catch (error) {
            console.error("Submit failed", error);
            alert("An error occurred while saving the user.");
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100 gap-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-gray-900">{t('users.title')}</h2>
                    <p className="text-sm text-gray-500">{t('users.description')}</p>
                </div>
                <button
                    onClick={openAddModal}
                    className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm"
                >
                    <Plus size={18} />
                    <span>{t('users.addBtn')}</span>
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center text-gray-500">{t('users.loading')}</div>
                ) : (
                    <div>
                        {/* Desktop Table View */}
                        <div className="hidden md:block overflow-x-auto w-full">
                            <table className="w-full text-left border-collapse min-w-[800px]">
                                <thead>
                                    <tr className="bg-gray-50 border-b border-gray-100">
                                        <th className="p-4 font-semibold text-gray-600 text-sm">{t('users.table.name')}</th>
                                        <th className="p-4 font-semibold text-gray-600 text-sm">{t('users.table.email')}</th>
                                        <th className="p-4 font-semibold text-gray-600 text-sm">{t('users.table.role')}</th>
                                        <th className="p-4 font-semibold text-gray-600 text-sm">{t('common.status')}</th>
                                        <th className="p-4 font-semibold text-gray-600 text-sm">Última Conexión</th>
                                        <th className="p-4 font-semibold text-gray-600 text-sm">Creado</th>
                                        <th className="p-4 font-semibold text-gray-600 text-sm">Modificado</th>
                                        <th className="p-4 font-semibold text-gray-600 text-sm text-right">{t('common.actions')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.map((user) => (
                                        <tr key={user.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                                            <td className="p-4 font-medium text-gray-900">{user.full_name}</td>
                                            <td className="p-4 text-gray-600">{user.email}</td>
                                            <td className="p-4">
                                                <div className="flex flex-wrap gap-1">
                                                    {parseRoles(user.role).map(r => (
                                                        <span key={r} className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${roleBadgeColor(r)}`}>
                                                            {roleLabel(r)}
                                                        </span>
                                                    ))}
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                {user.is_active ? (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                        {t('common.active')}
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                                        {t('common.inactive')}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="p-4">
                                                <div className="flex items-center gap-1.5">
                                                    <Clock size={12} className={user.last_login ? 'text-green-500' : 'text-gray-300'} />
                                                    <span className={`text-xs font-medium ${user.last_login ? 'text-gray-700' : 'text-gray-400'}`}>
                                                        {timeAgo(user.last_login)}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="p-4 text-xs text-gray-500">{formatDate(user.created_at)}</td>
                                            <td className="p-4 text-xs text-gray-500">{formatDate(user.updated_at)}</td>
                                            <td className="p-4 flex justify-end space-x-2">
                                                <button
                                                    onClick={() => openEditModal(user)}
                                                    className="p-1.5 text-gray-400 hover:text-blue-600 transition-colors bg-white hover:bg-blue-50 rounded-lg shadow-sm border border-transparent hover:border-blue-100"
                                                    title={t('common.edit')}
                                                >
                                                    <Pencil size={18} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(user.id)}
                                                    className="p-1.5 text-gray-400 hover:text-red-600 transition-colors bg-white hover:bg-red-50 rounded-lg shadow-sm border border-transparent hover:border-red-100"
                                                    title={t('common.delete')}
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {users.length === 0 && (
                                        <tr>
                                            <td colSpan={8} className="p-8 text-center text-gray-500">
                                                {t('users.empty')}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile Card View */}
                        <div className="md:hidden grid grid-cols-1 gap-4 p-4 bg-gray-50">
                            {users.map((user) => (
                                <div key={user.id} className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex flex-col space-y-4">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="font-bold text-gray-900 text-lg leading-tight">{user.full_name}</h3>
                                            <p className="text-sm text-gray-500 mt-1">{user.email}</p>
                                            <div className="flex gap-3 mt-1 text-[10px] text-gray-400">
                                                <span className="flex items-center gap-1"><Clock size={10} /> {timeAgo(user.last_login)}</span>
                                                <span className="flex items-center gap-1"><CalendarDays size={10} /> {formatDate(user.created_at)}</span>
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap gap-1 ml-2 shrink-0">
                                            {parseRoles(user.role).map(r => (
                                                <span key={r} className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${roleBadgeColor(r)}`}>
                                                    {roleLabel(r)}
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="flex justify-between items-center border-t border-gray-50 pt-4 mt-auto">
                                        <div>
                                            {user.is_active ? (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                    {t('common.active')}
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                                    {t('common.inactive')}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex space-x-2">
                                            <button
                                                onClick={() => openEditModal(user)}
                                                className="p-2 text-gray-500 hover:text-blue-600 transition-colors bg-gray-50 hover:bg-blue-50 rounded-lg"
                                                title={t('common.edit')}
                                            >
                                                <Pencil size={18} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(user.id)}
                                                className="p-2 text-gray-500 hover:text-red-600 transition-colors bg-gray-50 hover:bg-red-50 rounded-lg"
                                                title={t('common.delete')}
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {users.length === 0 && (
                                <div className="p-8 text-center text-gray-500 bg-white rounded-xl border border-dashed border-gray-300">
                                    {t('users.empty')}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
                        {/* Gradient Header */}
                        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-5 text-white flex-shrink-0">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                    <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                                        <Plus size={22} />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-bold">{editingUserId ? t('users.modal.editTitle') : t('users.modal.addTitle')}</h2>
                                        <p className="text-blue-100 text-sm">Gestión de accesos y roles del sistema</p>
                                    </div>
                                </div>
                                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
                                    <span className="text-xl leading-none">×</span>
                                </button>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 p-6 space-y-6">
                            {/* Credenciales */}
                            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 space-y-4">
                                <h4 className="text-xs font-semibold text-indigo-700 uppercase tracking-wide">👤 Credenciales</h4>
                                <div>
                                    <label className="block text-xs text-gray-600 mb-1">{t('users.modal.name')} *</label>
                                    <input type="text" required value={formData.full_name} onChange={(e) => setFormData({ ...formData, full_name: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 bg-white" placeholder="John Doe" />
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-600 mb-1">{t('users.modal.email')} *</label>
                                    <input type="email" required value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 bg-white" placeholder="john@example.com" />
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-600 mb-1">{editingUserId ? t('users.modal.passwordHint') : t('users.modal.password')}</label>
                                    <input type="password" required={!editingUserId} value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 bg-white" placeholder="••••••••" />
                                </div>
                            </div>

                            {/* Roles */}
                            <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-4">
                                <h4 className="text-xs font-semibold text-green-700 uppercase tracking-wide">🔑 Roles (múltiples)</h4>
                                <div className="grid grid-cols-2 gap-2">
                                    {allRoles.map(r => {
                                        const currentRoles = parseRoles(formData.role);
                                        const isChecked = currentRoles.includes(r.value);
                                        return (
                                            <label key={r.value} className={`flex items-center gap-2.5 p-3 rounded-lg border cursor-pointer transition-all ${isChecked ? 'bg-white border-green-300 shadow-sm' : 'bg-green-50/50 border-green-100 hover:border-green-200'}`}>
                                                <input type="checkbox" checked={isChecked}
                                                    className="rounded text-green-600 focus:ring-green-500"
                                                    onChange={() => {
                                                        let newRoles: string[];
                                                        if (isChecked) {
                                                            newRoles = currentRoles.filter(cr => cr !== r.value);
                                                            if (newRoles.length === 0) newRoles = ['user'];
                                                        } else {
                                                            newRoles = [...currentRoles, r.value];
                                                        }
                                                        setFormData({ ...formData, role: newRoles.join(',') });
                                                    }}
                                                />
                                                <div>
                                                    <p className="text-sm font-bold text-gray-800">{r.label}</p>
                                                    <span className={`inline-block mt-0.5 px-1.5 py-0 rounded text-[10px] font-medium ${r.color}`}>{r.value}</span>
                                                </div>
                                            </label>
                                        );
                                    })}
                                </div>

                                {parseRoles(formData.role).includes('vendedor') && (
                                    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 space-y-2">
                                        <label className="block text-xs text-gray-600 mb-1">Comisión por defecto (%)</label>
                                        <input type="number" min="0" max="100" step="0.5" value={formData.commission_pct} onChange={(e) => setFormData({ ...formData, commission_pct: Number(e.target.value) })} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 bg-white" placeholder="Ej: 10" />
                                        <p className="text-[10px] text-gray-400">Se usará como comisión sugerida al crear presupuestos</p>
                                    </div>
                                )}
                            </div>
                        </form>

                        {/* Footer */}
                        <div className="p-5 border-t border-gray-100 flex justify-between items-center flex-shrink-0 bg-gray-50">
                            <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2.5 text-gray-600 hover:text-gray-900 text-sm font-medium">{t('common.cancel')}</button>
                            <button onClick={handleSubmit} className="flex items-center px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-medium hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-200 transition-all">
                                {t('users.modal.saveBtn')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
