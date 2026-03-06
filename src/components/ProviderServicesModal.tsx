import { useState, useEffect } from "react";
import api from "../api/client";
import { Plus, Pencil, Trash2, X, ShieldAlert, BadgeDollarSign, CalendarDays, BellPlus, CreditCard, FileText, Upload, ChevronDown, ChevronUp, FolderTree, Package } from "lucide-react";
import { useTranslation } from "react-i18next";

interface Provider {
    id: number;
    name: string;
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
    notify_days_before: number;
    status: string;
    product_name: string | null;
    product_family: string | null;
    product_category: string | null;
    product_subcategory: string | null;
}

interface ServicePayment {
    id: number;
    provider_service_id: number;
    period_month: number;
    period_year: number;
    amount: number;
    currency: string;
    exchange_rate: number | null;
    amount_ars: number | null;
    payment_date: string;
    invoice_number: string | null;
    receipt_file: string | null;
    created_at: string | null;
    created_by: string | null;
    updated_at: string | null;
    updated_by: string | null;
}

interface ProductItem {
    id: number;
    name: string;
    description: string | null;
    price: number;
    currency: string;
    family: string | null;
    category: string | null;
    subcategory: string | null;
}

interface TreeSubcategory { id: number; name: string }
interface TreeCategory { id: number; name: string; subcategories: TreeSubcategory[] }
interface TreeFamily { id: number; name: string; categories: TreeCategory[] }

interface ProviderServicesModalProps {
    provider: Provider;
    onClose: () => void;
}

export default function ProviderServicesModal({ provider, onClose }: ProviderServicesModalProps) {
    const { t } = useTranslation();
    const [services, setServices] = useState<ProviderService[]>([]);
    const [loading, setLoading] = useState(true);

    // Products catalog & category tree for filtering
    const [allProducts, setAllProducts] = useState<ProductItem[]>([]);
    const [familyTree, setFamilyTree] = useState<TreeFamily[]>([]);

    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingServiceId, setEditingServiceId] = useState<number | null>(null);

    // Filter state
    const [filterFamily, setFilterFamily] = useState("");
    const [filterCategory, setFilterCategory] = useState("");
    const [filterSubcategory, setFilterSubcategory] = useState("");

    const [formData, setFormData] = useState({
        product_id: null as number | null,
        name: "",
        cost_price: "",
        currency: "USD",
        billing_cycle: "Monthly",
        expiration_date: new Date().toISOString().split('T')[0],
        notify_days_before: "3",
        status: "Active"
    });

    // Payment registration state
    const [servicePayments, setServicePayments] = useState<Record<number, ServicePayment[]>>({});
    const [paymentFormServiceId, setPaymentFormServiceId] = useState<number | null>(null);
    const [expandedPayments, setExpandedPayments] = useState<number | null>(null);
    const [paymentForm, setPaymentForm] = useState({
        period_month: new Date().getMonth() + 1,
        period_year: new Date().getFullYear(),
        amount: "",
        payment_date: new Date().toISOString().split('T')[0],
        invoice_number: ""
    });
    const [paymentFile, setPaymentFile] = useState<File | null>(null);
    const [editingPaymentId, setEditingPaymentId] = useState<number | null>(null);

    useEffect(() => {
        fetchData();
        fetchProducts();
        fetchCategoryTree();
    }, [provider.id]);

    const fetchData = async () => {
        try {
            const res = await api.get(`/provider-services/provider/${provider.id}`);
            setServices(res.data);
            const svcs = res.data as ProviderService[];
            const paymentsMap: Record<number, ServicePayment[]> = {};
            await Promise.all(svcs.map(async (s) => {
                try {
                    const pRes = await api.get(`/service-payments/service/${s.id}`);
                    paymentsMap[s.id] = pRes.data;
                } catch { paymentsMap[s.id] = []; }
            }));
            setServicePayments(paymentsMap);
        } catch (error) {
            console.error("Failed to fetch provider services", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchProducts = async () => {
        try {
            const res = await api.get("/products/");
            setAllProducts(res.data);
        } catch (error) {
            console.error("Failed to fetch products", error);
        }
    };

    const fetchCategoryTree = async () => {
        try {
            const res = await api.get("/categories/tree");
            setFamilyTree(res.data);
        } catch (error) {
            console.error("Failed to fetch category tree", error);
        }
    };

    // Derived filter options from tree
    const selectedFamNode = familyTree.find(f => f.name === filterFamily);
    const categoryOptions = selectedFamNode?.categories || [];
    const selectedCatNode = categoryOptions.find(c => c.name === filterCategory);
    const subcategoryOptions = selectedCatNode?.subcategories || [];

    // Filter products by selected category path
    const filteredProducts = allProducts.filter(p => {
        if (filterFamily && p.family !== filterFamily) return false;
        if (filterCategory && p.category !== filterCategory) return false;
        if (filterSubcategory && p.subcategory !== filterSubcategory) return false;
        return true;
    });

    const handleFamilyFilterChange = (val: string) => {
        setFilterFamily(val);
        setFilterCategory("");
        setFilterSubcategory("");
    };
    const handleCategoryFilterChange = (val: string) => {
        setFilterCategory(val);
        setFilterSubcategory("");
    };

    const handleProductSelect = (productId: number | null) => {
        if (productId) {
            const product = allProducts.find(p => p.id === productId);
            if (product) {
                setFormData(prev => ({
                    ...prev,
                    product_id: product.id,
                    cost_price: prev.cost_price || String(product.price || 0),
                    currency: product.currency || prev.currency
                }));
                return;
            }
        }
        setFormData(prev => ({ ...prev, product_id: null }));
    };

    const handleOpenForm = (service?: ProviderService) => {
        if (service) {
            setEditingServiceId(service.id);
            // Pre-populate filters from the linked product's category
            setFilterFamily(service.product_family || "");
            setFilterCategory(service.product_category || "");
            setFilterSubcategory(service.product_subcategory || "");
            setFormData({
                product_id: service.product_id,
                name: service.name || "",
                cost_price: service.cost_price.toString(),
                currency: service.currency || "USD",
                billing_cycle: service.billing_cycle || "Monthly",
                expiration_date: service.expiration_date,
                notify_days_before: service.notify_days_before.toString(),
                status: service.status
            });
        } else {
            setEditingServiceId(null);
            setFilterFamily("");
            setFilterCategory("");
            setFilterSubcategory("");
            setFormData({
                product_id: null,
                name: "",
                cost_price: "",
                currency: "USD",
                billing_cycle: "Monthly",
                expiration_date: new Date().toISOString().split('T')[0],
                notify_days_before: "3",
                status: "Active"
            });
        }
        setIsFormOpen(true);
    };

    const handleDelete = async (id: number) => {
        if (confirm(t('serviceModal.confirmDeleteProvider'))) {
            try {
                await api.delete(`/provider-services/${id}`);
                fetchData();
            } catch (error) {
                console.error("Delete failed", error);
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const payload = {
            provider_id: provider.id,
            product_id: formData.product_id || null,
            name: formData.name || null,
            cost_price: parseFloat(formData.cost_price) || 0,
            currency: formData.currency,
            billing_cycle: formData.billing_cycle,
            expiration_date: formData.expiration_date,
            notify_days_before: parseInt(formData.notify_days_before) || 0,
            status: formData.status
        };
        try {
            if (editingServiceId) {
                await api.put(`/provider-services/${editingServiceId}`, payload);
            } else {
                await api.post("/provider-services/", payload);
            }
            setIsFormOpen(false);
            fetchData();
        } catch (error) {
            console.error("Save failed", error);
            alert(t('serviceModal.saveErrorProvider'));
        }
    };

    const handleOpenPaymentForm = (service: ProviderService, payment?: ServicePayment) => {
        setIsFormOpen(false);
        setPaymentFormServiceId(service.id);
        if (payment) {
            setEditingPaymentId(payment.id);
            setPaymentForm({
                period_month: payment.period_month,
                period_year: payment.period_year,
                amount: String(payment.amount),
                payment_date: payment.payment_date ? payment.payment_date.split('T')[0] : new Date().toISOString().split('T')[0],
                invoice_number: payment.invoice_number || ""
            });
        } else {
            setEditingPaymentId(null);
            setPaymentForm({
                period_month: new Date().getMonth() + 1,
                period_year: new Date().getFullYear(),
                amount: String(service.cost_price),
                payment_date: new Date().toISOString().split('T')[0],
                invoice_number: ""
            });
        }
        setPaymentFile(null);
    };

    const handleSubmitPayment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!paymentFormServiceId) return;
        try {
            if (editingPaymentId) {
                // Edit existing payment
                await api.put(`/service-payments/${editingPaymentId}`, {
                    amount: Number(paymentForm.amount),
                    payment_date: new Date(paymentForm.payment_date).toISOString(),
                    invoice_number: paymentForm.invoice_number || null,
                    updated_by: 'admin'
                });
            } else {
                // Create new payment
                const res = await api.post('/service-payments/', {
                    provider_service_id: paymentFormServiceId,
                    period_month: paymentForm.period_month,
                    period_year: paymentForm.period_year,
                    amount: Number(paymentForm.amount),
                    payment_date: new Date(paymentForm.payment_date).toISOString(),
                    invoice_number: paymentForm.invoice_number || null,
                    created_by: 'admin'
                });
                if (paymentFile) {
                    const fd = new FormData();
                    fd.append('file', paymentFile);
                    await api.post(`/service-payments/${res.data.id}/upload`, fd, {
                        headers: { 'Content-Type': 'multipart/form-data' }
                    });
                }
            }
            setPaymentFormServiceId(null);
            setEditingPaymentId(null);
            fetchData();
        } catch (error) {
            console.error('Failed to save payment', error);
        }
    };

    const handleDeletePayment = async (paymentId: number) => {
        if (!confirm(t('serviceModal.confirmDeletePayment'))) return;
        try {
            await api.delete(`/service-payments/${paymentId}`);
            fetchData();
        } catch (error) {
            console.error('Failed to delete payment', error);
        }
    };

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    /** Build the display label for a service */
    const getServiceDisplayName = (service: ProviderService) => {
        const pathParts: string[] = [];
        if (service.product_family) pathParts.push(service.product_family);
        if (service.product_category) pathParts.push(service.product_category);
        if (service.product_subcategory) pathParts.push(service.product_subcategory);
        const categoryPath = pathParts.join(" › ");

        return (
            <div>
                {categoryPath && (
                    <div className="text-xs text-indigo-500 font-medium flex items-center gap-1 mb-0.5">
                        <FolderTree size={11} />
                        {categoryPath}
                    </div>
                )}
                {service.product_name && (
                    <div className="font-bold text-gray-900 flex items-center gap-1.5">
                        <Package size={13} className="text-blue-500" />
                        {service.product_name}
                    </div>
                )}
                {service.name && (
                    <div className="text-sm text-gray-500 mt-0.5">{service.name}</div>
                )}
                {!service.product_name && !service.name && (
                    <div className="font-bold text-gray-900">—</div>
                )}
            </div>
        );
    };

    return (
        <div className="fixed inset-0 z-[60] flex p-4 bg-gray-900/50 backdrop-blur-sm sm:items-center justify-center">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-5xl flex flex-col h-full sm:h-auto sm:max-h-[90vh] overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-blue-600 to-purple-600">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center"><ShieldAlert size={20} className="text-white" /></div>
                        <div>
                            <h2 className="text-lg font-bold text-white">{t('serviceModal.providerServices', { name: provider.name })}</h2>
                            <p className="text-blue-100 text-xs">{t('serviceModal.providerServicesDesc')}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors">
                        <X size={18} className="text-white" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex flex-col sm:flex-row flex-1 overflow-hidden">
                    {/* List Section */}
                    <div className={`flex-1 flex flex-col overflow-hidden ${(isFormOpen || paymentFormServiceId) ? 'hidden sm:flex sm:w-1/2 border-r border-gray-100' : 'w-full'}`}>
                        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-white">
                            <h3 className="font-semibold text-gray-700">{t('serviceModal.activeSubscriptions')}</h3>
                            <button onClick={() => handleOpenForm()} className="flex items-center space-x-1 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors">
                                <Plus size={16} />
                                <span>{t('serviceModal.addService')}</span>
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 bg-gray-50/30">
                            {loading ? (
                                <p className="text-center text-gray-500 py-8">{t('serviceModal.loadingServices')}</p>
                            ) : services.length === 0 ? (
                                <div className="text-center py-12 px-4">
                                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-indigo-100 text-indigo-600 mb-3">
                                        <BadgeDollarSign size={24} />
                                    </div>
                                    <p className="text-gray-500 font-medium">{t('serviceModal.noProviderServices')}</p>
                                    <p className="text-sm text-gray-400 mt-1">{t('serviceModal.noProviderServicesHint')}</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {services.map(service => (
                                        <div key={service.id} className="bg-white border text-left border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
                                            <div className="flex justify-between items-start mb-2">
                                                {getServiceDisplayName(service)}
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ml-2 shrink-0 ${service.status === "Active" ? "bg-green-100 text-green-700" : service.status === "Cancelled" ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-700"}`}>
                                                    {service.status}
                                                </span>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 mb-3">
                                                <div className="flex items-center bg-gray-50 p-1.5 rounded border border-gray-100">
                                                    <BadgeDollarSign size={14} className="mr-1.5 text-green-600" />
                                                    <span className="font-medium text-gray-900">{service.currency === 'USD' ? 'u$d' : service.currency === 'EUR' ? '€' : 'AR$'} {Number(service.cost_price).toFixed(2)} {t('serviceModal.cost')}</span>
                                                </div>
                                                <div className="flex items-center bg-orange-50 p-1.5 rounded border border-orange-100">
                                                    <CalendarDays size={14} className="mr-1.5 text-orange-600" />
                                                    <span className="font-medium text-orange-900">{t('serviceModal.renews')} {new Date(service.expiration_date).toLocaleDateString()}</span>
                                                    <span className="ml-1 opacity-75 hidden sm:inline"> ({service.billing_cycle || 'Monthly'})</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center text-[11px] text-indigo-600 bg-indigo-50/50 px-2 py-1 rounded w-fit mb-3">
                                                <BellPlus size={12} className="mr-1" />
                                                {t('serviceModal.alertDays', { days: service.notify_days_before })}
                                            </div>
                                            <div className="flex justify-between items-center pt-2 border-t border-gray-50">
                                                <button onClick={() => handleOpenPaymentForm(service)} className="flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition-colors border border-emerald-200">
                                                    <CreditCard size={13} />
                                                    {t('serviceModal.registerPayment')}
                                                </button>
                                                <div className="flex items-center space-x-2">
                                                    {(servicePayments[service.id]?.length || 0) > 0 && (
                                                        <button onClick={() => setExpandedPayments(expandedPayments === service.id ? null : service.id)} className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded">
                                                            <FileText size={12} />
                                                            {servicePayments[service.id].length} {t('serviceModal.payments')}
                                                            {expandedPayments === service.id ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                                                        </button>
                                                    )}
                                                    <button onClick={() => handleOpenForm(service)} className="text-gray-400 hover:text-blue-600 p-1"><Pencil size={14} /></button>
                                                    <button onClick={() => handleDelete(service.id)} className="text-gray-400 hover:text-red-600 p-1"><Trash2 size={14} /></button>
                                                </div>
                                            </div>
                                            {expandedPayments === service.id && servicePayments[service.id]?.length > 0 && (
                                                <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
                                                    {servicePayments[service.id].map(p => (
                                                        <div key={p.id} className="bg-gray-50 rounded-lg px-3 py-2 text-xs">
                                                            <div className="flex items-center justify-between">
                                                                <div className="flex items-center gap-3">
                                                                    <span className="font-bold text-gray-700">{monthNames[p.period_month - 1]} {p.period_year}</span>
                                                                    <span className="text-gray-500">{new Date(p.payment_date).toLocaleDateString()}</span>
                                                                    <span className="font-bold text-emerald-700">{p.currency || 'USD'} {Number(p.amount).toFixed(2)}</span>
                                                                    {p.amount_ars && p.currency !== 'ARS' && (
                                                                        <span className="text-blue-600 text-[10px]">≈ ARS {Number(p.amount_ars).toLocaleString(undefined, { minimumFractionDigits: 2 })} (TC: {Number(p.exchange_rate || 1).toFixed(2)})</span>
                                                                    )}
                                                                    {p.invoice_number && <span className="text-blue-600">#{p.invoice_number}</span>}
                                                                    {p.receipt_file && <a href={p.receipt_file} target="_blank" rel="noreferrer" className="text-indigo-600 hover:text-indigo-800 underline">{t('serviceModal.receipt')}</a>}
                                                                </div>
                                                                <div className="flex items-center gap-1">
                                                                    <button onClick={() => handleOpenPaymentForm(service, p)} className="text-gray-400 hover:text-blue-600 p-1" title="Editar pago"><Pencil size={12} /></button>
                                                                    <button onClick={() => handleDeletePayment(p.id)} className="text-gray-400 hover:text-red-500 p-1"><Trash2 size={12} /></button>
                                                                </div>
                                                            </div>
                                                            {p.updated_by && (
                                                                <div className="text-[10px] text-amber-600 mt-1">
                                                                    ✏️ Editado por {p.updated_by} {p.updated_at ? `el ${new Date(p.updated_at).toLocaleDateString('es-AR')}` : ''}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Service Form */}
                    {isFormOpen && (
                        <div className="flex-1 flex flex-col w-full sm:w-1/2 bg-white overflow-hidden z-10 border-l border-gray-100">
                            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                                <h3 className="font-bold text-gray-800">
                                    {editingServiceId ? t('serviceModal.editContracted') : t('serviceModal.registerCost')}
                                </h3>
                                <button onClick={() => setIsFormOpen(false)} className="sm:hidden text-gray-500 hover:text-gray-700"><X size={20} /></button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                                <form id="providerServiceForm" onSubmit={handleSubmit} className="space-y-4">
                                    {/* Product Path Filter + Selector */}
                                    <div className="p-4 bg-indigo-50/50 rounded-xl border border-indigo-100 space-y-3">
                                        <label className="block text-sm font-bold text-indigo-900 flex items-center gap-1.5">
                                            <FolderTree size={15} className="text-indigo-600" />
                                            {t('serviceModal.productPath')}
                                        </label>

                                        {/* Filter dropdowns */}
                                        <div className="grid grid-cols-3 gap-2">
                                            <div>
                                                <label className="block text-[10px] font-medium text-gray-500 mb-1 uppercase tracking-wider">{t('serviceModal.selectFamily')}</label>
                                                <select value={filterFamily} onChange={(e) => handleFamilyFilterChange(e.target.value)} className="w-full px-2 py-1.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm">
                                                    <option value="">{t('serviceModal.allFamilies')}</option>
                                                    {familyTree.map(f => <option key={f.id} value={f.name}>{f.name}</option>)}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-medium text-gray-500 mb-1 uppercase tracking-wider">{t('serviceModal.selectCategory')}</label>
                                                <select value={filterCategory} onChange={(e) => handleCategoryFilterChange(e.target.value)} disabled={!filterFamily} className="w-full px-2 py-1.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm disabled:opacity-50">
                                                    <option value="">{t('serviceModal.allCategories')}</option>
                                                    {categoryOptions.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-medium text-gray-500 mb-1 uppercase tracking-wider">{t('serviceModal.selectSubcategory')}</label>
                                                <select value={filterSubcategory} onChange={(e) => setFilterSubcategory(e.target.value)} disabled={!filterCategory} className="w-full px-2 py-1.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm disabled:opacity-50">
                                                    <option value="">{t('serviceModal.allSubcategories')}</option>
                                                    {subcategoryOptions.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                                                </select>
                                            </div>
                                        </div>

                                        {/* Product selector */}
                                        <div>
                                            <label className="block text-xs font-medium text-gray-600 mb-1 flex items-center gap-1">
                                                <Package size={12} className="text-blue-500" />
                                                {t('serviceModal.selectProduct')}
                                            </label>
                                            <select
                                                value={formData.product_id ?? ""}
                                                onChange={(e) => handleProductSelect(e.target.value ? Number(e.target.value) : null)}
                                                className="w-full px-3 py-2 bg-white border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium"
                                            >
                                                <option value="">{t('serviceModal.selectProductPlaceholder')}</option>
                                                {filteredProducts.map(p => (
                                                    <option key={p.id} value={p.id}>
                                                        {p.name} {p.price ? `(${p.currency} ${Number(p.price).toFixed(2)})` : ''}
                                                    </option>
                                                ))}
                                            </select>
                                            {filteredProducts.length === 0 && (filterFamily || filterCategory || filterSubcategory) && (
                                                <p className="text-xs text-amber-600 mt-1">{t('serviceModal.noProductsMatch')}</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Custom Alias */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">{t('serviceModal.customAlias')}</label>
                                        <input
                                            type="text"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            placeholder={t('serviceModal.customAliasPlaceholder')}
                                            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">{t('serviceModal.currency')}</label>
                                            <select required value={formData.currency} onChange={(e) => setFormData({ ...formData, currency: e.target.value })} className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none">
                                                <option value="USD">USD - Dólar</option>
                                                <option value="EUR">EUR - Euro</option>
                                                <option value="ARS">ARS - Peso Argentino</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">{t('serviceModal.costPrice')}</label>
                                            <div className="relative">
                                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                    <span className="text-gray-500">{formData.currency === 'USD' ? '$' : formData.currency === 'EUR' ? '€' : '$'}</span>
                                                </div>
                                                <input type="number" step="0.01" min="0" required value={formData.cost_price} onChange={(e) => setFormData({ ...formData, cost_price: e.target.value })} placeholder="0.00" className="w-full pl-8 pr-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">{t('serviceModal.billingCycle')}</label>
                                            <select value={formData.billing_cycle} onChange={(e) => setFormData({ ...formData, billing_cycle: e.target.value })} className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none">
                                                <option value="Monthly">{t('serviceModal.monthly')}</option>
                                                <option value="Bimonthly">{t('serviceModal.bimonthly')}</option>
                                                <option value="Yearly">{t('serviceModal.yearly')}</option>
                                                <option value="One-time">{t('serviceModal.oneTime')}</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">{t('serviceModal.contractDate')}</label>
                                            <input type="date" required value={formData.expiration_date} onChange={(e) => setFormData({ ...formData, expiration_date: e.target.value })} className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">{t('common.status')}</label>
                                            <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none">
                                                <option value="Active">{t('serviceModal.statusActive')}</option>
                                                <option value="Cancelled">{t('serviceModal.statusCancelled')}</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="pt-4 border-t border-gray-100">
                                        <label className="block text-sm font-bold text-gray-900 mb-2 flex items-center">
                                            <BellPlus size={16} className="text-indigo-600 mr-2" />
                                            {t('serviceModal.smartNotification')}
                                        </label>
                                        <p className="text-xs text-gray-500 mb-3">{t('serviceModal.smartNotificationDesc')}</p>
                                        <div className="flex items-center space-x-3">
                                            <span className="text-sm font-medium text-gray-700">{t('serviceModal.alertMe')}</span>
                                            <input type="number" min="0" max="365" required value={formData.notify_days_before} onChange={(e) => setFormData({ ...formData, notify_days_before: e.target.value })} className="w-20 px-3 py-1.5 bg-white border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none text-center" />
                                            <span className="text-sm font-medium text-gray-700">{t('serviceModal.daysBeforeExpiration')}</span>
                                        </div>
                                    </div>
                                </form>
                            </div>

                            <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end space-x-3">
                                <button type="button" onClick={() => setIsFormOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg font-medium transition-colors">{t('serviceModal.cancel')}</button>
                                <button form="providerServiceForm" type="submit" className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:shadow-md text-white rounded-lg font-medium transition-all shadow-sm">{t('serviceModal.save')}</button>
                            </div>
                        </div>
                    )}

                    {/* Payment Form */}
                    {paymentFormServiceId && (
                        <div className="flex-1 flex flex-col w-full sm:w-1/2 bg-white overflow-hidden z-10 border-l border-gray-100">
                            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-emerald-50">
                                <h3 className="font-bold text-emerald-800 flex items-center gap-2">
                                    <CreditCard size={18} />
                                    {editingPaymentId ? 'Editar Pago' : t('serviceModal.registerPayment')}
                                </h3>
                                <button onClick={() => setPaymentFormServiceId(null)} className="text-gray-500 hover:text-gray-700"><X size={20} /></button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                                <p className="text-sm text-gray-500 mb-4">
                                    {services.find(s => s.id === paymentFormServiceId)?.product_name || services.find(s => s.id === paymentFormServiceId)?.name || "—"}
                                </p>
                                <form id="paymentForm" onSubmit={handleSubmitPayment} className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">{t('serviceModal.paymentMonth')}</label>
                                            <select value={paymentForm.period_month} onChange={(e) => setPaymentForm({ ...paymentForm, period_month: Number(e.target.value) })} className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none">
                                                {monthNames.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">{t('serviceModal.paymentYear')}</label>
                                            <select value={paymentForm.period_year} onChange={(e) => setPaymentForm({ ...paymentForm, period_year: Number(e.target.value) })} className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none">
                                                {[...Array(5)].map((_, i) => { const y = new Date().getFullYear() - 2 + i; return <option key={y} value={y}>{y}</option>; })}
                                            </select>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">{t('serviceModal.paymentDate')}</label>
                                        <input type="date" required value={paymentForm.payment_date} onChange={(e) => setPaymentForm({ ...paymentForm, payment_date: e.target.value })} className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">{t('serviceModal.paymentAmount')}</label>
                                        <input type="number" step="0.01" min="0" required value={paymentForm.amount} onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })} className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">{t('serviceModal.invoiceNumber')}</label>
                                        <input type="text" value={paymentForm.invoice_number} onChange={(e) => setPaymentForm({ ...paymentForm, invoice_number: e.target.value })} placeholder="e.g. INV-2026-001" className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">{t('serviceModal.receiptFile')}</label>
                                        <label className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg cursor-pointer transition-colors text-sm border border-gray-200">
                                            <Upload size={14} />
                                            {paymentFile ? paymentFile.name : t('serviceModal.chooseFile')}
                                            <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" onChange={(e) => setPaymentFile(e.target.files?.[0] || null)} />
                                        </label>
                                    </div>
                                </form>
                            </div>
                            <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end space-x-3">
                                <button type="button" onClick={() => setPaymentFormServiceId(null)} className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg font-medium transition-colors">{t('serviceModal.cancel')}</button>
                                <button form="paymentForm" type="submit" className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:shadow-md text-white rounded-lg font-medium transition-all shadow-sm">{t('serviceModal.savePayment')}</button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
