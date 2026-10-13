import { useEffect, useState } from 'react';
import { Modal } from './Modal';
import type { Printer, Settings } from '../types';
import { recordManualConsumption } from '../data';

interface RecordConsumptionModalProps {
  open: boolean;
  onClose: () => void;
  printers: Printer[];
  settings: Settings;
  onSaved: () => void;
}

export function RecordConsumptionModal({ open, onClose, printers, settings, onSaved }: RecordConsumptionModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    printer: '',
    user: '',
    department: '',
    paperType: 'Standard',
    paperSize: 'A4',
    sheets: '',
    purpose: 'Office',
    datetime: new Date().toISOString().slice(0, 16),
    notes: '',
  });

  useEffect(() => {
    if (!form.printer && printers[0]) {
      setForm((current) => ({ ...current, printer: printers[0].name }));
    }
  }, [form.printer, printers]);

  const handleSubmit = async () => {
    const sheets = Number(form.sheets);
    if (!form.printer || !form.department.trim() || !Number.isInteger(sheets) || sheets < 1) {
      setError('Choose a printer and department, and enter a positive whole number of sheets.');
      return;
    }

    setIsSubmitting(true);
    setError('');
    try {
      await recordManualConsumption({
        printer: form.printer,
        userName: form.user,
        department: form.department,
        paperType: form.paperType,
        paperSize: form.paperSize,
        sheets,
        purpose: form.purpose as 'Office' | 'Personal' | 'Unclassified',
        datetime: form.datetime,
        notes: form.notes,
        paperCostPerSheet: settings.paperCostPerSheet,
      });
      onSaved();
      onClose();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to save consumption to Supabase.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const update = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Record Manual Consumption"
      subtitle="Log paper usage for print jobs not tracked automatically"
      maxWidth="max-w-lg"
      footer={
        <>
          <button onClick={onClose} className="btn-secondary" disabled={isSubmitting}>Cancel</button>
          <button onClick={() => void handleSubmit()} className="btn-primary" disabled={isSubmitting || printers.length === 0}>
            {isSubmitting ? 'Saving…' : 'Submit Record'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Printer</label>
            <select className="input" value={form.printer} onChange={(e) => update('printer', e.target.value)}>
              {printers.map((p) => <option key={p.id} value={p.name}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">User</label>
            <input className="input" placeholder="e.g. John D." value={form.user} onChange={(e) => update('user', e.target.value)} />
          </div>
          <div>
            <label className="label">Department</label>
            <input className="input" placeholder="Department" value={form.department} onChange={(e) => update('department', e.target.value)} required />
          </div>
          <div>
            <label className="label">Paper Type</label>
            <select className="input" value={form.paperType} onChange={(e) => update('paperType', e.target.value)}>
              <option>Standard</option>
              <option>Glossy</option>
              <option>Recycled</option>
              <option>Matte</option>
            </select>
          </div>
          <div>
            <label className="label">Paper Size</label>
            <select className="input" value={form.paperSize} onChange={(e) => update('paperSize', e.target.value)}>
              <option>A4</option>
              <option>Letter</option>
              <option>A3</option>
              <option>Legal</option>
            </select>
          </div>
          <div>
            <label className="label">Number of Sheets</label>
            <input type="number" className="input" placeholder="e.g. 24" value={form.sheets} onChange={(e) => update('sheets', e.target.value)} />
          </div>
          <div>
            <label className="label">Purpose</label>
            <select className="input" value={form.purpose} onChange={(e) => update('purpose', e.target.value)}>
              <option>Office</option>
              <option>Personal</option>
              <option>Unclassified</option>
            </select>
          </div>
          <div>
            <label className="label">Date & Time</label>
            <input type="datetime-local" className="input" value={form.datetime} onChange={(e) => update('datetime', e.target.value)} />
          </div>
        </div>
        <div>
          <label className="label">Notes (optional)</label>
          <textarea className="input min-h-[80px] resize-y" placeholder="Add any additional notes..." value={form.notes} onChange={(e) => update('notes', e.target.value)} />
        </div>
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-500">
          Estimated cost: <span className="font-semibold text-slate-700">{((Number(form.sheets) || 0) * settings.paperCostPerSheet).toLocaleString('en-PH', { style: 'currency', currency: 'PHP' })}</span>
        </div>
      </div>
    </Modal>
  );
}
