import { useState } from 'react';
import { AlertTriangle, Settings as SettingsIcon, CheckCircle2, Info } from 'lucide-react';
import type { AlertItem, Settings } from '../types';

interface AlertsPageProps {
  alerts: AlertItem[];
  settings: Settings;
  onAcknowledge: (alertId: string) => Promise<void>;
}

export function AlertsPage({ alerts, settings, onAcknowledge }: AlertsPageProps) {
  const [filter, setFilter] = useState<string>('all');

  const filtered = alerts.filter((a) => {
    if (filter === 'all') return true;
    if (filter === 'active') return a.level !== 'info' && !a.acknowledged;
    return a.level === filter;
  });

  const counts = {
    all: alerts.length,
    active: alerts.filter((a) => a.level !== 'info' && !a.acknowledged).length,
    empty: alerts.filter((a) => a.level === 'empty').length,
    critical: alerts.filter((a) => a.level === 'critical').length,
    low: alerts.filter((a) => a.level === 'low').length,
    info: alerts.filter((a) => a.level === 'info').length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Alerts & Recommendations</h2>
          <p className="text-sm text-slate-500 mt-0.5">Low-paper alerts and intelligent recommendations</p>
        </div>
      </div>

      {/* Alert config summary */}
      <div className="card p-4 flex items-center gap-4 bg-gradient-to-r from-amber-50 to-white border-amber-100">
        <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
          <SettingsIcon size={18} className="text-amber-600" />
        </div>
        <div className="flex-1 text-sm text-slate-600">
          <p>
            Low-paper threshold: <strong className="text-slate-800">{settings.lowPaperThreshold} sheets</strong> · Critical threshold: <strong className="text-slate-800">{settings.criticalPaperThreshold} sheets</strong>
          </p>
          <p className="text-xs text-slate-400 mt-0.5">
            {settings.emailNotifications ? 'Email + In-app notifications enabled' : 'In-app notifications enabled'}
          </p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2">
        {[
          { key: 'all', label: 'All Alerts' },
          { key: 'active', label: 'Active' },
          { key: 'empty', label: 'Empty' },
          { key: 'critical', label: 'Critical' },
          { key: 'low', label: 'Low Paper' },
          { key: 'info', label: 'Recommendations' },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setFilter(t.key)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition ${
              filter === t.key ? 'bg-brand-50 text-brand-700' : 'text-slate-500 hover:bg-slate-100'
            }`}
          >
            {t.label}
            <span className="ml-1.5 text-xs text-slate-400">({counts[t.key as keyof typeof counts]})</span>
          </button>
        ))}
      </div>

      {/* Alert list */}
      <div className="space-y-3">
        {filtered.map((a) => (
          <AlertCard key={a.id} alert={a} onAcknowledge={onAcknowledge} />
        ))}
        {filtered.length === 0 && <p className="text-sm text-slate-500 text-center py-8">No alerts to display.</p>}
      </div>
    </div>
  );
}

function AlertCard({ alert, onAcknowledge }: { alert: AlertItem; onAcknowledge: (alertId: string) => Promise<void> }) {
  const [isAcknowledging, setIsAcknowledging] = useState(false);
  const [error, setError] = useState('');
  const config = {
    empty: { bg: 'bg-red-50', border: 'border-red-200', icon: AlertTriangle, iconColor: 'text-red-500', label: 'Empty', labelBg: 'bg-red-100 text-red-700' },
    critical: { bg: 'bg-orange-50', border: 'border-orange-200', icon: AlertTriangle, iconColor: 'text-orange-500', label: 'Critical', labelBg: 'bg-orange-100 text-orange-700' },
    low: { bg: 'bg-amber-50', border: 'border-amber-200', icon: AlertTriangle, iconColor: 'text-amber-500', label: 'Low Paper', labelBg: 'bg-amber-100 text-amber-700' },
    info: { bg: 'bg-blue-50', border: 'border-blue-200', icon: Info, iconColor: 'text-blue-500', label: 'Recommendation', labelBg: 'bg-blue-100 text-blue-700' },
  };
  const c = config[alert.level];
  const Icon = c.icon;

  return (
    <div className={`card p-4 border ${c.border} ${c.bg} flex items-start gap-4`}>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${c.labelBg}`}>
        <Icon size={20} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="font-semibold text-slate-900">{alert.title}</h3>
          <span className={`badge ${c.labelBg}`}>{c.label}</span>
        </div>
        <p className="text-sm text-slate-600">{alert.message}</p>
        <p className="text-xs text-slate-400 mt-2">{alert.time}</p>
      </div>
      {alert.level !== 'info' && (
        <button
          type="button"
          className="btn-secondary text-sm shrink-0"
          disabled={alert.acknowledged || isAcknowledging}
          onClick={async () => {
            setIsAcknowledging(true);
            setError('');
            try {
              await onAcknowledge(alert.id);
            } catch (acknowledgeError) {
              setError(acknowledgeError instanceof Error ? acknowledgeError.message : 'Unable to acknowledge alert.');
            } finally {
              setIsAcknowledging(false);
            }
          }}
        >
          <CheckCircle2 size={15} /> {alert.acknowledged ? 'Acknowledged' : isAcknowledging ? 'Saving…' : 'Acknowledge'}
        </button>
      )}
      {error && <p role="alert" className="basis-full text-sm text-red-600">{error}</p>}
    </div>
  );
}
