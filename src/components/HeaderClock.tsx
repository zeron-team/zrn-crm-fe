import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Play, Coffee, UtensilsCrossed, LogOut } from 'lucide-react';
import api from '../api/client';

interface Status {
    state: string;
    worked_seconds: number;
    employee_id: number | null;
    employee_name?: string;
    check_in_time?: string | null;
    live_since?: string | null;
    entries_count?: number;
}

const STATE_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any; ticking: boolean }> = {
    working: { label: 'Trabajando', color: 'text-green-400', bg: 'bg-green-500/20', icon: Play, ticking: true },
    break: { label: 'Descanso', color: 'text-amber-400', bg: 'bg-amber-500/20', icon: Coffee, ticking: false },
    meal: { label: 'Almuerzo', color: 'text-orange-400', bg: 'bg-orange-500/20', icon: UtensilsCrossed, ticking: false },
    out: { label: 'Salida', color: 'text-red-400', bg: 'bg-red-500/20', icon: LogOut, ticking: false },
    not_started: { label: 'Sin fichar', color: 'text-gray-400', bg: 'bg-gray-500/20', icon: Clock, ticking: false },
};

function formatTime(seconds: number): string {
    const s = Math.max(0, Math.floor(seconds));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
}

function normalizeState(raw: string): string {
    if (raw === 'no_employee') return 'not_started';
    return raw;
}

export default function HeaderClock({ userEmail }: { userEmail: string | undefined }) {
    const navigate = useNavigate();
    const [status, setStatus] = useState<Status | null>(null);
    const [displaySeconds, setDisplaySeconds] = useState(0);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const fetchStatus = async () => {
        if (!userEmail) return;
        try {
            const { data } = await api.get(`/time-entries/my-status/${encodeURIComponent(userEmail)}`);
            setStatus(data);
            setDisplaySeconds(Math.max(0, data.worked_seconds || 0));
        } catch { /* silent */ }
    };

    // Fetch on mount + every 30s for responsiveness
    useEffect(() => {
        fetchStatus();
        const poll = setInterval(fetchStatus, 30000);
        return () => clearInterval(poll);
    }, [userEmail]);

    // Derive normalized state
    const state = status ? normalizeState(status.state) : 'not_started';
    const cfg = STATE_CONFIG[state] || STATE_CONFIG.not_started;

    // Tick timer every second when ticking
    useEffect(() => {
        if (intervalRef.current) clearInterval(intervalRef.current);

        if (cfg.ticking) {
            intervalRef.current = setInterval(() => {
                setDisplaySeconds(prev => prev + 1);
            }, 1000);
        }

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [state, status?.worked_seconds]);

    if (!status) return null;

    const Icon = cfg.icon;
    const isOut = state === 'out';

    return (
        <div className="flex items-center gap-2">
            {/* Clock shortcut icon — always visible */}
            <button
                onClick={() => navigate('/time-tracking')}
                title="Ir a Fichadas"
                className="p-2 rounded-lg hover:bg-gray-700/50 text-gray-400 hover:text-white transition-all"
            >
                <Clock size={18} />
            </button>

            {/* Timer widget — hidden when state is "out" */}
            {!isOut && (
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl ${cfg.bg} border border-white/10 transition-all duration-300`}>
                    <div className="relative">
                        <Icon size={14} className={cfg.color} />
                        {cfg.ticking && (
                            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                        )}
                    </div>
                    <div className="flex flex-col items-start">
                        <span className={`text-[9px] font-bold uppercase tracking-wider ${cfg.color} leading-none`}>
                            {cfg.label}
                        </span>
                        <span className="text-sm font-mono font-black text-white leading-none mt-0.5">
                            {formatTime(displaySeconds)}
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
}
