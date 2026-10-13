import { LineChart, DonutChart, BarChart } from './Charts';
import type { PrintJob, User, Settings } from '../types';
import { formatPeso, formatNumber } from './ui';
import { TrendingUp, FileStack, Wallet, Leaf } from 'lucide-react';

interface UserUsageProps {
  user: User;
  settings: Settings;
  printJobs: PrintJob[];
  dailyConsumption: { label: string; value: number }[];
}

export function UserUsage({ user, settings, printJobs, dailyConsumption }: UserUsageProps) {
  const myCost = user.totalSheets * settings.paperCostPerSheet;
  const monthlyCost = user.monthlySheets * settings.paperCostPerSheet;
  const duplexJobs = printJobs.filter((job) => job.isDuplex);
  const pagesPrinted = duplexJobs.reduce((total, job) => total + job.pages * job.copies, 0);
  const sheetsSaved = duplexJobs.reduce((total, job) => total + Math.max(0, job.pages * job.copies - job.paperUsed), 0);
  const duplexRate = pagesPrinted ? Math.round((pagesPrinted / printJobs.reduce((total, job) => total + job.pages * job.copies, 0)) * 100) : 0;

  const purposeData = [
    { label: 'Office Use', value: user.officeSheets, color: '#2563eb' },
    { label: 'Personal Use', value: user.personalSheets, color: '#f59e0b' },
    { label: 'Unclassified', value: Math.max(0, user.totalSheets - user.officeSheets - user.personalSheets), color: '#94a3b8' },
  ];

  const byDocument = printJobs
    .reduce((acc, job) => {
      const existing = acc.find((a) => a.label === job.document);
      if (existing) existing.value += job.paperUsed;
      else acc.push({ label: job.document.replace(/\.[^.]+$/, ''), value: job.paperUsed, color: '#10b981' });
      return acc;
    }, [] as { label: string; value: number; color: string }[])
    .sort((a, b) => b.value - a.value)
    .slice(0, 6)
    .map((d, i) => ({ ...d, color: ['#10b981', '#34d399', '#6ee7b7', '#a7f3d0', '#d1fae5', '#ecfdf5'][i] }));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">My Usage</h2>
        <p className="text-sm text-slate-500 mt-0.5">Your personal paper consumption analytics</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center">
              <FileStack size={20} className="text-brand-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium uppercase">Total Sheets</p>
              <p className="text-2xl font-bold text-slate-900">{formatNumber(user.totalSheets)}</p>
            </div>
          </div>
        </div>
        <div className="card p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
              <Wallet size={20} className="text-slate-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium uppercase">Total Cost</p>
              <p className="text-2xl font-bold text-slate-900">{formatPeso(myCost)}</p>
            </div>
          </div>
        </div>
        <div className="card p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-eco-50 flex items-center justify-center">
              <TrendingUp size={20} className="text-eco-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium uppercase">This Month</p>
              <p className="text-2xl font-bold text-slate-900">{formatNumber(user.monthlySheets)} <span className="text-sm font-normal text-slate-400">({formatPeso(monthlyCost)})</span></p>
            </div>
          </div>
        </div>
      </div>

      {/* Trend */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-slate-900">Daily Usage Trend</h3>
            <p className="text-sm text-slate-500">Your sheets consumed this week</p>
          </div>
        </div>
        <LineChart data={dailyConsumption} height={240} color="#10b981" formatValue={(v) => `${v}`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Purpose breakdown */}
        <div className="card p-5">
          <h3 className="font-semibold text-slate-900 mb-1">Office vs. Personal</h3>
          <p className="text-sm text-slate-500 mb-4">Your print purpose distribution</p>
          <DonutChart data={purposeData} size={180} thickness={28} centerValue={`${user.totalSheets}`} centerLabel="Total Sheets" />
        </div>

        {/* By document */}
        <div className="card p-5">
          <h3 className="font-semibold text-slate-900 mb-4">Consumption by Document</h3>
          <BarChart horizontal data={byDocument} formatValue={(v) => `${v} sheets`} />
        </div>
      </div>

      {/* Sustainability impact */}
      <div className="card p-5 bg-gradient-to-r from-eco-50 to-white border-eco-100">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-eco-50 flex items-center justify-center">
            <Leaf size={16} className="text-eco-600" />
          </div>
          <h3 className="font-semibold text-slate-900">Your Sustainability Impact</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-slate-500">Sheets Saved (Duplex)</p>
            <p className="text-lg font-bold text-eco-700">{sheetsSaved} sheets</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Est. Trees Saved</p>
            <p className="text-lg font-bold text-eco-700">{(user.totalSheets * 0.000017).toFixed(4)} trees</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">CO₂ Reduction</p>
            <p className="text-lg font-bold text-eco-700">{(sheetsSaved * 0.002).toFixed(1)} kg</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Duplex Rate</p>
            <p className="text-lg font-bold text-eco-700">{duplexRate}%</p>
          </div>
        </div>
      </div>
    </div>
  );
}
