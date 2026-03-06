import { useState, useEffect } from "react";
import api from "../api/client";
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';
import { TrendingUp, TrendingDown, Activity, Wallet, CheckCircle, Clock, ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";

interface Invoice {
    id: number;
    invoice_number: string;
    type: string;
    amount: number;
    currency: string;
    status_id: number;
    issue_date: string;
    due_date: string;
    payment_date: string | null;
}

interface ProviderService {
    id: number;
    name: string;
    cost_price: number;
    currency: string;
    billing_cycle: string;
    expiration_date: string;
    status: string;
    provider_id: number;
}

interface ServicePayment {
    id: number;
    provider_service_id: number;
    period_month: number;
    period_year: number;
    amount: number;
    payment_date: string;
}

export default function Finances() {
    const { t } = useTranslation();
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [statuses, setStatuses] = useState<any[]>([]);
    const [providerServices, setProviderServices] = useState<ProviderService[]>([]);
    const [servicePayments, setServicePayments] = useState<ServicePayment[]>([]);
    const [loading, setLoading] = useState(true);

    // Service payments month navigation
    const [spMonthOffset, setSpMonthOffset] = useState(0);

    const [usdToArs, setUsdToArs] = useState<number>(() => {
        const saved = localStorage.getItem('usdToArs');
        return saved ? parseFloat(saved) : 1000;
    });
    const [eurToArs, setEurToArs] = useState<number>(() => {
        const saved = localStorage.getItem('eurToArs');
        return saved ? parseFloat(saved) : 1100;
    });
    const [kpiCurrency, setKpiCurrency] = useState("ARS");

    useEffect(() => {
        localStorage.setItem('usdToArs', usdToArs.toString());
    }, [usdToArs]);
    useEffect(() => {
        localStorage.setItem('eurToArs', eurToArs.toString());
    }, [eurToArs]);

    const fetchData = async () => {
        try {
            const [invRes, statRes, servRes, spRes] = await Promise.all([
                api.get("/invoices/"),
                api.get("/invoices/statuses"),
                api.get("/provider-services/"),
                api.get("/service-payments/")
            ]);
            setInvoices(invRes.data);
            setStatuses(statRes.data);
            setProviderServices(servRes.data);
            setServicePayments(spRes.data);
        } catch (error) {
            console.error("Failed to fetch finance data", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleMarkPaid = async (serviceId: number, amount: number, month: number, year: number) => {
        try {
            await api.post('/service-payments/', {
                provider_service_id: serviceId,
                period_month: month,
                period_year: year,
                amount,
                payment_date: new Date().toISOString()
            });
            fetchData();
        } catch (error) {
            console.error('Failed to mark payment', error);
        }
    };

    const handleUnmarkPaid = async (paymentId: number) => {
        try {
            await api.delete(`/service-payments/${paymentId}`);
            fetchData();
        } catch (error) {
            console.error('Failed to unmark payment', error);
        }
    };

    const isServicePaidForMonth = (serviceId: number, month: number, year: number) => {
        return servicePayments.find(sp =>
            sp.provider_service_id === serviceId &&
            sp.period_month === month &&
            sp.period_year === year
        );
    };

    const convertToTarget = (amount: number, currency: string) => {
        if (kpiCurrency === 'Global(ARS)') {
            if (currency === 'USD') return amount * usdToArs;
            if (currency === 'EUR') return amount * eurToArs;
            return Number(amount);
        }
        return currency === kpiCurrency ? Number(amount) : 0;
    };

    const getStatus = (id: number | null) => {
        if (!id) return { name: t('common.none'), color_code: "#9CA3AF" };
        return statuses.find((s) => s.id === id) || { name: "Unknown", color_code: "#9CA3AF" };
    };

    // --- NC detection helper ---
    const isNCInvoice = (inv: Invoice) => {
        return inv.invoice_number.startsWith('NC-')
            || (inv as any).arca_cbte_tipo === 3
            || (inv as any).arca_cbte_tipo === 8
            || (inv as any).arca_cbte_tipo === 13;
    };

    // --- Metrics Calculations ---
    let totalIncome = 0;   // Cobrado (Issued & Paid)
    let totalExpense = 0;  // Gastado (Received & Paid)
    let pendingIncome = 0; // A Cobrar (Issued & Pending)
    let pendingExpense = 0; // A Pagar (Received & Pending)

    invoices.forEach(inv => {
        const arsAmount = convertToTarget(Number(inv.amount), inv.currency);
        if (arsAmount === 0) return;
        const status = getStatus(inv.status_id);
        const statusName = status.name.toLowerCase();
        const isPaid = statusName.includes('paid') || statusName.includes('pagad') || statusName.includes('cobrad');
        const isNC = isNCInvoice(inv);
        const sign = isNC ? -1 : 1;

        const date = new Date(inv.issue_date || inv.due_date);
        const isYTD = date.getFullYear() === new Date().getFullYear();

        if (inv.type === 'issued') {
            if (isPaid) {
                if (isYTD) totalIncome += arsAmount * sign;
            }
            else pendingIncome += arsAmount * sign;
        } else if (inv.type === 'received') {
            if (isPaid) {
                if (isYTD) totalExpense += arsAmount;
            }
            else pendingExpense += arsAmount;
        }
    });

    // --- Projected Monthly Recurring Expenses ---
    let projectedMonthlyExpense = 0;
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    // We calculate projectedMonthlyExpense inside the providerServices loop below

    // --- Chart Data Preparation (Last 6 Months) ---
    const last6Months: { label: string, month: number, year: number, Income: number, Expense: number, PendingIncome: number, PendingExpense: number }[] = [];
    const monthlyBreakdown: { label: string, month: number, year: number, ARS_Income: number, ARS_Expense: number, USD_Income: number, USD_Expense: number, EUR_Income: number, EUR_Expense: number }[] = [];

    for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const label = d.toLocaleString('default', { month: 'short' }) + " " + d.getFullYear();
        last6Months.push({
            label, month: d.getMonth(), year: d.getFullYear(), Income: 0, Expense: 0, PendingIncome: 0, PendingExpense: 0
        });
        monthlyBreakdown.push({
            label, month: d.getMonth(), year: d.getFullYear(),
            ARS_Income: 0, ARS_Expense: 0, USD_Income: 0, USD_Expense: 0, EUR_Income: 0, EUR_Expense: 0
        });
    }

    invoices.forEach(inv => {
        const status = getStatus(inv.status_id);
        const statusName = status.name.toLowerCase();
        const isPaid = statusName.includes('paid') || statusName.includes('pagad') || statusName.includes('cobrad');
        const isNC = isNCInvoice(inv);
        const sign = isNC ? -1 : 1;

        const arsAmount = convertToTarget(Number(inv.amount), inv.currency);
        if (arsAmount === 0) return;

        if (isPaid) {
            const date = new Date(inv.payment_date || inv.issue_date || inv.due_date);
            const month = date.getMonth();
            const year = date.getFullYear();

            const chartItem = last6Months.find(m => m.month === month && m.year === year);
            if (chartItem) {
                if (inv.type === 'issued') chartItem.Income += arsAmount * sign;
                else if (inv.type === 'received') chartItem.Expense += arsAmount;
            }
        } else {
            const date = new Date(inv.due_date || inv.issue_date);
            const month = date.getMonth();
            const year = date.getFullYear();

            const chartItem = last6Months.find(m => m.month === month && m.year === year);
            if (chartItem) {
                if (inv.type === 'issued') chartItem.PendingIncome += arsAmount * sign;
                else if (inv.type === 'received') chartItem.PendingExpense += arsAmount;
            }
        }

        // Breakdown table (always by issue_date, only paid)
        if (isPaid) {
            const date = new Date(inv.payment_date || inv.issue_date || inv.due_date);
            const month = date.getMonth();
            const year = date.getFullYear();
            const breakdownItem = monthlyBreakdown.find(m => m.month === month && m.year === year);
            if (breakdownItem) {
                const rawAmount = Number(inv.amount) * sign;
                if (inv.currency === 'ARS') {
                    if (inv.type === 'issued') breakdownItem.ARS_Income += rawAmount;
                    else breakdownItem.ARS_Expense += Number(inv.amount);
                } else if (inv.currency === 'USD') {
                    if (inv.type === 'issued') breakdownItem.USD_Income += rawAmount;
                    else breakdownItem.USD_Expense += Number(inv.amount);
                } else if (inv.currency === 'EUR') {
                    if (inv.type === 'issued') breakdownItem.EUR_Income += rawAmount;
                    else breakdownItem.EUR_Expense += Number(inv.amount);
                }
            }
        }
    });

    // --- Add Automated Provider Services to Expenses ---
    providerServices.filter(s => s.status === 'Active').forEach(s => {
        if (!s.expiration_date) return;
        const exp = new Date(s.expiration_date);
        const expMonth = exp.getUTCMonth();
        const expYear = exp.getUTCFullYear();
        // Always convert to ARS for chart display (don't skip by kpiCurrency)
        let cost = Number(s.cost_price);
        if (s.currency === 'USD') cost *= usdToArs;
        else if (s.currency === 'EUR') cost *= eurToArs;
        if (cost === 0) return;
        const cycle = s.billing_cycle || 'Monthly';

        // Add to Projected Fixed Expense (Current Month)
        let isDueThisCurrentMonth = false;
        if (cycle === 'One-time') {
            isDueThisCurrentMonth = (currentYear === expYear && currentMonth === expMonth);
        } else if (cycle === 'Monthly') {
            isDueThisCurrentMonth = true;
        } else if (cycle === 'Bimonthly') {
            const diff = (currentYear - expYear) * 12 + (currentMonth - expMonth);
            isDueThisCurrentMonth = Math.abs(diff) % 2 === 0;
        } else if (cycle === 'Yearly') {
            isDueThisCurrentMonth = currentMonth === expMonth;
        }

        if (isDueThisCurrentMonth) {
            projectedMonthlyExpense += cost;
        }

        // Add to historical chart — split by paid/pending
        last6Months.forEach(chartItem => {
            const chartMonthsDiff = (chartItem.year - expYear) * 12 + (chartItem.month - expMonth);

            let isDue = false;
            if (cycle === 'One-time') {
                isDue = chartMonthsDiff === 0;
            } else if (cycle === 'Monthly') {
                isDue = true;
            } else if (cycle === 'Bimonthly') {
                isDue = Math.abs(chartMonthsDiff) % 2 === 0;
            } else if (cycle === 'Yearly') {
                isDue = Math.abs(chartMonthsDiff) % 12 === 0;
            }

            if (isDue) {
                const payment = isServicePaidForMonth(s.id, chartItem.month + 1, chartItem.year);
                if (payment) {
                    chartItem.Expense += cost;
                } else {
                    chartItem.PendingExpense += cost;
                }
            }
        });

        // Add to monthly breakdown raw values
        monthlyBreakdown.forEach(bm => {
            const bmMonthsDiff = (bm.year - expYear) * 12 + (bm.month - expMonth);
            let isDue = false;
            if (cycle === 'One-time') isDue = bmMonthsDiff === 0;
            else if (cycle === 'Monthly') isDue = true;
            else if (cycle === 'Bimonthly') isDue = Math.abs(bmMonthsDiff) % 2 === 0;
            else if (cycle === 'Yearly') isDue = Math.abs(bmMonthsDiff) % 12 === 0;

            if (isDue) {
                const rawCost = Number(s.cost_price);
                if (s.currency === 'ARS') bm.ARS_Expense += rawCost;
                else if (s.currency === 'USD') bm.USD_Expense += rawCost;
                else if (s.currency === 'EUR') bm.EUR_Expense += rawCost;
            }
        });

        // Add to YTD totalExpense
        for (let m = 0; m <= currentMonth; m++) {
            const ytdMonthsDiff = (currentYear - expYear) * 12 + (m - expMonth);
            let isDue = false;
            if (cycle === 'One-time') {
                isDue = ytdMonthsDiff === 0;
            } else if (cycle === 'Monthly') {
                isDue = true;
            } else if (cycle === 'Bimonthly') {
                isDue = Math.abs(ytdMonthsDiff) % 2 === 0;
            } else if (cycle === 'Yearly') {
                isDue = Math.abs(ytdMonthsDiff) % 12 === 0;
            }
            if (isDue) {
                totalExpense += cost;
            }
        }
    });

    const formatCurrency = (val: number) => {
        const symbol = kpiCurrency === 'USD' ? 'u$d ' : kpiCurrency === 'EUR' ? '€ ' : 'AR$ ';
        return symbol + val.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    };

    if (loading) {
        return <div className="p-8 text-center text-gray-500">{t('finances.loading')}</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100 gap-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-gray-900">{t('finances.title')}</h2>
                    <p className="text-sm text-gray-500">{t('finances.description')}</p>
                </div>

                <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 items-end sm:items-center">
                    <div className="flex bg-gray-100 p-1 rounded-lg w-max shadow-sm border border-gray-200">
                        {['Global(ARS)', 'ARS', 'USD', 'EUR'].map(curr => (
                            <button
                                key={curr}
                                onClick={() => setKpiCurrency(curr)}
                                className={`px-4 py-1.5 text-sm font-bold rounded-md transition-all ${kpiCurrency === curr ? 'bg-white text-blue-600 shadow border border-gray-200' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                {curr}
                            </button>
                        ))}
                    </div>

                    {kpiCurrency === 'Global(ARS)' && (
                        <div className="flex bg-gray-50 p-2 rounded-lg border border-gray-200 shadow-inner space-x-3 items-center">
                            <div className="flex items-center space-x-1">
                                <span className="text-xs font-bold text-gray-600">USD:</span>
                                <input
                                    type="number"
                                    value={usdToArs}
                                    onChange={e => setUsdToArs(Number(e.target.value))}
                                    className="w-16 px-1 py-1 text-xs border border-gray-300 rounded outline-none text-right font-medium"
                                />
                            </div>
                            <div className="flex items-center space-x-1">
                                <span className="text-xs font-bold text-gray-600">EUR:</span>
                                <input
                                    type="number"
                                    value={eurToArs}
                                    onChange={e => setEurToArs(Number(e.target.value))}
                                    className="w-16 px-1 py-1 text-xs border border-gray-300 rounded outline-none text-right font-medium"
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Top KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-gray-500 mb-1">{t('finances.kpis.historicalIncome')}</p>
                            <h3 className="text-2xl font-bold text-green-600">{formatCurrency(totalIncome)}</h3>
                        </div>
                        <div className="p-2 bg-green-50 rounded-lg text-green-600">
                            <TrendingUp size={20} />
                        </div>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">{t('finances.kpis.historicalIncomeDesc')}</p>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-gray-500 mb-1">{t('finances.kpis.totalExpenses')}</p>
                            <h3 className="text-2xl font-bold text-red-600">{formatCurrency(totalExpense)}</h3>
                        </div>
                        <div className="p-2 bg-red-50 rounded-lg text-red-600">
                            <TrendingDown size={20} />
                        </div>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">{t('finances.kpis.totalExpensesDesc')}</p>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-gray-500 mb-1">{t('finances.kpis.pendingIncome')}</p>
                            <h3 className="text-2xl font-bold text-blue-600">{formatCurrency(pendingIncome)}</h3>
                        </div>
                        <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                            <Wallet size={20} />
                        </div>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">{t('finances.kpis.pendingIncomeDesc')}</p>
                </div>

                <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl shadow-sm border border-indigo-100 p-5">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-indigo-800 mb-1">{t('finances.kpis.projectedExpense')}</p>
                            <h3 className="text-2xl font-bold text-indigo-900">{formatCurrency(projectedMonthlyExpense)}</h3>
                        </div>
                        <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
                            <Activity size={20} />
                        </div>
                    </div>
                    <p className="text-xs text-indigo-600/70 mt-2">{t('finances.kpis.projectedExpenseDesc')}</p>
                </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-6">{t('finances.charts.incomeVsExpenses')}</h3>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={last6Months} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} dy={10} />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#6B7280', fontSize: 12 }}
                                    tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`}
                                />
                                <Tooltip
                                    cursor={{ fill: '#F3F4F6' }}
                                    formatter={(value: any) => [formatCurrency(Number(value)), ""]}
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                                <Bar dataKey="Income" name={t('finances.charts.income')} stackId="income" fill="#10B981" radius={[4, 4, 0, 0]} maxBarSize={40} />
                                <Bar dataKey="PendingIncome" name={t('finances.charts.pendingIncome')} stackId="income" fill="#BBF7D0" radius={[4, 4, 0, 0]} maxBarSize={40} />
                                <Bar dataKey="Expense" name={t('finances.charts.expense')} stackId="expense" fill="#EF4444" radius={[4, 4, 0, 0]} maxBarSize={40} />
                                <Bar dataKey="PendingExpense" name={t('finances.charts.pendingExpense')} stackId="expense" fill="#FECACA" radius={[4, 4, 0, 0]} maxBarSize={40} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col">
                    <h3 className="text-lg font-bold text-gray-900 mb-6">{t('finances.charts.cashflowDistribution')}</h3>

                    <div className="flex-1 flex flex-col justify-center space-y-6">
                        <div>
                            <div className="flex justify-between text-sm mb-2">
                                <span className="text-gray-600 font-medium">{t('finances.charts.profitMargin')}</span>
                                <span className="font-bold text-gray-900">
                                    {totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome * 100).toFixed(1) : 0}%
                                </span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-2.5">
                                <div className="bg-green-500 h-2.5 rounded-full" style={{ width: `${Math.max(0, Math.min(100, ((totalIncome - totalExpense) / totalIncome * 100)))}%` }}></div>
                            </div>
                        </div>

                        <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                            <h4 className="text-sm font-bold text-gray-700 mb-3">{t('finances.charts.futureSummary')}</h4>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-gray-500">{t('finances.charts.incomingCash')}</span>
                                    <span className="font-medium text-green-600">+{formatCurrency(pendingIncome)}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-gray-500">{t('finances.charts.pendingPayables')}</span>
                                    <span className="font-medium text-red-600">-{formatCurrency(pendingExpense)}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-gray-500">{t('finances.charts.recurringSubscriptions')}</span>
                                    <span className="font-medium text-orange-600">-{formatCurrency(projectedMonthlyExpense)}</span>
                                </div>
                                <div className="pt-3 border-t border-gray-200 flex justify-between items-center">
                                    <span className="font-bold text-gray-900">{t('finances.charts.netProjection')}</span>
                                    <span className={`font-bold ${pendingIncome - pendingExpense - projectedMonthlyExpense >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {formatCurrency(pendingIncome - pendingExpense - projectedMonthlyExpense)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Monthly Breakdown Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100">
                    <h3 className="text-lg font-bold text-gray-900">{t('finances.monthlyBreakdown.title')}</h3>
                </div>
                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto w-full">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-gray-500 bg-gray-50 uppercase border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-4 font-semibold">{t('finances.monthlyBreakdown.month')}</th>
                                <th className="px-6 py-4 font-semibold text-right">ARS {t('finances.monthlyBreakdown.income')}</th>
                                <th className="px-6 py-4 font-semibold text-right text-red-600">ARS {t('finances.monthlyBreakdown.expense')}</th>
                                <th className="px-6 py-4 font-semibold text-right bg-blue-50/30">USD {t('finances.monthlyBreakdown.income')}</th>
                                <th className="px-6 py-4 font-semibold text-right text-red-600 bg-blue-50/30">USD {t('finances.monthlyBreakdown.expense')}</th>
                                <th className="px-6 py-4 font-semibold text-right">EUR {t('finances.monthlyBreakdown.income')}</th>
                                <th className="px-6 py-4 font-semibold text-right text-red-600">EUR {t('finances.monthlyBreakdown.expense')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {monthlyBreakdown.map((row, idx) => (
                                <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">{row.label}</td>
                                    <td className="px-6 py-4 text-right text-gray-700">{row.ARS_Income.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</td>
                                    <td className="px-6 py-4 text-right text-red-600">{row.ARS_Expense.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</td>
                                    <td className="px-6 py-4 text-right text-gray-700 bg-blue-50/30">{row.USD_Income.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</td>
                                    <td className="px-6 py-4 text-right text-red-600 bg-blue-50/30">{row.USD_Expense.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</td>
                                    <td className="px-6 py-4 text-right text-gray-700">{row.EUR_Income.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</td>
                                    <td className="px-6 py-4 text-right text-red-600">{row.EUR_Expense.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden grid grid-cols-1 gap-4 p-4 bg-gray-50">
                    {monthlyBreakdown.map((row, idx) => (
                        <div key={idx} className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex flex-col space-y-4">
                            <h3 className="font-bold text-gray-900 text-lg leading-tight border-b border-gray-50 pb-2">{row.label}</h3>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-xs text-gray-500 font-medium tracking-wider mb-1 uppercase">ARS {t('finances.monthlyBreakdown.income')}</p>
                                    <p className="font-mono font-bold text-green-600">
                                        {row.ARS_Income.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs text-gray-500 font-medium tracking-wider mb-1 uppercase text-red-600">ARS {t('finances.monthlyBreakdown.expense')}</p>
                                    <p className="font-mono font-bold text-red-600">
                                        {row.ARS_Expense.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                    </p>
                                </div>

                                <div>
                                    <p className="text-xs text-gray-500 font-medium tracking-wider mb-1 uppercase">USD {t('finances.monthlyBreakdown.income')}</p>
                                    <p className="font-mono font-bold text-green-600">
                                        {row.USD_Income.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs text-gray-500 font-medium tracking-wider mb-1 uppercase text-red-600">USD {t('finances.monthlyBreakdown.expense')}</p>
                                    <p className="font-mono font-bold text-red-600">
                                        {row.USD_Expense.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                    </p>
                                </div>

                                <div>
                                    <p className="text-xs text-gray-500 font-medium tracking-wider mb-1 uppercase">EUR {t('finances.monthlyBreakdown.income')}</p>
                                    <p className="font-mono font-bold text-green-600">
                                        {row.EUR_Income.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs text-gray-500 font-medium tracking-wider mb-1 uppercase text-red-600">EUR {t('finances.monthlyBreakdown.expense')}</p>
                                    <p className="font-mono font-bold text-red-600">
                                        {row.EUR_Expense.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                    {monthlyBreakdown.length === 0 && (
                        <div className="p-8 text-center text-gray-500 bg-white rounded-xl border border-dashed border-gray-300">
                            No data.
                        </div>
                    )}
                </div>
            </div>
            {/* Service Payments - Month Navigator */}
            {providerServices.filter(s => s.status === 'Active').length > 0 && (() => {
                const spDate = new Date(now.getFullYear(), now.getMonth() + spMonthOffset, 1);
                const spMonth = spDate.getMonth() + 1; // 1-12
                const spYear = spDate.getFullYear();
                const spLabel = spDate.toLocaleString('default', { month: 'long', year: 'numeric' });
                const isCurrentMonth = spMonthOffset === 0;

                return (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-6 border-b border-gray-100">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900">{t('finances.servicePayments.title')}</h3>
                                    <p className="text-sm text-gray-500 mt-1">{t('finances.servicePayments.description')}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setSpMonthOffset(prev => prev - 1)}
                                        className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-500"
                                    >
                                        <ChevronLeft size={20} />
                                    </button>
                                    <button
                                        onClick={() => setSpMonthOffset(0)}
                                        className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors ${isCurrentMonth
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                            }`}
                                    >
                                        {spLabel}
                                    </button>
                                    <button
                                        onClick={() => setSpMonthOffset(prev => prev + 1)}
                                        className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-500"
                                    >
                                        <ChevronRight size={20} />
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div className="divide-y divide-gray-50">
                            {providerServices.filter(s => s.status === 'Active').map(service => {
                                const payment = isServicePaidForMonth(service.id, spMonth, spYear);
                                return (
                                    <div key={service.id} className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors">
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-gray-900 truncate">{service.name}</p>
                                            <p className="text-sm text-gray-500">
                                                {service.currency} ${Number(service.cost_price).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                <span className="mx-1.5">·</span>
                                                {service.billing_cycle}
                                                <span className="mx-1.5">·</span>
                                                <span className="text-orange-600">{t('finances.servicePayments.expires')}: {new Date(service.expiration_date).toLocaleDateString()}</span>
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            {payment ? (
                                                <button
                                                    onClick={() => handleUnmarkPaid(payment.id)}
                                                    className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors text-sm font-medium border border-green-200"
                                                >
                                                    <CheckCircle size={16} />
                                                    {t('finances.servicePayments.paid')}
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => handleMarkPaid(service.id, Number(service.cost_price), spMonth, spYear)}
                                                    className="flex items-center gap-2 px-4 py-2 bg-orange-50 text-orange-700 rounded-lg hover:bg-orange-100 transition-colors text-sm font-medium border border-orange-200"
                                                >
                                                    <Clock size={16} />
                                                    {t('finances.servicePayments.pending')}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            })()}
        </div>
    );
}
