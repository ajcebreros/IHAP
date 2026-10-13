import { useState } from 'react';
import { LineChart, BarChart, DonutChart } from './Charts';
import type { ConsumptionAnalytics } from '../data';
import { formatNumber } from './ui';
import { TrendingUp } from 'lucide-react';

type Range = 'daily' | 'weekly' | 'monthly' | 'yearly';

export function ConsumptionPage({ analytics }: { analytics: ConsumptionAnalytics }) {
  const [range, setRange] = useState<Range>('daily');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  const rangeData = {
    daily: analytics.daily,
    weekly: analytics.weekly,
    monthly: analytics.monthly,
    yearly: analytics.yearly,
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Paper Consumption Analytics</h2>
        <p className="text-sm text-slate-500 mt-0.5">Detailed consumption trends and breakdowns</p>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-wrap items-center gap-2">
          {(['daily', 'weekly', 'monthly', 'yearly'] as Range[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-4 py-2 text-sm font-medium rounded-lg capitalize transition ${
                range === r ? 'bg-brand-50 text-brand-700' : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              {r === 'daily' ? 'Today' : r === 'weekly' ? 'This Week' : r === 'monthly' ? 'This Month' : 'This Year'}
            </button>
          ))}
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-sm text-slate-500">Custom:</span>
            <input type="date" className="input w-auto" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} />
            <span className="text-slate-400">—</span>
            <input type="date" className="input w-auto" value={customTo} onChange={(e) => setCustomTo(e.target.value)} />
          </div>
        </div>
      </div>

      {/* Trend chart */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-slate-900 capitalize">{range} Consumption Trend</h3>
            <p className="text-sm text-slate-500">Sheets consumed per {range === 'daily' ? 'day' : range === 'weekly' ? 'week' : range === 'monthly' ? 'month' : 'year'}</p>
          </div>
          <div className="flex items-center gap-1.5 text-sm text-emerald-600 font-medium">
            <TrendingUp size={16} />
            Supabase records
          </div>
        </div>
        <LineChart data={rangeData[range]} height={260} color="#2563eb" formatValue={(v) => formatNumber(v)} />
      </div>

      {/* By printer */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-5">
          <h3 className="font-semibold text-slate-900 mb-4">Consumption by Printer</h3>
          <BarChart
            horizontal
            data={analytics.byPrinter}
            formatValue={(v) => `${formatNumber(v)} sheets`}
          />
        </div>
        <div className="card p-5">
          <h3 className="font-semibold text-slate-900 mb-4">Consumption by Department</h3>
          <BarChart
            horizontal
            data={analytics.byDepartment}
            formatValue={(v) => `${formatNumber(v)} sheets`}
          />
        </div>
      </div>

      {/* By user */}
      <div className="card p-5">
        <h3 className="font-semibold text-slate-900 mb-4">Consumption by User</h3>
        <BarChart
          horizontal
          data={analytics.byUser}
          formatValue={(v) => `${formatNumber(v)} sheets`}
        />
      </div>

      {/* Paper size + type */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-5">
          <h3 className="font-semibold text-slate-900 mb-4">Consumption by Paper Size</h3>
          <DonutChart data={analytics.byPaperSize} size={160} thickness={24} centerValue="Paper" centerLabel="Sizes" />
        </div>
        <div className="card p-5">
          <h3 className="font-semibold text-slate-900 mb-4">Consumption by Paper Type</h3>
          <DonutChart data={analytics.byPaperType} size={160} thickness={24} centerValue="Paper" centerLabel="Types" />
        </div>
      </div>

      {/* Office vs Personal */}
      <div className="card p-5">
        <h3 className="font-semibold text-slate-900 mb-1">Office vs. Personal Usage</h3>
        <p className="text-sm text-slate-500 mb-4">Estimated distribution of paper usage</p>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
          <DonutChart data={analytics.byPurpose} size={200} thickness={30} centerValue={formatNumber(analytics.totalPaperConsumed)} centerLabel="Total Sheets" />
          <div className="space-y-3">
            {analytics.byPurpose.map((d) => (
              <div key={d.label} className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:shadow-card-hover transition cursor-pointer">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }} />
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-800">{d.label}</p>
                  <p className="text-xs text-slate-500">{formatNumber(d.value)} sheets — {d.percent}%</p>
                </div>
                <button className="text-xs text-brand-600 hover:text-brand-700 font-medium">View details</button>
              </div>
            ))}
            <p className="text-xs text-slate-400 italic pt-2">
              Classification is an automated estimate and may require user confirmation.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
