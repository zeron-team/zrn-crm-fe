import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { X, Settings2 } from "lucide-react";
import api from "../api/client";

interface WidgetCatalogItem {
    id: string;
    type: string;
    label_key: string;
}

interface Props {
    userId: number;
    currentWidgets: string[];
    onSave: (widgets: string[]) => void;
    onClose: () => void;
}

export default function DashboardCustomizer({ userId, currentWidgets, onSave, onClose }: Props) {
    const { t } = useTranslation();
    const [catalog, setCatalog] = useState<WidgetCatalogItem[]>([]);
    const [selected, setSelected] = useState<string[]>(currentWidgets);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        api.get("/dashboard-config/catalog").then((res) => setCatalog(res.data));
    }, []);

    const toggleWidget = (id: string) => {
        setSelected((prev) =>
            prev.includes(id) ? prev.filter((w) => w !== id) : [...prev, id]
        );
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await api.put(`/dashboard-config/${userId}`, { widgets: selected });
            onSave(selected);
        } catch (err) {
            console.error("Failed to save dashboard config", err);
        } finally {
            setSaving(false);
        }
    };

    const kpiWidgets = catalog.filter((w) => w.type === "kpi");
    const tableWidgets = catalog.filter((w) => w.type === "table");
    const chartWidgets = catalog.filter((w) => w.type === "chart");

    const renderSection = (title: string, widgets: WidgetCatalogItem[]) => (
        <div>
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">{title}</h4>
            <div className="space-y-2">
                {widgets.map((widget) => (
                    <label
                        key={widget.id}
                        className={`flex items-center p-3 rounded-xl border-2 cursor-pointer transition-all duration-200 ${selected.includes(widget.id)
                            ? "border-blue-500 bg-blue-50/50"
                            : "border-gray-100 hover:border-gray-200 bg-white"
                            }`}
                    >
                        <input
                            type="checkbox"
                            checked={selected.includes(widget.id)}
                            onChange={() => toggleWidget(widget.id)}
                            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                        />
                        <span className="ml-3 text-sm font-medium text-gray-700">
                            {t(widget.label_key)}
                        </span>
                    </label>
                ))}
            </div>
        </div>
    );

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4" onClick={onClose}>
            <div
                className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[95vh] flex flex-col overflow-hidden animate-in"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-blue-600 to-purple-600">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                            <Settings2 size={18} className="text-white" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-white">{t('dashboard.customize.title')}</h3>
                            <p className="text-blue-100 text-xs">{t('dashboard.customize.subtitle')}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors">
                        <X size={18} className="text-white" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-5 space-y-6">
                    {kpiWidgets.length > 0 && renderSection(t('dashboard.customize.kpiSection'), kpiWidgets)}
                    {tableWidgets.length > 0 && renderSection(t('dashboard.customize.tableSection'), tableWidgets)}
                    {chartWidgets.length > 0 && renderSection(t('dashboard.customize.chartSection'), chartWidgets)}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end space-x-3 p-5 border-t border-gray-100 bg-gray-50/50">
                    <button
                        onClick={onClose}
                        className="px-4 py-2.5 text-sm font-semibold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                    >
                        {t('dashboard.customize.cancel')}
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl shadow-md shadow-blue-500/20 hover:shadow-blue-500/30 transition-all disabled:opacity-50"
                    >
                        {saving ? t('dashboard.customize.saving') : t('dashboard.customize.save')}
                    </button>
                </div>
            </div>
        </div>
    );
}
