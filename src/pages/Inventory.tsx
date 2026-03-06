import { useState, useEffect } from "react";
import api from "../api/client";
import { Plus, Search, Warehouse, Pencil, Trash2, X, FileText, ArrowRight, Package, AlertTriangle, TrendingUp, TrendingDown, ArrowUpDown, MapPin, Link2 } from "lucide-react";

interface InventoryItem {
    id: number; product_id: number; product_name: string; product_type: string;
    product_category: string; product_family: string; product_subcategory: string;
    warehouse_id: number | null; warehouse_name: string; warehouse_code: string;
    stock: number; min_stock: number; max_stock: number;
    unit: string; location: string; notes: string; stock_status: string; created_at: string;
}
interface Product { id: number; name: string; type: string; category: string; family: string; subcategory: string; }
interface WarehouseRef { id: number; code: string; name: string; is_active: boolean; }
interface Summary { total_items: number; critical_stock: number; over_stock: number; total_value: number; }

export default function Inventory() {
    const [items, setItems] = useState<InventoryItem[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [warehouses, setWarehouses] = useState<WarehouseRef[]>([]);
    const [summary, setSummary] = useState<Summary>({ total_items: 0, critical_stock: 0, over_stock: 0, total_value: 0 });
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [filterStatus, setFilterStatus] = useState("all");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isAdjustOpen, setIsAdjustOpen] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [adjustItem, setAdjustItem] = useState<InventoryItem | null>(null);
    const [adjustQty, setAdjustQty] = useState("");
    const [adjustReason, setAdjustReason] = useState("");
    const [formData, setFormData] = useState({
        product_id: "", warehouse_id: "", stock: "0", min_stock: "0", max_stock: "0",
        unit: "unidad", location: "", notes: "",
    });

    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        try {
            const [r1, r2, r3, r4] = await Promise.all([
                api.get("/inventory").catch(() => ({ data: [] })),
                api.get("/products/").catch(() => ({ data: [] })),
                api.get("/inventory/summary").catch(() => ({ data: { total_items: 0, critical_stock: 0, over_stock: 0, total_value: 0 } })),
                api.get("/warehouses").catch(() => ({ data: [] })),
            ]);
            setItems(Array.isArray(r1.data) ? r1.data : []);
            setProducts(Array.isArray(r2.data) ? r2.data : []);
            setSummary(r3.data);
            setWarehouses(Array.isArray(r4.data) ? r4.data : []);
        } catch { /* */ } finally { setLoading(false); }
    };

    const handleSubmit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        try {
            const payload = { ...formData, product_id: Number(formData.product_id), warehouse_id: formData.warehouse_id ? Number(formData.warehouse_id) : null, stock: Number(formData.stock), min_stock: Number(formData.min_stock), max_stock: Number(formData.max_stock) };
            if (editingId) await api.put(`/inventory/${editingId}`, payload);
            else await api.post("/inventory", payload);
            setIsModalOpen(false); resetForm(); fetchData();
        } catch (error: any) { alert(error?.response?.data?.detail || "Error al guardar"); }
    };

    const handleAdjust = async () => {
        if (!adjustItem || !adjustQty) return;
        try {
            await api.post(`/inventory/${adjustItem.id}/adjust`, { quantity: Number(adjustQty), reason: adjustReason });
            setIsAdjustOpen(false); setAdjustItem(null); setAdjustQty(""); setAdjustReason(""); fetchData();
        } catch (error: any) { alert(error?.response?.data?.detail || "Error al ajustar stock"); }
    };

    const handleDelete = async (id: number) => { if (!confirm("¿Eliminar este item del inventario?")) return; try { await api.delete(`/inventory/${id}`); fetchData(); } catch { /* */ } };

    const resetForm = () => {
        setEditingId(null);
        setFormData({ product_id: "", warehouse_id: "", stock: "0", min_stock: "0", max_stock: "0", unit: "unidad", location: "", notes: "" });
    };

    const openEdit = (item: InventoryItem) => {
        setEditingId(item.id);
        setFormData({ product_id: item.product_id.toString(), warehouse_id: item.warehouse_id?.toString() || "", stock: item.stock.toString(), min_stock: item.min_stock.toString(), max_stock: item.max_stock.toString(), unit: item.unit, location: item.location || "", notes: item.notes || "" });
        setIsModalOpen(true);
    };

    const openAdjust = (item: InventoryItem) => { setAdjustItem(item); setAdjustQty(""); setAdjustReason(""); setIsAdjustOpen(true); };

    const filtered = items.filter(i => {
        const matchSearch = i.product_name?.toLowerCase().includes(search.toLowerCase()) || i.warehouse_name?.toLowerCase().includes(search.toLowerCase()) || i.location?.toLowerCase().includes(search.toLowerCase());
        const matchStatus = filterStatus === "all" || i.stock_status === filterStatus;
        return matchSearch && matchStatus;
    });

    const statusBadge = (status: string) => {
        if (status === "critical") return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800"><AlertTriangle size={10} />Bajo</span>;
        if (status === "warning") return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800"><TrendingUp size={10} />Exceso</span>;
        return <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Normal</span>;
    };

    const activeWarehouses = warehouses.filter(w => w.is_active);
    const availableProducts = editingId ? products : products.filter(p => !items.some(i => i.product_id === p.id));

    if (loading) return <div className="flex justify-center items-center h-64"><div className="text-gray-500">Cargando...</div></div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100 gap-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-gray-900">Inventario</h2>
                    <p className="text-sm text-gray-500">Control de stock asociado a productos y depósitos</p>
                </div>
                <button onClick={() => { resetForm(); setIsModalOpen(true); }} className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-5 py-2.5 rounded-xl font-medium transition-all shadow-lg shadow-blue-200">
                    <Plus size={18} /><span>Agregar al Inventario</span>
                </button>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-2 text-gray-500 text-xs mb-1"><Package size={14} /> Total Items</div>
                    <p className="text-2xl font-bold text-gray-900">{summary.total_items}</p>
                </div>
                <div className="bg-white rounded-xl p-4 border border-red-100 shadow-sm">
                    <div className="flex items-center gap-2 text-red-500 text-xs mb-1"><TrendingDown size={14} /> Stock Bajo</div>
                    <p className="text-2xl font-bold text-red-600">{summary.critical_stock}</p>
                </div>
                <div className="bg-white rounded-xl p-4 border border-amber-100 shadow-sm">
                    <div className="flex items-center gap-2 text-amber-500 text-xs mb-1"><TrendingUp size={14} /> Sobre Stock</div>
                    <p className="text-2xl font-bold text-amber-600">{summary.over_stock}</p>
                </div>
                <div className="bg-white rounded-xl p-4 border border-green-100 shadow-sm">
                    <div className="flex items-center gap-2 text-green-500 text-xs mb-1"><FileText size={14} /> Valor Total</div>
                    <p className="text-2xl font-bold text-green-600">$ {summary.total_value.toLocaleString()}</p>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input type="text" placeholder="Buscar por producto, depósito o ubicación..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
                    <option value="all">Todos</option>
                    <option value="critical">Stock Bajo</option>
                    <option value="warning">Sobre Stock</option>
                    <option value="normal">Normal</option>
                </select>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                {filtered.length === 0 ? (
                    <div className="p-12 text-center">
                        <Warehouse size={48} className="mx-auto text-gray-300 mb-4" />
                        <h3 className="text-lg font-semibold text-gray-700 mb-2">No hay items en inventario</h3>
                        <p className="text-gray-500 text-sm">Agregá productos al inventario para gestionar stock</p>
                    </div>
                ) : (
                    <>
                        <div className="hidden md:block">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider">
                                    <tr>
                                        <th className="p-4 text-left font-semibold">Producto</th>
                                        <th className="p-4 text-left font-semibold">Categoría</th>
                                        <th className="p-4 text-left font-semibold">Depósito</th>
                                        <th className="p-4 text-right font-semibold">Stock</th>
                                        <th className="p-4 text-right font-semibold">Mín / Máx</th>
                                        <th className="p-4 text-left font-semibold">Estado</th>
                                        <th className="p-4 text-center font-semibold">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {filtered.map(item => (
                                        <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="p-4">
                                                <p className="font-medium text-gray-900">{item.product_name}</p>
                                                <p className="text-xs text-gray-500">{item.product_type} · {item.unit}</p>
                                            </td>
                                            <td className="p-4 text-gray-600 text-xs">
                                                {[item.product_family, item.product_category, item.product_subcategory].filter(Boolean).join(" → ") || "-"}
                                            </td>
                                            <td className="p-4">
                                                <p className="text-gray-800 font-medium">{item.warehouse_name || "-"}</p>
                                                {item.warehouse_code && <p className="text-[10px] text-indigo-500 font-mono">{item.warehouse_code}</p>}
                                                {item.location && <p className="text-xs text-gray-400 flex items-center gap-1"><MapPin size={10} />{item.location}</p>}
                                            </td>
                                            <td className="p-4 text-right font-mono font-bold text-gray-900">{item.stock}</td>
                                            <td className="p-4 text-right text-xs text-gray-500">{item.min_stock} / {item.max_stock}</td>
                                            <td className="p-4">{statusBadge(item.stock_status)}</td>
                                            <td className="p-4 text-center">
                                                <div className="flex items-center justify-center space-x-1">
                                                    <button onClick={() => openAdjust(item)} className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="Ajustar stock"><ArrowUpDown size={16} /></button>
                                                    <button onClick={() => openEdit(item)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Pencil size={16} /></button>
                                                    <button onClick={() => handleDelete(item.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={16} /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="md:hidden divide-y divide-gray-100">
                            {filtered.map(item => (
                                <div key={item.id} className="p-4 flex items-center justify-between">
                                    <div>
                                        <p className="font-medium text-gray-900">{item.product_name}</p>
                                        <p className="text-xs text-gray-500">{item.warehouse_name || "-"} · Stock: <span className="font-bold">{item.stock}</span> {item.unit}</p>
                                        <div className="mt-1">{statusBadge(item.stock_status)}</div>
                                    </div>
                                    <div className="flex space-x-1">
                                        <button onClick={() => openAdjust(item)} className="p-2 text-gray-400 hover:text-green-600"><ArrowUpDown size={16} /></button>
                                        <button onClick={() => openEdit(item)} className="p-2 text-gray-400 hover:text-blue-600"><Pencil size={16} /></button>
                                        <button onClick={() => handleDelete(item.id)} className="p-2 text-gray-400 hover:text-red-600"><Trash2 size={16} /></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>

            {/* Create/Edit Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-5 text-white flex-shrink-0">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                    <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm"><Warehouse size={22} /></div>
                                    <div>
                                        <h2 className="text-lg font-bold">{editingId ? "Editar Item" : "Agregar al Inventario"}</h2>
                                        <p className="text-blue-100 text-sm">Asociá un producto a un depósito</p>
                                    </div>
                                </div>
                                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white/20 rounded-lg transition-colors"><X size={20} /></button>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 p-6 space-y-6">
                            {/* Producto y Depósito */}
                            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 space-y-3">
                                <h4 className="text-xs font-semibold text-indigo-700 uppercase tracking-wide flex items-center"><Link2 size={14} className="mr-1.5" /> Producto y Depósito</h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs text-gray-600 mb-1">Producto *</label>
                                        <select required value={formData.product_id} onChange={e => setFormData(p => ({ ...p, product_id: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 bg-white">
                                            <option value="">Seleccionar producto...</option>
                                            {(editingId ? products : availableProducts).map(p => <option key={p.id} value={p.id}>{p.name} ({p.type}) {p.category ? `- ${p.category}` : ""}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-600 mb-1">Depósito *</label>
                                        <select required value={formData.warehouse_id} onChange={e => setFormData(p => ({ ...p, warehouse_id: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 bg-white">
                                            <option value="">Seleccionar depósito...</option>
                                            {activeWarehouses.map(w => <option key={w.id} value={w.id}>[{w.code}] {w.name}</option>)}
                                        </select>
                                        {activeWarehouses.length === 0 && <p className="text-[10px] text-amber-600 mt-1">⚠ No hay depósitos activos. Creá uno en ERP → Depósitos</p>}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-600 mb-1 flex items-center gap-1"><MapPin size={10} />Ubicación dentro del depósito</label>
                                    <input type="text" value={formData.location} onChange={e => setFormData(p => ({ ...p, location: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 bg-white" placeholder="Estante A, Fila 3, Sector Norte..." />
                                </div>
                            </div>

                            {/* Stock */}
                            <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-3">
                                <h4 className="text-xs font-semibold text-green-700 uppercase tracking-wide flex items-center"><Package size={14} className="mr-1.5" /> Control de Stock</h4>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                    <div>
                                        <label className="block text-xs text-gray-600 mb-1">Stock Actual</label>
                                        <input type="number" step="0.01" value={formData.stock} onChange={e => setFormData(p => ({ ...p, stock: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 bg-white" />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-600 mb-1">Stock Mínimo</label>
                                        <input type="number" step="0.01" value={formData.min_stock} onChange={e => setFormData(p => ({ ...p, min_stock: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 bg-white" />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-600 mb-1">Stock Máximo</label>
                                        <input type="number" step="0.01" value={formData.max_stock} onChange={e => setFormData(p => ({ ...p, max_stock: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 bg-white" />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-600 mb-1">Unidad</label>
                                        <select value={formData.unit} onChange={e => setFormData(p => ({ ...p, unit: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 bg-white">
                                            <option>unidad</option><option>horas</option><option>metros</option><option>kg</option><option>litros</option><option>paquetes</option><option>cajas</option><option>rollos</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Observaciones</label>
                                <textarea value={formData.notes} onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))} rows={2} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500" placeholder="Notas adicionales..." />
                            </div>
                        </form>

                        <div className="p-5 border-t border-gray-100 flex justify-between items-center flex-shrink-0 bg-gray-50">
                            <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2.5 text-gray-600 hover:text-gray-900 text-sm font-medium">Cancelar</button>
                            <button onClick={handleSubmit} className="flex items-center px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-medium hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-200 transition-all">
                                {editingId ? "Actualizar" : "Agregar"} <ArrowRight size={16} className="ml-2" />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Adjust Stock Modal */}
            {isAdjustOpen && adjustItem && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                        <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-5 text-white">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                    <div className="p-2 bg-white/20 rounded-xl"><ArrowUpDown size={22} /></div>
                                    <div>
                                        <h2 className="text-lg font-bold">Ajustar Stock</h2>
                                        <p className="text-green-100 text-sm">{adjustItem.product_name}</p>
                                        {adjustItem.warehouse_name && <p className="text-green-200 text-xs">Depósito: {adjustItem.warehouse_name}</p>}
                                    </div>
                                </div>
                                <button onClick={() => setIsAdjustOpen(false)} className="p-2 hover:bg-white/20 rounded-lg transition-colors"><X size={20} /></button>
                            </div>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="bg-gray-50 rounded-xl p-4 text-center">
                                <p className="text-xs text-gray-500 mb-1">Stock Actual</p>
                                <p className="text-3xl font-black text-gray-900">{adjustItem.stock} <span className="text-sm font-medium text-gray-500">{adjustItem.unit}</span></p>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Cantidad a sumar/restar</label>
                                <input type="number" step="0.01" value={adjustQty} onChange={e => setAdjustQty(e.target.value)} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500" placeholder="Positivo para sumar, negativo para restar" />
                                {adjustQty && <p className="text-xs text-gray-500 mt-1">Nuevo stock: <span className="font-bold">{(adjustItem.stock + Number(adjustQty)).toFixed(2)}</span></p>}
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Motivo</label>
                                <input type="text" value={adjustReason} onChange={e => setAdjustReason(e.target.value)} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500" placeholder="Ingreso por compra, salida por entrega, etc." />
                            </div>
                        </div>
                        <div className="p-5 border-t border-gray-100 flex justify-between items-center bg-gray-50">
                            <button onClick={() => setIsAdjustOpen(false)} className="px-4 py-2.5 text-gray-600 hover:text-gray-900 text-sm font-medium">Cancelar</button>
                            <button onClick={handleAdjust} disabled={!adjustQty} className="flex items-center px-6 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-medium hover:from-green-700 hover:to-emerald-700 shadow-lg shadow-green-200 transition-all disabled:opacity-50">
                                Aplicar Ajuste <ArrowRight size={16} className="ml-2" />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
