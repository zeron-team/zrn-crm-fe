import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import api from "../api/client";
import { Plus, Pencil, Trash2, Calendar as CalendarIcon, Clock, AlertCircle, Building2, ChevronLeft, ChevronRight, List as ListIcon, Zap, MessageSquare, Send, CornerDownRight, CheckCircle2, XCircle, PauseCircle, X, LayoutGrid, GripVertical } from "lucide-react";
import { useTranslation } from "react-i18next";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isSameMonth, isSameDay, addDays, parseISO, addWeeks, subWeeks } from "date-fns";
import { es } from "date-fns/locale/es";

interface CalendarEvent {
    id: number;
    title: string;
    description: string;
    start_date: string;
    end_date: string;
    related_to: string;
    color: string;
    client_id?: number | null;
    contact_id?: number | null;
    lead_id?: number | null;
    status?: string;
    status_reason?: string | null;
    parent_event_id?: number | null;
    call_url?: string | null;
    is_recurring?: boolean;
    recurrence_pattern?: string | null;
    project_id?: number | null;
    notes?: ActivityNote[];
}

interface ProjectItem { id: number; name: string; key: string; }

interface ActivityNote {
    id: number;
    event_id: number;
    content: string;
    created_at: string;
}

interface Client {
    id: number;
    name: string;
}

interface Provider {
    id: number;
    name: string;
}

interface Contact {
    id: number;
    client_id: number;
    name: string;
    email: string;
    phone: string;
    position: string;
}

interface Lead {
    id: number;
    company_name: string;
}

export default function Calendar() {
    const { t } = useTranslation();
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [providers, setProviders] = useState<Provider[]>([]);
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [leads, setLeads] = useState<Lead[]>([]);
    const [projects, setProjects] = useState<ProjectItem[]>([]);
    const [loading, setLoading] = useState(true);

    const [viewMode, setViewMode] = useState<"list" | "calendar" | "week" | "kanban">("week");

    // Helper: format Date as local "YYYY-MM-DDTHH:MM" for datetime-local inputs
    const toLocalISOString = (d: Date) => {
        const pad = (n: number) => n.toString().padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [currentWeek, setCurrentWeek] = useState(new Date());
    const [filterType, setFilterType] = useState<string>("all");
    const [filterStatus, setFilterStatus] = useState<string>("all");

    // Notes & Status UI state
    const [expandedEventId, setExpandedEventId] = useState<number | null>(null);
    const [noteInputs, setNoteInputs] = useState<Record<number, string>>({});
    const [statusModal, setStatusModal] = useState<{ eventId: number; status: string } | null>(null);
    const [statusReason, setStatusReason] = useState("");
    const [editingNoteId, setEditingNoteId] = useState<number | null>(null);
    const [editNoteContent, setEditNoteContent] = useState("");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingEventId, setEditingEventId] = useState<number | null>(null);
    const [entityType, setEntityType] = useState<"account" | "lead">("account");
    const [formData, setFormData] = useState({
        title: "",
        description: "",
        start_date: toLocalISOString(new Date()),
        end_date: toLocalISOString(new Date(Date.now() + 60 * 60 * 1000)),
        related_to: "",
        color: "#3788d8",
        client_id: "" as number | "",
        contact_id: "" as number | "",
        lead_id: "" as number | "",
        call_url: "",
        is_recurring: false,
        recurrence_pattern: "",
        project_id: "" as number | "",
    });

    // Add Invoice State for Autogeneration
    const [generateInvoice, setGenerateInvoice] = useState(false);
    const [invoiceAmount, setInvoiceAmount] = useState<number>(0);
    const [invoiceType, setInvoiceType] = useState<"issued" | "received">("issued");
    const [relatedClientId, setRelatedClientId] = useState<number | "">("");
    const [relatedProviderId, setRelatedProviderId] = useState<number | "">("");

    // Drag & Drop state
    const dragEventRef = useRef<CalendarEvent | null>(null);
    const [dragOverCell, setDragOverCell] = useState<string | null>(null);
    const [draggedKanbanEventId, setDraggedKanbanEventId] = useState<number | null>(null);

    // Quick Add Contact State
    const [isContactModalOpen, setIsContactModalOpen] = useState(false);
    const [contactFormData, setContactFormData] = useState({
        name: "",
        email: "",
        phone: "",
        position: ""
    });

    const [searchParams, setSearchParams] = useSearchParams();

    useEffect(() => {
        fetchData();
    }, []);

    // Auto-open modal from contact page deep link
    useEffect(() => {
        const contactId = searchParams.get('contact_id');
        const clientId = searchParams.get('client_id');
        if (contactId) {
            openAddModal();
            setFormData(prev => ({
                ...prev,
                contact_id: Number(contactId),
                client_id: clientId ? Number(clientId) : '',
                related_to: 'Meeting',
            }));
            setEntityType('account');
            // Clean URL
            setSearchParams({});
        }
    }, [searchParams]);

    const fetchData = async () => {
        try {
            const [eventsRes, clipRes, provRes, contRes, leadsRes, projRes] = await Promise.all([
                api.get("/calendar/"),
                api.get("/clients/"),
                api.get("/providers/"),
                api.get("/contacts/"),
                api.get("/leads/"),
                api.get("/projects/").catch(() => ({ data: [] })),
            ]);
            setEvents(eventsRes.data);
            setClients(clipRes.data);
            setProviders(provRes.data);
            setContacts(contRes.data);
            setLeads(leadsRes.data);
            setProjects(projRes.data);
        } catch (error) {
            console.error("Failed to fetch data", error);
        } finally {
            setLoading(false);
        }
    };

    const openAddModal = (initialDate?: Date) => {
        const start = initialDate ? new Date(initialDate) : new Date();
        const end = initialDate ? new Date(initialDate.getTime() + 60 * 60 * 1000) : new Date(new Date().getTime() + 60 * 60 * 1000);

        setEditingEventId(null);
        setFormData({
            title: "",
            description: "",
            start_date: toLocalISOString(start),
            end_date: toLocalISOString(end),
            related_to: "Meeting",
            color: "#3788d8",
            client_id: "",
            contact_id: "",
            lead_id: "",
            call_url: "",
            is_recurring: false,
            recurrence_pattern: "",
            project_id: "",
        });
        setEntityType("account");
        setGenerateInvoice(false);
        setInvoiceAmount(0);
        setRelatedClientId("");
        setRelatedProviderId("");
        setIsModalOpen(true);
    };

    const openEditModal = (event: CalendarEvent) => {
        setEditingEventId(event.id);
        setFormData({
            title: event.title,
            description: event.description || "",
            start_date: event.start_date.slice(0, 16),
            end_date: event.end_date.slice(0, 16),
            related_to: event.related_to || "",
            color: event.color || "#3788d8",
            client_id: event.client_id || "",
            contact_id: event.contact_id || "",
            lead_id: event.lead_id || "",
            call_url: event.call_url || "",
            is_recurring: event.is_recurring || false,
            recurrence_pattern: event.recurrence_pattern || "",
            project_id: event.project_id || "",
        });
        setEntityType(event.lead_id ? "lead" : "account");
        setGenerateInvoice(false);
        setIsModalOpen(true);
    };

    const handleDelete = async (id: number) => {
        if (confirm("Are you sure you want to delete this event?")) {
            try {
                await api.delete(`/calendar/${id}`);
                fetchData();
            } catch (error) {
                console.error("Delete failed", error);
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const payload = {
                title: formData.title,
                description: formData.description,
                start_date: formData.start_date,
                end_date: formData.end_date,
                related_to: formData.related_to,
                color: formData.color,
                client_id: formData.client_id ? Number(formData.client_id) : null,
                contact_id: formData.contact_id ? Number(formData.contact_id) : null,
                lead_id: formData.lead_id ? Number(formData.lead_id) : null,
                call_url: formData.related_to === 'Call' ? formData.call_url || null : null,
                is_recurring: formData.related_to === 'Call' ? formData.is_recurring : false,
                recurrence_pattern: formData.related_to === 'Call' && formData.is_recurring ? formData.recurrence_pattern || null : null,
                project_id: formData.related_to === 'Call' && formData.project_id ? Number(formData.project_id) : null,
            };

            if (editingEventId) {
                await api.put(`/calendar/${editingEventId}`, payload);
            } else {
                await api.post("/calendar/", payload);

                // Autogenerate Invoice if requested
                if (generateInvoice && formData.related_to === "Billing") {

                    // First ensure a "Por Facturar" status exists
                    let statusId = null;
                    try {
                        const statusesRes = await api.get("/invoices/statuses");
                        const pendingStatus = statusesRes.data.find((s: any) => s.name.toLowerCase() === "por facturar" || s.name.toLowerCase() === "pending");

                        if (pendingStatus) {
                            statusId = pendingStatus.id;
                        } else {
                            // Create the status if it doesnt exist
                            const newStatusRes = await api.post("/invoices/statuses/", {
                                name: "Por Facturar",
                                description: "Autogenerated Status",
                                color_code: "#F59E0B" // Orange
                            });
                            statusId = newStatusRes.data.id;
                        }
                    } catch (err) {
                        console.error("Failed to setup status for auto-invoice", err);
                    }

                    const invoicePayload = {
                        invoice_number: `AUTO-${new Date().getTime().toString().slice(-6)}`,
                        amount: invoiceAmount,
                        type: invoiceType,
                        issue_date: new Date(formData.start_date).toISOString().split('T')[0],
                        due_date: new Date(formData.end_date).toISOString().split('T')[0],
                        notes: `Autogenerated from Calendar Event: ${formData.title}`,
                        status_id: statusId,
                        client_id: invoiceType === 'issued' && relatedClientId ? Number(relatedClientId) : null,
                        provider_id: invoiceType === 'received' && relatedProviderId ? Number(relatedProviderId) : null,
                    };

                    await api.post("/invoices/", invoicePayload);
                }
            }
            setIsModalOpen(false);
            fetchData();
        } catch (error) {
            console.error("Submit failed", error);
            alert("An error occurred while saving.");
        }
    };

    const handleQuickAddContact = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (!formData.client_id) {
                alert("Please select a client first before creating a contact.");
                return;
            }
            const payload = {
                client_id: Number(formData.client_id),
                ...contactFormData
            };
            const res = await api.post("/contacts/", payload);
            setContacts([...contacts, res.data]);
            setFormData({ ...formData, contact_id: res.data.id });
            setIsContactModalOpen(false);
            setContactFormData({ name: "", email: "", phone: "", position: "" });
        } catch (error) {
            console.error("Failed to quick add contact", error);
            alert("Failed to create contact.");
        }
    };

    // --- Note & Status Handlers ---
    const handleAddNote = async (eventId: number) => {
        const content = noteInputs[eventId]?.trim();
        if (!content) return;
        try {
            await api.post(`/calendar/${eventId}/notes`, { content });
            setNoteInputs({ ...noteInputs, [eventId]: "" });
            fetchData();
        } catch (error) {
            console.error("Failed to add note", error);
        }
    };

    const handleUpdateNote = async (eventId: number, noteId: number) => {
        const content = editNoteContent.trim();
        if (!content) return;
        try {
            await api.put(`/calendar/${eventId}/notes/${noteId}`, { content });
            setEditingNoteId(null);
            setEditNoteContent("");
            fetchData();
        } catch (error) {
            console.error("Failed to update note", error);
        }
    };

    const handleDeleteNote = async (eventId: number, noteId: number) => {
        try {
            await api.delete(`/calendar/${eventId}/notes/${noteId}`);
            fetchData();
        } catch (error) {
            console.error("Failed to delete note", error);
        }
    };

    const handleStatusChange = async (eventId: number, newStatus: string, reason: string) => {
        try {
            await api.put(`/calendar/${eventId}`, { status: newStatus, status_reason: reason || null });
            setStatusModal(null);
            setStatusReason("");
            fetchData();
        } catch (error) {
            console.error("Failed to update status", error);
        }
    };

    const handleCreateFollowUp = (event: CalendarEvent) => {
        openAddModal();
        const now = new Date();
        const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        setFormData({
            title: `${t('calendar.followUp')}: ${event.title}`,
            description: "",
            start_date: toLocalISOString(nextWeek),
            end_date: toLocalISOString(new Date(nextWeek.getTime() + 60 * 60 * 1000)),
            related_to: event.related_to || "",
            color: event.color || "#3788d8",
            client_id: event.client_id || "",
            contact_id: event.contact_id || "",
            lead_id: event.lead_id || "",
            call_url: event.call_url || "",
            is_recurring: event.is_recurring || false,
            recurrence_pattern: event.recurrence_pattern || "",
            project_id: event.project_id || "",
        });
        if (event.lead_id) {
            setEntityType("lead");
        } else {
            setEntityType("account");
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "completed":
                return { label: t('calendar.status.completed'), color: 'bg-green-100 text-green-800', icon: CheckCircle2 };
            case "postponed":
                return { label: t('calendar.status.postponed'), color: 'bg-yellow-100 text-yellow-800', icon: PauseCircle };
            case "cancelled":
                return { label: t('calendar.status.cancelled'), color: 'bg-red-100 text-red-800', icon: XCircle };
            default:
                return { label: t('calendar.status.pending'), color: 'bg-blue-100 text-blue-800', icon: Clock };
        }
    };

    // Sort events by date
    const sortedEvents = [...events].sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());

    const filteredEvents = sortedEvents
        .filter(e => filterType === "all" || e.related_to === filterType)
        .filter(e => filterStatus === "all" || (e.status || "pending") === filterStatus);

    const filterOptions = [
        { value: "all", label: t('calendar.filters.all') },
        { value: "Meeting", label: t('calendar.modal.meeting') },
        { value: "Call", label: "Llamada" },
        { value: "Billing", label: t('calendar.modal.billing') },
        { value: "Service Expiration", label: t('calendar.modal.expiration') },
        { value: "Other", label: t('calendar.modal.other') },
    ];

    const statusFilterOptions = [
        { value: "all", label: t('calendar.filters.all') },
        { value: "pending", label: t('calendar.status.pending') },
        { value: "completed", label: t('calendar.status.completed') },
        { value: "postponed", label: t('calendar.status.postponed') },
        { value: "cancelled", label: t('calendar.status.cancelled') },
    ];

    // ── Drag & Drop handlers ──
    const handleDragStart = (e: React.DragEvent, event: CalendarEvent) => {
        dragEventRef.current = event;
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', String(event.id));
        // Make the drag image slightly transparent
        if (e.currentTarget instanceof HTMLElement) {
            e.currentTarget.style.opacity = '0.5';
        }
    };

    const handleDragEnd = (e: React.DragEvent) => {
        if (e.currentTarget instanceof HTMLElement) {
            e.currentTarget.style.opacity = '1';
        }
        dragEventRef.current = null;
        setDragOverCell(null);
    };

    const handleDropOnDay = async (e: React.DragEvent, targetDay: Date) => {
        e.preventDefault();
        setDragOverCell(null);
        const event = dragEventRef.current;
        if (!event) return;
        dragEventRef.current = null;

        const oldStart = parseISO(event.start_date);
        const oldEnd = parseISO(event.end_date);
        const duration = oldEnd.getTime() - oldStart.getTime();

        // Keep the same time, just change the day
        const newStart = new Date(targetDay);
        newStart.setHours(oldStart.getHours(), oldStart.getMinutes(), 0, 0);
        const newEnd = new Date(newStart.getTime() + duration);

        try {
            await api.put(`/calendar/${event.id}`, {
                ...event,
                start_date: toLocalISOString(newStart),
                end_date: toLocalISOString(newEnd),
            });
            fetchData();
        } catch (err) {
            console.error('Failed to move event', err);
        }
    };

    const handleDropOnHourCell = async (e: React.DragEvent, targetDay: Date, targetHour: number) => {
        e.preventDefault();
        setDragOverCell(null);
        const event = dragEventRef.current;
        if (!event) return;
        dragEventRef.current = null;

        const oldStart = parseISO(event.start_date);
        const oldEnd = parseISO(event.end_date);
        const duration = oldEnd.getTime() - oldStart.getTime();

        const newStart = new Date(targetDay);
        newStart.setHours(targetHour, 0, 0, 0);
        const newEnd = new Date(newStart.getTime() + duration);

        try {
            await api.put(`/calendar/${event.id}`, {
                ...event,
                start_date: toLocalISOString(newStart),
                end_date: toLocalISOString(newEnd),
            });
            fetchData();
        } catch (err) {
            console.error('Failed to move event', err);
        }
    };

    const renderCalendar = () => {
        const monthStart = startOfMonth(currentMonth);
        const monthEnd = endOfMonth(monthStart);
        const startDate = startOfWeek(monthStart);
        const endDate = endOfWeek(monthEnd);

        const dateFormat = "d";
        const rows = [];
        let days = [];
        let day = startDate;
        let formattedDate = "";

        // Days of week header
        const daysOfWeek = [];
        let startDateOfWeek = startOfWeek(currentMonth);
        for (let i = 0; i < 7; i++) {
            daysOfWeek.push(
                <div className="col-span-1 text-center font-semibold text-xs text-gray-500 py-3 border-b border-gray-200 uppercase tracking-wider bg-gray-50" key={i}>
                    {format(addDays(startDateOfWeek, i), "EEE", { locale: es })}
                </div>
            );
        }

        while (day <= endDate) {
            for (let i = 0; i < 7; i++) {
                formattedDate = format(day, dateFormat);
                const cloneDay = day;

                // Get events for this day
                const dayEvents = events.filter(e => isSameDay(parseISO(e.start_date), cloneDay));

                days.push(
                    <div
                        className={`col-span-1 min-h-[120px] border-b border-r border-gray-100 p-1.5 transition-colors cursor-pointer flex flex-col ${!isSameMonth(day, monthStart)
                            ? "bg-gray-50/50 text-gray-400"
                            : isSameDay(day, new Date())
                                ? "bg-blue-50/10 text-blue-800 font-bold"
                                : "text-gray-700 bg-white"
                            } ${dragOverCell === `month-${cloneDay.toISOString()}` ? 'ring-2 ring-blue-400 ring-inset bg-blue-50' : 'hover:bg-gray-50'}`}
                        key={day.toString()}
                        onClick={() => openAddModal(cloneDay)}
                        onDragOver={(e) => { e.preventDefault(); setDragOverCell(`month-${cloneDay.toISOString()}`); }}
                        onDragLeave={() => setDragOverCell(null)}
                        onDrop={(e) => handleDropOnDay(e, cloneDay)}
                    >
                        <div className="flex justify-between items-start mb-1 px-1">
                            <span className={`text-xs ${isSameDay(day, new Date()) ? 'bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center shadow-sm' : 'p-1 font-medium text-gray-700'}`}>{formattedDate}</span>
                        </div>
                        <div className="flex flex-col gap-1 overflow-y-auto flex-1 max-h-28 scrollbar-thin scrollbar-thumb-gray-200">
                            {dayEvents.map(event => (
                                <div
                                    key={event.id}
                                    draggable
                                    onDragStart={(e) => { e.stopPropagation(); handleDragStart(e, event); }}
                                    onDragEnd={handleDragEnd}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        openEditModal(event);
                                    }}
                                    className="text-[10px] px-1.5 py-0.5 rounded truncate font-medium text-white shadow-sm hover:opacity-90 transition-opacity cursor-grab active:cursor-grabbing"
                                    style={{ backgroundColor: event.color || '#3788d8' }}
                                    title={`${event.title} (arrastrá para mover)`}
                                >
                                    {event.title}
                                </div>
                            ))}
                        </div>
                    </div>
                );
                day = addDays(day, 1);
            }
            rows.push(
                <div className="grid grid-cols-7" key={day.toString()}>
                    {days}
                </div>
            );
            days = [];
        }

        return (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-white">
                    <h2 className="text-xl font-bold text-gray-800 capitalize">{format(currentMonth, "MMMM yyyy", { locale: es })}</h2>
                    <div className="flex space-x-2">
                        <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors border border-gray-200 shadow-sm">
                            <ChevronLeft size={20} />
                        </button>
                        <button onClick={() => setCurrentMonth(new Date())} className="px-4 py-1.5 text-sm font-medium rounded-lg hover:bg-gray-100 text-gray-700 transition-colors border border-gray-200 shadow-sm bg-white">
                            Hoy
                        </button>
                        <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors border border-gray-200 shadow-sm">
                            <ChevronRight size={20} />
                        </button>
                    </div>
                </div>
                <div className="grid grid-cols-7 border-b border-gray-200">
                    {daysOfWeek}
                </div>
                <div>
                    {rows}
                </div>
            </div>
        );
    };

    const renderWeek = () => {
        const weekStart = startOfWeek(currentWeek, { locale: es });
        const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
        const hours = Array.from({ length: 24 }, (_, i) => i); // 0:00 - 23:00

        return (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-white">
                    <h2 className="text-xl font-bold text-gray-800 capitalize">
                        Semana del {format(weekStart, "d MMM", { locale: es })} al {format(addDays(weekStart, 6), "d MMM yyyy", { locale: es })}
                    </h2>
                    <div className="flex space-x-2">
                        <button onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600 border border-gray-200 shadow-sm"><ChevronLeft size={20} /></button>
                        <button onClick={() => setCurrentWeek(new Date())} className="px-4 py-1.5 text-sm font-medium rounded-lg hover:bg-gray-100 text-gray-700 border border-gray-200 shadow-sm bg-white">Hoy</button>
                        <button onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600 border border-gray-200 shadow-sm"><ChevronRight size={20} /></button>
                    </div>
                </div>
                <div className="overflow-auto max-h-[70vh]" ref={(el) => { if (el && !el.dataset.scrolled) { el.scrollTop = 8 * 48; el.dataset.scrolled = '1'; } }}>
                    <div className="grid grid-cols-8 border-b border-gray-200 sticky top-0 bg-gray-50 z-10">
                        <div className="p-2 text-center text-[10px] font-bold text-gray-400 border-r border-gray-200">Hora</div>
                        {days.map((d, i) => (
                            <div key={i} className={`p-2 text-center border-r border-gray-200 ${isSameDay(d, new Date()) ? 'bg-blue-50' : ''}`}>
                                <div className="text-[10px] font-bold text-gray-400 uppercase">{format(d, "EEE", { locale: es })}</div>
                                <div className={`text-sm font-bold ${isSameDay(d, new Date()) ? 'text-blue-600' : 'text-gray-700'}`}>{format(d, "d")}</div>
                            </div>
                        ))}
                    </div>
                    {hours.map(h => (
                        <div key={h} className="grid grid-cols-8 border-b border-gray-50">
                            <div className="p-1 text-[10px] text-gray-400 text-right pr-2 border-r border-gray-100 bg-gray-50/50">{h}:00</div>
                            {days.map((d, di) => {
                                const dayEvts = events.filter(ev => {
                                    const sd = parseISO(ev.start_date);
                                    return isSameDay(sd, d) && sd.getHours() === h;
                                });
                                return (
                                    <div key={di} className={`min-h-[48px] border-r border-gray-50 p-0.5 cursor-pointer hover:bg-blue-50/30 ${isSameDay(d, new Date()) ? 'bg-blue-50/20' : ''} ${dragOverCell === `week-${di}-${h}` ? 'ring-2 ring-blue-400 ring-inset bg-blue-50' : ''}`}
                                        onClick={() => {
                                            const dt = new Date(d); dt.setHours(h, 0, 0, 0);
                                            openAddModal(dt);
                                        }}
                                        onDragOver={(e) => { e.preventDefault(); setDragOverCell(`week-${di}-${h}`); }}
                                        onDragLeave={() => setDragOverCell(null)}
                                        onDrop={(e) => handleDropOnHourCell(e, d, h)}
                                    >
                                        {dayEvts.map(ev => (
                                            <div key={ev.id}
                                                draggable
                                                onDragStart={(e) => { e.stopPropagation(); handleDragStart(e, ev); }}
                                                onDragEnd={handleDragEnd}
                                                onClick={e => { e.stopPropagation(); openEditModal(ev); }}
                                                className="text-[10px] px-1.5 py-0.5 rounded truncate font-medium text-white shadow-sm hover:opacity-90 mb-0.5 cursor-grab active:cursor-grabbing"
                                                style={{ backgroundColor: ev.color || '#3788d8' }} title={`${ev.title} (arrastrá para mover)`}>
                                                {ev.title}
                                            </div>
                                        ))}
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100 gap-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-gray-900">{t('calendar.title')}</h2>
                    <p className="text-sm text-gray-500">{t('calendar.description')}</p>
                </div>
                <div className="flex items-center w-full sm:w-auto space-x-3">
                    <div className="flex bg-gray-100 p-1 rounded-lg border border-gray-200">
                        <button
                            onClick={() => setViewMode("week")}
                            className={`flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === 'week' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            <Clock size={16} className="mr-1.5" />
                            Semana
                        </button>
                        <button
                            onClick={() => setViewMode("calendar")}
                            className={`flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === 'calendar' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            <CalendarIcon size={16} className="mr-1.5" />
                            Mes
                        </button>
                        <button
                            onClick={() => setViewMode("list")}
                            className={`flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === 'list' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            <ListIcon size={16} className="mr-1.5" />
                            Lista
                        </button>
                        <button
                            onClick={() => setViewMode("kanban")}
                            className={`flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === 'kanban' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            <LayoutGrid size={16} className="mr-1.5" />
                            Kanban
                        </button>
                    </div>
                    <button
                        onClick={() => openAddModal()}
                        className="flex-shrink-0 flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 flex-1 sm:flex-none justify-center rounded-lg font-medium transition-colors shadow-sm"
                    >
                        <Plus size={18} />
                        <span>{t('calendar.newBtn')}</span>
                    </button>
                </div>
            </div>

            {viewMode === "list" ? (
                <div className="space-y-4">
                    {/* Type Filter Buttons */}
                    <div className="flex flex-wrap gap-2 bg-white p-3 rounded-xl shadow-sm border border-gray-100">
                        <span className="text-xs font-semibold text-gray-400 uppercase mr-2 self-center">{t('calendar.filters.type')}:</span>
                        {filterOptions.map(opt => (
                            <button
                                key={opt.value}
                                onClick={() => setFilterType(opt.value)}
                                className={`px-3 py-1 rounded-full text-xs font-medium transition-all border ${filterType === opt.value
                                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                                    }`}
                            >
                                {opt.label}
                                <span className={`ml-1 text-xs ${filterType === opt.value ? 'text-blue-200' : 'text-gray-400'}`}>
                                    {opt.value === "all" ? sortedEvents.length : sortedEvents.filter(e => e.related_to === opt.value).length}
                                </span>
                            </button>
                        ))}
                    </div>

                    {/* Status Filter Buttons */}
                    <div className="flex flex-wrap gap-2 bg-white p-3 rounded-xl shadow-sm border border-gray-100">
                        <span className="text-xs font-semibold text-gray-400 uppercase mr-2 self-center">{t('calendar.filters.status')}:</span>
                        {statusFilterOptions.map(opt => (
                            <button
                                key={opt.value}
                                onClick={() => setFilterStatus(opt.value)}
                                className={`px-3 py-1 rounded-full text-xs font-medium transition-all border ${filterStatus === opt.value
                                    ? 'bg-gray-800 text-white border-gray-800 shadow-sm'
                                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                                    }`}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>

                    <div className="grid gap-4">
                        {loading ? (
                            <div className="p-8 text-center text-gray-500 bg-white rounded-xl shadow-sm border border-gray-100">{t('calendar.loading')}</div>
                        ) : filteredEvents.length === 0 ? (
                            <div className="p-8 text-center text-gray-500 bg-white rounded-xl shadow-sm border border-gray-100">
                                {t('calendar.empty')}
                            </div>
                        ) : (
                            filteredEvents.map((event) => {
                                const isPastDue = new Date(event.end_date) < new Date();
                                const eventStatus = event.status || "pending";
                                const badge = getStatusBadge(eventStatus);
                                const StatusIcon = badge.icon;
                                const isExpanded = expandedEventId === event.id;
                                const isVirtual = event.id < 0;

                                return (
                                    <div
                                        key={event.id}
                                        className={`bg-white rounded-xl shadow-sm border overflow-hidden transition-all hover:shadow-md
                                            ${isPastDue && eventStatus === "pending" ? "border-red-200" : "border-gray-100"}
                                        `}
                                    >
                                        <div className="flex items-stretch">
                                            {/* Color Bar */}
                                            <div className="w-1.5 shrink-0" style={{ backgroundColor: event.color }} />

                                            <div className="flex-1 p-4">
                                                {/* Header Row */}
                                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                                    <div className="flex-1">
                                                        <div className="flex flex-wrap items-center gap-2 mb-1">
                                                            <h3 className="text-base font-bold text-gray-900">{event.title}</h3>
                                                            {/* Status Badge */}
                                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${badge.color}`}>
                                                                <StatusIcon size={12} className="mr-1" />
                                                                {badge.label}
                                                            </span>
                                                            {isPastDue && eventStatus === "pending" && (
                                                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                                                    <AlertCircle size={12} className="mr-1" /> {t('calendar.overdue')}
                                                                </span>
                                                            )}
                                                        </div>
                                                        {event.description && (
                                                            <p className="text-sm text-gray-500 mb-2">{event.description}</p>
                                                        )}
                                                        {event.status_reason && (
                                                            <p className="text-xs text-gray-500 italic mb-2">
                                                                {t('calendar.status.reason')}: {event.status_reason}
                                                            </p>
                                                        )}
                                                        {/* Meta Row */}
                                                        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                                                            <div className="flex items-center">
                                                                <CalendarIcon size={12} className="mr-1 text-gray-400" />
                                                                {new Date(event.start_date).toLocaleDateString()}
                                                            </div>
                                                            <div className="flex items-center">
                                                                <Clock size={12} className="mr-1 text-gray-400" />
                                                                {new Date(event.start_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                {" - "}
                                                                {new Date(event.end_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                            </div>
                                                            {event.related_to && (
                                                                <span className="border border-gray-200 px-2 py-0.5 rounded-full bg-gray-50 text-xs text-gray-600">
                                                                    {event.related_to}
                                                                </span>
                                                            )}
                                                            {event.client_id && (
                                                                <div className="flex items-center">
                                                                    <Building2 size={12} className="mr-1 text-gray-400" />
                                                                    <span className="font-medium">{clients.find(c => c.id === event.client_id)?.name || t('calendar.unknownClient')}</span>
                                                                </div>
                                                            )}
                                                            {event.lead_id && (
                                                                <div className="flex items-center">
                                                                    <Zap size={12} className="mr-1 text-purple-400" />
                                                                    <span className="font-medium">{leads.find(l => l.id === event.lead_id)?.company_name || 'Lead'}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Action Buttons */}
                                                    {!isVirtual && (
                                                        <div className="flex items-center gap-1 shrink-0">
                                                            {/* Status Change Dropdown */}
                                                            {(event.related_to === "Meeting" || event.related_to === "Billing") && eventStatus === "pending" && (
                                                                <div className="flex gap-1">
                                                                    <button onClick={() => handleStatusChange(event.id, "completed", "")}
                                                                        className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors" title={t('calendar.status.completed')}>
                                                                        <CheckCircle2 size={16} />
                                                                    </button>
                                                                    <button onClick={() => { setStatusModal({ eventId: event.id, status: "postponed" }); setStatusReason(""); }}
                                                                        className="p-1.5 text-gray-400 hover:text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors" title={t('calendar.status.postponed')}>
                                                                        <PauseCircle size={16} />
                                                                    </button>
                                                                    <button onClick={() => { setStatusModal({ eventId: event.id, status: "cancelled" }); setStatusReason(""); }}
                                                                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title={t('calendar.status.cancelled')}>
                                                                        <XCircle size={16} />
                                                                    </button>
                                                                </div>
                                                            )}
                                                            {/* Follow-up */}
                                                            <button onClick={() => handleCreateFollowUp(event)}
                                                                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title={t('calendar.followUp')}>
                                                                <CornerDownRight size={16} />
                                                            </button>
                                                            {/* Notes toggle */}
                                                            <button onClick={() => setExpandedEventId(isExpanded ? null : event.id)}
                                                                className={`p-1.5 rounded-lg transition-colors ${isExpanded ? 'text-blue-600 bg-blue-50' : 'text-gray-400 hover:text-blue-600 hover:bg-blue-50'}`}
                                                                title={t('calendar.notes.title')}>
                                                                <MessageSquare size={16} />
                                                                {(event.notes?.length || 0) > 0 && (
                                                                    <span className="ml-0.5 text-xs">{event.notes?.length}</span>
                                                                )}
                                                            </button>
                                                            <div className="w-px h-5 bg-gray-200 mx-1" />
                                                            <button onClick={() => openEditModal(event)}
                                                                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title={t("common.edit")}>
                                                                <Pencil size={16} />
                                                            </button>
                                                            <button onClick={() => handleDelete(event.id)}
                                                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title={t("common.delete")}>
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Expandable Notes Panel */}
                                                {isExpanded && !isVirtual && (
                                                    <div className="mt-3 pt-3 border-t border-gray-100">
                                                        <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
                                                            <MessageSquare size={14} className="mr-1.5" />
                                                            {t('calendar.notes.title')} ({event.notes?.length || 0})
                                                        </h4>
                                                        {/* Add Note Textarea */}
                                                        <div className="flex gap-2 mb-3">
                                                            <textarea
                                                                value={noteInputs[event.id] || ""}
                                                                onChange={(e) => setNoteInputs({ ...noteInputs, [event.id]: e.target.value })}
                                                                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleAddNote(event.id); } }}
                                                                placeholder={t('calendar.notes.placeholder')}
                                                                rows={2}
                                                                className="flex-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                                                            />
                                                            <button onClick={() => handleAddNote(event.id)}
                                                                className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors self-end">
                                                                <Send size={14} />
                                                            </button>
                                                        </div>
                                                        <p className="text-xs text-gray-400 -mt-2 mb-2">{t('calendar.notes.hint')}</p>
                                                        {/* Notes List */}
                                                        <div className="space-y-2 max-h-64 overflow-y-auto">
                                                            {(event.notes || []).map(note => (
                                                                <div key={note.id} className="bg-gray-50 p-2.5 rounded-lg group">
                                                                    {editingNoteId === note.id ? (
                                                                        <div>
                                                                            <textarea
                                                                                value={editNoteContent}
                                                                                onChange={(e) => setEditNoteContent(e.target.value)}
                                                                                rows={3}
                                                                                className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                                                                                autoFocus
                                                                            />
                                                                            <div className="flex justify-end gap-1 mt-1">
                                                                                <button onClick={() => { setEditingNoteId(null); setEditNoteContent(""); }}
                                                                                    className="px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 rounded transition-colors">
                                                                                    {t('common.cancel')}
                                                                                </button>
                                                                                <button onClick={() => handleUpdateNote(event.id, note.id)}
                                                                                    className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors">
                                                                                    {t('common.save')}
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                    ) : (
                                                                        <div className="flex items-start justify-between">
                                                                            <div className="flex-1">
                                                                                <p className="text-sm text-gray-800 whitespace-pre-wrap">{note.content}</p>
                                                                                <p className="text-xs text-gray-400 mt-0.5">
                                                                                    {new Date(note.created_at).toLocaleString()}
                                                                                </p>
                                                                            </div>
                                                                            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all shrink-0">
                                                                                <button onClick={() => { setEditingNoteId(note.id); setEditNoteContent(note.content); }}
                                                                                    className="p-1 text-gray-300 hover:text-blue-500">
                                                                                    <Pencil size={13} />
                                                                                </button>
                                                                                <button onClick={() => handleDeleteNote(event.id, note.id)}
                                                                                    className="p-1 text-gray-300 hover:text-red-500">
                                                                                    <X size={14} />
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ))}
                                                            {(!event.notes || event.notes.length === 0) && (
                                                                <p className="text-xs text-gray-400 text-center py-2">{t('calendar.notes.empty')}</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )
                        }
                    </div>

                    {/* Status Change Modal */}
                    {statusModal && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
                            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
                                <div className="px-6 py-4 bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center"><AlertCircle size={20} className="text-white" /></div>
                                        <div>
                                            <h3 className="text-lg font-bold text-white">
                                                {statusModal.status === "postponed" ? t('calendar.status.postponed') : t('calendar.status.cancelled')}
                                            </h3>
                                            <p className="text-blue-100 text-xs">{t('calendar.status.reasonLabel')}</p>
                                        </div>
                                    </div>
                                    <button onClick={() => { setStatusModal(null); setStatusReason(""); }} className="p-1.5 hover:bg-white/20 rounded-lg"><X size={18} className="text-white" /></button>
                                </div>
                                <div className="p-6">
                                    <div className="border border-blue-100 rounded-xl p-4 bg-blue-50/30">
                                        <textarea
                                            value={statusReason}
                                            onChange={(e) => setStatusReason(e.target.value)}
                                            rows={3}
                                            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm resize-none bg-white"
                                            placeholder={t('calendar.status.reasonPlaceholder')}
                                            autoFocus
                                        />
                                    </div>
                                </div>
                                <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
                                    <button onClick={() => { setStatusModal(null); setStatusReason(""); }}
                                        className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">
                                        {t('common.cancel')}
                                    </button>
                                    <button onClick={() => handleStatusChange(statusModal.eventId, statusModal.status, statusReason)}
                                        className="px-4 py-2 text-sm font-bold bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:shadow-md transition-all">
                                        {t('common.save')}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            ) : viewMode === "calendar" ? (
                renderCalendar()
            ) : viewMode === "kanban" ? (
                /* ══════ KANBAN VIEW ══════ */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                    {[
                        { status: 'pending', label: 'Pendiente', icon: '⏳', gradient: 'from-blue-500 to-cyan-600', bg: 'bg-blue-50', border: 'border-blue-200' },
                        { status: 'completed', label: 'Completada', icon: '✅', gradient: 'from-emerald-500 to-green-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
                        { status: 'postponed', label: 'Pospuesta', icon: '⏸️', gradient: 'from-amber-500 to-yellow-600', bg: 'bg-amber-50', border: 'border-amber-200' },
                        { status: 'cancelled', label: 'Cancelada', icon: '❌', gradient: 'from-red-500 to-rose-600', bg: 'bg-red-50', border: 'border-red-200' },
                    ].map(col => {
                        const columnEvents = filteredEvents.filter(e => (e.status || 'pending') === col.status);
                        return (
                            <div
                                key={col.status}
                                className={`rounded-2xl border-2 ${col.border} ${col.bg} min-h-[400px] flex flex-col transition-all duration-200`}
                                onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('ring-2', 'ring-offset-2', 'ring-blue-400', 'scale-[1.01]'); }}
                                onDragLeave={(e) => { e.currentTarget.classList.remove('ring-2', 'ring-offset-2', 'ring-blue-400', 'scale-[1.01]'); }}
                                onDrop={(e) => {
                                    e.preventDefault();
                                    e.currentTarget.classList.remove('ring-2', 'ring-offset-2', 'ring-blue-400', 'scale-[1.01]');
                                    if (draggedKanbanEventId !== null) {
                                        handleStatusChange(draggedKanbanEventId, col.status, '');
                                        setDraggedKanbanEventId(null);
                                    }
                                }}
                            >
                                {/* Column header */}
                                <div className={`px-4 py-3 bg-gradient-to-r ${col.gradient} rounded-t-xl`}>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="text-lg">{col.icon}</span>
                                            <h3 className="font-bold text-white text-sm">{col.label}</h3>
                                        </div>
                                        <span className="bg-white/20 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                                            {columnEvents.length}
                                        </span>
                                    </div>
                                </div>

                                {/* Column body */}
                                <div className="flex-1 p-3 space-y-3 overflow-y-auto max-h-[calc(100vh-320px)]">
                                    {columnEvents.length === 0 && (
                                        <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                                            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-2">
                                                <CalendarIcon size={20} className="text-gray-300" />
                                            </div>
                                            <p className="text-xs">Sin actividades</p>
                                            <p className="text-[10px] mt-0.5">Arrastrá aquí para mover</p>
                                        </div>
                                    )}
                                    {columnEvents.map(event => {
                                        const isPastDue = new Date(event.end_date) < new Date() && (event.status || 'pending') === 'pending';
                                        return (
                                            <div
                                                key={event.id}
                                                draggable
                                                onDragStart={() => setDraggedKanbanEventId(event.id)}
                                                onDragEnd={() => setDraggedKanbanEventId(null)}
                                                className={`bg-white rounded-xl border shadow-sm p-4 cursor-grab active:cursor-grabbing hover:shadow-md transition-all duration-200 group ${draggedKanbanEventId === event.id ? 'opacity-50 scale-95 rotate-1' : ''
                                                    } ${isPastDue ? 'border-red-200' : 'border-gray-100'}`}
                                            >
                                                {/* Color bar + title */}
                                                <div className="flex items-start gap-2 mb-2">
                                                    <div className="w-1 h-8 rounded-full flex-shrink-0 mt-0.5" style={{ backgroundColor: event.color || '#3788d8' }} />
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-1.5">
                                                            <GripVertical size={12} className="text-gray-300 group-hover:text-gray-400 flex-shrink-0" />
                                                            <h4 className="font-bold text-gray-900 text-sm truncate">{event.title}</h4>
                                                        </div>
                                                        {event.related_to && (
                                                            <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-gray-100 text-[9px] text-gray-600 font-medium mt-1">
                                                                {event.related_to}
                                                            </span>
                                                        )}
                                                    </div>
                                                    {isPastDue && (
                                                        <span className="text-[9px] px-1.5 py-0.5 bg-red-100 text-red-600 rounded font-medium flex-shrink-0">Vencida</span>
                                                    )}
                                                </div>

                                                {/* Description */}
                                                {event.description && (
                                                    <p className="text-[10px] text-gray-500 mb-2 line-clamp-2 leading-relaxed pl-3">{event.description}</p>
                                                )}

                                                {/* Date/time */}
                                                <div className="bg-gray-50 rounded-lg px-3 py-2 mb-2">
                                                    <div className="flex items-center gap-2 text-[10px] text-gray-600">
                                                        <CalendarIcon size={10} className="text-gray-400" />
                                                        <span>{new Date(event.start_date).toLocaleDateString('es-AR')}</span>
                                                        <Clock size={10} className="text-gray-400 ml-1" />
                                                        <span>
                                                            {new Date(event.start_date).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                                                            {' - '}
                                                            {new Date(event.end_date).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Entity info */}
                                                {(event.client_id || event.lead_id) && (
                                                    <div className="flex items-center gap-1.5 text-[10px] text-gray-500 mb-2">
                                                        <Building2 size={10} className="text-gray-400" />
                                                        <span className="truncate">
                                                            {event.client_id ? clients.find(c => c.id === event.client_id)?.name || '' : ''}
                                                            {event.lead_id ? leads.find(l => l.id === event.lead_id)?.company_name || '' : ''}
                                                        </span>
                                                    </div>
                                                )}

                                                {/* Notes count */}
                                                {event.notes && event.notes.length > 0 && (
                                                    <div className="flex items-center gap-1 text-[10px] text-gray-400 mb-2">
                                                        <MessageSquare size={10} />
                                                        <span>{event.notes.length} nota{event.notes.length !== 1 ? 's' : ''}</span>
                                                    </div>
                                                )}

                                                {/* Actions */}
                                                <div className="flex items-center justify-end gap-1 pt-2 border-t border-gray-50 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={(e) => { e.stopPropagation(); handleCreateFollowUp(event); }} className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg" title="Seguimiento">
                                                        <CornerDownRight size={14} />
                                                    </button>
                                                    <button onClick={(e) => { e.stopPropagation(); openEditModal(event); }} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg" title="Editar">
                                                        <Pencil size={14} />
                                                    </button>
                                                    <button onClick={(e) => { e.stopPropagation(); handleDelete(event.id); }} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg" title="Eliminar">
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                renderWeek()
            )}

            {/* Modal Form */}
            {
                isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
                        <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden max-h-[90vh] overflow-y-auto flex flex-col">
                            <div className="px-6 py-4 bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-between shrink-0">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center"><CalendarIcon size={20} className="text-white" /></div>
                                    <div>
                                        <h3 className="text-lg font-bold text-white">
                                            {editingEventId ? t('calendar.modal.editTitle') : t('calendar.modal.newTitle')}
                                        </h3>
                                        <p className="text-blue-100 text-xs">Complete los datos del evento</p>
                                    </div>
                                </div>
                                <button onClick={() => setIsModalOpen(false)} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"><X size={18} className="text-white" /></button>
                            </div>
                            <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('calendar.modal.titleLabel')}</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.title}
                                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                        className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                        placeholder="Domain Renewal"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">{t('calendar.modal.startDateTime')}</label>
                                        <input
                                            type="datetime-local"
                                            required
                                            value={formData.start_date}
                                            onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                                            className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">{t('calendar.modal.endDateTime')}</label>
                                        <input
                                            type="datetime-local"
                                            required
                                            value={formData.end_date}
                                            onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                                            className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                        />
                                    </div>
                                </div>

                                {/* Entity Type Toggle */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('calendar.modal.entityType')}</label>
                                    <div className="flex bg-gray-100 p-1 rounded-lg border border-gray-200">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setEntityType("account");
                                                setFormData({ ...formData, lead_id: "" });
                                            }}
                                            className={`flex-1 flex items-center justify-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${entityType === 'account' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                        >
                                            <Building2 size={16} className="mr-1.5" />
                                            {t('calendar.modal.entityAccount')}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setEntityType("lead");
                                                setFormData({ ...formData, client_id: "", contact_id: "" });
                                            }}
                                            className={`flex-1 flex items-center justify-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${entityType === 'lead' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                        >
                                            <Zap size={16} className="mr-1.5" />
                                            {t('calendar.modal.entityLead')}
                                        </button>
                                    </div>
                                </div>

                                {/* Account selectors */}
                                {entityType === "account" && (
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">{t('calendar.modal.clientAssoc')}</label>
                                            <select
                                                value={formData.client_id}
                                                onChange={(e) => setFormData({ ...formData, client_id: e.target.value ? Number(e.target.value) : "", contact_id: "" })}
                                                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                            >
                                                <option value="">{t('calendar.modal.noClient')}</option>
                                                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                            </select>
                                        </div>
                                        <div className="relative">
                                            <label className="block text-sm font-medium text-gray-700 mb-1">{t('calendar.modal.contactAssoc')}</label>
                                            <div className="flex space-x-2">
                                                <select
                                                    value={formData.contact_id}
                                                    onChange={(e) => setFormData({ ...formData, contact_id: e.target.value ? Number(e.target.value) : "" })}
                                                    disabled={!formData.client_id}
                                                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-50"
                                                >
                                                    <option value="">{formData.client_id ? t('common.selectContact') : t('common.selectClientFirst')}</option>
                                                    {contacts.filter(c => c.client_id === formData.client_id).map(c => (
                                                        <option key={c.id} value={c.id}>{c.name}</option>
                                                    ))}
                                                </select>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        if (!formData.client_id) {
                                                            alert("Please select a client first.");
                                                            return;
                                                        }
                                                        setIsContactModalOpen(true);
                                                    }}
                                                    className="p-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors border border-blue-200 flex-shrink-0"
                                                    title={t("calendar.quickContact.title")}
                                                >
                                                    <Plus size={20} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Lead selector */}
                                {entityType === "lead" && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">{t('calendar.modal.leadAssoc')}</label>
                                        <select
                                            value={formData.lead_id}
                                            onChange={(e) => setFormData({ ...formData, lead_id: e.target.value ? Number(e.target.value) : "" })}
                                            className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                        >
                                            <option value="">{t('calendar.modal.noLead')}</option>
                                            {leads.map(l => <option key={l.id} value={l.id}>{l.company_name}</option>)}
                                        </select>
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">{t('calendar.modal.relatedTo')}</label>
                                        <select
                                            value={formData.related_to}
                                            onChange={(e) => setFormData({ ...formData, related_to: e.target.value })}
                                            className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                        >
                                            <option value="">{t('calendar.modal.none')}</option>
                                            <option value="Meeting">{t('calendar.modal.meeting')}</option>
                                            <option value="Call">Llamada</option>
                                            <option value="Billing">{t('calendar.modal.billing')}</option>
                                            <option value="Service Expiration">{t('calendar.modal.expiration')}</option>
                                            <option value="Other">{t('calendar.modal.other')}</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">{t('calendar.modal.color')}</label>
                                        <input
                                            type="color"
                                            value={formData.color}
                                            onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                                            className="w-full h-10 px-1 py-1 bg-gray-50 border border-gray-200 rounded-lg cursor-pointer"
                                        />
                                    </div>
                                </div>

                                {/* Call-specific fields */}
                                {formData.related_to === "Call" && (
                                    <div className="p-4 bg-violet-50 rounded-lg border border-violet-100 space-y-4">
                                        <h4 className="text-sm font-semibold text-violet-900 flex items-center">
                                            <Zap size={16} className="mr-2" />
                                            Detalles de Llamada
                                        </h4>
                                        <div>
                                            <label className="block text-xs font-medium text-violet-800 mb-1">URL de la Llamada (Zoom, Meet, Teams, etc.)</label>
                                            <input
                                                type="url"
                                                value={formData.call_url}
                                                onChange={(e) => setFormData({ ...formData, call_url: e.target.value })}
                                                placeholder="https://zoom.us/j/... o https://meet.google.com/..."
                                                className="w-full px-3 py-2 text-sm bg-white border border-violet-200 rounded-md focus:ring-1 focus:ring-violet-500 outline-none"
                                            />
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-medium text-violet-800">¿Es una llamada recurrente?</span>
                                            <label className="flex items-center cursor-pointer">
                                                <div className="relative">
                                                    <input
                                                        type="checkbox"
                                                        className="sr-only"
                                                        checked={formData.is_recurring}
                                                        onChange={(e) => setFormData({ ...formData, is_recurring: e.target.checked })}
                                                    />
                                                    <div className={`block w-10 h-6 rounded-full transition-colors ${formData.is_recurring ? 'bg-violet-600' : 'bg-gray-300'}`}></div>
                                                    <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${formData.is_recurring ? 'transform translate-x-4' : ''}`}></div>
                                                </div>
                                            </label>
                                        </div>
                                        {formData.is_recurring && (
                                            <div>
                                                <label className="block text-xs font-medium text-violet-800 mb-1">Frecuencia</label>
                                                <select
                                                    value={formData.recurrence_pattern}
                                                    onChange={(e) => setFormData({ ...formData, recurrence_pattern: e.target.value })}
                                                    className="w-full px-3 py-2 text-sm bg-white border border-violet-200 rounded-md focus:ring-1 focus:ring-violet-500 outline-none"
                                                >
                                                    <option value="">Seleccionar...</option>
                                                    <option value="daily">Diaria</option>
                                                    <option value="weekly">Semanal</option>
                                                    <option value="biweekly">Quincenal</option>
                                                    <option value="monthly">Mensual</option>
                                                </select>
                                            </div>
                                        )}
                                        <div>
                                            <label className="block text-xs font-medium text-violet-800 mb-1">Asociar a Proyecto (de un cliente)</label>
                                            <select
                                                value={formData.project_id}
                                                onChange={(e) => setFormData({ ...formData, project_id: e.target.value ? Number(e.target.value) : "" })}
                                                className="w-full px-3 py-2 text-sm bg-white border border-violet-200 rounded-md focus:ring-1 focus:ring-violet-500 outline-none"
                                            >
                                                <option value="">Sin proyecto asociado</option>
                                                {projects.map(p => <option key={p.id} value={p.id}>[{p.key}] {p.name}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                )}

                                {formData.related_to === "Billing" && (
                                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-100 space-y-4">
                                        <div className="flex items-center justify-between">
                                            <h4 className="text-sm font-semibold text-blue-900 flex items-center">
                                                <AlertCircle size={16} className="mr-2" />
                                                Auto-Generate Invoice
                                            </h4>
                                            <label className="flex items-center cursor-pointer">
                                                <div className="relative">
                                                    <input
                                                        type="checkbox"
                                                        className="sr-only"
                                                        checked={generateInvoice}
                                                        onChange={(e) => setGenerateInvoice(e.target.checked)}
                                                    />
                                                    <div className={`block w-10 h-6 rounded-full transition-colors ${generateInvoice ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
                                                    <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${generateInvoice ? 'transform translate-x-4' : ''}`}></div>
                                                </div>
                                            </label>
                                        </div>

                                        {generateInvoice && (
                                            <div className="grid grid-cols-2 gap-4 pt-2">
                                                <div className="col-span-2">
                                                    <label className="block text-xs font-medium text-blue-800 mb-1">{t('calendar.modal.invoiceType')}</label>
                                                    <div className="flex bg-white rounded-lg border border-blue-200 overflow-hidden">
                                                        <button
                                                            type="button"
                                                            className={`flex-1 py-1.5 text-xs font-medium ${invoiceType === 'issued' ? 'bg-blue-100 text-blue-800' : 'text-gray-500 hover:bg-gray-50'}`}
                                                            onClick={() => setInvoiceType('issued')}
                                                        >
                                                            Issued (To Client)
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className={`flex-1 py-1.5 text-xs font-medium ${invoiceType === 'received' ? 'bg-purple-100 text-purple-800' : 'text-gray-500 hover:bg-gray-50'}`}
                                                            onClick={() => setInvoiceType('received')}
                                                        >
                                                            Received (From Provider)
                                                        </button>
                                                    </div>
                                                </div>

                                                <div className="col-span-2 sm:col-span-1">
                                                    <label className="block text-xs font-medium text-blue-800 mb-1">
                                                        {invoiceType === 'issued' ? 'Select Client' : 'Select Provider'}
                                                    </label>
                                                    {invoiceType === 'issued' ? (
                                                        <select
                                                            value={relatedClientId}
                                                            onChange={(e) => setRelatedClientId(e.target.value ? Number(e.target.value) : "")}
                                                            className="w-full px-3 py-1.5 text-sm bg-white border border-blue-200 rounded-md focus:ring-1 focus:ring-blue-500 outline-none"
                                                        >
                                                            <option value="">{t('calendar.modal.none')}</option>
                                                            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                                        </select>
                                                    ) : (
                                                        <select
                                                            value={relatedProviderId}
                                                            onChange={(e) => setRelatedProviderId(e.target.value ? Number(e.target.value) : "")}
                                                            className="w-full px-3 py-1.5 text-sm bg-white border border-blue-200 rounded-md focus:ring-1 focus:ring-blue-500 outline-none"
                                                        >
                                                            <option value="">{t('calendar.modal.none')}</option>
                                                            {providers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                                        </select>
                                                    )}
                                                </div>

                                                <div className="col-span-2 sm:col-span-1">
                                                    <label className="block text-xs font-medium text-blue-800 mb-1">{t('calendar.modal.amount')}</label>
                                                    <div className="relative">
                                                        <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                                                            <span className="text-blue-500 text-sm">$</span>
                                                        </div>
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            value={invoiceAmount}
                                                            onChange={(e) => setInvoiceAmount(parseFloat(e.target.value) || 0)}
                                                            className="w-full pl-6 pr-3 py-1.5 text-sm bg-white border border-blue-200 rounded-md focus:ring-1 focus:ring-blue-500 outline-none"
                                                            placeholder="0.00"
                                                        />
                                                    </div>
                                                </div>
                                                <p className="col-span-2 text-xs text-blue-600 mt-1">
                                                    * Un estado "Por Facturar" será asignado o creado automáticamente.
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('calendar.modal.description')}</label>
                                    <textarea
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                                        rows={3}
                                        placeholder="Details about this event..."
                                    />
                                </div>

                                <div className="pt-4 flex justify-end space-x-3 border-t border-gray-100">
                                    <button
                                        type="button"
                                        onClick={() => setIsModalOpen(false)}
                                        className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg font-medium transition-all shadow-sm"
                                    >
                                        Save Event
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }

            {/* Quick Add Contact Modal */}
            {
                isContactModalOpen && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
                        <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden max-h-[90vh] overflow-y-auto flex flex-col">
                            <div className="px-6 py-4 bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-between shrink-0">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center"><User size={20} className="text-white" /></div>
                                    <div>
                                        <h3 className="text-lg font-bold text-white">{t('calendar.quickContact.title')}</h3>
                                        <p className="text-blue-100 text-xs">Datos del nuevo contacto</p>
                                    </div>
                                </div>
                                <button onClick={() => setIsContactModalOpen(false)} className="p-1.5 hover:bg-white/20 rounded-lg"><X size={18} className="text-white" /></button>
                            </div>
                            <form onSubmit={handleQuickAddContact} className="p-5 space-y-4 overflow-y-auto flex-1">
                                <div className="border border-blue-100 rounded-xl p-4 bg-blue-50/30">
                                    <label className="block text-xs font-medium text-gray-700 mb-1">{t('calendar.quickContact.fullName')}</label>
                                    <input type="text" required value={contactFormData.name}
                                        onChange={(e) => setContactFormData({ ...contactFormData, name: e.target.value })}
                                        className="w-full px-3 py-1.5 text-sm bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                                </div>
                                <div className="border border-purple-100 rounded-xl p-4 bg-purple-50/30">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">{t('calendar.quickContact.email')}</label>
                                            <input type="email" value={contactFormData.email}
                                                onChange={(e) => setContactFormData({ ...contactFormData, email: e.target.value })}
                                                className="w-full px-3 py-1.5 text-sm bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">{t('calendar.quickContact.phone')}</label>
                                            <input type="text" value={contactFormData.phone}
                                                onChange={(e) => setContactFormData({ ...contactFormData, phone: e.target.value })}
                                                className="w-full px-3 py-1.5 text-sm bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                                        </div>
                                    </div>
                                </div>
                                <div className="border border-green-100 rounded-xl p-4 bg-green-50/30">
                                    <label className="block text-xs font-medium text-gray-700 mb-1">{t('calendar.quickContact.position')}</label>
                                    <input type="text" value={contactFormData.position}
                                        onChange={(e) => setContactFormData({ ...contactFormData, position: e.target.value })}
                                        className="w-full px-3 py-1.5 text-sm bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                                </div>
                                <div className="pt-2 flex justify-end space-x-2">
                                    <button type="button" onClick={() => setIsContactModalOpen(false)}
                                        className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-md font-medium">Cancel</button>
                                    <button type="submit"
                                        className="px-4 py-1.5 text-sm bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-md font-medium shadow-sm">Create Contact</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }
        </div >
    );
}
