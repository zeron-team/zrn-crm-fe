import { useState } from "react";
import { Info, X, LayoutDashboard, UserPlus, FileText, Building2, Contact, CalendarDays, Receipt, LineChart, Package, Truck, Users, Settings, ChevronDown, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";

interface ModuleSection {
    icon: React.ReactNode;
    titleKey: string;
    descKey: string;
    featuresKey: string;
    organizationKey: string;
}

const modules: ModuleSection[] = [
    { icon: <LayoutDashboard size={18} />, titleKey: "help.modules.dashboard.title", descKey: "help.modules.dashboard.desc", featuresKey: "help.modules.dashboard.features", organizationKey: "help.modules.dashboard.organization" },
    { icon: <UserPlus size={18} />, titleKey: "help.modules.leads.title", descKey: "help.modules.leads.desc", featuresKey: "help.modules.leads.features", organizationKey: "help.modules.leads.organization" },
    { icon: <FileText size={18} />, titleKey: "help.modules.quotes.title", descKey: "help.modules.quotes.desc", featuresKey: "help.modules.quotes.features", organizationKey: "help.modules.quotes.organization" },
    { icon: <Building2 size={18} />, titleKey: "help.modules.clients.title", descKey: "help.modules.clients.desc", featuresKey: "help.modules.clients.features", organizationKey: "help.modules.clients.organization" },
    { icon: <Contact size={18} />, titleKey: "help.modules.contacts.title", descKey: "help.modules.contacts.desc", featuresKey: "help.modules.contacts.features", organizationKey: "help.modules.contacts.organization" },
    { icon: <Receipt size={18} />, titleKey: "help.modules.billing.title", descKey: "help.modules.billing.desc", featuresKey: "help.modules.billing.features", organizationKey: "help.modules.billing.organization" },
    { icon: <LineChart size={18} />, titleKey: "help.modules.finances.title", descKey: "help.modules.finances.desc", featuresKey: "help.modules.finances.features", organizationKey: "help.modules.finances.organization" },
    { icon: <Package size={18} />, titleKey: "help.modules.products.title", descKey: "help.modules.products.desc", featuresKey: "help.modules.products.features", organizationKey: "help.modules.products.organization" },
    { icon: <Truck size={18} />, titleKey: "help.modules.providers.title", descKey: "help.modules.providers.desc", featuresKey: "help.modules.providers.features", organizationKey: "help.modules.providers.organization" },
    { icon: <CalendarDays size={18} />, titleKey: "help.modules.calendar.title", descKey: "help.modules.calendar.desc", featuresKey: "help.modules.calendar.features", organizationKey: "help.modules.calendar.organization" },
    { icon: <Users size={18} />, titleKey: "help.modules.users.title", descKey: "help.modules.users.desc", featuresKey: "help.modules.users.features", organizationKey: "help.modules.users.organization" },
    { icon: <Settings size={18} />, titleKey: "help.modules.settings.title", descKey: "help.modules.settings.desc", featuresKey: "help.modules.settings.features", organizationKey: "help.modules.settings.organization" },
];

export default function HelpManual() {
    const { t } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const [expandedModule, setExpandedModule] = useState<number | null>(null);

    const toggleModule = (index: number) => {
        setExpandedModule(expandedModule === index ? null : index);
    };

    return (
        <>
            {/* Trigger Button */}
            <button
                onClick={() => setIsOpen(true)}
                className="relative p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                title={t('help.title')}
            >
                <Info size={20} />
            </button>

            {/* Slide-out Panel */}
            {isOpen && (
                <div className="fixed inset-0 z-50 flex justify-end">
                    {/* Overlay */}
                    <div
                        className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm"
                        onClick={() => setIsOpen(false)}
                    />

                    {/* Panel */}
                    <div className="relative w-full max-w-lg bg-white shadow-2xl flex flex-col animate-slide-in-right overflow-hidden">
                        {/* Header */}
                        <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-gradient-to-r from-blue-600 to-blue-700">
                            <div className="flex items-center space-x-3">
                                <div className="p-2 bg-white/20 rounded-lg">
                                    <Info size={20} className="text-white" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-white">{t('help.title')}</h2>
                                    <p className="text-sm text-blue-100">{t('help.subtitle')}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-2">
                            {modules.map((mod, index) => (
                                <div
                                    key={index}
                                    className="border border-gray-100 rounded-xl overflow-hidden transition-all"
                                >
                                    {/* Module Header */}
                                    <button
                                        onClick={() => toggleModule(index)}
                                        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                                    >
                                        <div className="flex items-center space-x-3">
                                            <span className="text-blue-600">{mod.icon}</span>
                                            <span className="font-semibold text-gray-900 text-sm">{t(mod.titleKey)}</span>
                                        </div>
                                        {expandedModule === index ? (
                                            <ChevronDown size={16} className="text-gray-400" />
                                        ) : (
                                            <ChevronRight size={16} className="text-gray-400" />
                                        )}
                                    </button>

                                    {/* Expanded Content */}
                                    {expandedModule === index && (
                                        <div className="px-4 pb-4 space-y-3 border-t border-gray-50">
                                            {/* Description */}
                                            <p className="text-sm text-gray-600 mt-3 leading-relaxed">
                                                {t(mod.descKey)}
                                            </p>

                                            {/* Features */}
                                            <div>
                                                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                                                    {t('help.featuresLabel')}
                                                </h4>
                                                <ul className="space-y-1.5">
                                                    {(t(mod.featuresKey, { returnObjects: true }) as string[]).map((feature, i) => (
                                                        <li key={i} className="flex items-start space-x-2 text-sm text-gray-700">
                                                            <span className="text-blue-500 mt-0.5 shrink-0">•</span>
                                                            <span>{feature}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>

                                            {/* Organization */}
                                            <div className="bg-gray-50 rounded-lg p-3">
                                                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                                                    {t('help.organizationLabel')}
                                                </h4>
                                                <p className="text-sm text-gray-600 leading-relaxed">
                                                    {t(mod.organizationKey)}
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Footer */}
                        <div className="p-4 border-t border-gray-100 bg-gray-50">
                            <p className="text-xs text-gray-500 text-center">
                                Zeron CRM v5.0.0 · {t('help.footer')}
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
