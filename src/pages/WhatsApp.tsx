import { useState, useEffect, useRef } from 'react';
import {
    MessageCircle, Send, Search, RefreshCw,
    QrCode, LogOut, Plus, ArrowLeft, CheckCheck, User
} from 'lucide-react';

interface WAConversation {
    id: number; chat_id: string; name: string; phone: string;
    is_group: boolean; profile_pic_url: string | null;
    last_message: string | null; last_message_at: string | null;
    unread_count: number;
}
interface WAMessage {
    id: number; chat_id: string; wa_message_id: string;
    from_me: boolean; sender_name: string; body: string;
    media_type: string | null; timestamp: string; is_read: boolean;
}

const WA_API = '/api/v1/wa';

export default function WhatsApp() {
    const [status, setStatus] = useState<string>('disconnected');
    const [qrCode, setQrCode] = useState<string | null>(null);
    const [chats, setChats] = useState<WAConversation[]>([]);
    const [selectedChat, setSelectedChat] = useState<WAConversation | null>(null);
    const [messages, setMessages] = useState<WAMessage[]>([]);
    const [msgInput, setMsgInput] = useState('');
    const [search, setSearch] = useState('');
    const [sending, setSending] = useState(false);
    const [loading, setLoading] = useState(false);
    const [showNewChat, setShowNewChat] = useState(false);
    const [newPhone, setNewPhone] = useState('');
    const [newMessage, setNewMessage] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    // wsRef removed — polling is used instead of WebSocket

    // Polling for status/QR and new messages (replaces WebSocket)
    useEffect(() => {
        const checkStatus = async () => {
            try {
                const res = await fetch(`${WA_API}/status`);
                const data = await res.json();
                setStatus(data.status);
                if (data.status === 'ready') { setQrCode(null); loadChats(); }
                if (data.status === 'qr_pending' && data.hasQR) {
                    const qrRes = await fetch(`${WA_API}/qr`);
                    const qrData = await qrRes.json();
                    if (qrData.qr) setQrCode(qrData.qr);
                }
            } catch (e) { }
        };

        checkStatus();
        // Poll faster during QR scan, slower when connected
        const interval = setInterval(checkStatus, status === 'qr_pending' ? 2000 : 5000);
        return () => clearInterval(interval);
    }, [status]);

    // Scroll to bottom on new messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Poll messages for the active chat every 3 seconds
    useEffect(() => {
        if (!selectedChat || status !== 'ready') return;
        const pollMessages = async () => {
            try {
                const res = await fetch(`${WA_API}/chats/${encodeURIComponent(selectedChat.chat_id)}/messages?limit=100`);
                const data = await res.json();
                if (Array.isArray(data) && data.length > 0) {
                    setMessages(prev => {
                        // Only update if there are new messages
                        if (data.length !== prev.length || (data.length > 0 && data[data.length - 1]?.id !== prev[prev.length - 1]?.id)) {
                            return data;
                        }
                        return prev;
                    });
                }
            } catch (e) { /* silent */ }
        };
        const interval = setInterval(pollMessages, 3000);
        return () => clearInterval(interval);
    }, [selectedChat, status]);

    const loadChats = async () => {
        try {
            const res = await fetch(`${WA_API}/chats`);
            const data = await res.json();
            setChats(data);
        } catch (e) { console.error(e); }
    };

    const loadMessages = async (chatId: string) => {
        setLoading(true);
        try {
            const res = await fetch(`${WA_API}/chats/${encodeURIComponent(chatId)}/messages?limit=100`);
            const data = await res.json();
            setMessages(data);
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    const selectChat = (chat: WAConversation) => {
        setSelectedChat(chat);
        loadMessages(chat.chat_id);
    };

    const sendMessage = async () => {
        if (!msgInput.trim() || !selectedChat || sending) return;
        setSending(true);
        try {
            const res = await fetch(`${WA_API}/chats/${encodeURIComponent(selectedChat.chat_id)}/send`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: msgInput.trim() }),
            });
            const data = await res.json();
            if (data.ok) {
                setMessages(prev => [...prev, {
                    id: Date.now(),
                    chat_id: selectedChat.chat_id,
                    wa_message_id: data.message.id,
                    from_me: true,
                    sender_name: 'Yo',
                    body: data.message.body,
                    media_type: null,
                    timestamp: new Date(data.message.timestamp).toISOString(),
                    is_read: true,
                }]);
                setMsgInput('');
                loadChats();
            }
        } catch (e) { console.error(e); }
        setSending(false);
    };

    const sendNewMessage = async () => {
        if (!newPhone.trim() || !newMessage.trim()) return;
        setSending(true);
        try {
            const res = await fetch(`${WA_API}/send-new`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone: newPhone.trim(), message: newMessage.trim() }),
            });
            const data = await res.json();
            if (data.ok) {
                setShowNewChat(false);
                setNewPhone('');
                setNewMessage('');
                loadChats();
            }
        } catch (e) { console.error(e); }
        setSending(false);
    };

    const connectWA = async () => {
        await fetch(`${WA_API}/connect`, { method: 'POST' });
    };

    const logoutWA = async () => {
        if (!confirm('¿Desconectar WhatsApp?')) return;
        await fetch(`${WA_API}/logout`, { method: 'POST' });
        setStatus('disconnected');
        setChats([]);
        setSelectedChat(null);
        setMessages([]);
        setQrCode(null);
    };

    const filteredChats = chats.filter(c =>
        c.name?.toLowerCase().includes(search.toLowerCase()) ||
        c.phone?.includes(search)
    );

    const formatTime = (ts: string | null) => {
        if (!ts) return '';
        const d = new Date(ts);
        const now = new Date();
        const diff = now.getTime() - d.getTime();
        if (diff < 86400000 && d.getDate() === now.getDate()) {
            return d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
        }
        if (diff < 604800000) {
            return d.toLocaleDateString('es-AR', { weekday: 'short' });
        }
        return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' });
    };

    const formatMsgTime = (ts: string) => {
        return new Date(ts).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
    };

    // ═══ NOT CONNECTED ═══
    if (status !== 'ready') {
        return (
            <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 p-8">
                <div className="max-w-md w-full text-center space-y-6">
                    <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-green-600 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-emerald-200">
                        <MessageCircle size={36} className="text-white" />
                    </div>
                    <h2 className="text-2xl font-black text-gray-900">WhatsApp</h2>

                    {status === 'disconnected' && (
                        <>
                            <p className="text-gray-500">Conectá tu WhatsApp para enviar y recibir mensajes desde el CRM</p>
                            <button onClick={connectWA}
                                className="mx-auto flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-xl font-bold shadow-lg shadow-emerald-200 hover:shadow-xl transition-all">
                                <QrCode size={20} /> Vincular WhatsApp
                            </button>
                        </>
                    )}

                    {status === 'qr_pending' && (
                        <>
                            <p className="text-gray-500">Escaneá este código QR con tu teléfono</p>
                            <p className="text-xs text-gray-400">WhatsApp → Dispositivos vinculados → Vincular dispositivo</p>
                            {qrCode ? (
                                <div className="bg-white p-6 rounded-2xl shadow-lg inline-block mx-auto border border-gray-100">
                                    <img src={qrCode} alt="QR Code" className="w-64 h-64" />
                                </div>
                            ) : (
                                <div className="flex items-center justify-center gap-2 text-emerald-600">
                                    <RefreshCw size={18} className="animate-spin" /> Generando código QR...
                                </div>
                            )}
                        </>
                    )}

                    {status === 'authenticated' && (
                        <div className="flex items-center justify-center gap-2 text-emerald-600">
                            <RefreshCw size={18} className="animate-spin" /> Conectando a WhatsApp...
                        </div>
                    )}

                    {status === 'auth_failure' && (
                        <>
                            <p className="text-red-500 font-medium">Error de autenticación. Intentá de nuevo.</p>
                            <button onClick={connectWA}
                                className="mx-auto flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-xl font-bold">
                                <RefreshCw size={18} /> Reintentar
                            </button>
                        </>
                    )}
                </div>
            </div>
        );
    }

    // ═══ CONNECTED — CHAT UI ═══
    return (
        <div className="flex-1 flex h-full bg-gray-50 overflow-hidden" style={{ minWidth: 0 }}>
            {/* Chat list sidebar */}
            <div className={`w-full md:w-96 md:min-w-[24rem] md:max-w-[24rem] bg-white border-r border-gray-200 flex flex-col flex-shrink-0 ${selectedChat ? 'hidden md:flex' : 'flex'}`}>
                {/* Header */}
                <div className="p-3 bg-gradient-to-r from-emerald-600 to-green-600 text-white flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <MessageCircle size={20} />
                        <span className="font-bold text-sm">WhatsApp</span>
                        <span className="w-2 h-2 bg-green-300 rounded-full animate-pulse"></span>
                    </div>
                    <div className="flex items-center gap-1">
                        <button onClick={() => setShowNewChat(true)} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors" title="Nuevo mensaje">
                            <Plus size={16} />
                        </button>
                        <button onClick={loadChats} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors" title="Actualizar">
                            <RefreshCw size={14} />
                        </button>
                        <button onClick={logoutWA} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors" title="Desconectar">
                            <LogOut size={14} />
                        </button>
                    </div>
                </div>

                {/* Search */}
                <div className="p-2 border-b border-gray-100">
                    <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input value={search} onChange={e => setSearch(e.target.value)}
                            placeholder="Buscar conversación..."
                            className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
                    </div>
                </div>

                {/* New chat modal */}
                {showNewChat && (
                    <div className="p-3 bg-emerald-50 border-b border-emerald-100 space-y-2">
                        <p className="text-xs font-bold text-emerald-700 uppercase">Nuevo mensaje</p>
                        <input value={newPhone} onChange={e => setNewPhone(e.target.value)}
                            placeholder="Número (ej: 5491135665266)"
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
                        <input value={newMessage} onChange={e => setNewMessage(e.target.value)}
                            placeholder="Mensaje..."
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
                        <div className="flex gap-2 justify-end">
                            <button onClick={() => { setShowNewChat(false); setNewPhone(''); setNewMessage(''); }}
                                className="px-3 py-1.5 text-xs text-gray-500">Cancelar</button>
                            <button onClick={sendNewMessage} disabled={!newPhone.trim() || !newMessage.trim() || sending}
                                className="px-3 py-1.5 text-xs bg-emerald-600 text-white rounded-lg font-medium disabled:opacity-50">
                                Enviar
                            </button>
                        </div>
                    </div>
                )}

                {/* Chat list */}
                <div className="flex-1 overflow-y-auto">
                    {filteredChats.length === 0 ? (
                        <div className="p-8 text-center text-gray-400 text-sm">
                            {chats.length === 0 ? 'Cargando conversaciones...' : 'Sin resultados'}
                        </div>
                    ) : filteredChats.map(chat => (
                        <button key={chat.id} onClick={() => selectChat(chat)}
                            className={`w-full flex items-center gap-3 px-3 py-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-50
                                ${selectedChat?.id === chat.id ? 'bg-emerald-50' : ''}`}>
                            {/* Avatar */}
                            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-emerald-400 to-green-500 flex-shrink-0 flex items-center justify-center text-white font-bold text-sm overflow-hidden">
                                {chat.profile_pic_url ? (
                                    <img src={chat.profile_pic_url} alt="" className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                                ) : (
                                    chat.is_group ? chat.name?.charAt(0)?.toUpperCase() || 'G' : <User size={18} />
                                )}
                            </div>
                            {/* Info */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                    <span className={`text-sm truncate ${chat.unread_count > 0 ? 'font-bold text-gray-900' : 'font-medium text-gray-700'}`}>
                                        {chat.name && !/^\d{5,}/.test(chat.name) ? chat.name : (chat.phone || chat.chat_id.replace(/@.*/, ''))}
                                    </span>
                                    <span className={`text-[10px] flex-shrink-0 ${chat.unread_count > 0 ? 'text-emerald-600 font-bold' : 'text-gray-400'}`}>
                                        {formatTime(chat.last_message_at)}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between mt-0.5">
                                    <span className="text-xs text-gray-400 truncate pr-2">{chat.last_message || ''}</span>
                                    {chat.unread_count > 0 && (
                                        <span className="w-5 h-5 bg-emerald-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center flex-shrink-0">
                                            {chat.unread_count > 9 ? '9+' : chat.unread_count}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Chat area */}
            {selectedChat ? (
                <div className="flex-1 flex flex-col bg-[#efeae2] min-w-0" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'200\' height=\'200\' viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'%23d5d0c5\' fill-opacity=\'0.15\'%3E%3Ccircle cx=\'20\' cy=\'20\' r=\'2\'/%3E%3Ccircle cx=\'80\' cy=\'40\' r=\'1.5\'/%3E%3Ccircle cx=\'140\' cy=\'60\' r=\'2\'/%3E%3Ccircle cx=\'40\' cy=\'100\' r=\'1\'/%3E%3Ccircle cx=\'160\' cy=\'140\' r=\'2\'/%3E%3Ccircle cx=\'100\' cy=\'180\' r=\'1.5\'/%3E%3C/g%3E%3C/svg%3E")' }}>
                    {/* Chat header */}
                    <div className="px-4 py-3 bg-white border-b border-gray-200 flex items-center gap-3">
                        <button onClick={() => setSelectedChat(null)} className="md:hidden p-1 text-gray-500 hover:text-gray-700">
                            <ArrowLeft size={20} />
                        </button>
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-green-500 flex-shrink-0 flex items-center justify-center text-white font-bold text-sm overflow-hidden">
                            {selectedChat.profile_pic_url ? (
                                <img src={selectedChat.profile_pic_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                                <User size={18} />
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="font-bold text-sm text-gray-900 truncate">{selectedChat.name && !/^\d{5,}/.test(selectedChat.name) ? selectedChat.name : (selectedChat.phone || selectedChat.chat_id.replace(/@.*/, ''))}</p>
                            <p className="text-[11px] text-gray-400 truncate">{selectedChat.phone || selectedChat.chat_id.replace(/@.*/, '')}</p>
                        </div>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1">
                        {loading ? (
                            <div className="flex items-center justify-center h-32 text-gray-400">
                                <RefreshCw size={20} className="animate-spin mr-2" /> Cargando mensajes...
                            </div>
                        ) : messages.length === 0 ? (
                            <div className="text-center text-gray-400 text-sm py-8">Sin mensajes aún</div>
                        ) : messages.map((msg, i) => {
                            const showDate = i === 0 || new Date(msg.timestamp).toDateString() !== new Date(messages[i - 1].timestamp).toDateString();
                            return (
                                <div key={msg.id}>
                                    {showDate && (
                                        <div className="flex justify-center my-3">
                                            <span className="px-3 py-1 bg-white/80 rounded-lg text-[10px] text-gray-500 shadow-sm">
                                                {new Date(msg.timestamp).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
                                            </span>
                                        </div>
                                    )}
                                    <div className={`flex ${msg.from_me ? 'justify-end' : 'justify-start'} mb-0.5`}>
                                        <div className={`max-w-[75%] px-3 py-1.5 rounded-lg shadow-sm text-sm relative overflow-hidden
                                            ${msg.from_me
                                                ? 'bg-[#d9fdd3] text-gray-800 rounded-tr-none'
                                                : 'bg-white text-gray-800 rounded-tl-none'
                                            }`}>
                                            {!msg.from_me && selectedChat.is_group && msg.sender_name && /[a-zA-ZáéíóúñÁÉÍÓÚÑ]/.test(msg.sender_name) && (
                                                <p className="text-[10px] font-bold text-emerald-600 mb-0.5 truncate max-w-full">{msg.sender_name}</p>
                                            )}
                                            <p className="whitespace-pre-wrap break-words" style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}>{msg.body}</p>
                                            <div className={`flex items-center gap-1 justify-end mt-0.5 ${msg.from_me ? '' : ''}`}>
                                                <span className="text-[10px] text-gray-400">{formatMsgTime(msg.timestamp)}</span>
                                                {msg.from_me && (
                                                    <CheckCheck size={12} className={msg.is_read ? 'text-blue-500' : 'text-gray-400'} />
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Message input */}
                    <div className="px-4 py-3 bg-white border-t border-gray-200">
                        <div className="flex items-center gap-2">
                            <input
                                value={msgInput}
                                onChange={e => setMsgInput(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                                placeholder="Escribí un mensaje..."
                                className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-full text-sm outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                            />
                            <button
                                onClick={sendMessage}
                                disabled={!msgInput.trim() || sending}
                                className="p-2.5 bg-emerald-600 text-white rounded-full hover:bg-emerald-700 transition-colors disabled:opacity-50 shadow-sm"
                            >
                                <Send size={18} />
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="flex-1 hidden md:flex items-center justify-center bg-gradient-to-br from-gray-50 to-emerald-50/30">
                    <div className="text-center space-y-3">
                        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
                            <MessageCircle size={28} className="text-emerald-600" />
                        </div>
                        <p className="text-gray-500 text-sm">Seleccioná una conversación para empezar</p>
                    </div>
                </div>
            )}
        </div>
    );
}
