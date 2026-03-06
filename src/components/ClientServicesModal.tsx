import { useState, useEffect } from "react";
import api from "../api/client";
import { Plus, Pencil, Trash2, X, Box, CheckCircle, Clock } from "lucide-react";
import { useTranslation } from "react-i18next";

interface Product {
    id: number;
    name: string;
    description: string;
    price: number;
    type: string;
}

interface Client {
    id: number;
    name: string;
}

interface ClientService {
    id: number;
    client_id: number;
    product_id: number;
    name: string;
    status: string;
    billing_cycle: string;
    currency: string;
    characteristics: Record<string, any>;
    start_date: string;
    end_date: string | null;
}

interface ClientServicesModalProps {
    client: Client;
    onClose: () => void;
}

export default function ClientServicesModal({ client, onClose }: ClientServicesModalProps) {
    const { t } = useTranslation();
    const [services, setServices] = useState<ClientService[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);

    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingServiceId, setEditingServiceId] = useState<number | null>(null);

    // Dynamic characteristics
    const [charList, setCharList] = useState<{ key: string, value: string }[]>([]);

    const [formData, setFormData] = useState({
        product_id: "",
        name: "",
        status: "Active",
        billing_cycle: "Monthly",
        currency: "ARS",
        start_date: new Date().toISOString().split('T')[0],
        end_date: "",
    });

    useEffect(() => {
        fetchData();
    }, [client.id]);

    const fetchData = async () => {
        try {
            const [servRes, prodRes] = await Promise.all([
                api.get(`/client-services/client/${client.id}`),
                api.get('/products/')
            ]);
            setServices(servRes.data);
            setProducts(prodRes.data);
        } catch (error) {
            console.error("Failed to fetch inventory", error);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenForm = (service?: ClientService) => {
        if (service) {
            setEditingServiceId(service.id);
            setFormData({
                product_id: service.product_id ? service.product_id.toString() : "",
                name: service.name,
                status: service.status,
                billing_cycle: service.billing_cycle,
                currency: service.currency || "ARS",
                start_date: service.start_date,
                end_date: service.end_date || "",
            });
            // convert record to array
            const chars = Object.entries(service.characteristics || {}).map(([key, value]) => ({ key, value: String(value) }));
            setCharList(chars);
        } else {
            setEditingServiceId(null);
            setFormData({
                product_id: "",
                name: "",
                status: "Active",
                billing_cycle: "Monthly",
                currency: "ARS",
                start_date: new Date().toISOString().split('T')[0],
                end_date: "",
            });
            setCharList([]);
        }
        setIsFormOpen(true);
    };

    const handleDelete = async (id: number) => {
        if (confirm(t('serviceModal.confirmDeleteClient'))) {
            try {
                await api.delete(`/client-services/${id}`);
                fetchData();
            } catch (error) {
                console.error("Delete failed", error);
            }
        }
    };

    const addCharacteristic = () => {
        setCharList([...charList, { key: "", value: "" }]);
    };

    const updateCharacteristic = (index: number, field: 'key' | 'value', val: string) => {
        const newChars = [...charList];
        newChars[index][field] = val;
        setCharList(newChars);
    };

    const removeCharacteristic = (index: number) => {
        setCharList(charList.filter((_, i) => i !== index));
    };

    // Auto-populate characteristics based on product keywords to help the user
    const handleProductChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const pid = e.target.value;
        const selectedProd = products.find(p => p.id.toString() === pid);

        setFormData({
            ...formData,
            product_id: pid,
            name: selectedProd ? selectedProd.name : formData.name // auto-fill name
        });

        // Pre-populate characteristic templates based on keywords
        if (!editingServiceId && selectedProd) {
            const lowerName = selectedProd.name.toLowerCase();
            if (lowerName.includes("server") || lowerName.includes("servidor") || lowerName.includes("hosting")) {
                setCharList([
                    { key: "IP Address", value: "" },
                    { key: "Domain / URL", value: "" },
                    { key: "OS", value: "Ubuntu 22.04" }
                ]);
            } else if (lowerName.includes("dev") || lowerName.includes("desarrollo") || lowerName.includes("horas")) {
                setCharList([
                    { key: "Horas Mensuales", value: "40" },
                    { key: "Repositorio", value: "github.com/" }
                ]);
            } else if (lowerName.includes("seo") || lowerName.includes("marketing")) {
                setCharList([
                    { key: "Campaña", value: "" },
                    { key: "Presupuesto Mensual", value: "" }
                ]);
            } else {
                setCharList([]);
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // convert array to record
        const charRecord: Record<string, string> = {};
        charList.forEach(c => {
            if (c.key.trim()) charRecord[c.key.trim()] = c.value;
        });

        const payload = {
            client_id: client.id,
            product_id: formData.product_id ? parseInt(formData.product_id) : null,
            name: formData.name,
            status: formData.status,
            billing_cycle: formData.billing_cycle,
            currency: formData.currency,
            characteristics: charRecord,
            start_date: formData.start_date,
            end_date: formData.end_date || null
        };

        try {
            if (editingServiceId) {
                await api.put(`/client-services/${editingServiceId}`, payload);
            } else {
                await api.post("/client-services/", payload);
            }
            setIsFormOpen(false);
            fetchData();
        } catch (error) {
            console.error("Save failed", error);
            alert(t('serviceModal.saveError'));
        }
    };

    const getProductName = (pid: number) => {
        return products.find(p => p.id === pid)?.name || t('serviceModal.unknownProduct');
    };

    return (
        <div className="fixed inset-0 z-[60] flex p-4 bg-gray-900/50 backdrop-blur-sm sm:items-center justify-center">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-5xl flex flex-col h-full sm:h-auto sm:max-h-[90vh] overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-blue-600 to-purple-600">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center"><Box size={20} className="text-white" /></div>
                        <div>
                            <h2 className="text-lg font-bold text-white">Client Inventory: {client.name}</h2>
                            <p className="text-blue-100 text-xs">{t('serviceModal.clientInventoryDesc')}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors">
                        <X size={18} className="text-white" />
                    </button>
                </div>

                {/* Content area split */}
                <div className="flex flex-col sm:flex-row flex-1 overflow-hidden">

                    {/* List Section */}
                    <div className={`flex-1 flex flex-col overflow-hidden ${isFormOpen ? 'hidden sm:flex sm:w-1/2 border-r border-gray-100' : 'w-full'}`}>
                        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-white">
                            <h3 className="font-semibold text-gray-700">{t('serviceModal.activeServices')}</h3>
                            <button
                                onClick={() => handleOpenForm()}
                                className="flex items-center space-x-1 bg-purple-100 hover:bg-purple-200 text-purple-700 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                            >
                                <Plus size={16} />
                                <span>{t('serviceModal.addNew')}</span>
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 bg-gray-50/30">
                            {loading ? (
                                <p className="text-center text-gray-500 py-8">{t('serviceModal.loadingInventory')}</p>
                            ) : services.length === 0 ? (
                                <div className="text-center py-12 px-4">
                                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-purple-100 text-purple-600 mb-3">
                                        <Box size={24} />
                                    </div>
                                    <p className="text-gray-500 font-medium">{t('serviceModal.noClientServices')}</p>
                                    <p className="text-sm text-gray-400 mt-1">{t('serviceModal.noClientServicesHint')}</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {services.map(service => (
                                        <div key={service.id} className="bg-white border text-left border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
                                            <div className="flex justify-between items-start mb-2">
                                                <div>
                                                    <h4 className="font-bold text-gray-900">{service.name}</h4>
                                                    <p className="text-xs font-medium text-purple-600">{getProductName(service.product_id)}</p>
                                                </div>
                                                <div className="flex items-center space-x-1">
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${service.status === "Active" ? "bg-green-100 text-green-700" :
                                                        service.status === "Suspended" ? "bg-red-100 text-red-700" :
                                                            "bg-gray-100 text-gray-700"
                                                        }`}>
                                                        {service.status}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="flex items-center text-xs text-gray-500 mb-3 space-x-3">
                                                <span className="flex items-center"><Clock size={12} className="mr-1" /> {service.billing_cycle}</span>
                                                <span className="flex items-center font-semibold text-gray-700">{service.currency}</span>
                                                <span className="flex items-center"><CheckCircle size={12} className="mr-1" /> {t('serviceModal.started')} {new Date(service.start_date).toLocaleDateString()}</span>
                                            </div>

                                            {/* Characteristics preview */}
                                            {Object.keys(service.characteristics || {}).length > 0 && (
                                                <div className="bg-gray-50 rounded-lg p-2.5 mb-3 border border-gray-100">
                                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                                        {Object.entries(service.characteristics).map(([key, value]) => (
                                                            <div key={key} className="truncate">
                                                                <span className="text-gray-400 font-medium">{key}:</span> <span className="text-gray-700 font-medium" title={String(value)}>{String(value)}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            <div className="flex justify-end space-x-2 pt-2 border-t border-gray-50">
                                                <button onClick={() => handleOpenForm(service)} className="text-gray-400 hover:text-blue-600 p-1">
                                                    <Pencil size={14} />
                                                </button>
                                                <button onClick={() => handleDelete(service.id)} className="text-gray-400 hover:text-red-600 p-1">
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Form Section */}
                    {isFormOpen && (
                        <div className="flex-1 flex flex-col w-full sm:w-1/2 bg-white overflow-hidden z-10">
                            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                                <h3 className="font-bold text-gray-800">
                                    {editingServiceId ? t('serviceModal.editService') : t('serviceModal.addNewService')}
                                </h3>
                                {/* Mobile back button */}
                                <button onClick={() => setIsFormOpen(false)} className="sm:hidden text-gray-500 hover:text-gray-700">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                                <form id="serviceForm" onSubmit={handleSubmit} className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="col-span-2">
                                            <label className="block text-sm font-medium text-gray-700 mb-1">{t('serviceModal.baseProduct')}</label>
                                            <select
                                                required
                                                value={formData.product_id}
                                                onChange={handleProductChange}
                                                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                                            >
                                                <option value="">{t('serviceModal.selectProduct')}</option>
                                                {products.map(p => (
                                                    <option key={p.id} value={p.id}>{p.name}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="col-span-2">
                                            <label className="block text-sm font-medium text-gray-700 mb-1">{t('serviceModal.customRefName')}</label>
                                            <input
                                                type="text"
                                                required
                                                value={formData.name}
                                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                                placeholder="e.g. Primary Web Server"
                                                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">{t('common.status')}</label>
                                            <select
                                                value={formData.status}
                                                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                                            >
                                                <option value="Active">{t('serviceModal.statusActive')}</option>
                                                <option value="Suspended">{t('serviceModal.statusSuspended')}</option>
                                                <option value="Cancelled">{t('serviceModal.statusCancelled')}</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">{t('serviceModal.billingCycle')}</label>
                                            <select
                                                value={formData.billing_cycle}
                                                onChange={(e) => setFormData({ ...formData, billing_cycle: e.target.value })}
                                                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                                            >
                                                <option value="Monthly">{t('serviceModal.monthly')}</option>
                                                <option value="Quarterly">{t('serviceModal.quarterly')}</option>
                                                <option value="Annually">{t('serviceModal.annually')}</option>
                                                <option value="One-Time">{t('serviceModal.oneTime')}</option>
                                                <option value="Hourly">{t('serviceModal.hourly')}</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">{t('serviceModal.currency')}</label>
                                            <select
                                                value={formData.currency}
                                                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                                                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                                            >
                                                <option value="ARS">ARS</option>
                                                <option value="USD">USD</option>
                                                <option value="EUR">EUR</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">{t('serviceModal.startDate')}</label>
                                            <input
                                                type="date"
                                                required
                                                value={formData.start_date}
                                                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                                                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">{t('serviceModal.endDate')}</label>
                                            <input
                                                type="date"
                                                value={formData.end_date}
                                                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                                                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                                            />
                                        </div>
                                    </div>

                                    {/* Dynamic Characteristics Section */}
                                    <div className="pt-4 border-t border-gray-100 mt-4">
                                        <div className="flex justify-between items-center mb-3">
                                            <label className="block text-sm font-bold text-gray-900">{t('serviceModal.characteristics')}</label>
                                            <button
                                                type="button"
                                                onClick={addCharacteristic}
                                                className="text-xs font-semibold text-purple-600 hover:text-purple-800 bg-purple-50 px-2 py-1 rounded"
                                            >
                                                {t('serviceModal.addField')}
                                            </button>
                                        </div>

                                        <div className="space-y-2">
                                            {charList.length === 0 && (
                                                <p className="text-xs text-gray-500 italic">{t('serviceModal.noCustomFields')}</p>
                                            )}
                                            {charList.map((char, index) => (
                                                <div key={index} className="flex space-x-2 items-center">
                                                    <input
                                                        type="text"
                                                        placeholder="Name (e.g. IP)"
                                                        value={char.key}
                                                        onChange={(e) => updateCharacteristic(index, 'key', e.target.value)}
                                                        className="flex-1 w-1/3 px-2 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded focus:bg-white focus:ring-1 focus:ring-purple-500 outline-none"
                                                    />
                                                    <input
                                                        type="text"
                                                        placeholder="Value (e.g. 192.168.x.x)"
                                                        value={char.value}
                                                        onChange={(e) => updateCharacteristic(index, 'value', e.target.value)}
                                                        className="flex-1 w-2/3 px-2 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded focus:bg-white focus:ring-1 focus:ring-purple-500 outline-none"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => removeCharacteristic(index)}
                                                        className="text-red-400 hover:text-red-600 p-1"
                                                    >
                                                        <X size={16} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </form>
                            </div>

                            <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end space-x-3">
                                <button
                                    type="button"
                                    onClick={() => setIsFormOpen(false)}
                                    className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg font-medium transition-colors"
                                >
                                    {t('serviceModal.cancel')}
                                </button>
                                <button
                                    form="serviceForm"
                                    type="submit"
                                    className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:shadow-md text-white rounded-lg font-medium transition-all shadow-sm"
                                >
                                    {t('serviceModal.save')}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
