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
} from 'lucide-react';
import type { Printer, AlertItem, Settings, PageKey } from '../types';
import { LineChart, ProgressRing, DonutChart } from './Charts';
import { getPaperStatus, statusBg, formatPeso, formatNumber } from './ui';
import type { ConsumptionAnalytics } from '../data';

interface DashboardProps {
  printers: Printer[];
  alerts: AlertItem[];
  settings: Settings;
  analytics: ConsumptionAnalytics;
  onNavigate: (page: PageKey) => void;
  onRecord: () => void;
}

export function Dashboard({ printers, alerts, settings, analytics, onNavigate, onRecord }: DashboardProps) {
  const highlightPrinter = printers[0];
  const officePercent = analytics.totalPaperConsumed
    ? Math.round((analytics.byPurpose.find((item) => item.label === 'Office Use')?.value ?? 0) / analytics.totalPaperConsumed * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Metric cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <MetricCard
          icon={FileStack}
          label="Total Paper Consumed"
          value={`${formatNumber(analytics.totalPaperConsumed)} sheets`}
          trend="All recorded print jobs"
          color="brand"
        />
        <MetricCard
          icon={CalendarDays}
          label="Monthly Usage"
          value={`${formatNumber(analytics.monthlyUsage)} sheets`}
          trend="Recorded this month"
          color="brand"
          sparkline
          sparklineData={analytics.daily}
        />
        <MetricCard
          icon={TrendingUp}
          label="Avg Daily Consumption"
          value={`${analytics.avgDailyConsumption} sheets/day`}
          trend="Average over the last 7 days"
          color="slate"
        />
        <MetricCard
          icon={Wallet}
          label="Estimated Cost"
          value={formatPeso(analytics.estimatedCost)}
          trend={`₱${settings.paperCostPerSheet.toFixed(2)} / sheet`}
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
              <p className="text-sm text-slate-500">Daily sheets consumed this week</p>
            </div>
            <div className="flex gap-1.5">
              {['Today', 'Week', 'Month', 'Year'].map((t, i) => (
                <button
                  key={t}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition ${
                    i === 1 ? 'bg-brand-50 text-brand-700' : 'text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <LineChart data={analytics.daily} height={240} color="#2563eb" formatValue={(v) => `${v}`} />
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
