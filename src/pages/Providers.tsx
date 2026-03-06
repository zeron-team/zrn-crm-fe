import { useState, useEffect } from "react";
import api from "../api/client";
import { Plus, Pencil, Trash2, Mail, Phone, MapPin, ShieldAlert } from "lucide-react";
import ProviderServicesModal from "../components/ProviderServicesModal";
import { useTranslation, Trans } from "react-i18next";

interface Provider {
    id: number;
    name: string;
    cuit_dni: string;
    email: string;
    phone: string;
    address: string;
    is_active: boolean;
}

interface ProviderService {
    id: number;
    provider_id: number;
    product_id: number | null;
    name: string | null;
    cost_price: number;
    currency: string;
    billing_cycle: string;
    expiration_date: string;
    status: string;
    product_name: string | null;
    product_family: string | null;
    product_category: string | null;
    product_subcategory: string | null;
}

export default function Providers() {
    const { t } = useTranslation();
    const [providers, setProviders] = useState<Provider[]>([]);
    const [providerServices, setProviderServices] = useState<ProviderService[]>([]);
    const [loading, setLoading] = useState(true);

    const [usdToArs, setUsdToArs] = useState<number>(() => {
        const saved = localStorage.getItem('usdToArs');
        return saved ? parseFloat(saved) : 1000;
    });
    const [eurToArs, setEurToArs] = useState<number>(() => {
        const saved = localStorage.getItem('eurToArs');
        return saved ? parseFloat(saved) : 1100;
    });

    useEffect(() => {
        localStorage.setItem('usdToArs', usdToArs.toString());
    }, [usdToArs]);

    useEffect(() => {
        localStorage.setItem('eurToArs', eurToArs.toString());
    }, [eurToArs]);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isServicesModalOpen, setIsServicesModalOpen] = useState(false);
    const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
    const [editingProviderId, setEditingProviderId] = useState<number | null>(null);
    const [formData, setFormData] = useState({
        name: "",
        cuit_dni: "",
        email: "",
        phone: "",
        address: "",
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [providersRes, servicesRes] = await Promise.all([
                api.get("/providers/"),
                api.get("/provider-services/")
            ]);
            setProviders(providersRes.data);
            setProviderServices(servicesRes.data);
        } catch (error) {
            console.error("Failed to fetch data", error);
        } finally {
            setLoading(false);
        }
    };

    const openAddModal = () => {
        setEditingProviderId(null);
        setFormData({ name: "", cuit_dni: "", email: "", phone: "", address: "" });
        setIsModalOpen(true);
    };

    const openEditModal = (provider: Provider) => {
        setEditingProviderId(provider.id);
        setFormData({
            name: provider.name,
            cuit_dni: provider.cuit_dni || "",
            email: provider.email || "",
            phone: provider.phone || "",
            address: provider.address || "",
        });
        setIsModalOpen(true);
    };

    const handleDelete = async (id: number) => {
        if (confirm("Are you sure you want to delete this provider?")) {
            try {
                await api.delete(`/providers/${id}`);
                fetchData();
            } catch (error) {
                console.error("Delete failed", error);
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingProviderId) {
                await api.put(`/providers/${editingProviderId}`, formData);
            } else {
                await api.post("/providers/", formData);
            }
            setIsModalOpen(false);
            fetchData();
        } catch (error) {
            console.error("Submit failed", error);
            alert("An error occurred while saving the provider.");
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100 gap-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-gray-900">{t('providers.title')}</h2>
                    <p className="text-sm text-gray-500">{t('providers.description')}</p>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <div className="flex bg-gray-50 p-2 rounded-lg border border-gray-200 shadow-inner space-x-3">
                        <div className="flex items-center space-x-2">
                            <span className="text-xs font-bold text-gray-600">{t('providers.rates.usd')}</span>
                            <input
                                type="number"
                                value={usdToArs}
                                onChange={e => setUsdToArs(Number(e.target.value))}
                                className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 outline-none text-right font-medium"
                            />
                        </div>
                        <div className="flex items-center space-x-2">
                            <span className="text-xs font-bold text-gray-600">{t('providers.rates.eur')}</span>
                            <input
                                type="number"
                                value={eurToArs}
                                onChange={e => setEurToArs(Number(e.target.value))}
                                className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 outline-none text-right font-medium"
                            />
                        </div>
                    </div>

                    <button
                        onClick={openAddModal}
                        className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm whitespace-nowrap"
                    >
                        <Plus size={18} />
                        <span>{t('providers.addBtn')}</span>
                    </button>
                </div>
            </div>

            {(() => {
                const activeServices = providerServices.filter(s => s.status === 'Active');
                const now = new Date();
                const currentMonth = now.getMonth();
                const currentYear = now.getFullYear();
                const nextMonthDate = new Date(currentYear, currentMonth + 1, 1);
                const nextMonth = nextMonthDate.getMonth();
                const nextMonth_Year = nextMonthDate.getFullYear();

                const getTotals = (services: ProviderService[], targetMonth: number, targetYear: number) => {
                    return services.reduce((acc, s) => {
                        if (!s.expiration_date) return acc;
                        const exp = new Date(s.expiration_date);
                        const expMonth = exp.getUTCMonth();
                        const expYear = exp.getUTCFullYear();

                        const monthsDiff = (targetYear - expYear) * 12 + (targetMonth - expMonth);

                        if (monthsDiff < 0) return acc;

                        const cycle = s.billing_cycle || 'Monthly';
                        let isDue = false;

                        if (cycle === 'One-time') {
                            isDue = monthsDiff === 0;
                        } else if (cycle === 'Monthly') {
                            isDue = true;
                        } else if (cycle === 'Bimonthly') {
                            isDue = monthsDiff % 2 === 0;
                        } else if (cycle === 'Yearly') {
                            isDue = monthsDiff % 12 === 0;
                        } else {
                            isDue = monthsDiff === 0;
                        }

                        if (isDue) {
                            acc[s.currency] = (acc[s.currency] || 0) + Number(s.cost_price);
                        }
                        return acc;
                    }, {} as Record<string, number>);
                };

                const thisMonthTotals = getTotals(activeServices, currentMonth, currentYear);
                const nextMonthTotals = getTotals(activeServices, nextMonth, nextMonth_Year);

                const convertToArs = (totals: Record<string, number>) => {
                    let totalArs = 0;
                    if (totals['ARS']) totalArs += totals['ARS'];
                    if (totals['USD']) totalArs += totals['USD'] * usdToArs;
                    if (totals['EUR']) totalArs += totals['EUR'] * eurToArs;
                    return totalArs;
                };

                const renderCurrencyTotals = (totals: Record<string, number>) => {
                    const entries = Object.entries(totals);
                    if (entries.length === 0) return <span className="text-lg font-bold text-gray-400">0</span>;
                    return entries.map(([currency, amount]) => (
                        <div key={currency} className="flex items-center text-sm font-bold text-gray-900">
                            <span className="w-8 text-xs font-semibold text-gray-400">{currency}</span>
                            <span>{currency === 'USD' ? 'u$d' : currency === 'EUR' ? '€' : 'AR$'} {amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                    ));
                };

                return (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                                <h3 className="text-sm font-medium text-gray-500 mb-1">{t('providers.stats.active')}</h3>
                                <p className="text-2xl font-bold text-gray-900">{activeServices.length}</p>
                            </div>
                            <div className="bg-white rounded-xl shadow-sm border border-orange-100 p-5">
                                <h3 className="text-sm font-medium text-orange-600 mb-1">{t('providers.stats.dueThisMonth')}</h3>
                                <div className="space-y-1 mt-2">
                                    {renderCurrencyTotals(thisMonthTotals)}
                                </div>
                            </div>
                            <div className="bg-white rounded-xl shadow-sm border border-blue-100 p-5">
                                <h3 className="text-sm font-medium text-blue-600 mb-1">{t('providers.stats.dueNextMonth')}</h3>
                                <div className="space-y-1 mt-2">
                                    {renderCurrencyTotals(nextMonthTotals)}
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 mb-6">
                            <div className="bg-gradient-to-br from-orange-50 to-orange-100/50 rounded-xl shadow-sm border border-orange-200 p-5 flex justify-between items-center">
                                <div>
                                    <h3 className="text-sm font-medium text-orange-800 mb-1">{t('providers.stats.dueThisMonthArs')}</h3>
                                    <p className="text-2xl font-bold text-orange-900">AR$ {convertToArs(thisMonthTotals).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                </div>
                                <div className="text-xs text-orange-600 opacity-75 text-right font-medium">
                                    <p>{t('providers.stats.basedOn')}{usdToArs}</p>
                                    <p>{t('providers.stats.eurRs')}{eurToArs}</p>
                                </div>
                            </div>
                            <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-xl shadow-sm border border-blue-200 p-5 flex justify-between items-center">
                                <div>
                                    <h3 className="text-sm font-medium text-blue-800 mb-1">{t('providers.stats.dueNextMonthArs')}</h3>
                                    <p className="text-2xl font-bold text-blue-900">AR$ {convertToArs(nextMonthTotals).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                </div>
                                <div className="text-xs text-blue-600 opacity-75 text-right font-medium">
                                    <p>{t('providers.stats.basedOn')}{usdToArs}</p>
                                    <p>{t('providers.stats.eurRs')}{eurToArs}</p>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                            {loading ? (
                                <div className="col-span-full p-8 text-center text-gray-500">{t('providers.loading')}</div>
                            ) : providers.length === 0 ? (
                                <div className="col-span-full p-8 text-center text-gray-500 bg-white rounded-xl shadow-sm border border-gray-100">
                                    {t('providers.empty')}
                                </div>
                            ) : (
                                providers.map((provider) => {
                                    const providerActiveServices = activeServices.filter(s => s.provider_id === provider.id);
                                    const providerThisMonth = getTotals(providerActiveServices, currentMonth, currentYear);
                                    const providerNextMonth = getTotals(providerActiveServices, nextMonth, nextMonth_Year);

                                    return (
                                        <div key={provider.id} className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow border border-gray-100 p-6 flex flex-col h-full">
                                            <div className="flex justify-between items-start mb-4">
                                                <div>
                                                    <h3 className="text-lg font-bold text-gray-900">{provider.name}</h3>
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium mt-1 ${provider.is_active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                                                        }`}>
                                                        {provider.is_active ? t('common.active') : t('common.inactive')}
                                                    </span>
                                                </div>
                                                <div className="flex space-x-1">
                                                    <button onClick={() => openEditModal(provider)} className="p-1.5 text-gray-400 hover:text-blue-600 transition-colors">
                                                        <Pencil size={16} />
                                                    </button>
                                                    <button onClick={() => handleDelete(provider.id)} className="p-1.5 text-gray-400 hover:text-red-600 transition-colors">
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="space-y-3 flex-1 text-sm text-gray-600">
                                                {provider.cuit_dni && (
                                                    <div className="flex items-center">
                                                        <span className="font-medium mr-2 w-16">{t('providers.card.cuit')}</span>
                                                        {provider.cuit_dni}
                                                    </div>
                                                )}
                                                {provider.email && (
                                                    <div className="flex items-center">
                                                        <Mail size={16} className="mr-2 text-gray-400" />
                                                        {provider.email}
                                                    </div>
                                                )}
                                                {provider.phone && (
                                                    <div className="flex items-center">
                                                        <Phone size={16} className="mr-2 text-gray-400" />
                                                        {provider.phone}
                                                    </div>
                                                )}
                                                {provider.address && (
                                                    <div className="flex items-start">
                                                        <MapPin size={16} className="mr-2 text-gray-400 mt-0.5" />
                                                        <span className="flex-1">{provider.address}</span>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="mt-4 pt-4 border-t border-gray-50 space-y-2">
                                                <div className="bg-gray-50 rounded-lg p-3">
                                                    <div className="grid grid-cols-2 gap-3 text-xs">
                                                        <div>
                                                            <div className="text-gray-500 font-medium mb-1">{t('providers.card.dueThis')}</div>
                                                            <div className="space-y-0.5">{renderCurrencyTotals(providerThisMonth)}</div>
                                                            {convertToArs(providerThisMonth) > 0 && <div className="mt-1.5 pt-1.5 border-t border-gray-200 text-[10px] text-gray-500 font-bold">≈ AR$ {convertToArs(providerThisMonth).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div>}
                                                        </div>
                                                        <div>
                                                            <div className="text-gray-500 font-medium mb-1">{t('providers.card.dueNext')}</div>
                                                            <div className="space-y-0.5">{renderCurrencyTotals(providerNextMonth)}</div>
                                                            {convertToArs(providerNextMonth) > 0 && <div className="mt-1.5 pt-1.5 border-t border-gray-200 text-[10px] text-gray-500 font-bold">≈ AR$ {convertToArs(providerNextMonth).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div>}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <button
                                                onClick={() => { setSelectedProvider(provider); setIsServicesModalOpen(true); }}
                                                className="mt-4 flex items-center justify-center w-full space-x-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-medium py-2 rounded-lg transition-colors text-sm"
                                            >
                                                <ShieldAlert size={16} />
                                                <span><Trans i18nKey="providers.card.manageServices" count={providerActiveServices.length} /></span>
                                            </button>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </>
                );
            })()}

            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
                        {/* Gradient Header */}
                        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-5 text-white flex-shrink-0">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                    <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                                        <ShieldAlert size={22} />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-bold">{editingProviderId ? t('providers.modal.editTitle') : t('providers.modal.addTitle')}</h2>
                                        <p className="text-blue-100 text-sm">Gestión de proveedores y datos fiscales</p>
                                    </div>
                                </div>
                                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
                                    <span className="text-xl leading-none">×</span>
                                </button>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 p-6 space-y-6">
                            {/* Datos de la Empresa */}
                            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 space-y-4">
                                <h4 className="text-xs font-semibold text-indigo-700 uppercase tracking-wide flex items-center">
                                    <ShieldAlert size={14} className="mr-1.5" /> Datos de la Empresa
                                </h4>
                                <div>
                                    <label className="block text-xs text-gray-600 mb-1">{t('providers.modal.companyName')} *</label>
                                    <input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 bg-white" placeholder="Tech Supplies Inc." />
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-600 mb-1">CUIT / DNI</label>
                                    <input type="text" value={formData.cuit_dni} onChange={(e) => setFormData({ ...formData, cuit_dni: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 bg-white" placeholder="30-87654321-9" />
                                </div>
                            </div>

                            {/* Contacto */}
                            <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-4">
                                <h4 className="text-xs font-semibold text-green-700 uppercase tracking-wide flex items-center">
                                    <Mail size={14} className="mr-1.5" /> Contacto
                                </h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs text-gray-600 mb-1">Email</label>
                                        <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 bg-white" placeholder="sales@techsupplies.com" />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-600 mb-1">Teléfono</label>
                                        <input type="text" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 bg-white" placeholder="+1 987 654 3210" />
                                    </div>
                                </div>
                            </div>

                            {/* Ubicación */}
                            <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 space-y-4">
                                <h4 className="text-xs font-semibold text-orange-700 uppercase tracking-wide flex items-center">
                                    <MapPin size={14} className="mr-1.5" /> Ubicación
                                </h4>
                                <div>
                                    <label className="block text-xs text-gray-600 mb-1">Dirección</label>
                                    <textarea value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 bg-white resize-none" rows={2} placeholder="456 Provider Ave..." />
                                </div>
                            </div>
                        </form>

                        {/* Footer */}
                        <div className="p-5 border-t border-gray-100 flex justify-between items-center flex-shrink-0 bg-gray-50">
                            <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2.5 text-gray-600 hover:text-gray-900 text-sm font-medium">{t('common.cancel')}</button>
                            <button onClick={handleSubmit} className="flex items-center px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-medium hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-200 transition-all">
                                {t('providers.modal.saveBtn')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {isServicesModalOpen && selectedProvider && (
                <ProviderServicesModal
                    provider={selectedProvider}
                    onClose={() => setIsServicesModalOpen(false)}
                />
            )}
        </div>
    );
}
