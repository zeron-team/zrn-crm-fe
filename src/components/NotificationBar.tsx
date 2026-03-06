import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Bell, DollarSign, Mail, GitBranch, MessageCircle, StickyNote,
    AlertCircle, Clock, X, ChevronRight
} from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

interface Counts {
    citas: number;
    vencimientos: number;
    mails: number;
    sprints: number;
    whatsapp: number;
    notas: number;
}

interface CalendarEvent {
    id: number; title: string; description: string; start_date: string; status: string;
}

const ALARM_TYPES = [
    { key: 'citas' as const, label: 'Citas', icon: Bell, color: '#7c3aed', bg: '#ede9fe', route: '/calendar' },
    { key: 'vencimientos' as const, label: 'Vencimientos', icon: DollarSign, color: '#dc2626', bg: '#fef2f2', route: '/quotes' },
    { key: 'mails' as const, label: 'Correos', icon: Mail, color: '#2563eb', bg: '#eff6ff', route: '/email' },
    { key: 'sprints' as const, label: 'Sprints', icon: GitBranch, color: '#059669', bg: '#ecfdf5', route: '/projects' },
    { key: 'whatsapp' as const, label: 'WhatsApp', icon: MessageCircle, color: '#16a34a', bg: '#f0fdf4', route: '/whatsapp' },
    { key: 'notas' as const, label: 'Notas', icon: StickyNote, color: '#d97706', bg: '#fffbeb', route: '/notes' },
];

export default function NotificationBar() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [counts, setCounts] = useState<Counts>({ citas: 0, vencimientos: 0, mails: 0, sprints: 0, whatsapp: 0, notas: 0 });
    const [openPanel, setOpenPanel] = useState<string | null>(null);
    const [panelItems, setPanelItems] = useState<any[]>([]);
    const panelRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetchCounts();
        const interval = setInterval(fetchCounts, 60000);
        // listen for email updates
        const handleEmailUpdate = () => fetchCounts();
        window.addEventListener('email-read-update', handleEmailUpdate);
        return () => { clearInterval(interval); window.removeEventListener('email-read-update', handleEmailUpdate); };
    }, [user?.id]);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (panelRef.current && !panelRef.current.contains(event.target as Node)) setOpenPanel(null);
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const fetchCounts = async () => {
        try {
            // Backend counts
            const { data } = await api.get(`/notifications/counts${user?.id ? `?user_id=${user.id}` : ''}`);
            // Client-side email count
            let mailCount = 0;
            try {
                const accs = await api.get(`/email/accounts?user_id=${user!.id}`);
                if (accs.data?.length) {
                    const defaultAcc = accs.data.find((a: any) => a.is_default) || accs.data[0];
                    if (defaultAcc.imap_host) {
                        const res = await api.get(`/email/inbox?account_id=${defaultAcc.id}`);
                        mailCount = res.data.unread_count || 0;
                    }
                }
            } catch { }
            // WhatsApp unread count
            let waCount = 0;
            try {
                const waRes = await api.get('/whatsapp/api/chats');
                if (waRes.data?.length) {
                    waCount = waRes.data.reduce((sum: number, chat: any) => sum + (chat.unread_count || 0), 0);
                }
            } catch { }
            setCounts({ ...data, mails: mailCount, whatsapp: waCount });
        } catch (e) {
            console.error('Failed to fetch notification counts', e);
        }
    };

    const openDetails = async (key: string) => {
        if (openPanel === key) { setOpenPanel(null); return; }
        setOpenPanel(key);
        setPanelItems([]);

        try {
            if (key === 'citas') {
                const { data } = await api.get('/calendar/');
                const today = new Date(); today.setHours(0, 0, 0, 0);
                const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
                const filtered = data.filter((ev: CalendarEvent) => {
                    if (ev.status === 'completed' || ev.status === 'cancelled') return false;
                    const d = new Date(ev.start_date); d.setHours(0, 0, 0, 0);
                    return d <= tomorrow;
                }).map((ev: CalendarEvent) => {
                    const d = new Date(ev.start_date); d.setHours(0, 0, 0, 0);
                    const diff = Math.ceil((d.getTime() - today.getTime()) / 86400000);
                    return { ...ev, urgency: diff <= 0 ? 'overdue' : 'soon', label: diff < 0 ? `Vencida (${Math.abs(diff)}d)` : diff === 0 ? 'Hoy' : 'Mañana' };
                });
                setPanelItems(filtered);
            } else if (key === 'notas') {
                if (!user?.id) return;
                const { data } = await api.get(`/notes/?assigned_to=${user.id}`);
                setPanelItems(data.slice(0, 10));
            } else if (key === 'sprints') {
                // Get all projects and their active sprints ending soon
                const { data: projects } = await api.get('/projects?status=active');
                const items: any[] = [];
                for (const p of projects.slice(0, 5)) {
                    const { data: sprints } = await api.get(`/projects/${p.id}/sprints`);
                    const today = new Date();
                    sprints.filter((s: any) => s.status === 'active' && s.end_date).forEach((s: any) => {
                        const end = new Date(s.end_date);
                        const diff = Math.ceil((end.getTime() - today.getTime()) / 86400000);
                        if (diff <= 3) items.push({ ...s, project_name: p.name, diff });
                    });
                }
                setPanelItems(items);
            }
        } catch (e) { console.error(e); }
    };

    const markCitaComplete = async (id: number) => {
        try {
            await api.patch(`/calendar/${id}/complete`);
            setPanelItems(prev => prev.filter(p => p.id !== id));
            setCounts(prev => ({ ...prev, citas: Math.max(0, prev.citas - 1) }));
        } catch { }
    };

    const totalCount = Object.values(counts).reduce((s, c) => s + c, 0);

    return (
        <div className="flex items-center gap-0.5 relative" ref={panelRef}>
            {ALARM_TYPES.map(alarm => {
                const count = counts[alarm.key];
                const isOpen = openPanel === alarm.key;
                return (
                    <button
                        key={alarm.key}
                        onClick={() => count > 0 ? openDetails(alarm.key) : navigate(alarm.route)}
                        className={`relative p-2 rounded-lg transition-all ${isOpen ? 'bg-gray-100' : 'hover:bg-gray-50'}`}
                        title={`${alarm.label}${count > 0 ? ` (${count})` : ''}`}
                    >
                        <alarm.icon size={17} style={{ color: count > 0 ? alarm.color : '#9ca3af' }}
                            className={count > 0 ? '' : ''} />
                        {count > 0 && (
                            <span className="absolute -top-0.5 -right-0.5 min-w-[15px] h-[15px] flex items-center justify-center text-white text-[8px] font-bold rounded-full px-0.5"
                                style={{ backgroundColor: alarm.color }}>
                                {count > 9 ? '9+' : count}
                            </span>
                        )}
                    </button>
                );
            })}

            {/* Dropdown Panel */}
            {openPanel && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50">
                    {(() => {
                        const alarm = ALARM_TYPES.find(a => a.key === openPanel)!;
                        return (
                            <>
                                <div className="p-3 border-b border-gray-100 flex items-center justify-between" style={{ backgroundColor: alarm.bg }}>
                                    <div className="flex items-center gap-2">
                                        <alarm.icon size={16} style={{ color: alarm.color }} />
                                        <span className="font-bold text-sm text-gray-900">{alarm.label}</span>
                                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full" style={{ backgroundColor: alarm.color, color: 'white' }}>
                                            {counts[alarm.key]}
                                        </span>
                                    </div>
                                    <button onClick={() => setOpenPanel(null)} className="p-1 hover:bg-white/60 rounded">
                                        <X size={14} className="text-gray-400" />
                                    </button>
                                </div>

                                <div className="max-h-80 overflow-y-auto">
                                    {/* Citas panel */}
                                    {openPanel === 'citas' && (
                                        panelItems.length === 0 ? (
                                            <div className="p-6 text-center text-gray-400 text-sm">Sin citas pendientes</div>
                                        ) : (
                                            <ul className="divide-y divide-gray-50">
                                                {panelItems.map((item: any) => (
                                                    <li key={item.id} className="p-3 hover:bg-gray-50 flex items-start gap-3 group">
                                                        <div className={`mt-0.5 p-1 rounded-full flex-shrink-0 ${item.urgency === 'overdue' ? 'bg-red-50 text-red-500' : 'bg-orange-50 text-orange-500'}`}>
                                                            {item.urgency === 'overdue' ? <AlertCircle size={14} /> : <Clock size={14} />}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-semibold text-gray-900 truncate">{item.title}</p>
                                                            <p className={`text-[10px] font-medium ${item.urgency === 'overdue' ? 'text-red-600' : 'text-orange-600'}`}>
                                                                {item.label} • {new Date(item.start_date).toLocaleDateString()}
                                                            </p>
                                                        </div>
                                                        <button onClick={() => markCitaComplete(item.id)}
                                                            className="p-1 text-gray-300 hover:text-green-600 hover:bg-green-50 rounded opacity-0 group-hover:opacity-100">
                                                            <X size={14} />
                                                        </button>
                                                    </li>
                                                ))}
                                            </ul>
                                        )
                                    )}

                                    {/* Notas panel */}
                                    {openPanel === 'notas' && (
                                        panelItems.length === 0 ? (
                                            <div className="p-6 text-center text-gray-400 text-sm">Sin notas asignadas</div>
                                        ) : (
                                            <ul className="divide-y divide-gray-50">
                                                {panelItems.map((item: any) => (
                                                    <li key={item.id} className="p-3 hover:bg-gray-50 cursor-pointer" onClick={() => { setOpenPanel(null); navigate('/notes'); }}>
                                                        <p className="text-sm font-semibold text-gray-900 truncate">{item.title || 'Sin título'}</p>
                                                        <p className="text-[10px] text-gray-400 truncate mt-0.5">{item.content?.slice(0, 80) || ''}</p>
                                                    </li>
                                                ))}
                                            </ul>
                                        )
                                    )}

                                    {/* Sprints panel */}
                                    {openPanel === 'sprints' && (
                                        panelItems.length === 0 ? (
                                            <div className="p-6 text-center text-gray-400 text-sm">Sin sprints por vencer</div>
                                        ) : (
                                            <ul className="divide-y divide-gray-50">
                                                {panelItems.map((item: any, i: number) => (
                                                    <li key={i} className="p-3 hover:bg-gray-50 cursor-pointer" onClick={() => { setOpenPanel(null); navigate('/projects'); }}>
                                                        <p className="text-sm font-semibold text-gray-900">{item.name}</p>
                                                        <p className="text-[10px] text-gray-400">{item.project_name} • Fin: {item.end_date} ({item.diff <= 0 ? 'Vencido' : `${item.diff}d restantes`})</p>
                                                    </li>
                                                ))}
                                            </ul>
                                        )
                                    )}

                                    {/* Generic: vencimientos, mails, whatsapp – go to route */}
                                    {(openPanel === 'vencimientos' || openPanel === 'mails' || openPanel === 'whatsapp') && (
                                        <div className="p-4">
                                            <button onClick={() => { setOpenPanel(null); navigate(alarm.route); }}
                                                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-xl text-sm font-medium text-gray-700 transition-colors">
                                                Ir a {alarm.label} <ChevronRight size={14} />
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* Footer */}
                                <div className="p-2 border-t border-gray-100">
                                    <button onClick={() => { setOpenPanel(null); navigate(alarm.route); }}
                                        className="w-full text-center text-xs font-medium text-violet-600 hover:text-violet-700 py-1">
                                        Ver todo →
                                    </button>
                                </div>
                            </>
                        );
                    })()}
                </div>
            )}
        </div>
    );
}
