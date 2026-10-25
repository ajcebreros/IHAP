import { useMemo, useState } from 'react';
import {
  FileBarChart,
  Download,
  FileText,
  CheckCircle2,
  FileSpreadsheet,
  Leaf,
  Printer,
  Building2,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import type { PrintJob, Printer as PrinterRecord } from '../types';
import type { ConsumptionAnalytics } from '../data';
import { formatPeso, formatNumber } from './ui';

type ReportKey = 'daily' | 'monthly' | 'departments' | 'purpose' | 'printers' | 'costs' | 'sustainability';

interface ReportsPageProps {
  analytics: ConsumptionAnalytics;
  printers: PrinterRecord[];
  printJobs: PrintJob[];
}

interface ReportDataset {
  title: string;
  description: string;
  columns: string[];
  rows: string[][];
}

const reports: {
  key: ReportKey;
  icon: typeof TrendingUp;
  name: string;
  color: 'brand' | 'eco' | 'slate' | 'amber';
}[] = [
  { key: 'daily', icon: TrendingUp, name: 'Daily Paper Consumption', color: 'brand' },
  { key: 'monthly', icon: FileBarChart, name: 'Monthly Paper Consumption', color: 'brand' },
  { key: 'departments', icon: Building2, name: 'Department Usage', color: 'slate' },
  { key: 'purpose', icon: FileText, name: 'Office vs. Personal Printing', color: 'amber' },
  { key: 'printers', icon: Printer, name: 'Printer Utilization', color: 'brand' },
  { key: 'costs', icon: Wallet, name: 'Printing Costs', color: 'slate' },
  { key: 'sustainability', icon: Leaf, name: 'Sustainability Metrics', color: 'eco' },
];

export function ReportsPage({ analytics, printers, printJobs }: ReportsPageProps) {
  const [selectedReport, setSelectedReport] = useState<ReportKey>('daily');
  const [exported, setExported] = useState<string | null>(null);

  const datasets = useMemo<Record<ReportKey, ReportDataset>>(() => {
    const costGroups = new Map<string, { jobs: number; cost: number }>();
    for (const job of printJobs) {
      const group = costGroups.get(job.department) ?? { jobs: 0, cost: 0 };
      group.jobs += 1;
      group.cost += job.cost;
      costGroups.set(job.department, group);
    }

    return {
      daily: {
        title: 'Daily Paper Consumption',
        description: 'Daily sheets from the last 7 days based on recorded app print jobs.',
        columns: ['Day', 'Sheets consumed'],
        rows: analytics.daily.map((item) => [item.label, formatNumber(item.value)]),
      },
      monthly: {
        title: 'Monthly Paper Consumption',
        description: 'Monthly sheets for the last 12 months based on recorded app print jobs.',
        columns: ['Month', 'Sheets consumed'],
        rows: analytics.monthly.map((item) => [item.label, formatNumber(item.value)]),
      },
      departments: {
        title: 'Department Usage',
        description: 'Department totals and costs from print jobs with a recorded department.',
        columns: ['Department', 'Sheets used', 'Estimated cost', 'Trend (%)', 'Users'],
        rows: analytics.departments.map((item) => [
          item.name,
          formatNumber(item.sheetsUsed),
          formatPeso(item.estimatedCost),
          `${item.trend}%`,
          formatNumber(item.users),
        ]),
      },
      purpose: {
        title: 'Office vs. Personal Printing',
        description: 'Purpose classifications recorded with app print jobs.',
        columns: ['Purpose', 'Sheets', 'Share (%)'],
        rows: analytics.byPurpose.map((item) => [
          item.label,
          formatNumber(item.value),
          `${item.percent ?? 0}%`,
        ]),
      },
      printers: {
        title: 'Printer Utilization',
        description: 'Current registered printer status and recorded usage.',
        columns: ['Printer', 'Department', 'Status', 'Paper remaining', 'Pages today', 'Queue', 'Daily average'],
        rows: printers.map((printer) => [
          printer.name,
          printer.department || '—',
          printer.online ? 'Online' : 'Offline',
          formatNumber(printer.paperRemaining),
          formatNumber(printer.pagesToday),
          formatNumber(printer.queue),
          formatNumber(printer.dailyAvg),
        ]),
      },
      costs: {
        title: 'Printing Costs',
        description: 'Recorded job costs grouped by department.',
        columns: ['Department', 'Print jobs', 'Recorded cost'],
        rows: [...costGroups.entries()]
          .sort((a, b) => b[1].cost - a[1].cost)
          .map(([department, totals]) => [
            department || 'Unassigned',
            formatNumber(totals.jobs),
            formatPeso(totals.cost),
          ]),
      },
      sustainability: {
        title: 'Sustainability Metrics',
        description: 'Estimates calculated from app-recorded print jobs only.',
        columns: ['Metric', 'Value'],
        rows: [
          ['Recorded sheets', formatNumber(analytics.sustainability.totalSheets)],
          ['Sheets saved through recorded duplex jobs', formatNumber(analytics.sustainability.sheetsSaved)],
          ['Estimated trees saved', String(analytics.sustainability.treesSaved)],
          ['Estimated CO₂ reduction (kg)', String(analytics.sustainability.co2Reduction)],
          ['Recorded duplex jobs (%)', `${analytics.sustainability.duplexPercentage}%`],
        ],
      },
    };
  }, [analytics, printers, printJobs]);

  const activeReport = reports.find((report) => report.key === selectedReport) ?? reports[0];
  const dataset = datasets[selectedReport];

  const handleExport = (format: 'csv' | 'pdf', key: ReportKey) => {
    setSelectedReport(key);
    const report = datasets[key];
    const filename = `${report.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.${format}`;

    if (format === 'pdf') {
      window.setTimeout(() => window.print(), 100);
      return;
    }

    const csv = [
      report.columns,
      ...report.rows,
    ].map((row) => row.map(escapeCsv).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setExported(filename);
    window.setTimeout(() => setExported(null), 2000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Reports</h2>
        <p className="text-sm text-slate-500 mt-0.5">View and export reports from current Supabase application data.</p>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
        {reports.map((report) => {
          const Icon = report.icon;
          const colorMap: Record<typeof report.color, string> = {
            brand: 'bg-brand-50 text-brand-600',
            eco: 'bg-eco-50 text-eco-600',
            slate: 'bg-slate-100 text-slate-600',
            amber: 'bg-amber-50 text-amber-600',
          };
          return (
            <div
              key={report.key}
              className={`card p-5 ${selectedReport === report.key ? 'ring-2 ring-brand-200' : ''}`}
            >
              <button
                type="button"
                onClick={() => setSelectedReport(report.key)}
                className="w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                aria-pressed={selectedReport === report.key}
              >
                <div className={`mb-3 flex h-11 w-11 items-center justify-center rounded-xl ${colorMap[report.color]}`}>
                  <Icon size={20} aria-hidden="true" />
                </div>
                <h3 className="mb-1 font-semibold text-slate-900">{report.name}</h3>
                <p className="text-sm text-slate-500">
                  {datasets[report.key].rows.length.toLocaleString()} data rows available.
                </p>
              </button>
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => handleExport('csv', report.key)}
                  className="btn-secondary flex-1 text-sm"
                >
                  {exported === `${datasets[report.key].title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.csv`
                    ? <><CheckCircle2 size={15} /> Exported</>
                    : <><FileSpreadsheet size={15} /> CSV</>}
                </button>
                <button
                  type="button"
                  onClick={() => handleExport('pdf', report.key)}
                  className="btn-secondary flex-1 text-sm"
                >
                  {exported === `${datasets[report.key].title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.pdf`
                    ? <><CheckCircle2 size={15} /> Print / PDF</>
                    : <><Download size={15} /> Print / PDF</>}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <section id="reports-print-area" className="card overflow-hidden" aria-labelledby="report-preview-heading">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-5">
          <div>
            <h3 id="report-preview-heading" className="font-semibold text-slate-900">{activeReport.name}</h3>
            <p className="mt-1 text-sm text-slate-500">{dataset.description}</p>
          </div>
          <span className="text-sm text-slate-500">{dataset.rows.length.toLocaleString()} rows</span>
        </div>
        <div className="max-h-[32rem] overflow-auto scrollbar-thin">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-slate-50">
              <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                {dataset.columns.map((column) => (
                  <th key={column} className="whitespace-nowrap px-4 py-3 font-medium">{column}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {dataset.rows.map((row, rowIndex) => (
                <tr key={`${selectedReport}-${rowIndex}`} className="hover:bg-slate-50/50">
                  {row.map((value, columnIndex) => (
                    <td key={`${selectedReport}-${rowIndex}-${columnIndex}`} className="whitespace-nowrap px-4 py-3 text-slate-700">
                      {value || '—'}
                    </td>
                  ))}
                </tr>
              ))}
              {dataset.rows.length === 0 && (
                <tr>
                  <td colSpan={dataset.columns.length} className="px-4 py-10 text-center text-slate-500">
                    No recorded data is available for this report yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="border-t border-slate-100 px-5 py-3 text-xs text-slate-500">
          Reports use records currently loaded by the application. Captured Windows events are not included in department, purpose, cost, or sustainability breakdowns because their schema has no verified mappings for those values.
        </p>
      </section>
      <style>{'@media print { body * { visibility: hidden !important; } #reports-print-area, #reports-print-area * { visibility: visible !important; } #reports-print-area { position: absolute; left: 0; top: 0; width: 100%; max-height: none; overflow: visible; } #reports-print-area .max-h-\\[32rem\\] { max-height: none; overflow: visible; } }'}</style>
    </div>
  );
}

function escapeCsv(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}
