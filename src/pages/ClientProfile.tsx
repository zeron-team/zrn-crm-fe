import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import api from "../api/client";
import {
    ArrowLeft, Building2, Mail, Phone, MapPin,
    Box, FileText, Contact, Calendar as CalendarIcon, Clock, Globe, Receipt, ShieldCheck, Briefcase, RefreshCw
} from "lucide-react";
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
    website: string | null;
    activity?: string | null;
    arca_validated?: boolean;
    arca_validated_at?: string | null;
}

interface ClientService {
    id: number;
    product_id: number;
    name: string;
    status: string;
    billing_cycle: string;
    characteristics: Record<string, any>;
    start_date: string;
}

interface Product {
    id: number;
    name: string;
}

interface Invoice {
    id: number;
    invoice_number: string;
    type: string;
    issue_date: string;
    amount: number;
    status: {
        name: string;
        color_code: string;
    };
}

interface ContactPerson {
    id: number;
    name: string;
    email: string;
    phone: string;
    position: string;
}

interface CalendarEvent {
    id: number;
    title: string;
    description: string;
    start_date: string;
    end_date: string;
    related_to: string;
    color: string;
    client_id: number | null;
}

export default function ClientProfile() {
    const { t } = useTranslation();
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [client, setClient] = useState<Client | null>(null);
    const [services, setServices] = useState<ClientService[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [contacts, setContacts] = useState<ContactPerson[]>([]);
    const [activities, setActivities] = useState<CalendarEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [isInventoryModalOpen, setIsInventoryModalOpen] = useState(false);

    // ARCA Validation state
    const [validating, setValidating] = useState(false);
    const [validationMsg, setValidationMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    useEffect(() => {
        if (id) {
            fetchClientData(Number(id));
        }
    }, [id]);

    const fetchClientData = async (clientId: number) => {
        try {
            // First fetch the client details to ensure they exist
            const clientRes = await api.get(`/clients/${clientId}`);
            setClient(clientRes.data);

            // Fetch the rest in parallel
            const [servRes, prodRes, invRes, contRes, actRes] = await Promise.all([
                api.get(`/client-services/client/${clientId}`),
                api.get('/products/'),
                api.get('/invoices/'),
                api.get('/contacts/'),
                api.get('/calendar/')
            ]);

            setServices(servRes.data);
            setProducts(prodRes.data);

            // Filter global arrays for this specific client
            const clientInvoices = invRes.data.filter((inv: any) => inv.client_id === clientId);
            setInvoices(clientInvoices);

            const clientContacts = contRes.data.filter((c: any) => c.client_id === clientId);
            setContacts(clientContacts);

            const clientActivities = actRes.data.filter((a: any) => a.client_id === clientId)
                .sort((a: any, b: any) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());
            setActivities(clientActivities);

        } catch (error) {
            console.error("Failed to load client profile data", error);
            // navigate('/clients'); // fallback
        } finally {
            setLoading(false);
        }
    };

    const getProductName = (productId: number) => {
        const prod = products.find(p => p.id === productId);
        return prod ? prod.name : t('clients.profile.unknownService');
    };

    // Validate existing client with ARCA/AFIP
    const handleArcaValidation = async () => {
        if (!client || !client.cuit_dni) {
            setValidationMsg({ type: 'error', text: 'El cliente no tiene CUIT/DNI cargado' });
            return;
        }
        setValidating(true);
        setValidationMsg(null);
        try {
            const cuit = client.cuit_dni.replace(/-/g, '').trim();
            const lookupRes = await api.get(`/arca/lookup-cuit/${cuit}`);
            if (lookupRes.data.success) {
                const d = lookupRes.data;
                // Build update payload
                const updates: any = {
                    arca_validated: true,
                    arca_validated_at: new Date().toISOString(),
                };
                if (d.razon_social) updates.name = d.razon_social;
                if (d.condicion_iva_desc) updates.tax_condition = d.condicion_iva_desc;
                if (d.actividad_principal) updates.activity = d.actividad_principal;
                if (d.domicilio) {
                    const parts = d.domicilio.split(', ');
                    if (parts.length >= 1) updates.address = parts[0];
                    if (parts.length >= 2) updates.city = parts[1];
                    if (parts.length >= 3) updates.province = parts[2];
                }
                updates.country = 'Argentina';

                // Save to backend
                await api.put(`/clients/${client.id}`, updates);
                // Refresh client data
                await fetchClientData(client.id);
                setValidationMsg({ type: 'success', text: `✓ Cliente validado: ${d.razon_social} — ${d.condicion_iva_desc}` });
            } else {
                setValidationMsg({ type: 'error', text: lookupRes.data.error || 'No se encontró el CUIT en AFIP' });
            }
        } catch (err: any) {
            setValidationMsg({ type: 'error', text: err.response?.data?.detail || 'Error al validar con ARCA' });
        } finally {
            setValidating(false);
        }
    };

    if (loading) {
        return <div className="p-8 text-center text-gray-500">{t('clients.profile.loading')}</div>;
    }

    if (!client) {
        return <div className="p-8 text-center text-red-500">{t('clients.profile.notFound')}</div>;
    }

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex items-center space-x-4">
                <button
                    onClick={() => navigate('/clients')}
                    className="p-2 text-gray-400 hover:text-gray-900 bg-white rounded-full shadow-sm border border-gray-100 transition-colors"
                >
                    <ArrowLeft size={20} />
                </button>
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center">
                        {client.name}
                        {client.is_active ? (
                            <span className="ml-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                {t('common.active')}
                            </span>
                        ) : (
                            <span className="ml-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                {t('common.inactive')}
                            </span>
                        )}
                    </h2>
                    {client.trade_name && (
                        <p className="text-sm text-gray-500 mt-0.5">{client.trade_name}</p>
                    )}
                    <div className="flex items-center space-x-3 mt-1">
                        <p className="text-sm text-gray-500 flex items-center">
                            CUIT/DNI: {client.cuit_dni || 'N/A'}
                        </p>
                        {client.tax_condition && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
                                <Receipt size={12} className="mr-1" />
                                {client.tax_condition}
                            </span>
                        )}
                        {client.arca_validated ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700 border border-green-200">
                                <ShieldCheck size={12} />
                                ARCA Validado
                            </span>
                        ) : (
                            <button
                                onClick={handleArcaValidation}
                                disabled={validating}
                                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-300 hover:bg-amber-100 hover:border-amber-400 transition-all cursor-pointer disabled:opacity-50"
                            >
                                {validating ? <RefreshCw size={12} className="animate-spin" /> : <ShieldCheck size={12} />}
                                {validating ? 'Validando...' : 'Validar con ARCA'}
                            </button>
                        )}
                    </div>
                    {/* Validation message */}
                    {validationMsg && (
                        <div className={`mt-1.5 px-3 py-1.5 rounded-lg text-xs font-medium ${validationMsg.type === 'success'
                                ? 'bg-green-50 text-green-700 border border-green-200'
                                : 'bg-red-50 text-red-700 border border-red-200'
                            }`}>
                            {validationMsg.text}
                        </div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Info Card */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col space-y-4">
                    <div className="flex items-center space-x-2 border-b border-gray-100 pb-3">
                        <Building2 className="text-blue-500" size={20} />
                        <h3 className="font-semibold text-gray-900">{t('clients.profile.details')}</h3>
                    </div>

                    <div className="space-y-4 flex-1">
                        {/* Contact Info */}
                        <div className="space-y-3">
                            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">{t('clients.profile.sectionContact')}</p>
                            <div className="flex items-start space-x-3">
                                <Mail className="text-gray-400 mt-0.5" size={16} />
                                <div>
                                    <p className="text-xs text-gray-500 font-medium tracking-wide">{t('clients.profile.labelEmail')}</p>
                                    <p className="text-sm text-gray-900">{client.email || t('clients.profile.na')}</p>
                                </div>
                            </div>
                            <div className="flex items-start space-x-3">
                                <Phone className="text-gray-400 mt-0.5" size={16} />
                                <div>
                                    <p className="text-xs text-gray-500 font-medium tracking-wide">{t('clients.profile.labelPhone')}</p>
                                    <p className="text-sm text-gray-900">{client.phone || t('clients.profile.na')}</p>
                                </div>
                            </div>
                            {client.website && (
                                <div className="flex items-start space-x-3">
                                    <Globe className="text-gray-400 mt-0.5" size={16} />
                                    <div>
                                        <p className="text-xs text-gray-500 font-medium tracking-wide">{t('common.website')}</p>
                                        <a href={client.website.startsWith('http') ? client.website : `https://${client.website}`} target="_blank" rel="noreferrer" className="text-sm text-blue-600 hover:underline">{client.website}</a>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Activity */}
                        {client.activity && (
                            <>
                                <div className="border-t border-gray-100" />
                                <div className="space-y-3">
                                    <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Actividad Principal</p>
                                    <div className="flex items-start space-x-3">
                                        <Briefcase className="text-gray-400 mt-0.5" size={16} />
                                        <div>
                                            <p className="text-sm text-gray-900">{client.activity}</p>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}

                        {/* ARCA Status */}
                        {client.arca_validated && (
                            <>
                                <div className="border-t border-gray-100" />
                                <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-3 border border-green-200">
                                    <div className="flex items-center gap-2">
                                        <ShieldCheck size={16} className="text-green-600" />
                                        <div>
                                            <p className="text-xs font-semibold text-green-800">Validado por AFIP (ARCA)</p>
                                            {client.arca_validated_at && (
                                                <p className="text-[10px] text-green-600">
                                                    Verificado: {new Date(client.arca_validated_at).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}

                        {/* Divider */}
                        <div className="border-t border-gray-100" />

                        {/* Location */}
                        <div className="space-y-3">
                            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">{t('clients.profile.sectionLocation')}</p>
                            <div className="flex items-start space-x-3">
                                <MapPin className="text-gray-400 mt-0.5" size={16} />
                                <div>
                                    <p className="text-xs text-gray-500 font-medium tracking-wide">{t('clients.profile.labelAddress')}</p>
                                    <p className="text-sm text-gray-900">{client.address || t('clients.profile.na')}</p>
                                </div>
                            </div>
                            {(client.city || client.province) && (
                                <div className="flex items-start space-x-3">
                                    <Globe className="text-gray-400 mt-0.5" size={16} />
                                    <div>
                                        <p className="text-xs text-gray-500 font-medium tracking-wide">{t('clients.profile.labelCityProvince')}</p>
                                        <p className="text-sm text-gray-900">
                                            {[client.city, client.province].filter(Boolean).join(', ')}
                                        </p>
                                    </div>
                                </div>
                            )}
                            {client.country && (
                                <div className="flex items-start space-x-3">
                                    <Globe className="text-gray-400 mt-0.5" size={16} />
                                    <div>
                                        <p className="text-xs text-gray-500 font-medium tracking-wide">{t('clients.profile.labelCountry')}</p>
                                        <p className="text-sm text-gray-900">{client.country}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Contacts Card */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 lg:col-span-2">
                    <div className="flex justify-between items-center border-b border-gray-100 pb-3 mb-4">
                        <div className="flex items-center space-x-2">
                            <Contact className="text-green-500" size={20} />
                            <h3 className="font-semibold text-gray-900">{t('clients.profile.contacts')} ({contacts.length})</h3>
                        </div>
                        <Link to="/contacts" className="text-xs font-medium text-blue-600 hover:underline">
                            {t('clients.profile.manageContacts')}
                        </Link>
                    </div>

                    {contacts.length === 0 ? (
                        <div className="py-8 text-center text-sm text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                            {t('clients.profile.noContacts')}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {contacts.map(c => (
                                <div key={c.id} className="p-3 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors">
                                    <p className="font-medium text-gray-900 text-sm">{c.name}</p>
                                    <p className="text-xs text-blue-600 font-medium mb-1">{c.position || 'Contact'}</p>
                                    <div className="flex flex-col space-y-1 mt-2">
                                        {c.email && <span className="text-xs text-gray-500 flex items-center"><Mail size={12} className="mr-1" />{c.email}</span>}
                                        {c.phone && <span className="text-xs text-gray-500 flex items-center"><Phone size={12} className="mr-1" />{c.phone}</span>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Activities Card */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-0 overflow-hidden lg:col-span-3">
                    <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                        <div className="flex items-center space-x-2">
                            <CalendarIcon className="text-orange-500" size={20} />
                            <h3 className="font-semibold text-gray-900">{t('clients.profile.activities')} ({activities.length})</h3>
                        </div>
                        <Link to="/calendar" className="text-xs font-medium text-blue-600 hover:underline">
                            {t('clients.profile.viewCalendar')}
                        </Link>
                    </div>

                    {activities.length === 0 ? (
                        <div className="p-8 text-center text-sm text-gray-500">
                            {t('clients.profile.noActivities')}
                        </div>
                    ) : (
                        <div>
                            {/* Desktop */}
                            <div className="hidden md:block overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead>
                                        <tr className="bg-white border-b border-gray-100 text-gray-500">
                                            <th className="p-4 font-medium min-w-[200px]">{t('clients.profile.eventTitle')}</th>
                                            <th className="p-4 font-medium">{t('clients.profile.dateTime')}</th>
                                            <th className="p-4 font-medium">{t('clients.profile.type')}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {activities.map(act => (
                                            <tr key={act.id} className="hover:bg-gray-50/50">
                                                <td className="p-4">
                                                    <div className="flex items-center space-x-3">
                                                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: act.color || '#3788d8' }} />
                                                        <div>
                                                            <p className="font-semibold text-gray-900">{act.title}</p>
                                                            {act.description && <p className="text-xs text-gray-500 mt-0.5 max-w-sm truncate">{act.description}</p>}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex items-center text-gray-600 text-[13px]">
                                                        <Clock size={14} className="mr-1.5 text-gray-400" />
                                                        {new Date(act.start_date).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <span className="inline-flex px-2 py-0.5 border border-gray-200 rounded-full bg-gray-50 font-medium text-[11px] text-gray-600">
                                                        {act.related_to || t('clients.profile.general')}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            {/* Mobile */}
                            <div className="md:hidden grid grid-cols-1 gap-3 p-4">
                                {activities.map(act => (
                                    <div key={act.id} className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex flex-col space-y-2">
                                        <div className="flex items-center space-x-2">
                                            <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: act.color || '#3788d8' }} />
                                            <h4 className="font-semibold text-gray-900">{act.title}</h4>
                                        </div>
                                        {act.description && <p className="text-xs text-gray-500 line-clamp-2">{act.description}</p>}
                                        <div className="flex items-center justify-between text-xs text-gray-600">
                                            <div className="flex items-center">
                                                <Clock size={12} className="mr-1 text-gray-400" />
                                                {new Date(act.start_date).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                                            </div>
                                            <span className="inline-flex px-2 py-0.5 border border-gray-200 rounded-full bg-white font-medium text-[11px] text-gray-600">
                                                {act.related_to || t('clients.profile.general')}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Inventory Card */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-0 overflow-hidden lg:col-span-3">
                    <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                        <div className="flex items-center space-x-2">
                            <Box className="text-purple-500" size={20} />
                            <h3 className="font-semibold text-gray-900">{t('clients.profile.inventory')} ({services.length})</h3>
                        </div>
                        <button
                            onClick={() => setIsInventoryModalOpen(true)}
                            className="flex items-center space-x-1 text-xs font-medium bg-white px-3 py-1.5 border border-gray-200 shadow-sm rounded-lg hover:bg-gray-50 text-gray-700 transition"
                        >
                            <span>{t('clients.profile.openInventory')}</span>
                        </button>
                    </div>

                    {services.length === 0 ? (
                        <div className="p-8 text-center text-sm text-gray-500">
                            <Box size={32} className="mx-auto text-gray-300 mb-3" />
                            {t('clients.profile.noInventory')}
                        </div>
                    ) : (
                        <div>
                            {/* Desktop */}
                            <div className="hidden md:block overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead>
                                        <tr className="bg-white border-b border-gray-100 text-gray-500">
                                            <th className="p-4 font-medium">{t('clients.profile.serviceProduct')}</th>
                                            <th className="p-4 font-medium">{t('common.status')}</th>
                                            <th className="p-4 font-medium">{t('clients.profile.characteristics')}</th>
                                            <th className="p-4 font-medium w-32">{t('clients.profile.cycle')}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {services.map(s => (
                                            <tr key={s.id} className="hover:bg-gray-50/50">
                                                <td className="p-4">
                                                    <p className="font-semibold text-gray-900">{getProductName(s.product_id)}</p>
                                                    {s.name && <p className="text-xs text-gray-500 mt-0.5">{s.name}</p>}
                                                    <p className="text-[11px] text-gray-400 mt-1">{t('clients.profile.since')} {new Date(s.start_date).toLocaleDateString()}</p>
                                                </td>
                                                <td className="p-4">
                                                    <span className={`inline-flex px-2 py-0.5 rounded text-[11px] font-medium border ${s.status === 'Active' ? 'bg-green-50 text-green-700 border-green-200' :
                                                        s.status === 'Suspended' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                                                            'bg-gray-100 text-gray-700 border-gray-200'
                                                        }`}>
                                                        {s.status}
                                                    </span>
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {Object.entries(s.characteristics || {}).map(([key, val]) => (
                                                            <span key={key} className="inline-flex items-center px-2 py-0.5 bg-gray-100 text-gray-600 text-[11px] rounded border border-gray-200">
                                                                <span className="font-medium mr-1">{key}:</span> {String(val)}
                                                            </span>
                                                        ))}
                                                        {(!s.characteristics || Object.keys(s.characteristics).length === 0) && (
                                                            <span className="text-gray-400 text-xs italic">-</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="p-4 text-gray-600 font-medium">
                                                    {s.billing_cycle}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            {/* Mobile */}
                            <div className="md:hidden grid grid-cols-1 gap-3 p-4">
                                {services.map(s => (
                                    <div key={s.id} className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex flex-col space-y-2">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="font-semibold text-gray-900">{getProductName(s.product_id)}</p>
                                                {s.name && <p className="text-xs text-gray-500 mt-0.5">{s.name}</p>}
                                            </div>
                                            <span className={`inline-flex px-2 py-0.5 rounded text-[11px] font-medium border shrink-0 ${s.status === 'Active' ? 'bg-green-50 text-green-700 border-green-200' :
                                                s.status === 'Suspended' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                                                    'bg-gray-100 text-gray-700 border-gray-200'
                                                }`}>
                                                {s.status}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="text-gray-400">{t('clients.profile.since')} {new Date(s.start_date).toLocaleDateString()}</span>
                                            <span className="text-gray-600 font-medium">{s.billing_cycle}</span>
                                        </div>
                                        {s.characteristics && Object.keys(s.characteristics).length > 0 && (
                                            <div className="flex flex-wrap gap-1.5 pt-1">
                                                {Object.entries(s.characteristics).map(([key, val]) => (
                                                    <span key={key} className="inline-flex items-center px-2 py-0.5 bg-white text-gray-600 text-[11px] rounded border border-gray-200">
                                                        <span className="font-medium mr-1">{key}:</span> {String(val)}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Invoices Card */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-0 overflow-hidden lg:col-span-3">
                    <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                        <div className="flex items-center space-x-2">
                            <FileText className="text-blue-500" size={20} />
                            <h3 className="font-semibold text-gray-900">{t('clients.profile.invoices')} ({invoices.length})</h3>
                        </div>
                        <Link to="/billing" className="text-xs font-medium text-blue-600 hover:underline">
                            {t('clients.profile.viewBilling')}
                        </Link>
                    </div>
                    {invoices.length === 0 ? (
                        <div className="p-8 text-center text-sm text-gray-500">
                            {t('clients.profile.noInvoices')}
                        </div>
                    ) : (
                        <div>
                            {/* Desktop */}
                            <div className="hidden md:block overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead>
                                        <tr className="bg-white border-b border-gray-100 text-gray-500">
                                            <th className="p-4 font-medium">{t('clients.profile.invoiceNum')}</th>
                                            <th className="p-4 font-medium">{t('clients.profile.issueDate')}</th>
                                            <th className="p-4 font-medium">{t('clients.profile.amount')}</th>
                                            <th className="p-4 font-medium">{t('common.status')}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {invoices.slice(0, 10).map(inv => (
                                            <tr key={inv.id} className="hover:bg-gray-50/50">
                                                <td className="p-4 font-medium text-gray-900">{inv.invoice_number}</td>
                                                <td className="p-4 text-gray-600">{new Date(inv.issue_date).toLocaleDateString()}</td>
                                                <td className="p-4 font-bold text-gray-900">${Number(inv.amount).toFixed(2)}</td>
                                                <td className="p-4">
                                                    {inv.status ? (
                                                        <span
                                                            className="inline-flex px-2 py-0.5 rounded text-[11px] font-medium border"
                                                            style={{
                                                                backgroundColor: `${inv.status.color_code}15`,
                                                                color: inv.status.color_code,
                                                                borderColor: `${inv.status.color_code}40`
                                                            }}
                                                        >
                                                            {inv.status.name}
                                                        </span>
                                                    ) : (
                                                        <span className="text-gray-400">-</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            {/* Mobile */}
                            <div className="md:hidden grid grid-cols-1 gap-3 p-4">
                                {invoices.slice(0, 10).map(inv => (
                                    <div key={inv.id} className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex flex-col space-y-2">
                                        <div className="flex justify-between items-center">
                                            <span className="font-semibold text-gray-900">{inv.invoice_number}</span>
                                            {inv.status ? (
                                                <span
                                                    className="inline-flex px-2 py-0.5 rounded text-[11px] font-medium border shrink-0"
                                                    style={{
                                                        backgroundColor: `${inv.status.color_code}15`,
                                                        color: inv.status.color_code,
                                                        borderColor: `${inv.status.color_code}40`
                                                    }}
                                                >
                                                    {inv.status.name}
                                                </span>
                                            ) : (
                                                <span className="text-gray-400">-</span>
                                            )}
                                        </div>
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-gray-500">{new Date(inv.issue_date).toLocaleDateString()}</span>
                                            <span className="font-bold text-gray-900">${Number(inv.amount).toFixed(2)}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

            </div>

            {/* Inventory Modal */}
            {isInventoryModalOpen && client && (
                <ClientServicesModal
                    client={client}
                    onClose={() => {
                        setIsInventoryModalOpen(false);
                        fetchClientData(client.id);
                    }}
                />
            )}
        </div>
    );
}
