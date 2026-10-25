import { useCallback, useEffect, useRef, useState } from 'react';
import {
  FileStack,
  CalendarDays,
  TrendingUp,
  Wallet,
  Printer as PrinterIcon,
  ArrowUpRight,
  ArrowDownRight,
  AlertTriangle,
  Bell,
  Leaf,
  Building2,
  ChevronRight,
  Plus,
  RefreshCw,
} from 'lucide-react';
import type { Printer, AlertItem, Settings, PageKey } from '../types';
import { LineChart, ProgressRing, DonutChart } from './Charts';
import { getPaperStatus, statusBg, formatPeso, formatNumber } from './ui';
import type { ChartDatum, ConsumptionAnalytics } from '../data';
import type { Database } from '../lib/supabase.types';
import { supabase } from '../supabaseClient.js';

interface DashboardProps {
  printers: Printer[];
  alerts: AlertItem[];
  settings: Settings;
  analytics: ConsumptionAnalytics;
  onNavigate: (page: PageKey) => void;
  onRecord: () => void;
}

export function Dashboard({ printers, alerts, settings, analytics, onNavigate, onRecord }: DashboardProps) {
  const [trendRange, setTrendRange] = useState<'today' | 'week' | 'month' | 'year'>('week');
  const [capturedEvents, setCapturedEvents] = useState<CapturedDashboardEvent[]>([]);
  const [capturedLoading, setCapturedLoading] = useState(true);
  const [capturedRefreshing, setCapturedRefreshing] = useState(false);
  const [capturedError, setCapturedError] = useState('');
  const [capturedLoaded, setCapturedLoaded] = useState(false);
  const capturedRequestInFlight = useRef(false);
  const mounted = useRef(false);

  const loadCapturedEvents = useCallback(async (manualRefresh = false) => {
    if (capturedRequestInFlight.current) return;
    capturedRequestInFlight.current = true;
    if (mounted.current) {
      setCapturedError('');
      if (manualRefresh) setCapturedRefreshing(true);
      else setCapturedLoading(true);
    }

    try {
      const loaded: CapturedDashboardEvent[] = [];
      const pageSize = 1000;
      let offset = 0;
      while (true) {
        const { data, error } = await supabase
          .from('print_job_events')
          .select('id, agent_id, event_record_id, pages_printed, printed_at')
          .order('id', { ascending: true })
          .range(offset, offset + pageSize - 1);
        if (error) throw new Error(error.message);
        const rows = data ?? [];
        loaded.push(...rows);
        if (rows.length < pageSize) break;
        offset += pageSize;
      }

      const uniqueEvents = new Map<string, CapturedDashboardEvent>();
      for (const event of loaded) {
        const key = JSON.stringify([event.agent_id, event.event_record_id]);
        if (!uniqueEvents.has(key)) uniqueEvents.set(key, event);
      }
      if (mounted.current) {
        setCapturedEvents([...uniqueEvents.values()]);
        setCapturedLoaded(true);
      }
    } catch (loadError: unknown) {
      if (mounted.current) {
        setCapturedError(
          loadError instanceof Error ? loadError.message : 'Unable to load captured print activity.'
        );
      }
    } finally {
      capturedRequestInFlight.current = false;
      if (mounted.current) {
        setCapturedLoading(false);
        setCapturedRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    void loadCapturedEvents();
    const timer = window.setInterval(() => void loadCapturedEvents(true), 15000);
    return () => {
      mounted.current = false;
      window.clearInterval(timer);
    };
  }, [loadCapturedEvents]);

  const dashboardAnalytics = includeCapturedConsumption(
    analytics,
    capturedEvents,
    settings.paperCostPerSheet,
  );
  const highlightPrinter = printers[0];
  const officePercent = analytics.totalPaperConsumed
    ? Math.round((analytics.byPurpose.find((item) => item.label === 'Office Use')?.value ?? 0) / analytics.totalPaperConsumed * 100)
    : 0;
  const trendData = {
    today: dashboardAnalytics.today,
    week: dashboardAnalytics.daily,
    month: dashboardAnalytics.monthly,
    year: dashboardAnalytics.yearly,
  }[trendRange];
  const trendDescription = {
    today: 'Paper sheets consumed today',
    week: 'Daily paper sheets consumed over the last 7 days',
    month: 'Paper sheets consumed per month over the last 12 months',
    year: 'Paper sheets consumed per year over the last 5 years',
  }[trendRange];

  return (
    <div className="space-y-6">
      {/* Metric cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <MetricCard
          icon={FileStack}
          label="Total Paper Consumed"
          value={`${formatNumber(dashboardAnalytics.totalPaperConsumed)} sheets`}
          trend={capturedEvents.length ? 'Includes simplex-estimated captured jobs' : 'Recorded print jobs'}
          color="brand"
        />
        <MetricCard
          icon={CalendarDays}
          label="Monthly Usage"
          value={`${formatNumber(dashboardAnalytics.monthlyUsage)} sheets`}
          trend={capturedEvents.length ? 'Includes captured pages, estimated as sheets' : 'Recorded this month'}
          color="brand"
          sparkline
          sparklineData={dashboardAnalytics.daily}
        />
        <MetricCard
          icon={TrendingUp}
          label="Avg Daily Consumption"
          value={`${dashboardAnalytics.avgDailyConsumption} sheets/day`}
          trend={capturedEvents.length ? '7-day avg; captured pages estimated as sheets' : 'Average over the last 7 days'}
          color="slate"
        />
        <MetricCard
          icon={Wallet}
          label="Estimated Cost"
          value={formatPeso(dashboardAnalytics.estimatedCost)}
          trend={`₱${settings.paperCostPerSheet.toFixed(2)} / sheet${capturedEvents.length ? ' · captured cost assumes simplex' : ''}`}
          trendUp
          color="brand"
        />
        <MetricCard
          icon={PrinterIcon}
          label="Printer Paper Quantity"
          customValue={highlightPrinter ? <ProgressRing value={highlightPrinter.paperRemaining} max={highlightPrinter.maxCapacity} size={90} thickness={8} /> : 'No printer data'}
          trend={highlightPrinter?.name ?? 'Add a printer to view paper levels'}
          color="eco"
        />
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Consumption trend */}
        <div className="card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-slate-900">Paper Consumption Trend</h3>
              <p className="text-sm text-slate-500">{trendDescription}{capturedEvents.length ? ' · captured pages estimated as sheets' : ''}</p>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-1.5">
              {capturedLoaded && (
                <button
                  type="button"
                  onClick={() => void loadCapturedEvents(true)}
                  disabled={capturedLoading || capturedRefreshing}
                  className="btn-ghost inline-flex items-center gap-1.5 text-xs"
                  aria-label="Refresh captured print activity"
                >
                  <RefreshCw size={14} className={capturedRefreshing ? 'animate-spin' : ''} />
                  Refresh
                </button>
              )}
              {([
                ['today', 'Today'],
                ['week', 'Week'],
                ['month', 'Month'],
                ['year', 'Year'],
              ] as const).map(([range, label]) => (
                <button
                  key={range}
                  type="button"
                  aria-pressed={trendRange === range}
                  onClick={() => setTrendRange(range)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition ${
                    trendRange === range ? 'bg-brand-50 text-brand-700' : 'text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <LineChart data={trendData} height={240} color="#2563eb" formatValue={(v) => `${v}`} />
          <div aria-live="polite" className="mt-2 text-xs">
            {capturedLoading && (
              <p role="status" className="text-slate-500">Loading captured print consumption…</p>
            )}
            {!capturedLoading && !capturedError && capturedEvents.length === 0 && (
              <p className="text-slate-500">No captured print events yet. Existing app-recorded consumption is shown.</p>
            )}
            {capturedError && (
              <p role="alert" className="text-red-600">
                Captured activity could not be loaded; dashboard totals exclude captured jobs. {capturedError}
                {' '}
                <button
                  type="button"
                  className="underline"
                  onClick={() => void loadCapturedEvents(true)}
                  disabled={capturedRefreshing}
                >
                  Retry
                </button>
              </p>
            )}
            {capturedEvents.length > 0 && (
              <p className="text-slate-500">
                Captured printed pages are estimated as sheets using one page per sheet. Windows events do not record duplex mode.
                Purpose, department, and sustainability figures remain based on app-recorded jobs because captured events lack those details.
                Captured records are added to app-recorded totals; there is no shared job ID to reliably deduplicate across both sources.
              </p>
            )}
          </div>
        </div>

        {/* Office vs Personal */}
        <div className="card p-5">
          <h3 className="font-semibold text-slate-900 mb-1">Print Purpose</h3>
          <p className="text-sm text-slate-500 mb-4">Estimated usage distribution</p>
          <DonutChart
            data={analytics.byPurpose}
            size={160}
            thickness={24}
            centerValue={`${officePercent}%`}
            centerLabel="Office"
          />
          <p className="text-xs text-slate-400 mt-4 italic">
            Classification is an automated estimate and may require user confirmation.
          </p>
        </div>
      </div>

      {/* Printers + Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Printer overview */}
        <div className="card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-900">Printer Status Overview</h3>
            <button onClick={() => onNavigate('printers')} className="text-sm text-brand-600 hover:text-brand-700 font-medium flex items-center gap-1">
              View all <ChevronRight size={14} />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {printers.slice(0, 4).map((p) => {
              const status = getPaperStatus(p.paperRemaining);
              return (
                <div key={p.id} className="border border-slate-200 rounded-xl p-4 hover:shadow-card-hover transition">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-medium text-slate-800 text-sm">{p.name}</p>
                      <p className="text-xs text-slate-400">{p.location}</p>
                    </div>
                    <span className={`inline-flex items-center gap-1 text-xs font-medium ${p.online ? 'text-emerald-600' : 'text-slate-400'}`}>
                      <span className={`w-2 h-2 rounded-full ${p.online ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                      {p.online ? 'Online' : 'Offline'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-3">
                    <div className="flex-1">
                      <div className="flex items-baseline gap-1 mb-1">
                        <span className="text-lg font-bold text-slate-900">{p.paperRemaining}</span>
                        <span className="text-xs text-slate-400">/ {p.maxCapacity} sheets</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            status === 'Normal' ? 'bg-emerald-500' : status === 'Low' ? 'bg-amber-500' : status === 'Critical' ? 'bg-orange-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${(p.paperRemaining / p.maxCapacity) * 100}%` }}
                        />
                      </div>
                    </div>
                    <span className={`badge border ${statusBg(status)}`}>{status}</span>
                  </div>
                  <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
                    <span>{p.pagesToday} sheets today</span>
                    <span>Queue: {p.queue}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Alerts */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Bell size={18} className="text-slate-700" />
              <h3 className="font-semibold text-slate-900">Active Alerts</h3>
            </div>
            <button onClick={() => onNavigate('alerts')} className="text-sm text-brand-600 hover:text-brand-700 font-medium flex items-center gap-1">
              All <ChevronRight size={14} />
            </button>
          </div>
          <div className="space-y-3">
            {alerts.slice(0, 4).map((a) => (
              <AlertRow key={a.id} alert={a} />
            ))}
          </div>
        </div>
      </div>

      {/* Sustainability + Departments */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-eco-50 flex items-center justify-center">
              <Leaf size={16} className="text-eco-600" />
            </div>
            <h3 className="font-semibold text-slate-900">Sustainability</h3>
          </div>
          <div className="space-y-3">
            <SustainRow label="Paper Saved (Duplex)" value={`${formatNumber(analytics.sustainability.sheetsSaved)} sheets`} />
            <SustainRow label="Duplex Printing" value={`${analytics.sustainability.duplexPercentage}%`} />
            <SustainRow label="Est. Trees Saved" value={`${analytics.sustainability.treesSaved} trees`} />
            <SustainRow label="CO₂ Reduction" value={`${analytics.sustainability.co2Reduction} kg`} />
          </div>
        </div>

        <div className="card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-900">Department Consumption</h3>
            <button onClick={() => onNavigate('departments')} className="text-sm text-brand-600 hover:text-brand-700 font-medium flex items-center gap-1">
              View all <ChevronRight size={14} />
            </button>
          </div>
          <div className="space-y-2">
            {analytics.departments.map((d) => (
              <div key={d.name} className="flex items-center gap-3 py-2 px-3 rounded-xl hover:bg-slate-50 transition">
                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                  <Building2 size={15} className="text-slate-500" />
                </div>
                <span className="font-medium text-slate-700 text-sm flex-1">{d.name}</span>
                <span className="text-sm text-slate-500">{formatNumber(d.sheetsUsed)} sheets</span>
                <span className="text-sm font-semibold text-slate-700 w-20 text-right">{formatPeso(d.estimatedCost)}</span>
                <span className={`flex items-center gap-0.5 text-xs font-medium w-16 justify-end ${d.trend > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                  {d.trend > 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                  {Math.abs(d.trend)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Record consumption CTA */}
      <div className="card p-5 flex items-center justify-between bg-gradient-to-r from-brand-50 to-white border-brand-100">
        <div>
          <h3 className="font-semibold text-slate-900">Record Manual Consumption</h3>
          <p className="text-sm text-slate-500 mt-0.5">Log paper usage for print jobs not tracked automatically.</p>
        </div>
        <button onClick={onRecord} className="btn-primary">
          <Plus size={18} /> Record Consumption
        </button>
      </div>
    </div>
  );
}

type CapturedDashboardEvent = Pick<
  Database['public']['Tables']['print_job_events']['Row'],
  'id' | 'agent_id' | 'event_record_id' | 'pages_printed' | 'printed_at'
>;

type DashboardConsumptionAnalytics = ConsumptionAnalytics & { today: ChartDatum[] };

function includeCapturedConsumption(
  analytics: ConsumptionAnalytics,
  events: CapturedDashboardEvent[],
  paperCostPerSheet: number,
): DashboardConsumptionAnalytics {
  const validEvents = events.filter((event) =>
    Number.isSafeInteger(event.pages_printed)
      && (event.pages_printed ?? -1) >= 0
      && !Number.isNaN(new Date(event.printed_at).getTime())
  );
  const capturedPages = validEvents.reduce((total, event) => total + (event.pages_printed ?? 0), 0);
  const now = new Date();
  const currentMonthPages = validEvents.reduce((total, event) => {
    const printedAt = new Date(event.printed_at);
    return printedAt.getFullYear() === now.getFullYear() && printedAt.getMonth() === now.getMonth()
      ? total + (event.pages_printed ?? 0)
      : total;
  }, 0);

  const daily = analytics.daily.map((item, index) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - (analytics.daily.length - index - 1));
    const dateKey = localDateKey(date);
    const pages = validEvents.reduce(
      (total, event) => total + (localDateKey(new Date(event.printed_at)) === dateKey ? event.pages_printed ?? 0 : 0),
      0,
    );
    return { ...item, value: item.value + pages };
  });

  const monthly = analytics.monthly.map((item, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (analytics.monthly.length - index - 1), 1);
    const pages = validEvents.reduce((total, event) => {
      const printedAt = new Date(event.printed_at);
      return printedAt.getFullYear() === date.getFullYear() && printedAt.getMonth() === date.getMonth()
        ? total + (event.pages_printed ?? 0)
        : total;
    }, 0);
    return { ...item, value: item.value + pages };
  });

  const yearly = analytics.yearly.map((item) => {
    const year = Number(item.label);
    const pages = validEvents.reduce(
      (total, event) => total + (new Date(event.printed_at).getFullYear() === year ? event.pages_printed ?? 0 : 0),
      0,
    );
    return { ...item, value: item.value + pages };
  });
  const capturedPaperCost = capturedPages * paperCostPerSheet;

  return {
    ...analytics,
    today: daily.slice(-1),
    daily,
    monthly,
    yearly,
    totalPaperConsumed: analytics.totalPaperConsumed + capturedPages,
    monthlyUsage: analytics.monthlyUsage + currentMonthPages,
    avgDailyConsumption: Math.round(daily.reduce((total, item) => total + item.value, 0) / 7),
    estimatedCost: analytics.estimatedCost + capturedPaperCost,
  };
}

function localDateKey(date: Date) {
  if (Number.isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function MetricCard({ icon: Icon, label, value, trend, trendUp, color, customValue, sparkline, sparklineData = [] }: {
  icon: typeof FileStack;
  label: string;
  value?: string;
  trend?: string;
  trendUp?: boolean;
  color: 'brand' | 'eco' | 'slate';
  customValue?: React.ReactNode;
  sparkline?: boolean;
  sparklineData?: { label: string; value: number }[];
}) {
  const colorMap = {
    brand: 'bg-brand-50 text-brand-600',
    eco: 'bg-eco-50 text-eco-600',
    slate: 'bg-slate-100 text-slate-600',
  };
  return (
    <div className="card card-hover p-5">
      <div className="flex items-center justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colorMap[color]}`}>
          <Icon size={20} />
        </div>
        {sparkline && (
          <div className="w-16 h-8">
            <LineChart data={sparklineData.slice(0, 7)} height={32} color="#3b82f6" showAxis={false} />
          </div>
        )}
      </div>
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
      {customValue ? (
        <div className="mt-2">{customValue}</div>
      ) : (
        <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
      )}
      {trend && (
        <div className="flex items-center gap-1 mt-2">
          {trendUp !== undefined && (
            <span className={`flex items-center ${trendUp ? 'text-red-500' : 'text-emerald-500'}`}>
              {trendUp ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
            </span>
          )}
          <span className="text-xs text-slate-500">{trend}</span>
        </div>
      )}
    </div>
  );
}

function AlertRow({ alert }: { alert: AlertItem }) {
  const colorMap = {
    empty: { bg: 'bg-red-50', border: 'border-red-200', icon: 'text-red-500', dot: 'bg-red-500' },
    critical: { bg: 'bg-orange-50', border: 'border-orange-200', icon: 'text-orange-500', dot: 'bg-orange-500' },
    low: { bg: 'bg-amber-50', border: 'border-amber-200', icon: 'text-amber-500', dot: 'bg-amber-500' },
    info: { bg: 'bg-blue-50', border: 'border-blue-200', icon: 'text-blue-500', dot: 'bg-blue-500' },
  };
  const c = colorMap[alert.level];
  return (
    <div className={`flex items-start gap-3 p-3 rounded-xl border ${c.bg} ${c.border}`}>
      <AlertTriangle size={16} className={`shrink-0 mt-0.5 ${c.icon}`} />
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-800">{alert.title}</p>
        <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{alert.message}</p>
        <p className="text-xs text-slate-400 mt-1">{alert.time}</p>
      </div>
    </div>
  );
}

function SustainRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
      <span className="text-sm text-slate-600">{label}</span>
      <span className="text-sm font-semibold text-slate-900">{value}</span>
    </div>
  );
}
