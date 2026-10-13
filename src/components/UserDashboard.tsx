import {
  FileStack,
  CalendarDays,
  Wallet,
  Printer as PrinterIcon,
  ArrowUpRight,
  TrendingUp,
  FileText,
  ChevronRight,
} from 'lucide-react';
import type { User, Printer, Settings, PageKey, PrintJob } from '../types';
import { LineChart, DonutChart, ProgressRing } from './Charts';
import { getPaperStatus, statusBg, formatPeso, formatNumber } from './ui';

interface UserDashboardProps {
  user: User;
  printers: Printer[];
  settings: Settings;
  printJobs: PrintJob[];
  dailyConsumption: { label: string; value: number }[];
  onNavigate: (page: PageKey) => void;
}

export function UserDashboard({ user, printers, settings, printJobs, dailyConsumption, onNavigate }: UserDashboardProps) {
  const myCost = user.totalSheets * settings.paperCostPerSheet;
  const availablePrinters = printers.filter((p) => p.department === user.department && p.online);
  const myPrinter = availablePrinters[0] || printers[0];

  const purposeData = [
    { label: 'Office Use', value: user.officeSheets, color: '#2563eb' },
    { label: 'Personal Use', value: user.personalSheets, color: '#f59e0b' },
    { label: 'Unclassified', value: Math.max(0, user.totalSheets - user.officeSheets - user.personalSheets), color: '#94a3b8' },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Welcome back, {user.name.split(' ')[0]}</h2>
          <p className="text-sm text-slate-500 mt-0.5">Here's your printing activity overview</p>
        </div>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard icon={FileStack} label="My Paper Usage" value={`${formatNumber(user.totalSheets)} sheets`} trend="Total recorded usage" color="brand" />
        <MetricCard icon={CalendarDays} label="This Month" value={`${formatNumber(user.monthlySheets)} sheets`} trend="Recorded this month" color="brand" sparkline dailyConsumption={dailyConsumption} />
        <MetricCard icon={Wallet} label="Estimated Cost" value={formatPeso(myCost)} trend={`₱${settings.paperCostPerSheet.toFixed(2)} / sheet`} color="slate" />
        <MetricCard
          icon={PrinterIcon}
          label="Printer Paper"
          customValue={myPrinter ? <ProgressRing value={myPrinter.paperRemaining} max={myPrinter.maxCapacity} size={80} thickness={7} /> : 'No printer data'}
          trend={myPrinter?.name ?? 'No printer available'}
          color="eco"
        />
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* My usage trend */}
        <div className="card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-slate-900">My Paper Usage Trend</h3>
              <p className="text-sm text-slate-500">Daily sheets consumed this week</p>
            </div>
            <div className="flex items-center gap-1.5 text-sm text-emerald-600 font-medium">
              <TrendingUp size={16} /> Based on recorded jobs
            </div>
          </div>
          {dailyConsumption.some((item) => item.value > 0)
            ? <LineChart data={dailyConsumption} height={220} color="#10b981" formatValue={(v) => `${v}`} />
            : <p className="text-sm text-slate-500 py-12 text-center">No usage data for the last seven days.</p>}
        </div>

        {/* My print purpose */}
        <div className="card p-5">
          <h3 className="font-semibold text-slate-900 mb-1">My Print Purpose</h3>
          <p className="text-sm text-slate-500 mb-4">Office vs. Personal breakdown</p>
          {user.totalSheets > 0
            ? <DonutChart data={purposeData} size={160} thickness={24} centerValue={`${user.totalSheets}`} centerLabel="Total Sheets" />
            : <p className="text-sm text-slate-500 py-12 text-center">No print usage recorded yet.</p>}
          <p className="text-xs text-slate-400 mt-4 italic">
            Classification is an automated estimate and may require your confirmation.
          </p>
        </div>
      </div>

      {/* Recent jobs + Printer status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent print jobs */}
        <div className="card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-900">My Recent Print Jobs</h3>
            <button onClick={() => onNavigate('print-jobs')} className="text-sm text-eco-600 hover:text-eco-700 font-medium flex items-center gap-1">
              View all <ChevronRight size={14} />
            </button>
          </div>
          <div className="space-y-2">
            {printJobs.slice(0, 5).map((job) => (
              <div key={job.id} className="flex items-center gap-3 py-2.5 px-3 rounded-xl hover:bg-slate-50 transition">
                <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                  <FileText size={16} className="text-slate-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{job.document}</p>
                  <p className="text-xs text-slate-400">{job.datetime} · {job.printer}</p>
                </div>
                <span className="text-sm text-slate-500 shrink-0">{job.paperUsed} sheets</span>
                <span className={`badge shrink-0 ${job.purpose === 'Office' ? 'bg-brand-50 text-brand-700' : job.purpose === 'Personal' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
                  {job.purpose}
                </span>
                <span className="text-sm font-medium text-slate-700 shrink-0 w-16 text-right">{formatPeso(job.cost)}</span>
              </div>
            ))}
            {printJobs.length === 0 && <p className="text-sm text-slate-500 py-6 text-center">No print jobs recorded yet.</p>}
          </div>
        </div>

        {/* Available printer */}
        <div className="card p-5">
          <h3 className="font-semibold text-slate-900 mb-4">Available Printers</h3>
          <div className="space-y-3">
            {availablePrinters.map((p) => {
              const s = getPaperStatus(p.paperRemaining);
              return (
                <div key={p.id} className="border border-slate-200 rounded-xl p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-medium text-slate-800 text-sm">{p.name}</p>
                      <p className="text-xs text-slate-400">{p.location}</p>
                    </div>
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" /> Online
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-2">
                    <div className="flex-1">
                      <div className="flex items-baseline gap-1 mb-1">
                        <span className="text-base font-bold text-slate-900">{p.paperRemaining}</span>
                        <span className="text-xs text-slate-400">/ {p.maxCapacity} sheets</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${s === 'Normal' ? 'bg-emerald-500' : s === 'Low' ? 'bg-amber-500' : s === 'Critical' ? 'bg-orange-500' : 'bg-red-500'}`}
                          style={{ width: `${(p.paperRemaining / p.maxCapacity) * 100}%` }}
                        />
                      </div>
                    </div>
                    <span className={`badge border ${statusBg(s)}`}>{s}</span>
                  </div>
                </div>
              );
            })}
            {availablePrinters.length === 0 && (
              <p className="text-sm text-slate-400 text-center py-4">No printers available for your department.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, trend, trendUp, color, customValue, sparkline, dailyConsumption }: {
  icon: typeof FileStack;
  label: string;
  value?: string;
  trend?: string;
  trendUp?: boolean;
  color: 'brand' | 'eco' | 'slate';
  customValue?: React.ReactNode;
  sparkline?: boolean;
  dailyConsumption?: { label: string; value: number }[];
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
            <LineChart data={dailyConsumption ?? []} height={32} color="#10b981" showAxis={false} />
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
              {trendUp ? <ArrowUpRight size={14} /> : null}
            </span>
          )}
          <span className="text-xs text-slate-500">{trend}</span>
        </div>
      )}
    </div>
  );
}
