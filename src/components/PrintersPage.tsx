import { Printer as PrinterIcon, MapPin, Wifi, WifiOff, Clock, Layers, AlertTriangle, Plus } from 'lucide-react';
import type { Printer, Settings } from '../types';
import { getPaperStatus, statusBg, statusDot, formatNumber } from './ui';

interface PrintersPageProps {
  printers: Printer[];
  settings: Settings;
}

export function PrintersPage({ printers, settings }: PrintersPageProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Printer Monitoring</h2>
          <p className="text-sm text-slate-500 mt-0.5">{printers.length} printers connected · {printers.filter((p) => p.online).length} online</p>
        </div>
        <button className="btn-primary">
          <Plus size={18} /> Add Printer
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {printers.map((p) => {
          const status = getPaperStatus(p.paperRemaining);
          const pct = (p.paperRemaining / p.maxCapacity) * 100;
          const isLow = p.paperRemaining <= settings.lowPaperThreshold;
          return (
            <div key={p.id} className="card card-hover p-5">
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${p.online ? 'bg-brand-50' : 'bg-slate-100'}`}>
                    <PrinterIcon size={20} className={p.online ? 'text-brand-600' : 'text-slate-400'} />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 text-sm">{p.name}</p>
                    <p className="text-xs text-slate-400 flex items-center gap-1">
                      <MapPin size={11} /> {p.location}
                    </p>
                  </div>
                </div>
                <span className={`inline-flex items-center gap-1 text-xs font-medium ${p.online ? 'text-emerald-600' : 'text-slate-400'}`}>
                  {p.online ? <Wifi size={13} /> : <WifiOff size={13} />}
                  {p.online ? 'Online' : 'Offline'}
                </span>
              </div>

              {/* Paper level */}
              <div className="mb-4">
                <div className="flex items-baseline justify-between mb-1.5">
                  <span className="text-sm font-medium text-slate-700">Paper Remaining</span>
                  <span className="text-sm font-bold text-slate-900">{p.paperRemaining} / {p.maxCapacity} sheets</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      status === 'Normal' ? 'bg-emerald-500' : status === 'Low' ? 'bg-amber-500' : status === 'Critical' ? 'bg-orange-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className={`badge border ${statusBg(status)}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${statusDot(status)}`} />
                    Paper Status: {status}
                  </span>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-50">
                  <Clock size={15} className="text-slate-400" />
                  <div>
                    <p className="text-xs text-slate-500">Today</p>
                    <p className="text-sm font-semibold text-slate-800">{p.pagesToday} sheets</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-50">
                  <Layers size={15} className="text-slate-400" />
                  <div>
                    <p className="text-xs text-slate-500">Queue</p>
                    <p className="text-sm font-semibold text-slate-800">{p.queue} docs</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-50">
                  <PrinterIcon size={15} className="text-slate-400" />
                  <div>
                    <p className="text-xs text-slate-500">Daily Avg</p>
                    <p className="text-sm font-semibold text-slate-800">{p.dailyAvg} sheets</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-50">
                  <MapPin size={15} className="text-slate-400" />
                  <div>
                    <p className="text-xs text-slate-500">Department</p>
                    <p className="text-sm font-semibold text-slate-800">{p.department}</p>
                  </div>
                </div>
              </div>

              {/* Low paper alert */}
              {isLow && (
                <div className="flex items-start gap-2 mt-3 p-2.5 rounded-lg border border-amber-200 bg-amber-50">
                  <AlertTriangle size={14} className="shrink-0 text-amber-500 mt-0.5" />
                  <p className="text-xs text-amber-700">
                    {p.paperRemaining === 0 ? 'Printer paper empty — refill required.' : `Paper running low — refill soon. Only ${p.paperRemaining} sheets remaining.`}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
