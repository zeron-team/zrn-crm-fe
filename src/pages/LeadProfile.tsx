import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import api from "../api/client";
import {
    ArrowLeft, Building2, Mail, Phone, Globe, Calendar as CalendarIcon,
    FileText, Contact, Clock, User, StickyNote, Zap, ExternalLink, MapPin
} from "lucide-react";
import { useTranslation } from "react-i18next";

interface Lead {
    id: number;
    company_name: string;
    contact_name: string | null;
    email: string | null;
    phone: string | null;
    status: string;
    source: string | null;
    website: string | null;
    address: string | null;
    city: string | null;
    province: string | null;
    country: string | null;
    notes: string | null;
    created_at: string;
    updated_at: string;
}

interface Quote {
    id: number;
    quote_number: string;
    issue_date: string;
    expiry_date: string;
    status: string;
    currency: string;
    total_amount: number;
    lead_id: number | null;
    client_id: number | null;
}

interface ContactPerson {
    id: number;
    name: string;
    email: string;
    phone: string;
    position: string;
    lead_id: number | null;
}

interface CalendarEvent {
    id: number;
    title: string;
    description: string;
    start_date: string;
    end_date: string;
    related_to: string;
    color: string;
    lead_id: number | null;
}

export default function LeadProfile() {
    const { t } = useTranslation();
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [lead, setLead] = useState<Lead | null>(null);
    const [quotes, setQuotes] = useState<Quote[]>([]);
    const [contacts, setContacts] = useState<ContactPerson[]>([]);
    const [activities, setActivities] = useState<CalendarEvent[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [leadRes, quotesRes, contactsRes, activitiesRes] = await Promise.all([
                    api.get(`/leads/${id}`),
                    api.get("/quotes/"),
                    api.get("/contacts/"),
                    api.get("/calendar/"),
                ]);
                setLead(leadRes.data);
                setQuotes(quotesRes.data.filter((q: Quote) => q.lead_id === Number(id)));
                setContacts(contactsRes.data.filter((c: ContactPerson) => c.lead_id === Number(id)));
                setActivities(activitiesRes.data.filter((a: CalendarEvent) => a.lead_id === Number(id)));
            } catch (error) {
                console.error("Failed to fetch lead profile", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [id]);

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'New': return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'Contacted': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'Qualified': return 'bg-purple-100 text-purple-800 border-purple-200';
            case 'Converted': return 'bg-green-100 text-green-800 border-green-200';
            case 'Lost': return 'bg-gray-100 text-gray-800 border-gray-200';
            default: return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    const getQuoteStatusStyle = (status: string) => {
        switch (status) {
            case 'Draft': return 'bg-gray-100 text-gray-700';
            case 'Sent': return 'bg-blue-100 text-blue-700';
            case 'Accepted': return 'bg-green-100 text-green-700';
            case 'Rejected': return 'bg-red-100 text-red-700';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <p className="text-gray-500">{t('leads.profile.loading')}</p>
            </div>
        );
    }

    if (!lead) {
        return (
            <div className="text-center py-12">
                <p className="text-gray-500">{t('leads.profile.notFound')}</p>
                <button onClick={() => navigate("/leads")} className="mt-4 text-blue-600 hover:underline">{t('leads.profile.backToLeads')}</button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-5 rounded-xl shadow-sm border border-gray-100 gap-4">
                <div className="flex items-center space-x-4">
                    <button onClick={() => navigate("/leads")} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                        <ArrowLeft size={20} className="text-gray-500" />
                    </button>
                    <div>
                        <div className="flex items-center space-x-3">
                            <h2 className="text-2xl font-bold tracking-tight text-gray-900">{lead.company_name}</h2>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${getStatusStyle(lead.status)}`}>
                                {t(`leads.status.${lead.status.toLowerCase()}`)}
                            </span>
                        </div>
                        <p className="text-sm text-gray-500 mt-1">{t('leads.profile.subtitle')}</p>
                    </div>
                </div>
            </div>

            {/* Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column - Lead Details */}
                <div className="lg:col-span-1 space-y-6">
                    {/* Details Card */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-4 border-b border-gray-100 bg-gray-50">
                            <h3 className="font-semibold text-gray-900 flex items-center">
                                <Building2 size={18} className="mr-2 text-blue-600" />
                                {t('leads.profile.details')}
                            </h3>
                        </div>
                        <div className="p-4 space-y-4">
                            {lead.contact_name && (
                                <div className="flex items-start space-x-3">
                                    <User size={16} className="text-gray-400 mt-0.5 shrink-0" />
                                    <div>
                                        <p className="text-xs text-gray-500 uppercase tracking-wider">{t('leads.table.contact')}</p>
                                        <p className="text-sm font-medium text-gray-900">{lead.contact_name}</p>
                                    </div>
                                </div>
                            )}
                            {lead.email && (
                                <div className="flex items-start space-x-3">
                                    <Mail size={16} className="text-gray-400 mt-0.5 shrink-0" />
                                    <div>
                                        <p className="text-xs text-gray-500 uppercase tracking-wider">{t('common.email')}</p>
                                        <a href={`mailto:${lead.email}`} className="text-sm text-blue-600 hover:underline">{lead.email}</a>
                                    </div>
                                </div>
                            )}
                            {lead.phone && (
                                <div className="flex items-start space-x-3">
                                    <Phone size={16} className="text-gray-400 mt-0.5 shrink-0" />
                                    <div>
                                        <p className="text-xs text-gray-500 uppercase tracking-wider">{t('common.phone')}</p>
                                        <a href={`tel:${lead.phone}`} className="text-sm text-blue-600 hover:underline">{lead.phone}</a>
                                    </div>
                                </div>
                            )}
                            {lead.website && (
                                <div className="flex items-start space-x-3">
                                    <Globe size={16} className="text-gray-400 mt-0.5 shrink-0" />
                                    <div>
                                        <p className="text-xs text-gray-500 uppercase tracking-wider">{t('common.website')}</p>
                                        <a href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`} target="_blank" rel="noreferrer" className="text-sm text-blue-600 hover:underline flex items-center">
                                            {lead.website} <ExternalLink size={12} className="ml-1" />
                                        </a>
                                    </div>
                                </div>
                            )}
                            {lead.source && (
                                <div className="flex items-start space-x-3">
                                    <Zap size={16} className="text-gray-400 mt-0.5 shrink-0" />
                                    <div>
                                        <p className="text-xs text-gray-500 uppercase tracking-wider">{t('leads.table.source')}</p>
                                        <p className="text-sm font-medium text-gray-900">{lead.source}</p>
                                    </div>
                                </div>
                            )}
                            {lead.notes && (
                                <div className="flex items-start space-x-3">
                                    <StickyNote size={16} className="text-gray-400 mt-0.5 shrink-0" />
                                    <div>
                                        <p className="text-xs text-gray-500 uppercase tracking-wider">{t('leads.modal.notes')}</p>
                                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{lead.notes}</p>
                                    </div>
                                </div>
                            )}
                            <div className="pt-3 border-t border-gray-100 text-xs text-gray-400">
                                {t('leads.profile.createdAt')}: {new Date(lead.created_at).toLocaleDateString()}
                            </div>

                            {/* Location Section */}
                            {(lead.address || lead.city || lead.province || lead.country) && (
                                <div className="pt-3 border-t border-gray-100 space-y-3">
                                    <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">{t('clients.profile.sectionLocation')}</p>
                                    {lead.address && (
                                        <div className="flex items-start space-x-3">
                                            <MapPin size={16} className="text-gray-400 mt-0.5 shrink-0" />
                                            <div>
                                                <p className="text-xs text-gray-500 uppercase tracking-wider">{t('common.address')}</p>
                                                <p className="text-sm font-medium text-gray-900">{lead.address}</p>
                                            </div>
                                        </div>
                                    )}
                                    {(lead.city || lead.province) && (
                                        <div className="flex items-start space-x-3">
                                            <Globe size={16} className="text-gray-400 mt-0.5 shrink-0" />
                                            <div>
                                                <p className="text-xs text-gray-500 uppercase tracking-wider">{t('clients.profile.labelCityProvince')}</p>
                                                <p className="text-sm font-medium text-gray-900">
                                                    {[lead.city, lead.province].filter(Boolean).join(', ')}
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                    {lead.country && (
                                        <div className="flex items-start space-x-3">
                                            <Globe size={16} className="text-gray-400 mt-0.5 shrink-0" />
                                            <div>
                                                <p className="text-xs text-gray-500 uppercase tracking-wider">{t('clients.profile.labelCountry')}</p>
                                                <p className="text-sm font-medium text-gray-900">{lead.country}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Associated Contacts */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-4 border-b border-gray-100 bg-gray-50">
                            <h3 className="font-semibold text-gray-900 flex items-center">
                                <Contact size={18} className="mr-2 text-indigo-600" />
                                {t('leads.profile.associatedContacts')} ({contacts.length})
                            </h3>
                        </div>
                        <div className="p-4">
                            {contacts.length === 0 ? (
                                <p className="text-sm text-gray-500 text-center py-4">{t('leads.profile.noContacts')}</p>
                            ) : (
                                <div className="space-y-3">
                                    {contacts.map(contact => (
                                        <div key={contact.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                                            <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold shrink-0">
                                                {contact.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium text-gray-900 truncate">{contact.name}</p>
                                                {contact.position && <p className="text-xs text-gray-500">{contact.position}</p>}
                                                {contact.email && <p className="text-xs text-gray-400 truncate">{contact.email}</p>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Column - Quotes and Activities */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Associated Quotes */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                            <h3 className="font-semibold text-gray-900 flex items-center">
                                <FileText size={18} className="mr-2 text-green-600" />
                                {t('leads.profile.associatedQuotes')} ({quotes.length})
                            </h3>
                            <Link to="/quotes" className="text-sm text-blue-600 hover:underline">{t('leads.profile.viewAll')}</Link>
                        </div>
                        <div className="p-4">
                            {quotes.length === 0 ? (
                                <p className="text-sm text-gray-500 text-center py-6">{t('leads.profile.noQuotes')}</p>
                            ) : (
                                <div className="space-y-3">
                                    {quotes.map(quote => (
                                        <div key={quote.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100 hover:bg-gray-100/50 transition-colors">
                                            <div>
                                                <div className="flex items-center space-x-2">
                                                    <p className="font-medium text-gray-900">{quote.quote_number}</p>
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getQuoteStatusStyle(quote.status)}`}>
                                                        {quote.status}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-gray-500 mt-1">
                                                    {new Date(quote.issue_date).toLocaleDateString()} → {new Date(quote.expiry_date).toLocaleDateString()}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-lg font-bold text-gray-900">
                                                    {quote.currency === 'USD' ? 'u$d' : quote.currency === 'EUR' ? '€' : 'AR$'} {Number(quote.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Associated Activities */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                            <h3 className="font-semibold text-gray-900 flex items-center">
                                <CalendarIcon size={18} className="mr-2 text-orange-600" />
                                {t('leads.profile.associatedActivities')} ({activities.length})
                            </h3>
                            <Link to="/calendar" className="text-sm text-blue-600 hover:underline">{t('leads.profile.viewCalendar')}</Link>
                        </div>
                        <div className="p-4">
                            {activities.length === 0 ? (
                                <p className="text-sm text-gray-500 text-center py-6">{t('leads.profile.noActivities')}</p>
                            ) : (
                                <div className="space-y-3">
                                    {activities.map(event => {
                                        const eventDate = new Date(event.start_date);
                                        const isPast = eventDate < new Date();
                                        return (
                                            <div key={event.id} className={`flex items-start space-x-4 p-4 rounded-lg border ${isPast ? 'bg-gray-50 border-gray-100 opacity-75' : 'bg-orange-50/30 border-orange-100'}`}>
                                                <div className="shrink-0 text-center">
                                                    <div className={`w-12 h-12 rounded-lg flex flex-col items-center justify-center ${isPast ? 'bg-gray-200 text-gray-600' : 'bg-orange-100 text-orange-700'}`}>
                                                        <span className="text-xs font-medium leading-none">{eventDate.toLocaleDateString(undefined, { month: 'short' })}</span>
                                                        <span className="text-lg font-bold leading-none">{eventDate.getDate()}</span>
                                                    </div>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-medium text-gray-900">{event.title}</p>
                                                    {event.description && <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{event.description}</p>}
                                                    <div className="flex items-center text-xs text-gray-400 mt-2">
                                                        <Clock size={12} className="mr-1" />
                                                        {eventDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
