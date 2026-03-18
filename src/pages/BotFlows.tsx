import { useState, useEffect, useCallback, useRef } from 'react';
import {
    ReactFlow,
    Background,
    Controls,
    MiniMap,
    addEdge,
    useNodesState,
    useEdgesState,
    Handle,
    Position,
    type Node,
    type Edge,
    type Connection,
    type NodeProps,
    MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import api from '../api/client';
import {
    Plus, ArrowLeft, Save, ToggleLeft, ToggleRight, Trash2, Play, Pencil,
    MessageSquare, HelpCircle, GitBranch, Clock, Globe, UserCheck,
    Zap, X, GripVertical, Search, Ticket, FilePlus2
} from 'lucide-react';

// ═══════════════════════════════════════════
//  TYPES
// ═══════════════════════════════════════════

interface BotFlow {
    id: number;
    name: string;
    description?: string;
    is_active: boolean;
    trigger_type: string;
    trigger_value?: string;
    nodes: any[];
    edges: any[];
    created_at: string;
    updated_at: string;
}

// ═══════════════════════════════════════════
//  CUSTOM NODES
// ═══════════════════════════════════════════

const nodeColors: Record<string, { bg: string; border: string; icon: string; label: string }> = {
    trigger: { bg: 'bg-emerald-50', border: 'border-emerald-300', icon: '⚡', label: 'Trigger' },
    message: { bg: 'bg-blue-50', border: 'border-blue-300', icon: '💬', label: 'Mensaje' },
    question: { bg: 'bg-purple-50', border: 'border-purple-300', icon: '❓', label: 'Pregunta' },
    condition: { bg: 'bg-orange-50', border: 'border-orange-300', icon: '🔀', label: 'Condición' },
    delay: { bg: 'bg-gray-50', border: 'border-gray-300', icon: '⏱', label: 'Espera' },
    api_call: { bg: 'bg-green-50', border: 'border-green-300', icon: '🌐', label: 'API Call' },
    assign_agent: { bg: 'bg-red-50', border: 'border-red-300', icon: '👤', label: 'Asignar Agente' },
    ticket_lookup: { bg: 'bg-cyan-50', border: 'border-cyan-300', icon: '🎫', label: 'Consultar Tickets' },
    ticket_create: { bg: 'bg-teal-50', border: 'border-teal-300', icon: '📝', label: 'Crear Ticket' },
    sales_lookup: { bg: 'bg-indigo-50', border: 'border-indigo-300', icon: '📊', label: 'Consultar Ventas' },
};

function FlowNode({ data, type, selected }: NodeProps) {
    const color = nodeColors[type as string] || nodeColors.message;
    return (
        <div className={`rounded-xl border-2 ${color.border} ${color.bg} shadow-sm min-w-[200px] max-w-[260px] ${selected ? 'ring-2 ring-blue-500 ring-offset-2' : ''}`}>
            <div className={`px-3 py-2 flex items-center gap-2 border-b ${color.border}`}>
                <span className="text-base">{color.icon}</span>
                <span className="text-xs font-bold text-gray-700 uppercase tracking-wide">{color.label}</span>
            </div>
            <div className="px-3 py-2">
                {type === 'trigger' && (
                    <p className="text-xs text-gray-600">{data.triggerInfo || 'Inicio del flujo'}</p>
                )}
                {type === 'message' && (
                    <p className="text-xs text-gray-700 line-clamp-3">{data.message || 'Escribir mensaje...'}</p>
                )}
                {type === 'question' && (
                    <>
                        <p className="text-xs text-gray-700 line-clamp-2">{data.message || 'Escribir pregunta...'}</p>
                        {data.variable && <span className="mt-1 inline-block text-[10px] bg-purple-200 text-purple-800 px-1.5 py-0.5 rounded-full">→ {`{{${data.variable}}}`}</span>}
                    </>
                )}
                {type === 'condition' && (
                    <div className="text-xs text-gray-700">
                        <span className="font-medium">{`{{${data.variable || '?'}}}`}</span>{' '}
                        <span className="text-orange-600 font-bold">{data.operator || '='}</span>{' '}
                        <span className="italic">"{data.value || ''}"</span>
                    </div>
                )}
                {type === 'delay' && (
                    <p className="text-xs text-gray-700">Esperar <strong>{data.seconds || 2}</strong> segundos</p>
                )}
                {type === 'api_call' && (
                    <p className="text-xs text-gray-700 truncate">{data.method || 'GET'} {data.url || 'URL...'}</p>
                )}
                {type === 'assign_agent' && (
                    <p className="text-xs text-gray-700 line-clamp-2">{data.message || 'Transferir a agente'}</p>
                )}
                {type === 'ticket_lookup' && (
                    <p className="text-xs text-gray-700">Busca tickets del contacto por su teléfono</p>
                )}
                {type === 'ticket_create' && (
                    <p className="text-xs text-gray-700">Crea un ticket con la descripción del usuario</p>
                )}
                {type === 'sales_lookup' && (
                    <p className="text-xs text-gray-700">Consulta presupuestos y pedidos del contacto</p>
                )}
            </div>
            {/* Handles */}
            {type !== 'trigger' && <Handle type="target" position={Position.Top} className="!w-3 !h-3 !bg-gray-400 !border-2 !border-white" />}
            {type === 'condition' ? (
                <>
                    <Handle type="source" position={Position.Bottom} id="yes" className="!w-3 !h-3 !bg-green-500 !border-2 !border-white !left-[30%]" />
                    <Handle type="source" position={Position.Bottom} id="no" className="!w-3 !h-3 !bg-red-500 !border-2 !border-white !left-[70%]" />
                    <div className="flex justify-between px-4 pb-1">
                        <span className="text-[9px] text-green-600 font-bold">Sí</span>
                        <span className="text-[9px] text-red-600 font-bold">No</span>
                    </div>
                </>
            ) : (
                <Handle type="source" position={Position.Bottom} id="default" className="!w-3 !h-3 !bg-gray-400 !border-2 !border-white" />
            )}
        </div>
    );
}

const nodeTypes = {
    trigger: FlowNode,
    message: FlowNode,
    question: FlowNode,
    condition: FlowNode,
    delay: FlowNode,
    api_call: FlowNode,
    assign_agent: FlowNode,
    ticket_lookup: FlowNode,
    ticket_create: FlowNode,
    sales_lookup: FlowNode,
};

// ═══════════════════════════════════════════
//  NODE PALETTE
// ═══════════════════════════════════════════

const paletteItems = [
    { type: 'message', icon: MessageSquare, label: 'Mensaje', color: 'text-blue-600 bg-blue-50 border-blue-200' },
    { type: 'question', icon: HelpCircle, label: 'Pregunta', color: 'text-purple-600 bg-purple-50 border-purple-200' },
    { type: 'condition', icon: GitBranch, label: 'Condición', color: 'text-orange-600 bg-orange-50 border-orange-200' },
    { type: 'delay', icon: Clock, label: 'Espera', color: 'text-gray-600 bg-gray-50 border-gray-200' },
    { type: 'api_call', icon: Globe, label: 'API Call', color: 'text-green-600 bg-green-50 border-green-200' },
    { type: 'assign_agent', icon: UserCheck, label: 'Asignar Agente', color: 'text-red-600 bg-red-50 border-red-200' },
    { type: 'ticket_lookup', icon: Ticket, label: 'Consultar Tickets', color: 'text-cyan-600 bg-cyan-50 border-cyan-200' },
    { type: 'ticket_create', icon: FilePlus2, label: 'Crear Ticket', color: 'text-teal-600 bg-teal-50 border-teal-200' },
    { type: 'sales_lookup', icon: Ticket, label: 'Consultar Ventas', color: 'text-indigo-600 bg-indigo-50 border-indigo-200' },
];

// ═══════════════════════════════════════════
//  MAIN COMPONENT
// ═══════════════════════════════════════════

export default function BotFlows() {
    const [flows, setFlows] = useState<BotFlow[]>([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState<'list' | 'editor'>('list');
    const [currentFlow, setCurrentFlow] = useState<BotFlow | null>(null);
    const [flowName, setFlowName] = useState('');
    const [flowDesc, setFlowDesc] = useState('');
    const [triggerType, setTriggerType] = useState('keyword');
    const [triggerValue, setTriggerValue] = useState('');
    const [saving, setSaving] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // React Flow state
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [selectedNode, setSelectedNode] = useState<Node | null>(null);
    const nodeIdCounter = useRef(1);

    // ─── Data Fetching ───
    useEffect(() => {
        fetchFlows();
    }, []);

    async function fetchFlows() {
        try {
            const res = await api.get('/bot-flows/');
            setFlows(res.data);
        } catch (e) {
            console.error('Error fetching bot flows:', e);
        } finally {
            setLoading(false);
        }
    }

    // ─── Flow CRUD ───
    function openNewFlow() {
        setCurrentFlow(null);
        setFlowName('Nuevo Flujo');
        setFlowDesc('');
        setTriggerType('keyword');
        setTriggerValue('');
        const startNode: Node = {
            id: 'trigger-1',
            type: 'trigger',
            position: { x: 300, y: 50 },
            data: { triggerInfo: 'Inicio del flujo' },
        };
        setNodes([startNode]);
        setEdges([]);
        nodeIdCounter.current = 2;
        setView('editor');
        setSelectedNode(null);
    }

    function openEditFlow(flow: BotFlow) {
        setCurrentFlow(flow);
        setFlowName(flow.name);
        setFlowDesc(flow.description || '');
        setTriggerType(flow.trigger_type);
        setTriggerValue(flow.trigger_value || '');
        setNodes(flow.nodes || []);
        setEdges(flow.edges || []);
        const maxId = Math.max(0, ...(flow.nodes || []).map((n: any) => parseInt(n.id?.replace(/\D/g, '') || '0')));
        nodeIdCounter.current = maxId + 1;
        setView('editor');
        setSelectedNode(null);
    }

    async function saveFlow() {
        setSaving(true);
        try {
            const payload = {
                name: flowName,
                description: flowDesc,
                trigger_type: triggerType,
                trigger_value: triggerValue,
                nodes: nodes.map(n => ({ id: n.id, type: n.type, position: n.position, data: n.data })),
                edges: edges.map(e => ({ id: e.id, source: e.source, target: e.target, sourceHandle: e.sourceHandle, targetHandle: e.targetHandle })),
            };
            if (currentFlow) {
                const res = await api.put(`/bot-flows/${currentFlow.id}`, payload);
                setFlows(flows.map(f => f.id === currentFlow.id ? res.data : f));
                setCurrentFlow(res.data);
            } else {
                const res = await api.post('/bot-flows/', payload);
                setFlows([res.data, ...flows]);
                setCurrentFlow(res.data);
            }
        } catch (e) {
            console.error('Error saving flow:', e);
        } finally {
            setSaving(false);
        }
    }

    async function toggleFlow(flow: BotFlow) {
        try {
            const res = await api.post(`/bot-flows/${flow.id}/toggle`);
            setFlows(flows.map(f => f.id === flow.id ? res.data : f));
        } catch (e) {
            console.error('Error toggling flow:', e);
        }
    }

    async function deleteFlow(flow: BotFlow) {
        if (!confirm(`¿Eliminar el flujo "${flow.name}"?`)) return;
        try {
            await api.delete(`/bot-flows/${flow.id}`);
            setFlows(flows.filter(f => f.id !== flow.id));
        } catch (e) {
            console.error('Error deleting flow:', e);
        }
    }

    // ─── React Flow Callbacks ───
    const onConnect = useCallback((params: Connection) => {
        setEdges(eds => addEdge({
            ...params,
            markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16 },
            style: { strokeWidth: 2, stroke: '#94a3b8' },
            animated: true,
        }, eds));
    }, [setEdges]);

    function addNode(type: string) {
        const newNode: Node = {
            id: `${type}-${nodeIdCounter.current++}`,
            type,
            position: { x: 250 + Math.random() * 100, y: 150 + nodes.length * 100 },
            data: getDefaultNodeData(type),
        };
        setNodes(nds => [...nds, newNode]);
    }

    function getDefaultNodeData(type: string): Record<string, any> {
        switch (type) {
            case 'message': return { message: '' };
            case 'question': return { message: '', variable: 'respuesta' };
            case 'condition': return { variable: 'respuesta', operator: 'contains', value: '' };
            case 'delay': return { seconds: 3 };
            case 'api_call': return { url: '', method: 'GET', variable: 'apiResponse' };
            case 'assign_agent': return { message: '👤 Un agente se pondrá en contacto contigo pronto.' };
            default: return {};
        }
    }

    function deleteSelectedNode() {
        if (!selectedNode || selectedNode.type === 'trigger') return;
        setNodes(nds => nds.filter(n => n.id !== selectedNode.id));
        setEdges(eds => eds.filter(e => e.source !== selectedNode.id && e.target !== selectedNode.id));
        setSelectedNode(null);
    }

    function updateNodeData(nodeId: string, key: string, value: any) {
        setNodes(nds => nds.map(n =>
            n.id === nodeId ? { ...n, data: { ...n.data, [key]: value } } : n
        ));
        if (selectedNode?.id === nodeId) {
            setSelectedNode(prev => prev ? { ...prev, data: { ...prev.data, [key]: value } } : null);
        }
    }

    const filteredFlows = flows.filter(f =>
        f.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (f.description || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    // ═══════════════════════════════════════════
    //  LIST VIEW
    // ═══════════════════════════════════════════
    if (view === 'list') {
        return (
            <div className="p-6 max-w-6xl mx-auto">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                            <Zap className="text-green-500" size={28} /> Bot Flows — WhatsApp
                        </h1>
                        <p className="text-sm text-gray-500 mt-1">Diseñá flujos conversacionales automatizados para WhatsApp</p>
                    </div>
                    <button onClick={openNewFlow}
                        className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-shadow">
                        <Plus size={18} /> Nuevo Flujo
                    </button>
                </div>

                {/* Search */}
                <div className="relative mb-4">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Buscar flujos..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none text-sm"
                    />
                </div>

                {loading ? (
                    <div className="text-center py-12 text-gray-500">Cargando flujos...</div>
                ) : filteredFlows.length === 0 ? (
                    <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 shadow-sm">
                        <Zap size={48} className="mx-auto text-gray-300 mb-3" />
                        <p className="text-gray-500 mb-1">{flows.length === 0 ? 'No hay flujos creados' : 'Sin resultados'}</p>
                        <button onClick={openNewFlow} className="mt-3 text-sm text-green-600 hover:text-green-700 font-medium">
                            + Crear primer flujo
                        </button>
                    </div>
                ) : (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {filteredFlows.map(flow => (
                            <div key={flow.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                                <div className="p-5">
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-bold text-gray-900 truncate">{flow.name}</h3>
                                            <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{flow.description || 'Sin descripción'}</p>
                                        </div>
                                        <button onClick={() => toggleFlow(flow)}
                                            className={`ml-2 shrink-0 ${flow.is_active ? 'text-green-500' : 'text-gray-300'}`}
                                            title={flow.is_active ? 'Desactivar' : 'Activar'}>
                                            {flow.is_active ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
                                        </button>
                                    </div>

                                    <div className="flex items-center gap-2 mb-3">
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${flow.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                            {flow.is_active ? '● Activo' : '○ Inactivo'}
                                        </span>
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] bg-blue-50 text-blue-600 font-medium">
                                            {flow.trigger_type === 'keyword' ? `🔑 ${flow.trigger_value || 'keyword'}` :
                                                flow.trigger_type === 'any' ? '📨 Cualquier mensaje' :
                                                    flow.trigger_type === 'first_message' ? '👋 Primer mensaje' :
                                                        flow.trigger_type}
                                        </span>
                                    </div>

                                    <div className="text-[11px] text-gray-400">
                                        {flow.nodes?.length || 0} nodos · Actualizado {new Date(flow.updated_at).toLocaleDateString('es')}
                                    </div>
                                </div>

                                <div className="border-t border-gray-100 px-3 py-2 flex items-center justify-end gap-1 bg-gray-50/50">
                                    <button onClick={() => openEditFlow(flow)}
                                        className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors" title="Editar">
                                        <Pencil size={16} />
                                    </button>
                                    <button onClick={() => deleteFlow(flow)}
                                        className="p-2 hover:bg-red-50 text-red-500 rounded-lg transition-colors" title="Eliminar">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    // ═══════════════════════════════════════════
    //  EDITOR VIEW
    // ═══════════════════════════════════════════
    return (
        <div className="flex flex-col h-[calc(100vh-64px)]">
            {/* Top Bar */}
            <div className="flex items-center justify-between px-4 py-2.5 bg-white border-b border-gray-200 shadow-sm shrink-0">
                <div className="flex items-center gap-3">
                    <button onClick={() => { setView('list'); setSelectedNode(null); }}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                        <ArrowLeft size={18} />
                    </button>
                    <input
                        type="text"
                        value={flowName}
                        onChange={(e) => setFlowName(e.target.value)}
                        className="text-lg font-bold text-gray-900 bg-transparent border-none outline-none focus:ring-0 w-48 md:w-64"
                        placeholder="Nombre del flujo"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={saveFlow} disabled={saving}
                        className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg font-medium text-sm shadow-sm hover:shadow-md transition-shadow disabled:opacity-50">
                        <Save size={16} /> {saving ? 'Guardando...' : 'Guardar'}
                    </button>
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden">
                {/* Left: Node Palette */}
                <div className="w-56 bg-white border-r border-gray-200 p-3 overflow-y-auto shrink-0">
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Nodos</h3>
                    <div className="space-y-2">
                        {paletteItems.map(item => (
                            <button
                                key={item.type}
                                onClick={() => addNode(item.type)}
                                className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition-colors hover:shadow-sm ${item.color}`}
                            >
                                <item.icon size={16} /> {item.label}
                            </button>
                        ))}
                    </div>

                    <hr className="my-4 border-gray-200" />

                    {/* Trigger Config */}
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Trigger</h3>
                    <select value={triggerType} onChange={(e) => setTriggerType(e.target.value)}
                        className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg mb-2 outline-none focus:ring-2 focus:ring-green-400">
                        <option value="keyword">Palabra clave</option>
                        <option value="any">Cualquier mensaje</option>
                        <option value="regex">Regex</option>
                    </select>
                    {triggerType !== 'any' && (
                        <input
                            type="text"
                            value={triggerValue}
                            onChange={(e) => setTriggerValue(e.target.value)}
                            placeholder={triggerType === 'keyword' ? 'hola, info, precio' : '\\binfo\\b'}
                            className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-green-400"
                        />
                    )}

                    <hr className="my-4 border-gray-200" />
                    <div>
                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Descripción</h3>
                        <textarea
                            value={flowDesc}
                            onChange={(e) => setFlowDesc(e.target.value)}
                            placeholder="Descripción del flujo..."
                            className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-green-400 resize-none h-16"
                        />
                    </div>
                </div>

                {/* Center: Canvas */}
                <div className="flex-1 relative">
                    <ReactFlow
                        nodes={nodes}
                        edges={edges}
                        onNodesChange={onNodesChange}
                        onEdgesChange={onEdgesChange}
                        onConnect={onConnect}
                        nodeTypes={nodeTypes}
                        onNodeClick={(_, node) => setSelectedNode(node)}
                        onPaneClick={() => setSelectedNode(null)}
                        fitView
                        defaultEdgeOptions={{
                            markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16 },
                            style: { strokeWidth: 2, stroke: '#94a3b8' },
                            animated: true,
                        }}
                    >
                        <Background gap={16} size={1} color="#e5e7eb" />
                        <Controls position="bottom-right" />
                        <MiniMap nodeStrokeWidth={3} pannable zoomable position="bottom-left" />
                    </ReactFlow>
                </div>

                {/* Right: Properties Panel */}
                {selectedNode && selectedNode.type !== 'trigger' && (
                    <div className="w-72 bg-white border-l border-gray-200 p-4 overflow-y-auto shrink-0">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-bold text-gray-900">
                                {nodeColors[selectedNode.type as string]?.icon} {nodeColors[selectedNode.type as string]?.label}
                            </h3>
                            <button onClick={deleteSelectedNode} className="p-1.5 hover:bg-red-50 text-red-500 rounded-lg" title="Eliminar nodo">
                                <Trash2 size={14} />
                            </button>
                        </div>

                        {/* Message Node */}
                        {selectedNode.type === 'message' && (
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Mensaje</label>
                                <textarea
                                    value={selectedNode.data?.message || ''}
                                    onChange={(e) => updateNodeData(selectedNode.id, 'message', e.target.value)}
                                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-400 resize-none h-28"
                                    placeholder="Hola! 👋 ¿En qué te puedo ayudar?"
                                />
                                <p className="text-[10px] text-gray-400 mt-1">Usá {'{{variable}}'} para insertar variables</p>
                            </div>
                        )}

                        {/* Question Node */}
                        {selectedNode.type === 'question' && (
                            <div className="space-y-3">
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">Pregunta</label>
                                    <textarea
                                        value={selectedNode.data?.message || ''}
                                        onChange={(e) => updateNodeData(selectedNode.id, 'message', e.target.value)}
                                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-purple-400 resize-none h-20"
                                        placeholder="¿Cuál es tu nombre?"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">Guardar respuesta en</label>
                                    <input
                                        type="text"
                                        value={selectedNode.data?.variable || ''}
                                        onChange={(e) => updateNodeData(selectedNode.id, 'variable', e.target.value)}
                                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-purple-400"
                                        placeholder="nombre"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Condition Node */}
                        {selectedNode.type === 'condition' && (
                            <div className="space-y-3">
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">Variable</label>
                                    <input
                                        type="text"
                                        value={selectedNode.data?.variable || ''}
                                        onChange={(e) => updateNodeData(selectedNode.id, 'variable', e.target.value)}
                                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-orange-400"
                                        placeholder="respuesta"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">Operador</label>
                                    <select
                                        value={selectedNode.data?.operator || 'contains'}
                                        onChange={(e) => updateNodeData(selectedNode.id, 'operator', e.target.value)}
                                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-orange-400"
                                    >
                                        <option value="contains">Contiene</option>
                                        <option value="equals">Es igual a</option>
                                        <option value="starts_with">Empieza con</option>
                                        <option value="regex">Regex</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">Valor</label>
                                    <input
                                        type="text"
                                        value={selectedNode.data?.value || ''}
                                        onChange={(e) => updateNodeData(selectedNode.id, 'value', e.target.value)}
                                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-orange-400"
                                        placeholder="sí"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Delay Node */}
                        {selectedNode.type === 'delay' && (
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Segundos</label>
                                <input
                                    type="number"
                                    min={1}
                                    max={30}
                                    value={selectedNode.data?.seconds || 3}
                                    onChange={(e) => updateNodeData(selectedNode.id, 'seconds', parseInt(e.target.value))}
                                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-gray-400"
                                />
                            </div>
                        )}

                        {/* API Call Node */}
                        {selectedNode.type === 'api_call' && (
                            <div className="space-y-3">
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">Método</label>
                                    <select
                                        value={selectedNode.data?.method || 'GET'}
                                        onChange={(e) => updateNodeData(selectedNode.id, 'method', e.target.value)}
                                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-green-400"
                                    >
                                        <option>GET</option>
                                        <option>POST</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">URL</label>
                                    <input
                                        type="text"
                                        value={selectedNode.data?.url || ''}
                                        onChange={(e) => updateNodeData(selectedNode.id, 'url', e.target.value)}
                                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-green-400"
                                        placeholder="https://api.example.com/data"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">Guardar resultado en</label>
                                    <input
                                        type="text"
                                        value={selectedNode.data?.variable || ''}
                                        onChange={(e) => updateNodeData(selectedNode.id, 'variable', e.target.value)}
                                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-green-400"
                                        placeholder="apiResponse"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Assign Agent Node */}
                        {selectedNode.type === 'assign_agent' && (
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Mensaje al usuario</label>
                                <textarea
                                    value={selectedNode.data?.message || ''}
                                    onChange={(e) => updateNodeData(selectedNode.id, 'message', e.target.value)}
                                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-red-400 resize-none h-20"
                                    placeholder="Un agente se pondrá en contacto contigo pronto."
                                />
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
