import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../api/client";
import { Plus, Pencil, Trash2, Mail, Phone, Box, MapPin, Building2, FileText, Search, RefreshCw, CheckCircle2, ShieldCheck } from "lucide-react";
import ClientServicesModal from "../components/ClientServicesModal";
import { useTranslation } from "react-i18next";

interface Client {
    id: number;
    name: string;
    trade_name: string | null;
    tax_condition: string | null;
    cuit_dni: string;
    email: string;
    phone: string;
    address: string;
    city: string | null;
    province: string | null;
    country: string | null;
    is_active: boolean;
    website?: string | null;
    activity?: string | null;
    arca_validated?: boolean;
    arca_validated_at?: string | null;
}

const TAX_CONDITIONS = [
    "IVA Responsable Inscripto",
    "Responsable Monotributo",
    "IVA Exento",
    "Consumidor Final",
    "IVA No Responsable",
    "Monotributista Social",
    "Sujeto No Categorizado",
];

export default function Clients() {
    const { t } = useTranslation();
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(true);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingClientId, setEditingClientId] = useState<number | null>(null);
    const [inventoryClient, setInventoryClient] = useState<Client | null>(null);
    const [formData, setFormData] = useState({
        name: "",
        trade_name: "",
        tax_condition: "",
        cuit_dni: "",
        email: "",
        phone: "",
        address: "",
        city: "",
        province: "",
        country: "Argentina",
        website: "",
        activity: "",
        arca_validated: false,
    });

    // CUIT Lookup state
    const [cuitLoading, setCuitLoading] = useState(false);
    const [cuitResult, setCuitResult] = useState<any>(null);
    const [cuitError, setCuitError] = useState("");

    useEffect(() => {
        fetchClients();
    }, []);

    const fetchClients = async () => {
        try {
            const response = await api.get("/clients/");
            setClients(response.data);
        } catch (error) {
            console.error("Failed to fetch clients", error);
        } finally {
            setLoading(false);
        }
    };

    const openAddModal = () => {
        setEditingClientId(null);
        setFormData({ name: "", trade_name: "", tax_condition: "", cuit_dni: "", email: "", phone: "", address: "", city: "", province: "", country: "Argentina", website: "", activity: "", arca_validated: false });
        setCuitResult(null);
        setCuitError("");
        setIsModalOpen(true);
    };

    const openEditModal = (client: Client) => {
        setEditingClientId(client.id);
        setCuitResult(null);
        setCuitError("");
        setFormData({
            name: client.name,
            trade_name: client.trade_name || "",
            tax_condition: client.tax_condition || "",
            cuit_dni: client.cuit_dni || "",
            email: client.email || "",
            phone: client.phone || "",
            address: client.address || "",
            city: client.city || "",
            province: client.province || "",
            country: client.country || "Argentina",
            website: client.website || "",
            activity: (client as any).activity || "",
            arca_validated: (client as any).arca_validated || false,
        });
        setIsModalOpen(true);
    };

    const handleDelete = async (id: number) => {
        if (confirm("Are you sure you want to delete this client?")) {
            try {
                await api.delete(`/clients/${id}`);
                fetchClients();
            } catch (error) {
                console.error("Delete failed", error);
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingClientId) {
                await api.put(`/clients/${editingClientId}`, formData);
            } else {
                await api.post("/clients/", formData);
            }
            setIsModalOpen(false);
            fetchClients();
        } catch (error) {
            console.error("Submit failed", error);
            alert("An error occurred while saving the client.");
        }
    };

    // CUIT Lookup handler
    const handleCuitLookup = async () => {
        const cuit = formData.cuit_dni.replace(/-/g, '').trim();
        if (cuit.length < 11) {
            setCuitError('Ingresá un CUIT válido de 11 dígitos');
            return;
        }
        setCuitLoading(true);
        setCuitError('');
        setCuitResult(null);
        try {
            const res = await api.get(`/arca/lookup-cuit/${cuit}`);
            if (res.data.success) {
                setCuitResult(res.data);
                // Auto-fill form fields from AFIP data
                const updates: any = {};
                if (res.data.razon_social) {
                    updates.name = res.data.razon_social;
                }
                if (res.data.condicion_iva_desc) {
                    updates.tax_condition = res.data.condicion_iva_desc;
                }
                if (res.data.domicilio) {
                    // Parse domicilio: "SANTA FE 355, NEUQUEN, NEUQUEN"
                    const parts = res.data.domicilio.split(', ');
                    if (parts.length >= 1) updates.address = parts[0];
                    if (parts.length >= 2) updates.city = parts[1];
                    if (parts.length >= 3) updates.province = parts[2];
                }
                updates.country = 'Argentina';
                if (res.data.actividad_principal) {
                    updates.activity = res.data.actividad_principal;
                }
                updates.arca_validated = true;
                setFormData(prev => ({ ...prev, ...updates }));
            } else {
                setCuitError(res.data.error || 'No se encontró el CUIT');
            }
        } catch (err: any) {
            setCuitError(err.response?.data?.detail || 'Error consultando CUIT en AFIP');
        } finally {
            setCuitLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100 gap-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-gray-900">{t('clients.title')}</h2>
                    <p className="text-sm text-gray-500">{t('clients.description')}</p>
                </div>
                <button
                    onClick={openAddModal}
                    className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm"
                >
                    <Plus size={18} />
                    <span>{t('clients.addBtn')}</span>
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center text-gray-500">{t('clients.loading')}</div>
                ) : (
                    <div>
                        {/* Desktop Table View */}
                        <div className="hidden md:block overflow-x-auto w-full">
                            <table className="w-full text-left border-collapse min-w-[800px]">
                                <thead>
                                    <tr className="bg-gray-50 border-b border-gray-100">
                                        <th className="p-4 font-semibold text-gray-600 text-sm">{t('clients.table.companyName')}</th>
                                        <th className="p-4 font-semibold text-gray-600 text-sm">{t('clients.table.contactInfo')}</th>
                                        <th className="p-4 font-semibold text-gray-600 text-sm">{t('clients.table.cuitDni')}</th>
                                        <th className="p-4 font-semibold text-gray-600 text-sm">{t('clients.modal.province')}</th>
                                        <th className="p-4 font-semibold text-gray-600 text-sm text-center">ARCA</th>
                                        <th className="p-4 font-semibold text-gray-600 text-sm">{t('common.status')}</th>
                                        <th className="p-4 font-semibold text-gray-600 text-sm text-right">{t('common.actions')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {clients.map((client) => (
                                        <tr key={client.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                                            <td className="p-4">
                                                <Link to={`/clients/${client.id}`} className="font-medium text-blue-600 hover:text-blue-800 hover:underline border-l-2 border-blue-500 pl-2 block">
                                                    {client.name}
                                                </Link>
                                                {client.trade_name && (
                                                    <p className="text-xs text-gray-500 pl-2 mt-0.5">{client.trade_name}</p>
                                                )}
                                            </td>
                                            <td className="p-4 space-y-1">
                                                {client.email && (
                                                    <div className="flex items-center text-sm text-gray-600">
                                                        <Mail size={14} className="mr-2 text-gray-400" />
                                                        {client.email}
                                                    </div>
                                                )}
                                                {client.phone && (
                                                    <div className="flex items-center text-sm text-gray-600">
                                                        <Phone size={14} className="mr-2 text-gray-400" />
                                                        {client.phone}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="p-4 text-gray-600">{client.cuit_dni || "-"}</td>
                                            <td className="p-4">
                                                {client.province ? (
                                                    <div className="flex items-center text-sm text-gray-600">
                                                        <MapPin size={14} className="mr-1.5 text-gray-400 shrink-0" />
                                                        {client.province}
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-400">-</span>
                                                )}
                                            </td>
                                            <td className="p-4 text-center">
                                                {client.arca_validated ? (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700 border border-green-200">
                                                        <ShieldCheck size={13} />
                                                        Validado
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-600 border border-amber-200">
                                                        Por validar
                                                    </span>
                                                )}
                                            </td>
                                            <td className="p-4">
                                                {client.is_active ? (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                        {t('common.active')}
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                                        {t('common.inactive')}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="p-4 flex items-center justify-end space-x-3">
                                                <Link
                                                    to={`/clients/${client.id}`}
                                                    className="flex items-center space-x-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium text-xs rounded-lg transition-colors border border-blue-100 shadow-sm"
                                                    title={t('clients.viewProfile')}
                                                >
                                                    <Box size={14} />
                                                    <span>{t('clients.viewProfile')}</span>
                                                </Link>
                                                <button
                                                    onClick={() => openEditModal(client)}
                                                    className="p-1.5 text-gray-400 hover:text-blue-600 transition-colors bg-white hover:bg-blue-50 rounded-lg shadow-sm border border-transparent hover:border-blue-100"
                                                    title={t('common.edit')}
                                                >
                                                    <Pencil size={18} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(client.id)}
                                                    className="p-1.5 text-gray-400 hover:text-red-600 transition-colors bg-white hover:bg-red-50 rounded-lg shadow-sm border border-transparent hover:border-red-100"
                                                    title={t('common.delete')}
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {clients.length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="p-8 text-center text-gray-500">
                                                {t('clients.empty')}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile Card View */}
                        <div className="md:hidden grid grid-cols-1 gap-4 p-4 bg-gray-50">
                            {clients.map((client) => (
                                <div key={client.id} className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex flex-col space-y-4">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <Link to={`/clients/${client.id}`} className="font-bold text-gray-900 text-lg leading-tight hover:text-blue-600 transition-colors border-l-2 border-blue-500 pl-2 block">
                                                {client.name}
                                            </Link>
                                            {client.trade_name && (
                                                <p className="text-xs text-gray-500 pl-2 mt-0.5">{client.trade_name}</p>
                                            )}
                                        </div>
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ml-2 shrink-0
                                            ${client.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}
                                        `}>
                                            {client.is_active ? t('common.active') : t('common.inactive')}
                                        </span>
                                    </div>

                                    <div className="space-y-2">
                                        {client.email && (
                                            <div className="flex items-center text-sm text-gray-600">
                                                <Mail size={16} className="mr-2 text-gray-400 shrink-0" />
                                                <span className="truncate">{client.email}</span>
                                            </div>
                                        )}
                                        {client.phone && (
                                            <div className="flex items-center text-sm text-gray-600">
                                                <Phone size={16} className="mr-2 text-gray-400 shrink-0" />
                                                <span>{client.phone}</span>
                                            </div>
                                        )}
                                        {client.cuit_dni && (
                                            <div className="text-xs text-gray-500 font-medium">
                                                CUIT/DNI: <span className="text-gray-700">{client.cuit_dni}</span>
                                                {client.arca_validated ? (
                                                    <span className="ml-2 inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-100 text-green-700">
                                                        <ShieldCheck size={10} /> ARCA
                                                    </span>
                                                ) : (
                                                    <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 text-amber-600">
                                                        Por validar
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex justify-between items-center border-t border-gray-50 pt-4 mt-auto">
                                        <Link
                                            to={`/clients/${client.id}`}
                                            className="flex items-center space-x-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium text-xs rounded-lg transition-colors border border-blue-100 shadow-sm"
                                        >
                                            <Box size={14} />
                                            <span>{t('clients.viewProfile')}</span>
                                        </Link>
                                        <div className="flex space-x-2">
                                            <button
                                                onClick={() => openEditModal(client)}
                                                className="p-2 text-gray-500 hover:text-blue-600 transition-colors bg-gray-50 hover:bg-blue-50 rounded-lg"
                                                title={t('common.edit')}
                                            >
                                                <Pencil size={18} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(client.id)}
                                                className="p-2 text-gray-500 hover:text-red-600 transition-colors bg-gray-50 hover:bg-red-50 rounded-lg"
                                                title={t('common.delete')}
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {clients.length === 0 && (
                                <div className="p-8 text-center text-gray-500 bg-white rounded-xl border border-dashed border-gray-300">
                                    {t('clients.empty')}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Modal Form */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col">
                        {/* Gradient Header */}
                        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-5 text-white flex-shrink-0">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                    <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                                        <Building2 size={22} />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-bold">{editingClientId ? t('clients.modal.editTitle') : t('clients.modal.addTitle')}</h2>
                                        <p className="text-blue-100 text-sm">{t('clients.description')}</p>
                                    </div>
                                </div>
                                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
                                    <span className="text-xl leading-none">×</span>
                                </button>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1">
                            {/* Section: Company Info */}
                            <div className="px-6 py-5">
                                <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 space-y-4">
                                    <h4 className="text-xs font-semibold text-indigo-700 uppercase tracking-wide flex items-center">
                                        <Building2 size={14} className="mr-1.5" /> {t('clients.modal.sectionCompany')}
                                    </h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs text-gray-600 mb-1">{t('clients.modal.legalName')} <span className="text-red-400">*</span></label>
                                            <input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 bg-white" placeholder={t('clients.modal.legalNamePlaceholder')} />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-gray-600 mb-1">{t('clients.modal.tradeName')}</label>
                                            <input type="text" value={formData.trade_name} onChange={(e) => setFormData({ ...formData, trade_name: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 bg-white" placeholder={t('clients.modal.tradeNamePlaceholder')} />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Section: Tax & Contact */}
                            <div className="px-6 pb-5">
                                <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-4">
                                    <h4 className="text-xs font-semibold text-green-700 uppercase tracking-wide flex items-center">
                                        <FileText size={14} className="mr-1.5" /> {t('clients.modal.sectionTaxContact')}
                                    </h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs text-gray-600 mb-1">{t('clients.modal.cuitDni')}</label>
                                            <div className="flex gap-1.5">
                                                <input type="text" value={formData.cuit_dni} onChange={(e) => setFormData({ ...formData, cuit_dni: e.target.value })} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleCuitLookup(); } }} className="flex-1 px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 bg-white font-mono" placeholder="30-12345678-9" />
                                                <button type="button" onClick={handleCuitLookup} disabled={cuitLoading} className="px-3 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center gap-1.5 text-xs font-medium shrink-0" title="Buscar CUIT en AFIP">
                                                    {cuitLoading ? <RefreshCw size={14} className="animate-spin" /> : <Search size={14} />}
                                                    <span className="hidden sm:inline">AFIP</span>
                                                </button>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs text-gray-600 mb-1">{t('clients.modal.taxCondition')}</label>
                                            <select value={formData.tax_condition} onChange={(e) => setFormData({ ...formData, tax_condition: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 bg-white">
                                                <option value="">{t('clients.modal.taxConditionPlaceholder')}</option>
                                                {TAX_CONDITIONS.map((tc) => (
                                                    <option key={tc} value={tc}>{tc}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                    {/* CUIT Lookup Result */}
                                    {cuitResult && (
                                        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-3.5">
                                            <div className="flex items-start gap-2.5">
                                                <CheckCircle2 size={18} className="text-green-600 mt-0.5 flex-shrink-0" />
                                                <div className="flex-1 space-y-0.5">
                                                    <p className="font-semibold text-green-900 text-sm">{cuitResult.razon_social}</p>
                                                    <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-green-800">
                                                        <span><strong>CUIT:</strong> {cuitResult.cuit}</span>
                                                        <span><strong>IVA:</strong> {cuitResult.condicion_iva_desc}</span>
                                                        {cuitResult.actividad_principal && <span><strong>Actividad:</strong> {cuitResult.actividad_principal}</span>}
                                                        <span><strong>Estado:</strong> {cuitResult.estado}</span>
                                                    </div>
                                                    <p className="text-xs text-green-600 italic">✓ Datos completados automáticamente desde AFIP</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    {cuitError && (
                                        <div className="bg-red-50 border border-red-200 rounded-lg p-2.5 flex items-center gap-2">
                                            <span className="text-red-500 text-sm">⚠</span>
                                            <p className="text-xs text-red-700">{cuitError}</p>
                                        </div>
                                    )}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs text-gray-600 mb-1">{t('common.email')}</label>
                                            <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 bg-white" placeholder="contact@acme.com" />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-gray-600 mb-1">{t('common.phone')}</label>
                                            <input type="text" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 bg-white" placeholder="+54 9 11 1234 5678" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Section: Address */}
                            <div className="px-6 pb-5">
                                <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 space-y-4">
                                    <h4 className="text-xs font-semibold text-orange-700 uppercase tracking-wide flex items-center">
                                        <MapPin size={14} className="mr-1.5" /> {t('clients.modal.sectionAddress')}
                                    </h4>
                                    <div>
                                        <label className="block text-xs text-gray-600 mb-1">{t('clients.modal.address')}</label>
                                        <input type="text" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 bg-white" placeholder={t('clients.modal.addressPlaceholder')} />
                                    </div>
                                    <div className="grid grid-cols-3 gap-4">
                                        <div>
                                            <label className="block text-xs text-gray-600 mb-1">{t('clients.modal.city')}</label>
                                            <input type="text" value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 bg-white" placeholder={t('clients.modal.cityPlaceholder')} />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-gray-600 mb-1">{t('clients.modal.province')}</label>
                                            <input type="text" value={formData.province} onChange={(e) => setFormData({ ...formData, province: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 bg-white" placeholder={t('clients.modal.provincePlaceholder')} />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-gray-600 mb-1">{t('clients.modal.country')}</label>
                                            <input type="text" value={formData.country} onChange={(e) => setFormData({ ...formData, country: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 bg-white" placeholder={t('clients.modal.countryPlaceholder')} />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Website */}
                            <div className="px-6 pb-5">
                                <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 space-y-2">
                                    <h4 className="text-xs font-semibold text-purple-700 uppercase tracking-wide">🌐 {t('common.website')}</h4>
                                    <input type="url" value={formData.website} onChange={(e) => setFormData({ ...formData, website: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 bg-white" placeholder="https://www.example.com" />
                                </div>
                            </div>
                        </form>

                        {/* Footer */}
                        <div className="p-5 border-t border-gray-100 flex justify-between items-center flex-shrink-0 bg-gray-50">
                            <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2.5 text-gray-600 hover:text-gray-900 text-sm font-medium">{t('common.cancel')}</button>
                            <button onClick={handleSubmit} className="flex items-center px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-medium hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-200 transition-all">
                                {t('clients.modal.saveBtn')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Inventory Modal */}
            {inventoryClient && (
                <ClientServicesModal client={inventoryClient} onClose={() => setInventoryClient(null)} />
            )}
        </div>
    );
}
