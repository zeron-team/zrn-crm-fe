import { useState, useEffect } from "react";
import {
    Newspaper, Plus, Pin, Calendar, User, Tag, Trash2, Edit3, X, Save,
    Image, Search, AlertTriangle, AlertCircle, Eye, Archive, FileEdit,
    Send, ChevronDown
} from "lucide-react";
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

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    draft: { label: "Borrador", color: "bg-gray-100 text-gray-600", icon: <FileEdit size={12} /> },
    published: { label: "Publicado", color: "bg-green-100 text-green-700", icon: <Eye size={12} /> },
    archived: { label: "Archivado", color: "bg-slate-100 text-slate-600", icon: <Archive size={12} /> },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode; border: string }> = {
    normal: { label: "Normal", color: "bg-gray-50 text-gray-500", icon: null, border: "border-gray-100" },
    important: { label: "Importante", color: "bg-amber-100 text-amber-700", icon: <AlertTriangle size={12} />, border: "border-amber-200" },
    urgent: { label: "Urgente", color: "bg-red-100 text-red-700", icon: <AlertCircle size={12} />, border: "border-red-200" },
};

interface NewsItem {
    id: number; title: string; content: string; category: string;
    image_url: string | null; is_pinned: boolean; status: string; priority: string;
    author_id: number; author?: { id: number; full_name?: string; email: string; avatar_url?: string };
    created_at: string; updated_at: string;
}

function getCatColor(c: string) { return CATEGORY_COLORS[c] || "bg-gray-100 text-gray-700"; }
function fmtDate(d: string) { return new Date(d).toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }); }

// ─── Templates ─────────────────────────────────────────────
const NEWS_TEMPLATES = [
    {
        id: "comunicado",
        name: "📢 Comunicado Oficial",
        desc: "Anuncio formal de la empresa",
        gradient: "from-indigo-500 to-blue-600",
        category: "General",
        priority: "normal",
        titleTemplate: "Comunicado: ",
        contentTemplate: "Estimado equipo,\n\nNos complace informar que [detalle del comunicado].\n\n[Desarrollo del mensaje]\n\nQuedamos a disposición ante cualquier consulta.\n\nAtentamente,\nDirección",
    },
    {
        id: "actualizacion",
        name: "🔄 Actualización de Sistema",
        desc: "Cambios técnicos o de procesos",
        gradient: "from-cyan-500 to-teal-600",
        category: "Tecnología",
        priority: "important",
        titleTemplate: "Actualización: ",
        contentTemplate: "📋 Resumen del cambio\n[Describir brevemente el cambio]\n\n🔧 Detalle técnico\n• [Punto 1]\n• [Punto 2]\n• [Punto 3]\n\n📅 Fecha efectiva\n[Fecha de implementación]\n\n⚠️ Impacto\n[Describir el impacto en los usuarios]",
    },
    {
        id: "evento",
        name: "🎉 Evento / Actividad",
        desc: "Reuniones, capacitaciones, celebraciones",
        gradient: "from-amber-500 to-orange-600",
        category: "Comunicaciones",
        priority: "normal",
        titleTemplate: "Evento: ",
        contentTemplate: "🎯 Evento\n[Nombre del evento]\n\n📅 Fecha y hora\n[Día y horario]\n\n📍 Lugar\n[Ubicación o link de videollamada]\n\n👥 Participantes\n[Quiénes deben asistir]\n\n📝 Agenda\n1. [Tema 1]\n2. [Tema 2]\n3. [Tema 3]\n\n¡Los esperamos!",
    },
    {
        id: "alerta",
        name: "🚨 Alerta Urgente",
        desc: "Avisos críticos que requieren atención inmediata",
        gradient: "from-red-500 to-rose-600",
        category: "General",
        priority: "urgent",
        titleTemplate: "⚠️ ALERTA: ",
        contentTemplate: "🚨 ALERTA IMPORTANTE\n\n[Describir la situación o problema]\n\n📌 Acciones requeridas\n• [Acción inmediata 1]\n• [Acción inmediata 2]\n\n📞 Contacto\n[A quién contactar para más información]\n\n⏰ Vigencia\n[Hasta cuándo aplica esta alerta]",
    },
];

// ─── Editor Modal ──────────────────────────────────────────
function NewsEditor({ article, onSave, onClose, onImageUploaded }: {
    article: Partial<NewsItem> | null;
    onSave: (d: any) => void;
    onClose: () => void;
    onImageUploaded?: (newsId: number, file: File) => Promise<void>;
}) {
    const isNew = !article?.id;
    const [step, setStep] = useState<"template" | "edit">(isNew ? "template" : "edit");
    const [form, setForm] = useState({
        title: article?.title || "",
        content: article?.content || "",
        category: article?.category || "General",
        is_pinned: article?.is_pinned || false,
        status: article?.status || "draft",
        priority: article?.priority || "normal",
    });
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string | null>(
        article?.image_url ? `${API_BASE}${article.image_url}` : null
    );
    const [dragging, setDragging] = useState(false);

    const selectTemplate = (t: typeof NEWS_TEMPLATES[0]) => {
        setForm({
            ...form,
            title: t.titleTemplate,
            content: t.contentTemplate,
            category: t.category,
            priority: t.priority,
        });
        setStep("edit");
    };

    const handlePhotoPick = (file: File) => {
        if (!file.type.startsWith("image/")) return;
        setPhotoFile(file);
        const url = URL.createObjectURL(file);
        setPhotoPreview(url);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file) handlePhotoPick(file);
    };

    const handleSaveWithPhoto = async () => {
        onSave({ ...form, _photoFile: photoFile });
    };

    // ─── Template Selection ───
    if (step === "template") {
        return (
            <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
                    <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                        <h2 className="text-lg font-black text-gray-900">Elegí una plantilla</h2>
                        <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center"><X size={18} /></button>
                    </div>
                    <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {NEWS_TEMPLATES.map(t => (
                            <button key={t.id} onClick={() => selectTemplate(t)}
                                className="text-left rounded-2xl border border-gray-100 overflow-hidden hover:shadow-xl transition-all group">
                                <div className={`bg-gradient-to-r ${t.gradient} p-4`}>
                                    <h3 className="text-lg font-black text-white">{t.name}</h3>
                                    <p className="text-white/70 text-xs mt-1">{t.desc}</p>
                                </div>
                                <div className="p-4">
                                    <p className="text-[11px] text-gray-400 leading-relaxed whitespace-pre-wrap line-clamp-4">{t.contentTemplate}</p>
                                </div>
                            </button>
                        ))}
                    </div>
                    <div className="px-6 py-3 bg-gray-50 rounded-b-2xl border-t border-gray-100 text-center">
                        <button onClick={() => setStep("edit")}
                            className="text-sm text-indigo-600 font-bold hover:underline">
                            O empezar desde cero →
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ─── Content Editor ───
    return (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                        {isNew && <button onClick={() => setStep("template")} className="text-xs text-indigo-600 font-bold hover:underline">← Plantillas</button>}
                        <h2 className="text-lg font-black text-gray-900">{isNew ? "Nueva Noticia" : "Editar Noticia"}</h2>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center"><X size={18} /></button>
                </div>
                <div className="p-6 space-y-4">
                    {/* Photo upload area */}
                    <div
                        onDragOver={e => { e.preventDefault(); setDragging(true); }}
                        onDragLeave={() => setDragging(false)}
                        onDrop={handleDrop}
                        className={`relative border-2 border-dashed rounded-xl transition-all cursor-pointer ${dragging ? 'border-indigo-400 bg-indigo-50' : photoPreview ? 'border-transparent' : 'border-gray-200 hover:border-indigo-300'}`}
                        onClick={() => { const i = document.createElement("input"); i.type = "file"; i.accept = "image/*"; i.onchange = (e: any) => handlePhotoPick(e.target.files[0]); i.click(); }}
                    >
                        {photoPreview ? (
                            <div className="relative">
                                <img src={photoPreview} alt="Preview" className="w-full h-48 object-cover rounded-xl" />
                                <div className="absolute inset-0 bg-black/0 hover:bg-black/30 transition-all rounded-xl flex items-center justify-center">
                                    <span className="text-white font-bold text-sm opacity-0 hover:opacity-100 transition-opacity">Cambiar foto</span>
                                </div>
                                <button onClick={(e) => { e.stopPropagation(); setPhotoFile(null); setPhotoPreview(null); }}
                                    className="absolute top-2 right-2 w-7 h-7 bg-white/90 rounded-full flex items-center justify-center shadow hover:bg-white">
                                    <X size={14} />
                                </button>
                            </div>
                        ) : (
                            <div className="py-8 text-center">
                                <Image size={32} className="mx-auto text-gray-300 mb-2" />
                                <p className="text-sm text-gray-400">Arrastrá una imagen o hacé clic para adjuntar</p>
                                <p className="text-[10px] text-gray-300 mt-1">JPG, PNG, WebP</p>
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="block text-xs text-gray-500 mb-1 font-medium">Título *</label>
                        <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
                            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                            placeholder="Título de la noticia..." />
                    </div>
                    <div>
                        <label className="block text-xs text-gray-500 mb-1 font-medium">Contenido *</label>
                        <textarea value={form.content} onChange={e => setForm({ ...form, content: e.target.value })}
                            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none min-h-[180px] resize-y"
                            placeholder="Contenido de la noticia..." />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs text-gray-500 mb-1 font-medium">Categoría</label>
                            <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-indigo-500 outline-none">
                                {ALL_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 mb-1 font-medium">Prioridad</label>
                            <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-indigo-500 outline-none">
                                <option value="normal">🔵 Normal</option>
                                <option value="important">🟡 Importante</option>
                                <option value="urgent">🔴 Urgente</option>
                            </select>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs text-gray-500 mb-1 font-medium">Estado</label>
                            <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-indigo-500 outline-none">
                                <option value="draft">📝 Borrador</option>
                                <option value="published">✅ Publicado</option>
                                <option value="archived">📦 Archivado</option>
                            </select>
                        </div>
                        <div className="flex items-end pb-1">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" checked={form.is_pinned} onChange={e => setForm({ ...form, is_pinned: e.target.checked })}
                                    className="w-4 h-4 rounded border-gray-300 text-indigo-600" />
                                <span className="text-sm text-gray-700 font-medium flex items-center gap-1"><Pin size={14} /> Fijar como destacada</span>
                            </label>
                        </div>
                    </div>
                </div>
                <div className="px-6 py-4 bg-gray-50 rounded-b-2xl border-t border-gray-100 flex flex-col sm:flex-row justify-between gap-3">
                    <div className="text-xs text-gray-400">
                        {form.status === "draft" && "💡 Los borradores solo son visibles para gestores de noticias"}
                        {form.status === "published" && "✅ Esta noticia será visible para todos los usuarios"}
                        {form.status === "archived" && "📦 Las archivadas no se muestran en el feed"}
                    </div>
                    <div className="flex gap-3">
                        <button onClick={onClose} className="px-5 py-2.5 text-sm font-bold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50">Cancelar</button>
                        <button onClick={handleSaveWithPhoto}
                            className="px-5 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl hover:from-indigo-500 hover:to-purple-500 flex items-center gap-2">
                            <Save size={14} /> {article?.id ? "Guardar" : "Crear"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── News Card ─────────────────────────────────────────────
function NewsCard({ n, canManage, large, onEdit, onDelete, onUploadImage }: {
    n: NewsItem; canManage: boolean; large?: boolean;
    onEdit: () => void; onDelete: () => void; onUploadImage: (id: number) => void;
}) {
    const pri = PRIORITY_CONFIG[n.priority] || PRIORITY_CONFIG.normal;
    const st = STATUS_CONFIG[n.status] || STATUS_CONFIG.draft;

    return (
        <div className={`bg-white rounded-2xl ${n.is_pinned ? 'border-2 border-indigo-100 shadow-lg' : `border ${pri.border} shadow-sm`} overflow-hidden hover:shadow-xl transition-all group`}>
            {n.image_url && (
                <div className={`${large ? 'h-48' : 'h-36'} overflow-hidden`}>
                    <img src={`${API_BASE}${n.image_url}`} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                </div>
            )}
            <div className={large ? "p-6" : "p-5"}>
                {/* Badges row */}
                <div className="flex items-start justify-between gap-2 mb-2 flex-wrap">
                    <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${getCatColor(n.category)}`}>{n.category}</span>
                        {n.is_pinned && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 flex items-center gap-1"><Pin size={10} /> Fijada</span>}
                        {n.priority !== "normal" && (
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 ${pri.color}`}>
                                {pri.icon} {pri.label}
                            </span>
                        )}
                        {canManage && n.status !== "published" && (
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 ${st.color}`}>
                                {st.icon} {st.label}
                            </span>
                        )}
                    </div>
                    {canManage && (
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => onUploadImage(n.id)} title="Subir imagen"
                                className="w-7 h-7 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400"><Image size={14} /></button>
                            <button onClick={onEdit} title="Editar"
                                className="w-7 h-7 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400"><Edit3 size={14} /></button>
                            <button onClick={onDelete} title="Eliminar"
                                className="w-7 h-7 rounded-lg hover:bg-red-50 flex items-center justify-center text-red-400"><Trash2 size={14} /></button>
                        </div>
                    )}
                </div>
                <h3 className={`${large ? 'text-xl' : 'text-base'} font-black text-gray-900 mb-2 ${large ? '' : 'line-clamp-2'}`}>{n.title}</h3>
                <p className={`text-sm text-gray-600 leading-relaxed whitespace-pre-wrap ${large ? '' : 'line-clamp-3 text-xs'}`}>{n.content}</p>
                <div className="flex items-center gap-3 mt-3 text-[11px] text-gray-400">
                    <span className="flex items-center gap-1"><User size={11} /> {n.author?.full_name || n.author?.email || "Admin"}</span>
                    <span className="flex items-center gap-1"><Calendar size={11} /> {n.created_at ? fmtDate(n.created_at) : ""}</span>
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
    const [activeStatus, setActiveStatus] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [editor, setEditor] = useState<{ article: Partial<NewsItem> | null } | null>(null);
    const [canManage, setCanManage] = useState(false);

    useEffect(() => {
        api.get("/news/can-manage").then(r => setCanManage(r.data.can_manage)).catch(() => { });
    }, []);

    const fetchNews = (cat?: string | null, status?: string | null) => {
        let params = "?";
        if (cat) params += `category=${encodeURIComponent(cat)}&`;
        if (status) params += `status=${encodeURIComponent(status)}&`;
        api.get(`/news/${params}`).then(r => { setNews(r.data); setLoading(false); }).catch(() => setLoading(false));
    };

    useEffect(() => { fetchNews(activeCategory, activeStatus); }, [activeCategory, activeStatus]);

    const handleSave = async (formData: any) => {
        const { _photoFile, ...data } = formData;
        try {
            let newsId: number;
            if (editor?.article?.id) {
                await api.put(`/news/${editor.article.id}`, data);
                newsId = editor.article.id;
            } else {
                const res = await api.post("/news/", data);
                newsId = res.data.id;
            }
            // Upload photo if one was selected
            if (_photoFile) {
                const fd = new FormData();
                fd.append("file", _photoFile);
                await api.post(`/news/${newsId}/image`, fd, {
                    headers: { "Content-Type": "multipart/form-data" },
                });
            }
            setEditor(null);
            fetchNews(activeCategory, activeStatus);
        } catch (err: any) {
            alert(err?.response?.data?.detail || "Error al guardar");
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("¿Eliminar esta noticia?")) return;
        await api.delete(`/news/${id}`);
        fetchNews(activeCategory, activeStatus);
    };

    const triggerImageUpload = (newsId: number) => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "image/*";
        input.onchange = async (e: any) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const fd = new FormData();
            fd.append("file", file);
            try {
                await api.post(`/news/${newsId}/image`, fd, { headers: { "Content-Type": "multipart/form-data" } });
                fetchNews(activeCategory, activeStatus);
            } catch (err: any) {
                alert(err?.response?.data?.detail || "Error al subir imagen");
            }
        };
        input.click();
    };

    const quickPublish = async (id: number) => {
        await api.put(`/news/${id}`, { status: "published" });
        fetchNews(activeCategory, activeStatus);
    };

    const quickArchive = async (id: number) => {
        await api.put(`/news/${id}`, { status: "archived" });
        fetchNews(activeCategory, activeStatus);
    };

    const pinnedNews = news.filter(n => n.is_pinned);
    const regularNews = news.filter(n => !n.is_pinned);
    const filteredRegular = searchQuery
        ? regularNews.filter(n => n.title.toLowerCase().includes(searchQuery.toLowerCase()) || n.content.toLowerCase().includes(searchQuery.toLowerCase()))
        : regularNews;
    const usedCategories = [...new Set(news.map(n => n.category))].sort();

    // Stats for manager
    const draftCount = news.filter(n => n.status === "draft").length;
    const publishedCount = news.filter(n => n.status === "published").length;
    const archivedCount = news.filter(n => n.status === "archived").length;

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
                        {canManage && (
                            <button onClick={() => setEditor({ article: null })}
                                className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm text-white font-bold px-5 py-2.5 rounded-xl hover:bg-white/30 transition-all border border-white/20">
                                <Plus size={18} /> Nueva Noticia
                            </button>
                        )}
                    </div>

                    {/* Filter row */}
                    <div className="flex flex-wrap items-center gap-2 mt-5">
                        {/* Category pills */}
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

                        {/* Status filter for managers */}
                        {canManage && (
                            <>
                                <span className="text-white/30 mx-1">|</span>
                                {(["draft", "published", "archived"] as const).map(s => (
                                    <button key={s} onClick={() => setActiveStatus(activeStatus === s ? null : s)}
                                        className={`px-3 py-1.5 rounded-full text-[11px] font-bold transition-all flex items-center gap-1 ${activeStatus === s ? 'bg-white text-gray-800 shadow-lg' : 'bg-white/10 text-white/70 hover:bg-white/20'}`}>
                                        {STATUS_CONFIG[s].icon} {STATUS_CONFIG[s].label}
                                        <span className="ml-0.5 opacity-70">
                                            ({s === "draft" ? draftCount : s === "published" ? publishedCount : archivedCount})
                                        </span>
                                    </button>
                                ))}
                            </>
                        )}
                    </div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-6 py-8">
                {/* Search */}
                <div className="relative mb-6">
                    <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 bg-white shadow-sm outline-none"
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
                            {canManage ? "Creá la primera noticia con el botón de arriba" : "Pronto habrá novedades"}
                        </p>
                    </div>
                )}

                {/* Pinned News */}
                {pinnedNews.length > 0 && (
                    <div className="mb-8">
                        <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2"><Pin size={14} /> Destacadas</h2>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                            {pinnedNews.map(n => (
                                <NewsCard key={n.id} n={n} canManage={canManage} large
                                    onEdit={() => setEditor({ article: n })}
                                    onDelete={() => handleDelete(n.id)}
                                    onUploadImage={triggerImageUpload} />
                            ))}
                        </div>
                    </div>
                )}

                {/* Regular News */}
                {filteredRegular.length > 0 && (
                    <div>
                        {pinnedNews.length > 0 && (
                            <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2"><Newspaper size={14} /> Últimas Noticias</h2>
                        )}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                            {filteredRegular.map(n => (
                                <NewsCard key={n.id} n={n} canManage={canManage}
                                    onEdit={() => setEditor({ article: n })}
                                    onDelete={() => handleDelete(n.id)}
                                    onUploadImage={triggerImageUpload} />
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {editor && <NewsEditor article={editor.article} onSave={handleSave} onClose={() => setEditor(null)} />}
        </div>
    );
}
