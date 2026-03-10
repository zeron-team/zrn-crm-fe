import { useState, useEffect } from "react";
import { Newspaper, Plus, Pin, Calendar, User, Tag, Trash2, Edit3, X, Save, Image, Search } from "lucide-react";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";

const API_BASE = import.meta.env.VITE_API_URL?.replace("/api/v1", "") || "";

const CATEGORY_COLORS: Record<string, string> = {
    "General": "bg-blue-100 text-blue-700",
    "RRHH": "bg-violet-100 text-violet-700",
    "Tecnología": "bg-cyan-100 text-cyan-700",
    "Ventas": "bg-emerald-100 text-emerald-700",
    "Finanzas": "bg-amber-100 text-amber-700",
    "Operaciones": "bg-orange-100 text-orange-700",
    "Logística": "bg-teal-100 text-teal-700",
    "Comunicaciones": "bg-pink-100 text-pink-700",
};

const ALL_CATEGORIES = Object.keys(CATEGORY_COLORS);

interface NewsItem {
    id: number;
    title: string;
    content: string;
    category: string;
    image_url: string | null;
    is_pinned: boolean;
    author_id: number;
    author?: { id: number; full_name?: string; email: string; avatar_url?: string };
    created_at: string;
    updated_at: string;
}

function getCategoryColor(cat: string) {
    return CATEGORY_COLORS[cat] || "bg-gray-100 text-gray-700";
}

function formatDate(dt: string) {
    return new Date(dt).toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

// ─── Editor Modal ──────────────────────────────────────────
function NewsEditor({ article, onSave, onClose }: {
    article: Partial<NewsItem> | null;
    onSave: (data: any) => void;
    onClose: () => void;
}) {
    const [form, setForm] = useState({
        title: article?.title || "",
        content: article?.content || "",
        category: article?.category || "General",
        is_pinned: article?.is_pinned || false,
    });

    return (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <h2 className="text-lg font-black text-gray-900">
                        {article?.id ? "Editar Noticia" : "Nueva Noticia"}
                    </h2>
                    <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center">
                        <X size={18} />
                    </button>
                </div>
                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-xs text-gray-500 mb-1 font-medium">Título</label>
                        <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
                            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500"
                            placeholder="Título de la noticia..." />
                    </div>
                    <div>
                        <label className="block text-xs text-gray-500 mb-1 font-medium">Contenido</label>
                        <textarea value={form.content} onChange={e => setForm({ ...form, content: e.target.value })}
                            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 min-h-[150px] resize-none"
                            placeholder="Contenido de la noticia..." />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs text-gray-500 mb-1 font-medium">Categoría</label>
                            <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 bg-white">
                                {ALL_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <div className="flex items-end pb-1">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" checked={form.is_pinned} onChange={e => setForm({ ...form, is_pinned: e.target.checked })}
                                    className="w-4 h-4 rounded border-gray-300 text-indigo-600" />
                                <span className="text-sm text-gray-700 font-medium flex items-center gap-1">
                                    <Pin size={14} /> Fijar como destacada
                                </span>
                            </label>
                        </div>
                    </div>
                </div>
                <div className="px-6 py-4 bg-gray-50 rounded-b-2xl border-t border-gray-100 flex justify-end gap-3">
                    <button onClick={onClose}
                        className="px-5 py-2.5 text-sm font-bold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50">
                        Cancelar
                    </button>
                    <button onClick={() => onSave(form)}
                        className="px-5 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl hover:from-indigo-500 hover:to-purple-500 flex items-center gap-2">
                        <Save size={14} /> {article?.id ? "Guardar" : "Publicar"}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Main Home / News Feed ─────────────────────────────────
export default function Home() {
    const { user } = useAuth();
    const [news, setNews] = useState<NewsItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeCategory, setActiveCategory] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [editor, setEditor] = useState<{ article: Partial<NewsItem> | null } | null>(null);
    const [imageUploadId, setImageUploadId] = useState<number | null>(null);

    const isAdmin = (user?.role || "").includes("admin") || (user?.role || "").includes("superadmin");

    const fetchNews = (cat?: string | null) => {
        const params = cat ? `?category=${encodeURIComponent(cat)}` : "";
        api.get(`/news/${params}`).then(r => {
            setNews(r.data);
            setLoading(false);
        }).catch(() => setLoading(false));
    };

    useEffect(() => { fetchNews(activeCategory); }, [activeCategory]);

    const handleSave = async (formData: any) => {
        try {
            if (editor?.article?.id) {
                await api.put(`/news/${editor.article.id}`, formData);
            } else {
                await api.post("/news/", formData);
            }
            setEditor(null);
            fetchNews(activeCategory);
        } catch (err: any) {
            alert(err?.response?.data?.detail || "Error al guardar");
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("¿Eliminar esta noticia?")) return;
        await api.delete(`/news/${id}`);
        fetchNews(activeCategory);
    };

    const handleImageUpload = async (newsId: number, file: File) => {
        const fd = new FormData();
        fd.append("file", file);
        try {
            await api.post(`/news/${newsId}/image`, fd, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            fetchNews(activeCategory);
        } catch (err: any) {
            alert(err?.response?.data?.detail || "Error al subir imagen");
        }
        setImageUploadId(null);
    };

    const pinnedNews = news.filter(n => n.is_pinned);
    const regularNews = news.filter(n => !n.is_pinned);
    const filteredRegular = searchQuery
        ? regularNews.filter(n => n.title.toLowerCase().includes(searchQuery.toLowerCase()) || n.content.toLowerCase().includes(searchQuery.toLowerCase()))
        : regularNews;

    // Gather unique categories from actual data
    const usedCategories = [...new Set(news.map(n => n.category))].sort();

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 px-6 py-8">
                <div className="max-w-6xl mx-auto">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-3xl font-black text-white flex items-center gap-3">
                                <Newspaper size={32} /> Noticias
                            </h1>
                            <p className="text-white/70 text-sm mt-1">Novedades y comunicados de la empresa</p>
                        </div>
                        {isAdmin && (
                            <button onClick={() => setEditor({ article: null })}
                                className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm text-white font-bold px-5 py-2.5 rounded-xl hover:bg-white/30 transition-all border border-white/20">
                                <Plus size={18} /> Nueva Noticia
                            </button>
                        )}
                    </div>

                    {/* Category pills */}
                    <div className="flex flex-wrap gap-2 mt-5">
                        <button onClick={() => setActiveCategory(null)}
                            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${!activeCategory ? 'bg-white text-indigo-700 shadow-lg' : 'bg-white/15 text-white hover:bg-white/25'}`}>
                            Todas
                        </button>
                        {(usedCategories.length > 0 ? usedCategories : ALL_CATEGORIES.slice(0, 4)).map(cat => (
                            <button key={cat} onClick={() => setActiveCategory(cat)}
                                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${activeCategory === cat ? 'bg-white text-indigo-700 shadow-lg' : 'bg-white/15 text-white hover:bg-white/25'}`}>
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-6 py-8">
                {/* Search */}
                <div className="relative mb-6">
                    <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 bg-white shadow-sm"
                        placeholder="Buscar noticias..." />
                </div>

                {loading && (
                    <div className="flex items-center justify-center py-20">
                        <div className="animate-spin rounded-full h-10 w-10 border-4 border-indigo-500 border-t-transparent" />
                    </div>
                )}

                {!loading && news.length === 0 && (
                    <div className="text-center py-20">
                        <Newspaper size={48} className="mx-auto text-gray-300 mb-4" />
                        <h3 className="text-lg font-bold text-gray-500">No hay noticias aún</h3>
                        <p className="text-sm text-gray-400 mt-1">
                            {isAdmin ? "Creá la primera noticia con el botón de arriba" : "Pronto habrá novedades"}
                        </p>
                    </div>
                )}

                {/* Pinned News */}
                {pinnedNews.length > 0 && (
                    <div className="mb-8">
                        <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                            <Pin size={14} /> Destacadas
                        </h2>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                            {pinnedNews.map(n => (
                                <div key={n.id} className="bg-white rounded-2xl border-2 border-indigo-100 shadow-lg overflow-hidden hover:shadow-xl transition-all group">
                                    {n.image_url && (
                                        <div className="h-48 overflow-hidden">
                                            <img src={`${API_BASE}${n.image_url}`} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                        </div>
                                    )}
                                    <div className="p-6">
                                        <div className="flex items-start justify-between gap-3 mb-3">
                                            <div className="flex items-center gap-2">
                                                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${getCategoryColor(n.category)}`}>
                                                    {n.category}
                                                </span>
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 flex items-center gap-1">
                                                    <Pin size={10} /> Fijada
                                                </span>
                                            </div>
                                            {isAdmin && (
                                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => { const input = document.createElement('input'); input.type = 'file'; input.accept = 'image/*'; input.onchange = (e: any) => handleImageUpload(n.id, e.target.files[0]); input.click(); }}
                                                        className="w-7 h-7 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400"><Image size={14} /></button>
                                                    <button onClick={() => setEditor({ article: n })}
                                                        className="w-7 h-7 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400"><Edit3 size={14} /></button>
                                                    <button onClick={() => handleDelete(n.id)}
                                                        className="w-7 h-7 rounded-lg hover:bg-red-50 flex items-center justify-center text-red-400"><Trash2 size={14} /></button>
                                                </div>
                                            )}
                                        </div>
                                        <h3 className="text-xl font-black text-gray-900 mb-2">{n.title}</h3>
                                        <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{n.content}</p>
                                        <div className="flex items-center gap-3 mt-4 text-xs text-gray-400">
                                            <span className="flex items-center gap-1">
                                                <User size={12} /> {n.author?.full_name || n.author?.email || "Admin"}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Calendar size={12} /> {n.created_at ? formatDate(n.created_at) : ""}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Regular News */}
                {filteredRegular.length > 0 && (
                    <div>
                        {pinnedNews.length > 0 && (
                            <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                                <Newspaper size={14} /> Últimas Noticias
                            </h2>
                        )}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                            {filteredRegular.map(n => (
                                <div key={n.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-lg hover:border-gray-200 transition-all group">
                                    {n.image_url && (
                                        <div className="h-36 overflow-hidden">
                                            <img src={`${API_BASE}${n.image_url}`} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                        </div>
                                    )}
                                    <div className="p-5">
                                        <div className="flex items-start justify-between gap-2 mb-2">
                                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${getCategoryColor(n.category)}`}>
                                                {n.category}
                                            </span>
                                            {isAdmin && (
                                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => { const input = document.createElement('input'); input.type = 'file'; input.accept = 'image/*'; input.onchange = (e: any) => handleImageUpload(n.id, e.target.files[0]); input.click(); }}
                                                        className="w-6 h-6 rounded hover:bg-gray-100 flex items-center justify-center text-gray-400"><Image size={12} /></button>
                                                    <button onClick={() => setEditor({ article: n })}
                                                        className="w-6 h-6 rounded hover:bg-gray-100 flex items-center justify-center text-gray-400"><Edit3 size={12} /></button>
                                                    <button onClick={() => handleDelete(n.id)}
                                                        className="w-6 h-6 rounded hover:bg-red-50 flex items-center justify-center text-red-400"><Trash2 size={12} /></button>
                                                </div>
                                            )}
                                        </div>
                                        <h3 className="text-base font-bold text-gray-900 mb-2 line-clamp-2">{n.title}</h3>
                                        <p className="text-xs text-gray-500 leading-relaxed line-clamp-3 whitespace-pre-wrap">{n.content}</p>
                                        <div className="flex items-center gap-3 mt-3 text-[11px] text-gray-400">
                                            <span className="flex items-center gap-1">
                                                <User size={11} /> {n.author?.full_name || n.author?.email || "Admin"}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Calendar size={11} /> {n.created_at ? formatDate(n.created_at) : ""}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Editor Modal */}
            {editor && <NewsEditor article={editor.article} onSave={handleSave} onClose={() => setEditor(null)} />}
        </div>
    );
}
