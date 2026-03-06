import { useState, useEffect, useCallback, useMemo } from "react";
import api from "../api/client";
import { Plus, Edit2, Trash2, ChevronRight, FolderTree, Folder, FileText, Search, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { useTranslation } from "react-i18next";

interface Family { id: number; name: string; code: string | null; description: string | null }
interface Category { id: number; name: string; code: string | null; description: string | null; family_id: number }
interface Subcategory { id: number; name: string; code: string | null; description: string | null; category_id: number }

type SortField = "name" | "code";
type SortDir = "asc" | "desc";

export default function Categories() {
    const { t } = useTranslation();
    const [families, setFamilies] = useState<Family[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [subcategories, setSubcategories] = useState<Subcategory[]>([]);

    const [selectedFamily, setSelectedFamily] = useState<Family | null>(null);
    const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);

    // Modal state
    const [modal, setModal] = useState<{ type: "family" | "category" | "subcategory"; mode: "add" | "edit"; item?: any } | null>(null);
    const [formName, setFormName] = useState("");
    const [formCode, setFormCode] = useState("");
    const [formDesc, setFormDesc] = useState("");

    const fetchFamilies = useCallback(async () => {
        const res = await api.get("/categories/families");
        setFamilies(res.data);
    }, []);

    const fetchCategories = useCallback(async (famId: number) => {
        const res = await api.get(`/categories/?family_id=${famId}`);
        setCategories(res.data);
    }, []);

    const fetchSubcategories = useCallback(async (catId: number) => {
        const res = await api.get(`/categories/subcategories?category_id=${catId}`);
        setSubcategories(res.data);
    }, []);

    useEffect(() => { fetchFamilies(); }, [fetchFamilies]);

    useEffect(() => {
        if (selectedFamily) {
            fetchCategories(selectedFamily.id);
            setSelectedCategory(null);
            setSubcategories([]);
        } else {
            setCategories([]);
            setSubcategories([]);
        }
    }, [selectedFamily, fetchCategories]);

    useEffect(() => {
        if (selectedCategory) {
            fetchSubcategories(selectedCategory.id);
        } else {
            setSubcategories([]);
        }
    }, [selectedCategory, fetchSubcategories]);

    // CRUD handlers
    const openAdd = (type: "family" | "category" | "subcategory") => {
        setFormName(""); setFormCode(""); setFormDesc("");
        setModal({ type, mode: "add" });
    };

    const openEdit = (type: "family" | "category" | "subcategory", item: any) => {
        setFormName(item.name); setFormCode(item.code || ""); setFormDesc(item.description || "");
        setModal({ type, mode: "edit", item });
    };

    const handleSave = async () => {
        if (!modal) return;
        const { type, mode, item } = modal;
        const payload: any = { name: formName, code: formCode || null, description: formDesc || null };

        if (type === "category") payload.family_id = selectedFamily!.id;
        if (type === "subcategory") payload.category_id = selectedCategory!.id;

        if (mode === "add") {
            if (type === "family") await api.post("/categories/families", payload);
            else if (type === "category") await api.post("/categories/", payload);
            else await api.post("/categories/subcategories", payload);
        } else {
            if (type === "family") await api.put(`/categories/families/${item.id}`, payload);
            else if (type === "category") await api.put(`/categories/${item.id}`, payload);
            else await api.put(`/categories/subcategories/${item.id}`, payload);
        }

        setModal(null);
        if (type === "family") { await fetchFamilies(); }
        else if (type === "category" && selectedFamily) { await fetchCategories(selectedFamily.id); }
        else if (type === "subcategory" && selectedCategory) { await fetchSubcategories(selectedCategory.id); }
    };

    const handleDelete = async (type: "family" | "category" | "subcategory", id: number) => {
        if (!confirm(t('categories.confirmDelete'))) return;
        if (type === "family") {
            await api.delete(`/categories/families/${id}`);
            if (selectedFamily?.id === id) { setSelectedFamily(null); }
            await fetchFamilies();
        } else if (type === "category") {
            await api.delete(`/categories/${id}`);
            if (selectedCategory?.id === id) { setSelectedCategory(null); }
            if (selectedFamily) await fetchCategories(selectedFamily.id);
        } else {
            await api.delete(`/categories/subcategories/${id}`);
            if (selectedCategory) await fetchSubcategories(selectedCategory.id);
        }
    };

    const ListPanel = ({ title, icon, items, selected, onSelect, onAdd, onEdit, onDelete, emptyMsg, level }: {
        title: string; icon: React.ReactNode; items: any[]; selected: any; onSelect: (item: any) => void;
        onAdd: () => void; onEdit: (item: any) => void; onDelete: (id: number) => void;
        emptyMsg: string; level: number;
    }) => {
        const [searchQuery, setSearchQuery] = useState("");
        const [sortField, setSortField] = useState<SortField>("name");
        const [sortDir, setSortDir] = useState<SortDir>("asc");

        const toggleSort = (field: SortField) => {
            if (sortField === field) {
                setSortDir(prev => prev === "asc" ? "desc" : "asc");
            } else {
                setSortField(field);
                setSortDir("asc");
            }
        };

        const filteredAndSorted = useMemo(() => {
            let result = [...items];

            // Search filter
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                result = result.filter(item =>
                    item.name?.toLowerCase().includes(q) ||
                    item.code?.toLowerCase().includes(q) ||
                    item.description?.toLowerCase().includes(q)
                );
            }

            // Sort
            result.sort((a, b) => {
                const aVal = (a[sortField] || "").toLowerCase();
                const bVal = (b[sortField] || "").toLowerCase();
                const cmp = aVal.localeCompare(bVal);
                return sortDir === "asc" ? cmp : -cmp;
            });

            return result;
        }, [items, searchQuery, sortField, sortDir]);

        const colors = [
            { bg: "bg-blue-50", activeBg: "bg-blue-100", activeBorder: "border-blue-400", text: "text-blue-700", icon: "text-blue-600", btn: "bg-blue-600 hover:bg-blue-700", ring: "focus:ring-blue-400" },
            { bg: "bg-violet-50", activeBg: "bg-violet-100", activeBorder: "border-violet-400", text: "text-violet-700", icon: "text-violet-600", btn: "bg-violet-600 hover:bg-violet-700", ring: "focus:ring-violet-400" },
            { bg: "bg-emerald-50", activeBg: "bg-emerald-100", activeBorder: "border-emerald-400", text: "text-emerald-700", icon: "text-emerald-600", btn: "bg-emerald-600 hover:bg-emerald-700", ring: "focus:ring-emerald-400" },
        ];
        const c = colors[level];

        const SortIcon = ({ field }: { field: SortField }) => {
            if (sortField !== field) return <ArrowUpDown size={12} className="text-gray-300" />;
            return sortDir === "asc" ? <ArrowUp size={12} className={c.text} /> : <ArrowDown size={12} className={c.text} />;
        };

        return (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col min-h-[300px]">
                {/* Header */}
                <div className={`flex items-center justify-between p-4 border-b border-gray-100 ${c.bg}`}>
                    <div className="flex items-center space-x-2">
                        <span className={c.icon}>{icon}</span>
                        <h3 className="font-semibold text-gray-900">{title}</h3>
                        <span className="text-xs text-gray-400 bg-white px-2 py-0.5 rounded-full">{filteredAndSorted.length}{items.length !== filteredAndSorted.length ? `/${items.length}` : ''}</span>
                    </div>
                    <button onClick={onAdd} className={`p-1.5 text-white rounded-lg shadow-sm transition-colors ${c.btn}`}>
                        <Plus size={16} />
                    </button>
                </div>

                {/* Search + Sort bar */}
                {items.length > 0 && (
                    <div className="px-3 pt-3 pb-1 space-y-2">
                        {/* Search */}
                        <div className="relative">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder={t('categories.searchPlaceholder')}
                                className={`w-full pl-8 pr-3 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 ${c.ring} focus:border-transparent transition-all`}
                            />
                        </div>
                        {/* Sort buttons */}
                        <div className="flex items-center gap-1">
                            <span className="text-[10px] text-gray-400 uppercase tracking-wider mr-1">{t('categories.sortBy')}</span>
                            <button
                                onClick={() => toggleSort("name")}
                                className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${sortField === "name" ? `${c.bg} ${c.text}` : "text-gray-400 hover:text-gray-600"}`}
                            >
                                {t('categories.modal.name')} <SortIcon field="name" />
                            </button>
                            <button
                                onClick={() => toggleSort("code")}
                                className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${sortField === "code" ? `${c.bg} ${c.text}` : "text-gray-400 hover:text-gray-600"}`}
                            >
                                {t('categories.modal.code')} <SortIcon field="code" />
                            </button>
                        </div>
                    </div>
                )}

                {/* Items list */}
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {items.length === 0 ? (
                        <p className="text-sm text-gray-400 text-center py-8">{emptyMsg}</p>
                    ) : filteredAndSorted.length === 0 ? (
                        <p className="text-sm text-gray-400 text-center py-8">{t('categories.noResults')}</p>
                    ) : filteredAndSorted.map(item => (
                        <div
                            key={item.id}
                            onClick={() => onSelect(item)}
                            className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all group ${selected?.id === item.id
                                ? `${c.activeBg} border ${c.activeBorder} shadow-sm`
                                : "hover:bg-gray-50 border border-transparent"
                                }`}
                        >
                            <div className="flex items-center space-x-2 min-w-0 flex-1">
                                {selected?.id === item.id && <ChevronRight size={14} className={c.text} />}
                                <div className="min-w-0">
                                    <div className="flex items-center space-x-2">
                                        <p className={`font-medium text-sm truncate ${selected?.id === item.id ? c.text : "text-gray-800"}`}>{item.name}</p>
                                        {item.code && <span className="text-[10px] font-mono px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded">{item.code}</span>}
                                    </div>
                                    {item.description && <p className="text-xs text-gray-400 truncate">{item.description}</p>}
                                </div>
                            </div>
                            <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={e => { e.stopPropagation(); onEdit(item); }} className="p-1 text-gray-400 hover:text-blue-600 transition-colors"><Edit2 size={14} /></button>
                                <button onClick={e => { e.stopPropagation(); onDelete(item.id); }} className="p-1 text-gray-400 hover:text-red-600 transition-colors"><Trash2 size={14} /></button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100 gap-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-gray-900">{t('categories.title')}</h2>
                    <p className="text-sm text-gray-500">{t('categories.description')}</p>
                </div>
            </div>

            {/* Breadcrumb */}
            <div className="flex items-center space-x-2 text-sm text-gray-500 px-1">
                <FolderTree size={16} className="text-blue-600" />
                <span className={selectedFamily ? "text-blue-600 font-medium" : "text-gray-400"}>{selectedFamily?.name || t('categories.selectFamily')}</span>
                {selectedFamily && <>
                    <ChevronRight size={14} />
                    <span className={selectedCategory ? "text-violet-600 font-medium" : "text-gray-400"}>{selectedCategory?.name || t('categories.selectCategory')}</span>
                </>}
            </div>

            {/* 3-Panel Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <ListPanel
                    title={t('categories.familiesTitle')}
                    icon={<FolderTree size={18} />}
                    items={families}
                    selected={selectedFamily}
                    onSelect={setSelectedFamily}
                    onAdd={() => openAdd("family")}
                    onEdit={item => openEdit("family", item)}
                    onDelete={id => handleDelete("family", id)}
                    emptyMsg={t('categories.emptyFamilies')}
                    level={0}
                />
                <ListPanel
                    title={t('categories.categoriesTitle')}
                    icon={<Folder size={18} />}
                    items={categories}
                    selected={selectedCategory}
                    onSelect={setSelectedCategory}
                    onAdd={() => openAdd("category")}
                    onEdit={item => openEdit("category", item)}
                    onDelete={id => handleDelete("category", id)}
                    emptyMsg={selectedFamily ? t('categories.emptyCategories') : t('categories.selectFamilyFirst')}
                    level={1}
                />
                <ListPanel
                    title={t('categories.subcategoriesTitle')}
                    icon={<FileText size={18} />}
                    items={subcategories}
                    selected={null}
                    onSelect={() => { }}
                    onAdd={() => openAdd("subcategory")}
                    onEdit={item => openEdit("subcategory", item)}
                    onDelete={id => handleDelete("subcategory", id)}
                    emptyMsg={selectedCategory ? t('categories.emptySubcategories') : t('categories.selectCategoryFirst')}
                    level={2}
                />
            </div>

            {modal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setModal(null)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
                        {/* Gradient Header */}
                        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-5 text-white flex-shrink-0">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                    <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                                        <FolderTree size={22} />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-bold">{modal.mode === "add" ? t('categories.modal.addTitle') : t('categories.modal.editTitle')} {t(`categories.modal.type_${modal.type}`)}</h2>
                                        <p className="text-blue-100 text-sm">Gestión del catálogo jerárquico</p>
                                    </div>
                                </div>
                                <button onClick={() => setModal(null)} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
                                    <span className="text-xl leading-none">×</span>
                                </button>
                            </div>
                        </div>

                        <div className="p-6 space-y-6">
                            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 space-y-4">
                                <h4 className="text-xs font-semibold text-indigo-700 uppercase tracking-wide flex items-center">
                                    <FolderTree size={14} className="mr-1.5" /> Datos de la Categoría
                                </h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs text-gray-600 mb-1">{t('categories.modal.name')} *</label>
                                        <input value={formName} onChange={e => setFormName(e.target.value)} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 bg-white" placeholder={t('categories.modal.namePlaceholder')} autoFocus />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-600 mb-1">{t('categories.modal.code')}</label>
                                        <input value={formCode} onChange={e => setFormCode(e.target.value.toUpperCase())} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 bg-white font-mono" placeholder={t('categories.modal.codePlaceholder')} />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-600 mb-1">{t('categories.modal.description')}</label>
                                    <input value={formDesc} onChange={e => setFormDesc(e.target.value)} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 bg-white" placeholder={t('categories.modal.descPlaceholder')} />
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-5 border-t border-gray-100 flex justify-between items-center flex-shrink-0 bg-gray-50">
                            <button onClick={() => setModal(null)} className="px-4 py-2.5 text-gray-600 hover:text-gray-900 text-sm font-medium">{t('categories.modal.cancel')}</button>
                            <button onClick={handleSave} disabled={!formName.trim()} className="flex items-center px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-medium hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-200 transition-all disabled:opacity-50">
                                {t('categories.modal.save')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
