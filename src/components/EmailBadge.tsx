import { useState, useEffect } from 'react';
import { Mail } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function EmailBadge() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [unread, setUnread] = useState(0);

    useEffect(() => {
        if (!user?.id) return;
        fetchUnread();
        const interval = setInterval(fetchUnread, 60000);

        const handleUpdate = () => fetchUnread();
        window.addEventListener('email-read-update', handleUpdate);

        return () => {
            clearInterval(interval);
            window.removeEventListener('email-read-update', handleUpdate);
        };
    }, [user?.id]);

    const fetchUnread = async () => {
        try {
            const accs = await api.get(`/email/accounts?user_id=${user!.id}`);
            if (!accs.data?.length) { setUnread(0); return; }
            const defaultAcc = accs.data.find((a: any) => a.is_default) || accs.data[0];
            if (!defaultAcc.imap_host) { setUnread(0); return; }
            try {
                // DB-first: instant read from PostgreSQL
                const res = await api.get(`/email/inbox?account_id=${defaultAcc.id}`);
                setUnread(res.data.unread_count || 0);
            } catch {
                setUnread(0);
            }
        } catch {
            setUnread(0);
        }
    };

    return (
        <button
            onClick={() => navigate('/email')}
            className="relative p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="Correo electrónico"
        >
            <Mail size={18} />
            {unread > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full px-1 animate-pulse">
                    {unread > 9 ? '9+' : unread}
                </span>
            )}
        </button>
    );
}
