import { useState, useEffect, useRef } from "react";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";
import {
    BookOpen, Plus, Search, Pencil, Trash2, Save, X, ArrowLeft,
    FolderOpen, Building2, FolderKanban, Tag, Clock, ChevronRight
} from "lucide-react";

interface WikiPage {
    id: number;
    title: string;
    content: string;
    slug: string | null;
    entity_type: string | null;
    entity_id: number | null;
    parent_id: number | null;
    created_by: number | null;
    updated_by: number | null;
    created_at: string | null;
    updated_at: string | null;
    children?: WikiPage[];
}

interface EntityOption {
    id: number;
    name: string;
}

const ENTITY_TYPES = [
    { value: "", label: "General (sin asociar)" },
    { value: "project", label: "Proyecto" },
    { value: "client", label: "Cuenta / Cliente" },
    { value: "lead", label: "Lead" },
    { value: "provider", label: "Proveedor" },
    { value: "ticket", label: "Ticket" },
];

const ENTITY_ICON: Record<string, any> = {
    project: FolderKanban,
    client: Building2,
    lead: Tag,
    provider: Tag,
    ticket: Tag,
};

export default function Wiki() {
    const { user } = useAuth();
    const [pages, setPages] = useState<WikiPage[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [filterEntity, setFilterEntity] = useState("");

    // Detail / edit
    const [selectedPage, setSelectedPage] = useState<WikiPage | null>(null);
    const [editing, setEditing] = useState(false);
    const [editContent, setEditContent] = useState("");
    const [editTitle, setEditTitle] = useState("");

    // Create modal
    const [showCreate, setShowCreate] = useState(false);
    const [createForm, setCreateForm] = useState({
        title: "", content: "", entity_type: "", entity_id: "" as string | number,
    });

    // Entity options
    const [projects, setProjects] = useState<EntityOption[]>([]);
    const [clients, setClients] = useState<EntityOption[]>([]);
    const [leads, setLeads] = useState<{ id: number; company_name: string }[]>([]);
    const [providers, setProviders] = useState<EntityOption[]>([]);

    useEffect(() => {
        fetchPages();
        fetchEntities();
    }, []);

    const fetchPages = async () => {
        try {
            const params: any = {};
            if (filterEntity) params.entity_type = filterEntity;
            if (searchQuery) params.search = searchQuery;
            const res = await api.get("/wiki/", { params });
            setPages(res.data);
        } catch (err) {
            console.error("Failed to load wiki pages", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const t = setTimeout(() => fetchPages(), 300);
        return () => clearTimeout(t);
    }, [searchQuery, filterEntity]);

    const fetchEntities = async () => {
        try {
            const [pRes, cRes, lRes, prRes] = await Promise.all([
                api.get("/projects/"), api.get("/clients/"), api.get("/leads/"), api.get("/providers/"),
            ]);
            setProjects(pRes.data.map((p: any) => ({ id: p.id, name: p.name })));
            setClients(cRes.data.map((c: any) => ({ id: c.id, name: c.name })));
            setLeads(lRes.data);
            setProviders(prRes.data.map((p: any) => ({ id: p.id, name: p.name })));
        } catch (err) {
            console.error("Failed to fetch entities", err);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post("/wiki/", {
                title: createForm.title,
                content: createForm.content,
                entity_type: createForm.entity_type || null,
                entity_id: createForm.entity_id ? Number(createForm.entity_id) : null,
                created_by: (user as any)?.id || null,
            });
            setShowCreate(false);
            setCreateForm({ title: "", content: "", entity_type: "", entity_id: "" });
            fetchPages();
        } catch (err) {
            console.error("Failed to create wiki page", err);
        }
    };

    const openPage = async (page: WikiPage) => {
        try {
            const res = await api.get(`/wiki/${page.id}`);
            setSelectedPage(res.data);
            setEditing(false);
        } catch (err) {
            console.error(err);
        }
    };

    const startEditing = () => {
        if (!selectedPage) return;
        setEditTitle(selectedPage.title);
        setEditContent(selectedPage.content || "");
        setEditing(true);
    };

    const saveEdit = async () => {
        if (!selectedPage) return;
        try {
            await api.put(`/wiki/${selectedPage.id}`, {
                title: editTitle,
                content: editContent,
                updated_by: (user as any)?.id || null,
            });
            openPage(selectedPage);
            setEditing(false);
            fetchPages();
        } catch (err) {
            console.error(err);
        }
    };

    const deletePage = async (id: number) => {
        if (!confirm("¿Eliminar esta página wiki?")) return;
        try {
            await api.delete(`/wiki/${id}`);
            setSelectedPage(null);
            fetchPages();
        } catch (err) {
            console.error(err);
        }
    };

    const getEntityLabel = (type: string | null, id: number | null) => {
        if (!type) return "General";
        const list = type === "project" ? projects : type === "client" ? clients : type === "provider" ? providers : [];
        if (type === "lead") {
            const l = leads.find(x => x.id === id);
            return l ? l.company_name : `Lead #${id}`;
        }
        const item = list.find(x => x.id === id);
        return item ? item.name : `${type} #${id}`;
    };

    // Render simple markdown: headers, bold, code blocks, lists
    const renderContent = (content: string) => {
        const lines = content.split("\n");
        const result: JSX.Element[] = [];
        let i = 0;
        while (i < lines.length) {
            const line = lines[i];
            // Code block
            if (line.trim().startsWith("```")) {
                const codeLines = [];
                i++;
                while (i < lines.length && !lines[i].trim().startsWith("```")) {
                    codeLines.push(lines[i]);
                    i++;
                }
                result.push(
                    <pre key={i} className="bg-gray-900 text-green-400 text-xs rounded-lg p-3 overflow-x-auto font-mono border border-gray-700 my-2 whitespace-pre-wrap">
                        <code>{codeLines.join("\n")}</code>
                    </pre>
                );
                i++;
                continue;
            }
            // Headers
            if (line.startsWith("### ")) {
                result.push(<h3 key={i} className="text-base font-bold text-gray-800 mt-4 mb-1">{line.slice(4)}</h3>);
            } else if (line.startsWith("## ")) {
                result.push(<h2 key={i} className="text-lg font-bold text-gray-800 mt-5 mb-2">{line.slice(3)}</h2>);
            } else if (line.startsWith("# ")) {
                result.push(<h1 key={i} className="text-xl font-bold text-gray-900 mt-6 mb-2">{line.slice(2)}</h1>);
            } else if (line.startsWith("- ") || line.startsWith("* ")) {
                result.push(<li key={i} className="text-sm text-gray-700 ml-4 list-disc">{line.slice(2)}</li>);
            } else if (line.trim() === "") {
                result.push(<br key={i} />);
            } else {
                // Bold via **text**
                const parts = line.split(/(\*\*.*?\*\*)/g);
                result.push(
                    <p key={i} className="text-sm text-gray-700 leading-relaxed">
                        {parts.map((p, j) =>
                            p.startsWith("**") && p.endsWith("**")
                                ? <strong key={j} className="font-semibold">{p.slice(2, -2)}</strong>
                                : p
                        )}
                    </p>
                );
            }
            i++;
        }
        return <div>{result}</div>;
    };

    // ---- Page Detail View ----
    if (selectedPage) {
        const EIcon = ENTITY_ICON[selectedPage.entity_type || ""] || FolderOpen;
        return (
            <div className="space-y-6 max-w-5xl mx-auto">
                <div className="flex items-center gap-3">
                    <button onClick={() => setSelectedPage(null)} className="p-2 bg-white rounded-full shadow-sm border border-gray-100 hover:bg-gray-50"><ArrowLeft size={18} /></button>
                    <div className="flex-1">
                        {!editing ? (
                            <h2 className="text-xl font-bold text-gray-900">{selectedPage.title}</h2>
                        ) : (
                            <input value={editTitle} onChange={e => setEditTitle(e.target.value)}
                                className="text-xl font-bold text-gray-900 w-full border-b-2 border-blue-400 outline-none bg-transparent pb-1" />
                        )}
                        <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                            {selectedPage.entity_type && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full font-medium">
                                    <EIcon size={10} />
                                    {getEntityLabel(selectedPage.entity_type, selectedPage.entity_id)}
                                </span>
                            )}
                            {selectedPage.updated_at && (
                                <span className="flex items-center gap-1"><Clock size={10} /> {new Date(selectedPage.updated_at).toLocaleString('es-AR')}</span>
                            )}
                        </div>
                    </div>
                    <div className="flex gap-2">
                        {!editing ? (
                            <>
                                <button onClick={startEditing} className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100"><Pencil size={16} /></button>
                                <button onClick={() => deletePage(selectedPage.id)} className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100"><Trash2 size={16} /></button>
                            </>
                        ) : (
                            <>
                                <button onClick={saveEdit} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-1 text-sm font-medium"><Save size={14} /> Guardar</button>
                                <button onClick={() => setEditing(false)} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium">Cancelar</button>
                            </>
                        )}
                    </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                    {!editing ? (
                        <div className="prose max-w-none">
                            {selectedPage.content ? renderContent(selectedPage.content) : (
                                <p className="text-gray-400 text-sm italic">Sin contenido. Hacé click en editar para agregar documentación.</p>
                            )}
                        </div>
                    ) : (
                        <textarea
                            value={editContent}
                            onChange={e => setEditContent(e.target.value)}
                            rows={25}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg font-mono text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none resize-y min-h-[400px]"
                            placeholder="Escribí usando markdown: # Título, ## Subtítulo, **negrita**, - listas, ``` código ```"
                        />
                    )}
                </div>

                {/* Children */}
                {selectedPage.children && selectedPage.children.length > 0 && (
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="px-5 py-3 bg-gray-50/50 border-b border-gray-100">
                            <h4 className="text-sm font-semibold text-gray-700">Sub-páginas</h4>
                        </div>
                        <div className="divide-y divide-gray-50">
                            {selectedPage.children.map(child => (
                                <div key={child.id} onClick={() => openPage(child)} className="px-5 py-3 hover:bg-gray-50 cursor-pointer flex items-center gap-2">
                                    <BookOpen size={14} className="text-blue-400" />
                                    <span className="text-sm font-medium text-gray-800">{child.title}</span>
                                    <ChevronRight size={14} className="text-gray-300 ml-auto" />
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // ---- Main listing ----
    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-md">
                        <BookOpen size={22} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-gray-900">Wiki</h1>
                        <p className="text-xs text-gray-500">Documentación y base de conocimiento</p>
                    </div>
                </div>
                <button onClick={() => setShowCreate(true)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all shadow-md text-sm font-semibold">
                    <Plus size={16} /> Nueva Página
                </button>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3 items-center">
                <div className="relative flex-1 min-w-[200px] max-w-md">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Buscar páginas..." className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none" />
                </div>
                <select value={filterEntity} onChange={e => setFilterEntity(e.target.value)}
                    className="px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm">
                    <option value="">Todas las asociaciones</option>
                    {ENTITY_TYPES.filter(t => t.value).map(t => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                </select>
            </div>

            {/* Page list */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                {loading ? (
                    <div className="p-12 text-center text-gray-500">Cargando páginas...</div>
                ) : pages.length === 0 ? (
                    <div className="p-12 text-center text-gray-400">
                        <BookOpen size={40} className="mx-auto mb-3 text-gray-300" />
                        <p className="font-medium">No hay páginas wiki</p>
                        <p className="text-sm mt-1">Creá una nueva página para documentar lo que necesites</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-50">
                        {pages.map(p => {
                            const EIcon = ENTITY_ICON[p.entity_type || ""] || FolderOpen;
                            return (
                                <div key={p.id} onClick={() => openPage(p)}
                                    className="px-5 py-4 flex items-center gap-4 hover:bg-gray-50/50 cursor-pointer transition-colors group">
                                    <div className="w-10 h-10 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                        <BookOpen size={18} className="text-indigo-500" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="text-sm font-semibold text-gray-900 truncate">{p.title}</h4>
                                        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-gray-400">
                                            {p.entity_type && (
                                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded font-medium">
                                                    <EIcon size={9} /> {getEntityLabel(p.entity_type, p.entity_id)}
                                                </span>
                                            )}
                                            {!p.entity_type && <span className="text-gray-400">General</span>}
                                            {p.updated_at && <span>{new Date(p.updated_at).toLocaleDateString('es-AR')}</span>}
                                        </div>
                                    </div>
                                    <ChevronRight size={16} className="text-gray-300 group-hover:text-gray-500 transition-colors flex-shrink-0" />
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Create Modal */}
            {showCreate && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] overflow-y-auto">
                        {/* ARCA Modal header */}
                        <div className="px-6 py-4 bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                                    <BookOpen size={20} className="text-white" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-white">Nueva Página Wiki</h3>
                                    <p className="text-blue-100 text-xs">Complete los datos de la página</p>
                                </div>
                            </div>
                            <button onClick={() => setShowCreate(false)} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"><X size={18} className="text-white" /></button>
                        </div>
                        <form onSubmit={handleCreate} className="p-6 space-y-4">
                            {/* Title section */}
                            <div className="border border-blue-100 rounded-xl p-4 bg-blue-50/30">
                                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Título *</label>
                                <input type="text" required value={createForm.title} onChange={e => setCreateForm({ ...createForm, title: e.target.value })}
                                    className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none"
                                    placeholder="Nombre de la página" />
                            </div>
                            {/* Association section */}
                            <div className="border border-purple-100 rounded-xl p-4 bg-purple-50/30">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 mb-1.5">Asociar a</label>
                                        <select value={createForm.entity_type} onChange={e => setCreateForm({ ...createForm, entity_type: e.target.value, entity_id: "" })}
                                            className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-lg text-sm">
                                            {ENTITY_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                                        </select>
                                    </div>
                                    {createForm.entity_type && (
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                                                {ENTITY_TYPES.find(t => t.value === createForm.entity_type)?.label}
                                            </label>
                                            <select value={createForm.entity_id} onChange={e => setCreateForm({ ...createForm, entity_id: e.target.value })}
                                                className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-lg text-sm">
                                                <option value="">— Seleccionar —</option>
                                                {(createForm.entity_type === "project" ? projects :
                                                    createForm.entity_type === "client" ? clients :
                                                        createForm.entity_type === "provider" ? providers :
                                                            createForm.entity_type === "lead" ? leads.map(l => ({ id: l.id, name: l.company_name })) :
                                                                []).map((item: any) => (
                                                                    <option key={item.id} value={item.id}>{item.name}</option>
                                                                ))}
                                            </select>
                                        </div>
                                    )}
                                </div>
                            </div>
                            {/* Content section */}
                            <div className="border border-green-100 rounded-xl p-4 bg-green-50/30">
                                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Contenido (markdown)</label>
                                <textarea rows={6} value={createForm.content} onChange={e => setCreateForm({ ...createForm, content: e.target.value })}
                                    className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-lg text-sm font-mono focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none resize-none"
                                    placeholder="# Título&#10;&#10;Contenido de la documentación..." />
                            </div>
                            <div className="flex justify-end gap-3 pt-2">
                                <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg font-medium">Cancelar</button>
                                <button type="submit" className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm">Crear Página</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
