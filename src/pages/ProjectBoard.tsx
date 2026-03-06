import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft, Plus, X, Bug, CheckSquare, FileText, BookOpen, AlertTriangle,
    Clock, Users, Play, Pause, CheckCircle2, User, Calendar, Tag, Zap,
    ChevronDown, ChevronRight, Layers, GitBranch, BarChart3, ListTree, Milestone,
    Paperclip, Upload, Trash2, Square, SquareCheckBig, Pencil
} from 'lucide-react';
import api from '../api/client';

interface Project { id: number; name: string; key: string; methodology: string; status: string; description: string | null; }
interface Sprint { id: number; name: string; goal: string | null; start_date: string | null; end_date: string | null; status: string; version_id: number | null; }
interface Version { id: number; name: string; description: string | null; start_date: string | null; release_date: string | null; status: string; sprint_count: number; }
interface Task {
    id: number; key: string; title: string; description: string | null; type: string;
    status: string; priority: string; assigned_to: number | null; reporter: number | null;
    story_points: number | null; position: number; labels: string | null;
    sprint_id: number | null; parent_id: number | null; due_date: string | null;
    start_date: string | null; project_id: number; children_count: number;
    checklist_count: number; checked_count: number; attachments_count: number;
}
interface GanttItem {
    id: number; key: string; title: string; type: string; status: string; priority: string;
    parent_id: number | null; start_date: string; end_date: string | null;
    progress: number; assigned_to: number | null;
}
interface UserInfo { id: number; username: string; full_name?: string; }
interface ChecklistItem { id: number; text: string; is_checked: boolean; position: number; }
interface Attachment { id: number; filename: string; file_url: string; file_size: number | null; created_at: string; }

const COLUMNS = [
    { id: 'todo', label: 'Por Hacer', icon: Clock, color: '#6b7280', bg: '#f9fafb' },
    { id: 'in_progress', label: 'En Progreso', icon: Play, color: '#2563eb', bg: '#eff6ff' },
    { id: 'in_review', label: 'En Revisión', icon: Pause, color: '#d97706', bg: '#fffbeb' },
    { id: 'done', label: 'Hecho', icon: CheckCircle2, color: '#16a34a', bg: '#f0fdf4' },
];

const TYPES = [
    { v: 'epic', label: 'Épica', icon: Layers, color: '#7c3aed' },
    { v: 'feature', label: 'Feature', icon: Zap, color: '#0891b2' },
    { v: 'story', label: 'Historia', icon: BookOpen, color: '#059669' },
    { v: 'task', label: 'Tarea', icon: CheckSquare, color: '#2563eb' },
    { v: 'bug', label: 'Bug', icon: Bug, color: '#dc2626' },
    { v: 'subtask', label: 'Subtarea', icon: ListTree, color: '#6b7280' },
];

const PRIORITIES = [
    { v: 'low', label: 'Baja', color: '#6b7280' },
    { v: 'medium', label: 'Media', color: '#2563eb' },
    { v: 'high', label: 'Alta', color: '#f59e0b' },
    { v: 'critical', label: 'Crítica', color: '#dc2626' },
];

const getTypeInfo = (t: string) => TYPES.find(x => x.v === t) || TYPES[3];
const getPriorityInfo = (p: string) => PRIORITIES.find(x => x.v === p) || PRIORITIES[1];

export default function ProjectBoard() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const projectId = parseInt(id || '0');

    const [project, setProject] = useState<Project | null>(null);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [sprints, setSprints] = useState<Sprint[]>([]);
    const [versions, setVersions] = useState<Version[]>([]);
    const [users, setUsers] = useState<UserInfo[]>([]);
    const [ganttData, setGanttData] = useState<GanttItem[]>([]);
    const [activeSprint, setActiveSprint] = useState<number | null>(null);
    const [showTaskModal, setShowTaskModal] = useState(false);
    const [showSprintModal, setShowSprintModal] = useState(false);
    const [editingSprint, setEditingSprint] = useState<Sprint | null>(null);
    const [showVersionModal, setShowVersionModal] = useState(false);
    const [editTask, setEditTask] = useState<Task | null>(null);
    const [subtasks, setSubtasks] = useState<Task[]>([]);
    const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
    const [attachments, setAttachments] = useState<Attachment[]>([]);
    const [newCheckItem, setNewCheckItem] = useState('');
    const [tab, setTab] = useState<'board' | 'backlog' | 'gantt'>('board');
    const [filterType, setFilterType] = useState('');
    const [filterAssignee, setFilterAssignee] = useState('');
    const [expandedEpics, setExpandedEpics] = useState<Set<number>>(new Set());
    const fileInputRef = useRef<HTMLInputElement>(null);

    const dragItem = useRef<{ taskId: number; fromCol: string } | null>(null);
    const [dragOverCol, setDragOverCol] = useState<string | null>(null);

    const [taskForm, setTaskForm] = useState({
        title: '', description: '', type: 'task', priority: 'medium',
        assigned_to: '', story_points: '', labels: '', due_date: '', start_date: '',
        sprint_id: '', parent_id: '',
    });
    const [sprintForm, setSprintForm] = useState({ name: '', goal: '', start_date: '', end_date: '', version_id: '' });
    const [versionForm, setVersionForm] = useState({ name: '', description: '', start_date: '', release_date: '' });

    useEffect(() => {
        if (!projectId) return;
        api.get(`/projects/${projectId}`).then(r => setProject(r.data)).catch(() => navigate('/projects'));
        api.get(`/projects/${projectId}/sprints`).then(r => {
            setSprints(r.data);
            const active = r.data.find((s: Sprint) => s.status === 'active');
            if (active) setActiveSprint(active.id);
        });
        api.get(`/projects/${projectId}/versions`).then(r => setVersions(r.data));
        api.get('/users/').then(r => setUsers(r.data)).catch(() => { });
    }, [projectId]);

    const loadTasks = useCallback(async () => {
        const params: any = {};
        if (activeSprint && tab === 'board') params.sprint_id = activeSprint;
        if (tab === 'backlog') params.backlog = true;
        const { data } = await api.get(`/projects/${projectId}/tasks`, { params });
        setTasks(data);
    }, [projectId, activeSprint, tab]);

    useEffect(() => { if (projectId) loadTasks(); }, [loadTasks]);

    useEffect(() => {
        if (tab === 'gantt' && projectId) {
            api.get(`/projects/${projectId}/gantt`).then(r => setGanttData(r.data));
        }
    }, [tab, projectId]);

    const getUserName = (uid: number | null) => {
        if (!uid) return null;
        const u = users.find(x => x.id === uid);
        return u ? (u.full_name || u.username) : null;
    };

    // ── Task CRUD ──
    const openCreateTask = (parentId?: number, taskType?: string) => {
        setEditTask(null);
        setSubtasks([]); setChecklist([]); setAttachments([]); setNewCheckItem('');
        setTaskForm({
            title: '', description: '', type: taskType || 'task', priority: 'medium',
            assigned_to: '', story_points: '', labels: '', due_date: '', start_date: '',
            sprint_id: activeSprint ? String(activeSprint) : '',
            parent_id: parentId ? String(parentId) : '',
        });
        setShowTaskModal(true);
    };

    const openEditTask = async (t: Task) => {
        setEditTask(t);
        setTaskForm({
            title: t.title, description: t.description || '', type: t.type,
            priority: t.priority, assigned_to: t.assigned_to ? String(t.assigned_to) : '',
            story_points: t.story_points ? String(t.story_points) : '',
            labels: t.labels || '', due_date: t.due_date || '', start_date: t.start_date || '',
            sprint_id: t.sprint_id ? String(t.sprint_id) : '',
            parent_id: t.parent_id ? String(t.parent_id) : '',
        });
        // Load subtasks, checklist, attachments
        try {
            const [subRes, clRes, atRes] = await Promise.all([
                api.get(`/projects/${projectId}/tasks/${t.id}/subtasks`),
                api.get(`/projects/${projectId}/tasks/${t.id}/checklist`),
                api.get(`/projects/${projectId}/tasks/${t.id}/attachments`),
            ]);
            setSubtasks(subRes.data); setChecklist(clRes.data); setAttachments(atRes.data);
        } catch { setSubtasks([]); setChecklist([]); setAttachments([]); }
        setNewCheckItem('');
        setShowTaskModal(true);
    };

    const saveTask = async () => {
        const payload: any = {
            title: taskForm.title, description: taskForm.description || null,
            type: taskForm.type, priority: taskForm.priority,
            assigned_to: taskForm.assigned_to ? parseInt(taskForm.assigned_to) : null,
            story_points: taskForm.story_points ? parseInt(taskForm.story_points) : null,
            labels: taskForm.labels || null,
            due_date: taskForm.due_date || null, start_date: taskForm.start_date || null,
            sprint_id: taskForm.sprint_id ? parseInt(taskForm.sprint_id) : null,
            parent_id: taskForm.parent_id ? parseInt(taskForm.parent_id) : null,
        };
        try {
            if (editTask) await api.put(`/projects/${projectId}/tasks/${editTask.id}`, payload);
            else await api.post(`/projects/${projectId}/tasks`, payload);
            setShowTaskModal(false);
            loadTasks();
        } catch (e) { console.error(e); }
    };

    const deleteTask = async (taskId: number) => {
        if (!confirm('¿Eliminar tarea y subtareas?')) return;
        await api.delete(`/projects/${projectId}/tasks/${taskId}`);
        loadTasks();
    };

    // ── Sprint ──
    const saveSprint = async () => {
        const payload = {
            name: sprintForm.name, goal: sprintForm.goal || null,
            start_date: sprintForm.start_date || null, end_date: sprintForm.end_date || null,
            version_id: sprintForm.version_id ? parseInt(sprintForm.version_id) : null,
        };
        if (editingSprint) {
            await api.put(`/projects/${projectId}/sprints/${editingSprint.id}`, payload);
        } else {
            await api.post(`/projects/${projectId}/sprints`, payload);
        }
        setShowSprintModal(false);
        setEditingSprint(null);
        const { data } = await api.get(`/projects/${projectId}/sprints`);
        setSprints(data);
    };

    const openEditSprint = (sprint: Sprint) => {
        setEditingSprint(sprint);
        setSprintForm({
            name: sprint.name,
            goal: sprint.goal || '',
            start_date: sprint.start_date || '',
            end_date: sprint.end_date || '',
            version_id: sprint.version_id ? String(sprint.version_id) : '',
        });
        setShowSprintModal(true);
    };

    const deleteSprint = async (sprintId: number) => {
        if (!confirm('¿Eliminar este sprint? Las tareas asociadas quedarán sin sprint.')) return;
        await api.delete(`/projects/${projectId}/sprints/${sprintId}`);
        const { data } = await api.get(`/projects/${projectId}/sprints`);
        setSprints(data);
        if (activeSprint === sprintId) setActiveSprint(null);
    };

    const toggleSprintStatus = async (sprint: Sprint) => {
        const newStatus = sprint.status === 'active' ? 'completed' : 'active';
        await api.put(`/projects/${projectId}/sprints/${sprint.id}`, { status: newStatus });
        const { data } = await api.get(`/projects/${projectId}/sprints`);
        setSprints(data);
        if (newStatus === 'active') setActiveSprint(sprint.id);
    };

    // ── Version ──
    const saveVersion = async () => {
        await api.post(`/projects/${projectId}/versions`, {
            name: versionForm.name, description: versionForm.description || null,
            start_date: versionForm.start_date || null, release_date: versionForm.release_date || null,
        });
        setShowVersionModal(false);
        const { data } = await api.get(`/projects/${projectId}/versions`);
        setVersions(data);
    };

    // ── Drag & Drop ──
    const handleDragStart = (taskId: number, fromCol: string) => { dragItem.current = { taskId, fromCol }; };
    const handleDragOver = (e: React.DragEvent, colId: string) => { e.preventDefault(); setDragOverCol(colId); };
    const handleDrop = async (e: React.DragEvent, toCol: string) => {
        e.preventDefault(); setDragOverCol(null);
        if (!dragItem.current || dragItem.current.fromCol === toCol) return;
        const { taskId } = dragItem.current;
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: toCol } : t));
        try { await api.patch(`/projects/${projectId}/tasks/${taskId}/move`, { status: toCol, position: 0 }); }
        catch { loadTasks(); }
        dragItem.current = null;
    };

    const toggleEpic = (id: number) => {
        setExpandedEpics(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
    };

    const filteredTasks = tasks.filter(t => {
        if (filterType && t.type !== filterType) return false;
        if (filterAssignee && String(t.assigned_to) !== filterAssignee) return false;
        return true;
    });

    const columnTasks = (colId: string) => filteredTasks.filter(t => t.status === colId && !t.parent_id);
    const childTasksOf = (parentId: number) => filteredTasks.filter(t => t.parent_id === parentId);

    if (!project) return <div className="flex-1 flex items-center justify-center text-gray-400">Cargando...</div>;

    // ── Gantt helpers ──
    const renderGantt = () => {
        if (ganttData.length === 0) return <div className="flex-1 flex items-center justify-center text-gray-400 text-sm p-8">No hay tareas con fechas para el Gantt. Agregá fechas de inicio y fin a tus tareas.</div>;
        const dates = ganttData.flatMap(g => [g.start_date, g.end_date].filter(Boolean) as string[]);
        if (dates.length === 0) return null;
        const minD = new Date(Math.min(...dates.map(d => new Date(d).getTime())));
        const maxD = new Date(Math.max(...dates.map(d => new Date(d).getTime())));
        const diffDays = Math.max(Math.ceil((maxD.getTime() - minD.getTime()) / 86400000), 14);
        const dayW = Math.max(30, Math.min(60, 900 / diffDays));
        const totalW = diffDays * dayW;

        const months: { label: string; start: number; width: number }[] = [];
        let cur = new Date(minD);
        while (cur <= maxD) {
            const mStart = Math.max(0, Math.floor((cur.getTime() - minD.getTime()) / 86400000));
            const mEnd = new Date(cur.getFullYear(), cur.getMonth() + 1, 0);
            const mDays = Math.min(Math.ceil((mEnd.getTime() - cur.getTime()) / 86400000) + 1, diffDays - mStart);
            months.push({ label: cur.toLocaleString('es', { month: 'short', year: '2-digit' }), start: mStart * dayW, width: mDays * dayW });
            cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
        }

        const todayOff = Math.floor((Date.now() - minD.getTime()) / 86400000) * dayW;

        return (
            <div className="flex-1 overflow-auto p-4">
                <div className="flex">
                    {/* Left: task names */}
                    <div className="w-64 flex-shrink-0 border-r border-gray-200 bg-white">
                        <div className="h-10 border-b border-gray-200 px-3 flex items-center text-[10px] font-bold text-gray-500 uppercase">Tarea</div>
                        {ganttData.map(g => {
                            const ti = getTypeInfo(g.type);
                            return (
                                <div key={g.id} className="h-9 border-b border-gray-100 px-3 flex items-center gap-2" style={{ paddingLeft: g.parent_id ? '32px' : '12px' }}>
                                    <ti.icon size={12} style={{ color: ti.color }} />
                                    <span className="text-[10px] text-gray-400 font-bold">{g.key}</span>
                                    <span className="text-xs text-gray-700 truncate">{g.title}</span>
                                </div>
                            );
                        })}
                    </div>
                    {/* Right: Gantt bars */}
                    <div className="flex-1 overflow-x-auto">
                        <div style={{ width: totalW, minWidth: '100%' }}>
                            {/* Month headers */}
                            <div className="h-10 border-b border-gray-200 flex relative bg-gray-50">
                                {months.map((m, i) => (
                                    <div key={i} className="absolute h-full flex items-center justify-center text-[10px] font-bold text-gray-500 border-r border-gray-200"
                                        style={{ left: m.start, width: m.width }}>{m.label}</div>
                                ))}
                            </div>
                            {/* Today line */}
                            {todayOff >= 0 && todayOff <= totalW && (
                                <div className="absolute top-10 bottom-0 w-px bg-red-400 z-10" style={{ left: 256 + todayOff }} />
                            )}
                            {/* Bars */}
                            {ganttData.map(g => {
                                const ti = getTypeInfo(g.type);
                                const sD = new Date(g.start_date);
                                const eD = g.end_date ? new Date(g.end_date) : new Date(sD.getTime() + 3 * 86400000);
                                const left = Math.max(0, Math.floor((sD.getTime() - minD.getTime()) / 86400000)) * dayW;
                                const w = Math.max(dayW, Math.ceil((eD.getTime() - sD.getTime()) / 86400000) * dayW);
                                const isEpic = g.type === 'epic' || g.type === 'feature';
                                return (
                                    <div key={g.id} className="h-9 border-b border-gray-50 relative">
                                        <div className={`absolute top-1.5 rounded-md flex items-center gap-1 px-2 text-white text-[10px] font-medium shadow-sm cursor-default ${isEpic ? 'h-5' : 'h-5'}`}
                                            style={{ left, width: w, backgroundColor: ti.color, opacity: g.status === 'done' ? 0.6 : 1 }}
                                            title={`${g.key}: ${g.title}`}>
                                            <span className="truncate">{g.key}</span>
                                            {/* Progress */}
                                            {g.progress > 0 && g.progress < 100 && (
                                                <div className="absolute bottom-0 left-0 h-1 bg-white/40 rounded-b-md" style={{ width: `${g.progress}%` }} />
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const renderTaskCard = (task: Task, col: { id: string }) => {
        const typeInfo = getTypeInfo(task.type);
        const prioInfo = getPriorityInfo(task.priority);
        const assigneeName = getUserName(task.assigned_to);
        const isGrouping = task.type === 'epic' || task.type === 'feature' || task.type === 'story';
        const children = childTasksOf(task.id);

        return (
            <div key={task.id}>
                <div draggable onDragStart={() => handleDragStart(task.id, col.id)}
                    onDragEnd={() => { dragItem.current = null; setDragOverCol(null); }}
                    onClick={() => openEditTask(task)}
                    className={`bg-white rounded-lg border p-3 cursor-grab active:cursor-grabbing hover:shadow-md transition-all group ${isGrouping ? 'border-l-4' : 'border-gray-200'}`}
                    style={isGrouping ? { borderLeftColor: typeInfo.color } : {}}>
                    <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-1.5">
                            <typeInfo.icon size={12} style={{ color: typeInfo.color }} />
                            <span className="text-[10px] font-bold text-gray-400">{task.key}</span>
                            {task.children_count > 0 && (
                                <button onClick={(e) => { e.stopPropagation(); toggleEpic(task.id); }}
                                    className="flex items-center gap-0.5 text-[10px] text-violet-500 bg-violet-50 px-1 py-0.5 rounded hover:bg-violet-100">
                                    {expandedEpics.has(task.id) ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
                                    {task.children_count}
                                </button>
                            )}
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                            <button onClick={(e) => { e.stopPropagation(); openCreateTask(task.id, 'subtask'); }}
                                className="p-0.5 hover:bg-violet-50 rounded text-violet-400" title="+ Subtarea">
                                <Plus size={12} />
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); deleteTask(task.id); }}
                                className="p-0.5 hover:bg-red-50 rounded text-red-400"><X size={12} /></button>
                        </div>
                    </div>
                    <p className="text-sm font-medium text-gray-800 leading-tight mb-2 line-clamp-2">{task.title}</p>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: prioInfo.color }} title={prioInfo.label} />
                            {task.story_points && <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-medium">{task.story_points}p</span>}
                            {task.checklist_count > 0 && (
                                <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium flex items-center gap-0.5 ${task.checked_count === task.checklist_count ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                                    <CheckSquare size={9} /> {task.checked_count}/{task.checklist_count}
                                </span>
                            )}
                            {task.attachments_count > 0 && (
                                <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-medium flex items-center gap-0.5">
                                    <Paperclip size={9} /> {task.attachments_count}
                                </span>
                            )}
                            {task.labels && task.labels.split(',').slice(0, 2).map((l, i) => (
                                <span key={i} className="text-[9px] bg-violet-50 text-violet-500 px-1.5 py-0.5 rounded font-medium truncate max-w-16">{l.trim()}</span>
                            ))}
                        </div>
                        {assigneeName ? (
                            <span className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center text-white text-[10px] font-bold"
                                title={assigneeName}>{assigneeName.charAt(0).toUpperCase()}</span>
                        ) : (
                            <span className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center"><User size={10} className="text-gray-400" /></span>
                        )}
                    </div>
                </div>
                {/* Expanded children */}
                {expandedEpics.has(task.id) && children.length > 0 && (
                    <div className="ml-3 mt-1 space-y-1 border-l-2 border-violet-200 pl-2">
                        {children.map(ch => {
                            const cti = getTypeInfo(ch.type); const cpi = getPriorityInfo(ch.priority);
                            return (
                                <div key={ch.id} onClick={() => openEditTask(ch)}
                                    className="bg-white/80 rounded border border-gray-100 p-2 cursor-pointer hover:bg-gray-50 flex items-center gap-2">
                                    <cti.icon size={10} style={{ color: cti.color }} />
                                    <span className="text-[10px] text-gray-400 font-bold">{ch.key}</span>
                                    <span className="text-xs text-gray-700 flex-1 truncate">{ch.title}</span>
                                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: cpi.color }} />
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-gray-50">
            {/* Header */}
            <div className="px-4 py-3 bg-white border-b border-gray-200 flex items-center gap-3 flex-shrink-0 flex-wrap">
                <button onClick={() => navigate('/projects')} className="p-1.5 hover:bg-gray-100 rounded-lg">
                    <ArrowLeft size={18} className="text-gray-500" />
                </button>
                <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-violet-500 bg-violet-50 px-2 py-1 rounded">{project.key}</span>
                    <h2 className="font-black text-lg text-gray-900">{project.name}</h2>
                    <span className="text-[10px] px-2 py-0.5 bg-gray-100 rounded-full text-gray-500 font-medium">
                        {project.methodology === 'scrum' ? 'Scrum' : 'Kanban'}
                    </span>
                </div>
                <div className="flex-1" />

                <select value={filterType} onChange={e => setFilterType(e.target.value)} className="px-2 py-1.5 border border-gray-200 rounded-lg text-xs outline-none">
                    <option value="">Todos los tipos</option>
                    {TYPES.map(t => <option key={t.v} value={t.v}>{t.label}</option>)}
                </select>
                <select value={filterAssignee} onChange={e => setFilterAssignee(e.target.value)} className="px-2 py-1.5 border border-gray-200 rounded-lg text-xs outline-none">
                    <option value="">Todos</option>
                    {users.map(u => <option key={u.id} value={u.id}>{u.full_name || u.username}</option>)}
                </select>

                {project.methodology === 'scrum' && (
                    <div className="flex items-center gap-1">
                        <select value={activeSprint || ''} onChange={e => setActiveSprint(e.target.value ? parseInt(e.target.value) : null)}
                            className="px-2 py-1.5 border border-violet-200 bg-violet-50 rounded-lg text-xs font-medium text-violet-700 outline-none">
                            <option value="">Sin Sprint</option>
                            {sprints.map(s => <option key={s.id} value={s.id}>{s.name} {s.status === 'active' ? '●' : s.status === 'completed' ? '✓' : ''}</option>)}
                        </select>
                        <button onClick={() => { setEditingSprint(null); setSprintForm({ name: '', goal: '', start_date: '', end_date: '', version_id: '' }); setShowSprintModal(true); }}
                            className="p-1.5 hover:bg-violet-100 rounded-lg text-violet-500" title="Nuevo Sprint"><Plus size={14} /></button>
                    </div>
                )}

                {/* Tabs */}
                <div className="flex bg-gray-100 rounded-lg p-0.5">
                    {(['board', 'backlog', 'gantt'] as const).map(t => (
                        <button key={t} onClick={() => setTab(t)}
                            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${tab === t ? 'bg-white shadow-sm text-violet-600' : 'text-gray-400'}`}>
                            {t === 'board' ? 'Board' : t === 'backlog' ? 'Backlog' : 'Gantt'}
                        </button>
                    ))}
                </div>

                <div className="flex gap-1">
                    <button onClick={() => { setVersionForm({ name: '', description: '', start_date: '', release_date: '' }); setShowVersionModal(true); }}
                        className="flex items-center gap-1 px-2 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-600 hover:bg-gray-50">
                        <Milestone size={12} /> Versión
                    </button>
                    <button onClick={() => openCreateTask()}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-lg font-bold text-xs shadow-sm hover:shadow-md">
                        <Plus size={14} /> Tarea
                    </button>
                </div>
            </div>

            {/* Board View */}
            {tab === 'board' && (
                <div className="flex-1 overflow-x-auto overflow-y-hidden p-4 flex gap-3">
                    {COLUMNS.map(col => {
                        const colTasks = columnTasks(col.id);
                        return (
                            <div key={col.id}
                                className={`flex-shrink-0 w-72 flex flex-col rounded-xl transition-colors ${dragOverCol === col.id ? 'ring-2 ring-violet-400 bg-violet-50' : ''}`}
                                style={{ backgroundColor: col.bg }}
                                onDragOver={e => handleDragOver(e, col.id)} onDragLeave={() => setDragOverCol(null)} onDrop={e => handleDrop(e, col.id)}>
                                <div className="px-3 py-2.5 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <col.icon size={14} style={{ color: col.color }} />
                                        <span className="text-xs font-bold text-gray-700">{col.label}</span>
                                        <span className="text-[10px] bg-white/70 text-gray-500 px-1.5 py-0.5 rounded-full font-medium">{colTasks.length}</span>
                                    </div>
                                </div>
                                <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-2">
                                    {colTasks.map(task => renderTaskCard(task, col))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Backlog View */}
            {tab === 'backlog' && (
                <div className="flex-1 overflow-auto p-4">
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm divide-y divide-gray-100">
                        {filteredTasks.length === 0 ? (
                            <div className="p-8 text-center text-gray-400 text-sm">El backlog está vacío.</div>
                        ) : filteredTasks.map(task => {
                            const typeInfo = getTypeInfo(task.type); const prioInfo = getPriorityInfo(task.priority);
                            return (
                                <div key={task.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer" style={{ paddingLeft: task.parent_id ? '40px' : '16px' }}
                                    onClick={() => openEditTask(task)}>
                                    <typeInfo.icon size={14} style={{ color: typeInfo.color }} />
                                    <span className="text-[10px] font-bold text-gray-400 w-16">{task.key}</span>
                                    <span className="flex-1 text-sm font-medium text-gray-800 truncate">{task.title}</span>
                                    {task.children_count > 0 && <span className="text-[10px] bg-violet-50 text-violet-500 px-1.5 py-0.5 rounded">{task.children_count} sub</span>}
                                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: prioInfo.color }} />
                                    {task.story_points && <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">{task.story_points}p</span>}
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">{COLUMNS.find(c => c.id === task.status)?.label}</span>
                                </div>
                            );
                        })}
                    </div>

                    {/* Versions & Sprints */}
                    {versions.length > 0 && (
                        <div className="mt-6 space-y-3">
                            <h3 className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2"><Milestone size={12} /> Versiones</h3>
                            {versions.map(v => (
                                <div key={v.id} className="bg-white rounded-xl border border-gray-200 p-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="font-bold text-sm text-gray-900">{v.name}</p>
                                            <p className="text-[10px] text-gray-400">{v.description || 'Sin descripción'} — {v.sprint_count} sprints</p>
                                        </div>
                                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${v.status === 'released' ? 'bg-green-50 text-green-600' : v.status === 'in_progress' ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>
                                            {v.status === 'released' ? 'Lanzada' : v.status === 'in_progress' ? 'En progreso' : 'Planificada'}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                    {sprints.length > 0 && (
                        <div className="mt-4 space-y-3">
                            <h3 className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2"><GitBranch size={12} /> Sprints</h3>
                            {sprints.map(s => (
                                <div key={s.id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between">
                                    <div>
                                        <p className="font-bold text-sm text-gray-900">{s.name}</p>
                                        <p className="text-[10px] text-gray-400">
                                            {s.start_date && s.end_date ? `${s.start_date} → ${s.end_date}` : 'Sin fechas'}
                                            {s.version_id && ` — ${versions.find(v => v.id === s.version_id)?.name || ''}`}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${s.status === 'active' ? 'bg-green-50 text-green-600' : s.status === 'completed' ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>
                                            {s.status === 'active' ? 'Activo' : s.status === 'completed' ? 'Completado' : 'Planificación'}
                                        </span>
                                        <button onClick={() => toggleSprintStatus(s)} className="text-xs text-violet-500 hover:text-violet-700 font-medium">
                                            {s.status === 'active' ? 'Completar' : 'Activar'}
                                        </button>
                                        <button onClick={() => openEditSprint(s)} className="p-1 text-gray-400 hover:text-blue-600 transition-colors" title="Editar Sprint">
                                            <Pencil size={14} />
                                        </button>
                                        <button onClick={() => deleteSprint(s.id)} className="p-1 text-gray-400 hover:text-red-600 transition-colors" title="Eliminar Sprint">
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Gantt View */}
            {tab === 'gantt' && renderGantt()}

            {/* ══ Task Modal ══ */}
            {showTaskModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl mx-4 max-h-[90vh] overflow-y-auto">
                        <div className="px-6 py-4 bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-between sticky top-0 z-10">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center"><CheckSquare size={20} className="text-white" /></div>
                                <div>
                                    <h3 className="font-black text-lg text-white">{editTask ? `${editTask.key} — Editar` : 'Nueva Tarea'}</h3>
                                    <p className="text-blue-100 text-xs">Complete los datos de la tarea</p>
                                </div>
                            </div>
                            <button onClick={() => setShowTaskModal(false)} className="p-1.5 hover:bg-white/20 rounded-lg"><X size={18} className="text-white" /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Título</label>
                                <input value={taskForm.title} onChange={e => setTaskForm({ ...taskForm, title: e.target.value })} placeholder="Título de la tarea..."
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-violet-400" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Descripción</label>
                                <textarea value={taskForm.description} onChange={e => setTaskForm({ ...taskForm, description: e.target.value })} placeholder="Descripción..." rows={3}
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-violet-400 resize-none" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Tipo</label>
                                    <select value={taskForm.type} onChange={e => setTaskForm({ ...taskForm, type: e.target.value })}
                                        className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-violet-400">
                                        {TYPES.map(t => <option key={t.v} value={t.v}>{t.label}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Prioridad</label>
                                    <select value={taskForm.priority} onChange={e => setTaskForm({ ...taskForm, priority: e.target.value })}
                                        className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-violet-400">
                                        {PRIORITIES.map(p => <option key={p.v} value={p.v}>{p.label}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Asignado</label>
                                    <select value={taskForm.assigned_to} onChange={e => setTaskForm({ ...taskForm, assigned_to: e.target.value })}
                                        className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-violet-400">
                                        <option value="">Sin asignar</option>
                                        {users.map(u => <option key={u.id} value={u.id}>{u.full_name || u.username}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Story Points</label>
                                    <input value={taskForm.story_points} onChange={e => setTaskForm({ ...taskForm, story_points: e.target.value })} type="number" placeholder="0"
                                        className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-violet-400" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Fecha inicio</label>
                                    <input value={taskForm.start_date} onChange={e => setTaskForm({ ...taskForm, start_date: e.target.value })} type="date"
                                        className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-violet-400" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Fecha fin</label>
                                    <input value={taskForm.due_date} onChange={e => setTaskForm({ ...taskForm, due_date: e.target.value })} type="date"
                                        className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-violet-400" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                {project?.methodology === 'scrum' && (
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Sprint</label>
                                        <select value={taskForm.sprint_id} onChange={e => setTaskForm({ ...taskForm, sprint_id: e.target.value })}
                                            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-violet-400">
                                            <option value="">Backlog</option>
                                            {sprints.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                        </select>
                                    </div>
                                )}
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Tarea padre</label>
                                    <select value={taskForm.parent_id} onChange={e => setTaskForm({ ...taskForm, parent_id: e.target.value })}
                                        className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-violet-400">
                                        <option value="">Ninguna (raíz)</option>
                                        {tasks.filter(t => !editTask || t.id !== editTask.id).map(t => (
                                            <option key={t.id} value={t.id}>{t.key} — {t.title}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Etiquetas (coma)</label>
                                <input value={taskForm.labels} onChange={e => setTaskForm({ ...taskForm, labels: e.target.value })} placeholder="frontend, urgente..."
                                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-violet-400" />
                            </div>
                            {editTask && (
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Estado</label>
                                    <select value={editTask.status} onChange={async (e) => {
                                        await api.patch(`/projects/${projectId}/tasks/${editTask.id}/move`, { status: e.target.value, position: 0 });
                                        setShowTaskModal(false); loadTasks();
                                    }} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-violet-400">
                                        {COLUMNS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                                    </select>
                                </div>
                            )}
                            {/* Subtasks list */}
                            {editTask && subtasks.length > 0 && (
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase mb-2 block flex items-center gap-1"><ListTree size={12} /> Subtareas ({subtasks.length})</label>
                                    <div className="space-y-1 bg-gray-50 rounded-lg p-2">
                                        {subtasks.map(st => {
                                            const sti = getTypeInfo(st.type);
                                            return (
                                                <div key={st.id} className="flex items-center gap-2 px-2 py-1.5 bg-white rounded border border-gray-100 text-sm">
                                                    <sti.icon size={12} style={{ color: sti.color }} />
                                                    <span className="text-[10px] font-bold text-gray-400">{st.key}</span>
                                                    <span className="flex-1 text-gray-700 truncate">{st.title}</span>
                                                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${st.status === 'done' ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                                                        {COLUMNS.find(c => c.id === st.status)?.label || st.status}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <button onClick={() => { setShowTaskModal(false); openCreateTask(editTask.id, 'subtask'); }}
                                        className="mt-2 text-xs text-violet-500 hover:text-violet-700 font-medium flex items-center gap-1">
                                        <Plus size={12} /> Agregar subtarea
                                    </button>
                                </div>
                            )}
                            {editTask && subtasks.length === 0 && (
                                <button onClick={() => { setShowTaskModal(false); openCreateTask(editTask.id, 'subtask'); }}
                                    className="text-xs text-violet-500 hover:text-violet-700 font-medium flex items-center gap-1">
                                    <Plus size={12} /> Agregar subtarea
                                </button>
                            )}
                            {/* ── Checklist ── */}
                            {editTask && (
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase mb-2 block flex items-center gap-1"><CheckSquare size={12} /> Checklist {checklist.length > 0 && `(${checklist.filter(c => c.is_checked).length}/${checklist.length})`}</label>
                                    {checklist.length > 0 && (
                                        <div className="space-y-1 mb-2">
                                            {checklist.map(ci => (
                                                <div key={ci.id} className="flex items-center gap-2 px-2 py-1.5 bg-gray-50 rounded-lg group">
                                                    <button onClick={async () => {
                                                        await api.put(`/projects/${projectId}/tasks/${editTask.id}/checklist/${ci.id}`, { is_checked: !ci.is_checked });
                                                        setChecklist(prev => prev.map(x => x.id === ci.id ? { ...x, is_checked: !x.is_checked } : x));
                                                    }} className="flex-shrink-0">
                                                        {ci.is_checked ? <SquareCheckBig size={16} className="text-green-500" /> : <Square size={16} className="text-gray-300" />}
                                                    </button>
                                                    <span className={`flex-1 text-sm ${ci.is_checked ? 'line-through text-gray-400' : 'text-gray-700'}`}>{ci.text}</span>
                                                    <button onClick={async () => {
                                                        await api.delete(`/projects/${projectId}/tasks/${editTask.id}/checklist/${ci.id}`);
                                                        setChecklist(prev => prev.filter(x => x.id !== ci.id));
                                                    }} className="p-0.5 hover:bg-red-50 rounded text-red-400 opacity-0 group-hover:opacity-100"><Trash2 size={12} /></button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    {checklist.length > 0 && (
                                        <div className="w-full bg-gray-200 rounded-full h-1.5 mb-2">
                                            <div className="bg-green-500 h-1.5 rounded-full transition-all" style={{ width: `${checklist.length > 0 ? (checklist.filter(c => c.is_checked).length / checklist.length * 100) : 0}%` }} />
                                        </div>
                                    )}
                                    <div className="flex gap-2">
                                        <input value={newCheckItem} onChange={e => setNewCheckItem(e.target.value)}
                                            onKeyDown={async (e) => { if (e.key === 'Enter' && newCheckItem.trim()) { const { data } = await api.post(`/projects/${projectId}/tasks/${editTask.id}/checklist`, { text: newCheckItem.trim() }); setChecklist(prev => [...prev, data]); setNewCheckItem(''); } }}
                                            placeholder="Agregar item..." className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-violet-400" />
                                        <button onClick={async () => { if (!newCheckItem.trim()) return; const { data } = await api.post(`/projects/${projectId}/tasks/${editTask.id}/checklist`, { text: newCheckItem.trim() }); setChecklist(prev => [...prev, data]); setNewCheckItem(''); }}
                                            className="px-3 py-2 bg-violet-50 text-violet-600 rounded-lg text-sm font-medium hover:bg-violet-100"><Plus size={14} /></button>
                                    </div>
                                </div>
                            )}
                            {/* ── Attachments ── */}
                            {editTask && (
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase mb-2 block flex items-center gap-1"><Paperclip size={12} /> Archivos adjuntos ({attachments.length})</label>
                                    {attachments.length > 0 && (
                                        <div className="space-y-1 mb-2">
                                            {attachments.map(att => (
                                                <div key={att.id} className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg group">
                                                    <FileText size={14} className="text-violet-400 flex-shrink-0" />
                                                    <a href={att.file_url} target="_blank" rel="noopener noreferrer" className="flex-1 text-sm text-blue-600 hover:underline truncate">{att.filename}</a>
                                                    {att.file_size && <span className="text-[10px] text-gray-400">{(att.file_size / 1024).toFixed(0)} KB</span>}
                                                    <button onClick={async () => {
                                                        await api.delete(`/projects/${projectId}/tasks/${editTask.id}/attachments/${att.id}`);
                                                        setAttachments(prev => prev.filter(x => x.id !== att.id));
                                                    }} className="p-0.5 hover:bg-red-50 rounded text-red-400 opacity-0 group-hover:opacity-100"><Trash2 size={12} /></button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    <input type="file" ref={fileInputRef} className="hidden" onChange={async (e) => {
                                        const file = e.target.files?.[0]; if (!file) return;
                                        const fd = new FormData(); fd.append('file', file);
                                        const { data } = await api.post(`/projects/${projectId}/tasks/${editTask.id}/attachments`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
                                        setAttachments(prev => [data, ...prev]);
                                        if (fileInputRef.current) fileInputRef.current.value = '';
                                    }} />
                                    <button onClick={() => fileInputRef.current?.click()}
                                        className="flex items-center gap-1.5 px-3 py-2 border border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-violet-400 hover:text-violet-600 hover:bg-violet-50 transition-colors w-full justify-center">
                                        <Upload size={14} /> Subir archivo
                                    </button>
                                </div>
                            )}
                        </div>
                        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 sticky bottom-0 bg-white">
                            <button onClick={() => setShowTaskModal(false)} className="px-4 py-2 text-sm text-gray-500 hover:bg-gray-100 rounded-lg">Cancelar</button>
                            <button onClick={saveTask} disabled={!taskForm.title.trim()}
                                className="px-5 py-2 text-sm font-bold bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg shadow-sm hover:shadow-md disabled:opacity-40">
                                {editTask ? 'Guardar' : 'Crear'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Sprint Modal */}
            {showSprintModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
                        <div className="px-6 py-4 bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center"><GitBranch size={20} className="text-white" /></div>
                                <div>
                                    <h3 className="font-black text-lg text-white">{editingSprint ? 'Editar Sprint' : 'Nuevo Sprint'}</h3>
                                    <p className="text-blue-100 text-xs">{editingSprint ? 'Modificar datos del sprint' : 'Complete los datos del sprint'}</p>
                                </div>
                            </div>
                            <button onClick={() => { setShowSprintModal(false); setEditingSprint(null); }} className="p-1.5 hover:bg-white/20 rounded-lg"><X size={18} className="text-white" /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="border border-blue-100 rounded-xl p-4 bg-blue-50/30 space-y-3">
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Nombre</label>
                                    <input value={sprintForm.name} onChange={e => setSprintForm({ ...sprintForm, name: e.target.value })} placeholder="Sprint 1"
                                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-400 bg-white" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Objetivo</label>
                                    <textarea value={sprintForm.goal} onChange={e => setSprintForm({ ...sprintForm, goal: e.target.value })} rows={2}
                                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-400 resize-none bg-white" />
                                </div>
                                {versions.length > 0 && (
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Versión</label>
                                        <select value={sprintForm.version_id} onChange={e => setSprintForm({ ...sprintForm, version_id: e.target.value })}
                                            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-400 bg-white">
                                            <option value="">Sin versión</option>
                                            {versions.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                                        </select>
                                    </div>
                                )}
                            </div>
                            <div className="border border-purple-100 rounded-xl p-4 bg-purple-50/30">
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Inicio</label>
                                        <input value={sprintForm.start_date} onChange={e => setSprintForm({ ...sprintForm, start_date: e.target.value })} type="date"
                                            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-400 bg-white" />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Fin</label>
                                        <input value={sprintForm.end_date} onChange={e => setSprintForm({ ...sprintForm, end_date: e.target.value })} type="date"
                                            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-400 bg-white" />
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
                            <button onClick={() => { setShowSprintModal(false); setEditingSprint(null); }} className="px-4 py-2 text-sm text-gray-500 hover:bg-gray-100 rounded-lg">Cancelar</button>
                            <button onClick={saveSprint} disabled={!sprintForm.name.trim()}
                                className="px-5 py-2 text-sm font-bold bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg shadow-sm hover:shadow-md disabled:opacity-40">{editingSprint ? 'Guardar Cambios' : 'Crear Sprint'}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Version Modal */}
            {showVersionModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
                        <div className="px-6 py-4 bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center"><Milestone size={20} className="text-white" /></div>
                                <div>
                                    <h3 className="font-black text-lg text-white">Nueva Versión</h3>
                                    <p className="text-blue-100 text-xs">Complete los datos de la versión</p>
                                </div>
                            </div>
                            <button onClick={() => setShowVersionModal(false)} className="p-1.5 hover:bg-white/20 rounded-lg"><X size={18} className="text-white" /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="border border-blue-100 rounded-xl p-4 bg-blue-50/30 space-y-3">
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Nombre</label>
                                    <input value={versionForm.name} onChange={e => setVersionForm({ ...versionForm, name: e.target.value })} placeholder="v1.0"
                                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-400 bg-white" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Descripción</label>
                                    <textarea value={versionForm.description} onChange={e => setVersionForm({ ...versionForm, description: e.target.value })} rows={2}
                                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-400 resize-none bg-white" />
                                </div>
                            </div>
                            <div className="border border-purple-100 rounded-xl p-4 bg-purple-50/30">
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Inicio</label>
                                        <input value={versionForm.start_date} onChange={e => setVersionForm({ ...versionForm, start_date: e.target.value })} type="date"
                                            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-400 bg-white" />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Lanzamiento</label>
                                        <input value={versionForm.release_date} onChange={e => setVersionForm({ ...versionForm, release_date: e.target.value })} type="date"
                                            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-400 bg-white" />
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
                            <button onClick={() => setShowVersionModal(false)} className="px-4 py-2 text-sm text-gray-500 hover:bg-gray-100 rounded-lg">Cancelar</button>
                            <button onClick={saveVersion} disabled={!versionForm.name.trim()}
                                className="px-5 py-2 text-sm font-bold bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg shadow-sm hover:shadow-md disabled:opacity-40">Crear Versión</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
