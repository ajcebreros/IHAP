import { useState } from 'react';
import { FileBarChart, Download, FileText, CheckCircle2, FileSpreadsheet, Leaf, Printer, Building2, TrendingUp, Wallet } from 'lucide-react';

export function ReportsPage() {
  const [exported, setExported] = useState<string | null>(null);

  const handleExport = (format: 'csv' | 'pdf', name: string) => {
    setExported(`${name}.${format}`);
    setTimeout(() => setExported(null), 2000);
  };

  const reports = [
    { icon: TrendingUp, name: 'Daily Paper Consumption', desc: 'Sheets consumed per day with breakdown', color: 'brand' },
    { icon: FileBarChart, name: 'Monthly Paper Consumption', desc: 'Monthly trends and year-over-year comparison', color: 'brand' },
    { icon: Building2, name: 'Department Usage', desc: 'Consumption by department with cost analysis', color: 'slate' },
    { icon: FileText, name: 'Office vs. Personal Printing', desc: 'Purpose classification breakdown', color: 'amber' },
    { icon: Printer, name: 'Printer Utilization', desc: 'Per-printer usage, queue, and uptime', color: 'brand' },
    { icon: Wallet, name: 'Printing Costs', desc: 'Cost analysis by department, user, and printer', color: 'slate' },
    { icon: Leaf, name: 'Sustainability Metrics', desc: 'Trees saved, CO₂ reduction, duplex rate', color: 'eco' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Reports</h2>
        <p className="text-sm text-slate-500 mt-0.5">Generate and export detailed reports</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {reports.map((r) => {
          const Icon = r.icon;
          const colorMap: Record<string, string> = {
            brand: 'bg-brand-50 text-brand-600',
            eco: 'bg-eco-50 text-eco-600',
            slate: 'bg-slate-100 text-slate-600',
            amber: 'bg-amber-50 text-amber-600',
          };
          return (
            <div key={r.name} className="card card-hover p-5">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-3 ${colorMap[r.color]}`}>
                <Icon size={20} />
              </div>
              <h3 className="font-semibold text-slate-900 mb-1">{r.name}</h3>
              <p className="text-sm text-slate-500 mb-4">{r.desc}</p>
              <div className="flex gap-2">
                <button
                  onClick={() => handleExport('csv', r.name)}
                  className="btn-secondary text-sm flex-1"
                >
                  {exported === `${r.name}.csv` ? <><CheckCircle2 size={15} /> Exported</> : <><FileSpreadsheet size={15} /> CSV</>}
                </button>
                <button
                  onClick={() => handleExport('pdf', r.name)}
                  className="btn-secondary text-sm flex-1"
                >
                  {exported === `${r.name}.pdf` ? <><CheckCircle2 size={15} /> Exported</> : <><Download size={15} /> PDF</>}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
