import { useState, useEffect } from "react";
import api from "../api/client";
import { Plus, Pencil, Trash2, Mail, Phone, Building2, User, Globe, X, ArrowRightLeft, List, LayoutGrid, GripVertical, MapPin, MessageSquare } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

interface Lead {
    id: number;
    company_name: string;
    contact_name: string | null;
    email: string | null;
    phone: string | null;
    status: string;
    source: string | null;
    website: string | null;
    address: string | null;
    city: string | null;
    province: string | null;
    country: string | null;
    notes: string | null;
    created_at: string;
}

export default function Leads() {
    const { t } = useTranslation();
    const [leads, setLeads] = useState<Lead[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<'list' | 'kanban'>('kanban');
    const [draggedLeadId, setDraggedLeadId] = useState<number | null>(null);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingLeadId, setEditingLeadId] = useState<number | null>(null);
    const [formData, setFormData] = useState({
        company_name: "",
        contact_name: "",
        email: "",
        phone: "",
        status: "New",
        source: "",
        website: "",
        address: "",
        city: "",
        province: "",
        country: "Argentina",
        notes: "",
    });

    useEffect(() => {
        fetchLeads();
    }, []);

    const fetchLeads = async () => {
        try {
            const response = await api.get("/leads/");
            setLeads(response.data);
        } catch (error) {
            console.error("Failed to fetch leads", error);
        } finally {
            setLoading(false);
        }
    };

    const openAddModal = () => {
        setEditingLeadId(null);
        setFormData({ company_name: "", contact_name: "", email: "", phone: "", status: "New", source: "", website: "", address: "", city: "", province: "", country: "Argentina", notes: "" });
        setIsModalOpen(true);
    };

    const openEditModal = (lead: Lead) => {
        setEditingLeadId(lead.id);
        setFormData({
            company_name: lead.company_name,
            contact_name: lead.contact_name || "",
            email: lead.email || "",
            phone: lead.phone || "",
            status: lead.status || "New",
            source: lead.source || "",
            website: lead.website || "",
            address: lead.address || "",
            city: lead.city || "",
            province: lead.province || "",
            country: lead.country || "Argentina",
            notes: lead.notes || "",
        });
        setIsModalOpen(true);
    };

    const handleDelete = async (id: number) => {
        if (confirm("Are you sure you want to delete this lead?")) {
            try {
                await api.delete(`/leads/${id}`);
                fetchLeads();
            } catch (error) {
                console.error("Delete failed", error);
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingLeadId) {
                await api.put(`/leads/${editingLeadId}`, formData);
            } else {
                await api.post("/leads/", formData);
            }
            setIsModalOpen(false);
            fetchLeads();
        } catch (error) {
            console.error("Submit failed", error);
            alert("An error occurred while saving the lead.");
        }
    };

    const handleConvertToClient = async (lead: Lead) => {
        if (!confirm(`¿Convertir el prospecto "${lead.company_name}" en cuenta? Se copiarán todos los datos y los presupuestos vinculados se reasignarán automáticamente.`)) return;
        try {
            const res = await api.post(`/leads/${lead.id}/convert-to-client`);
            alert(`✅ ${res.data.message}`);
            fetchLeads();
        } catch (error: any) {
            console.error("Convert failed", error);
            alert(error.response?.data?.detail || "Error al convertir el prospecto.");
        }
    };

    const handleStatusChange = async (leadId: number, newStatus: string) => {
        try {
            const lead = leads.find(l => l.id === leadId);
            if (!lead || lead.status === newStatus) return;
            await api.put(`/leads/${leadId}`, { ...lead, status: newStatus });
            setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: newStatus } : l));
        } catch (error) {
            console.error('Failed to update lead status', error);
        }
    };

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'New': return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'Contacted': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'Qualified': return 'bg-purple-100 text-purple-800 border-purple-200';
            case 'Converted': return 'bg-green-100 text-green-800 border-green-200';
            case 'Lost': return 'bg-gray-100 text-gray-800 border-gray-200';
            default: return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    const kanbanColumns = [
        { status: 'New', label: 'Nuevo', icon: '🆕', gradient: 'from-blue-500 to-cyan-600', bg: 'bg-blue-50', border: 'border-blue-200' },
        { status: 'Contacted', label: 'Contactado', icon: '📞', gradient: 'from-amber-500 to-yellow-600', bg: 'bg-amber-50', border: 'border-amber-200' },
        { status: 'Qualified', label: 'Calificado', icon: '⭐', gradient: 'from-purple-500 to-violet-600', bg: 'bg-purple-50', border: 'border-purple-200' },
        { status: 'Proposal', label: 'Propuesta', icon: '📝', gradient: 'from-indigo-500 to-blue-600', bg: 'bg-indigo-50', border: 'border-indigo-200' },
        { status: 'Converted', label: 'Convertido', icon: '✅', gradient: 'from-emerald-500 to-green-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
        { status: 'Lost', label: 'Perdido', icon: '❌', gradient: 'from-red-500 to-rose-600', bg: 'bg-red-50', border: 'border-red-200' },
    ];

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100 gap-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-gray-900">{t('leads.title')}</h2>
                    <p className="text-sm text-gray-500">{t('leads.description')}</p>
                </div>
                <div className="flex items-center gap-3">
                    {/* View Toggle */}
                    <div className="flex bg-gray-100 p-1 rounded-lg border border-gray-200">
                        <button
                            onClick={() => setViewMode('list')}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${viewMode === 'list' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            <List size={16} />
                            Lista
                        </button>
                        <button
                            onClick={() => setViewMode('kanban')}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${viewMode === 'kanban' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            <LayoutGrid size={16} />
                            Kanban
                        </button>
                    </div>
                    <button
                        onClick={openAddModal}
                        className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm"
                    >
                        <Plus size={18} />
                        <span>{t('leads.addBtn')}</span>
                    </button>
                </div>
            </div>

            {/* ══════ KANBAN VIEW ══════ */}
            {viewMode === 'kanban' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                    {kanbanColumns.map(col => {
                        const columnLeads = leads.filter(l => l.status === col.status);
                        return (
                            <div
                                key={col.status}
                                className={`rounded-2xl border-2 ${col.border} ${col.bg} min-h-[400px] flex flex-col transition-all duration-200`}
                                onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('ring-2', 'ring-offset-2', 'ring-blue-400', 'scale-[1.01]'); }}
                                onDragLeave={(e) => { e.currentTarget.classList.remove('ring-2', 'ring-offset-2', 'ring-blue-400', 'scale-[1.01]'); }}
                                onDrop={(e) => {
                                    e.preventDefault();
                                    e.currentTarget.classList.remove('ring-2', 'ring-offset-2', 'ring-blue-400', 'scale-[1.01]');
                                    if (draggedLeadId !== null) {
                                        handleStatusChange(draggedLeadId, col.status);
                                        setDraggedLeadId(null);
                                    }
                                }}
                            >
                                {/* Column header */}
                                <div className={`px-3 py-2.5 bg-gradient-to-r ${col.gradient} rounded-t-xl`}>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-base">{col.icon}</span>
                                            <h3 className="font-bold text-white text-xs">{col.label}</h3>
                                        </div>
                                        <span className="bg-white/20 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                                            {columnLeads.length}
                                        </span>
                                    </div>
                                </div>

                                {/* Column body - cards */}
                                <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[calc(100vh-300px)]">
                                    {columnLeads.length === 0 && (
                                        <div className="flex flex-col items-center justify-center py-6 text-gray-400">
                                            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mb-1.5">
                                                <Building2 size={18} className="text-gray-300" />
                                            </div>
                                            <p className="text-[10px]">Sin prospectos</p>
                                            <p className="text-[9px] mt-0.5">Arrastrá aquí</p>
                                        </div>
                                    )}
                                    {columnLeads.map(lead => (
                                        <div
                                            key={lead.id}
                                            draggable
                                            onDragStart={() => setDraggedLeadId(lead.id)}
                                            onDragEnd={() => setDraggedLeadId(null)}
                                            className={`bg-white rounded-xl border border-gray-100 shadow-sm p-3 cursor-grab active:cursor-grabbing hover:shadow-md transition-all duration-200 group ${draggedLeadId === lead.id ? 'opacity-50 scale-95 rotate-1' : ''
                                                }`}
                                        >
                                            {/* Header */}
                                            <div className="flex items-start justify-between mb-2">
                                                <div className="flex items-center gap-1.5 min-w-0">
                                                    <GripVertical size={12} className="text-gray-300 group-hover:text-gray-400 flex-shrink-0" />
                                                    <Link to={`/leads/${lead.id}`} className="font-bold text-gray-900 text-xs leading-tight truncate hover:text-blue-600">
                                                        {lead.company_name}
                                                    </Link>
                                                </div>
                                            </div>

                                            {/* Contact info */}
                                            <div className="space-y-1 mb-2">
                                                {lead.contact_name && (
                                                    <div className="flex items-center gap-1.5 text-[10px] text-gray-600">
                                                        <User size={10} className="text-gray-400 flex-shrink-0" />
                                                        <span className="truncate font-medium">{lead.contact_name}</span>
                                                    </div>
                                                )}
                                                {lead.email && (
                                                    <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
                                                        <Mail size={10} className="text-gray-400 flex-shrink-0" />
                                                        <span className="truncate">{lead.email}</span>
                                                    </div>
                                                )}
                                                {lead.phone && (
                                                    <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
                                                        <Phone size={10} className="text-gray-400 flex-shrink-0" />
                                                        <span>{lead.phone}</span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Meta tags */}
                                            <div className="flex flex-wrap gap-1 mb-2">
                                                {lead.source && (
                                                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-gray-100 text-[9px] text-gray-600 font-medium">
                                                        📡 {lead.source}
                                                    </span>
                                                )}
                                                {lead.province && (
                                                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-gray-100 text-[9px] text-gray-600 font-medium">
                                                        <MapPin size={8} /> {lead.province}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Notes preview */}
                                            {lead.notes && (
                                                <div className="bg-gray-50 rounded-lg px-2 py-1.5 mb-2">
                                                    <p className="text-[10px] text-gray-500 line-clamp-2 leading-relaxed">
                                                        <MessageSquare size={9} className="inline mr-1 text-gray-400" />
                                                        {lead.notes}
                                                    </p>
                                                </div>
                                            )}

                                            {/* Actions */}
                                            <div className="flex items-center justify-between pt-1.5 border-t border-gray-50">
                                                <span className="text-[9px] text-gray-400">
                                                    {new Date(lead.created_at).toLocaleDateString('es-AR')}
                                                </span>
                                                <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    {lead.status !== 'Converted' && (
                                                        <button onClick={(e) => { e.stopPropagation(); handleConvertToClient(lead); }} className="p-1 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded" title="Convertir">
                                                            <ArrowRightLeft size={12} />
                                                        </button>
                                                    )}
                                                    <button onClick={(e) => { e.stopPropagation(); openEditModal(lead); }} className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded" title="Editar">
                                                        <Pencil size={12} />
                                                    </button>
                                                    <button onClick={(e) => { e.stopPropagation(); handleDelete(lead.id); }} className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded" title="Eliminar">
                                                        <Trash2 size={12} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ══════ LIST VIEW ══════ */}
            {viewMode === 'list' && <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center text-gray-500">{t('clients.loading')}</div>
                ) : (
                    <div>
                        {/* Desktop Table View */}
                        <div className="hidden md:block overflow-x-auto w-full">
                            <table className="w-full text-left border-collapse min-w-[800px]">
                                <thead>
                                    <tr className="bg-gray-50 border-b border-gray-100">
                                        <th className="p-4 font-semibold text-gray-600 text-sm">{t('leads.table.company')}</th>
                                        <th className="p-4 font-semibold text-gray-600 text-sm">{t('leads.table.contact')}</th>
                                        <th className="p-4 font-semibold text-gray-600 text-sm w-32">{t('common.status')}</th>
                                        <th className="p-4 font-semibold text-gray-600 text-sm">{t('leads.table.source')}</th>
                                        <th className="p-4 font-semibold text-gray-600 text-sm">{t('common.website')}</th>
                                        <th className="p-4 font-semibold text-gray-600 text-sm">{t('clients.modal.province')}</th>
                                        <th className="p-4 font-semibold text-gray-600 text-sm text-right">{t('common.actions')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {leads.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="p-8 text-center text-gray-500">
                                                {t('leads.empty')}
                                            </td>
                                        </tr>
                                    ) : leads.map((lead) => (
                                        <tr key={lead.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                                            <td className="p-4">
                                                <div className="font-medium text-gray-900 flex items-center">
                                                    <Building2 size={16} className="mr-2 text-gray-400" />
                                                    <Link to={`/leads/${lead.id}`} className="hover:text-blue-600 hover:underline transition-colors">{lead.company_name}</Link>
                                                </div>
                                            </td>
                                            <td className="p-4 space-y-1">
                                                {lead.contact_name && (
                                                    <div className="flex items-center text-sm text-gray-800 font-medium">
                                                        <User size={14} className="mr-2 text-gray-500" />
                                                        {lead.contact_name}
                                                    </div>
                                                )}
                                                {lead.email && (
                                                    <div className="flex items-center text-sm text-gray-500">
                                                        <Mail size={14} className="mr-2 text-gray-400" />
                                                        <a href={`mailto:${lead.email}`} className="hover:underline">{lead.email}</a>
                                                    </div>
                                                )}
                                                {lead.phone && (
                                                    <div className="flex items-center text-sm text-gray-500">
                                                        <Phone size={14} className="mr-2 text-gray-400" />
                                                        <a href={`tel:${lead.phone}`} className="hover:underline">{lead.phone}</a>
                                                    </div>
                                                )}
                                            </td>
                                            <td className="p-4">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${getStatusStyle(lead.status)}`}>
                                                    {t(`leads.status.${lead.status.toLowerCase()}`)}
                                                </span>
                                            </td>
                                            <td className="p-4 text-sm text-gray-600">
                                                {lead.source || '-'}
                                            </td>
                                            <td className="p-4 text-sm">
                                                {lead.website ? (
                                                    <a href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline truncate block max-w-[200px]">{lead.website.replace(/^https?:\/\//, '')}</a>
                                                ) : '-'}
                                            </td>
                                            <td className="p-4 text-sm text-gray-600">
                                                {lead.province || '-'}
                                            </td>
                                            <td className="p-4 text-right">
                                                <div className="flex justify-end gap-1">
                                                    {lead.status !== 'Converted' && (
                                                        <button onClick={() => handleConvertToClient(lead)} className="p-2 text-gray-400 hover:text-green-600 transition-colors" title="Convertir en Cuenta">
                                                            <ArrowRightLeft size={18} />
                                                        </button>
                                                    )}
                                                    <button onClick={() => openEditModal(lead)} className="p-2 text-gray-400 hover:text-blue-600 transition-colors" title={t('common.edit')}>
                                                        <Pencil size={18} />
                                                    </button>
                                                    <button onClick={() => handleDelete(lead.id)} className="p-2 text-gray-400 hover:text-red-600 transition-colors" title={t('common.delete')}>
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile Card View */}
                        <div className="md:hidden grid grid-cols-1 gap-4 p-4 bg-gray-50">
                            {leads.length === 0 ? (
                                <div className="p-8 text-center text-gray-500 bg-white rounded-xl border border-dashed border-gray-300">
                                    {t('leads.empty')}
                                </div>
                            ) : leads.map((lead) => (
                                <div key={lead.id} className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex flex-col space-y-3">
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center">
                                            <Building2 size={18} className="mr-2 text-gray-400" />
                                            <Link to={`/leads/${lead.id}`} className="font-bold text-gray-900 text-lg hover:text-blue-600 hover:underline transition-colors">{lead.company_name}</Link>
                                        </div>
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border shrink-0 ml-2 ${getStatusStyle(lead.status)}`}>
                                            {t(`leads.status.${lead.status.toLowerCase()}`)}
                                        </span>
                                    </div>
                                    <div className="space-y-2 text-sm">
                                        {lead.contact_name && (
                                            <div className="flex items-center text-gray-800 font-medium">
                                                <User size={14} className="mr-2 text-gray-500 shrink-0" />
                                                {lead.contact_name}
                                            </div>
                                        )}
                                        {lead.email && (
                                            <div className="flex items-center text-gray-500">
                                                <Mail size={14} className="mr-2 text-gray-400 shrink-0" />
                                                <a href={`mailto:${lead.email}`} className="hover:underline truncate">{lead.email}</a>
                                            </div>
                                        )}
                                        {lead.phone && (
                                            <div className="flex items-center text-gray-500">
                                                <Phone size={14} className="mr-2 text-gray-400 shrink-0" />
                                                <a href={`tel:${lead.phone}`} className="hover:underline">{lead.phone}</a>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {lead.source && (
                                            <div className="bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
                                                <p className="text-[10px] text-gray-500">{t('leads.table.source')}</p>
                                                <p className="text-sm font-medium text-gray-700">{lead.source}</p>
                                            </div>
                                        )}
                                        {lead.website && (
                                            <div className="bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
                                                <p className="text-[10px] text-gray-500">{t('common.website')}</p>
                                                <a href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`} target="_blank" rel="noreferrer" className="text-sm text-blue-600 hover:underline">{lead.website.replace(/^https?:\/\//, '')}</a>
                                            </div>
                                        )}
                                        {lead.province && (
                                            <div className="bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
                                                <p className="text-[10px] text-gray-500">{t('clients.modal.province')}</p>
                                                <p className="text-sm font-medium text-gray-700">{lead.province}</p>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex justify-end space-x-2 border-t border-gray-50 pt-3">
                                        {lead.status !== 'Converted' && (
                                            <button
                                                onClick={() => handleConvertToClient(lead)}
                                                className="p-2 text-gray-500 hover:text-green-600 transition-colors bg-gray-50 hover:bg-green-50 rounded-lg"
                                                title="Convertir en Cuenta"
                                            >
                                                <ArrowRightLeft size={18} />
                                            </button>
                                        )}
                                        <button
                                            onClick={() => openEditModal(lead)}
                                            className="p-2 text-gray-500 hover:text-blue-600 transition-colors bg-gray-50 hover:bg-blue-50 rounded-lg"
                                            title={t('common.edit')}
                                        >
                                            <Pencil size={18} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(lead.id)}
                                            className="p-2 text-gray-500 hover:text-red-600 transition-colors bg-gray-50 hover:bg-red-50 rounded-lg"
                                            title={t('common.delete')}
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>}

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden max-h-[90vh] overflow-y-auto flex flex-col">
                        <div className="px-6 py-4 bg-gradient-to-r from-blue-600 to-purple-600 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center"><Building2 size={20} className="text-white" /></div>
                                <div>
                                    <h3 className="text-lg font-bold text-white">
                                        {editingLeadId ? t('leads.modal.editTitle') : t('leads.modal.addTitle')}
                                    </h3>
                                    <p className="text-blue-100 text-xs">Complete los datos del prospecto</p>
                                </div>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors">
                                <X size={18} className="text-white" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">{t('leads.modal.company')}</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.company_name}
                                    onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">{t('leads.modal.contact')}</label>
                                <input
                                    type="text"
                                    value={formData.contact_name}
                                    onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('common.email')}</label>
                                    <input
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('common.phone')}</label>
                                    <input
                                        type="tel"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('common.status')}</label>
                                    <select
                                        value={formData.status}
                                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                        className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                    >
                                        <option value="New">{t('leads.status.new')}</option>
                                        <option value="Contacted">{t('leads.status.contacted')}</option>
                                        <option value="Qualified">{t('leads.status.qualified')}</option>
                                        <option value="Converted">{t('leads.status.converted')}</option>
                                        <option value="Lost">{t('leads.status.lost')}</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('leads.table.source')}</label>
                                    <input
                                        type="text"
                                        placeholder={t('leads.modal.sourcePlaceholder')}
                                        value={formData.source}
                                        onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                                        className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">{t('common.website')}</label>
                                <div className="relative">
                                    <Globe size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input
                                        type="url"
                                        placeholder="https://www.example.com"
                                        value={formData.website}
                                        onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                                        className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                    />
                                </div>
                            </div>

                            {/* Address Section */}
                            <div className="border-t border-gray-100 pt-4 mt-2">
                                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">{t('clients.profile.sectionLocation')}</p>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('common.address')}</label>
                                    <input
                                        type="text"
                                        value={formData.address}
                                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                        className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                    />
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-3">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">{t('clients.modal.city')}</label>
                                        <input
                                            type="text"
                                            value={formData.city}
                                            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                            className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">{t('clients.modal.province')}</label>
                                        <input
                                            type="text"
                                            value={formData.province}
                                            onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                                            className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">{t('clients.modal.country')}</label>
                                        <input
                                            type="text"
                                            value={formData.country}
                                            onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                                            className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                        />
                                    </div>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">{t('leads.modal.notes')}</label>
                                <textarea
                                    rows={3}
                                    value={formData.notes}
                                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                />
                            </div>

                            <div className="pt-4 flex justify-end space-x-3">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium transition-colors"
                                >
                                    {t('common.cancel')}
                                </button>
                                <button
                                    type="submit"
                                    className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg font-medium shadow-sm transition-all"
                                >
                                    {t('leads.modal.saveBtn')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
