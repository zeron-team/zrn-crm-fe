import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
    Mail, Send, Inbox, PenSquare, Star, Trash2, Settings, FileSignature,
    Search, RefreshCw, ChevronLeft, X, Save, Plus, Check, AlertCircle,
    ArrowLeft, MoreVertical, Eye, Bold, Italic, Underline, Type, Palette, Image, AlignLeft, AlignCenter, AlignRight, Link
} from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

interface EmailAccount {
    id: number; user_id: number; email_address: string; display_name: string | null;
    smtp_host: string; smtp_port: number; smtp_user: string; smtp_ssl: boolean;
    imap_host: string | null; imap_port: number; imap_ssl: boolean;
    is_default: boolean; created_at: string | null;
}
interface EmailSignature {
    id: number; user_id: number; name: string; html_content: string;
    is_default: boolean; created_at: string | null;
}
interface EmailMsg {
    id: number; user_id: number; account_id: number | null; folder: string;
    message_id: string | null; subject: string | null; from_address: string;
    to_addresses: string; cc_addresses: string | null; body_html: string | null;
    body_text: string | null; is_read: boolean; is_starred: boolean;
    sent_at: string | null; received_at: string | null; created_at: string | null;
}

type View = 'inbox' | 'sent' | 'compose' | 'signatures' | 'config';

export default function Email() {
    const { user } = useAuth();
    const userId = user?.id || 1;

    const [view, setView] = useState<View>('inbox');
    const [accounts, setAccounts] = useState<EmailAccount[]>([]);
    const [signatures, setSignatures] = useState<EmailSignature[]>([]);
    const [messages, setMessages] = useState<EmailMsg[]>([]);
    const [selectedMsg, setSelectedMsg] = useState<EmailMsg | null>(null);
    const [loading, setLoading] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [search, setSearch] = useState('');
    const [mobileShowDetail, setMobileShowDetail] = useState(false);
    const [totalInbox, setTotalInbox] = useState(0);

    // Compose state
    const [composeTo, setComposeTo] = useState('');
    const [composeCc, setComposeCc] = useState('');
    const [composeBcc, setComposeBcc] = useState('');
    const [composeSubject, setComposeSubject] = useState('');
    const [composeBody, setComposeBody] = useState('');
    const [composeAccountId, setComposeAccountId] = useState<number>(0);
    const [composeSigId, setComposeSigId] = useState<number>(0);
    const [sending, setSending] = useState(false);
    const [showCcBcc, setShowCcBcc] = useState(false);

    // Signature editor state
    const [sigEditId, setSigEditId] = useState<number | null>(null);
    const [sigName, setSigName] = useState('');
    const [sigHtml, setSigHtml] = useState('');
    const [sigDefault, setSigDefault] = useState(false);
    const [showSigForm, setShowSigForm] = useState(false);
    const [sigPreview, setSigPreview] = useState('');
    const sigEditorRef = useRef<HTMLDivElement>(null);
    const sigFormKeyRef = useRef(0);
    const [sigMode, setSigMode] = useState<'template' | 'editor'>('template');
    const [tplId, setTplId] = useState('classic');
    const [tplData, setTplData] = useState({ fullName: '', title: '', phone: '', email: '', website: '', logoUrl: '', address: '', accentColor: '#2563eb' });

    // Account config state
    const [cfgEditId, setCfgEditId] = useState<number | null>(null);
    const [cfgForm, setCfgForm] = useState({
        email_address: '', display_name: '',
        smtp_host: '', smtp_port: 587, smtp_user: '', smtp_password: '', smtp_ssl: true,
        imap_host: '', imap_port: 993, imap_user: '', imap_password: '', imap_ssl: true,
        is_default: false,
    });
    const [testResult, setTestResult] = useState<any>(null);
    const [testingConn, setTestingConn] = useState(false);

    useEffect(() => { loadAccounts(); loadSignatures(); }, []);

    // Set editor content when form opens
    useEffect(() => {
        if (showSigForm && sigEditorRef.current) {
            sigEditorRef.current.innerHTML = sigHtml;
            setSigPreview(sigHtml);
        }
    }, [showSigForm, sigFormKeyRef.current]);

    useEffect(() => {
        if (view === 'inbox' || view === 'sent') loadMessages();
    }, [view, accounts]);

    // Auto-sync inbox from IMAP when entering inbox view
    useEffect(() => {
        if (view === 'inbox' && accounts.length > 0) {
            syncInbox();
        }
    }, [view, accounts]);

    const loadAccounts = async () => {
        try {
            const res = await api.get(`/email/accounts?user_id=${userId}`);
            setAccounts(res.data);
            if (res.data.length > 0 && !composeAccountId) {
                const def = res.data.find((a: EmailAccount) => a.is_default) || res.data[0];
                setComposeAccountId(def.id);
            }
        } catch { }
    };

    const loadSignatures = async () => {
        try {
            const res = await api.get(`/email/signatures?user_id=${userId}`);
            setSignatures(res.data);
            const def = res.data.find((s: EmailSignature) => s.is_default);
            if (def && !composeSigId) setComposeSigId(def.id);
        } catch { }
    };

    const loadMessages = async () => {
        if (accounts.length === 0) return;
        setLoading(true);
        try {
            if (view === 'inbox') {
                const acc = accounts.find(a => a.is_default) || accounts[0];
                // DB-first: instant load from PostgreSQL
                const res = await api.get(`/email/inbox?account_id=${acc.id}`);
                const data = res.data;
                setMessages(data.messages || []);
                setTotalInbox(data.total_count || 0);
            } else {
                const res = await api.get(`/email/sent?user_id=${userId}`);
                setMessages(res.data);
            }
        } catch (e: any) {
            console.error(e);
        }
        setLoading(false);
    };

    const syncInbox = async () => {
        if (accounts.length === 0 || syncing) return;
        const acc = accounts.find(a => a.is_default) || accounts[0];
        if (!acc.imap_host) return;
        setSyncing(true);
        try {
            const res = await api.post(`/email/inbox/sync?account_id=${acc.id}`);
            if (res.data.new_count > 0) {
                // Reload from DB to see new emails
                await loadMessages();
                window.dispatchEvent(new Event('email-read-update'));
            }
        } catch (e: any) {
            console.error('Sync error:', e);
        }
        setSyncing(false);
    };

    const handleSend = async () => {
        if (!composeTo.trim() || !composeAccountId) return;
        setSending(true);
        try {
            await api.post('/email/send', {
                account_id: composeAccountId,
                to: composeTo,
                cc: composeCc || undefined,
                bcc: composeBcc || undefined,
                subject: composeSubject,
                body_html: composeBody,
                signature_id: composeSigId || undefined,
            });
            setComposeTo(''); setComposeCc(''); setComposeBcc('');
            setComposeSubject(''); setComposeBody('');
            setView('sent');
        } catch (e: any) {
            alert('Error al enviar: ' + (e.response?.data?.detail || e.message));
        }
        setSending(false);
    };

    const handleDeleteMsg = async (id: number) => {
        if (!confirm('¿Eliminar este correo?')) return;
        try {
            await api.delete(`/email/messages/${id}`);
            setMessages(prev => prev.filter(m => m.id !== id));
            if (selectedMsg?.id === id) setSelectedMsg(null);
            window.dispatchEvent(new Event('email-read-update'));
        } catch { }
    };

    const handleToggleStar = async (id: number) => {
        try {
            const res = await api.put(`/email/messages/${id}/star`);
            setMessages(prev => prev.map(m => m.id === id ? { ...m, is_starred: res.data.is_starred } : m));
            if (selectedMsg?.id === id) setSelectedMsg({ ...selectedMsg, is_starred: res.data.is_starred });
        } catch { }
    };

    const markAsRead = async (msg: EmailMsg) => {
        if (!msg.is_read) {
            try {
                await api.get(`/email/messages/${msg.id}`);
                setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, is_read: true } : m));
                window.dispatchEvent(new Event('email-read-update'));
            } catch { }
        }
    };

    // Signature CRUD
    const saveSig = async () => {
        // Grab HTML from contentEditable
        const html = sigEditorRef.current?.innerHTML || sigHtml;
        try {
            if (sigEditId) {
                await api.put(`/email/signatures/${sigEditId}`, { name: sigName, html_content: html, is_default: sigDefault });
            } else {
                await api.post('/email/signatures', { user_id: userId, name: sigName, html_content: html, is_default: sigDefault });
            }
            loadSignatures();
            setSigEditId(null); setSigName(''); setSigHtml(''); setShowSigForm(false);
        } catch { alert('Error al guardar firma'); }
    };

    const execCmd = useCallback((cmd: string, value?: string) => {
        document.execCommand(cmd, false, value);
        sigEditorRef.current?.focus();
    }, []);

    const insertImage = useCallback(() => {
        const url = prompt('URL de la imagen:');
        if (url) document.execCommand('insertImage', false, url);
        sigEditorRef.current?.focus();
    }, []);

    const insertLink = useCallback(() => {
        const url = prompt('URL del enlace:');
        if (url) document.execCommand('createLink', false, url);
        sigEditorRef.current?.focus();
    }, []);

    const deleteSig = async (id: number) => {
        if (!confirm('¿Eliminar esta firma?')) return;
        await api.delete(`/email/signatures/${id}`);
        loadSignatures();
    };

    // Account CRUD
    const saveAccount = async () => {
        try {
            if (cfgEditId) {
                await api.put(`/email/accounts/${cfgEditId}`, cfgForm);
            } else {
                await api.post('/email/accounts', { ...cfgForm, user_id: userId });
            }
            loadAccounts();
            setCfgEditId(null);
        } catch (e: any) { alert('Error: ' + (e.response?.data?.detail || e.message)); }
    };

    const testConnection = async (id: number) => {
        setTestingConn(true); setTestResult(null);
        try {
            const res = await api.post(`/email/accounts/${id}/test`);
            setTestResult(res.data);
        } catch { setTestResult({ smtp: 'error', imap: 'error' }); }
        setTestingConn(false);
    };

    const deleteAccount = async (id: number) => {
        if (!confirm('¿Eliminar esta cuenta?')) return;
        await api.delete(`/email/accounts/${id}`);
        loadAccounts();
    };

    const filtered = useMemo(() => {
        if (!search) return messages;
        const s = search.toLowerCase();
        return messages.filter(m =>
            (m.subject || '').toLowerCase().includes(s) ||
            m.from_address.toLowerCase().includes(s) ||
            m.to_addresses.toLowerCase().includes(s)
        );
    }, [messages, search]);

    const formatDate = (d: string | null) => {
        if (!d) return '';
        const date = new Date(d);
        const now = new Date();
        if (date.toDateString() === now.toDateString()) return date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
        return date.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
    };

    const snippet = (msg: EmailMsg) => {
        const text = msg.body_text || msg.body_html?.replace(/<[^>]+>/g, '') || '';
        return text.substring(0, 80) + (text.length > 80 ? '...' : '');
    };

    const menuItems = [
        { id: 'compose' as View, icon: PenSquare, label: 'Redactar', color: 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-200' },
        { id: 'inbox' as View, icon: Inbox, label: 'Bandeja de Entrada', badge: messages.filter(m => m.folder === 'inbox' && !m.is_read).length, total: totalInbox },
        { id: 'sent' as View, icon: Send, label: 'Enviados' },
        { id: 'signatures' as View, icon: FileSignature, label: 'Firmas' },
        { id: 'config' as View, icon: Settings, label: 'Configuración' },
    ];

    return (
        <div className="h-[calc(100vh-80px)] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100 shrink-0">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl text-white">
                        <Mail size={20} />
                    </div>
                    <div>
                        <h2 className="text-lg font-black text-gray-900">Correo</h2>
                        <p className="text-[11px] text-gray-400">{accounts.length > 0 ? accounts.find(a => a.is_default)?.email_address || accounts[0]?.email_address : 'Sin cuentas configuradas'}</p>
                    </div>
                </div>
                {(view === 'inbox' || view === 'sent') && (
                    <div className="flex items-center gap-2">
                        {syncing && <span className="text-[10px] text-blue-500 animate-pulse">Sincronizando...</span>}
                        <button onClick={() => { loadMessages(); if (view === 'inbox') syncInbox(); }} disabled={loading || syncing}
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                            <RefreshCw size={16} className={loading || syncing ? 'animate-spin' : ''} />
                        </button>
                    </div>
                )}
            </div>

            <div className="flex flex-1 overflow-hidden">
                {/* Sidebar */}
                <div className="w-56 shrink-0 bg-gray-50/70 border-r border-gray-100 py-4 px-3 space-y-1 hidden md:block overflow-y-auto">
                    {menuItems.map(item => (
                        <button key={item.id} onClick={() => { setView(item.id); setSelectedMsg(null); }}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all
                                ${item.id === 'compose' ? item.color : ''}
                                ${item.id !== 'compose' && view === item.id ? 'bg-white text-blue-700 shadow-sm border border-blue-100' : ''}
                                ${item.id !== 'compose' && view !== item.id ? 'text-gray-600 hover:bg-white hover:shadow-sm' : ''}
                            `}>
                            <item.icon size={16} />
                            <span className="flex-1 text-left">{item.label}</span>
                            {'total' in item && (item as any).total > 0 && <span className="text-[10px] text-gray-400">{(item as any).total}</span>}
                            {item.badge ? <span className="px-1.5 py-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full">{item.badge}</span> : null}
                        </button>
                    ))}

                    {/* Account list in sidebar */}
                    {accounts.length > 0 && (
                        <div className="mt-6 pt-4 border-t border-gray-200">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-3 mb-2">Cuentas</p>
                            {accounts.map(acc => (
                                <div key={acc.id} className="px-3 py-1.5 text-xs text-gray-500 truncate flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${acc.is_default ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                                    {acc.email_address}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Mobile bottom nav */}
                <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex z-40">
                    {menuItems.slice(0, 5).map(item => (
                        <button key={item.id} onClick={() => { setView(item.id); setSelectedMsg(null); setMobileShowDetail(false); }}
                            className={`flex-1 py-3 flex flex-col items-center gap-1 text-[10px] font-medium
                                ${view === item.id ? 'text-blue-600' : 'text-gray-400'}`}>
                            <item.icon size={18} />
                            {item.label.split(' ')[0]}
                        </button>
                    ))}
                </div>

                {/* Main content */}
                <div className="flex-1 flex overflow-hidden">
                    {/* ═══ INBOX / SENT ═══ */}
                    {(view === 'inbox' || view === 'sent') && (
                        <>
                            {/* Message list */}
                            <div className={`w-full md:w-96 border-r border-gray-100 flex flex-col bg-white ${selectedMsg && mobileShowDetail ? 'hidden md:flex' : 'flex'}`}>
                                <div className="p-3 border-b border-gray-100 space-y-2">
                                    <div className="relative">
                                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input value={search} onChange={e => setSearch(e.target.value)}
                                            placeholder="Buscar correos..."
                                            className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
                                    </div>
                                    <div className="flex items-center justify-between text-[11px] text-gray-400 px-1">
                                        <span>{filtered.length} correos{totalInbox > filtered.length ? ` de ${totalInbox} totales` : ''}</span>
                                        <span>{messages.filter(m => !m.is_read).length} sin leer</span>
                                    </div>
                                </div>

                                <div className="flex-1 overflow-y-auto">
                                    {loading ? (
                                        <div className="p-8 text-center text-gray-400 animate-pulse">Cargando correos...</div>
                                    ) : filtered.length === 0 ? (
                                        <div className="p-8 text-center">
                                            <Mail size={40} className="mx-auto text-gray-200 mb-3" />
                                            <p className="text-gray-400 text-sm font-medium">
                                                {accounts.length === 0 ? 'Configurá tu cuenta de email primero' : 'No hay correos'}
                                            </p>
                                            {accounts.length === 0 && (
                                                <button onClick={() => setView('config')} className="mt-2 text-xs text-blue-600 hover:underline">Ir a Configuración</button>
                                            )}
                                        </div>
                                    ) : filtered.map(msg => (
                                        <button key={msg.id} onClick={() => { setSelectedMsg(msg); setMobileShowDetail(true); markAsRead(msg); }}
                                            className={`w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-blue-50/30 transition-colors flex gap-3
                                                ${selectedMsg?.id === msg.id ? 'bg-blue-100/60 border-l-2 border-l-blue-500' : ''}
                                                ${msg.is_read ? 'bg-emerald-50/40' : 'bg-white'}
                                            `}>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between gap-2">
                                                    <p className={`text-sm truncate ${!msg.is_read ? 'font-bold text-gray-900' : 'font-medium text-gray-600'}`}>
                                                        {view === 'inbox' ? msg.from_address.split('<')[0].trim() || msg.from_address : msg.to_addresses.split(',')[0]}
                                                    </p>
                                                    <span className="text-[10px] text-gray-400 shrink-0">{formatDate(msg.sent_at || msg.received_at)}</span>
                                                </div>
                                                <p className={`text-[13px] truncate mt-0.5 ${!msg.is_read ? 'font-semibold text-gray-800' : 'text-gray-600'}`}>
                                                    {msg.subject || '(Sin asunto)'}
                                                </p>
                                                <p className="text-xs text-gray-400 truncate mt-0.5">{snippet(msg)}</p>
                                            </div>
                                            {!msg.is_read && <div className="w-2 h-2 bg-blue-500 rounded-full shrink-0 mt-2"></div>}
                                            {msg.is_starred && <Star size={12} className="text-amber-400 fill-amber-400 shrink-0 mt-1" />}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Message detail */}
                            <div className={`flex-1 flex flex-col bg-white ${!selectedMsg && !mobileShowDetail ? 'hidden md:flex' : ''} ${selectedMsg && mobileShowDetail ? 'flex' : 'hidden md:flex'}`}>
                                {selectedMsg ? (
                                    <>
                                        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                                            <button onClick={() => { setSelectedMsg(null); setMobileShowDetail(false); }} className="md:hidden p-1 mr-2 text-gray-400">
                                                <ArrowLeft size={18} />
                                            </button>
                                            <div className="flex-1 min-w-0">
                                                <h3 className="text-lg font-bold text-gray-900 truncate">{selectedMsg.subject || '(Sin asunto)'}</h3>
                                                <p className="text-xs text-gray-500">{selectedMsg.from_address}</p>
                                            </div>
                                            <div className="flex items-center gap-1 shrink-0">
                                                <button onClick={() => handleToggleStar(selectedMsg.id)}
                                                    className={`p-2 rounded-lg transition-colors ${selectedMsg.is_starred ? 'text-amber-500 bg-amber-50' : 'text-gray-400 hover:text-amber-500 hover:bg-amber-50'}`}>
                                                    <Star size={16} className={selectedMsg.is_starred ? 'fill-amber-400' : ''} />
                                                </button>
                                                <button onClick={() => handleDeleteMsg(selectedMsg.id)}
                                                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                        <div className="px-6 py-3 text-xs text-gray-500 bg-gray-50/50 border-b border-gray-100 space-y-1">
                                            <p><strong className="text-gray-700">De:</strong> {selectedMsg.from_address}</p>
                                            <p><strong className="text-gray-700">Para:</strong> {selectedMsg.to_addresses}</p>
                                            {selectedMsg.cc_addresses && <p><strong className="text-gray-700">CC:</strong> {selectedMsg.cc_addresses}</p>}
                                            <p><strong className="text-gray-700">Fecha:</strong> {selectedMsg.sent_at || selectedMsg.received_at ? new Date(selectedMsg.sent_at || selectedMsg.received_at || '').toLocaleString('es-AR') : '-'}</p>
                                        </div>
                                        <div className="flex-1 overflow-y-auto p-6">
                                            {selectedMsg.body_html ? (
                                                <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: selectedMsg.body_html }} />
                                            ) : (
                                                <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans">{selectedMsg.body_text || ''}</pre>
                                            )}
                                        </div>
                                    </>
                                ) : (
                                    <div className="flex-1 flex items-center justify-center">
                                        <div className="text-center">
                                            <Mail size={48} className="mx-auto text-gray-200 mb-3" />
                                            <p className="text-gray-400 font-medium">Seleccioná un correo para leerlo</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </>
                    )}

                    {/* ═══ COMPOSE ═══ */}
                    {view === 'compose' && (
                        <div className="flex-1 bg-white p-6 overflow-y-auto">
                            <div className="max-w-3xl mx-auto">
                                <h3 className="text-xl font-black text-gray-900 mb-6 flex items-center gap-2">
                                    <PenSquare size={20} className="text-blue-600" /> Nuevo Correo
                                </h3>

                                {accounts.length === 0 ? (
                                    <div className="text-center py-12">
                                        <AlertCircle size={40} className="mx-auto text-amber-400 mb-3" />
                                        <p className="text-gray-600 font-medium">Primero configurá una cuenta de email</p>
                                        <button onClick={() => setView('config')} className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium">
                                            Configurar Cuenta
                                        </button>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Desde</label>
                                                <select value={composeAccountId} onChange={e => setComposeAccountId(Number(e.target.value))}
                                                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                                                    {accounts.map(a => <option key={a.id} value={a.id}>{a.display_name ? `${a.display_name} <${a.email_address}>` : a.email_address}</option>)}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Firma</label>
                                                <select value={composeSigId} onChange={e => setComposeSigId(Number(e.target.value))}
                                                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                                                    <option value={0}>Sin firma</option>
                                                    {signatures.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                                </select>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Para</label>
                                            <input value={composeTo} onChange={e => setComposeTo(e.target.value)} placeholder="destinatario@email.com"
                                                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                                        </div>

                                        {!showCcBcc && (
                                            <button onClick={() => setShowCcBcc(true)} className="text-xs text-blue-600 hover:underline">+ CC / BCC</button>
                                        )}
                                        {showCcBcc && (
                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">CC</label>
                                                    <input value={composeCc} onChange={e => setComposeCc(e.target.value)} placeholder="cc@email.com"
                                                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">BCC</label>
                                                    <input value={composeBcc} onChange={e => setComposeBcc(e.target.value)} placeholder="bcc@email.com"
                                                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                                                </div>
                                            </div>
                                        )}

                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Asunto</label>
                                            <input value={composeSubject} onChange={e => setComposeSubject(e.target.value)} placeholder="Asunto del correo"
                                                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Cuerpo</label>
                                            <textarea value={composeBody} onChange={e => setComposeBody(e.target.value)}
                                                rows={12} placeholder="Escribí tu mensaje aquí... (soporta HTML)"
                                                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none font-sans" />
                                        </div>

                                        {/* Signature preview */}
                                        {composeSigId > 0 && (() => {
                                            const sig = signatures.find(s => s.id === composeSigId);
                                            return sig ? (
                                                <div className="border-t border-gray-200 pt-3">
                                                    <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Vista previa de firma</p>
                                                    <div className="p-3 bg-gray-50 rounded-lg text-sm" dangerouslySetInnerHTML={{ __html: sig.html_content }} />
                                                </div>
                                            ) : null;
                                        })()}

                                        <div className="flex justify-end pt-2">
                                            <button onClick={handleSend} disabled={sending || !composeTo.trim()}
                                                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl shadow-lg shadow-blue-200 hover:shadow-xl transition-all text-sm font-bold disabled:opacity-50">
                                                <Send size={16} />
                                                {sending ? 'Enviando...' : 'Enviar Correo'}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ═══ SIGNATURES ═══ */}
                    {view === 'signatures' && (
                        <div className="flex-1 bg-white p-6 overflow-y-auto">
                            <div className="max-w-3xl mx-auto">
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-xl font-black text-gray-900 flex items-center gap-2">
                                        <FileSignature size={20} className="text-purple-600" /> Firmas de Email
                                    </h3>
                                    <button onClick={() => { setSigEditId(null); setSigName(''); setSigHtml(''); setSigDefault(false); sigFormKeyRef.current++; setShowSigForm(true); }}
                                        className="flex items-center gap-1 px-3 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors">
                                        <Plus size={14} /> Nueva Firma
                                    </button>
                                </div>

                                {/* Signature form with template builder + rich text editor */}
                                {showSigForm && (() => {
                                    const templates = [
                                        { id: 'classic', label: 'Clásica con Logo' },
                                        { id: 'modern', label: 'Moderna' },
                                        { id: 'minimal', label: 'Minimalista' },
                                        { id: 'corporate', label: 'Corporativa' },
                                    ];

                                    const generateHtml = (tpl: string, d: any) => {
                                        const c = d.accentColor || '#2563eb';
                                        const logoHtml = d.logoUrl ? `<img src="${d.logoUrl}" alt="Logo" style="max-width:120px;max-height:80px;" />` : '';
                                        const phoneHtml = d.phone ? `<tr><td style="padding:2px 0;font-size:13px;color:#555;">📞 <a href="tel:${d.phone}" style="color:${c};text-decoration:none;">${d.phone}</a></td></tr>` : '';
                                        const emailHtml = d.email ? `<tr><td style="padding:2px 0;font-size:13px;color:#555;">✉️ <a href="mailto:${d.email}" style="color:${c};text-decoration:none;">${d.email}</a></td></tr>` : '';
                                        const webHtml = d.website ? `<tr><td style="padding:2px 0;font-size:13px;color:#555;">🌐 <a href="${d.website}" style="color:${c};text-decoration:none;">${d.website}</a></td></tr>` : '';
                                        const addressHtml = d.address ? `<tr><td style="padding:2px 0;font-size:12px;color:#888;">📍 ${d.address}</td></tr>` : '';

                                        if (tpl === 'classic') return `<table cellpadding="0" cellspacing="0" style="font-family:Arial,sans-serif;border-top:3px solid ${c};padding-top:12px;"><tr><td style="padding-right:15px;vertical-align:top;">${logoHtml}</td><td style="border-left:2px solid ${c};padding-left:15px;vertical-align:top;"><table cellpadding="0" cellspacing="0"><tr><td style="font-size:18px;font-weight:bold;color:#333;padding-bottom:2px;">${d.fullName || ''} ${d.title ? `<span style="font-weight:normal;color:#666;">| ${d.title}</span>` : ''}</td></tr>${phoneHtml}${emailHtml}${webHtml}${addressHtml}</table></td></tr></table>`;
                                        if (tpl === 'modern') return `<table cellpadding="0" cellspacing="0" style="font-family:'Segoe UI',Arial,sans-serif;"><tr><td style="vertical-align:top;">${logoHtml ? `<div style="margin-bottom:8px;">${logoHtml}</div>` : ''}<div style="font-size:20px;font-weight:700;color:${c};">${d.fullName || ''}</div>${d.title ? `<div style="font-size:13px;color:#888;margin-bottom:8px;">${d.title}</div>` : ''}<div style="height:2px;background:linear-gradient(to right,${c},transparent);margin:8px 0;width:200px;"></div><table cellpadding="0" cellspacing="0">${phoneHtml}${emailHtml}${webHtml}${addressHtml}</table></td></tr></table>`;
                                        if (tpl === 'minimal') return `<table cellpadding="0" cellspacing="0" style="font-family:Arial,sans-serif;"><tr><td><div style="font-size:15px;font-weight:bold;color:#222;">${d.fullName || ''}</div>${d.title ? `<div style="font-size:12px;color:#999;margin-bottom:6px;">${d.title}</div>` : ''}<div style="font-size:12px;color:#666;">${[d.phone, d.email, d.website].filter(Boolean).join(' · ')}</div>${d.address ? `<div style="font-size:11px;color:#aaa;margin-top:3px;">${d.address}</div>` : ''}</td>${logoHtml ? `<td style="padding-left:20px;vertical-align:top;">${logoHtml}</td>` : ''}</tr></table>`;
                                        // corporate
                                        return `<table cellpadding="0" cellspacing="0" style="font-family:Arial,sans-serif;width:100%;max-width:500px;"><tr><td colspan="2" style="background:${c};height:4px;"></td></tr><tr><td style="padding:12px 0;vertical-align:top;">${logoHtml}<div style="font-size:17px;font-weight:bold;color:#1a1a1a;margin-top:6px;">${d.fullName || ''}</div>${d.title ? `<div style="font-size:13px;color:${c};font-weight:600;">${d.title}</div>` : ''}</td><td style="padding:12px 0;vertical-align:top;text-align:right;"><table cellpadding="0" cellspacing="0" style="margin-left:auto;">${phoneHtml}${emailHtml}${webHtml}${addressHtml}</table></td></tr><tr><td colspan="2" style="background:${c};height:1px;"></td></tr></table>`;
                                    };

                                    return (
                                        <div className="mb-6 p-5 bg-gray-50 rounded-xl border border-gray-200 space-y-4">
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nombre de la firma</label>
                                                    <input value={sigName} onChange={e => setSigName(e.target.value)} placeholder="Mi firma profesional"
                                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none" />
                                                </div>
                                                <div className="flex items-end gap-4">
                                                    <label className="flex items-center gap-2 cursor-pointer">
                                                        <input type="checkbox" checked={sigDefault} onChange={e => setSigDefault(e.target.checked)}
                                                            className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500" />
                                                        <span className="text-sm text-gray-600">Predeterminada</span>
                                                    </label>
                                                </div>
                                            </div>

                                            {/* Mode tabs */}
                                            {(() => {
                                                return (<>
                                                    <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
                                                        <button type="button" onClick={() => setSigMode('template')}
                                                            className={`flex-1 px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${sigMode === 'template' ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                                                            🎨 Plantillas
                                                        </button>
                                                        <button type="button" onClick={() => setSigMode('editor')}
                                                            className={`flex-1 px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${sigMode === 'editor' ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                                                            ✏️ Editor Libre
                                                        </button>
                                                    </div>

                                                    {sigMode === 'template' && (
                                                        <div className="space-y-4">
                                                            {/* Template selector */}
                                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                                                {templates.map(t => (
                                                                    <button key={t.id} type="button" onClick={() => setTplId(t.id)}
                                                                        className={`px-3 py-2 text-xs font-medium rounded-lg border-2 transition-all ${tplId === t.id ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-gray-200 text-gray-600 hover:border-purple-300'}`}>
                                                                        {t.label}
                                                                    </button>
                                                                ))}
                                                            </div>

                                                            {/* Fields */}
                                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                                <div>
                                                                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-0.5">Nombre completo</label>
                                                                    <input value={tplData.fullName} onChange={e => setTplData({ ...tplData, fullName: e.target.value })} placeholder="Renzo Antonioli"
                                                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-purple-500" />
                                                                </div>
                                                                <div>
                                                                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-0.5">Cargo / Título</label>
                                                                    <input value={tplData.title} onChange={e => setTplData({ ...tplData, title: e.target.value })} placeholder="AI Arquitect"
                                                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-purple-500" />
                                                                </div>
                                                                <div>
                                                                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-0.5">Teléfono</label>
                                                                    <input value={tplData.phone} onChange={e => setTplData({ ...tplData, phone: e.target.value })} placeholder="+54 11 3566 5266"
                                                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-purple-500" />
                                                                </div>
                                                                <div>
                                                                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-0.5">Email</label>
                                                                    <input value={tplData.email} onChange={e => setTplData({ ...tplData, email: e.target.value })} placeholder="rantonioli@zeron.com.ar"
                                                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-purple-500" />
                                                                </div>
                                                                <div>
                                                                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-0.5">Sitio Web</label>
                                                                    <input value={tplData.website} onChange={e => setTplData({ ...tplData, website: e.target.value })} placeholder="https://www.zeron.com.ar"
                                                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-purple-500" />
                                                                </div>
                                                                <div>
                                                                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-0.5">Dirección (opcional)</label>
                                                                    <input value={tplData.address} onChange={e => setTplData({ ...tplData, address: e.target.value })} placeholder="Buenos Aires, Argentina"
                                                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-purple-500" />
                                                                </div>
                                                                <div>
                                                                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-0.5">URL del Logo (opcional)</label>
                                                                    <input value={tplData.logoUrl} onChange={e => setTplData({ ...tplData, logoUrl: e.target.value })} placeholder="https://ejemplo.com/logo.png"
                                                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-purple-500" />
                                                                </div>
                                                                <div>
                                                                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-0.5">Color de acento</label>
                                                                    <div className="flex items-center gap-2">
                                                                        <input type="color" value={tplData.accentColor} onChange={e => setTplData({ ...tplData, accentColor: e.target.value })}
                                                                            className="w-10 h-9 rounded border border-gray-200 cursor-pointer" />
                                                                        <input value={tplData.accentColor} onChange={e => setTplData({ ...tplData, accentColor: e.target.value })}
                                                                            className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-purple-500 font-mono" />
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* Live preview of template */}
                                                            <div>
                                                                <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Vista previa</p>
                                                                <div className="p-5 bg-white rounded-lg border border-gray-100 shadow-sm"
                                                                    dangerouslySetInnerHTML={{ __html: generateHtml(tplId, tplData) }} />
                                                            </div>

                                                            <div className="flex gap-2 justify-between">
                                                                <button type="button" onClick={() => {
                                                                    const html = generateHtml(tplId, tplData);
                                                                    setSigHtml(html);
                                                                    sigFormKeyRef.current++;
                                                                    setSigMode('editor');
                                                                    setTimeout(() => {
                                                                        if (sigEditorRef.current) {
                                                                            sigEditorRef.current.innerHTML = html;
                                                                            setSigPreview(html);
                                                                        }
                                                                    }, 100);
                                                                }} className="text-xs text-purple-600 hover:text-purple-700 font-medium">
                                                                    ✏️ Editar HTML generado en Editor Libre
                                                                </button>
                                                                <div className="flex gap-2">
                                                                    <button onClick={() => { setSigEditId(null); setSigName(''); setSigHtml(''); setShowSigForm(false); }}
                                                                        className="px-3 py-2 text-gray-500 text-sm hover:text-gray-700">Cancelar</button>
                                                                    <button onClick={() => { setSigHtml(generateHtml(tplId, tplData)); setTimeout(() => saveSig(), 50); }} disabled={!sigName.trim() || !tplData.fullName.trim()}
                                                                        className="flex items-center gap-1 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium disabled:opacity-50">
                                                                        <Save size={14} /> Guardar Firma
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {sigMode === 'editor' && (
                                                        <div className="space-y-4">
                                                            {/* Rich Text Toolbar */}
                                                            <div>
                                                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Contenido</label>
                                                                <div className="border border-gray-200 rounded-xl overflow-hidden">
                                                                    <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 bg-gray-100 border-b border-gray-200">
                                                                        <button type="button" onClick={() => execCmd('bold')} title="Negrita" className="p-1.5 hover:bg-white rounded transition-colors text-gray-600 hover:text-gray-900"><Bold size={14} /></button>
                                                                        <button type="button" onClick={() => execCmd('italic')} title="Cursiva" className="p-1.5 hover:bg-white rounded transition-colors text-gray-600 hover:text-gray-900"><Italic size={14} /></button>
                                                                        <button type="button" onClick={() => execCmd('underline')} title="Subrayado" className="p-1.5 hover:bg-white rounded transition-colors text-gray-600 hover:text-gray-900"><Underline size={14} /></button>
                                                                        <div className="w-px h-5 bg-gray-300 mx-1"></div>
                                                                        <select onChange={e => { execCmd('fontSize', e.target.value); e.target.value = ''; }} defaultValue="" title="Tamaño" className="px-1 py-1 text-xs bg-transparent border border-gray-300 rounded hover:border-gray-400 cursor-pointer text-gray-600">
                                                                            <option value="" disabled>Tamaño</option>
                                                                            <option value="1">Pequeño</option>
                                                                            <option value="3">Normal</option>
                                                                            <option value="5">Grande</option>
                                                                            <option value="7">Muy Grande</option>
                                                                        </select>
                                                                        <select onChange={e => { execCmd('fontName', e.target.value); e.target.value = ''; }} defaultValue="" title="Fuente" className="px-1 py-1 text-xs bg-transparent border border-gray-300 rounded hover:border-gray-400 cursor-pointer text-gray-600">
                                                                            <option value="" disabled>Fuente</option>
                                                                            <option value="Arial">Arial</option>
                                                                            <option value="Verdana">Verdana</option>
                                                                            <option value="Georgia">Georgia</option>
                                                                            <option value="Times New Roman">Times New Roman</option>
                                                                            <option value="Courier New">Courier New</option>
                                                                            <option value="Trebuchet MS">Trebuchet MS</option>
                                                                        </select>
                                                                        <div className="w-px h-5 bg-gray-300 mx-1"></div>
                                                                        <div className="relative" title="Color de texto">
                                                                            <input type="color" onChange={e => execCmd('foreColor', e.target.value)} defaultValue="#000000"
                                                                                className="absolute inset-0 opacity-0 w-8 h-8 cursor-pointer" />
                                                                            <div className="p-1.5 hover:bg-white rounded transition-colors text-gray-600 hover:text-gray-900 cursor-pointer"><Type size={14} /></div>
                                                                        </div>
                                                                        <div className="relative" title="Color de fondo">
                                                                            <input type="color" onChange={e => execCmd('hiliteColor', e.target.value)} defaultValue="#ffff00"
                                                                                className="absolute inset-0 opacity-0 w-8 h-8 cursor-pointer" />
                                                                            <div className="p-1.5 hover:bg-white rounded transition-colors text-gray-600 hover:text-gray-900 cursor-pointer"><Palette size={14} /></div>
                                                                        </div>
                                                                        <div className="w-px h-5 bg-gray-300 mx-1"></div>
                                                                        <button type="button" onClick={() => execCmd('justifyLeft')} title="Izquierda" className="p-1.5 hover:bg-white rounded transition-colors text-gray-600 hover:text-gray-900"><AlignLeft size={14} /></button>
                                                                        <button type="button" onClick={() => execCmd('justifyCenter')} title="Centro" className="p-1.5 hover:bg-white rounded transition-colors text-gray-600 hover:text-gray-900"><AlignCenter size={14} /></button>
                                                                        <button type="button" onClick={() => execCmd('justifyRight')} title="Derecha" className="p-1.5 hover:bg-white rounded transition-colors text-gray-600 hover:text-gray-900"><AlignRight size={14} /></button>
                                                                        <div className="w-px h-5 bg-gray-300 mx-1"></div>
                                                                        <button type="button" onClick={insertImage} title="Insertar imagen" className="p-1.5 hover:bg-white rounded transition-colors text-gray-600 hover:text-gray-900"><Image size={14} /></button>
                                                                        <button type="button" onClick={insertLink} title="Insertar enlace" className="p-1.5 hover:bg-white rounded transition-colors text-gray-600 hover:text-gray-900"><Link size={14} /></button>
                                                                    </div>
                                                                    <div
                                                                        key={sigFormKeyRef.current}
                                                                        ref={sigEditorRef}
                                                                        contentEditable
                                                                        suppressContentEditableWarning
                                                                        onInput={() => setSigPreview(sigEditorRef.current?.innerHTML || '')}
                                                                        className="min-h-[180px] px-4 py-3 text-sm outline-none bg-white focus:ring-2 focus:ring-inset focus:ring-purple-500"
                                                                        style={{ fontFamily: 'Arial, sans-serif' }}
                                                                    />
                                                                </div>
                                                            </div>

                                                            {/* Live Preview */}
                                                            {sigPreview && (
                                                                <div>
                                                                    <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Vista previa</p>
                                                                    <div className="p-4 bg-white rounded-lg border border-gray-100 text-sm shadow-sm" dangerouslySetInnerHTML={{ __html: sigPreview }} />
                                                                </div>
                                                            )}

                                                            <div className="flex gap-2 justify-end">
                                                                <button onClick={() => { setSigEditId(null); setSigName(''); setSigHtml(''); setShowSigForm(false); }}
                                                                    className="px-3 py-2 text-gray-500 text-sm hover:text-gray-700">Cancelar</button>
                                                                <button onClick={saveSig} disabled={!sigName.trim()}
                                                                    className="flex items-center gap-1 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium disabled:opacity-50">
                                                                    <Save size={14} /> Guardar
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </>);
                                            })()}
                                        </div>
                                    );
                                })()}

                                {/* Signatures list */}
                                <div className="space-y-3">
                                    {signatures.length === 0 && !showSigForm && (
                                        <div className="text-center py-8 text-gray-400">
                                            <FileSignature size={40} className="mx-auto mb-2 opacity-50" />
                                            <p>No tenés firmas creadas</p>
                                        </div>
                                    )}
                                    {signatures.map(sig => (
                                        <div key={sig.id} className="p-4 border border-gray-200 rounded-xl hover:border-purple-200 transition-colors">
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-gray-900">{sig.name}</span>
                                                    {sig.is_default && <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 text-[10px] font-bold rounded">DEFAULT</span>}
                                                </div>
                                                <div className="flex gap-1">
                                                    <button onClick={() => { setSigEditId(sig.id); setSigName(sig.name); setSigHtml(sig.html_content); setSigDefault(sig.is_default); sigFormKeyRef.current++; setShowSigForm(true); }}
                                                        className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors">
                                                        <PenSquare size={14} />
                                                    </button>
                                                    <button onClick={() => deleteSig(sig.id)}
                                                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="p-3 bg-gray-50 rounded-lg text-sm" dangerouslySetInnerHTML={{ __html: sig.html_content }} />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ═══ CONFIG ═══ */}
                    {view === 'config' && (
                        <div className="flex-1 bg-white p-6 overflow-y-auto">
                            <div className="max-w-3xl mx-auto">
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-xl font-black text-gray-900 flex items-center gap-2">
                                        <Settings size={20} className="text-gray-600" /> Configuración de Cuentas
                                    </h3>
                                    <button onClick={() => {
                                        setCfgEditId(null);
                                        setCfgForm({ email_address: '', display_name: '', smtp_host: '', smtp_port: 587, smtp_user: '', smtp_password: '', smtp_ssl: true, imap_host: '', imap_port: 993, imap_user: '', imap_password: '', imap_ssl: true, is_default: false });
                                    }}
                                        className="flex items-center gap-1 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
                                        <Plus size={14} /> Nueva Cuenta
                                    </button>
                                </div>

                                {/* Account form */}
                                {(cfgEditId !== undefined) && (
                                    <div className="mb-6 p-5 bg-gray-50 rounded-xl border border-gray-200 space-y-4">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email</label>
                                                <input value={cfgForm.email_address} onChange={e => setCfgForm({ ...cfgForm, email_address: e.target.value })}
                                                    placeholder="correo@dominio.com"
                                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nombre para mostrar</label>
                                                <input value={cfgForm.display_name} onChange={e => setCfgForm({ ...cfgForm, display_name: e.target.value })}
                                                    placeholder="Juan Pérez"
                                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                                            </div>
                                        </div>

                                        <p className="text-xs font-bold text-blue-600 flex items-center gap-1"><Send size={12} /> SMTP (Envío)</p>
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                            <div>
                                                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-0.5">Host</label>
                                                <input value={cfgForm.smtp_host} onChange={e => setCfgForm({ ...cfgForm, smtp_host: e.target.value })}
                                                    placeholder="smtp.gmail.com"
                                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-0.5">Puerto</label>
                                                <input type="number" value={cfgForm.smtp_port} onChange={e => setCfgForm({ ...cfgForm, smtp_port: Number(e.target.value) })}
                                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                                            </div>
                                            <div className="flex items-end">
                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <input type="checkbox" checked={cfgForm.smtp_ssl} onChange={e => setCfgForm({ ...cfgForm, smtp_ssl: e.target.checked })}
                                                        className="w-4 h-4 text-blue-600 rounded" />
                                                    <span className="text-sm text-gray-600">SSL/TLS</span>
                                                </label>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-0.5">Usuario SMTP</label>
                                                <input value={cfgForm.smtp_user} onChange={e => setCfgForm({ ...cfgForm, smtp_user: e.target.value })}
                                                    placeholder="correo@dominio.com"
                                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-0.5">Contraseña SMTP</label>
                                                <input type="password" value={cfgForm.smtp_password} onChange={e => setCfgForm({ ...cfgForm, smtp_password: e.target.value })}
                                                    placeholder="••••••••"
                                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                                            </div>
                                        </div>

                                        <p className="text-xs font-bold text-green-600 flex items-center gap-1 pt-2"><Inbox size={12} /> IMAP (Recepción)</p>
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                            <div>
                                                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-0.5">Host</label>
                                                <input value={cfgForm.imap_host} onChange={e => setCfgForm({ ...cfgForm, imap_host: e.target.value })}
                                                    placeholder="imap.gmail.com"
                                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-0.5">Puerto</label>
                                                <input type="number" value={cfgForm.imap_port} onChange={e => setCfgForm({ ...cfgForm, imap_port: Number(e.target.value) })}
                                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                                            </div>
                                            <div className="flex items-end">
                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <input type="checkbox" checked={cfgForm.imap_ssl} onChange={e => setCfgForm({ ...cfgForm, imap_ssl: e.target.checked })}
                                                        className="w-4 h-4 text-blue-600 rounded" />
                                                    <span className="text-sm text-gray-600">SSL/TLS</span>
                                                </label>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-0.5">Usuario IMAP</label>
                                                <input value={cfgForm.imap_user} onChange={e => setCfgForm({ ...cfgForm, imap_user: e.target.value })}
                                                    placeholder="correo@dominio.com"
                                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-0.5">Contraseña IMAP</label>
                                                <input type="password" value={cfgForm.imap_password} onChange={e => setCfgForm({ ...cfgForm, imap_password: e.target.value })}
                                                    placeholder="••••••••"
                                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                                            </div>
                                        </div>

                                        <label className="flex items-center gap-2 cursor-pointer pt-2">
                                            <input type="checkbox" checked={cfgForm.is_default} onChange={e => setCfgForm({ ...cfgForm, is_default: e.target.checked })}
                                                className="w-4 h-4 text-blue-600 rounded" />
                                            <span className="text-sm text-gray-600 font-medium">Cuenta predeterminada</span>
                                        </label>

                                        <div className="flex gap-2 justify-end pt-2">
                                            <button onClick={() => setCfgEditId(undefined as any)}
                                                className="px-3 py-2 text-gray-500 text-sm hover:text-gray-700">Cancelar</button>
                                            <button onClick={saveAccount} disabled={!cfgForm.email_address || !cfgForm.smtp_host}
                                                className="flex items-center gap-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium disabled:opacity-50">
                                                <Save size={14} /> {cfgEditId ? 'Guardar Cambios' : 'Crear Cuenta'}
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Accounts list */}
                                <div className="space-y-3">
                                    {accounts.length === 0 && cfgEditId === undefined && (
                                        <div className="text-center py-8 text-gray-400">
                                            <Mail size={40} className="mx-auto mb-2 opacity-50" />
                                            <p>No tenés cuentas de email configuradas</p>
                                            <p className="text-xs mt-1">Hacé click en "Nueva Cuenta" para empezar</p>
                                        </div>
                                    )}
                                    {accounts.map(acc => (
                                        <div key={acc.id} className="p-4 border border-gray-200 rounded-xl hover:border-blue-200 transition-colors">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm ${acc.is_default ? 'bg-blue-600' : 'bg-gray-400'}`}>
                                                        {acc.email_address[0].toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-gray-900">{acc.display_name || acc.email_address}</p>
                                                        <p className="text-xs text-gray-500">{acc.email_address} • {acc.smtp_host}:{acc.smtp_port}</p>
                                                    </div>
                                                    {acc.is_default && <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold rounded">DEFAULT</span>}
                                                </div>
                                                <div className="flex gap-1">
                                                    <button onClick={() => testConnection(acc.id)} disabled={testingConn}
                                                        className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors">
                                                        {testingConn ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
                                                    </button>
                                                    <button onClick={() => {
                                                        setCfgEditId(acc.id);
                                                        setCfgForm({
                                                            email_address: acc.email_address, display_name: acc.display_name || '',
                                                            smtp_host: acc.smtp_host, smtp_port: acc.smtp_port, smtp_user: acc.smtp_user, smtp_password: '', smtp_ssl: acc.smtp_ssl,
                                                            imap_host: acc.imap_host || '', imap_port: acc.imap_port, imap_user: '', imap_password: '', imap_ssl: acc.imap_ssl,
                                                            is_default: acc.is_default,
                                                        });
                                                    }} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                                                        <PenSquare size={14} />
                                                    </button>
                                                    <button onClick={() => deleteAccount(acc.id)}
                                                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                            {/* Test results */}
                                            {testResult && (
                                                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                                                    <div className={`p-2 rounded-lg ${testResult.smtp === 'ok' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                                        SMTP: {testResult.smtp === 'ok' ? '✓ Conectado' : testResult.smtp}
                                                    </div>
                                                    <div className={`p-2 rounded-lg ${testResult.imap === 'ok' ? 'bg-green-50 text-green-700' : testResult.imap === 'not_tested' ? 'bg-gray-50 text-gray-500' : 'bg-red-50 text-red-700'}`}>
                                                        IMAP: {testResult.imap === 'ok' ? '✓ Conectado' : testResult.imap === 'not_tested' ? 'No configurado' : testResult.imap}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
