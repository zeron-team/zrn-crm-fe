import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft, Plus, X, Bug, CheckSquare, FileText, BookOpen, AlertTriangle,
    Clock, Users, Play, Pause, CheckCircle2, User, Calendar, Tag, Zap,
    ChevronDown, ChevronRight, Layers, GitBranch, BarChart3, ListTree, Milestone,
    Paperclip, Upload, Trash2, Square, SquareCheckBig, Pencil, Image,
    LayoutDashboard, StickyNote, BookMarked, Timer, Target, TrendingUp, Shield,
    Lock, Globe, UserPlus, Pin, GripVertical, UserCircle, ArrowRightCircle, Check,
    MessageSquare, Send
} from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Project { id: number; name: string; key: string; methodology: string; status: string; description: string | null; }
interface Sprint { id: number; name: string; goal: string | null; start_date: string | null; end_date: string | null; status: string; version_id: number | null; task_count?: number; }
interface Version { id: number; name: string; description: string | null; start_date: string | null; release_date: string | null; status: string; sprint_count: number; }
// Wiki Markdown Renderer with styled code blocks
function WikiMarkdown({ content }: { content: string }) {
    return (
        <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
                code({ node, className, children, ...props }: any) {
                    const match = /language-(\w+)/.exec(className || '');
                    const inline = !match && !className;
                    if (!inline && match) {
                        return (
                            <div className="relative my-3">
                                <div className="absolute top-0 right-0 px-2.5 py-1 text-[10px] font-bold uppercase rounded-bl-lg rounded-tr-xl text-gray-400 bg-gray-800/80">{match[1]}</div>
                                <pre className="bg-[#1e1e2e] text-[#cdd6f4] rounded-xl p-4 pt-8 overflow-x-auto text-[13px] leading-relaxed font-mono border border-gray-700/50 shadow-lg">
                                    <code>{String(children).replace(/\n$/, '')}</code>
                                </pre>
                            </div>
                        );
                    }
                    return <code className="bg-gray-100 text-pink-600 px-1.5 py-0.5 rounded text-xs font-mono" {...props}>{children}</code>;
                },
                pre({ children }: any) { return <>{children}</>; },
                table({ children }: any) { return <table className="w-full border-collapse border border-gray-200 my-3 text-sm">{children}</table>; },
                th({ children }: any) { return <th className="border border-gray-200 bg-gray-50 px-3 py-2 text-left font-bold text-xs text-gray-700">{children}</th>; },
                td({ children }: any) { return <td className="border border-gray-200 px-3 py-2 text-xs">{children}</td>; },
                h1({ children }: any) { return <h1 className="text-2xl font-black text-gray-900 mt-6 mb-3">{children}</h1>; },
                h2({ children }: any) { return <h2 className="text-xl font-bold text-gray-800 mt-5 mb-2 border-b pb-1">{children}</h2>; },
                h3({ children }: any) { return <h3 className="text-lg font-bold text-gray-700 mt-4 mb-2">{children}</h3>; },
                ul({ children }: any) { return <ul className="list-disc list-inside space-y-1 my-2 text-sm text-gray-700">{children}</ul>; },
                ol({ children }: any) { return <ol className="list-decimal list-inside space-y-1 my-2 text-sm text-gray-700">{children}</ol>; },
                blockquote({ children }: any) { return <blockquote className="border-l-4 border-violet-300 bg-violet-50 pl-4 py-2 my-3 text-sm italic text-gray-600">{children}</blockquote>; },
                p({ children }: any) { return <p className="text-sm text-gray-800 leading-relaxed my-2">{children}</p>; },
                a({ children, href }: any) { return <a href={href} className="text-violet-600 underline hover:text-violet-800" target="_blank" rel="noopener">{children}</a>; },
            }}
        >
            {content}
        </ReactMarkdown>
    );
}
interface Task {
    id: number; key: string; title: string; description: string | null; type: string;
    status: string; priority: string; assigned_to: number | null; reporter: number | null;
    story_points: number | null; estimated_hours: number | null; actual_hours: number;
    position: number; labels: string | null;
    sprint_id: number | null; parent_id: number | null; due_date: string | null;
    start_date: string | null; project_id: number; children_count: number;
    checklist_count: number; checked_count: number; attachments_count: number;
}
interface ProjectSummary {
    project: any; totals: any; status_counts: any; type_counts: any;
    sprint_breakdown: any[]; backlog: any; versions: any[]; resources: any[];
}
interface PNote { id: number; title: string; content: string | null; color: string; sort_order: number; visibility: string; shared_with: number[]; created_by: number | null; created_by_name: string | null; created_at: string; updated_at: string; }
interface WikiPage { id: number; title: string; content: string | null; slug: string; parent_id: number | null; created_by_name: string | null; created_at: string; updated_at: string; }
interface GanttItem {
    id: number | string; key: string; title: string; type: string; status: string; priority: string;
    parent_id: number | string | null; sprint_id: number | null;
    start_date: string; end_date: string | null;
    progress: number; assigned_to: number | null;
}
interface UserInfo { id: number; username: string; full_name?: string; }
interface ChecklistItem { id: number; text: string; is_checked: boolean; position: number; }
interface Attachment { id: number; filename: string; display_name: string | null; file_url: string; file_size: number | null; created_at: string; }
interface TaskCommentType { id: number; task_id: number; author_id: number; author_name: string; author_avatar: string | null; content: string; attachment_url: string | null; attachment_name: string | null; attachment_size: number | null; created_at: string; updated_at: string; }

const IMG_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'];
const isImageFile = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    return IMG_EXTENSIONS.includes(ext);
};

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
    const { user } = useAuth();
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
    const [editingVersion, setEditingVersion] = useState<Version | null>(null);
    const [editTask, setEditTask] = useState<Task | null>(null);
    const [subtasks, setSubtasks] = useState<Task[]>([]);
    const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
    const [attachments, setAttachments] = useState<Attachment[]>([]);
    const [newCheckItem, setNewCheckItem] = useState('');
    const [uploadDisplayName, setUploadDisplayName] = useState('');
    const [editingAttName, setEditingAttName] = useState<number | null>(null);
    const [editAttNameValue, setEditAttNameValue] = useState('');
    const [pendingFile, setPendingFile] = useState<File | null>(null);
    const [comments, setComments] = useState<TaskCommentType[]>([]);
    const [newComment, setNewComment] = useState('');
    const [commentFile, setCommentFile] = useState<File | null>(null);
    const commentFileRef = useRef<HTMLInputElement>(null);
    const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
    const [editCommentContent, setEditCommentContent] = useState('');
    const [descPreview, setDescPreview] = useState(false);
    const [pendingDescImages, setPendingDescImages] = useState<{file: File, blobUrl: string, displayName: string}[]>([]);
    const descImageRef = useRef<HTMLInputElement>(null);
    const descRef = useRef<HTMLTextAreaElement>(null);
    const [tab, setTab] = useState<'overview' | 'board' | 'backlog' | 'gantt' | 'notes' | 'wiki' | 'members'>('overview');
    const [filterType, setFilterType] = useState('');
    const [filterAssignee, setFilterAssignee] = useState('');
    const [expandedEpics, setExpandedEpics] = useState<Set<number>>(new Set());
    const fileInputRef = useRef<HTMLInputElement>(null);
    // Overview/Notes/Wiki state
    const [summary, setSummary] = useState<ProjectSummary | null>(null);
    const [notes, setNotes] = useState<PNote[]>([]);
    const [wikiPages, setWikiPages] = useState<WikiPage[]>([]);
    const [activeWikiPage, setActiveWikiPage] = useState<WikiPage | null>(null);
    const [showNoteModal, setShowNoteModal] = useState(false);
    const [editingNote, setEditingNote] = useState<PNote | null>(null);
    const [noteForm, setNoteForm] = useState({ title: '', content: '', color: 'yellow', visibility: 'team', shared_with: [] as number[] });
    const [noteDragIdx, setNoteDragIdx] = useState<number | null>(null);
    const [noteDragOverIdx, setNoteDragOverIdx] = useState<number | null>(null);
    const [showWikiModal, setShowWikiModal] = useState(false);
    const [wikiForm, setWikiForm] = useState({ title: '', content: '', parent_id: '' });
    const [expandedOverviewSprints, setExpandedOverviewSprints] = useState<Record<number, any[]>>({});
    // Members state
    const [members, setMembers] = useState<{ id: number; user_id: number; role: string; full_name: string; email: string; is_active: boolean }[]>([]);
    const [addMemberUserId, setAddMemberUserId] = useState('');
    const [addMemberRole, setAddMemberRole] = useState('member');

    const dragItem = useRef<{ taskId: number; fromCol: string } | null>(null);
    const [dragOverCol, setDragOverCol] = useState<string | null>(null);

    // Backlog drag & drop + expandable sections
    const [allProjectTasks, setAllProjectTasks] = useState<Task[]>([]);
    const [expandedBacklogVersions, setExpandedBacklogVersions] = useState<Set<number>>(new Set());
    const [expandedBacklogSprints, setExpandedBacklogSprints] = useState<Set<number>>(new Set());
    const [backlogDragTaskId, setBacklogDragTaskId] = useState<number | null>(null);
    const [backlogDropTarget, setBacklogDropTarget] = useState<string | null>(null);
    const [backlogCollapsed, setBacklogCollapsed] = useState(false);
    const [toastMsg, setToastMsg] = useState<string | null>(null);
    const toastTimer = useRef<any>(null);
    const showToast = (msg: string) => {
        setToastMsg(msg);
        if (toastTimer.current) clearTimeout(toastTimer.current);
        toastTimer.current = setTimeout(() => setToastMsg(null), 4000);
    };

    const [taskForm, setTaskForm] = useState({
        title: '', description: '', type: 'task', priority: 'medium',
        assigned_to: '', story_points: '', estimated_hours: '', actual_hours: '',
        labels: '', due_date: '', start_date: '',
        sprint_id: '', parent_id: '',
    });
    const [sprintForm, setSprintForm] = useState({ name: '', goal: '', start_date: '', end_date: '', version_id: '' });
    const [versionForm, setVersionForm] = useState({ name: '', description: '', start_date: '', release_date: '', repository_url: '' });

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
        if (tab === 'backlog') {
            // Load ALL project tasks for backlog view (to group by sprint)
            const { data } = await api.get(`/projects/${projectId}/tasks`);
            setAllProjectTasks(data);
            setTasks(data.filter((t: Task) => !t.sprint_id));
            return;
        }
        const { data } = await api.get(`/projects/${projectId}/tasks`, { params });
        setTasks(data);
    }, [projectId, activeSprint, tab]);

    useEffect(() => { if (projectId) loadTasks(); }, [loadTasks]);

    useEffect(() => {
        if (tab === 'gantt' && projectId) {
            api.get(`/projects/${projectId}/gantt`).then(r => setGanttData(r.data));
        }
        if (tab === 'overview' && projectId) {
            api.get(`/projects/${projectId}/summary`).then(r => setSummary(r.data));
        }
        if (tab === 'notes' && projectId) {
            api.get(`/projects/${projectId}/notes`).then(r => setNotes(r.data));
        }
        if (tab === 'wiki' && projectId) {
            api.get(`/projects/${projectId}/wiki`).then(r => setWikiPages(r.data));
        }
        if (tab === 'members' && projectId) {
            api.get(`/projects/${projectId}/members`).then(r => setMembers(r.data));
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
        setPendingFile(null); setUploadDisplayName(''); setEditingAttName(null);
        setComments([]); setNewComment(''); setCommentFile(null); setEditingCommentId(null);
        setDescPreview(false);
        pendingDescImages.forEach(p => URL.revokeObjectURL(p.blobUrl));
        setPendingDescImages([]);
        setTaskForm({
            title: '', description: '', type: taskType || 'task', priority: 'medium',
            assigned_to: '', story_points: '', estimated_hours: '', actual_hours: '',
            labels: '', due_date: '', start_date: '',
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
            estimated_hours: t.estimated_hours ? String(t.estimated_hours) : '',
            actual_hours: t.actual_hours ? String(t.actual_hours) : '',
            labels: t.labels || '', due_date: t.due_date || '', start_date: t.start_date || '',
            sprint_id: t.sprint_id ? String(t.sprint_id) : '',
            parent_id: t.parent_id ? String(t.parent_id) : '',
        });
        // Load subtasks, checklist, attachments, comments
        setPendingFile(null); setUploadDisplayName(''); setEditingAttName(null);
        setNewComment(''); setCommentFile(null); setEditingCommentId(null); setEditCommentContent('');
        // Show preview by default when description has content (especially images)
        setDescPreview(!!(t.description && t.description.trim()));
        pendingDescImages.forEach(p => URL.revokeObjectURL(p.blobUrl));
        setPendingDescImages([]);
        try {
            const [subRes, clRes, atRes, cmRes] = await Promise.all([
                api.get(`/projects/${projectId}/tasks/${t.id}/subtasks`),
                api.get(`/projects/${projectId}/tasks/${t.id}/checklist`),
                api.get(`/projects/${projectId}/tasks/${t.id}/attachments`),
                api.get(`/projects/${projectId}/tasks/${t.id}/comments`),
            ]);
            setSubtasks(subRes.data); setChecklist(clRes.data); setAttachments(atRes.data); setComments(cmRes.data);
        } catch { setSubtasks([]); setChecklist([]); setAttachments([]); setComments([]); }
        setNewCheckItem('');
        setShowTaskModal(true);
    };

    const saveTask = async () => {
        const payload: any = {
            title: taskForm.title, description: taskForm.description || null,
            type: taskForm.type, priority: taskForm.priority,
            assigned_to: taskForm.assigned_to ? parseInt(taskForm.assigned_to) : null,
            story_points: taskForm.story_points ? parseInt(taskForm.story_points) : null,
            estimated_hours: taskForm.estimated_hours ? parseFloat(taskForm.estimated_hours) : null,
            actual_hours: taskForm.actual_hours ? parseFloat(taskForm.actual_hours) : null,
            labels: taskForm.labels || null,
            due_date: taskForm.due_date || null, start_date: taskForm.start_date || null,
            sprint_id: taskForm.sprint_id ? parseInt(taskForm.sprint_id) : null,
            parent_id: taskForm.parent_id ? parseInt(taskForm.parent_id) : null,
        };
        try {
            if (editTask) {
                await api.put(`/projects/${projectId}/tasks/${editTask.id}`, payload);
            } else {
                const { data: newTask } = await api.post(`/projects/${projectId}/tasks`, payload);
                // Upload pending description images and replace blob URLs
                if (pendingDescImages.length > 0) {
                    let updatedDesc = taskForm.description;
                    for (const pdi of pendingDescImages) {
                        const fd = new FormData();
                        fd.append('file', pdi.file);
                        fd.append('display_name', pdi.displayName);
                        try {
                            const { data: att } = await api.post(`/projects/${projectId}/tasks/${newTask.id}/attachments`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
                            updatedDesc = updatedDesc.replace(pdi.blobUrl, encodeURI(att.file_url));
                        } catch (err) { console.error('Error uploading pending image:', err); }
                        URL.revokeObjectURL(pdi.blobUrl);
                    }
                    // Update description with real URLs
                    if (updatedDesc !== taskForm.description) {
                        await api.put(`/projects/${projectId}/tasks/${newTask.id}`, { ...payload, description: updatedDesc });
                    }
                    setPendingDescImages([]);
                }
            }
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
        const payload = {
            name: versionForm.name, description: versionForm.description || null,
            start_date: versionForm.start_date || null, release_date: versionForm.release_date || null,
            repository_url: versionForm.repository_url || null,
        };
        if (editingVersion) {
            await api.put(`/projects/${projectId}/versions/${editingVersion.id}`, payload);
        } else {
            await api.post(`/projects/${projectId}/versions`, payload);
        }
        setShowVersionModal(false);
        setEditingVersion(null);
        setVersionForm({ name: '', description: '', start_date: '', release_date: '', repository_url: '' });
        const { data } = await api.get(`/projects/${projectId}/versions`);
        setVersions(data);
        api.get(`/projects/${projectId}/summary`).then(r => setSummary(r.data));
    };

    const openEditVersion = (v: Version) => {
        setEditingVersion(v);
        setVersionForm({
            name: v.name, description: v.description || '',
            start_date: v.start_date || '', release_date: v.release_date || '',
            repository_url: (v as any).repository_url || '',
        });
        setShowVersionModal(true);
    };

    const deleteVersion = async (versionId: number) => {
        if (!confirm('¿Eliminar esta versión? Los sprints asociados quedarán sin versión.')) return;
        await api.delete(`/projects/${projectId}/versions/${versionId}`);
        const { data } = await api.get(`/projects/${projectId}/versions`);
        setVersions(data);
        const { data: sp } = await api.get(`/projects/${projectId}/sprints`);
        setSprints(sp);
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
    const GANTT_COLORS: Record<string, { bg: string; border: string; text: string }> = {
        version: { bg: '#7c3aed', border: '#6d28d9', text: '#fff' },
        sprint: { bg: '#0891b2', border: '#0e7490', text: '#fff' },
    };
    const getGanttStyle = (type: string) => {
        if (GANTT_COLORS[type]) return GANTT_COLORS[type];
        const ti = getTypeInfo(type);
        return { bg: ti.color, border: ti.color, text: '#fff' };
    };
    const getGanttIcon = (type: string) => {
        if (type === 'version') return Milestone;
        if (type === 'sprint') return GitBranch;
        return getTypeInfo(type).icon;
    };

    const renderGantt = () => {
        if (ganttData.length === 0) return <div className="flex-1 flex items-center justify-center text-gray-400 text-sm p-8">No hay tareas con fechas para el Gantt. Agregá fechas de inicio y fin a tus tareas.</div>;
        const dates = ganttData.flatMap(g => [g.start_date, g.end_date].filter(Boolean) as string[]);
        if (dates.length === 0) return null;
        const minD = new Date(Math.min(...dates.map(d => new Date(d).getTime())));
        const maxD = new Date(Math.max(...dates.map(d => new Date(d).getTime())));
        minD.setDate(minD.getDate() - 2);
        maxD.setDate(maxD.getDate() + 5);
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

        // Build ordered list: versions → their sprints → sprint tasks, then loose sprints → tasks, then loose tasks
        const ordered: GanttItem[] = [];
        const versionsG = ganttData.filter(g => g.type === 'version');
        const sprintsG = ganttData.filter(g => g.type === 'sprint');
        const tasksG = ganttData.filter(g => g.type !== 'version' && g.type !== 'sprint');

        // Group sprints under versions
        for (const v of versionsG) {
            ordered.push(v);
            const vId = typeof v.id === 'string' ? parseInt(v.id.replace('v-', '')) : v.id;
            const vSprints = sprintsG.filter(s => s.parent_id === v.id || s.parent_id === `v-${vId}`);
            for (const s of vSprints) {
                ordered.push(s);
                const sId = typeof s.id === 'string' ? parseInt(s.id.replace('s-', '')) : s.id;
                const sTasks = tasksG.filter(t => t.sprint_id === sId);
                ordered.push(...sTasks);
            }
        }
        // Loose sprints (no version)
        const looseSprints = sprintsG.filter(s => !s.parent_id);
        for (const s of looseSprints) {
            ordered.push(s);
            const sId = typeof s.id === 'string' ? parseInt(s.id.replace('s-', '')) : s.id;
            const sTasks = tasksG.filter(t => t.sprint_id === sId);
            ordered.push(...sTasks);
        }
        // Tasks without sprint
        const usedTaskIds = new Set(ordered.filter(g => g.type !== 'version' && g.type !== 'sprint').map(g => g.id));
        const looseTasks = tasksG.filter(t => !usedTaskIds.has(t.id));
        ordered.push(...looseTasks);

        // Indent level
        const getIndent = (g: GanttItem) => {
            if (g.type === 'version') return 0;
            if (g.type === 'sprint') return g.parent_id ? 1 : 0;
            if (g.sprint_id) return g.parent_id ? 3 : 2;
            return g.parent_id ? 1 : 0;
        };

        return (
            <div className="flex-1 overflow-auto p-4">
                <div className="flex">
                    {/* Left: names */}
                    <div className="w-64 flex-shrink-0 border-r border-gray-200 bg-white">
                        <div className="h-10 border-b border-gray-200 px-3 flex items-center text-[10px] font-bold text-gray-500 uppercase">Tarea</div>
                        {ordered.map(g => {
                            const Icon = getGanttIcon(g.type);
                            const style = getGanttStyle(g.type);
                            const indent = getIndent(g);
                            const isGroup = g.type === 'version' || g.type === 'sprint';
                            return (
                                <div key={g.id}
                                    className={`h-9 border-b px-3 flex items-center gap-2 ${isGroup ? 'bg-gray-50/80 border-gray-200' : 'border-gray-100'}`}
                                    style={{ paddingLeft: `${12 + indent * 16}px` }}>
                                    <Icon size={12} style={{ color: style.bg }} />
                                    <span className={`text-[10px] font-bold ${isGroup ? 'text-gray-600' : 'text-gray-400'}`}>{g.key}</span>
                                    {!isGroup && <span className="text-xs text-gray-700 truncate">{g.title}</span>}
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
                            {ordered.map(g => {
                                const style = getGanttStyle(g.type);
                                const sD = new Date(g.start_date);
                                const eD = g.end_date ? new Date(g.end_date) : new Date(sD.getTime() + 3 * 86400000);
                                const left = Math.max(0, Math.floor((sD.getTime() - minD.getTime()) / 86400000)) * dayW;
                                const w = Math.max(dayW, Math.ceil((eD.getTime() - sD.getTime()) / 86400000) * dayW);
                                const isVersion = g.type === 'version';
                                const isSprint = g.type === 'sprint';
                                const isGroup = isVersion || isSprint;
                                const doneOpacity = g.status === 'done' || g.status === 'released' || g.status === 'completed' ? 0.6 : 1;

                                if (isVersion) {
                                    // Version: diamond milestone markers at start/end + connecting line
                                    return (
                                        <div key={g.id} className="h-9 border-b border-gray-200 relative bg-gray-50/40">
                                            {/* Background bar */}
                                            <div className="absolute top-1 rounded-md"
                                                style={{ left, width: w, height: 28, backgroundColor: style.bg, opacity: 0.12 }} />
                                            {/* Solid bar */}
                                            <div className="absolute top-2 rounded-md flex items-center gap-1 px-2 text-white text-[10px] font-bold shadow-sm cursor-default"
                                                style={{ left, width: w, height: 22, backgroundColor: style.bg, opacity: doneOpacity, borderBottom: `3px solid ${style.border}` }}
                                                title={`${g.key}`}>
                                                <Milestone size={10} />
                                                <span className="truncate">{g.key}</span>
                                                {g.progress > 0 && g.progress < 100 && (
                                                    <div className="absolute bottom-0 left-0 h-1 bg-white/40 rounded-b-md" style={{ width: `${g.progress}%` }} />
                                                )}
                                            </div>
                                        </div>
                                    );
                                }

                                if (isSprint) {
                                    return (
                                        <div key={g.id} className="h-9 border-b border-gray-200 relative bg-gray-50/40">
                                            <div className="absolute top-1 rounded"
                                                style={{ left, width: w, height: 28, backgroundColor: style.bg, opacity: 0.08 }} />
                                            <div className="absolute top-2 rounded flex items-center gap-1 px-2 text-white text-[10px] font-bold shadow-sm cursor-default"
                                                style={{ left, width: w, height: 22, backgroundColor: style.bg, opacity: doneOpacity, borderLeft: `3px solid ${style.border}` }}
                                                title={`${g.key}`}>
                                                <GitBranch size={10} />
                                                <span className="truncate">{g.key}</span>
                                                {g.progress > 0 && g.progress < 100 && (
                                                    <div className="absolute bottom-0 left-0 h-1 bg-white/40 rounded-b-md" style={{ width: `${g.progress}%` }} />
                                                )}
                                            </div>
                                        </div>
                                    );
                                }

                                // Regular task
                                return (
                                    <div key={g.id} className="h-9 border-b border-gray-50 relative">
                                        <div className="absolute top-2 rounded flex items-center gap-1 px-2 text-white text-[10px] font-medium shadow-sm cursor-pointer"
                                            style={{ left, width: w, height: 20, backgroundColor: style.bg, opacity: doneOpacity }}
                                            title={`${g.key}: ${g.title}`}
                                            onClick={() => {
                                                const task = tasks.find(t => t.id === g.id);
                                                if (task) openEditTask(task);
                                            }}>
                                            <span className="truncate">{g.key}</span>
                                            {g.progress > 0 && g.progress < 100 && (
                                                <div className="absolute bottom-0 left-0 h-1 bg-white/40 rounded-b" style={{ width: `${g.progress}%` }} />
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
                    {(['overview', 'board', 'backlog', 'gantt', 'notes', 'wiki', 'members'] as const).map(t => (
                        <button key={t} onClick={() => setTab(t)}
                            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${tab === t ? 'bg-white shadow-sm text-violet-600' : 'text-gray-400'}`}>
                            {t === 'overview' ? 'Resumen' : t === 'board' ? 'Board' : t === 'backlog' ? 'Backlog' : t === 'gantt' ? 'Gantt' : t === 'notes' ? 'Notas' : t === 'wiki' ? 'Wiki' : '👥 Equipo'}
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

            {/* ══ Overview Tab ══ */}
            {tab === 'overview' && summary && (
                <div className="flex-1 overflow-auto p-6">
                    {/* Project header card */}
                    <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
                        <div className="flex items-center gap-4 flex-wrap">
                            <div className="w-14 h-14 bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                                <span className="text-white font-black text-lg">{summary.project.key}</span>
                            </div>
                            <div className="flex-1">
                                <h2 className="text-2xl font-black text-gray-900">{summary.project.name}</h2>
                                <p className="text-sm text-gray-500">{summary.project.description || 'Sin descripción'}</p>
                                <div className="flex items-center gap-3 mt-2 flex-wrap">
                                    <span className="text-[10px] px-2 py-0.5 bg-violet-50 text-violet-600 rounded-full font-bold">{summary.project.methodology === 'scrum' ? 'Scrum' : 'Kanban'}</span>
                                    {summary.project.client_name && <span className="text-[10px] text-gray-500 flex items-center gap-1"><Target size={10} /> {summary.project.client_name}</span>}
                                    {summary.project.pm_name && <span className="text-[10px] text-amber-600 flex items-center gap-1"><Shield size={10} /> PM: {summary.project.pm_name}</span>}
                                    {summary.project.created_by_name && <span className="text-[10px] text-blue-500 flex items-center gap-1"><User size={10} /> Creado: {summary.project.created_by_name}</span>}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* KPI cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
                        {[
                            { label: 'Tareas', value: summary.totals.tasks, icon: CheckSquare, color: 'text-violet-600', bg: 'bg-violet-50' },
                            { label: 'Completadas', value: `${summary.totals.done}/${summary.totals.tasks}`, icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50' },
                            { label: 'Story Points', value: summary.totals.story_points, icon: Zap, color: 'text-blue-600', bg: 'bg-blue-50' },
                            { label: 'Hs. Estimadas', value: `${summary.totals.estimated_hours}h`, icon: Timer, color: 'text-amber-600', bg: 'bg-amber-50' },
                            { label: 'Hs. Dedicadas', value: `${summary.totals.actual_hours}h`, icon: Clock, color: 'text-red-600', bg: 'bg-red-50' },
                            { label: 'Miembros', value: summary.totals.members, icon: Users, color: 'text-purple-600', bg: 'bg-purple-50' },
                        ].map((kpi, i) => (
                            <div key={i} className="bg-white rounded-xl border border-gray-200 p-4">
                                <div className={`w-8 h-8 ${kpi.bg} rounded-lg flex items-center justify-center mb-2`}>
                                    <kpi.icon size={16} className={kpi.color} />
                                </div>
                                <p className="text-2xl font-black text-gray-900">{kpi.value}</p>
                                <p className="text-[10px] text-gray-500 font-medium uppercase">{kpi.label}</p>
                            </div>
                        ))}
                    </div>

                    {/* Hours bar */}
                    {(summary.totals.estimated_hours > 0 || summary.totals.actual_hours > 0) && (
                        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
                            <h4 className="text-xs font-bold text-gray-500 uppercase mb-3 flex items-center gap-2"><TrendingUp size={12} /> Horas Estimadas vs Dedicadas</h4>
                            <div className="flex items-center gap-4">
                                <div className="flex-1">
                                    <div className="h-6 bg-gray-100 rounded-full overflow-hidden flex">
                                        <div className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full transition-all" style={{ width: `${summary.totals.estimated_hours > 0 ? Math.min(100, (summary.totals.actual_hours / summary.totals.estimated_hours) * 100) : 0}%` }} />
                                    </div>
                                </div>
                                <span className="text-sm font-bold text-gray-700">{summary.totals.actual_hours}h / {summary.totals.estimated_hours}h</span>
                                {summary.totals.estimated_hours > 0 && (
                                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${summary.totals.actual_hours > summary.totals.estimated_hours ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                                        {Math.round((summary.totals.actual_hours / summary.totals.estimated_hours) * 100)}%
                                    </span>
                                )}
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Sprint breakdown */}
                        {summary.sprint_breakdown.length > 0 && (
                            <div className="bg-white rounded-xl border border-gray-200 p-4">
                                <div className="flex items-center justify-between mb-3">
                                    <h4 className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2"><GitBranch size={12} /> Sprints</h4>
                                    <button onClick={() => { setEditingSprint(null); setSprintForm({ name: '', goal: '', start_date: '', end_date: '', version_id: '' }); setShowSprintModal(true); }}
                                        className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold text-violet-600 bg-violet-50 rounded-lg hover:bg-violet-100">
                                        <Plus size={10} /> Sprint
                                    </button>
                                </div>
                                <div className="space-y-3">
                                    {summary.sprint_breakdown.map((s: any) => (
                                        <div key={s.id} className="border border-gray-100 rounded-lg p-3 group">
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-sm text-gray-900">{s.name}</span>
                                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${s.status === 'active' ? 'bg-green-50 text-green-600' : s.status === 'completed' ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>
                                                        {s.status === 'active' ? 'Activo' : s.status === 'completed' ? 'Completado' : 'Planificación'}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <span className="text-xs font-bold text-gray-600 mr-1">{s.completion}%</span>
                                                    <button onClick={async () => {
                                                        const ns = s.status === 'active' ? 'completed' : 'active';
                                                        await api.put(`/projects/${projectId}/sprints/${s.id}`, { status: ns });
                                                        const { data: sp } = await api.get(`/projects/${projectId}/sprints`); setSprints(sp);
                                                        api.get(`/projects/${projectId}/summary`).then(r => setSummary(r.data));
                                                    }} className="p-1 text-gray-400 hover:text-green-600 transition-all" title={s.status === 'active' ? 'Completar' : 'Activar'}>
                                                        {s.status === 'active' ? <CheckCircle2 size={14} /> : <Play size={14} />}
                                                    </button>
                                                    <button onClick={() => {
                                                        setEditingSprint({ id: s.id, name: s.name, status: s.status, goal: '', start_date: s.start_date, end_date: s.end_date, version_id: s.version_id } as any);
                                                        setSprintForm({
                                                            name: s.name, goal: '',
                                                            start_date: s.start_date || '', end_date: s.end_date || '',
                                                            version_id: s.version_id ? String(s.version_id) : '',
                                                        });
                                                        setShowSprintModal(true);
                                                    }} className="p-1 text-gray-400 hover:text-blue-600 transition-all" title="Editar">
                                                        <Pencil size={14} />
                                                    </button>
                                                    <button onClick={async () => {
                                                        if (!confirm(`¿Eliminar sprint "${s.name}"? Las tareas quedarán en Backlog.`)) return;
                                                        await api.delete(`/projects/${projectId}/sprints/${s.id}`);
                                                        const { data: sp } = await api.get(`/projects/${projectId}/sprints`); setSprints(sp);
                                                        const { data: sum } = await api.get(`/projects/${projectId}/summary`); setSummary(sum);
                                                    }} className="p-1 text-gray-400 hover:text-red-600 transition-all" title="Eliminar">
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-2">
                                                <div className="h-full bg-gradient-to-r from-violet-400 to-purple-500 rounded-full" style={{ width: `${s.completion}%` }} />
                                            </div>
                                            <div className="flex items-center gap-3 text-[10px] text-gray-500">
                                                <span>{s.task_count} tareas</span>
                                                <span>{s.story_points} SP</span>
                                                <span>{s.estimated_hours}h est.</span>
                                                <span>{s.actual_hours}h ded.</span>
                                                {s.task_count > 0 && (
                                                    <button onClick={async () => {
                                                        if (expandedOverviewSprints[s.id]) {
                                                            setExpandedOverviewSprints(prev => { const n = { ...prev }; delete n[s.id]; return n; });
                                                        } else {
                                                            const { data } = await api.get(`/projects/${projectId}/tasks?sprint_id=${s.id}`);
                                                            setExpandedOverviewSprints(prev => ({ ...prev, [s.id]: data }));
                                                        }
                                                    }} className="ml-auto flex items-center gap-1 text-violet-500 hover:text-violet-700 font-bold cursor-pointer">
                                                        {expandedOverviewSprints[s.id] ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                                                        {expandedOverviewSprints[s.id] ? 'Ocultar' : 'Ver tickets'}
                                                    </button>
                                                )}
                                            </div>
                                            {expandedOverviewSprints[s.id] && (
                                                <div className="mt-3 space-y-1.5 border-t border-gray-100 pt-3">
                                                    {expandedOverviewSprints[s.id].map((tk: any) => {
                                                        const typeIcons: Record<string, any> = {
                                                            epic: <Zap size={12} className="text-purple-500" />,
                                                            feature: <Layers size={12} className="text-blue-500" />,
                                                            story: <BookOpen size={12} className="text-green-500" />,
                                                            task: <CheckSquare size={12} className="text-gray-500" />,
                                                            bug: <Bug size={12} className="text-red-500" />,
                                                            subtask: <ListTree size={12} className="text-gray-400" />,
                                                        };
                                                        const statusColors: Record<string, string> = {
                                                            todo: 'bg-gray-100 text-gray-600',
                                                            in_progress: 'bg-blue-50 text-blue-600',
                                                            in_review: 'bg-amber-50 text-amber-600',
                                                            review: 'bg-amber-50 text-amber-600',
                                                            done: 'bg-green-50 text-green-600',
                                                        };
                                                        const statusLabels: Record<string, string> = {
                                                            todo: 'Por hacer', in_progress: 'En progreso',
                                                            in_review: 'En revisión', review: 'Revisión', done: 'Hecho',
                                                        };
                                                        const priorityColors: Record<string, string> = {
                                                            critical: 'text-red-600', high: 'text-orange-500',
                                                            medium: 'text-yellow-500', low: 'text-blue-400',
                                                        };
                                                        return (
                                                            <div key={tk.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-50 cursor-pointer" onClick={() => openEditTask(tk)}>
                                                                {typeIcons[tk.type] || <CheckSquare size={12} />}
                                                                <span className="text-[10px] text-gray-400 font-mono">{tk.key}</span>
                                                                <span className="text-xs text-gray-800 font-medium flex-1 truncate">{tk.title}</span>
                                                                <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${statusColors[tk.status] || 'bg-gray-100 text-gray-500'}`}>
                                                                    {statusLabels[tk.status] || tk.status}
                                                                </span>
                                                                <AlertTriangle size={10} className={priorityColors[tk.priority] || 'text-gray-400'} />
                                                                {tk.assigned_to && (
                                                                    <span className="w-5 h-5 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center text-[9px] font-bold">
                                                                        {getUserName(tk.assigned_to)?.charAt(0) || '?'}
                                                                    </span>
                                                                )}
                                                                {tk.story_points > 0 && <span className="text-[9px] bg-blue-50 text-blue-600 px-1 rounded font-bold">{tk.story_points}</span>}
                                                            </div>
                                                        );
                                                    })}
                                                    {expandedOverviewSprints[s.id].length === 0 && (
                                                        <p className="text-xs text-gray-400 text-center py-2">Sin tickets en este sprint</p>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                                {/* Backlog summary */}
                                <div className="mt-3 px-3 py-2 bg-gray-50 rounded-lg flex items-center justify-between">
                                    <span className="text-xs font-medium text-gray-600">📋 Backlog</span>
                                    <span className="text-xs text-gray-500">{summary.backlog.task_count} tareas · {summary.backlog.story_points} SP</span>
                                </div>
                            </div>
                        )}

                        {/* Version roadmap */}
                        {summary.versions.length > 0 && (
                            <div className="bg-white rounded-xl border border-gray-200 p-4">
                                <h4 className="text-xs font-bold text-gray-500 uppercase mb-3 flex items-center gap-2"><Milestone size={12} /> Versiones / Roadmap</h4>
                                <div className="space-y-4">
                                    {summary.versions.map((v: any) => (
                                        <div key={v.id} className="border border-gray-100 rounded-xl p-4 hover:shadow-sm transition-shadow">
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-black text-sm text-gray-900">{v.name}</span>
                                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${v.status === 'released' ? 'bg-green-50 text-green-600' : v.status === 'in_progress' ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>
                                                        {v.status === 'released' ? '✅ Lanzada' : v.status === 'in_progress' ? '🔄 En progreso' : '📋 Planificada'}
                                                    </span>
                                                </div>
                                                {v.repository_url && (
                                                    <a href={v.repository_url} target="_blank" rel="noopener noreferrer"
                                                        className="flex items-center gap-1 text-[10px] text-violet-500 hover:text-violet-700 font-medium bg-violet-50 px-2 py-1 rounded-lg">
                                                        <GitBranch size={10} /> Repositorio
                                                    </a>
                                                )}
                                            </div>
                                            {v.description && <p className="text-xs text-gray-600 mb-2 leading-relaxed">{v.description}</p>}
                                            {/* Vigencia */}
                                            {(v.start_date || v.release_date) && (
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Calendar size={11} className="text-gray-400" />
                                                    <span className="text-[10px] text-gray-500 font-medium">
                                                        {v.start_date ? new Date(v.start_date + 'T12:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                                                        {' → '}
                                                        {v.release_date ? new Date(v.release_date + 'T12:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Sin fecha'}
                                                    </span>
                                                    {v.start_date && v.release_date && (() => {
                                                        const now = new Date();
                                                        const start = new Date(v.start_date);
                                                        const end = new Date(v.release_date);
                                                        const isActive = now >= start && now <= end;
                                                        const isPast = now > end;
                                                        return (
                                                            <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${isActive ? 'bg-green-50 text-green-600' : isPast ? 'bg-gray-100 text-gray-400' : 'bg-amber-50 text-amber-600'}`}>
                                                                {isActive ? '● Vigente' : isPast ? 'Finalizada' : 'Próxima'}
                                                            </span>
                                                        );
                                                    })()}
                                                </div>
                                            )}
                                            {/* Progress bar */}
                                            <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-2">
                                                <div className="h-full bg-gradient-to-r from-green-400 to-emerald-500 rounded-full transition-all" style={{ width: `${v.completion}%` }} />
                                            </div>
                                            <div className="flex items-center gap-4 text-[10px] text-gray-500 mb-2">
                                                <span className="font-bold">{v.completion}% completado</span>
                                                <span>{v.task_count} tareas ({v.done_count} hechas)</span>
                                                <span>{v.sprint_count} sprints</span>
                                            </div>
                                            {/* Sprints dentro de la versión */}
                                            {v.sprints.length > 0 && (
                                                <div className="mt-2 pt-2 border-t border-gray-50">
                                                    <p className="text-[9px] font-bold text-gray-400 uppercase mb-1">Sprints en esta versión</p>
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {v.sprints.map((sn: string, i: number) => {
                                                            const sprintData = summary.sprint_breakdown.find((sb: any) => sb.name === sn);
                                                            return (
                                                                <span key={i} className="text-[10px] bg-violet-50 text-violet-600 px-2 py-1 rounded-lg font-medium flex items-center gap-1">
                                                                    <GitBranch size={9} />{sn}
                                                                    {sprintData && <span className="text-violet-400">({sprintData.task_count})</span>}
                                                                </span>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Resource allocation */}
                    {summary.resources.length > 0 && (
                        <div className="bg-white rounded-xl border border-gray-200 p-4 mt-6">
                            <h4 className="text-xs font-bold text-gray-500 uppercase mb-3 flex items-center gap-2"><Users size={12} /> Asignación de Recursos</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {summary.resources.map((r: any) => (
                                    <div key={r.user_id} className="border border-gray-100 rounded-lg p-3">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
                                                {r.name.charAt(0).toUpperCase()}
                                            </span>
                                            <div>
                                                <p className="font-bold text-sm text-gray-900">{r.name}</p>
                                                <p className="text-[10px] text-gray-500">{r.done_count}/{r.task_count} tareas completadas</p>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-3 gap-2 text-center">
                                            <div className="bg-blue-50 rounded-lg p-1.5">
                                                <p className="text-sm font-bold text-blue-700">{r.story_points}</p>
                                                <p className="text-[9px] text-blue-500">SP</p>
                                            </div>
                                            <div className="bg-amber-50 rounded-lg p-1.5">
                                                <p className="text-sm font-bold text-amber-700">{r.estimated_hours}h</p>
                                                <p className="text-[9px] text-amber-500">Estimado</p>
                                            </div>
                                            <div className="bg-red-50 rounded-lg p-1.5">
                                                <p className="text-sm font-bold text-red-700">{r.actual_hours}h</p>
                                                <p className="text-[9px] text-red-500">Dedicado</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
            {tab === 'overview' && !summary && (
                <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">Cargando resumen...</div>
            )}

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

            {/* Backlog View — Two Column Layout */}
            {tab === 'backlog' && (() => {
                const backlogTasks = allProjectTasks.filter(t => !t.sprint_id);
                const sprintsNoVersion = sprints.filter(s => !s.version_id);
                const getSprintTasks = (sid: number) => allProjectTasks.filter(t => t.sprint_id === sid);
                const getVersionTicketCount = (vid: number) => {
                    const vSprints = sprints.filter(s => s.version_id === vid);
                    return vSprints.reduce((sum, s) => sum + getSprintTasks(s.id).length, 0);
                };
                const sprintStats = (tasks: Task[]) => {
                    const totalEst = tasks.reduce((s, t) => s + (t.estimated_hours || 0), 0);
                    const totalAct = tasks.reduce((s, t) => s + (t.actual_hours || 0), 0);
                    const spTasks = tasks.filter(t => t.story_points);
                    const avgSP = spTasks.length ? (spTasks.reduce((s, t) => s + (t.story_points || 0), 0) / spTasks.length) : 0;
                    const totalSP = tasks.reduce((s, t) => s + (t.story_points || 0), 0);
                    return { totalEst, totalAct, avgSP, totalSP };
                };

                const handleBacklogDragStart = (e: React.DragEvent, taskId: number) => {
                    e.dataTransfer.setData('text/plain', String(taskId));
                    e.dataTransfer.effectAllowed = 'move';
                    setBacklogDragTaskId(taskId);
                };
                const handleBacklogDragOver = (e: React.DragEvent, targetId: string) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                    setBacklogDropTarget(targetId);
                };
                const handleBacklogDragLeave = () => { setBacklogDropTarget(null); };
                const handleBacklogDrop = async (e: React.DragEvent, sprintId: number | null) => {
                    e.preventDefault();
                    setBacklogDropTarget(null);
                    setBacklogDragTaskId(null);
                    const taskId = parseInt(e.dataTransfer.getData('text/plain'));
                    if (!taskId) return;
                    const task = allProjectTasks.find(t => t.id === taskId);
                    if (!task) return;
                    if (task.sprint_id === sprintId) return;
                    setAllProjectTasks(prev => prev.map(t => t.id === taskId ? { ...t, sprint_id: sprintId } : t));
                    setTasks(prev => {
                        if (sprintId === null) return [...prev, { ...task, sprint_id: null }];
                        return prev.filter(t => t.id !== taskId);
                    });
                    try {
                        await api.put(`/projects/${projectId}/tasks/${taskId}`, { sprint_id: sprintId });
                        const { data: sp } = await api.get(`/projects/${projectId}/sprints`);
                        setSprints(sp);
                    } catch { loadTasks(); }
                };
                const handleBacklogDragEnd = () => { setBacklogDragTaskId(null); setBacklogDropTarget(null); };

                const renderTaskRow = (task: Task) => {
                    const typeInfo = getTypeInfo(task.type);
                    const prioInfo = getPriorityInfo(task.priority);
                    const isDragging = backlogDragTaskId === task.id;
                    return (
                        <div key={task.id}
                            draggable
                            onDragStart={e => handleBacklogDragStart(e, task.id)}
                            onDragEnd={handleBacklogDragEnd}
                            className={`px-3 py-2 hover:bg-gray-50 cursor-grab active:cursor-grabbing transition-all border-b border-gray-50 last:border-0 ${isDragging ? 'opacity-40 scale-[0.98] bg-violet-50' : ''}`}
                            style={{ paddingLeft: task.parent_id ? '32px' : '8px' }}>
                            <div className="flex items-center gap-2">
                                <GripVertical size={11} className="text-gray-300 flex-shrink-0" />
                                <typeInfo.icon size={13} style={{ color: typeInfo.color }} className="flex-shrink-0" />
                                <span className="text-[9px] font-mono font-bold text-gray-400 flex-shrink-0">{task.key}</span>
                                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: prioInfo.color }} title={prioInfo.label} />
                                <span className="flex-1 text-xs font-semibold text-gray-800 truncate cursor-pointer hover:text-violet-600" onClick={() => openEditTask(task)}>{task.title}</span>
                                {task.assigned_to && (
                                    <span className="w-5 h-5 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center text-[8px] font-bold flex-shrink-0" title={getUserName(task.assigned_to) || ''}>
                                        {getUserName(task.assigned_to)?.charAt(0) || '?'}
                                    </span>
                                )}
                                <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 ${task.status === 'done' ? 'bg-green-50 text-green-600' :
                                    task.status === 'in_progress' ? 'bg-blue-50 text-blue-600' :
                                        task.status === 'in_review' ? 'bg-amber-50 text-amber-600' :
                                            'bg-gray-100 text-gray-500'
                                    }`}>{COLUMNS.find(c => c.id === task.status)?.label || task.status}</span>
                                <button onClick={async (e) => {
                                    e.stopPropagation();
                                    if (!confirm(`¿Eliminar "${task.key}"?`)) return;
                                    try {
                                        await api.delete(`/projects/${projectId}/tasks/${task.id}`);
                                        setAllProjectTasks(prev => prev.filter(t => t.id !== task.id));
                                        setTasks(prev => prev.filter(t => t.id !== task.id));
                                    } catch (err: any) { alert(err.response?.data?.detail || 'Error'); }
                                }} className="p-0.5 text-gray-300 hover:text-red-500 transition-colors flex-shrink-0" title="Eliminar">
                                    <Trash2 size={11} />
                                </button>
                            </div>
                            {/* Details row */}
                            <div className="flex items-center gap-3 mt-1 ml-6">
                                {task.description && (
                                    <p className="text-[10px] text-gray-400 truncate max-w-[280px] italic">{task.description.replace(/\n/g, ' ').slice(0, 120)}</p>
                                )}
                                <div className="flex items-center gap-2 ml-auto flex-shrink-0">
                                    {task.story_points ? <span className="text-[9px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-bold">{task.story_points} SP</span> : null}
                                    {task.estimated_hours ? <span className="text-[9px] bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded font-medium">⏱ {task.estimated_hours}h est</span> : null}
                                    {task.actual_hours ? <span className="text-[9px] bg-orange-50 text-orange-600 px-1.5 py-0.5 rounded font-medium">⏱ {task.actual_hours}h ded</span> : null}
                                    {task.children_count > 0 && <span className="text-[9px] bg-violet-50 text-violet-500 px-1 py-0.5 rounded">{task.children_count} sub</span>}
                                </div>
                            </div>
                        </div>
                    );
                };

                const renderSprintSection = (s: Sprint) => {
                    const sTasks = getSprintTasks(s.id);
                    const isExpanded = expandedBacklogSprints.has(s.id);
                    const isDropTarget = backlogDropTarget === `sprint-${s.id}`;
                    const stats = sprintStats(sTasks);
                    return (
                        <div key={s.id}
                            className={`rounded-xl border transition-all ${isDropTarget ? 'border-violet-400 ring-2 ring-violet-200 bg-violet-50/30 shadow-md' : 'border-gray-100 bg-white'}`}
                            onDragOver={e => handleBacklogDragOver(e, `sprint-${s.id}`)}
                            onDragLeave={handleBacklogDragLeave}
                            onDrop={e => handleBacklogDrop(e, s.id)}>
                            <div className="flex items-center gap-2 px-3 py-2.5 cursor-pointer select-none"
                                onClick={() => setExpandedBacklogSprints(prev => {
                                    const n = new Set(prev); n.has(s.id) ? n.delete(s.id) : n.add(s.id); return n;
                                })}>
                                {isExpanded ? <ChevronDown size={13} className="text-violet-500" /> : <ChevronRight size={13} className="text-gray-400" />}
                                <GitBranch size={12} className="text-violet-500" />
                                <span className="font-bold text-xs text-gray-900">{s.name}</span>
                                <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${s.status === 'active' ? 'bg-green-50 text-green-600' :
                                    s.status === 'completed' ? 'bg-blue-50 text-blue-600' :
                                        'bg-gray-100 text-gray-500'
                                    }`}>{s.status === 'active' ? 'Activo' : s.status === 'completed' ? 'Completado' : 'Plan.'}</span>
                                <span className="text-[9px] bg-violet-50 text-violet-600 px-1.5 py-0.5 rounded-full font-bold">
                                    {sTasks.length} tkt
                                </span>
                                <div className="flex items-center gap-1 ml-auto" onClick={e => e.stopPropagation()}>
                                    <button onClick={() => toggleSprintStatus(s)} className="p-1 text-gray-400 hover:text-green-600 transition-colors" title={s.status === 'active' ? 'Completar' : 'Activar'}>
                                        {s.status === 'active' ? <CheckCircle2 size={13} /> : <Play size={13} />}
                                    </button>
                                    <button onClick={() => openEditSprint(s)} className="p-1 text-gray-400 hover:text-blue-600 transition-colors" title="Editar">
                                        <Pencil size={13} />
                                    </button>
                                    <button onClick={() => deleteSprint(s.id)} className="p-1 text-gray-400 hover:text-red-600 transition-colors" title="Eliminar">
                                        <Trash2 size={13} />
                                    </button>
                                </div>
                            </div>
                            {/* Sprint progress bar */}
                            {sTasks.length > 0 && (() => {
                                const done = sTasks.filter(t => t.status === 'done').length;
                                const review = sTasks.filter(t => t.status === 'in_review').length;
                                const inProg = sTasks.filter(t => t.status === 'in_progress').length;
                                const todo = sTasks.length - done - review - inProg;
                                const pct = Math.round((done / sTasks.length) * 100);
                                return (
                                    <div className="px-3 py-1.5 border-t border-gray-100">
                                        <div className="flex items-center gap-2">
                                            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden flex">
                                                {done > 0 && <div className="h-full bg-green-500 transition-all" style={{ width: `${(done / sTasks.length) * 100}%` }} />}
                                                {review > 0 && <div className="h-full bg-amber-400 transition-all" style={{ width: `${(review / sTasks.length) * 100}%` }} />}
                                                {inProg > 0 && <div className="h-full bg-blue-500 transition-all" style={{ width: `${(inProg / sTasks.length) * 100}%` }} />}
                                                {todo > 0 && <div className="h-full bg-gray-200 transition-all" style={{ width: `${(todo / sTasks.length) * 100}%` }} />}
                                            </div>
                                            <span className="text-[9px] font-bold text-gray-500 w-8 text-right">{pct}%</span>
                                        </div>
                                    </div>
                                );
                            })()}
                            {/* Sprint stats bar */}
                            {sTasks.length > 0 && (
                                <div className="flex items-center gap-3 px-4 py-1.5 bg-gray-50/80 border-t border-gray-100 text-[9px] text-gray-500">
                                    <span className="font-bold text-blue-600">x̄ {stats.avgSP.toFixed(1)} SP</span>
                                    <span className="text-purple-600">⏱ {stats.totalEst}h est</span>
                                    <span className="text-orange-600">⏱ {stats.totalAct}h ded</span>
                                </div>
                            )}
                            {isExpanded && (
                                <div className="border-t border-gray-100">
                                    {sTasks.length === 0 ? (
                                        <div className="px-4 py-5 text-center text-gray-400 text-[10px]">Arrastrá tickets aquí</div>
                                    ) : sTasks.map(t => renderTaskRow(t))}
                                </div>
                            )}
                        </div>
                    );
                };

                return (
                    <div className="flex-1 flex overflow-hidden">
                        {/* ══ LEFT PANEL: Versions + Sprints ══ */}
                        <div className="w-1/2 border-r border-gray-200 overflow-y-auto p-4 space-y-4">
                            {/* Versiones */}
                            {versions.length > 0 && (
                                <div className="space-y-3">
                                    <h3 className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2 px-1">
                                        <Milestone size={12} /> Versiones
                                    </h3>
                                    {versions.map(v => {
                                        const vSprints = sprints.filter(s => s.version_id === v.id);
                                        const vTicketCount = getVersionTicketCount(v.id);
                                        const isExpanded = expandedBacklogVersions.has(v.id);
                                        return (
                                            <div key={v.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                                                <div className="flex items-center gap-2 px-3 py-2.5 cursor-pointer select-none hover:bg-gray-50 transition-colors"
                                                    onClick={() => setExpandedBacklogVersions(prev => {
                                                        const n = new Set(prev); n.has(v.id) ? n.delete(v.id) : n.add(v.id); return n;
                                                    })}>
                                                    {isExpanded ? <ChevronDown size={13} className="text-green-600" /> : <ChevronRight size={13} className="text-gray-400" />}
                                                    <Milestone size={12} className="text-green-600" />
                                                    <span className="font-black text-xs text-gray-900">{v.name}</span>
                                                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${v.status === 'released' ? 'bg-green-50 text-green-600' :
                                                        v.status === 'in_progress' ? 'bg-blue-50 text-blue-600' :
                                                            'bg-gray-100 text-gray-500'
                                                        }`}>{v.status === 'released' ? 'Lanzada' : v.status === 'in_progress' ? 'En progreso' : 'Planificada'}</span>
                                                    <span className="text-[9px] text-gray-500 ml-auto">
                                                        {vSprints.length} spr · {vTicketCount} tkt
                                                    </span>
                                                    <div className="flex items-center gap-0.5 ml-1" onClick={e => e.stopPropagation()}>
                                                        <button onClick={() => openEditVersion(v)} className="p-1 text-gray-400 hover:text-blue-600 transition-colors" title="Editar">
                                                            <Pencil size={12} />
                                                        </button>
                                                        <button onClick={() => deleteVersion(v.id)} className="p-1 text-gray-400 hover:text-red-600 transition-colors" title="Eliminar">
                                                            <Trash2 size={12} />
                                                        </button>
                                                    </div>
                                                </div>
                                                {isExpanded && vSprints.length > 0 && (
                                                    <div className="px-3 pb-3 space-y-2">
                                                        {vSprints.map(s => renderSprintSection(s))}
                                                    </div>
                                                )}
                                                {isExpanded && vSprints.length === 0 && (
                                                    <div className="px-4 pb-3 text-xs text-gray-400 text-center py-4">Sin sprints en esta versión</div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Sprints sin versión */}
                            {sprintsNoVersion.length > 0 && (
                                <div className="space-y-3">
                                    <h3 className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2 px-1">
                                        <GitBranch size={12} /> Sprints sin versión
                                    </h3>
                                    {sprintsNoVersion.map(s => renderSprintSection(s))}
                                </div>
                            )}

                            {versions.length === 0 && sprintsNoVersion.length === 0 && (
                                <div className="flex flex-col items-center justify-center h-40 text-gray-400 gap-2">
                                    <Milestone size={28} className="text-gray-300" />
                                    <p className="text-xs">Sin versiones ni sprints</p>
                                </div>
                            )}
                        </div>

                        {/* ══ RIGHT PANEL: Backlog ══ */}
                        <div className={`w-1/2 overflow-y-auto p-4 transition-all ${backlogDropTarget === 'backlog' ? 'bg-violet-50/30' : ''
                            }`}
                            onDragOver={e => handleBacklogDragOver(e, 'backlog')}
                            onDragLeave={handleBacklogDragLeave}
                            onDrop={e => handleBacklogDrop(e, null)}>
                            <div className="flex items-center gap-2 mb-3">
                                <span className="text-sm font-black text-gray-900">📋 Backlog</span>
                                <span className="text-[10px] bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full font-bold">
                                    {backlogTasks.length} {backlogTasks.length === 1 ? 'ticket' : 'tickets'}
                                </span>
                                <span className="text-[10px] text-gray-400">Sin sprint asignado</span>
                            </div>
                            <div className={`bg-white rounded-xl border shadow-sm ${backlogDropTarget === 'backlog' ? 'border-violet-400 ring-2 ring-violet-200' : 'border-gray-200'
                                }`}>
                                {backlogTasks.length === 0 ? (
                                    <div className="px-4 py-12 text-center text-gray-400 text-sm">El backlog está vacío. Arrastrá tickets aquí desde un sprint.</div>
                                ) : backlogTasks.map(t => renderTaskRow(t))}
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* Gantt View */}
            {tab === 'gantt' && renderGantt()}

            {/* ══ Notes Tab ══ */}
            {tab === 'notes' && (() => {
                const NCOLORS = [
                    { name: 'yellow', bg: '#fef9c3', border: '#facc15', text: '#854d0e', shadow: 'rgba(250,204,21,0.25)' },
                    { name: 'green', bg: '#dcfce7', border: '#4ade80', text: '#166534', shadow: 'rgba(74,222,128,0.25)' },
                    { name: 'blue', bg: '#dbeafe', border: '#60a5fa', text: '#1e40af', shadow: 'rgba(96,165,250,0.25)' },
                    { name: 'pink', bg: '#fce7f3', border: '#f472b6', text: '#9d174d', shadow: 'rgba(244,114,182,0.25)' },
                    { name: 'purple', bg: '#f3e8ff', border: '#c084fc', text: '#6b21a8', shadow: 'rgba(192,132,252,0.25)' },
                    { name: 'orange', bg: '#ffedd5', border: '#fb923c', text: '#9a3412', shadow: 'rgba(251,146,60,0.25)' },
                ];
                const gc = (nm: string) => NCOLORS.find(c => c.name === nm) || NCOLORS[0];
                const rot = (id: number) => [-2.5, 1.5, -1, 2, -0.5, 1.8, -1.8, 0.8, -2, 1.2][id % 10];
                const visIcon = (v: string) => v === 'private' ? <Lock size={10} className="text-red-500" /> : v === 'shared' ? <UserPlus size={10} className="text-blue-500" /> : <Globe size={10} className="text-green-500" />;
                const handleNoteDragEnd = async () => {
                    if (noteDragIdx !== null && noteDragOverIdx !== null && noteDragIdx !== noteDragOverIdx) {
                        const reordered = [...notes];
                        const [moved] = reordered.splice(noteDragIdx, 1);
                        reordered.splice(noteDragOverIdx, 0, moved);
                        setNotes(reordered);
                        try { await api.put(`/projects/${projectId}/notes/reorder`, { order: reordered.map(n => n.id) }); } catch (e) { console.error(e); }
                    }
                    setNoteDragIdx(null); setNoteDragOverIdx(null);
                };
                return (
                    <div className="flex-1 overflow-auto p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2"><StickyNote size={14} /> Notas del Proyecto</h3>
                            <button onClick={() => { setEditingNote(null); setNoteForm({ title: '', content: '', color: 'yellow', visibility: 'team', shared_with: [] }); setShowNoteModal(true); }}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-lg font-bold text-xs shadow-lg shadow-violet-200/50 hover:shadow-xl transition-all">
                                <Plus size={14} /> Nueva Nota
                            </button>
                        </div>
                        {notes.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-64 text-gray-400 gap-3">
                                <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center"><StickyNote size={36} className="text-amber-300" /></div>
                                <p className="text-sm font-medium">No hay notas. ¡Creá una!</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                                {notes.map((n, idx) => {
                                    const c = gc(n.color);
                                    const isDragging = noteDragIdx === idx;
                                    const isOver = noteDragOverIdx === idx;
                                    return (
                                        <div key={n.id} draggable onDragStart={() => setNoteDragIdx(idx)} onDragOver={(e) => { e.preventDefault(); setNoteDragOverIdx(idx); }} onDragEnd={handleNoteDragEnd}
                                            className={`group select-none cursor-grab active:cursor-grabbing transition-all duration-200 ${isDragging ? 'opacity-40 scale-95' : ''}`}
                                            style={{ transform: isDragging ? 'rotate(0deg) scale(0.95)' : `rotate(${rot(n.id)}deg)` }}>
                                            <div className={`rounded-2xl overflow-hidden transition-all duration-300 hover:scale-[1.03] ${isOver ? 'ring-2 ring-violet-400 ring-offset-2' : ''}`}
                                                style={{ backgroundColor: c.bg, boxShadow: `0 4px 16px ${c.shadow}, 0 1px 3px rgba(0,0,0,0.06)` }}>
                                                <div className="relative px-4 pt-3 pb-0">
                                                    <div className="absolute top-2 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: c.border + '40' }}>
                                                        <Pin size={10} style={{ color: c.text }} className="rotate-45" />
                                                    </div>
                                                    <div className="absolute top-2 left-3">{visIcon(n.visibility)}</div>
                                                    <div className="absolute top-2 right-3 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all">
                                                        <span className="p-1 cursor-grab"><GripVertical size={12} style={{ color: c.text + '80' }} /></span>
                                                        {n.converted_task_key ? (
                                                            <span className="px-2 py-1 rounded-lg text-[10px] font-bold bg-green-100 text-green-700 cursor-default" title="Ya convertida en ticket">✓ {n.converted_task_key}</span>
                                                        ) : (
                                                            <button title="Convertir a Tarea (Backlog)" onClick={async (e) => {
                                                                e.stopPropagation();
                                                                if (!confirm(`¿Convertir la nota "${n.title}" en una tarea del Backlog?`)) return;
                                                                try {
                                                                    const { data: newTask } = await api.post(`/projects/${projectId}/tasks`, {
                                                                        title: n.title || 'Nota sin título',
                                                                        description: n.content || '',
                                                                        type: 'task',
                                                                        priority: 'medium',
                                                                        status: 'todo',
                                                                    });
                                                                    // Persist on the note
                                                                    await api.put(`/projects/${projectId}/notes/${n.id}`, { converted_task_key: newTask.key });
                                                                    setNotes(prev => prev.map(x => x.id === n.id ? { ...x, converted_task_key: newTask.key } : x));
                                                                    loadTasks();
                                                                    showToast(`Convertido en ticket ${newTask.key || 'TKT'}`);
                                                                } catch (err: any) { alert(err.response?.data?.detail || 'Error al convertir'); }
                                                            }} className="p-1.5 rounded-lg hover:bg-white/40"><ArrowRightCircle size={13} style={{ color: c.text }} /></button>
                                                        )}
                                                        <button onClick={() => { setEditingNote(n); setNoteForm({ title: n.title, content: n.content || '', color: n.color, visibility: n.visibility || 'team', shared_with: n.shared_with || [] }); setShowNoteModal(true); }} className="p-1.5 rounded-lg hover:bg-white/40"><Pencil size={13} style={{ color: c.text }} /></button>
                                                        <button onClick={async () => { if (confirm('¿Eliminar nota?')) { await api.delete(`/projects/${projectId}/notes/${n.id}`); setNotes(prev => prev.filter(x => x.id !== n.id)); } }} className="p-1.5 rounded-lg hover:bg-red-100/60"><Trash2 size={13} className="text-red-500" /></button>
                                                    </div>
                                                </div>
                                                <div className="px-5 pt-4 pb-4">
                                                    {n.title && <h3 className="font-black text-sm mb-2 leading-tight" style={{ color: c.text }}>{n.title}</h3>}
                                                    {n.content && <p className="text-xs leading-relaxed whitespace-pre-wrap line-clamp-6" style={{ color: c.text + 'cc' }}>{n.content}</p>}
                                                    {n.converted_task_key && (
                                                        <div className="mt-2 px-2.5 py-1.5 bg-red-500 text-white rounded-lg text-[10px] font-black uppercase tracking-wider text-center shadow-sm"
                                                            style={{ transform: 'rotate(-1deg)' }}>
                                                            🎫 Convertido en {n.converted_task_key}
                                                        </div>
                                                    )}
                                                    <div className="mt-3 pt-2 border-t flex items-center gap-1.5" style={{ borderColor: c.border + '30' }}>
                                                        {n.created_by_name && <span className="text-[9px] opacity-60" style={{ color: c.text }}>@{n.created_by_name}</span>}
                                                        <span className="text-[9px] ml-auto opacity-50" style={{ color: c.text }}>{new Date(n.updated_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                );
            })()}

            {/* ══ Wiki Tab ══ */}
            {tab === 'wiki' && (
                <div className="flex-1 flex overflow-hidden">
                    {/* Sidebar */}
                    <div className="w-64 flex-shrink-0 bg-white border-r border-gray-200 overflow-y-auto p-3">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-xs font-bold text-gray-500 uppercase">Páginas</h3>
                            <button onClick={() => { setWikiForm({ title: '', content: '', parent_id: '' }); setShowWikiModal(true); }}
                                className="p-1 hover:bg-violet-50 rounded text-violet-500"><Plus size={14} /></button>
                        </div>
                        {wikiPages.filter(p => !p.parent_id).map(p => (
                            <div key={p.id}>
                                <button onClick={() => setActiveWikiPage(p)}
                                    className={`w-full text-left px-3 py-2 rounded-lg text-sm mb-1 transition-colors ${activeWikiPage?.id === p.id ? 'bg-violet-50 text-violet-700 font-bold' : 'text-gray-700 hover:bg-gray-50'}`}>
                                    <BookMarked size={12} className="inline mr-2" />{p.title}
                                </button>
                                {wikiPages.filter(ch => ch.parent_id === p.id).map(ch => (
                                    <button key={ch.id} onClick={() => setActiveWikiPage(ch)}
                                        className={`w-full text-left pl-8 pr-3 py-1.5 rounded-lg text-xs mb-0.5 transition-colors ${activeWikiPage?.id === ch.id ? 'bg-violet-50 text-violet-700 font-bold' : 'text-gray-500 hover:bg-gray-50'}`}>
                                        {ch.title}
                                    </button>
                                ))}
                            </div>
                        ))}
                        {wikiPages.length === 0 && <p className="text-xs text-gray-400 text-center py-8">Sin páginas aún</p>}
                    </div>
                    {/* Content */}
                    <div className="flex-1 overflow-auto p-6">
                        {activeWikiPage ? (
                            <div>
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-2xl font-black text-gray-900">{activeWikiPage.title}</h2>
                                    <div className="flex gap-2">
                                        <button onClick={() => { setWikiForm({ title: activeWikiPage.title, content: activeWikiPage.content || '', parent_id: activeWikiPage.parent_id ? String(activeWikiPage.parent_id) : '' }); setShowWikiModal(true); }}
                                            className="flex items-center gap-1 px-3 py-1.5 border border-gray-200 rounded-lg text-xs hover:bg-gray-50"><Pencil size={12} /> Editar</button>
                                        <button onClick={async () => {
                                            if (confirm('¿Eliminar esta página?')) {
                                                await api.delete(`/projects/${projectId}/wiki/${activeWikiPage.id}`);
                                                setWikiPages(prev => prev.filter(x => x.id !== activeWikiPage.id));
                                                setActiveWikiPage(null);
                                            }
                                        }} className="flex items-center gap-1 px-3 py-1.5 border border-red-200 text-red-500 rounded-lg text-xs hover:bg-red-50"><Trash2 size={12} /> Eliminar</button>
                                    </div>
                                </div>
                                <div className="text-[10px] text-gray-400 mb-4">{activeWikiPage.created_by_name} · {new Date(activeWikiPage.updated_at).toLocaleDateString('es')}</div>
                                <div className="prose prose-sm max-w-none">
                                    <WikiMarkdown content={activeWikiPage.content || 'Sin contenido'} />
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2">
                                <BookMarked size={48} className="text-gray-300" />
                                <p className="text-sm">Seleccioná una página o creá una nueva</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ══ Members / Equipo Tab ══ */}
            {tab === 'members' && (
                <div className="flex-1 overflow-auto p-6">
                    <div className="max-w-3xl mx-auto space-y-6">
                        {/* Add member form */}
                        <div className="bg-white rounded-2xl border border-gray-200 p-5">
                            <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
                                <UserPlus size={16} className="text-violet-500" /> Agregar Miembro al Proyecto
                            </h3>
                            <div className="flex flex-col sm:flex-row gap-3">
                                <select value={addMemberUserId} onChange={e => setAddMemberUserId(e.target.value)}
                                    className="flex-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:ring-2 focus:ring-violet-400 outline-none">
                                    <option value="">Seleccionar usuario...</option>
                                    {users.filter(u => !members.some(m => m.user_id === u.id)).map(u => (
                                        <option key={u.id} value={u.id}>{u.full_name || u.username}</option>
                                    ))}
                                </select>
                                <select value={addMemberRole} onChange={e => setAddMemberRole(e.target.value)}
                                    className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:ring-2 focus:ring-violet-400 outline-none w-full sm:w-40">
                                    <option value="owner">👑 Dueño</option>
                                    <option value="admin">⚡ Admin</option>
                                    <option value="member">✏️ Editor</option>
                                    <option value="viewer">👁️ Viewer</option>
                                </select>
                                <button onClick={async () => {
                                    if (!addMemberUserId) return;
                                    try {
                                        await api.post(`/projects/${projectId}/members`, { user_id: parseInt(addMemberUserId), role: addMemberRole });
                                        const { data } = await api.get(`/projects/${projectId}/members`);
                                        setMembers(data);
                                        setAddMemberUserId('');
                                        setAddMemberRole('member');
                                    } catch (e: any) { alert(e.response?.data?.detail || 'Error'); }
                                }} disabled={!addMemberUserId}
                                    className="px-5 py-2.5 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-xl font-bold text-sm shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all whitespace-nowrap">
                                    <Plus size={16} className="inline mr-1" /> Agregar
                                </button>
                            </div>
                        </div>

                        {/* Role Legend */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {[
                                { role: 'owner', icon: '👑', label: 'Dueño', desc: 'Control total', color: 'bg-amber-50 border-amber-200 text-amber-800' },
                                { role: 'admin', icon: '⚡', label: 'Admin', desc: 'Gestionar todo', color: 'bg-purple-50 border-purple-200 text-purple-800' },
                                { role: 'member', icon: '✏️', label: 'Editor', desc: 'Crear y editar', color: 'bg-blue-50 border-blue-200 text-blue-800' },
                                { role: 'viewer', icon: '👁️', label: 'Viewer', desc: 'Solo lectura', color: 'bg-gray-50 border-gray-200 text-gray-600' },
                            ].map(r => (
                                <div key={r.role} className={`p-3 rounded-xl border ${r.color} text-center`}>
                                    <span className="text-lg">{r.icon}</span>
                                    <p className="text-xs font-bold mt-1">{r.label}</p>
                                    <p className="text-[10px] opacity-70">{r.desc}</p>
                                </div>
                            ))}
                        </div>

                        {/* Members list */}
                        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                                <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                                    <Users size={16} className="text-violet-500" /> Miembros del Proyecto ({members.length})
                                </h3>
                            </div>
                            {members.length === 0 ? (
                                <div className="p-12 text-center">
                                    <Users size={48} className="mx-auto text-gray-300 mb-3" />
                                    <p className="text-gray-500 text-sm">Sin miembros asignados</p>
                                    <p className="text-xs text-gray-400 mt-1">Agregá usuarios para que puedan ver y trabajar en este proyecto</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-gray-50">
                                    {members.map(m => {
                                        const roleInfo: Record<string, { icon: string; label: string; color: string }> = {
                                            owner: { icon: '👑', label: 'Dueño', color: 'bg-amber-100 text-amber-800' },
                                            admin: { icon: '⚡', label: 'Admin', color: 'bg-purple-100 text-purple-800' },
                                            member: { icon: '✏️', label: 'Editor', color: 'bg-blue-100 text-blue-800' },
                                            viewer: { icon: '👁️', label: 'Viewer', color: 'bg-gray-100 text-gray-600' },
                                        };
                                        const ri = roleInfo[m.role] || roleInfo.member;
                                        return (
                                            <div key={m.id} className="flex items-center px-5 py-3 hover:bg-gray-50/50 transition-colors group">
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center text-white font-bold text-sm mr-4 shrink-0">
                                                    {m.full_name.charAt(0).toUpperCase()}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-bold text-gray-800 text-sm truncate">{m.full_name}</p>
                                                    <p className="text-xs text-gray-400 truncate">{m.email}</p>
                                                </div>
                                                <div className="flex items-center gap-3 shrink-0">
                                                    <select value={m.role} onChange={async (e) => {
                                                        try {
                                                            await api.post(`/projects/${projectId}/members`, { user_id: m.user_id, role: e.target.value });
                                                            const { data } = await api.get(`/projects/${projectId}/members`);
                                                            setMembers(data);
                                                        } catch (err) { console.error(err); }
                                                    }} className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border-0 cursor-pointer outline-none ${ri.color}`}>
                                                        <option value="owner">👑 Dueño</option>
                                                        <option value="admin">⚡ Admin</option>
                                                        <option value="member">✏️ Editor</option>
                                                        <option value="viewer">👁️ Viewer</option>
                                                    </select>
                                                    <button onClick={async () => {
                                                        if (!confirm(`¿Quitar a ${m.full_name} del proyecto?`)) return;
                                                        await api.delete(`/projects/${projectId}/members/${m.id}`);
                                                        setMembers(prev => prev.filter(x => x.id !== m.id));
                                                    }} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all">
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ══ Task Modal ══ */}
            {showTaskModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl mx-4 max-h-[90vh] flex flex-col">
                        <div className="px-6 py-4 bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-between flex-shrink-0 rounded-t-2xl">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center"><CheckSquare size={20} className="text-white" /></div>
                                <div>
                                    <h3 className="font-black text-lg text-white">{editTask ? `${editTask.key} — Editar` : 'Nueva Tarea'}</h3>
                                    <p className="text-blue-100 text-xs">Complete los datos de la tarea</p>
                                </div>
                            </div>
                            <button onClick={() => setShowTaskModal(false)} className="p-1.5 hover:bg-white/20 rounded-lg"><X size={18} className="text-white" /></button>
                        </div>
                        <div className="flex flex-1 overflow-hidden">
                            {/* ═══ LEFT COLUMN: Description ═══ */}
                            <div className="w-1/2 border-r border-gray-100 flex flex-col overflow-y-auto">
                                <div className="p-5 space-y-4 flex-1 flex flex-col">
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Título</label>
                                        <input value={taskForm.title} onChange={e => setTaskForm({ ...taskForm, title: e.target.value })} placeholder="Título de la tarea..."
                                            className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-violet-400" />
                                    </div>
                                    <div className="flex-1 flex flex-col min-h-0">
                                        <div className="flex items-center justify-between mb-1">
                                            <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1"><FileText size={12} /> Descripción</label>
                                            <div className="flex items-center gap-1">
                                                    <button onClick={() => descImageRef.current?.click()}
                                                        className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors"
                                                        title="Insertar imagen en la descripción">
                                                        <Image size={11} /> Imagen
                                                    </button>
                                                <button onClick={() => setDescPreview(!descPreview)}
                                                    className={`px-2 py-1 text-[10px] font-bold rounded-lg transition-colors ${descPreview ? 'bg-violet-100 text-violet-600' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                                                    {descPreview ? 'Editar' : 'Vista previa'}
                                                </button>
                                            </div>
                                        </div>
                                        {/* Hidden file input for description images */}
                                        <input type="file" ref={descImageRef} className="hidden" accept="image/*" onChange={async (e) => {
                                            const file = e.target.files?.[0];
                                            if (!file) return;
                                            // Capture cursor position before async operations
                                            const cursorPos = descRef.current?.selectionStart;
                                            if (editTask) {
                                                // Modo edicion: subir inmediatamente
                                                const fd = new FormData();
                                                fd.append('file', file);
                                                fd.append('display_name', file.name.replace(/\.[^/.]+$/, ''));
                                                try {
                                                    const { data } = await api.post(`/projects/${projectId}/tasks/${editTask.id}/attachments`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
                                                    setAttachments(prev => [data, ...prev]);
                                                    const safeUrl = encodeURI(data.file_url);
                                                    const imgMarkdown = `\n![${data.display_name || data.filename}](${safeUrl})\n`;
                                                    setTaskForm(prev => {
                                                        const pos = cursorPos ?? prev.description.length;
                                                        return { ...prev, description: prev.description.slice(0, pos) + imgMarkdown + prev.description.slice(pos) };
                                                    });
                                                } catch (err) { console.error(err); }
                                            } else {
                                                // Modo creacion: guardar como pendiente con blob URL
                                                const blobUrl = URL.createObjectURL(file);
                                                const displayName = file.name.replace(/\.[^/.]+$/, '');
                                                setPendingDescImages(prev => [...prev, { file, blobUrl, displayName }]);
                                                const imgMarkdown = `\n![${displayName}](${blobUrl})\n`;
                                                setTaskForm(prev => {
                                                    const pos = cursorPos ?? prev.description.length;
                                                    return { ...prev, description: prev.description.slice(0, pos) + imgMarkdown + prev.description.slice(pos) };
                                                });
                                            }
                                            if (descImageRef.current) descImageRef.current.value = '';
                                        }} />
                                        {descPreview ? (
                                            <div className="flex-1 min-h-[320px] border border-gray-200 rounded-lg p-4 bg-gray-50 overflow-auto prose prose-sm max-w-none
                                                prose-img:rounded-lg prose-img:border prose-img:border-gray-200 prose-img:shadow-sm prose-img:max-h-60 prose-img:object-contain">
                                                {taskForm.description ? (
                                                    <ReactMarkdown
                                                        remarkPlugins={[remarkGfm]}
                                                        components={{
                                                            img: ({ src, alt, ...props }) => (
                                                                <img src={src} alt={alt || ''} className="rounded-lg border border-gray-200 shadow-sm max-h-60 object-contain cursor-pointer hover:opacity-90"
                                                                    onClick={() => window.open(src, '_blank')} {...props} />
                                                            ),
                                                        }}
                                                    >{taskForm.description}</ReactMarkdown>
                                                ) : (
                                                    <p className="text-gray-400 italic text-sm">Sin descripción</p>
                                                )}
                                            </div>
                                        ) : (
                                            <textarea ref={descRef} value={taskForm.description} onChange={e => setTaskForm({ ...taskForm, description: e.target.value })}
                                                placeholder={"Descripción de la tarea...\n\nSoporta Markdown. Usá el botón 📷 Imagen o pegá con Ctrl+V para insertar capturas."}
                                                className="flex-1 min-h-[320px] w-full px-4 py-3 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-violet-400 resize-none font-mono leading-relaxed"
                                                onPaste={async (e) => {
                                                    const items = e.clipboardData?.items;
                                                    if (!items) return;
                                                    for (let i = 0; i < items.length; i++) {
                                                        if (items[i].type.startsWith('image/')) {
                                                            e.preventDefault();
                                                            const file = items[i].getAsFile();
                                                            if (!file) return;
                                                            const cursorStart = e.currentTarget.selectionStart ?? 0;
                                                            if (editTask) {
                                                                // Modo edicion: subir inmediatamente
                                                                const fd = new FormData();
                                                                fd.append('file', file);
                                                                fd.append('display_name', `Imagen pegada ${new Date().toLocaleTimeString()}`);
                                                                try {
                                                                    const { data } = await api.post(`/projects/${projectId}/tasks/${editTask.id}/attachments`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
                                                                    setAttachments(prev => [data, ...prev]);
                                                                    const safeUrl = encodeURI(data.file_url);
                                                                    const imgMarkdown = `\n![${data.display_name || data.filename}](${safeUrl})\n`;
                                                                    setTaskForm(prev => ({
                                                                        ...prev,
                                                                        description: prev.description.slice(0, cursorStart) + imgMarkdown + prev.description.slice(cursorStart)
                                                                    }));
                                                                } catch (err) { console.error(err); }
                                                            } else {
                                                                // Modo creacion: guardar como pendiente con blob URL
                                                                const blobUrl = URL.createObjectURL(file);
                                                                const displayName = `Imagen pegada ${new Date().toLocaleTimeString()}`;
                                                                setPendingDescImages(prev => [...prev, { file, blobUrl, displayName }]);
                                                                const imgMarkdown = `\n![${displayName}](${blobUrl})\n`;
                                                                setTaskForm(prev => ({
                                                                    ...prev,
                                                                    description: prev.description.slice(0, cursorStart) + imgMarkdown + prev.description.slice(cursorStart)
                                                                }));
                                                            }
                                                            break;
                                                        }
                                                    }
                                                }}
                                            />
                                        )}
                                        {!descPreview && (
                                            <p className="text-[10px] text-gray-400 mt-1 flex items-center gap-1">
                                                <Image size={10} /> Pegá imágenes (Ctrl+V) o usá el botón "Imagen" para insertarlas en la descripción
                                            </p>
                                        )}
                                    </div>
                                    {/* Pending description images (creation mode) */}
                                    {!editTask && pendingDescImages.length > 0 && (
                                        <div>
                                            <label className="text-xs font-bold text-gray-500 uppercase mb-2 block flex items-center gap-1">
                                                <Paperclip size={12} /> Imágenes adjuntas ({pendingDescImages.length})
                                            </label>
                                            <div className="space-y-1.5">
                                                {pendingDescImages.map((pdi, idx) => (
                                                    <div key={pdi.blobUrl} className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden group hover:border-violet-300 transition-colors">
                                                        <img src={pdi.blobUrl} alt={pdi.displayName}
                                                            className="w-full max-h-20 object-cover bg-white" />
                                                        <div className="flex items-center gap-2 px-2 py-1.5">
                                                            <Image size={12} className="text-emerald-500 flex-shrink-0" />
                                                            <input type="text" value={pdi.displayName}
                                                                onChange={e => {
                                                                    const newName = e.target.value;
                                                                    setPendingDescImages(prev => {
                                                                        const updated = [...prev];
                                                                        const oldName = updated[idx].displayName;
                                                                        updated[idx] = { ...updated[idx], displayName: newName };
                                                                        // Update markdown reference
                                                                        setTaskForm(f => ({
                                                                            ...f,
                                                                            description: f.description.replace(
                                                                                `![${oldName}](${pdi.blobUrl})`,
                                                                                `![${newName}](${pdi.blobUrl})`
                                                                            )
                                                                        }));
                                                                        return updated;
                                                                    });
                                                                }}
                                                                className="flex-1 text-xs px-2 py-1 border border-gray-200 rounded outline-none focus:ring-1 focus:ring-violet-400"
                                                                placeholder="Nombre de la imagen..." />
                                                            <button onClick={() => {
                                                                // Remove from pending and from description
                                                                setTaskForm(f => ({
                                                                    ...f,
                                                                    description: f.description.replace(`\n![${pdi.displayName}](${pdi.blobUrl})\n`, '\n')
                                                                }));
                                                                URL.revokeObjectURL(pdi.blobUrl);
                                                                setPendingDescImages(prev => prev.filter((_, i) => i !== idx));
                                                            }} className="p-0.5 hover:bg-red-50 rounded text-red-400 opacity-0 group-hover:opacity-100 flex-shrink-0"
                                                                title="Eliminar imagen"><Trash2 size={11} /></button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* ═══ COMMENTS SECTION ═══ */}
                                    {editTask && (
                                        <div className="border-t border-gray-200 pt-4 mt-2">
                                            <label className="text-xs font-bold text-gray-500 uppercase mb-3 flex items-center gap-1">
                                                <MessageSquare size={12} /> Comentarios ({comments.length})
                                            </label>

                                            {/* Thread */}
                                            {comments.length > 0 && (
                                                <div className="space-y-3 mb-4 max-h-[300px] overflow-y-auto pr-1">
                                                    {comments.map(c => (
                                                        <div key={c.id} className="group bg-gray-50 rounded-lg border border-gray-100 p-3 hover:border-violet-200 transition-colors">
                                                            <div className="flex items-start gap-2">
                                                                {/* Avatar */}
                                                                <div className="w-7 h-7 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">
                                                                    {c.author_avatar ? (
                                                                        <img src={c.author_avatar} className="w-7 h-7 rounded-full object-cover" alt="" />
                                                                    ) : (
                                                                        (c.author_name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
                                                                    )}
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex items-center gap-2 mb-1">
                                                                        <span className="text-xs font-bold text-gray-800">{c.author_name}</span>
                                                                        <span className="text-[10px] text-gray-400">
                                                                            {new Date(c.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                                        </span>
                                                                        {c.updated_at !== c.created_at && <span className="text-[9px] text-gray-400 italic">(editado)</span>}
                                                                        {/* Edit/Delete for own comments */}
                                                                        {user && c.author_id === user.id && (
                                                                            <div className="ml-auto flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                                <button onClick={() => { setEditingCommentId(c.id); setEditCommentContent(c.content); }}
                                                                                    className="p-0.5 hover:bg-violet-100 rounded text-gray-400 hover:text-violet-600"
                                                                                    title="Editar"><Pencil size={10} /></button>
                                                                                <button onClick={async () => {
                                                                                    if (!confirm('¿Eliminar este comentario?')) return;
                                                                                    await api.delete(`/projects/${projectId}/tasks/${editTask.id}/comments/${c.id}`);
                                                                                    setComments(prev => prev.filter(x => x.id !== c.id));
                                                                                }}
                                                                                    className="p-0.5 hover:bg-red-50 rounded text-gray-400 hover:text-red-500"
                                                                                    title="Eliminar"><Trash2 size={10} /></button>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                    {/* Content or edit mode */}
                                                                    {editingCommentId === c.id ? (
                                                                        <div className="space-y-1.5">
                                                                            <textarea value={editCommentContent} onChange={e => setEditCommentContent(e.target.value)}
                                                                                className="w-full px-2 py-1.5 border border-gray-200 rounded text-xs outline-none focus:ring-1 focus:ring-violet-400 resize-none"
                                                                                rows={2} />
                                                                            <div className="flex gap-1">
                                                                                <button onClick={async () => {
                                                                                    if (!editCommentContent.trim()) return;
                                                                                    const { data } = await api.put(`/projects/${projectId}/tasks/${editTask.id}/comments/${c.id}`, { content: editCommentContent.trim() });
                                                                                    setComments(prev => prev.map(x => x.id === c.id ? data : x));
                                                                                    setEditingCommentId(null); setEditCommentContent('');
                                                                                }} className="px-2 py-0.5 text-[10px] font-bold bg-violet-600 text-white rounded hover:bg-violet-700">Guardar</button>
                                                                                <button onClick={() => { setEditingCommentId(null); setEditCommentContent(''); }}
                                                                                    className="px-2 py-0.5 text-[10px] font-bold text-gray-500 hover:text-gray-700">Cancelar</button>
                                                                            </div>
                                                                        </div>
                                                                    ) : (
                                                                        <div className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap break-words">
                                                                            <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
                                                                                p: ({ children }: any) => <p className="text-xs text-gray-700 leading-relaxed my-0.5">{children}</p>,
                                                                                a: ({ children, href }: any) => <a href={href} className="text-violet-600 underline" target="_blank" rel="noopener">{children}</a>,
                                                                                code: ({ children }: any) => <code className="bg-gray-100 text-pink-600 px-1 py-0.5 rounded text-[10px] font-mono">{children}</code>,
                                                                                img: ({ src, alt }: any) => <img src={src} alt={alt || ''} className="max-w-full max-h-40 rounded mt-1 border" />,
                                                                            }}>{c.content}</ReactMarkdown>
                                                                        </div>
                                                                    )}
                                                                    {/* Attachment */}
                                                                    {c.attachment_url && (
                                                                        <div className="mt-1.5">
                                                                            {isImageFile(c.attachment_name || '') ? (
                                                                                <a href={c.attachment_url} target="_blank" rel="noopener">
                                                                                    <img src={c.attachment_url} alt={c.attachment_name || ''} className="max-w-[200px] max-h-[120px] rounded border border-gray-200 hover:border-violet-300 transition-colors" />
                                                                                </a>
                                                                            ) : (
                                                                                <a href={c.attachment_url} target="_blank" rel="noopener"
                                                                                    className="inline-flex items-center gap-1 text-[10px] text-violet-600 hover:underline bg-violet-50 px-2 py-1 rounded">
                                                                                    <Paperclip size={10} /> {c.attachment_name}
                                                                                    {c.attachment_size && <span className="text-gray-400">({(c.attachment_size / 1024).toFixed(0)} KB)</span>}
                                                                                </a>
                                                                            )}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {/* New comment input */}
                                            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden focus-within:ring-1 focus-within:ring-violet-400 focus-within:border-violet-400">
                                                <textarea
                                                    value={newComment}
                                                    onChange={e => setNewComment(e.target.value)}
                                                    placeholder="Escribí un comentario..."
                                                    className="w-full px-3 py-2 text-xs outline-none resize-none"
                                                    rows={2}
                                                    onKeyDown={e => {
                                                        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && newComment.trim()) {
                                                            e.preventDefault();
                                                            // Submit comment
                                                            (async () => {
                                                                const fd = new FormData();
                                                                fd.append('content', newComment.trim());
                                                                if (commentFile) fd.append('file', commentFile);
                                                                const { data } = await api.post(`/projects/${projectId}/tasks/${editTask.id}/comments`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
                                                                setComments(prev => [...prev, data]);
                                                                setNewComment(''); setCommentFile(null);
                                                            })();
                                                        }
                                                    }}
                                                />
                                                <div className="flex items-center justify-between px-2 py-1.5 border-t border-gray-100 bg-gray-50/50">
                                                    <div className="flex items-center gap-2">
                                                        <input type="file" ref={commentFileRef} className="hidden"
                                                            onChange={e => { if (e.target.files?.[0]) setCommentFile(e.target.files[0]); e.target.value = ''; }} />
                                                        <button onClick={() => commentFileRef.current?.click()}
                                                            className="flex items-center gap-1 text-[10px] text-gray-500 hover:text-violet-600 px-1.5 py-0.5 rounded hover:bg-violet-50 transition-colors">
                                                            <Paperclip size={11} /> Adjuntar
                                                        </button>
                                                        {commentFile && (
                                                            <span className="text-[10px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded flex items-center gap-1">
                                                                {commentFile.name.length > 20 ? commentFile.name.slice(0, 17) + '...' : commentFile.name}
                                                                <button onClick={() => setCommentFile(null)} className="hover:text-red-500"><X size={9} /></button>
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[9px] text-gray-400">Ctrl+Enter</span>
                                                        <button
                                                            onClick={async () => {
                                                                if (!newComment.trim()) return;
                                                                const fd = new FormData();
                                                                fd.append('content', newComment.trim());
                                                                if (commentFile) fd.append('file', commentFile);
                                                                const { data } = await api.post(`/projects/${projectId}/tasks/${editTask.id}/comments`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
                                                                setComments(prev => [...prev, data]);
                                                                setNewComment(''); setCommentFile(null);
                                                            }}
                                                            disabled={!newComment.trim()}
                                                            className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold bg-violet-600 text-white rounded-md hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                                        >
                                                            <Send size={10} /> Comentar
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                            {/* ═══ RIGHT COLUMN: Fields + Checklist + Attachments ═══ */}
                            <div className="w-1/2 overflow-y-auto">
                                <div className="p-5 space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Tipo</label>
                                    <select value={taskForm.type} onChange={e => setTaskForm({ ...taskForm, type: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-violet-400">
                                        {TYPES.map(t => <option key={t.v} value={t.v}>{t.label}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Prioridad</label>
                                    <select value={taskForm.priority} onChange={e => setTaskForm({ ...taskForm, priority: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-violet-400">
                                        {PRIORITIES.map(p => <option key={p.v} value={p.v}>{p.label}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Asignado</label>
                                    <select value={taskForm.assigned_to} onChange={e => setTaskForm({ ...taskForm, assigned_to: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-violet-400">
                                        <option value="">Sin asignar</option>
                                        {users.map(u => <option key={u.id} value={u.id}>{u.full_name || u.username}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Story Points</label>
                                    <input value={taskForm.story_points} onChange={e => setTaskForm({ ...taskForm, story_points: e.target.value })} type="number" placeholder="0"
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-violet-400" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Hs. Estimadas</label>
                                    <input value={taskForm.estimated_hours} onChange={e => setTaskForm({ ...taskForm, estimated_hours: e.target.value })} type="number" step="0.5" placeholder="0"
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-violet-400" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Hs. Dedicadas</label>
                                    <input value={taskForm.actual_hours} onChange={e => setTaskForm({ ...taskForm, actual_hours: e.target.value })} type="number" step="0.5" placeholder="0"
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-violet-400" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Fecha inicio</label>
                                    <input value={taskForm.start_date} onChange={e => setTaskForm({ ...taskForm, start_date: e.target.value })} type="date"
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-violet-400" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Fecha fin</label>
                                    <input value={taskForm.due_date} onChange={e => setTaskForm({ ...taskForm, due_date: e.target.value })} type="date"
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-violet-400" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                {project?.methodology === 'scrum' && (
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Sprint</label>
                                        <select value={taskForm.sprint_id} onChange={e => setTaskForm({ ...taskForm, sprint_id: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-violet-400">
                                            <option value="">Backlog</option>
                                            {sprints.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                        </select>
                                    </div>
                                )}
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Tarea padre</label>
                                    <select value={taskForm.parent_id} onChange={e => setTaskForm({ ...taskForm, parent_id: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-violet-400">
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
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-violet-400" />
                            </div>
                            {editTask && (
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Estado</label>
                                    <select value={editTask.status} onChange={async (e) => {
                                        await api.patch(`/projects/${projectId}/tasks/${editTask.id}/move`, { status: e.target.value, position: 0 });
                                        setShowTaskModal(false); loadTasks();
                                    }} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-violet-400">
                                        {COLUMNS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                                    </select>
                                </div>
                            )}
                            {/* Subtasks */}
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
                            {/* Checklist */}
                            {editTask && (
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase mb-2 block flex items-center gap-1">
                                        <CheckSquare size={12} /> Checklist {checklist.length > 0 && `(${checklist.filter(x => x.is_checked).length}/${checklist.length})`}
                                    </label>
                                    {checklist.length > 0 && (
                                        <div className="space-y-1 mb-2">
                                            {checklist.map(ci => (
                                                <div key={ci.id} className="flex items-center gap-2 px-2 py-1.5 bg-gray-50 rounded-lg group">
                                                    <button onClick={async () => {
                                                        const { data } = await api.put(`/projects/${projectId}/tasks/${editTask.id}/checklist/${ci.id}`, { is_checked: !ci.is_checked });
                                                        setChecklist(prev => prev.map(x => x.id === ci.id ? data : x));
                                                    }} className="flex-shrink-0">
                                                        {ci.is_checked
                                                            ? <SquareCheckBig size={16} className="text-green-500" />
                                                            : <Square size={16} className="text-gray-300" />}
                                                    </button>
                                                    <span className={`flex-1 text-sm ${ci.is_checked ? 'line-through text-gray-400' : 'text-gray-700'}`}>{ci.text}</span>
                                                    <button onClick={async () => {
                                                        await api.delete(`/projects/${projectId}/tasks/${editTask.id}/checklist/${ci.id}`);
                                                        setChecklist(prev => prev.filter(x => x.id !== ci.id));
                                                    }} className="p-0.5 hover:bg-red-50 rounded text-red-400 opacity-0 group-hover:opacity-100"><Trash2 size={11} /></button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    <div className="flex gap-1">
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
                                    <label className="text-xs font-bold text-gray-500 uppercase mb-2 block flex items-center gap-1"><Paperclip size={12} /> Adjuntos ({attachments.length})</label>
                                    {attachments.length > 0 && (
                                        <div className="space-y-1.5 mb-2">
                                            {attachments.map(att => {
                                                const isImg = isImageFile(att.filename);
                                                return (
                                                    <div key={att.id} className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden group hover:border-violet-300 transition-colors">
                                                        {isImg && (
                                                            <a href={att.file_url} target="_blank" rel="noopener noreferrer" className="block">
                                                                <img src={att.file_url} alt={att.display_name || att.filename}
                                                                    className="w-full max-h-24 object-cover bg-white cursor-pointer hover:opacity-90 transition-opacity" />
                                                            </a>
                                                        )}
                                                        <div className="flex items-center gap-2 px-2 py-1.5">
                                                            {isImg ? <Image size={12} className="text-emerald-500 flex-shrink-0" /> : <FileText size={12} className="text-violet-400 flex-shrink-0" />}
                                                            <div className="flex-1 min-w-0">
                                                                {editingAttName === att.id ? (
                                                                    <div className="flex items-center gap-1">
                                                                        <input type="text" value={editAttNameValue}
                                                                            onChange={e => setEditAttNameValue(e.target.value)}
                                                                            onKeyDown={async (e) => {
                                                                                if (e.key === 'Enter') {
                                                                                    const { data } = await api.patch(`/projects/${projectId}/tasks/${editTask.id}/attachments/${att.id}`, { display_name: editAttNameValue.trim() || null });
                                                                                    setAttachments(prev => prev.map(a => a.id === att.id ? data : a));
                                                                                    setEditingAttName(null);
                                                                                }
                                                                                if (e.key === 'Escape') setEditingAttName(null);
                                                                            }}
                                                                            className="flex-1 text-xs px-2 py-1 border border-violet-300 rounded outline-none focus:ring-1 focus:ring-violet-400"
                                                                            placeholder="Nombre..." autoFocus />
                                                                        <button onClick={async () => {
                                                                            const { data } = await api.patch(`/projects/${projectId}/tasks/${editTask.id}/attachments/${att.id}`, { display_name: editAttNameValue.trim() || null });
                                                                            setAttachments(prev => prev.map(a => a.id === att.id ? data : a));
                                                                            setEditingAttName(null);
                                                                        }} className="p-0.5 text-green-600 hover:bg-green-50 rounded"><Check size={12} /></button>
                                                                        <button onClick={() => setEditingAttName(null)} className="p-0.5 text-gray-400 hover:bg-gray-100 rounded"><X size={12} /></button>
                                                                    </div>
                                                                ) : (
                                                                    <div className="flex items-center gap-1">
                                                                        <a href={att.file_url} target="_blank" rel="noopener noreferrer"
                                                                            className="text-xs text-blue-600 hover:underline truncate font-medium">
                                                                            {att.display_name || att.filename}
                                                                        </a>
                                                                        <button onClick={() => { setEditingAttName(att.id); setEditAttNameValue(att.display_name || ''); }}
                                                                            className="p-0.5 hover:bg-violet-50 rounded text-gray-400 hover:text-violet-600 opacity-0 group-hover:opacity-100 flex-shrink-0"
                                                                            title="Editar nombre"><Pencil size={10} /></button>
                                                                    </div>
                                                                )}
                                                                {att.display_name && editingAttName !== att.id && (
                                                                    <span className="text-[9px] text-gray-400 truncate block">{att.filename}</span>
                                                                )}
                                                            </div>
                                                            {att.file_size && <span className="text-[9px] text-gray-400 flex-shrink-0">{(att.file_size / 1024).toFixed(0)} KB</span>}
                                                            <button onClick={async () => {
                                                                await api.delete(`/projects/${projectId}/tasks/${editTask.id}/attachments/${att.id}`);
                                                                setAttachments(prev => prev.filter(x => x.id !== att.id));
                                                            }} className="p-0.5 hover:bg-red-50 rounded text-red-400 opacity-0 group-hover:opacity-100 flex-shrink-0"><Trash2 size={11} /></button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                    {pendingFile && (
                                        <div className="mb-2 p-2.5 bg-violet-50 border border-violet-200 rounded-lg">
                                            <div className="flex items-center gap-2 mb-1.5">
                                                {isImageFile(pendingFile.name) ? <Image size={12} className="text-emerald-500" /> : <FileText size={12} className="text-violet-400" />}
                                                <span className="text-xs text-gray-600 truncate flex-1">{pendingFile.name}</span>
                                                <button onClick={() => { setPendingFile(null); setUploadDisplayName(''); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                                                    className="p-0.5 hover:bg-red-50 rounded text-red-400"><X size={12} /></button>
                                            </div>
                                            {isImageFile(pendingFile.name) && (
                                                <img src={URL.createObjectURL(pendingFile)} alt="Preview"
                                                    className="w-full max-h-20 object-cover rounded mb-1.5 border border-gray-200" />
                                            )}
                                            <input type="text" value={uploadDisplayName} onChange={e => setUploadDisplayName(e.target.value)}
                                                placeholder="Nombre descriptivo..."
                                                className="w-full px-2.5 py-1.5 border border-gray-200 rounded text-xs outline-none focus:ring-1 focus:ring-violet-400 mb-1.5" />
                                            <button onClick={async () => {
                                                if (!pendingFile || !editTask) return;
                                                const fd = new FormData();
                                                fd.append('file', pendingFile);
                                                if (uploadDisplayName.trim()) fd.append('display_name', uploadDisplayName.trim());
                                                const { data } = await api.post(`/projects/${projectId}/tasks/${editTask.id}/attachments`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
                                                setAttachments(prev => [data, ...prev]);
                                                setPendingFile(null); setUploadDisplayName('');
                                                if (fileInputRef.current) fileInputRef.current.value = '';
                                            }} className="w-full px-2.5 py-1.5 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded text-xs font-bold hover:shadow-md transition-shadow flex items-center justify-center gap-1">
                                                <Upload size={11} /> Subir
                                            </button>
                                        </div>
                                    )}
                                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip,.rar" onChange={(e) => {
                                        const file = e.target.files?.[0]; if (!file) return;
                                        setPendingFile(file); setUploadDisplayName('');
                                    }} />
                                    {!pendingFile && (
                                        <button onClick={() => fileInputRef.current?.click()}
                                            className="flex items-center gap-1.5 px-3 py-1.5 border border-dashed border-gray-300 rounded-lg text-xs text-gray-500 hover:border-violet-400 hover:text-violet-600 hover:bg-violet-50 transition-colors w-full justify-center">
                                            <Upload size={12} /> Subir archivo
                                        </button>
                                    )}
                                </div>
                            )}
                            {/* ── Pending Attachments (creation mode) ── */}
                            {!editTask && pendingDescImages.length > 0 && (
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase mb-2 block flex items-center gap-1">
                                        <Paperclip size={12} /> Archivos adjuntos ({pendingDescImages.length})
                                    </label>
                                    <div className="space-y-1.5">
                                        {pendingDescImages.map((pdi, idx) => (
                                            <div key={pdi.blobUrl} className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden group hover:border-violet-300 transition-colors">
                                                <img src={pdi.blobUrl} alt={pdi.displayName}
                                                    className="w-full max-h-24 object-cover bg-white" />
                                                <div className="flex items-center gap-2 px-2 py-1.5">
                                                    <Image size={12} className="text-emerald-500 flex-shrink-0" />
                                                    <span className="text-xs text-gray-700 truncate flex-1 font-medium">{pdi.displayName}</span>
                                                    <span className="text-[9px] text-gray-400 flex-shrink-0">{(pdi.file.size / 1024).toFixed(0)} KB</span>
                                                    <button onClick={() => {
                                                        setTaskForm(f => ({
                                                            ...f,
                                                            description: f.description.replace(`\n![${pdi.displayName}](${pdi.blobUrl})\n`, '\n')
                                                        }));
                                                        URL.revokeObjectURL(pdi.blobUrl);
                                                        setPendingDescImages(prev => prev.filter((_, i) => i !== idx));
                                                    }} className="p-0.5 hover:bg-red-50 rounded text-red-400 opacity-0 group-hover:opacity-100 flex-shrink-0">
                                                        <Trash2 size={11} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <p className="text-[9px] text-gray-400 mt-1 italic">Se subirán automáticamente al crear la tarea</p>
                                </div>
                            )}
                                </div>
                            </div>
                        </div>
                        <div className="px-6 py-3 border-t border-gray-100 flex justify-end gap-3 flex-shrink-0 bg-white rounded-b-2xl">
                            <button onClick={() => setShowTaskModal(false)} className="px-4 py-2 text-sm text-gray-500 hover:bg-gray-100 rounded-lg">Cancelar</button>
                            <button onClick={saveTask} disabled={!taskForm.title.trim()}
                                className="px-5 py-2 text-sm font-bold bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg shadow-sm hover:shadow-md disabled:opacity-40">
                                {editTask ? 'Guardar' : 'Crear'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

{/* Sprint Modal */ }
{
    showSprintModal && (
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
    )
}

{/* Version Modal */ }
{
    showVersionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
                <div className="px-6 py-4 bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center"><Milestone size={20} className="text-white" /></div>
                        <div>
                            <h3 className="font-black text-lg text-white">{editingVersion ? 'Editar Versión' : 'Nueva Versión'}</h3>
                            <p className="text-blue-100 text-xs">{editingVersion ? 'Modifique los datos de la versión' : 'Complete los datos de la versión'}</p>
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
                    <div className="border border-purple-100 rounded-xl p-4 bg-purple-50/30 space-y-3">
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
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Repositorio (URL)</label>
                            <input value={versionForm.repository_url} onChange={e => setVersionForm({ ...versionForm, repository_url: e.target.value })} placeholder="https://github.com/org/repo"
                                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-400 bg-white" />
                        </div>
                    </div>
                </div>
                <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
                    <button onClick={() => { setShowVersionModal(false); setEditingVersion(null); }} className="px-4 py-2 text-sm text-gray-500 hover:bg-gray-100 rounded-lg">Cancelar</button>
                    <button onClick={saveVersion} disabled={!versionForm.name.trim()}
                        className="px-5 py-2 text-sm font-bold bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg shadow-sm hover:shadow-md disabled:opacity-40">{editingVersion ? 'Guardar Cambios' : 'Crear Versión'}</button>
                </div>
            </div>
        </div>
    )
}
{/* Note Modal */ }
{
    showNoteModal && (() => {
        const NCOLORS2 = [
            { name: 'yellow', bg: '#fef9c3', border: '#facc15', text: '#854d0e', shadow: 'rgba(250,204,21,0.25)' },
            { name: 'green', bg: '#dcfce7', border: '#4ade80', text: '#166534', shadow: 'rgba(74,222,128,0.25)' },
            { name: 'blue', bg: '#dbeafe', border: '#60a5fa', text: '#1e40af', shadow: 'rgba(96,165,250,0.25)' },
            { name: 'pink', bg: '#fce7f3', border: '#f472b6', text: '#9d174d', shadow: 'rgba(244,114,182,0.25)' },
            { name: 'purple', bg: '#f3e8ff', border: '#c084fc', text: '#6b21a8', shadow: 'rgba(192,132,252,0.25)' },
            { name: 'orange', bg: '#ffedd5', border: '#fb923c', text: '#9a3412', shadow: 'rgba(251,146,60,0.25)' },
        ];
        const selC = NCOLORS2.find(c => c.name === noteForm.color) || NCOLORS2[0];
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden max-h-[90vh] flex flex-col">
                    <div className="px-6 py-4 flex items-center justify-between" style={{ background: `linear-gradient(135deg, ${selC.border}, ${selC.text})` }}>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center"><StickyNote size={20} className="text-white" /></div>
                            <div><h3 className="font-black text-lg text-white">{editingNote ? 'Editar Nota' : 'Nueva Nota'}</h3><p className="text-white/70 text-xs">Nota del proyecto</p></div>
                        </div>
                        <button onClick={() => setShowNoteModal(false)} className="p-1.5 hover:bg-white/20 rounded-lg"><X size={18} className="text-white" /></button>
                    </div>
                    <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
                        <div className="border border-gray-100 rounded-xl p-4 bg-gray-50/50 space-y-3">
                            <div><label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Título</label>
                                <input value={noteForm.title} onChange={e => setNoteForm({ ...noteForm, title: e.target.value })} placeholder="Título de la nota..."
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-amber-400 bg-white" /></div>
                            <div><label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Contenido</label>
                                <textarea value={noteForm.content} onChange={e => setNoteForm({ ...noteForm, content: e.target.value })} rows={5} placeholder="Escribí tu nota..."
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-amber-400 resize-none bg-white" /></div>
                        </div>
                        <div className="border border-gray-100 rounded-xl p-4 bg-gray-50/50">
                            <label className="text-xs font-bold text-gray-500 uppercase mb-3 block">Color</label>
                            <div className="flex gap-2 flex-wrap">
                                {NCOLORS2.map(c => (
                                    <button key={c.name} onClick={() => setNoteForm({ ...noteForm, color: c.name })}
                                        className={`w-12 h-12 rounded-xl border-2 transition-all hover:scale-110 flex flex-col items-center justify-center gap-0.5 ${noteForm.color === c.name ? 'ring-2 ring-offset-2 ring-amber-400 scale-110 shadow-lg' : ''}`}
                                        style={{ backgroundColor: c.bg, borderColor: c.border, boxShadow: noteForm.color === c.name ? `0 4px 12px ${c.shadow}` : 'none' }}>
                                        <Pin size={10} style={{ color: c.text }} className="rotate-45" />
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="border border-gray-100 rounded-xl p-4 bg-gray-50/50">
                            <label className="text-xs font-bold text-gray-500 uppercase mb-3 block">Visibilidad</label>
                            <div className="flex gap-2 flex-wrap">
                                {[
                                    { value: 'private', label: 'Privado', desc: 'Solo vos', icon: Lock, cls: 'bg-red-50 border-red-200 text-red-600' },
                                    { value: 'team', label: 'Equipo', desc: 'Todos ven', icon: Globe, cls: 'bg-green-50 border-green-200 text-green-600' },
                                    { value: 'shared', label: 'Compartido', desc: 'Elegir', icon: UserPlus, cls: 'bg-blue-50 border-blue-200 text-blue-600' },
                                ].map(opt => (
                                    <button key={opt.value} onClick={() => setNoteForm({ ...noteForm, visibility: opt.value })}
                                        className={`flex-1 min-w-[90px] flex flex-col items-center gap-1 px-3 py-3 rounded-xl border-2 transition-all ${noteForm.visibility === opt.value ? opt.cls + ' ring-2 ring-offset-1 ring-amber-400 scale-[1.02]' : 'border-gray-200 bg-white text-gray-400 hover:border-gray-300'}`}>
                                        <opt.icon size={18} /><span className="text-xs font-bold">{opt.label}</span><span className="text-[9px] opacity-70">{opt.desc}</span>
                                    </button>
                                ))}
                            </div>
                            {noteForm.visibility === 'shared' && (
                                <div className="mt-3 border border-blue-100 rounded-lg p-3 bg-blue-50/50">
                                    <label className="text-xs font-bold text-blue-600 mb-2 block">Compartir con:</label>
                                    <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                                        {users.map(u => {
                                            const sel = noteForm.shared_with.includes(u.id);
                                            return <button key={u.id} onClick={() => setNoteForm(f => ({ ...f, shared_with: sel ? f.shared_with.filter(id => id !== u.id) : [...f.shared_with, u.id] }))}
                                                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${sel ? 'bg-blue-100 text-blue-700 border border-blue-300 shadow-sm' : 'bg-white text-gray-500 border border-gray-200 hover:border-blue-300'}`}>
                                                <UserCircle size={12} />{(u as any).full_name || (u as any).username}{sel && <X size={10} className="ml-0.5" />}
                                            </button>;
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="px-4 sm:px-6 py-4 border-t border-gray-100 flex justify-end gap-3 flex-shrink-0">
                        <button onClick={() => setShowNoteModal(false)} className="px-4 py-2 text-sm text-gray-500 hover:bg-gray-100 rounded-lg">Cancelar</button>
                        <button disabled={!noteForm.title.trim()} onClick={async () => {
                            const payload = { ...noteForm, shared_with: noteForm.visibility === 'shared' ? noteForm.shared_with : null };
                            if (editingNote) { await api.put(`/projects/${projectId}/notes/${editingNote.id}`, payload); }
                            else { await api.post(`/projects/${projectId}/notes`, payload); }
                            setShowNoteModal(false);
                            const { data } = await api.get(`/projects/${projectId}/notes`);
                            setNotes(data);
                        }} className="px-5 py-2 text-sm font-bold text-white rounded-lg shadow-sm hover:shadow-md disabled:opacity-40"
                            style={{ background: `linear-gradient(135deg, ${selC.border}, ${selC.text})` }}>
                            {editingNote ? 'Guardar' : 'Crear'}
                        </button>
                    </div>
                </div>
            </div>
        );
    })()
}

{/* Wiki Modal */ }
{
    showWikiModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
                <div className="px-6 py-4 bg-gradient-to-r from-teal-500 to-cyan-600 flex items-center justify-between sticky top-0 z-10">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center"><BookMarked size={20} className="text-white" /></div>
                        <h3 className="font-black text-lg text-white">{activeWikiPage && wikiForm.title === activeWikiPage.title ? 'Editar Página' : 'Nueva Página Wiki'}</h3>
                    </div>
                    <button onClick={() => setShowWikiModal(false)} className="p-1.5 hover:bg-white/20 rounded-lg"><X size={18} className="text-white" /></button>
                </div>
                <div className="p-6 space-y-4">
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Título</label>
                        <input value={wikiForm.title} onChange={e => setWikiForm({ ...wikiForm, title: e.target.value })} placeholder="Título de la página..."
                            className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-teal-400" />
                    </div>
                    {wikiPages.length > 0 && (
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Página padre</label>
                            <select value={wikiForm.parent_id} onChange={e => setWikiForm({ ...wikiForm, parent_id: e.target.value })}
                                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-teal-400">
                                <option value="">Raíz (sin padre)</option>
                                {wikiPages.filter(p => !p.parent_id).map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                            </select>
                        </div>
                    )}
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Contenido</label>
                        <textarea value={wikiForm.content} onChange={e => setWikiForm({ ...wikiForm, content: e.target.value })} rows={12} placeholder="Escribí el contenido de la página..."
                            className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-teal-400 resize-none font-mono" />
                    </div>
                </div>
                <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 sticky bottom-0 bg-white">
                    <button onClick={() => setShowWikiModal(false)} className="px-4 py-2 text-sm text-gray-500 hover:bg-gray-100 rounded-lg">Cancelar</button>
                    <button disabled={!wikiForm.title.trim()} onClick={async () => {
                        if (activeWikiPage && wikiForm.title === activeWikiPage.title) {
                            await api.put(`/projects/${projectId}/wiki/${activeWikiPage.id}`, {
                                title: wikiForm.title, content: wikiForm.content || null,
                                parent_id: wikiForm.parent_id ? parseInt(wikiForm.parent_id) : null,
                            });
                        } else {
                            await api.post(`/projects/${projectId}/wiki`, {
                                title: wikiForm.title, content: wikiForm.content || null,
                                parent_id: wikiForm.parent_id ? parseInt(wikiForm.parent_id) : null,
                            });
                        }
                        setShowWikiModal(false);
                        const { data } = await api.get(`/projects/${projectId}/wiki`);
                        setWikiPages(data);
                        if (activeWikiPage) {
                            const updated = data.find((p: WikiPage) => p.id === activeWikiPage.id);
                            if (updated) setActiveWikiPage(updated);
                        }
                    }} className="px-5 py-2 text-sm font-bold bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-lg shadow-sm hover:shadow-md disabled:opacity-40">
                        {activeWikiPage && wikiForm.title === activeWikiPage.title ? 'Guardar' : 'Crear Página'}
                    </button>
                </div>
            </div>
        </div>
    )
}

{/* ══ Toast Notification ══ */ }
{
    toastMsg && (
        <div className="fixed bottom-6 right-6 z-[9999] animate-bounce-in">
            <div className="relative px-6 py-4 bg-gradient-to-r from-red-600 to-red-500 text-white rounded-2xl shadow-2xl shadow-red-500/30 transform rotate-[-2deg] hover:rotate-0 transition-transform"
                style={{ minWidth: '280px' }}>
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-md cursor-pointer"
                    onClick={() => setToastMsg(null)}>
                    <X size={12} className="text-red-500" />
                </div>
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                        <CheckSquare size={20} className="text-white" />
                    </div>
                    <div>
                        <p className="font-black text-lg tracking-wide uppercase">{toastMsg}</p>
                        <p className="text-red-100 text-[10px] font-medium">Creada en el Backlog</p>
                    </div>
                </div>
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20 rounded-b-2xl overflow-hidden">
                    <div className="h-full bg-white/50 rounded-b-2xl animate-shrink" />
                </div>
            </div>
        </div>
    )
}
<style>{`
                @keyframes bounceIn {
                    0% { transform: translateX(120%) rotate(8deg); opacity: 0; }
                    60% { transform: translateX(-8%) rotate(-3deg); opacity: 1; }
                    80% { transform: translateX(4%) rotate(1deg); }
                    100% { transform: translateX(0) rotate(0deg); }
                }
                .animate-bounce-in { animation: bounceIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1); }
                @keyframes shrink { from { width: 100%; } to { width: 0%; } }
                .animate-shrink { animation: shrink 4s linear forwards; }
            `}</style>
        </div >
    );
}
