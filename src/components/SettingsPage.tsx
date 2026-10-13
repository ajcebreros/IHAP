import { useEffect, useState } from 'react';
import { Save, CheckCircle2, Plus, Trash2, Printer as PrinterIcon } from 'lucide-react';
import type { Settings, Printer } from '../types';
import { Check } from 'lucide-react';

interface SettingsPageProps {
  settings: Settings;
  onChange: (s: Settings) => Promise<void>;
  printers: Printer[];
}

export function SettingsPage({ settings, onChange, printers }: SettingsPageProps) {
  const [draft, setDraft] = useState(settings);
  const [saved, setSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => setDraft(settings), [settings]);

  const update = (key: keyof Settings, value: number | boolean) => setDraft((current) => ({ ...current, [key]: value }));

  const handleSave = async () => {
    setIsSaving(true);
    setError('');
    try {
      await onChange(draft);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save settings to Supabase.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Settings</h2>
          <p className="text-sm text-slate-500 mt-0.5">Configure paper, classification, notifications, and printers</p>
        </div>
        <button onClick={() => void handleSave()} className="btn-primary" disabled={isSaving}>
          {isSaving ? 'Saving…' : saved ? <><CheckCircle2 size={16} /> Saved</> : <><Save size={16} /> Save Changes</>}
        </button>
      </div>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Paper Settings */}
        <div className="card p-5">
          <h3 className="font-semibold text-slate-900 mb-4">Paper Settings</h3>
          <div className="space-y-4">
            <div>
              <label className="label">Paper Cost per Sheet (₱)</label>
              <input type="number" step="0.01" className="input" value={draft.paperCostPerSheet} onChange={(e) => update('paperCostPerSheet', parseFloat(e.target.value) || 0)} />
            </div>
            <div>
              <label className="label">Maximum Printer Capacity (sheets)</label>
              <input type="number" className="input" value={draft.maxPrinterCapacity} onChange={(e) => update('maxPrinterCapacity', parseInt(e.target.value) || 100)} />
            </div>
            <div>
              <label className="label">Low-Paper Threshold (sheets)</label>
              <input type="number" className="input" value={draft.lowPaperThreshold} onChange={(e) => update('lowPaperThreshold', parseInt(e.target.value) || 0)} />
              <p className="text-xs text-slate-400 mt-1">Alert when paper falls below this level</p>
            </div>
            <div>
              <label className="label">Critical-Paper Threshold (sheets)</label>
              <input type="number" className="input" value={draft.criticalPaperThreshold} onChange={(e) => update('criticalPaperThreshold', parseInt(e.target.value) || 0)} />
              <p className="text-xs text-slate-400 mt-1">Urgent alert when paper falls below this level</p>
            </div>
          </div>
        </div>

        {/* Classification Settings */}
        <div className="card p-5">
          <h3 className="font-semibold text-slate-900 mb-4">Classification Settings</h3>
          <div className="space-y-4">
            <ToggleRow label="Enable print-purpose classification" checked={draft.classificationEnabled} onChange={(v) => update('classificationEnabled', v)} />
            <div>
              <label className="label">Confidence Threshold (%)</label>
              <input type="number" min="0" max="100" className="input" value={draft.confidenceThreshold} onChange={(e) => update('confidenceThreshold', parseInt(e.target.value) || 0)} />
              <p className="text-xs text-slate-400 mt-1">Minimum confidence before requesting user confirmation</p>
            </div>
            <ToggleRow label="Require user confirmation for uncertain classifications" checked={draft.requireConfirmation} onChange={(v) => update('requireConfirmation', v)} />
          </div>
        </div>

        {/* Notifications */}
        <div className="card p-5">
          <h3 className="font-semibold text-slate-900 mb-4">Notifications</h3>
          <div className="space-y-3">
            <ToggleRow label="Low-paper alerts" checked={draft.lowPaperAlerts} onChange={(v) => update('lowPaperAlerts', v)} />
            <ToggleRow label="Critical-paper alerts" checked={draft.criticalPaperAlerts} onChange={(v) => update('criticalPaperAlerts', v)} />
            <ToggleRow label="High-consumption alerts" checked={draft.highConsumptionAlerts} onChange={(v) => update('highConsumptionAlerts', v)} />
            <ToggleRow label="Email notifications" checked={draft.emailNotifications} onChange={(v) => update('emailNotifications', v)} />
            <ToggleRow label="In-app notifications" checked={draft.inAppNotifications} onChange={(v) => update('inAppNotifications', v)} />
          </div>
        </div>

        {/* Printer Settings */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-900">Printer Settings</h3>
            <button className="btn-secondary text-sm">
              <Plus size={15} /> Add Printer
            </button>
          </div>
          <div className="space-y-2">
            {printers.map((p) => (
              <div key={p.id} className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:shadow-card-hover transition">
                <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center">
                  <PrinterIcon size={16} className="text-slate-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{p.name}</p>
                  <p className="text-xs text-slate-400">{p.location} · {p.department} · {p.maxCapacity} sheets</p>
                </div>
                <button className="p-2 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 transition">
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between cursor-pointer">
      <span className="text-sm text-slate-700">{label}</span>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative w-11 h-6 rounded-full transition ${checked ? 'bg-brand-600' : 'bg-slate-200'}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : ''}`} />
        {checked && <Check size={12} className="absolute top-1.5 right-1.5 text-white" />}
      </button>
    </label>
  );
}
