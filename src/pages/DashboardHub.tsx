import { useState, useEffect, ReactNode } from "react";
import api from "../api/client";
import {
    BarChart3, TrendingUp, TrendingDown, DollarSign, ShoppingCart, Package,
    Truck, Users, Building2, FileText, CreditCard, AlertTriangle, ArrowUp, ArrowDown,
    PieChart, Activity, Layers, Warehouse as WarehouseIcon, Star, Target,
    ChevronRight, Briefcase, Wallet, Banknote, UserCheck, Clock
} from "lucide-react";

// ─── Reusable Chart Components ───
function MiniBar({ data, maxVal, color }: { data: number[]; maxVal: number; color: string }) {
    return (
        <div className="flex items-end gap-0.5 h-12">
            {data.map((v, i) => (
                <div key={i} className={`flex-1 rounded-t ${color} transition-all`}
                    style={{ height: `${Math.max(4, (v / (maxVal || 1)) * 100)}%`, opacity: 0.4 + (i / data.length) * 0.6 }} />
            ))}
        </div>
    );
}

function HBar({ label, value, max, color, suffix = "" }: { label: string; value: number; max: number; color: string; suffix?: string }) {
    const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
    return (
        <div className="space-y-1">
            <div className="flex justify-between text-xs"><span className="text-gray-600 truncate mr-2">{label}</span><span className="font-bold text-gray-900">{value.toLocaleString()}{suffix}</span></div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${color} transition-all duration-500`} style={{ width: `${pct}%` }} />
            </div>
        </div>
    );
}

function KPICard({ icon, label, value, sub, color, trend }: { icon: ReactNode; label: string; value: string; sub?: string; color: string; trend?: number }) {
    return (
        <div className={`bg-white rounded-xl p-4 border shadow-sm ${color}`}>
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">{icon}{label}</div>
                    <p className="text-2xl font-black text-gray-900">{value}</p>
                    {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
                </div>
                {trend !== undefined && (
                    <span className={`flex items-center gap-0.5 text-xs font-bold px-2 py-1 rounded-lg ${trend >= 0 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                        {trend >= 0 ? <ArrowUp size={12} /> : <ArrowDown size={12} />}{Math.abs(trend)}%
                    </span>
                )}
            </div>
        </div>
    );
}

function TableCard({ title, icon, headers, rows }: { title: string; icon: ReactNode; headers: string[]; rows: ReactNode[][] }) {
    return (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-50 flex items-center gap-2">
                {icon}<h3 className="font-bold text-sm text-gray-800">{title}</h3>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-xs">
                    <thead className="bg-gray-50"><tr>{headers.map((h, i) => <th key={i} className="px-3 py-2 text-left font-semibold text-gray-500 uppercase tracking-wider">{h}</th>)}</tr></thead>
                    <tbody className="divide-y divide-gray-50">{rows.map((row, i) => <tr key={i} className="hover:bg-gray-50/50">{row.map((cell, j) => <td key={j} className="px-3 py-2.5">{cell}</td>)}</tr>)}</tbody>
                </table>
            </div>
        </div>
    );
}

function StatusPill({ label, color }: { label: string; color: string }) {
    return <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${color}`}>{label}</span>;
}

// ─── Reusable SVG Timeline Line Chart ───
function TimelineLineChart({ series, labels, title, periodLabel }: {
    series: { name: string; data: number[]; color: string }[];
    labels: string[];
    title: string;
    periodLabel?: string;
}) {
    const chartW = 1200;
    const chartH = 280;
    const padL = 70;
    const padR = 20;
    const padT = 30;
    const padB = 45;
    const innerW = chartW - padL - padR;
    const innerH = chartH - padT - padB;

    const allVals = series.flatMap(s => s.data);
    const maxVal = Math.max(...allVals, 1);
    const n = labels.length;

    const getX = (i: number) => padL + (n > 1 ? (i / (n - 1)) * innerW : innerW / 2);
    const getY = (v: number) => padT + innerH - (v / maxVal) * innerH;

    return (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <h3 className="font-bold text-sm text-gray-800 flex items-center gap-2">
                    <Activity size={16} className="text-indigo-500" /> {title}
                </h3>
                {periodLabel && <span className="text-xs text-gray-400">{periodLabel}</span>}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs mb-4">
                {series.map(s => (
                    <span key={s.name} className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: s.color }} />
                        <span className="text-gray-700">{s.name}</span>
                    </span>
                ))}
            </div>

            <svg viewBox={`0 0 ${chartW} ${chartH}`} className="w-full" preserveAspectRatio="xMidYMid meet" style={{ minHeight: 200 }}>
                {/* Grid lines */}
                {[0, 0.25, 0.5, 0.75, 1].map((pct, gi) => {
                    const val = maxVal * pct;
                    const fmtVal = val >= 1e6 ? `${(val / 1e6).toFixed(1)}M` : val >= 1e3 ? `${(val / 1e3).toFixed(0)}K` : Math.round(val).toString();
                    return (
                        <g key={gi}>
                            <line x1={padL} y1={padT + innerH * (1 - pct)} x2={chartW - padR} y2={padT + innerH * (1 - pct)} stroke="#f3f4f6" strokeWidth={1} />
                            <text x={padL - 8} y={padT + innerH * (1 - pct) + 4} textAnchor="end" fontSize={10} fill="#9ca3af">{fmtVal}</text>
                        </g>
                    );
                })}

                {/* Series */}
                {series.map(s => {
                    if (s.data.every(v => v === 0)) return null;
                    const linePoints = s.data.map((v, i) => `${getX(i)},${getY(v)}`).join(" ");
                    const areaPoints = `${getX(0)},${padT + innerH} ${linePoints} ${getX(s.data.length - 1)},${padT + innerH}`;
                    return (
                        <g key={s.name}>
                            <polygon points={areaPoints} fill={s.color} opacity={0.08} />
                            {n > 1 && <polyline points={linePoints} fill="none" stroke={s.color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />}
                            {s.data.map((v, i) => (
                                <g key={i}>
                                    <circle cx={getX(i)} cy={getY(v)} r={4} fill={s.color} stroke="white" strokeWidth={2} />
                                    {v > 0 && <text x={getX(i)} y={getY(v) - 10} textAnchor="middle" fontSize={8} fill={s.color} fontWeight="bold">
                                        {v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `${(v / 1e3).toFixed(0)}K` : v.toLocaleString()}
                                    </text>}
                                </g>
                            ))}
                        </g>
                    );
                })}

                {/* X labels */}
                {labels.map((lbl, i) => (
                    <text key={i} x={getX(i)} y={chartH - 5} textAnchor="middle" fontSize={10} fill="#6b7280">{lbl}</text>
                ))}
            </svg>
        </div>
    );
}

// ─── TABS ───
const TABS = [
    { key: "cashflow", label: "Cashflow", icon: <Wallet size={16} /> },
    { key: "sales", label: "Ventas", icon: <DollarSign size={16} /> },
    { key: "purchases", label: "Compras", icon: <ShoppingCart size={16} /> },
    { key: "inventory", label: "Inventario", icon: <WarehouseIcon size={16} /> },
    { key: "products", label: "Productos", icon: <Package size={16} /> },
    { key: "providers", label: "Proveedores", icon: <Truck size={16} /> },
    { key: "crm", label: "CRM", icon: <Briefcase size={16} /> },
    { key: "rrhh", label: "RRHH", icon: <Banknote size={16} /> },
];

// Currency conversion helpers
function cvt(value: number, mode: 'ARS' | 'USD', usdRate: number): number {
    if (mode === 'USD' && usdRate > 1) return value / usdRate;
    return value;
}
function fmtMoney(value: number, mode: 'ARS' | 'USD', usdRate: number, compact = false): string {
    const v = cvt(value, mode, usdRate);
    const prefix = mode === 'ARS' ? '$ ' : 'u$d ';
    if (compact) {
        const abs = Math.abs(v);
        if (abs >= 1e6) return `${prefix}${(v / 1e6).toFixed(1)}M`;
        if (abs >= 1e3) return `${prefix}${(v / 1e3).toFixed(0)}K`;
    }
    return `${prefix}${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ─── MAIN COMPONENT ───
// Helper: generate last 12 months
function getLast12Months() {
    const months = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
        const dt = new Date(now.getFullYear(), now.getMonth() - i, 1);
        months.push({
            label: dt.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
            month: dt.getMonth() + 1,
            year: dt.getFullYear(),
        });
    }
    return months;
}

const MONTHS_OPTIONS = getLast12Months();

export default function DashboardHub() {
    const [activeTab, setActiveTab] = useState("cashflow");
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [fromIdx, setFromIdx] = useState(0);
    const [toIdx, setToIdx] = useState(MONTHS_OPTIONS.length - 1);
    const [currencyMode, setCurrencyMode] = useState<'ARS' | 'USD'>('ARS');

    useEffect(() => { loadTab(activeTab); }, [activeTab]);

    const loadTab = async (tab: string) => {
        setLoading(true);
        try {
            const r = await api.get(`/dashboards/${tab}`);
            setData(r.data);
        } catch { setData(null); }
        finally { setLoading(false); }
    };

    const fromMonth = MONTHS_OPTIONS[fromIdx];
    const toMonth = MONTHS_OPTIONS[toIdx];
    const periodLabel = fromIdx === toIdx ? fromMonth.label : `${fromMonth.label} — ${toMonth.label}`;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                <h2 className="text-2xl font-black tracking-tight text-gray-900 flex items-center gap-2"><BarChart3 size={24} className="text-indigo-600" /> Centro de Dashboards</h2>
                <p className="text-sm text-gray-500 mt-1">Análisis integral de tu negocio en tiempo real</p>
            </div>

            {/* Tab Navigation */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-1.5 flex flex-wrap gap-1">
                {TABS.map(tab => (
                    <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === tab.key ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-200' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}>
                        {tab.icon}{tab.label}
                    </button>
                ))}
            </div>

            {/* ── GLOBAL FILTER BAR ── */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-lg shadow-indigo-200">
                <div className="flex items-center gap-3 text-white">
                    <Activity size={20} />
                    <div>
                        <h3 className="font-bold text-sm">Período de análisis</h3>
                        <p className="text-xs text-indigo-100">{periodLabel}</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                        <label className="text-indigo-200 text-xs">Desde:</label>
                        <select value={fromIdx} onChange={e => setFromIdx(Number(e.target.value))} className="bg-white/20 backdrop-blur text-white border border-white/30 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-white/50">
                            {MONTHS_OPTIONS.map((m, i) => <option key={i} value={i} className="text-gray-900">{m.label}</option>)}
                        </select>
                    </div>
                    <div className="flex items-center gap-2">
                        <label className="text-indigo-200 text-xs">Hasta:</label>
                        <select value={toIdx} onChange={e => setToIdx(Number(e.target.value))} className="bg-white/20 backdrop-blur text-white border border-white/30 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-white/50">
                            {MONTHS_OPTIONS.map((m, i) => <option key={i} value={i} className="text-gray-900">{m.label}</option>)}
                        </select>
                    </div>
                    <div className="flex items-center gap-2">
                        <label className="text-indigo-200 text-xs">Moneda:</label>
                        <div className="flex bg-white/20 rounded-lg overflow-hidden border border-white/30">
                            <button onClick={() => setCurrencyMode('ARS')}
                                className={`px-3 py-1.5 text-xs font-bold transition-all ${currencyMode === 'ARS' ? 'bg-white text-indigo-700' : 'text-white hover:bg-white/10'}`}>
                                $ ARS
                            </button>
                            <button onClick={() => setCurrencyMode('USD')}
                                className={`px-3 py-1.5 text-xs font-bold transition-all ${currencyMode === 'USD' ? 'bg-white text-green-700' : 'text-white hover:bg-white/10'}`}>
                                u$d USD
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center items-center h-64"><div className="text-gray-400 text-sm animate-pulse">Cargando dashboard...</div></div>
            ) : data ? (
                <>
                    {activeTab === "cashflow" && <CashflowDashboard data={data} fromIdx={fromIdx} toIdx={toIdx} periodLabel={periodLabel} currencyMode={currencyMode} />}
                    {activeTab === "sales" && <SalesDashboard data={data} fromIdx={fromIdx} toIdx={toIdx} months={MONTHS_OPTIONS} periodLabel={periodLabel} currencyMode={currencyMode} />}
                    {activeTab === "purchases" && <PurchasesDashboard data={data} fromIdx={fromIdx} toIdx={toIdx} months={MONTHS_OPTIONS} periodLabel={periodLabel} currencyMode={currencyMode} />}
                    {activeTab === "inventory" && <InventoryDashboard data={data} currencyMode={currencyMode} />}
                    {activeTab === "products" && <ProductsDashboard data={data} currencyMode={currencyMode} />}
                    {activeTab === "providers" && <ProvidersDashboard data={data} fromIdx={fromIdx} toIdx={toIdx} periodLabel={periodLabel} currencyMode={currencyMode} />}
                    {activeTab === "crm" && <CRMDashboard data={data} fromIdx={fromIdx} toIdx={toIdx} months={MONTHS_OPTIONS} periodLabel={periodLabel} currencyMode={currencyMode} />}
                    {activeTab === "rrhh" && <RRHHDashboard data={data} fromIdx={fromIdx} toIdx={toIdx} periodLabel={periodLabel} />}
                </>
            ) : (
                <div className="text-center text-gray-500 py-12">No se pudo cargar el dashboard</div>
            )}
        </div>
    );
}

// ══════════════════════════════════════════
//  SALES DASHBOARD
// ══════════════════════════════════════════
function SalesDashboard({ data, fromIdx, toIdx, months, periodLabel, currencyMode }: { data: any; fromIdx: number; toIdx: number; months: any[]; periodLabel: string; currencyMode: 'ARS' | 'USD' }) {
    const usdRate = data.latest_usd_rate || 1;
    // Filter monthly data by selected range
    const allMonthly = data.monthly || [];
    const filteredMonthly = allMonthly.filter((m: any) => {
        for (let i = fromIdx; i <= toIdx; i++) {
            if (m.month?.includes(months[i]?.label?.split(' ')[0]) || m.month_num === months[i]?.month && m.year === months[i]?.year) return true;
        }
        return true; // show all if no match
    });
    const monthlyConverted = filteredMonthly.map((m: any) => cvt(m.total, currencyMode, usdRate));
    const maxMonthly = Math.max(...monthlyConverted, 1);

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <KPICard icon={<DollarSign size={14} />} label="Total Facturado" value={fmtMoney(data.total_invoiced || 0, currencyMode, usdRate, true)} color="border-green-200" trend={data.growth_pct} sub={`${data.total_count} facturas`} />
                <KPICard icon={<TrendingUp size={14} />} label="Facturación Mensual" value={fmtMoney(data.this_month || 0, currencyMode, usdRate, true)} sub={`Mes anterior: ${fmtMoney(data.last_month || 0, currencyMode, usdRate, true)}`} color="border-blue-200" />
                <KPICard icon={<FileText size={14} />} label="Pendientes" value={fmtMoney(data.pending_amount || 0, currencyMode, usdRate, true)} sub={`${data.pending_count} facturas`} color="border-amber-200" />
                <KPICard icon={<AlertTriangle size={14} />} label="Vencidas" value={fmtMoney(data.overdue_amount || 0, currencyMode, usdRate, true)} sub={`${data.overdue_count} facturas`} color="border-red-200" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <KPICard icon={<Target size={14} />} label="Ticket Promedio" value={fmtMoney(data.avg_invoice || 0, currencyMode, usdRate)} color="border-indigo-200" />
                <KPICard icon={<DollarSign size={14} />} label="Cobrado" value={fmtMoney(data.paid_amount || 0, currencyMode, usdRate, true)} sub={`${data.paid_count} facturas cobradas`} color="border-green-200" />
                <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                    <p className="text-xs text-gray-500 mb-2 flex items-center gap-1"><Activity size={12} /> Tendencia {periodLabel}</p>
                    <MiniBar data={monthlyConverted} maxVal={maxMonthly} color="bg-indigo-500" />
                </div>
            </div>

            {/* Commission KPIs */}
            {(data.total_commissions > 0 || (data.seller_commissions || []).length > 0) && (
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                    <h3 className="font-bold text-sm text-gray-800 mb-4 flex items-center gap-2"><Users size={16} className="text-orange-500" /> Comisiones de Vendedores</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <KPICard icon={<DollarSign size={14} />} label="Comisiones Totales" value={fmtMoney(data.total_commissions || 0, currencyMode, usdRate, true)} color="border-orange-200" />
                        <KPICard icon={<DollarSign size={14} />} label="Comisiones Ganadas" value={fmtMoney(data.accepted_commissions || 0, currencyMode, usdRate, true)} color="border-green-200" />
                    </div>
                    {(data.seller_commissions || []).length > 0 && (
                        <div className="space-y-2">
                            {data.seller_commissions.map((sc: any) => (
                                <div key={sc.seller_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <span className="w-8 h-8 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center text-xs font-bold">{sc.seller_name?.charAt(0)}</span>
                                        <div><p className="text-sm font-medium text-gray-900">{sc.seller_name}</p><p className="text-[10px] text-gray-500">{sc.quotes_count} presupuestos</p></div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-bold text-orange-600">{fmtMoney(sc.total_commission, currencyMode, usdRate)}</p>
                                        <p className="text-[10px] text-green-600">Ganada: {fmtMoney(sc.won_commission, currencyMode, usdRate)}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                    <h3 className="font-bold text-sm text-gray-800 mb-4 flex items-center gap-2"><BarChart3 size={16} className="text-indigo-500" /> Facturación Mensual</h3>
                    <div className="space-y-2">
                        {filteredMonthly.slice(-6).map((m: any) => (
                            <HBar key={m.month} label={`${m.month} (${m.count})`} value={cvt(m.total, currencyMode, usdRate)} max={maxMonthly} color="bg-indigo-500" suffix="" />
                        ))}
                    </div>
                </div>

                <TableCard title="Top Clientes por Facturación" icon={<Star size={16} className="text-amber-500" />}
                    headers={["#", "Cliente", "Facturas", "Total"]}
                    rows={(data.top_clients || []).map((c: any, i: number) => [
                        <span className="font-bold text-indigo-500">{i + 1}</span>,
                        <span className="font-medium text-gray-900">{c.client_name}</span>,
                        <span className="text-gray-600">{c.count}</span>,
                        <span className="font-bold text-green-600">{fmtMoney(c.amount, currencyMode, usdRate)}</span>,
                    ])}
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* By Type */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                    <h3 className="font-bold text-sm text-gray-800 mb-4 flex items-center gap-2"><PieChart size={16} className="text-purple-500" /> Por Tipo de Comprobante</h3>
                    <div className="space-y-3">
                        {data.type_breakdown?.map((t: any) => (
                            <div key={t.type} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <div><p className="font-medium text-sm text-gray-900">{t.type}</p><p className="text-[10px] text-gray-500">{t.count} comprobantes</p></div>
                                <span className="font-bold text-gray-900">{fmtMoney(t.amount, currencyMode, usdRate)}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* By Currency */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                    <h3 className="font-bold text-sm text-gray-800 mb-4 flex items-center gap-2"><Layers size={16} className="text-green-500" /> Por Moneda</h3>
                    <div className="space-y-3">
                        {data.currency_breakdown?.map((c: any) => (
                            <div key={c.currency} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <span className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm ${c.currency === "USD" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}`}>{c.currency}</span>
                                    <div><p className="font-medium text-sm text-gray-900">{c.count} facturas</p></div>
                                </div>
                                <span className="font-bold text-gray-900">{fmtMoney(c.amount, currencyMode, usdRate)}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Full-width line chart */}
            <TimelineLineChart
                title="Evolución de Facturación Mensual"
                periodLabel={periodLabel}
                labels={filteredMonthly.map((m: any) => m.month)}
                series={[
                    { name: "Facturado", data: filteredMonthly.map((m: any) => cvt(m.total, currencyMode, usdRate)), color: "#6366f1" },
                    { name: "Cantidad", data: filteredMonthly.map((m: any) => m.count * (maxMonthly / Math.max(...filteredMonthly.map((x: any) => x.count), 1))), color: "#10b981" },
                ]}
            />
        </div>
    );
}

// ══════════════════════════════════════════
//  PURCHASES DASHBOARD
// ══════════════════════════════════════════
function PurchasesDashboard({ data, fromIdx, toIdx, months, periodLabel, currencyMode }: { data: any; fromIdx: number; toIdx: number; months: any[]; periodLabel: string; currencyMode: 'ARS' | 'USD' }) {
    const usdRate = data.latest_usd_rate || parseFloat(localStorage.getItem('usdToArs') || '1000');
    const poMonthly = data.po_monthly?.map((m: any) => cvt(m.total, currencyMode, usdRate)) || [];
    const maxPo = Math.max(...poMonthly, 1);

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <KPICard icon={<ShoppingCart size={14} />} label="Órdenes de Compra" value={data.total_purchase_orders?.toString()} sub={fmtMoney(data.total_po_amount || 0, currencyMode, usdRate, true)} color="border-blue-200" />
                <KPICard icon={<CreditCard size={14} />} label="Órdenes de Pago" value={data.total_payment_orders?.toString()} sub={fmtMoney(data.total_pay_amount || 0, currencyMode, usdRate, true)} color="border-purple-200" />
                <KPICard icon={<DollarSign size={14} />} label="Total Compras" value={fmtMoney(data.total_po_amount || 0, currencyMode, usdRate, true)} color="border-green-200" />
                <KPICard icon={<DollarSign size={14} />} label="Total Pagos" value={fmtMoney(data.total_pay_amount || 0, currencyMode, usdRate, true)} color="border-amber-200" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* OC by status */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                    <h3 className="font-bold text-sm text-gray-800 mb-4 flex items-center gap-2"><PieChart size={16} className="text-blue-500" /> OC por Estado</h3>
                    <div className="space-y-2">
                        {(data.po_by_status || []).map((s: any) => (
                            <div key={s.status} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <div className="flex items-center gap-2">
                                    <StatusPill label={s.status} color={s.status === "completada" ? "bg-green-100 text-green-700" : s.status === "pendiente" ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-700"} />
                                    <span className="text-xs text-gray-600">{s.count} órdenes</span>
                                </div>
                                <span className="font-bold text-sm">{fmtMoney(s.amount, currencyMode, usdRate)}</span>
                            </div>
                        ))}
                        {(data.po_by_status || []).length === 0 && <p className="text-gray-400 text-sm text-center py-4">Sin órdenes de compra</p>}
                    </div>
                </div>

                {/* OP by status */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                    <h3 className="font-bold text-sm text-gray-800 mb-4 flex items-center gap-2"><PieChart size={16} className="text-purple-500" /> OP por Estado</h3>
                    <div className="space-y-2">
                        {(data.pay_by_status || []).map((s: any) => (
                            <div key={s.status} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <div className="flex items-center gap-2">
                                    <StatusPill label={s.status} color={s.status === "pagada" ? "bg-green-100 text-green-700" : s.status === "pendiente" ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-700"} />
                                    <span className="text-xs text-gray-600">{s.count} órdenes</span>
                                </div>
                                <span className="font-bold text-sm">{fmtMoney(s.amount, currencyMode, usdRate)}</span>
                            </div>
                        ))}
                        {(data.pay_by_status || []).length === 0 && <p className="text-gray-400 text-sm text-center py-4">Sin órdenes de pago</p>}
                    </div>
                </div>
            </div>

            {/* Monthly trend */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                <h3 className="font-bold text-sm text-gray-800 mb-4 flex items-center gap-2"><BarChart3 size={16} className="text-blue-500" /> Compras Mensuales</h3>
                <div className="space-y-2">
                    {data.po_monthly?.slice(-6).map((m: any) => (
                        <HBar key={m.month} label={m.month} value={cvt(m.total, currencyMode, usdRate)} max={maxPo} color="bg-blue-500" />
                    ))}
                </div>
            </div>

            {/* Full-width line chart */}
            <TimelineLineChart
                title="Evolución de Compras Mensuales"
                periodLabel={periodLabel}
                labels={(data.po_monthly || []).map((m: any) => m.month)}
                series={[
                    { name: "Compras (OC)", data: poMonthly, color: "#3b82f6" },
                ]}
            />

            {/* Top providers */}
            <TableCard title="Top Proveedores por Compras" icon={<Truck size={16} className="text-blue-500" />}
                headers={["Proveedor", "OC", "Monto OC", "OP", "Monto OP"]}
                rows={(data.top_providers || []).map((p: any) => [
                    <span className="font-medium text-gray-900">{p.provider_name}</span>,
                    <span className="text-gray-600">{p.po_count}</span>,
                    <span className="font-bold text-blue-600">{fmtMoney(p.po_amount || 0, currencyMode, usdRate)}</span>,
                    <span className="text-gray-600">{p.pay_count || 0}</span>,
                    <span className="font-bold text-purple-600">{fmtMoney(p.pay_amount || 0, currencyMode, usdRate)}</span>,
                ])}
            />
        </div>
    );
}

// ══════════════════════════════════════════
//  INVENTORY DASHBOARD
// ══════════════════════════════════════════
function InventoryDashboard({ data, currencyMode }: { data: any; currencyMode: 'ARS' | 'USD' }) {
    const usdRate = parseFloat(localStorage.getItem('usdToArs') || '1000');
    const whMax = Math.max(...(data.by_warehouse || []).map((w: any) => w.value), 1);
    const catMax = Math.max(...(data.by_category || []).map((c: any) => c.value), 1);

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <KPICard icon={<Package size={14} />} label="Items Rastreados" value={data.total_items?.toString()} color="border-blue-200" />
                <KPICard icon={<Layers size={14} />} label="Stock Total" value={`${data.total_stock_units?.toLocaleString()} uds`} color="border-indigo-200" />
                <KPICard icon={<DollarSign size={14} />} label="Valor Total" value={fmtMoney(data.total_value || 0, currencyMode, usdRate, true)} color="border-green-200" />
                <KPICard icon={<AlertTriangle size={14} />} label="Stock Bajo" value={data.critical_count?.toString()} color="border-red-200" />
                <KPICard icon={<TrendingUp size={14} />} label="Sobre stock" value={data.over_count?.toString()} color="border-amber-200" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* By warehouse */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                    <h3 className="font-bold text-sm text-gray-800 mb-4 flex items-center gap-2"><WarehouseIcon size={16} className="text-indigo-500" /> Por Depósito</h3>
                    <div className="space-y-3">
                        {(data.by_warehouse || []).map((w: any) => (
                            <div key={w.warehouse_id} className="p-3 bg-gray-50 rounded-lg">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="font-medium text-sm text-gray-900">{w.warehouse_name}</span>
                                    <span className="font-bold text-indigo-600">{fmtMoney(w.value, currencyMode, usdRate)}</span>
                                </div>
                                <div className="flex gap-4 text-[10px] text-gray-500">
                                    <span>{w.count} items</span>
                                    <span>{w.stock.toLocaleString()} unidades</span>
                                </div>
                                <div className="h-1.5 bg-gray-200 rounded-full mt-2 overflow-hidden">
                                    <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${(w.value / whMax) * 100}%` }} />
                                </div>
                            </div>
                        ))}
                        {(data.by_warehouse || []).length === 0 && <p className="text-gray-400 text-sm text-center py-4">Sin datos de inventario</p>}
                    </div>
                </div>

                {/* By category */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                    <h3 className="font-bold text-sm text-gray-800 mb-4 flex items-center gap-2"><PieChart size={16} className="text-purple-500" /> Por Categoría</h3>
                    <div className="space-y-2">
                        {(data.by_category || []).map((c: any) => (
                            <HBar key={c.category} label={`${c.category} (${c.count})`} value={c.value} max={catMax} color="bg-purple-500" suffix="" />
                        ))}
                        {(data.by_category || []).length === 0 && <p className="text-gray-400 text-sm text-center py-4">Sin categorías</p>}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* By type */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                    <h3 className="font-bold text-sm text-gray-800 mb-4 flex items-center gap-2"><Layers size={16} className="text-green-500" /> Por Tipo</h3>
                    <div className="space-y-3">
                        {(data.by_type || []).map((t: any) => (
                            <div key={t.type} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <div>
                                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${t.type === 'product' ? 'bg-blue-100 text-blue-700' : t.type === 'service' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>{t.type}</span>
                                    <span className="text-xs text-gray-500 ml-2">{t.count} items · {t.stock.toLocaleString()} uds</span>
                                </div>
                                <span className="font-bold text-sm">{fmtMoney(t.value, currencyMode, usdRate)}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Critical items */}
                <div className="bg-white rounded-xl border border-red-100 shadow-sm p-5">
                    <h3 className="font-bold text-sm text-red-700 mb-4 flex items-center gap-2"><AlertTriangle size={16} className="text-red-500" /> Items con Stock Bajo</h3>
                    <div className="space-y-2">
                        {(data.critical_items || []).map((it: any, i: number) => (
                            <div key={i} className="flex items-center justify-between p-2 bg-red-50 rounded-lg">
                                <span className="text-xs font-medium text-gray-800">{it.product}</span>
                                <span className="text-xs font-bold text-red-600">{it.stock}/{it.min_stock} {it.unit}</span>
                            </div>
                        ))}
                        {(data.critical_items || []).length === 0 && <p className="text-green-600 text-sm text-center py-4">✓ No hay items con stock bajo</p>}
                    </div>
                </div>
            </div>
        </div>
    );
}

// ══════════════════════════════════════════
//  PRODUCTS DASHBOARD
// ══════════════════════════════════════════
function ProductsDashboard({ data, currencyMode }: { data: any; currencyMode: 'ARS' | 'USD' }) {
    const usdRate = parseFloat(localStorage.getItem('usdToArs') || '1000');
    const catMax = Math.max(...(data.by_category || []).map((c: any) => c.count), 1);

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <KPICard icon={<Package size={14} />} label="Total Productos" value={data.total?.toString()} sub={`${data.active} activos · ${data.inactive} inactivos`} color="border-blue-200" />
                <KPICard icon={<DollarSign size={14} />} label="Precio Promedio" value={fmtMoney(data.avg_price || 0, currencyMode, usdRate)} color="border-green-200" />
                <KPICard icon={<ArrowUp size={14} />} label="Precio Máximo" value={fmtMoney(data.max_price?.price || 0, currencyMode, usdRate)} sub={data.max_price?.name} color="border-indigo-200" />
                <KPICard icon={<ArrowDown size={14} />} label="Precio Mínimo" value={fmtMoney(data.min_price?.price || 0, currencyMode, usdRate)} sub={data.min_price?.name} color="border-amber-200" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* By type */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                    <h3 className="font-bold text-sm text-gray-800 mb-4 flex items-center gap-2"><Layers size={16} className="text-purple-500" /> Por Tipo</h3>
                    <div className="space-y-3">
                        {(data.by_type || []).map((t: any) => (
                            <div key={t.type} className="p-3 bg-gray-50 rounded-lg">
                                <div className="flex items-center justify-between mb-1">
                                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${t.type === 'product' ? 'bg-blue-100 text-blue-700' : t.type === 'service' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>{t.type}</span>
                                    <span className="font-bold text-gray-900">{t.count}</span>
                                </div>
                                <p className="text-[10px] text-gray-500">Precio promedio: {fmtMoney(t.avg_price || 0, currencyMode, usdRate)}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* By category */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 lg:col-span-2">
                    <h3 className="font-bold text-sm text-gray-800 mb-4 flex items-center gap-2"><PieChart size={16} className="text-blue-500" /> Por Categoría</h3>
                    <div className="space-y-2">
                        {(data.by_category || []).map((c: any) => (
                            <HBar key={c.category} label={c.category} value={c.count} max={catMax} color="bg-blue-500" />
                        ))}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* By family */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                    <h3 className="font-bold text-sm text-gray-800 mb-4 flex items-center gap-2"><Building2 size={16} className="text-indigo-500" /> Por Familia</h3>
                    <div className="space-y-3">
                        {(data.by_family || []).map((f: any) => (
                            <div key={f.family} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <span className="text-sm font-medium text-gray-800">{f.family}</span>
                                <span className="font-bold text-indigo-600">{f.count}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Price ranges */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                    <h3 className="font-bold text-sm text-gray-800 mb-4 flex items-center gap-2"><BarChart3 size={16} className="text-green-500" /> Distribución de Precios</h3>
                    <div className="space-y-2">
                        {(data.price_ranges || []).map((r: any) => (
                            <HBar key={r.range} label={`${currencyMode === 'ARS' ? '$' : 'u$d'} ${r.range}`} value={r.count} max={data.total || 1} color="bg-green-500" />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

function ProvidersDashboard({ data, fromIdx, toIdx, periodLabel, currencyMode }: { data: any; fromIdx: number; toIdx: number; periodLabel: string; currencyMode: 'ARS' | 'USD' }) {
    const usdRate = data.latest_usd_rate || 1;

    const timeline = data.timeline || [];
    const filteredTimeline = timeline.slice(fromIdx, toIdx + 1);

    // Colors per provider
    const provColors = ["#6366f1", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899", "#f97316"];

    // Get unique providers from timeline
    const allProviders: { id: number; name: string }[] = [];
    const seen = new Set<number>();
    for (const m of timeline) {
        for (const p of m.providers || []) {
            if (!seen.has(p.provider_id)) {
                seen.add(p.provider_id);
                allProviders.push({ id: p.provider_id, name: p.provider_name });
            }
        }
    }

    // SVG line chart data — full width, per provider
    const chartW = 1200;
    const chartH = 300;
    const padL = 55;
    const padR = 20;
    const padT = 25;
    const padB = 40;
    const innerW = chartW - padL - padR;
    const innerH = chartH - padT - padB;

    // Find max value across all providers in filtered timeline (converted)
    const maxVal = Math.max(
        ...filteredTimeline.map((m: any) => cvt(m.total_expected, currencyMode, usdRate)),
        ...filteredTimeline.flatMap((m: any) => (m.providers || []).map((p: any) => cvt(p.paid, currencyMode, usdRate))),
        1
    );

    // Build polyline points per provider
    const providerLines = allProviders.map((prov, pi) => {
        const points = filteredTimeline.map((m: any, i: number) => {
            const x = padL + (filteredTimeline.length > 1 ? (i / (filteredTimeline.length - 1)) * innerW : innerW / 2);
            const provData = (m.providers || []).find((p: any) => p.provider_id === prov.id);
            const val = cvt(provData ? provData.paid : 0, currencyMode, usdRate);
            const y = padT + innerH - (val / maxVal) * innerH;
            return { x, y, val, expected: cvt(provData?.expected || 0, currencyMode, usdRate), pending: cvt(provData?.pending || 0, currencyMode, usdRate) };
        });
        return { ...prov, points, color: provColors[pi % provColors.length] };
    });

    // Expected total line (dashed)
    const expectedPoints = filteredTimeline.map((m: any, i: number) => {
        const x = padL + (filteredTimeline.length > 1 ? (i / (filteredTimeline.length - 1)) * innerW : innerW / 2);
        const y = padT + innerH - (cvt(m.total_expected, currencyMode, usdRate) / maxVal) * innerH;
        return `${x},${y}`;
    }).join(" ");

    // Max bar value for provider bars (converted)
    const maxProvBar = Math.max(...(data.providers || []).map((p: any) => cvt(p.monthly_cost, currencyMode, usdRate)), 1);

    return (
        <div className="space-y-6">
            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <KPICard icon={<Truck size={14} />} label="Proveedores" value={data.total?.toString()} sub={`${data.active} activos`} color="border-blue-200" />
                <KPICard icon={<Package size={14} />} label="Servicios" value={data.total_services?.toString()} sub={`${data.active_services} activos`} color="border-indigo-200" />
                <KPICard icon={<DollarSign size={14} />} label="Costo Esperado/Mes" value={fmtMoney(data.total_monthly_cost || 0, currencyMode, usdRate)} sub={data.current_month} color="border-amber-200" />
                <KPICard icon={<DollarSign size={14} />} label={`Pagado ${data.current_month || ""}`} value={fmtMoney(data.current_month_paid || 0, currencyMode, usdRate)} color="border-green-200" />
                <KPICard icon={<AlertTriangle size={14} />} label={`Pendiente ${data.current_month || ""}`} value={fmtMoney(data.current_month_pending || 0, currencyMode, usdRate)} sub={`Total histórico: ${fmtMoney(data.total_paid_all_time || 0, currencyMode, usdRate)}`} color="border-red-200" />
            </div>

            {/* Timeline chart — full width */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                    <h3 className="font-bold text-sm text-gray-800 flex items-center gap-2"><Activity size={16} className="text-indigo-500" /> Timeline de Costos por Proveedor</h3>
                    <span className="text-xs text-gray-400">{periodLabel}</span>
                </div>

                {/* Legend */}
                <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs mb-4">
                    <span className="flex items-center gap-1.5"><span className="w-6 h-0.5 bg-gray-400 inline-block" style={{ borderTop: "2px dashed #9ca3af" }} /> Total Esperado</span>
                    {allProviders.map((prov, i) => (
                        <span key={prov.id} className="flex items-center gap-1.5">
                            <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: provColors[i % provColors.length] }} />
                            <span className="text-gray-700">{prov.name}</span>
                        </span>
                    ))}
                </div>

                <svg viewBox={`0 0 ${chartW} ${chartH}`} className="w-full" preserveAspectRatio="xMidYMid meet" style={{ minHeight: 220 }}>
                    {/* Grid lines */}
                    {[0, 0.25, 0.5, 0.75, 1].map((pct, gi) => (
                        <g key={gi}>
                            <line x1={padL} y1={padT + innerH * (1 - pct)} x2={chartW - padR} y2={padT + innerH * (1 - pct)} stroke="#f3f4f6" strokeWidth={1} />
                            <text x={padL - 8} y={padT + innerH * (1 - pct) + 4} textAnchor="end" fontSize={10} fill="#9ca3af">{maxVal * pct >= 1e6 ? `${(maxVal * pct / 1e6).toFixed(1)}M` : maxVal * pct >= 1e3 ? `${(maxVal * pct / 1e3).toFixed(0)}K` : Math.round(maxVal * pct)}</text>
                        </g>
                    ))}

                    {/* Expected total line (dashed) */}
                    {filteredTimeline.length > 1 && <polyline points={expectedPoints} fill="none" stroke="#9ca3af" strokeWidth={1.5} strokeDasharray="6,4" />}

                    {/* Per-provider lines */}
                    {providerLines.map(prov => {
                        if (prov.points.every(pt => pt.val === 0)) return null;
                        const linePoints = prov.points.map(pt => `${pt.x},${pt.y}`).join(" ");
                        // Area fill
                        const areaPoints = `${prov.points[0].x},${padT + innerH} ${linePoints} ${prov.points[prov.points.length - 1].x},${padT + innerH}`;
                        return (
                            <g key={prov.id}>
                                <polygon points={areaPoints} fill={prov.color} opacity={0.07} />
                                {filteredTimeline.length > 1 && <polyline points={linePoints} fill="none" stroke={prov.color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />}
                                {prov.points.map((pt, pi) => (
                                    <g key={pi}>
                                        <circle cx={pt.x} cy={pt.y} r={4} fill={prov.color} stroke="white" strokeWidth={2} />
                                        {pt.val > 0 && <text x={pt.x} y={pt.y - 10} textAnchor="middle" fontSize={8} fill={prov.color} fontWeight="bold">{pt.val >= 1e6 ? `${(pt.val / 1e6).toFixed(1)}M` : pt.val >= 1e3 ? `${(pt.val / 1e3).toFixed(0)}K` : Math.round(pt.val)}</text>}
                                    </g>
                                ))}
                            </g>
                        );
                    })}

                    {/* Month labels */}
                    {filteredTimeline.map((m: any, i: number) => {
                        const x = padL + (filteredTimeline.length > 1 ? (i / (filteredTimeline.length - 1)) * innerW : innerW / 2);
                        return (
                            <g key={i}>
                                <line x1={x} y1={padT} x2={x} y2={padT + innerH} stroke="#f3f4f6" strokeWidth={0.5} />
                                <text x={x} y={padT + innerH + 18} textAnchor="middle" fontSize={10} fill="#6b7280">{m.month.split(" ")[0]}</text>
                                <text x={x} y={padT + innerH + 30} textAnchor="middle" fontSize={8} fill="#9ca3af">{m.month.split(" ")[1]}</text>
                            </g>
                        );
                    })}
                </svg>
            </div>

            {/* Provider bars: paid vs pending per month */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                <h3 className="font-bold text-sm text-gray-800 mb-4 flex items-center gap-2"><BarChart3 size={16} className="text-green-500" /> Proveedores — Pagado vs Pendiente ({data.current_month})</h3>
                <div className="flex gap-4 text-xs mb-4">
                    <span className="flex items-center gap-1"><span className="w-3 h-3 bg-green-500 rounded inline-block" /> Pagado</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-3 bg-green-200 rounded inline-block" /> Pendiente</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-gray-300 inline-block" /> Esperado</span>
                </div>
                <div className="space-y-3">
                    {(data.providers || []).filter((p: any) => p.monthly_cost > 0).map((p: any, i: number) => {
                        const paidPct = maxProvBar > 0 ? (cvt(p.current_paid, currencyMode, usdRate) / maxProvBar) * 100 : 0;
                        const pendingPct = maxProvBar > 0 ? (cvt(p.current_pending, currencyMode, usdRate) / maxProvBar) * 100 : 0;
                        const expectedPct = maxProvBar > 0 ? (cvt(p.monthly_cost, currencyMode, usdRate) / maxProvBar) * 100 : 0;
                        return (
                            <div key={p.id} className="space-y-1">
                                <div className="flex justify-between text-xs">
                                    <div className="flex items-center gap-2">
                                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: provColors[i % provColors.length] }} />
                                        <span className="font-medium text-gray-900">{p.name}</span>
                                        <span className="text-[10px] text-gray-400">{p.service_count} servicios</span>
                                    </div>
                                    <div className="flex gap-3">
                                        <span className="text-green-600 font-bold">{fmtMoney(p.current_paid, currencyMode, usdRate)}</span>
                                        {p.current_pending > 0 && <span className="text-red-400 font-medium">+ {fmtMoney(p.current_pending, currencyMode, usdRate)} pend.</span>}
                                        <span className="text-gray-400">/ {fmtMoney(p.monthly_cost, currencyMode, usdRate)}</span>
                                    </div>
                                </div>
                                <div className="h-4 bg-gray-50 rounded-full overflow-hidden relative">
                                    {/* Expected line */}
                                    <div className="absolute top-0 h-full border-r-2 border-dashed border-gray-300" style={{ left: `${expectedPct}%` }} />
                                    {/* Paid portion (solid) */}
                                    <div className="absolute top-0 h-full bg-green-500 rounded-l-full transition-all duration-500" style={{ width: `${paidPct}%` }} />
                                    {/* Pending portion (light) */}
                                    <div className="absolute top-0 h-full bg-green-200 rounded-r-full transition-all duration-500" style={{ left: `${paidPct}%`, width: `${pendingPct}%` }} />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Provider ranking */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                <h3 className="font-bold text-sm text-gray-800 mb-4 flex items-center gap-2"><Star size={16} className="text-amber-500" /> Ranking de Proveedores por Costo Mensual</h3>
                <div className="space-y-3">
                    {(data.providers || []).map((p: any, i: number) => (
                        <div key={p.id} className="p-4 bg-gray-50 rounded-xl flex flex-col md:flex-row md:items-center gap-3">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                <span className={`w-8 h-8 flex items-center justify-center rounded-lg font-black text-sm flex-shrink-0 ${i < 3 ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white' : 'bg-gray-200 text-gray-600'}`}>{i + 1}</span>
                                <div className="min-w-0">
                                    <p className="font-semibold text-gray-900 truncate">{p.name}</p>
                                    <p className="text-[10px] text-gray-500">{p.service_count} servicios · {p.payment_count} pagos realizados · {p.is_active ? '✓ Activo' : '✗ Inactivo'}</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-4 text-center">
                                <div>
                                    <p className="text-[10px] text-gray-500">Costo/Mes</p>
                                    <p className="font-bold text-sm text-gray-900">{fmtMoney(p.monthly_cost, currencyMode, usdRate)}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-gray-500">Pagado Hoy</p>
                                    <p className="font-bold text-sm text-green-600">{fmtMoney(p.current_paid, currencyMode, usdRate)}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-gray-500">Pendiente</p>
                                    <p className={`font-bold text-sm ${p.current_pending > 0 ? 'text-red-500' : 'text-green-600'}`}>{fmtMoney(p.current_pending, currencyMode, usdRate)}</p>
                                </div>
                            </div>
                            <div className="w-28 flex-shrink-0 text-right">
                                <p className="text-[10px] text-gray-500">Total Pagado</p>
                                <p className="font-black text-indigo-600">{fmtMoney(p.total_paid, currencyMode, usdRate)}</p>
                            </div>
                        </div>
                    ))}
                    {(data.providers || []).length === 0 && <p className="text-gray-400 text-sm text-center py-6">Sin proveedores registrados</p>}
                </div>
            </div>
        </div >
    );
}

// ══════════════════════════════════════════
//  CASHFLOW DASHBOARD
// ══════════════════════════════════════════
function CashflowDashboard({ data, fromIdx, toIdx, periodLabel, currencyMode }: { data: any; fromIdx: number; toIdx: number; periodLabel: string; currencyMode: 'ARS' | 'USD' }) {
    const usdRate = data.latest_usd_rate || 1;
    const timeline = data.timeline || [];
    const filtered = timeline.slice(fromIdx, toIdx + 1);

    // ── Recalculate KPIs from filtered range ──
    const fIncome = filtered.reduce((s: number, m: any) => s + (m.income || 0), 0);
    const fExpense = filtered.reduce((s: number, m: any) => s + (m.total_expense || 0), 0);
    const fNet = fIncome - fExpense;
    const fPending = filtered.reduce((s: number, m: any) => s + (m.pending_income || 0), 0);
    const fSvcExpense = filtered.reduce((s: number, m: any) => s + (m.services_expense || 0), 0);
    const fOtherExpense = filtered.reduce((s: number, m: any) => s + (m.other_expense || 0), 0);
    const lastMonth = filtered[filtered.length - 1];
    const firstMonth = filtered[0];

    // SVG chart
    const chartW = 1200;
    const chartH = 320;
    const padL = 70;
    const padR = 20;
    const padT = 30;
    const padB = 45;
    const innerW = chartW - padL - padR;
    const innerH = chartH - padT - padB;

    const allVals = filtered.flatMap((m: any) => [cvt(m.income, currencyMode, usdRate), cvt(m.total_expense, currencyMode, usdRate), Math.abs(cvt(m.net, currencyMode, usdRate)), Math.abs(cvt(m.balance, currencyMode, usdRate))]);
    const maxVal = Math.max(...allVals, 1);

    const getX = (i: number) => padL + (filtered.length > 1 ? (i / (filtered.length - 1)) * innerW : innerW / 2);
    const getY = (v: number) => padT + innerH - (v / maxVal) * innerH;

    const cvtVal = (key: string, m: any) => cvt(m[key], currencyMode, usdRate);
    const buildLine = (key: string) => filtered.map((m: any, i: number) => `${getX(i)},${getY(cvtVal(key, m))}`).join(" ");
    const buildArea = (key: string) => `${getX(0)},${padT + innerH} ${buildLine(key)} ${getX(filtered.length - 1)},${padT + innerH}`;

    const incomeMax = Math.max(...(data.income_breakdown || []).map((c: any) => cvt(c.amount, currencyMode, usdRate)), 1);
    const expenseMax = Math.max(...(data.expense_breakdown || []).map((c: any) => cvt(c.amount, currencyMode, usdRate)), 1);

    const fmt = (v: number) => v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v.toLocaleString();

    return (
        <div className="space-y-6">

            {/* KPIs — calculated from filtered range */}
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                <KPICard icon={<TrendingUp size={14} />} label="Ingresos Cobrados" value={fmtMoney(fIncome, currencyMode, usdRate, true)} color="border-green-200" />
                <KPICard icon={<TrendingDown size={14} />} label="Egresos Totales" value={fmtMoney(fExpense, currencyMode, usdRate, true)} sub={`Servicios: ${fmtMoney(fSvcExpense, currencyMode, usdRate, true)}`} color="border-red-200" />
                <KPICard icon={<Wallet size={14} />} label="Cashflow Neto" value={fmtMoney(fNet, currencyMode, usdRate, true)} color={fNet >= 0 ? "border-green-200" : "border-red-200"} />
                <KPICard icon={<AlertTriangle size={14} />} label="Ingresos Pendientes" value={fmtMoney(fPending, currencyMode, usdRate, true)} sub="Por cobrar" color="border-amber-200" />
                <KPICard icon={<CreditCard size={14} />} label="Gasto Esperado/Mes" value={fmtMoney(data.expected_monthly_expense || 0, currencyMode, usdRate)} sub="Servicios activos" color="border-purple-200" />
                <KPICard icon={<Users size={14} />} label="Comisiones Vendedores" value={fmtMoney(data.accepted_commissions || 0, currencyMode, usdRate, true)} sub={`Total: ${fmtMoney(data.total_commissions || 0, currencyMode, usdRate, true)}`} color="border-orange-200" />
            </div>

            {/* Period summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200">
                    <p className="text-xs text-green-600 font-medium mb-1">Total Ingresos</p>
                    <p className="text-xl font-black text-green-700">{fmtMoney(fIncome, currencyMode, usdRate)}</p>
                    <p className="text-[10px] text-green-500 mt-1">{filtered.length} meses</p>
                </div>
                <div className="bg-gradient-to-br from-red-50 to-rose-50 rounded-xl p-4 border border-red-200">
                    <p className="text-xs text-red-600 font-medium mb-1">Total Egresos</p>
                    <p className="text-xl font-black text-red-700">{fmtMoney(fExpense, currencyMode, usdRate)}</p>
                    <p className="text-[10px] text-red-500 mt-1">{filtered.length} meses</p>
                </div>
                <div className={`bg-gradient-to-br ${fNet >= 0 ? 'from-blue-50 to-indigo-50 border-blue-200' : 'from-red-50 to-pink-50 border-red-200'} rounded-xl p-4 border`}>
                    <p className={`text-xs font-medium mb-1 ${fNet >= 0 ? 'text-blue-600' : 'text-red-600'}`}>Resultado Neto</p>
                    <p className={`text-xl font-black ${fNet >= 0 ? 'text-blue-700' : 'text-red-700'}`}>{fmtMoney(fNet, currencyMode, usdRate)}</p>
                    <p className={`text-[10px] mt-1 ${fNet >= 0 ? 'text-blue-500' : 'text-red-500'}`}>Período seleccionado</p>
                </div>
                <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-4 border border-indigo-200">
                    <p className="text-xs text-indigo-600 font-medium mb-1">Balance Final</p>
                    <p className="text-xl font-black text-indigo-700">{fmtMoney(lastMonth?.balance || 0, currencyMode, usdRate)}</p>
                    <p className="text-[10px] text-indigo-500 mt-1">Al cierre del período</p>
                </div>
            </div>

            {/* Cashflow chart */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                    <h3 className="font-bold text-sm text-gray-800 flex items-center gap-2"><Activity size={16} className="text-indigo-500" /> Cashflow — Ingresos vs Egresos</h3>
                </div>

                <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs mb-4">
                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-green-500 rounded-full inline-block" /> Ingresos</span>
                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-red-400 rounded-full inline-block" /> Egresos</span>
                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-indigo-500 rounded-full inline-block" /> Balance Acumulado</span>
                </div>

                <svg viewBox={`0 0 ${chartW} ${chartH}`} className="w-full" preserveAspectRatio="xMidYMid meet" style={{ minHeight: 250 }}>
                    {[0, 0.25, 0.5, 0.75, 1].map((pct, gi) => (
                        <g key={gi}>
                            <line x1={padL} y1={padT + innerH * (1 - pct)} x2={chartW - padR} y2={padT + innerH * (1 - pct)} stroke="#f3f4f6" strokeWidth={1} />
                            <text x={padL - 8} y={padT + innerH * (1 - pct) + 4} textAnchor="end" fontSize={10} fill="#9ca3af">{fmt(maxVal * pct)}</text>
                        </g>
                    ))}
                    <polygon points={buildArea("income")} fill="rgba(34,197,94,0.12)" />
                    {filtered.length > 1 && <polyline points={buildLine("income")} fill="none" stroke="#22c55e" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />}
                    <polygon points={buildArea("total_expense")} fill="rgba(239,68,68,0.08)" />
                    {filtered.length > 1 && <polyline points={buildLine("total_expense")} fill="none" stroke="#f87171" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />}
                    {filtered.length > 1 && <polyline points={buildLine("balance")} fill="none" stroke="#6366f1" strokeWidth={2} strokeDasharray="6,3" strokeLinecap="round" />}
                    {filtered.map((m: any, i: number) => {
                        const x = getX(i);
                        return (
                            <g key={i}>
                                <line x1={x} y1={padT} x2={x} y2={padT + innerH} stroke="#f3f4f6" strokeWidth={0.5} />
                                <circle cx={x} cy={getY(cvt(m.income, currencyMode, usdRate))} r={4} fill="#22c55e" stroke="white" strokeWidth={2} />
                                <circle cx={x} cy={getY(cvt(m.total_expense, currencyMode, usdRate))} r={3.5} fill="#f87171" stroke="white" strokeWidth={2} />
                                <circle cx={x} cy={getY(Math.abs(cvt(m.balance, currencyMode, usdRate)))} r={3} fill="#6366f1" stroke="white" strokeWidth={1.5} />
                                {m.income > 0 && <text x={x} y={getY(cvt(m.income, currencyMode, usdRate)) - 10} textAnchor="middle" fontSize={8} fill="#22c55e" fontWeight="bold">{fmt(cvt(m.income, currencyMode, usdRate))}</text>}
                                <text x={x} y={padT + innerH + 18} textAnchor="middle" fontSize={10} fill="#6b7280">{m.month.split(" ")[0]}</text>
                                <text x={x} y={padT + innerH + 30} textAnchor="middle" fontSize={8} fill="#9ca3af">{m.month.split(" ")[1]}</text>
                            </g>
                        );
                    })}
                </svg>
            </div>

            {/* Breakdown tables */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                    <h3 className="font-bold text-sm text-gray-800 mb-4 flex items-center gap-2"><TrendingUp size={16} className="text-green-500" /> Ingresos por Cliente</h3>
                    <div className="space-y-2">
                        {(data.income_breakdown || []).map((c: any) => (
                            <HBar key={c.client} label={c.client} value={cvt(c.amount, currencyMode, usdRate)} max={incomeMax} color="bg-green-500" suffix="" />
                        ))}
                        {(data.income_breakdown || []).length === 0 && <p className="text-gray-400 text-sm text-center py-4">Sin ingresos registrados</p>}
                    </div>
                </div>
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                    <h3 className="font-bold text-sm text-gray-800 mb-4 flex items-center gap-2"><TrendingDown size={16} className="text-red-500" /> Egresos por Proveedor</h3>
                    <div className="space-y-2">
                        {(data.expense_breakdown || []).map((c: any) => (
                            <HBar key={c.category} label={c.category} value={cvt(c.amount, currencyMode, usdRate)} max={expenseMax} color="bg-red-400" suffix="" />
                        ))}
                        {(data.expense_breakdown || []).length === 0 && <p className="text-gray-400 text-sm text-center py-4">Sin egresos registrados</p>}
                    </div>
                </div>
            </div>

            {/* Monthly detail table */}
            <TableCard title="Detalle Mensual" icon={<BarChart3 size={16} className="text-indigo-500" />}
                headers={["Mes", "Ingresos", "Pendientes", "Servicios", "Otros", "Total Egreso", "Neto", "Balance"]}
                rows={filtered.map((m: any) => [
                    <span className="font-medium text-gray-900">{m.month}</span>,
                    <span className="font-bold text-green-600">{fmtMoney(m.income, currencyMode, usdRate)}</span>,
                    <span className="text-amber-600">{fmtMoney(m.pending_income, currencyMode, usdRate)}</span>,
                    <span className="text-red-500">{fmtMoney(m.services_expense, currencyMode, usdRate)}</span>,
                    <span className="text-red-400">{fmtMoney(m.other_expense, currencyMode, usdRate)}</span>,
                    <span className="font-bold text-red-600">{fmtMoney(m.total_expense, currencyMode, usdRate)}</span>,
                    <span className={`font-bold ${m.net >= 0 ? 'text-green-600' : 'text-red-600'}`}>{fmtMoney(m.net, currencyMode, usdRate)}</span>,
                    <span className={`font-bold ${m.balance >= 0 ? 'text-indigo-600' : 'text-red-600'}`}>{fmtMoney(m.balance, currencyMode, usdRate)}</span>,
                ])}
            />
        </div>
    );
}

// ══════════════════════════════════════════
//  CRM DASHBOARD
// ══════════════════════════════════════════
function CRMDashboard({ data, fromIdx, toIdx, months, periodLabel, currencyMode }: { data: any; fromIdx: number; toIdx: number; months: any[]; periodLabel: string; currencyMode: 'ARS' | 'USD' }) {
    const usdRate = parseFloat(localStorage.getItem('usdToArs') || '1000');
    const maxClientInv = Math.max(...(data.client_ranking || []).map((c: any) => c.invoice_total), 1);

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <KPICard icon={<Building2 size={14} />} label="Cuentas" value={data.total_clients?.toString()} sub={`${data.active_clients} activas`} color="border-blue-200" />
                <KPICard icon={<Users size={14} />} label="Contactos" value={data.total_contacts?.toString()} color="border-indigo-200" />
                <KPICard icon={<FileText size={14} />} label="Presupuestos" value={data.total_quotes?.toString()} sub={fmtMoney(data.total_quoted || 0, currencyMode, usdRate, true)} color="border-purple-200" />
                <KPICard icon={<DollarSign size={14} />} label="Facturas" value={data.total_invoices?.toString()} sub={fmtMoney(data.total_invoiced || 0, currencyMode, usdRate, true)} color="border-green-200" />
                <KPICard icon={<Target size={14} />} label="Conversión" value={`${data.conversion_rate}%`} sub="Presupuesto → Factura" color="border-amber-200" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Quote statuses */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                    <h3 className="font-bold text-sm text-gray-800 mb-4 flex items-center gap-2"><PieChart size={16} className="text-purple-500" /> Presupuestos por Estado</h3>
                    <div className="space-y-3">
                        {(data.quote_statuses || []).map((s: any) => (
                            <div key={s.status} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <div className="flex items-center gap-2">
                                    <StatusPill label={s.status} color={s.status === "approved" ? "bg-green-100 text-green-700" : s.status === "draft" ? "bg-gray-100 text-gray-700" : s.status === "sent" ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"} />
                                    <span className="text-xs text-gray-600">{s.count} presupuestos</span>
                                </div>
                                <span className="font-bold text-sm">{fmtMoney(s.amount, currencyMode, usdRate)}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Funnel */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                    <h3 className="font-bold text-sm text-gray-800 mb-4 flex items-center gap-2"><Activity size={16} className="text-indigo-500" /> Embudo Comercial</h3>
                    <div className="space-y-4">
                        {[
                            { label: "Cuentas Activas", value: data.active_clients, color: "from-blue-500 to-indigo-500", width: "100%" },
                            { label: "Con Presupuestos", value: data.total_quotes, color: "from-purple-500 to-pink-500", width: `${Math.min((data.total_quotes / (data.active_clients || 1)) * 100, 100)}%` },
                            { label: "Con Facturas", value: data.total_invoices, color: "from-green-500 to-emerald-500", width: `${Math.min((data.total_invoices / (data.active_clients || 1)) * 100, 100)}%` },
                            { label: "Remitos", value: data.total_remitos, color: "from-amber-500 to-orange-500", width: `${Math.min((data.total_remitos / (data.active_clients || 1)) * 100, 100)}%` },
                        ].map((step, i) => (
                            <div key={i}>
                                <div className="flex justify-between text-xs mb-1"><span className="text-gray-600">{step.label}</span><span className="font-bold">{step.value}</span></div>
                                <div className="h-5 bg-gray-100 rounded-full overflow-hidden" style={{ width: step.width }}>
                                    <div className={`h-full bg-gradient-to-r ${step.color} rounded-full`} style={{ width: "100%" }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Client ranking */}
            <TableCard title="Ranking de Clientes" icon={<Star size={16} className="text-amber-500" />}
                headers={["#", "Cliente", "Facturas", "Total Facturado", "Presupuestos", "Remitos", "Contactos"]}
                rows={(data.client_ranking || []).map((c: any, i: number) => [
                    <span className={`font-black ${i < 3 ? 'text-amber-500' : 'text-gray-400'}`}>{i + 1}</span>,
                    <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">{c.name}</span>
                        {c.is_active ? <span className="w-1.5 h-1.5 rounded-full bg-green-500" /> : <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />}
                    </div>,
                    <span className="text-gray-600">{c.invoice_count}</span>,
                    <span className="font-bold text-green-600">{fmtMoney(c.invoice_total, currencyMode, usdRate)}</span>,
                    <span className="text-gray-600">{c.quote_count}</span>,
                    <span className="text-gray-600">{c.remito_count}</span>,
                    <span className="text-gray-600">{c.contact_count}</span>,
                ])}
            />

            {/* Full-width line chart */}
            {(data.monthly || []).length > 0 && (
                <TimelineLineChart
                    title="Evolución CRM — Presupuestos vs Facturación"
                    periodLabel={periodLabel}
                    labels={(data.monthly || []).map((m: any) => m.month)}
                    series={[
                        { name: `Presupuestos (${currencyMode === 'ARS' ? '$' : 'u$d'})`, data: (data.monthly || []).map((m: any) => cvt(m.quoted || 0, currencyMode, usdRate)), color: "#8b5cf6" },
                        { name: `Facturación (${currencyMode === 'ARS' ? '$' : 'u$d'})`, data: (data.monthly || []).map((m: any) => cvt(m.invoiced || 0, currencyMode, usdRate)), color: "#10b981" },
                    ]}
                />
            )}
        </div>
    );
}

// ══════════════════════════════════════════
//  RRHH / PAYROLL DASHBOARD
// ══════════════════════════════════════════
function RRHHDashboard({ data, fromIdx, toIdx, periodLabel }: { data: any; fromIdx: number; toIdx: number; periodLabel: string }) {
    const fmt = (n: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(n);

    const timeline = data.timeline || [];
    const filteredTimeline = timeline.slice(fromIdx, toIdx + 1);

    const STATUS_COLORS: Record<string, string> = {
        draft: 'bg-gray-100 text-gray-700',
        confirmed: 'bg-blue-100 text-blue-700',
        paid: 'bg-green-100 text-green-700',
    };
    const STATUS_LABELS: Record<string, string> = { draft: 'Borrador', confirmed: 'Confirmado', paid: 'Pagado' };

    // Unique employees from timeline for chart
    const empSet = new Set<number>();
    const empMap: Record<number, string> = {};
    for (const m of timeline) {
        for (const e of m.employees || []) { empSet.add(e.employee_id); empMap[e.employee_id] = e.employee_name; }
    }
    const empIds = Array.from(empSet);
    const empColors = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899", "#f97316", "#14b8a6", "#a855f7"];

    // Compute max values for departmental bars
    const deptMax = Math.max(...(data.by_department || []).map((d: any) => d.total_salary), 1);
    const senMax = Math.max(...(data.seniority || []).map((s: any) => s.count), 1);

    return (
        <div className="space-y-6">
            {/* KPIs Row 1 — Employee Overview */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <KPICard icon={<Users size={14} />} label="Total Empleados" value={data.total_employees?.toString()} sub={`${data.active_employees} activos · ${data.inactive_employees} inactivos`} color="border-blue-200" />
                <KPICard icon={<DollarSign size={14} />} label="Salario Promedio" value={fmt(data.avg_salary || 0)} sub={`Min: ${fmt(data.min_salary || 0)} — Max: ${fmt(data.max_salary || 0)}`} color="border-green-200" />
                <KPICard icon={<Banknote size={14} />} label="Masa Salarial Mensual" value={fmt(data.total_payroll || 0)} sub={`${data.active_employees} empleados activos`} color="border-indigo-200" />
                <KPICard icon={<Clock size={14} />} label="Fichadas" value={data.total_check_ins?.toString()} sub="Total check-ins" color="border-purple-200" />
            </div>

            {/* KPIs Row 2 — Latest Period */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <KPICard icon={<TrendingUp size={14} />} label={`Bruto ${data.latest_period_description}`} value={fmt(data.latest_total_gross || 0)} color="border-emerald-200" />
                <KPICard icon={<TrendingDown size={14} />} label={`Deducciones ${data.latest_period_description}`} value={fmt(data.latest_total_deductions || 0)} color="border-red-200" />
                <KPICard icon={<DollarSign size={14} />} label={`Neto ${data.latest_period_description}`} value={fmt(data.latest_total_net || 0)} color="border-blue-200" />
                <KPICard icon={<Building2 size={14} />} label={`Costo Empleador ${data.latest_period_description}`} value={fmt(data.latest_total_employer || 0)} color="border-amber-200" />
            </div>

            {/* Timeline Chart — Gross / Net / Deductions / Employer Cost */}
            <TimelineLineChart
                title="Evolución Mensual de Costos de Nómina"
                periodLabel={periodLabel}
                labels={filteredTimeline.map((m: any) => m.month)}
                series={[
                    { name: "Bruto", data: filteredTimeline.map((m: any) => m.total_gross), color: "#10b981" },
                    { name: "Neto", data: filteredTimeline.map((m: any) => m.total_net), color: "#3b82f6" },
                    { name: "Deducciones", data: filteredTimeline.map((m: any) => m.total_deductions), color: "#ef4444" },
                    { name: "Costo Empleador", data: filteredTimeline.map((m: any) => m.total_employer_cost), color: "#f59e0b" },
                ]}
            />

            {/* Per-Employee Line Chart */}
            {empIds.length > 0 && (
                <TimelineLineChart
                    title="Costo Neto por Empleado"
                    periodLabel={periodLabel}
                    labels={filteredTimeline.map((m: any) => m.month)}
                    series={empIds.map((eid, i) => ({
                        name: empMap[eid] || `Emp ${eid}`,
                        data: filteredTimeline.map((m: any) => {
                            const emp = (m.employees || []).find((e: any) => e.employee_id === eid);
                            return emp ? emp.net : 0;
                        }),
                        color: empColors[i % empColors.length],
                    }))}
                />
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* By department */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                    <h3 className="font-bold text-sm text-gray-800 mb-4 flex items-center gap-2"><Building2 size={16} className="text-indigo-500" /> Por Departamento</h3>
                    <div className="space-y-2">
                        {(data.by_department || []).map((d: any) => (
                            <div key={d.department} className="p-3 bg-gray-50 rounded-lg">
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-sm font-medium text-gray-900">{d.department}</span>
                                    <span className="text-xs font-bold text-gray-700">{d.count} emp · {fmt(d.total_salary)}</span>
                                </div>
                                <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                    <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${(d.total_salary / deptMax) * 100}%` }} />
                                </div>
                            </div>
                        ))}
                        {(data.by_department || []).length === 0 && <p className="text-gray-400 text-sm text-center py-4">Sin datos</p>}
                    </div>
                </div>

                {/* Contract types */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                    <h3 className="font-bold text-sm text-gray-800 mb-4 flex items-center gap-2"><FileText size={16} className="text-purple-500" /> Tipo de Contrato</h3>
                    <div className="space-y-3">
                        {(data.by_contract || []).map((c: any) => {
                            const labels: Record<string, string> = { permanent: 'Permanente', temporary: 'Temporario', freelance: 'Freelance', internship: 'Pasantía' };
                            const colors: Record<string, string> = { permanent: 'bg-green-100 text-green-700', temporary: 'bg-amber-100 text-amber-700', freelance: 'bg-blue-100 text-blue-700', internship: 'bg-purple-100 text-purple-700' };
                            return (
                                <div key={c.type} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${colors[c.type] || 'bg-gray-100 text-gray-700'}`}>{labels[c.type] || c.type}</span>
                                    <span className="font-bold text-gray-900">{c.count}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Seniority */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                    <h3 className="font-bold text-sm text-gray-800 mb-4 flex items-center gap-2"><UserCheck size={16} className="text-teal-500" /> Antigüedad</h3>
                    <div className="space-y-2">
                        {(data.seniority || []).map((s: any) => (
                            <HBar key={s.range} label={s.range} value={s.count} max={senMax} color="bg-teal-500" />
                        ))}
                    </div>
                </div>
            </div>

            {/* Period Summary */}
            {(data.period_summary || []).length > 0 && (
                <TableCard title="Últimos Períodos de Liquidación" icon={<Banknote size={16} className="text-emerald-500" />}
                    headers={["Período", "Estado", "Recibos", "Bruto", "Neto", "Costo Empleador"]}
                    rows={(data.period_summary || []).map((p: any) => [
                        <span className="font-medium text-gray-900">{p.description}</span>,
                        <StatusPill label={STATUS_LABELS[p.status] || p.status} color={STATUS_COLORS[p.status] || 'bg-gray-100 text-gray-700'} />,
                        <span className="text-gray-600">{p.slip_count}</span>,
                        <span className="font-bold text-emerald-600">{fmt(p.total_gross)}</span>,
                        <span className="font-bold text-blue-600">{fmt(p.total_net)}</span>,
                        <span className="font-bold text-amber-600">{fmt(p.total_employer_cost)}</span>,
                    ])}
                />
            )}

            {/* Employee Ranking */}
            <TableCard title="Ranking de Empleados por Salario" icon={<Star size={16} className="text-amber-500" />}
                headers={["#", "Empleado", "Legajo", "Departamento", "Cargo", "Salario", "Total Neto Pagado", "Recibos"]}
                rows={(data.employee_ranking || []).map((e: any, i: number) => [
                    <span className={`font-black ${i < 3 ? 'text-amber-500' : 'text-gray-400'}`}>{i + 1}</span>,
                    <span className="font-medium text-gray-900">{e.name}</span>,
                    <span className="font-mono text-xs text-teal-600">{e.legajo}</span>,
                    <span className="text-gray-600">{e.department}</span>,
                    <span className="text-gray-600">{e.position}</span>,
                    <span className="font-bold text-green-600">{fmt(e.salary)}</span>,
                    <span className="font-bold text-blue-600">{fmt(e.total_paid_net)}</span>,
                    <span className="text-gray-600">{e.slips_count}</span>,
                ])}
            />
        </div>
    );
}
