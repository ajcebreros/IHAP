import { useState } from 'react';
import { Save, CheckCircle2, Bell, Brain } from 'lucide-react';
import type { Settings, User } from '../types';

interface UserSettingsProps {
  settings: Settings;
  user: User;
}

export function UserSettings({ settings, user }: UserSettingsProps) {
  const [saved, setSaved] = useState(false);
  const [notifyLowPaper, setNotifyLowPaper] = useState(true);
  const [notifyPurpose, setNotifyPurpose] = useState(settings.requireConfirmation);
  const [rememberChoices, setRememberChoices] = useState(true);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Settings</h2>
          <p className="text-sm text-slate-500 mt-0.5">Manage your printing preferences</p>
        </div>
        <button onClick={handleSave} className="btn-primary">
          {saved ? <><CheckCircle2 size={16} /> Saved</> : <><Save size={16} /> Save Changes</>}
        </button>
      </div>

      {/* Profile */}
      <div className="card p-5">
        <h3 className="font-semibold text-slate-900 mb-4">My Profile</h3>
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-eco-500 to-eco-700 flex items-center justify-center text-white text-xl font-bold">
            {user.avatar}
          </div>
          <div>
            <p className="font-semibold text-slate-900">{user.name}</p>
            <p className="text-sm text-slate-500">{user.email}</p>
            {user.college && <p className="text-xs text-slate-500 mt-1">{user.college}</p>}
            <span className="badge bg-eco-50 text-eco-700 border border-eco-200 mt-1">{user.department}</span>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 rounded-xl bg-slate-50">
            <p className="text-xs text-slate-500">Total Sheets</p>
            <p className="text-sm font-bold text-slate-800">{user.totalSheets}</p>
          </div>
          <div className="p-3 rounded-xl bg-slate-50">
            <p className="text-xs text-slate-500">This Month</p>
            <p className="text-sm font-bold text-slate-800">{user.monthlySheets}</p>
          </div>
          <div className="p-3 rounded-xl bg-slate-50">
            <p className="text-xs text-slate-500">Office Use</p>
            <p className="text-sm font-bold text-slate-800">{user.officeSheets}</p>
          </div>
          <div className="p-3 rounded-xl bg-slate-50">
            <p className="text-xs text-slate-500">Personal Use</p>
            <p className="text-sm font-bold text-slate-800">{user.personalSheets}</p>
          </div>
        </div>
      </div>

      {/* Classification preferences */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Brain size={18} className="text-brand-600" />
          <h3 className="font-semibold text-slate-900">Print Purpose Preferences</h3>
        </div>
        <div className="space-y-3">
          <ToggleRow label="Ask me to confirm when classification confidence is low" checked={notifyPurpose} onChange={setNotifyPurpose} />
          <ToggleRow label="Remember my purpose choices for similar documents" checked={rememberChoices} onChange={setRememberChoices} />
        </div>
        <div className="mt-4 p-3 rounded-xl bg-slate-50 border border-slate-200">
          <p className="text-sm text-slate-500">
            Confidence threshold is set to <strong className="text-slate-700">{settings.confidenceThreshold}%</strong>. Below this, you'll be asked to confirm the purpose.
          </p>
          <p className="text-xs text-slate-400 mt-1">This threshold is configured by your administrator.</p>
        </div>
      </div>

      {/* Notifications */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Bell size={18} className="text-slate-600" />
          <h3 className="font-semibold text-slate-900">My Notifications</h3>
        </div>
        <div className="space-y-3">
          <ToggleRow label="Notify me when my printer is low on paper" checked={notifyLowPaper} onChange={setNotifyLowPaper} />
          <ToggleRow label="Email notifications" checked={false} onChange={() => {}} />
        </div>
      </div>

      {/* Read-only system info */}
      <div className="card p-5">
        <h3 className="font-semibold text-slate-900 mb-4">System Information</h3>
        <div className="space-y-2">
          <InfoRow label="Paper cost per sheet" value={`₱${settings.paperCostPerSheet.toFixed(2)}`} />
          <InfoRow label="Low-paper threshold" value={`${settings.lowPaperThreshold} sheets`} />
          <InfoRow label="Critical-paper threshold" value={`${settings.criticalPaperThreshold} sheets`} />
          <InfoRow label="Max printer capacity" value={`${settings.maxPrinterCapacity} sheets`} />
        </div>
        <p className="text-xs text-slate-400 mt-3 italic">
          These settings are managed by your administrator. Contact your IT department to request changes.
        </p>
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
        className={`relative w-11 h-6 rounded-full transition ${checked ? 'bg-eco-600' : 'bg-slate-200'}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : ''}`} />
      </button>
    </label>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
      <span className="text-sm text-slate-600">{label}</span>
      <span className="text-sm font-medium text-slate-800">{value}</span>
    </div>
  );
}
