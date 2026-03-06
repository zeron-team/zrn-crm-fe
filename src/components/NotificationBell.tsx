import { useState, useEffect, useRef } from "react";
import { Bell, Clock, AlertCircle, X } from "lucide-react";
import { Link } from "react-router-dom";
import api from "../api/client";
import { useTranslation } from "react-i18next";

interface CalendarEvent {
    id: number;
    title: string;
    description: string;
    event_date: string;
    is_completed: boolean;
}

interface NotificationItem extends CalendarEvent {
    statusColor: "red" | "orange";
    statusText: string;
}

export default function NotificationBell() {
    const { t } = useTranslation();
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetchNotifications();

        // Polling every 5 minutes could be added here
        const interval = setInterval(fetchNotifications, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const fetchNotifications = async () => {
        try {
            const res = await api.get("/calendar/");
            const events: CalendarEvent[] = res.data;

            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);

            const filtered: NotificationItem[] = [];

            events.forEach(event => {
                if (event.is_completed) return;

                const eventDate = new Date(event.event_date);
                eventDate.setHours(0, 0, 0, 0);

                const timeDiff = eventDate.getTime() - today.getTime();
                const diffDays = Math.ceil(timeDiff / (1000 * 3600 * 24));

                // 1 day before until overdue
                if (diffDays === 1) {
                    filtered.push({
                        ...event,
                        statusColor: "orange",
                        statusText: t('common.expiringTomorrow')
                    });
                } else if (diffDays === 0) {
                    filtered.push({
                        ...event,
                        statusColor: "red",
                        statusText: t('common.expiringToday')
                    });
                } else if (diffDays < 0) {
                    // Overdue
                    filtered.push({
                        ...event,
                        statusColor: "red",
                        statusText: `${t('common.overdue')} (${Math.abs(diffDays)})`
                    });
                }
            });

            // Sort so most urgent (red, oldest) are top
            filtered.sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime());

            setNotifications(filtered);
        } catch (error) {
            console.error("Failed to fetch notifications", error);
        }
    };

    const markAsCompleted = async (e: React.MouseEvent, id: number) => {
        e.preventDefault(); // prevent navigation if clicking inside the link
        try {
            await api.patch(`/calendar/${id}/complete`);
            setNotifications(prev => prev.filter(n => n.id !== id));
        } catch (error) {
            console.error("Failed to complete event", error);
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors focus:outline-none"
                title={t('common.notifications')}
            >
                <Bell size={20} className={notifications.length > 0 ? "text-gray-700" : ""} />
                {notifications.length > 0 && (
                    <span className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500 border-2 border-white"></span>
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50">
                    <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                        <h3 className="font-bold text-gray-900 flex items-center">
                            <Bell size={16} className="mr-2 text-blue-600" />
                            {t('common.notifications')}
                        </h3>
                        <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                            {notifications.length}
                        </span>
                    </div>

                    <div className="max-h-96 overflow-y-auto">
                        {notifications.length === 0 ? (
                            <div className="p-8 text-center text-gray-500 flex flex-col items-center">
                                <AlertCircle size={32} className="text-gray-300 mb-2" />
                                <p className="text-sm">{t('common.allCaughtUp')}</p>
                            </div>
                        ) : (
                            <ul className="divide-y divide-gray-50">
                                {notifications.map((notif) => (
                                    <li key={notif.id} className="relative group hover:bg-gray-50/50 transition-colors">
                                        <Link
                                            to="/calendar"
                                            onClick={() => setIsOpen(false)}
                                            className="block p-4"
                                        >
                                            <div className="flex items-start space-x-3">
                                                <div className={`mt-0.5 p-1.5 rounded-full flex-shrink-0 ${notif.statusColor === 'red' ? 'bg-red-50 text-red-500' : 'bg-orange-50 text-orange-500'
                                                    }`}>
                                                    {notif.statusColor === 'red' ? <AlertCircle size={16} /> : <Clock size={16} />}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-semibold text-gray-900 truncate pr-6">{notif.title}</p>
                                                    <p className={`text-xs font-medium mt-0.5 ${notif.statusColor === 'red' ? 'text-red-600' : 'text-orange-600'
                                                        }`}>
                                                        {notif.statusText} • {new Date(notif.event_date).toLocaleDateString()}
                                                    </p>
                                                    {notif.description && (
                                                        <p className="text-xs text-gray-500 truncate mt-1">{notif.description}</p>
                                                    )}
                                                </div>
                                            </div>
                                        </Link>
                                        <button
                                            onClick={(e) => markAsCompleted(e, notif.id)}
                                            className="absolute top-4 right-4 p-1 text-gray-300 hover:text-green-600 hover:bg-green-50 rounded opacity-0 group-hover:opacity-100 transition-all"
                                            title={t('common.markCompleted')}
                                        >
                                            <X size={16} />
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
