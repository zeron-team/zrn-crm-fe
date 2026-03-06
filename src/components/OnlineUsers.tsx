import { useState, useEffect, useRef } from 'react';
import { Users, ChevronDown } from 'lucide-react';
import api from '../api/client';

interface OnlineUser {
    id: number;
    email: string;
    full_name: string;
    last_seen: string;
}

const HEARTBEAT_INTERVAL = 30_000; // 30 seconds
const POLL_INTERVAL = 15_000;      // 15 seconds

export default function OnlineUsers() {
    const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Send heartbeat
    useEffect(() => {
        const sendHeartbeat = () => {
            api.post('/users/heartbeat').catch(() => { });
        };
        sendHeartbeat(); // immediate
        const interval = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);
        return () => clearInterval(interval);
    }, []);

    // Poll online users
    useEffect(() => {
        const fetchOnline = async () => {
            try {
                const { data } = await api.get('/users/online');
                setOnlineUsers(data.users || []);
            } catch {
                // silently fail
            }
        };
        fetchOnline(); // immediate
        const interval = setInterval(fetchOnline, POLL_INTERVAL);
        return () => clearInterval(interval);
    }, []);

    // Close dropdown on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const count = onlineUsers.length;

    const getInitials = (name: string) => {
        return name
            .split(' ')
            .slice(0, 2)
            .map(n => n.charAt(0).toUpperCase())
            .join('');
    };

    const getAvatarColor = (id: number) => {
        const colors = [
            'from-blue-500 to-indigo-600',
            'from-emerald-500 to-teal-600',
            'from-purple-500 to-violet-600',
            'from-amber-500 to-orange-600',
            'from-rose-500 to-pink-600',
            'from-cyan-500 to-sky-600',
        ];
        return colors[id % colors.length];
    };

    return (
        <div ref={dropdownRef} className="relative">
            {/* Trigger Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-all duration-200 group"
                title={`${count} usuario${count !== 1 ? 's' : ''} en línea`}
            >
                <div className="relative">
                    <Users size={16} className="text-emerald-600" />
                    {/* Pulsing dot */}
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-500 rounded-full">
                        <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-75" />
                    </span>
                </div>
                <span className="text-sm font-bold text-emerald-700">{count}</span>
                <ChevronDown
                    size={14}
                    className={`text-emerald-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                />
            </button>

            {/* Dropdown */}
            {isOpen && (
                <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    {/* Header */}
                    <div className="px-4 py-3 bg-gradient-to-r from-emerald-500 to-teal-600">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Users size={16} className="text-white" />
                                <h3 className="text-sm font-bold text-white">En Línea</h3>
                            </div>
                            <span className="bg-white/20 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                                {count} conectado{count !== 1 ? 's' : ''}
                            </span>
                        </div>
                    </div>

                    {/* User list */}
                    <div className="max-h-64 overflow-y-auto">
                        {onlineUsers.length === 0 ? (
                            <div className="p-6 text-center text-gray-400">
                                <Users size={24} className="mx-auto mb-2 text-gray-300" />
                                <p className="text-xs">No hay usuarios conectados</p>
                            </div>
                        ) : (
                            <div className="p-2 space-y-1">
                                {onlineUsers.map(u => (
                                    <div
                                        key={u.id}
                                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 transition-colors"
                                    >
                                        {/* Avatar */}
                                        <div className="relative flex-shrink-0">
                                            <div className={`w-8 h-8 bg-gradient-to-br ${getAvatarColor(u.id)} rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm`}>
                                                {getInitials(u.full_name)}
                                            </div>
                                            {/* Online indicator */}
                                            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full" />
                                        </div>

                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-gray-800 truncate">
                                                {u.full_name}
                                            </p>
                                            <p className="text-[10px] text-gray-400 truncate">
                                                {u.email}
                                            </p>
                                        </div>

                                        {/* Status dot */}
                                        <div className="flex items-center gap-1">
                                            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                                            <span className="text-[10px] text-emerald-600 font-medium">Activo</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="px-4 py-2 bg-gray-50 border-t border-gray-100">
                        <p className="text-[10px] text-gray-400 text-center">
                            Actualización automática cada 15s
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
