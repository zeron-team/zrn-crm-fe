import { useState, useEffect } from 'react';
import { Bell, Mail, MessageCircle, Send, Webhook, CheckCircle, XCircle, Loader2, TestTube, Info } from 'lucide-react';
import api from '../api/client';

interface EventTypeInfo {
    key: string;
    label: string;
    description: string;
}

interface ChannelStatusItem {
    channel: string;
    configured: boolean;
    detail: string;
}

interface Preference {
    event_type: string;
    channel: string;
    enabled: boolean;
}

const CHANNEL_META: Record<string, { label: string; icon: typeof Mail; color: string; bg: string }> = {
    email: { label: 'Email', icon: Mail, color: '#2563eb', bg: '#eff6ff' },
    telegram: { label: 'Telegram', icon: Send, color: '#0088cc', bg: '#e6f6ff' },
    whatsapp: { label: 'WhatsApp', icon: MessageCircle, color: '#25D366', bg: '#f0fdf4' },
    discord: { label: 'Discord', icon: Webhook, color: '#5865F2', bg: '#eef2ff' },
};

interface NotificationPreferencesProps {
    profile: any;
    onProfileUpdate: () => void;
}

export default function NotificationPreferences({ profile, onProfileUpdate }: NotificationPreferencesProps) {
    const [eventTypes, setEventTypes] = useState<EventTypeInfo[]>([]);
    const [channels, setChannels] = useState<string[]>([]);
    const [channelStatuses, setChannelStatuses] = useState<ChannelStatusItem[]>([]);
    const [preferences, setPreferences] = useState<Record<string, boolean>>({});
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [testing, setTesting] = useState<string | null>(null);
    const [testResult, setTestResult] = useState<{ channel: string; success: boolean; message: string } | null>(null);
    const [telegramId, setTelegramId] = useState(profile?.telegram_chat_id || '');
    const [discordUrl, setDiscordUrl] = useState(profile?.discord_webhook_url || '');
    const [savingChannels, setSavingChannels] = useState(false);

    useEffect(() => {
        fetchMeta();
        fetchPreferences();
        fetchChannelStatus();
    }, []);

    const fetchMeta = async () => {
        try {
            const { data } = await api.get('/notification-preferences/meta');
            setEventTypes(data.event_types);
            setChannels(data.channels);
        } catch (e) { console.error(e); }
    };

    const fetchPreferences = async () => {
        try {
            const { data } = await api.get('/notification-preferences/');
            const map: Record<string, boolean> = {};
            data.forEach((p: any) => {
                map[`${p.event_type}__${p.channel}`] = p.enabled;
            });
            setPreferences(map);
        } catch (e) { console.error(e); }
    };

    const fetchChannelStatus = async () => {
        try {
            const { data } = await api.get('/notification-preferences/channels');
            setChannelStatuses(data.channels);
        } catch (e) { console.error(e); }
    };

    const togglePref = (eventType: string, channel: string) => {
        const key = `${eventType}__${channel}`;
        setPreferences(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const savePreferences = async () => {
        setSaving(true);
        try {
            const prefs: Preference[] = [];
            for (const et of eventTypes) {
                for (const ch of channels) {
                    const key = `${et.key}__${ch}`;
                    prefs.push({
                        event_type: et.key,
                        channel: ch,
                        enabled: preferences[key] || false,
                    });
                }
            }
            await api.put('/notification-preferences/', { preferences: prefs });
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } catch (e) {
            console.error(e);
            alert('Error al guardar preferencias');
        }
        setSaving(false);
    };

    const saveChannelConfig = async () => {
        setSavingChannels(true);
        try {
            await api.put('/profile/', {
                telegram_chat_id: telegramId || null,
                discord_webhook_url: discordUrl || null,
            });
            onProfileUpdate();
            fetchChannelStatus();
        } catch (e) { console.error(e); }
        setSavingChannels(false);
    };

    const testChannel = async (channel: string) => {
        setTesting(channel);
        setTestResult(null);
        try {
            // Auto-save channel config before testing so the backend has the latest values
            if (channel === 'telegram' || channel === 'discord') {
                await api.put('/profile/', {
                    telegram_chat_id: telegramId || null,
                    discord_webhook_url: discordUrl || null,
                });
                onProfileUpdate();
                fetchChannelStatus();
            }
            const { data } = await api.post(`/notification-preferences/test/${channel}`);
            setTestResult({ channel, success: data.success, message: data.message });
        } catch (e: any) {
            setTestResult({ channel, success: false, message: e?.response?.data?.detail || 'Error' });
        }
        setTesting(null);
    };

    const isConfigured = (channel: string) => {
        return channelStatuses.find(s => s.channel === channel)?.configured || false;
    };

    return (
        <div className="space-y-6">
            {/* Channel Configuration */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-4 bg-gradient-to-r from-violet-50 to-indigo-50 border-b border-gray-100">
                    <h2 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                        <Bell size={16} className="text-violet-500" /> Canales de Notificación
                    </h2>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                        Configurá tus canales para recibir notificaciones externas
                    </p>
                </div>
                <div className="p-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Email Channel */}
                        <div className="border border-gray-100 rounded-xl p-4 relative">
                            <div className="flex items-center gap-2 mb-3">
                                <div className="p-1.5 rounded-lg" style={{ backgroundColor: CHANNEL_META.email.bg }}>
                                    <Mail size={16} style={{ color: CHANNEL_META.email.color }} />
                                </div>
                                <span className="font-semibold text-sm text-gray-800">Email</span>
                                {isConfigured('email') ? (
                                    <CheckCircle size={14} className="text-green-500 ml-auto" />
                                ) : (
                                    <XCircle size={14} className="text-gray-300 ml-auto" />
                                )}
                            </div>
                            <p className="text-[11px] text-gray-400 mb-2">
                                {channelStatuses.find(s => s.channel === 'email')?.detail || 'Usa tu cuenta SMTP configurada'}
                            </p>
                            <button
                                onClick={() => testChannel('email')}
                                disabled={testing === 'email' || !isConfigured('email')}
                                className="text-[11px] font-medium text-blue-600 hover:text-blue-700 disabled:text-gray-300 flex items-center gap-1"
                            >
                                {testing === 'email' ? <Loader2 size={12} className="animate-spin" /> : <TestTube size={12} />}
                                Probar
                            </button>
                        </div>

                        {/* Telegram Channel */}
                        <div className="border border-gray-100 rounded-xl p-4">
                            <div className="flex items-center gap-2 mb-3">
                                <div className="p-1.5 rounded-lg" style={{ backgroundColor: CHANNEL_META.telegram.bg }}>
                                    <Send size={16} style={{ color: CHANNEL_META.telegram.color }} />
                                </div>
                                <span className="font-semibold text-sm text-gray-800">Telegram</span>
                                {isConfigured('telegram') ? (
                                    <CheckCircle size={14} className="text-green-500 ml-auto" />
                                ) : (
                                    <XCircle size={14} className="text-gray-300 ml-auto" />
                                )}
                            </div>
                            <input
                                type="text"
                                value={telegramId}
                                onChange={e => setTelegramId(e.target.value)}
                                placeholder="Tu Chat ID de Telegram"
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 mb-2"
                            />
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1 text-[10px] text-gray-400">
                                    <Info size={10} />
                                    <span>Enviá /start a @userinfobot</span>
                                </div>
                                <button
                                    onClick={() => testChannel('telegram')}
                                    disabled={testing === 'telegram' || !telegramId}
                                    className="text-[11px] font-medium text-[#0088cc] hover:text-[#006699] disabled:text-gray-300 flex items-center gap-1"
                                >
                                    {testing === 'telegram' ? <Loader2 size={12} className="animate-spin" /> : <TestTube size={12} />}
                                    Probar
                                </button>
                            </div>
                        </div>

                        {/* WhatsApp Channel */}
                        <div className="border border-gray-100 rounded-xl p-4">
                            <div className="flex items-center gap-2 mb-3">
                                <div className="p-1.5 rounded-lg" style={{ backgroundColor: CHANNEL_META.whatsapp.bg }}>
                                    <MessageCircle size={16} style={{ color: CHANNEL_META.whatsapp.color }} />
                                </div>
                                <span className="font-semibold text-sm text-gray-800">WhatsApp</span>
                                {isConfigured('whatsapp') ? (
                                    <CheckCircle size={14} className="text-green-500 ml-auto" />
                                ) : (
                                    <XCircle size={14} className="text-gray-300 ml-auto" />
                                )}
                            </div>
                            <p className="text-[11px] text-gray-400 mb-2">
                                {channelStatuses.find(s => s.channel === 'whatsapp')?.detail || 'Usa tu número móvil del perfil'}
                            </p>
                            <button
                                onClick={() => testChannel('whatsapp')}
                                disabled={testing === 'whatsapp' || !isConfigured('whatsapp')}
                                className="text-[11px] font-medium text-green-600 hover:text-green-700 disabled:text-gray-300 flex items-center gap-1"
                            >
                                {testing === 'whatsapp' ? <Loader2 size={12} className="animate-spin" /> : <TestTube size={12} />}
                                Probar
                            </button>
                        </div>

                        {/* Discord Channel */}
                        <div className="border border-gray-100 rounded-xl p-4">
                            <div className="flex items-center gap-2 mb-3">
                                <div className="p-1.5 rounded-lg" style={{ backgroundColor: CHANNEL_META.discord.bg }}>
                                    <Webhook size={16} style={{ color: CHANNEL_META.discord.color }} />
                                </div>
                                <span className="font-semibold text-sm text-gray-800">Discord</span>
                                {isConfigured('discord') ? (
                                    <CheckCircle size={14} className="text-green-500 ml-auto" />
                                ) : (
                                    <XCircle size={14} className="text-gray-300 ml-auto" />
                                )}
                            </div>
                            <input
                                type="url"
                                value={discordUrl}
                                onChange={e => setDiscordUrl(e.target.value)}
                                placeholder="URL del Webhook de Discord"
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 mb-2"
                            />
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1 text-[10px] text-gray-400">
                                    <Info size={10} />
                                    <span>Configuración &gt; Integraciones</span>
                                </div>
                                <button
                                    onClick={() => testChannel('discord')}
                                    disabled={testing === 'discord' || !discordUrl}
                                    className="text-[11px] font-medium text-[#5865F2] hover:text-[#4752C4] disabled:text-gray-300 flex items-center gap-1"
                                >
                                    {testing === 'discord' ? <Loader2 size={12} className="animate-spin" /> : <TestTube size={12} />}
                                    Probar
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Save Channel Config Button */}
                    <div className="mt-4 flex items-center justify-between">
                        <button
                            onClick={saveChannelConfig}
                            disabled={savingChannels}
                            className="text-xs font-bold px-4 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-lg hover:shadow-md transition-all disabled:opacity-50 flex items-center gap-1.5"
                        >
                            {savingChannels ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                            Guardar Canales
                        </button>

                        {/* Test Result Toast */}
                        {testResult && (
                            <div className={`flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-lg ${
                                testResult.success
                                    ? 'bg-green-50 text-green-700 border border-green-200'
                                    : 'bg-red-50 text-red-700 border border-red-200'
                            }`}>
                                {testResult.success ? <CheckCircle size={14} /> : <XCircle size={14} />}
                                {testResult.message}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Preference Matrix */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-4 bg-gradient-to-r from-amber-50 to-orange-50 border-b border-gray-100">
                    <h2 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                        <Bell size={16} className="text-amber-500" /> Preferencias por Evento
                    </h2>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                        Elegí qué tipo de notificación recibir por cada canal
                    </p>
                </div>

                {/* Desktop Matrix Table */}
                <div className="hidden sm:block overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-gray-50/50">
                                <th className="text-left px-5 py-3 text-xs font-bold text-gray-600 uppercase tracking-wider">
                                    Tipo de Evento
                                </th>
                                {channels.map(ch => {
                                    const meta = CHANNEL_META[ch];
                                    return (
                                        <th key={ch} className="text-center px-3 py-3">
                                            <div className="flex flex-col items-center gap-1">
                                                {meta && <meta.icon size={14} style={{ color: meta.color }} />}
                                                <span className="text-[10px] font-bold text-gray-500 uppercase">
                                                    {meta?.label || ch}
                                                </span>
                                            </div>
                                        </th>
                                    );
                                })}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {eventTypes.map(et => (
                                <tr key={et.key} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="px-5 py-3">
                                        <p className="font-semibold text-gray-800 text-xs">{et.label}</p>
                                        <p className="text-[10px] text-gray-400 mt-0.5">{et.description}</p>
                                    </td>
                                    {channels.map(ch => {
                                        const key = `${et.key}__${ch}`;
                                        const enabled = preferences[key] || false;
                                        const configured = isConfigured(ch);
                                        return (
                                            <td key={ch} className="text-center px-3 py-3">
                                                <button
                                                    onClick={() => configured && togglePref(et.key, ch)}
                                                    disabled={!configured}
                                                    className={`w-10 h-6 rounded-full relative transition-all ${
                                                        !configured
                                                            ? 'bg-gray-100 cursor-not-allowed'
                                                            : enabled
                                                            ? 'bg-indigo-500 shadow-sm shadow-indigo-200'
                                                            : 'bg-gray-200 hover:bg-gray-300'
                                                    }`}
                                                >
                                                    <div
                                                        className={`w-4 h-4 rounded-full bg-white shadow-sm absolute top-1 transition-all ${
                                                            enabled ? 'left-5' : 'left-1'
                                                        }`}
                                                    />
                                                </button>
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Mobile Cards */}
                <div className="sm:hidden p-4 space-y-3">
                    {eventTypes.map(et => (
                        <div key={et.key} className="bg-gray-50 rounded-xl p-4">
                            <p className="font-semibold text-gray-800 text-xs mb-1">{et.label}</p>
                            <p className="text-[10px] text-gray-400 mb-3">{et.description}</p>
                            <div className="flex items-center gap-3 flex-wrap">
                                {channels.map(ch => {
                                    const meta = CHANNEL_META[ch];
                                    const key = `${et.key}__${ch}`;
                                    const enabled = preferences[key] || false;
                                    const configured = isConfigured(ch);
                                    return (
                                        <button
                                            key={ch}
                                            onClick={() => configured && togglePref(et.key, ch)}
                                            disabled={!configured}
                                            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all border ${
                                                !configured
                                                    ? 'bg-gray-100 text-gray-300 border-gray-100 cursor-not-allowed'
                                                    : enabled
                                                    ? 'border-indigo-200 bg-indigo-50 text-indigo-700'
                                                    : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
                                            }`}
                                        >
                                            {meta && <meta.icon size={12} />}
                                            {meta?.label || ch}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Save Preferences Button */}
                <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-between">
                    <p className="text-[10px] text-gray-400">
                        Los canales deshabilitados (gris) necesitan configuración primero
                    </p>
                    <button
                        onClick={savePreferences}
                        disabled={saving}
                        className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-xs rounded-xl shadow-md hover:shadow-lg hover:from-amber-600 hover:to-orange-600 transition-all disabled:opacity-50"
                    >
                        {saving ? (
                            <Loader2 size={14} className="animate-spin" />
                        ) : saved ? (
                            <CheckCircle size={14} />
                        ) : (
                            <Bell size={14} />
                        )}
                        {saved ? '¡Guardado!' : saving ? 'Guardando...' : 'Guardar Preferencias'}
                    </button>
                </div>
            </div>
        </div>
    );
}
