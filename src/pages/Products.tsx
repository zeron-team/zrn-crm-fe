import { useState, useEffect, useMemo } from "react";
import api from "../api/client";
import { Plus, Pencil, Trash2, FolderTree, Layers, Search, ArrowUpDown, ArrowUp, ArrowDown, X, Filter } from "lucide-react";
import { useTranslation } from "react-i18next";

interface Product {
    id: number;
    name: string;
    description: string;
    price: number;
    currency: string;
    category: string;
    family: string;
    subcategory: string;
    is_active: boolean;
}

interface TreeFamily { id: number; name: string; categories: TreeCategory[] }
interface TreeCategory { id: number; name: string; subcategories: TreeSubcategory[] }
interface TreeSubcategory { id: number; name: string }

type SortField = "name" | "family" | "category" | "subcategory" | "price";
type SortDir = "asc" | "desc";

export default function Products() {
    const { t } = useTranslation();
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [familyTree, setFamilyTree] = useState<TreeFamily[]>([]);

    // Search, Sort & Filter state
    const [searchQuery, setSearchQuery] = useState("");
    const [sortField, setSortField] = useState<SortField>("name");
    const [sortDir, setSortDir] = useState<SortDir>("asc");
    const [filterFamily, setFilterFamily] = useState("");
    const [filterCategory, setFilterCategory] = useState("");
    const [filterSubcategory, setFilterSubcategory] = useState("");

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProductId, setEditingProductId] = useState<number | null>(null);
    const [formData, setFormData] = useState({
        name: "",
        description: "",
        price: 0,
        currency: "ARS",
        category: "",
        family: "",
        subcategory: "",
    });

    useEffect(() => {
        fetchProducts();
        fetchFamilyTree();
    }, []);

    const fetchFamilyTree = async () => {
        try { const res = await api.get("/categories/tree"); setFamilyTree(res.data); } catch { }
    };

    // Form-level tree filtering (for modal)
    const selectedFamNode = familyTree.find(f => f.name === formData.family);
    const categoryOptions = selectedFamNode?.categories || [];
    const selectedCatNode = categoryOptions.find(c => c.name === formData.category);
    const subcategoryOptions = selectedCatNode?.subcategories || [];

    // Filter-level tree filtering (for list)
    const filterFamNode = familyTree.find(f => f.name === filterFamily);
    const filterCatOptions = filterFamNode?.categories || [];
    const filterCatNode = filterCatOptions.find(c => c.name === filterCategory);
    const filterSubOptions = filterCatNode?.subcategories || [];




    const toggleSort = (field: SortField) => {
        if (sortField === field) {
            setSortDir(prev => prev === "asc" ? "desc" : "asc");
        } else {
            setSortField(field);
            setSortDir("asc");
        }
    };

    const filteredProducts = useMemo(() => {
        let result = [...products];

        // Text search
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            result = result.filter(p =>
                p.name?.toLowerCase().includes(q) ||
                p.description?.toLowerCase().includes(q) ||
                p.family?.toLowerCase().includes(q) ||
                p.category?.toLowerCase().includes(q) ||
                p.subcategory?.toLowerCase().includes(q)
            );
        }

        // Category filters
        if (filterFamily) result = result.filter(p => p.family === filterFamily);
        if (filterCategory) result = result.filter(p => p.category === filterCategory);
        if (filterSubcategory) result = result.filter(p => p.subcategory === filterSubcategory);

        // Sort
        result.sort((a, b) => {
            let aVal: string | number;
            let bVal: string | number;
            if (sortField === "price") {
                aVal = Number(a.price) || 0;
                bVal = Number(b.price) || 0;
                return sortDir === "asc" ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
            }
            aVal = ((a as any)[sortField] || "").toLowerCase();
            bVal = ((b as any)[sortField] || "").toLowerCase();
            const cmp = (aVal as string).localeCompare(bVal as string);
            return sortDir === "asc" ? cmp : -cmp;
        });

        return result;
    }, [products, searchQuery, filterFamily, filterCategory, filterSubcategory, sortField, sortDir]);

    const hasActiveFilters = filterFamily || filterCategory || filterSubcategory;

    const clearFilters = () => {
        setFilterFamily("");
        setFilterCategory("");
        setFilterSubcategory("");
        setSearchQuery("");
    };

    const fetchProducts = async () => {
        try {
            const response = await api.get("/products/");
            setProducts(response.data);
        } catch (error) {
            console.error("Failed to fetch products", error);
        } finally {
            setLoading(false);
        }
    };

    const openAddModal = () => {
        setEditingProductId(null);
        setFormData({ name: "", description: "", price: 0, currency: "ARS", category: "", family: "", subcategory: "" });
        setIsModalOpen(true);
    };

    const openEditModal = (product: Product) => {
        setEditingProductId(product.id);
        setFormData({
            name: product.name,
            description: product.description || "",
            price: product.price || 0,
            currency: product.currency || "ARS",
            category: product.category || "",
            family: product.family || "",
            subcategory: product.subcategory || "",
        });
        setIsModalOpen(true);
    };

    const handleDelete = async (id: number) => {
        if (confirm("Are you sure you want to delete this product/service?")) {
            try {
                await api.delete(`/products/${id}`);
                fetchProducts();
            } catch (error) {
                console.error("Delete failed", error);
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingProductId) {
                await api.put(`/products/${editingProductId}`, formData);
            } else {
                await api.post("/products/", formData);
            }
            setIsModalOpen(false);
            fetchProducts();
        } catch (error) {
            console.error("Submit failed", error);
            alert("An error occurred while saving.");
        }
    };

    const SortHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
        <th
            onClick={() => toggleSort(field)}
            className="p-4 font-semibold text-gray-600 text-sm whitespace-nowrap cursor-pointer hover:text-gray-900 select-none transition-colors group"
        >
            <div className="flex items-center gap-1.5">
                {children}
                {sortField === field ? (
                    sortDir === "asc" ? <ArrowUp size={13} className="text-blue-600" /> : <ArrowDown size={13} className="text-blue-600" />
                ) : (
                    <ArrowUpDown size={13} className="text-gray-300 group-hover:text-gray-400" />
                )}
            </div>
        </th>
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-gray-900">{t('products.title')}</h2>
                    <p className="text-sm text-gray-500">{t('products.description')}</p>
                </div>
                <button
                    onClick={openAddModal}
                    className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm"
                >
                    <Plus size={18} />
                    <span>{t('products.addBtn')}</span>
                </button>
            </div>

            {/* Search & Filter Bar */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 space-y-3">
                <div className="flex flex-col sm:flex-row gap-3">
                    {/* Search */}
                    <div className="relative flex-1">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder={t('products.searchPlaceholder')}
                            className="w-full pl-10 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all"
                        />
                        {searchQuery && (
                            <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                <X size={14} />
                            </button>
                        )}
                    </div>
                </div>

                {/* Category Filters */}
                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
                        <Filter size={13} />
                        {t('products.filterBy')}
                    </div>
                    <select
                        value={filterFamily}
                        onChange={e => { setFilterFamily(e.target.value); setFilterCategory(""); setFilterSubcategory(""); }}
                        className="px-3 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-400"
                    >
                        <option value="">{t('products.allFamilies')}</option>
                        {familyTree.map(f => <option key={f.id} value={f.name}>{f.name}</option>)}
                    </select>
                    <select
                        value={filterCategory}
                        onChange={e => { setFilterCategory(e.target.value); setFilterSubcategory(""); }}
                        disabled={!filterFamily}
                        className="px-3 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-50"
                    >
                        <option value="">{t('products.allCategories')}</option>
                        {filterCatOptions.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                    </select>
                    <select
                        value={filterSubcategory}
                        onChange={e => setFilterSubcategory(e.target.value)}
                        disabled={!filterCategory}
                        className="px-3 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-50"
                    >
                        <option value="">{t('products.allSubcategories')}</option>
                        {filterSubOptions.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                    </select>
                    {hasActiveFilters && (
                        <button onClick={clearFilters} className="flex items-center gap-1 px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded transition-colors">
                            <X size={12} /> {t('products.clearFilters')}
                        </button>
                    )}
                    <span className="ml-auto text-xs text-gray-400">
                        {filteredProducts.length}{filteredProducts.length !== products.length ? `/${products.length}` : ''} {t('products.itemsCount')}
                    </span>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden w-full">
                {loading ? (
                    <div className="p-8 text-center text-gray-500">{t('products.loading')}</div>
                ) : (
                    <div>
                        {/* Desktop Table View */}
                        <div className="hidden md:block overflow-x-auto w-full">
                            <table className="w-full text-left border-collapse min-w-[600px]">
                                <thead>
                                    <tr className="bg-gray-50 border-b border-gray-100">
                                        <SortHeader field="name">{t('products.table.itemName')}</SortHeader>
                                        <SortHeader field="family">{t('products.table.family')}</SortHeader>
                                        <SortHeader field="category">{t('products.table.category')}</SortHeader>
                                        <SortHeader field="subcategory">{t('products.table.subcategory')}</SortHeader>
                                        <SortHeader field="price">{t('products.table.price')}</SortHeader>
                                        <th className="p-4 font-semibold text-gray-600 text-sm text-right whitespace-nowrap">{t('common.actions')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredProducts.map((product) => (
                                        <tr key={product.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                                            <td className="p-4">
                                                <div className="font-medium text-gray-900">{product.name}</div>
                                                {product.description && (
                                                    <div className="text-sm text-gray-500 mt-1">{product.description}</div>
                                                )}
                                            </td>
                                            <td className="p-4 text-sm text-gray-700 whitespace-nowrap">
                                                {product.family ? (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-blue-50 text-blue-700">
                                                        <FolderTree size={11} className="mr-1" />{product.family}
                                                    </span>
                                                ) : <span className="text-gray-400">—</span>}
                                            </td>
                                            <td className="p-4 text-sm text-gray-700 whitespace-nowrap">
                                                {product.category ? (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-indigo-50 text-indigo-700">
                                                        <Layers size={11} className="mr-1" />{product.category}
                                                    </span>
                                                ) : <span className="text-gray-400">—</span>}
                                            </td>
                                            <td className="p-4 text-sm text-gray-700 whitespace-nowrap">
                                                {product.subcategory ? (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-teal-50 text-teal-700">
                                                        {product.subcategory}
                                                    </span>
                                                ) : <span className="text-gray-400">—</span>}
                                            </td>
                                            <td className="p-4 font-mono font-medium text-gray-900 whitespace-nowrap">
                                                {Number(product.price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {product.currency}
                                            </td>
                                            <td className="p-4 flex justify-end space-x-2">
                                                <button
                                                    onClick={() => openEditModal(product)}
                                                    className="p-1.5 text-gray-400 hover:text-blue-600 transition-colors bg-white hover:bg-blue-50 rounded-lg shadow-sm border border-transparent hover:border-blue-100"
                                                    title={t('common.edit')}
                                                >
                                                    <Pencil size={18} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(product.id)}
                                                    className="p-1.5 text-gray-400 hover:text-red-600 transition-colors bg-white hover:bg-red-50 rounded-lg shadow-sm border border-transparent hover:border-red-100"
                                                    title={t('common.delete')}
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredProducts.length === 0 && (
                                        <tr>
                                            <td colSpan={7} className="p-8 text-center text-gray-500">
                                                {products.length === 0 ? t('products.empty') : t('products.noResults')}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile Card View */}
                        <div className="md:hidden grid grid-cols-1 gap-4 p-4 bg-gray-50">
                            {filteredProducts.map((product) => (
                                <div key={product.id} className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex flex-col space-y-4">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="font-bold text-gray-900 text-lg leading-tight">{product.name}</h3>
                                            {product.description && (
                                                <p className="text-sm text-gray-500 mt-1 line-clamp-2">{product.description}</p>
                                            )}
                                        </div>
                                    </div>

                                    {(product.category || product.family) && (
                                        <div className="flex flex-wrap gap-2">
                                            {product.family && (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-blue-50 text-blue-700">
                                                    <FolderTree size={11} className="mr-1" />{product.family}
                                                </span>
                                            )}
                                            {product.category && (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-indigo-50 text-indigo-700">
                                                    <Layers size={11} className="mr-1" />{product.category}
                                                </span>
                                            )}
                                            {product.subcategory && (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-teal-50 text-teal-700">
                                                    {product.subcategory}
                                                </span>
                                            )}
                                        </div>
                                    )}

                                    <div className="flex justify-between items-end border-t border-gray-50 pt-4 mt-auto">
                                        <div>
                                            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">{t('products.table.price')}</p>
                                            <p className="font-mono font-bold text-gray-900 text-xl">
                                                {Number(product.price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                <span className="text-sm font-medium text-gray-500 ml-1">{product.currency}</span>
                                            </p>
                                        </div>
                                        <div className="flex space-x-2">
                                            <button
                                                onClick={() => openEditModal(product)}
                                                className="p-2 text-gray-500 hover:text-blue-600 transition-colors bg-gray-50 hover:bg-blue-50 rounded-lg"
                                                title={t('common.edit')}
                                            >
                                                <Pencil size={18} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(product.id)}
                                                className="p-2 text-gray-500 hover:text-red-600 transition-colors bg-gray-50 hover:bg-red-50 rounded-lg"
                                                title={t('common.delete')}
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {filteredProducts.length === 0 && (
                                <div className="p-8 text-center text-gray-500 bg-white rounded-xl border border-dashed border-gray-300">
                                    {products.length === 0 ? t('products.empty') : t('products.noResults')}
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
                                        <Layers size={22} />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-bold">{editingProductId ? t('products.modal.editTitle') : t('products.modal.addTitle')}</h2>
                                        <p className="text-blue-100 text-sm">Catálogo de productos y servicios</p>
                                    </div>
                                </div>
                                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
                                    <span className="text-xl leading-none">×</span>
                                </button>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 p-6 space-y-6">
                            {/* Info del Producto */}
                            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 space-y-4">
                                <h4 className="text-xs font-semibold text-indigo-700 uppercase tracking-wide flex items-center">
                                    <Layers size={14} className="mr-1.5" /> Información del Producto
                                </h4>
                                <div>
                                    <label className="block text-xs text-gray-600 mb-1">{t('common.name')} *</label>
                                    <input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 bg-white" placeholder="Software License" />
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-600 mb-1">{t('common.description')}</label>
                                    <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 bg-white resize-none" rows={2} placeholder="Annual enterprise license..." />
                                </div>
                            </div>

                            {/* Categorización */}
                            <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-4">
                                <h4 className="text-xs font-semibold text-green-700 uppercase tracking-wide flex items-center">
                                    <FolderTree size={14} className="mr-1.5" /> Categorización
                                </h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs text-gray-600 mb-1">{t('products.modal.family')}</label>
                                        <select value={formData.family} onChange={(e) => setFormData({ ...formData, family: e.target.value, category: "", subcategory: "" })} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 bg-white">
                                            <option value="">{t('products.modal.familyPlaceholder')}</option>
                                            {familyTree.map(f => <option key={f.id} value={f.name}>{f.name}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-600 mb-1">{t('products.modal.category')}</label>
                                        <select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value, subcategory: "" })} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 bg-white" disabled={!formData.family}>
                                            <option value="">{t('products.modal.categoryPlaceholder')}</option>
                                            {categoryOptions.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-600 mb-1">{t('products.modal.subcategory')}</label>
                                    <select value={formData.subcategory} onChange={(e) => setFormData({ ...formData, subcategory: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 bg-white" disabled={!formData.category}>
                                        <option value="">{t('products.modal.subcategoryPlaceholder')}</option>
                                        {subcategoryOptions.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                                    </select>
                                </div>
                            </div>

                            {/* Precio */}
                            <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 space-y-4">
                                <h4 className="text-xs font-semibold text-orange-700 uppercase tracking-wide">💰 Precio</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs text-gray-600 mb-1">{t('common.price')} *</label>
                                        <div className="relative">
                                            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400 text-sm">$</span>
                                            <input type="number" step="0.01" min="0" required value={formData.price} onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })} className="w-full pl-7 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 bg-white" placeholder="0.00" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-600 mb-1">{t('products.modal.currency')}</label>
                                        <select value={formData.currency} onChange={(e) => setFormData({ ...formData, currency: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 bg-white">
                                            <option value="ARS">ARS - Pesos Argentinos</option>
                                            <option value="USD">USD - US Dollars</option>
                                            <option value="EUR">EUR - Euros</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </form>

                        {/* Footer */}
                        <div className="p-5 border-t border-gray-100 flex justify-between items-center flex-shrink-0 bg-gray-50">
                            <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2.5 text-gray-600 hover:text-gray-900 text-sm font-medium">{t('common.cancel')}</button>
                            <button onClick={handleSubmit} className="flex items-center px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-medium hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-200 transition-all">
                                {t('products.modal.saveBtn')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
