import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/client";
import { Plus, Pencil, Trash2, Mail, Phone, Briefcase, Building2, Zap, Truck, CalendarPlus } from "lucide-react";
import { useTranslation } from "react-i18next";

interface Contact {
    id: number;
    name: string;
    email: string;
    phone: string;
    position: string;
    client_id: number | null;
    provider_id: number | null;
    lead_id: number | null;
}

interface Client {
    id: number;
    name: string;
}

interface Provider {
    id: number;
    name: string;
}

interface Lead {
    id: number;
    company_name: string;
}

export default function Contacts() {
    const { t } = useTranslation();
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [providers, setProviders] = useState<Provider[]>([]);
    const [leads, setLeads] = useState<Lead[]>([]);
    const [loading, setLoading] = useState(true);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingContactId, setEditingContactId] = useState<number | null>(null);
    const [contactEntityType, setContactEntityType] = useState<"account" | "lead" | "provider">("account");
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        phone: "",
        position: "",
        client_id: "" as string | number,
        provider_id: "" as string | number,
        lead_id: "" as string | number,
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [contRes, clipRes, provRes, leadsRes] = await Promise.all([
                api.get("/contacts/"),
                api.get("/clients/"),
                api.get("/providers/"),
                api.get("/leads/"),
            ]);
            setContacts(contRes.data);
            setClients(clipRes.data);
            setProviders(provRes.data);
            setLeads(leadsRes.data);
        } catch (error) {
            console.error("Failed to fetch data", error);
        } finally {
            setLoading(false);
        }
    };

    const openAddModal = () => {
        setEditingContactId(null);
        setFormData({ name: "", email: "", phone: "", position: "", client_id: "", provider_id: "", lead_id: "" });
        setContactEntityType("account");
        setIsModalOpen(true);
    };

    const openEditModal = (contact: Contact) => {
        setEditingContactId(contact.id);
        setFormData({
            name: contact.name,
            email: contact.email || "",
            phone: contact.phone || "",
            position: contact.position || "",
            client_id: contact.client_id || "",
            provider_id: contact.provider_id || "",
            lead_id: contact.lead_id || "",
        });
        setContactEntityType(contact.lead_id ? "lead" : contact.provider_id ? "provider" : "account");
        setIsModalOpen(true);
    };

    const handleDelete = async (id: number) => {
        if (confirm("Are you sure you want to delete this contact?")) {
            try {
                await api.delete(`/contacts/${id}`);
                fetchData();
            } catch (error) {
                console.error("Delete failed", error);
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const payload = {
                ...formData,
                client_id: formData.client_id ? Number(formData.client_id) : null,
                provider_id: formData.provider_id ? Number(formData.provider_id) : null,
                lead_id: formData.lead_id ? Number(formData.lead_id) : null,
            };

            if (editingContactId) {
                await api.put(`/contacts/${editingContactId}`, payload);
            } else {
                await api.post("/contacts/", payload);
            }
            setIsModalOpen(false);
            fetchData();
        } catch (error) {
            console.error("Submit failed", error);
            alert("An error occurred while saving the contact.");
        }
    };

    const getClientName = (id: number | null) => {
        if (!id) return "-";
        return clients.find((c) => c.id === id)?.name || "Unknown";
    };

    const getProviderName = (id: number | null) => {
        if (!id) return "-";
        return providers.find((p) => p.id === id)?.name || "Unknown";
    };

    const getLeadName = (id: number | null) => {
        if (!id) return "-";
        return leads.find((l) => l.id === id)?.company_name || "Unknown";
    };

    const navigate = useNavigate();

    const getEntityInfo = (contact: Contact) => {
        if (contact.lead_id) {
            return { type: t('calendar.modal.entityLead'), name: getLeadName(contact.lead_id), color: 'bg-purple-50 text-purple-700', icon: Zap, link: `/leads/${contact.lead_id}` };
        }
        if (contact.provider_id) {
            return { type: t('contacts.modal.assocProvider'), name: getProviderName(contact.provider_id), color: 'bg-amber-50 text-amber-700', icon: Truck, link: `/providers` };
        }
        if (contact.client_id) {
            return { type: t('calendar.modal.entityAccount'), name: getClientName(contact.client_id), color: 'bg-blue-50 text-blue-700', icon: Building2, link: `/clients/${contact.client_id}` };
        }
        return null;
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100 gap-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-gray-900">{t('contacts.title')}</h2>
                    <p className="text-sm text-gray-500">{t('contacts.description')}</p>
                </div>
                <button
                    onClick={openAddModal}
                    className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm"
                >
                    <Plus size={18} />
                    <span>{t('contacts.addBtn')}</span>
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center text-gray-500">{t('contacts.loading')}</div>
                ) : (
                    <div>
                        {/* Desktop Table View */}
                        <div className="hidden md:block overflow-x-auto w-full">
                            <table className="w-full text-left border-collapse min-w-[800px]">
                                <thead>
                                    <tr className="bg-gray-50 border-b border-gray-100">
                                        <th className="p-4 font-semibold text-gray-600 text-sm">{t('contacts.table.name')}</th>
                                        <th className="p-4 font-semibold text-gray-600 text-sm">{t('contacts.table.contactDetails')}</th>
                                        <th className="p-4 font-semibold text-gray-600 text-sm">{t('contacts.table.type')}</th>
                                        <th className="p-4 font-semibold text-gray-600 text-sm">{t('contacts.table.company')}</th>
                                        <th className="p-4 font-semibold text-gray-600 text-sm text-right">{t('common.actions')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {contacts.map((contact) => (
                                        <tr key={contact.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                                            <td className="p-4">
                                                <div className="font-medium text-gray-900">{contact.name}</div>
                                                {contact.position && (
                                                    <div className="flex items-center text-xs text-gray-500 mt-1">
                                                        <Briefcase size={12} className="mr-1" />
                                                        {contact.position}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="p-4 space-y-1">
                                                {contact.email && (
                                                    <div className="flex items-center text-sm text-gray-600">
                                                        <Mail size={14} className="mr-2 text-gray-400" />
                                                        {contact.email}
                                                    </div>
                                                )}
                                                {contact.phone && (
                                                    <div className="flex items-center text-sm text-gray-600">
                                                        <Phone size={14} className="mr-2 text-gray-400" />
                                                        {contact.phone}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="p-4">
                                                {(() => {
                                                    const entity = getEntityInfo(contact);
                                                    if (!entity) return <span className="text-sm text-gray-400">—</span>;
                                                    const Icon = entity.icon;
                                                    return (
                                                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${entity.color}`}>
                                                            <Icon size={12} className="mr-1" />
                                                            {entity.type}
                                                        </span>
                                                    );
                                                })()}
                                            </td>
                                            <td className="p-4">
                                                {(() => {
                                                    const entity = getEntityInfo(contact);
                                                    if (!entity) return <span className="text-sm text-gray-400">—</span>;
                                                    return (
                                                        <button
                                                            onClick={() => navigate(entity.link)}
                                                            className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline transition-colors cursor-pointer"
                                                        >
                                                            {entity.name}
                                                        </button>
                                                    );
                                                })()}
                                            </td>
                                            <td className="p-4 flex justify-end space-x-2">
                                                <button
                                                    onClick={() => navigate(`/calendar?contact_id=${contact.id}&client_id=${contact.client_id || ''}`)}
                                                    className="p-1.5 text-gray-400 hover:text-green-600 transition-colors"
                                                    title="Crear Actividad"
                                                >
                                                    <CalendarPlus size={18} />
                                                </button>
                                                <button
                                                    onClick={() => openEditModal(contact)}
                                                    className="p-1.5 text-gray-400 hover:text-blue-600 transition-colors"
                                                    title={t('common.edit')}
                                                >
                                                    <Pencil size={18} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(contact.id)}
                                                    className="p-1.5 text-gray-400 hover:text-red-600 transition-colors"
                                                    title={t('common.delete')}
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {contacts.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="p-8 text-center text-gray-500">
                                                {t('contacts.empty')}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile Card View */}
                        <div className="md:hidden grid grid-cols-1 gap-4 p-4 bg-gray-50">
                            {contacts.map((contact) => (
                                <div key={contact.id} className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex flex-col space-y-3">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="font-bold text-gray-900 text-lg">{contact.name}</h3>
                                            {contact.position && (
                                                <div className="flex items-center text-xs text-gray-500 mt-1">
                                                    <Briefcase size={12} className="mr-1" />
                                                    {contact.position}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="space-y-2 text-sm">
                                        {contact.email && (
                                            <div className="flex items-center text-gray-600">
                                                <Mail size={14} className="mr-2 text-gray-400 shrink-0" />
                                                <span className="truncate">{contact.email}</span>
                                            </div>
                                        )}
                                        {contact.phone && (
                                            <div className="flex items-center text-gray-600">
                                                <Phone size={14} className="mr-2 text-gray-400 shrink-0" />
                                                {contact.phone}
                                            </div>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-2 gap-3 bg-gray-50 p-3 rounded-lg border border-gray-100">
                                        <div>
                                            <p className="text-xs text-gray-500 mb-1">{t('contacts.table.type')}</p>
                                            {(() => {
                                                const entity = getEntityInfo(contact);
                                                if (!entity) return <p className="text-sm text-gray-400">—</p>;
                                                const Icon = entity.icon;
                                                return (
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${entity.color}`}>
                                                        <Icon size={12} className="mr-1" />
                                                        {entity.type}
                                                    </span>
                                                );
                                            })()}
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500 mb-1">{t('contacts.table.company')}</p>
                                            {(() => {
                                                const entity = getEntityInfo(contact);
                                                if (!entity) return <p className="text-sm text-gray-400">—</p>;
                                                return (
                                                    <button
                                                        onClick={() => navigate(entity.link)}
                                                        className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline transition-colors cursor-pointer"
                                                    >
                                                        {entity.name}
                                                    </button>
                                                );
                                            })()}
                                        </div>
                                    </div>
                                    <div className="flex justify-end space-x-2 border-t border-gray-50 pt-3">
                                        <button
                                            onClick={() => navigate(`/calendar?contact_id=${contact.id}&client_id=${contact.client_id || ''}`)}
                                            className="p-2 text-gray-500 hover:text-green-600 transition-colors bg-gray-50 hover:bg-green-50 rounded-lg"
                                            title="Crear Actividad"
                                        >
                                            <CalendarPlus size={18} />
                                        </button>
                                        <button
                                            onClick={() => openEditModal(contact)}
                                            className="p-2 text-gray-500 hover:text-blue-600 transition-colors bg-gray-50 hover:bg-blue-50 rounded-lg"
                                            title={t('common.edit')}
                                        >
                                            <Pencil size={18} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(contact.id)}
                                            className="p-2 text-gray-500 hover:text-red-600 transition-colors bg-gray-50 hover:bg-red-50 rounded-lg"
                                            title={t('common.delete')}
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {contacts.length === 0 && (
                                <div className="p-8 text-center text-gray-500 bg-white rounded-xl border border-dashed border-gray-300">
                                    {t('contacts.empty')}
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
                                        <Phone size={22} />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-bold">{editingContactId ? t('contacts.modal.editTitle') : t('contacts.modal.addTitle')}</h2>
                                        <p className="text-blue-100 text-sm">Personas de contacto asociadas a cuentas</p>
                                    </div>
                                </div>
                                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
                                    <span className="text-xl leading-none">×</span>
                                </button>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 p-6 space-y-6">
                            {/* Datos Personales */}
                            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 space-y-4">
                                <h4 className="text-xs font-semibold text-indigo-700 uppercase tracking-wide flex items-center">
                                    <Briefcase size={14} className="mr-1.5" /> Datos Personales
                                </h4>
                                <div>
                                    <label className="block text-xs text-gray-600 mb-1">{t('contacts.modal.fullName')} *</label>
                                    <input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 bg-white" placeholder="Jane Doe" />
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs text-gray-600 mb-1">{t('common.email')}</label>
                                        <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 bg-white" placeholder="jane@example.com" />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-600 mb-1">{t('common.phone')}</label>
                                        <input type="text" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 bg-white" placeholder="+1 234 567 890" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-600 mb-1">{t('contacts.modal.position')}</label>
                                    <input type="text" value={formData.position} onChange={(e) => setFormData({ ...formData, position: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 bg-white" placeholder="CTO" />
                                </div>
                            </div>

                            {/* Asociación */}
                            <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-4">
                                <h4 className="text-xs font-semibold text-green-700 uppercase tracking-wide flex items-center">
                                    <Building2 size={14} className="mr-1.5" /> Asociar A
                                </h4>
                                <div className="flex bg-white p-1 rounded-lg border border-gray-200">
                                    <button type="button" onClick={() => { setContactEntityType("account"); setFormData({ ...formData, lead_id: "", provider_id: "" }); }} className={`flex-1 flex items-center justify-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${contactEntityType === 'account' ? 'bg-indigo-100 text-indigo-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                                        <Building2 size={15} className="mr-1.5" />{t('calendar.modal.entityAccount')}
                                    </button>
                                    <button type="button" onClick={() => { setContactEntityType("lead"); setFormData({ ...formData, client_id: "", provider_id: "" }); }} className={`flex-1 flex items-center justify-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${contactEntityType === 'lead' ? 'bg-purple-100 text-purple-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                                        <Zap size={15} className="mr-1.5" />{t('calendar.modal.entityLead')}
                                    </button>
                                    <button type="button" onClick={() => { setContactEntityType("provider"); setFormData({ ...formData, client_id: "", lead_id: "" }); }} className={`flex-1 flex items-center justify-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${contactEntityType === 'provider' ? 'bg-amber-100 text-amber-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                                        <Truck size={15} className="mr-1.5" />{t('contacts.modal.assocProvider')}
                                    </button>
                                </div>

                                {contactEntityType === "account" && (
                                    <div>
                                        <label className="block text-xs text-gray-600 mb-1">{t('contacts.modal.assocClient')}</label>
                                        <select value={formData.client_id} onChange={(e) => setFormData({ ...formData, client_id: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 bg-white">
                                            <option value="">{t('common.none')}</option>
                                            {clients.map(c => (<option key={c.id} value={c.id}>{c.name}</option>))}
                                        </select>
                                    </div>
                                )}
                                {contactEntityType === "lead" && (
                                    <div>
                                        <label className="block text-xs text-gray-600 mb-1">{t('calendar.modal.leadAssoc')}</label>
                                        <select value={formData.lead_id} onChange={(e) => setFormData({ ...formData, lead_id: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 bg-white">
                                            <option value="">{t('calendar.modal.noLead')}</option>
                                            {leads.map(l => (<option key={l.id} value={l.id}>{l.company_name}</option>))}
                                        </select>
                                    </div>
                                )}
                                {contactEntityType === "provider" && (
                                    <div>
                                        <label className="block text-xs text-gray-600 mb-1">{t('contacts.modal.assocProvider')}</label>
                                        <select value={formData.provider_id} onChange={(e) => setFormData({ ...formData, provider_id: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 bg-white">
                                            <option value="">{t('common.none')}</option>
                                            {providers.map(p => (<option key={p.id} value={p.id}>{p.name}</option>))}
                                        </select>
                                    </div>
                                )}
                            </div>
                        </form>

                        {/* Footer */}
                        <div className="p-5 border-t border-gray-100 flex justify-between items-center flex-shrink-0 bg-gray-50">
                            <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2.5 text-gray-600 hover:text-gray-900 text-sm font-medium">{t('common.cancel')}</button>
                            <button onClick={handleSubmit} className="flex items-center px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-medium hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-200 transition-all">
                                {t('contacts.modal.saveBtn')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
