import { useState, useRef, useEffect } from "react";
import { Bot, X, Send, Sparkles, Trash2, MessageCircle } from "lucide-react";
import api from "../api/client";

interface ChatMsg {
    id?: number;
    role: "user" | "assistant";
    content: string;
    created_at?: string;
}

const SUGGESTIONS = [
    "¿Cuántos clientes tengo?",
    "Resumen de ventas del mes",
    "Tickets de soporte abiertos",
    "¿Cómo está mi inventario?",
];

export default function AiChatWidget() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<ChatMsg[]>([]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [showPulse, setShowPulse] = useState(true);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Scroll to bottom on new messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // Focus input when panel opens
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 300);
            setShowPulse(false);
        }
    }, [isOpen]);

    const sendMessage = async (text: string) => {
        if (!text.trim() || loading) return;

        const userMsg: ChatMsg = { role: "user", content: text.trim() };
        setMessages((prev) => [...prev, userMsg]);
        setInput("");
        setLoading(true);

        try {
            const token = localStorage.getItem("token");
            const { data } = await api.post(
                "/ai/chat",
                { message: text.trim(), session_id: sessionId },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setSessionId(data.session_id);
            const assistantMsg: ChatMsg = {
                role: "assistant",
                content: data.response,
            };
            setMessages((prev) => [...prev, assistantMsg]);
        } catch (err: any) {
            const errorMsg =
                err?.response?.status === 401
                    ? "⚠️ Sesión expirada. Por favor, volvé a iniciar sesión."
                    : "⚠️ Error al conectar con ZeRoN IA. Intentá de nuevo.";
            setMessages((prev) => [
                ...prev,
                { role: "assistant", content: errorMsg },
            ]);
        } finally {
            setLoading(false);
        }
    };

    const clearChat = async () => {
        try {
            const token = localStorage.getItem("token");
            await api.delete("/ai/sessions", {
                headers: { Authorization: `Bearer ${token}` },
            });
        } catch { }
        setMessages([]);
        setSessionId(null);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendMessage(input);
        }
    };

    // Format markdown-like content (bold, bullets)
    const formatContent = (text: string) => {
        return text.split("\n").map((line, i) => {
            // Bold text
            let formatted = line.replace(
                /\*\*(.*?)\*\*/g,
                '<strong class="font-semibold">$1</strong>'
            );
            // Bullet points
            if (formatted.startsWith("- ") || formatted.startsWith("• ")) {
                formatted = `<span class="inline-block w-2 h-2 bg-blue-400 rounded-full mr-2 flex-shrink-0 mt-1.5"></span>${formatted.slice(2)}`;
                return (
                    <div
                        key={i}
                        className="flex items-start ml-2 my-0.5"
                        dangerouslySetInnerHTML={{ __html: formatted }}
                    />
                );
            }
            return (
                <div
                    key={i}
                    className={line === "" ? "h-2" : ""}
                    dangerouslySetInnerHTML={{ __html: formatted }}
                />
            );
        });
    };

    return (
        <>
            {/* ── Floating Button ──────────────────────────────────── */}
            <button
                id="ai-chat-toggle"
                onClick={() => setIsOpen(!isOpen)}
                className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 hover:scale-110 group ${isOpen
                        ? "bg-gray-700 hover:bg-gray-800 rotate-0"
                        : "bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 hover:from-blue-700 hover:via-indigo-700 hover:to-purple-800"
                    }`}
                title="ZeRoN IA"
            >
                {isOpen ? (
                    <X size={22} className="text-white" />
                ) : (
                    <>
                        <Bot size={24} className="text-white" />
                        {showPulse && (
                            <span className="absolute inset-0 rounded-full bg-blue-500 opacity-30 animate-ping" />
                        )}
                    </>
                )}
            </button>

            {/* ── Chat Panel ───────────────────────────────────────── */}
            <div
                className={`fixed z-40 transition-all duration-300 ease-out
          ${isOpen ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 translate-y-4 pointer-events-none"}
          bottom-24 right-6 w-[400px] h-[560px]
          max-md:inset-0 max-md:w-full max-md:h-full max-md:bottom-0 max-md:right-0 max-md:rounded-none
          bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden
        `}
            >
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-700 px-5 py-4 flex items-center justify-between flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                            <Sparkles size={20} className="text-white" />
                        </div>
                        <div>
                            <h3 className="text-white font-bold text-sm tracking-wide">
                                ZeRoN IA
                            </h3>
                            <p className="text-blue-200 text-[10px] font-medium">
                                Asistente Inteligente
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1">
                        {messages.length > 0 && (
                            <button
                                onClick={clearChat}
                                className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                                title="Limpiar chat"
                            >
                                <Trash2 size={16} />
                            </button>
                        )}
                        <button
                            onClick={() => setIsOpen(false)}
                            className="md:hidden p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-gradient-to-b from-gray-50 to-white scrollbar-thin">
                    {messages.length === 0 && !loading && (
                        <div className="flex flex-col items-center justify-center h-full text-center">
                            <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-2xl flex items-center justify-center mb-4">
                                <MessageCircle
                                    size={28}
                                    className="text-indigo-500"
                                />
                            </div>
                            <h4 className="text-gray-800 font-bold text-sm mb-1">
                                ¡Hola! Soy ZeRoN IA
                            </h4>
                            <p className="text-gray-400 text-xs mb-5 max-w-[260px]">
                                Tu asistente inteligente para gestionar tu negocio. Preguntame
                                lo que necesites.
                            </p>
                            <div className="grid grid-cols-1 gap-2 w-full max-w-xs">
                                {SUGGESTIONS.map((s, i) => (
                                    <button
                                        key={i}
                                        onClick={() => sendMessage(s)}
                                        className="text-left px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-xs text-gray-600 hover:border-indigo-300 hover:bg-indigo-50/50 hover:text-indigo-700 transition-all duration-200 shadow-sm hover:shadow"
                                    >
                                        <span className="text-indigo-400 mr-1.5">→</span>
                                        {s}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {messages.map((msg, i) => (
                        <div
                            key={i}
                            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} animate-[fadeSlideIn_0.3s_ease-out]`}
                        >
                            {msg.role === "assistant" && (
                                <div className="w-7 h-7 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0 mr-2 mt-1 shadow-sm">
                                    <Bot size={14} className="text-white" />
                                </div>
                            )}
                            <div
                                className={`max-w-[80%] px-3.5 py-2.5 rounded-2xl text-[13px] leading-relaxed shadow-sm ${msg.role === "user"
                                        ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-br-md"
                                        : "bg-white border border-gray-100 text-gray-700 rounded-bl-md"
                                    }`}
                            >
                                {msg.role === "assistant"
                                    ? formatContent(msg.content)
                                    : msg.content}
                            </div>
                        </div>
                    ))}

                    {/* Typing indicator */}
                    {loading && (
                        <div className="flex justify-start animate-[fadeSlideIn_0.3s_ease-out]">
                            <div className="w-7 h-7 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0 mr-2 mt-1 shadow-sm">
                                <Bot size={14} className="text-white" />
                            </div>
                            <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
                                <div className="flex items-center gap-1.5">
                                    <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:0ms]" />
                                    <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:200ms]" />
                                    <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:400ms]" />
                                </div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="px-4 py-3 border-t border-gray-100 bg-white flex-shrink-0">
                    <div className="flex items-center gap-2 bg-gray-50 rounded-xl border border-gray-200 focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100 transition-all px-3 py-1">
                        <input
                            ref={inputRef}
                            id="ai-chat-input"
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Escribí tu consulta..."
                            disabled={loading}
                            className="flex-1 bg-transparent text-sm text-gray-800 placeholder-gray-400 outline-none py-2"
                        />
                        <button
                            id="ai-chat-send"
                            onClick={() => sendMessage(input)}
                            disabled={!input.trim() || loading}
                            className={`p-2 rounded-lg transition-all duration-200 ${input.trim() && !loading
                                    ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md hover:shadow-lg hover:scale-105"
                                    : "text-gray-300 cursor-not-allowed"
                                }`}
                        >
                            <Send size={16} />
                        </button>
                    </div>
                    <p className="text-[10px] text-gray-300 text-center mt-2">
                        ZeRoN IA puede cometer errores. Verificá la información importante.
                    </p>
                </div>
            </div>

            {/* Custom animation keyframe */}
            <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
        </>
    );
}
