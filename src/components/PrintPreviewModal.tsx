import { useState } from 'react';
import { FileText, Copy, Layers, Wallet, Printer as PrinterIcon, AlertTriangle, CheckCircle2, Brain, RefreshCw } from 'lucide-react';
import { Modal } from './Modal';
import type { Printer, Settings, PrintPurpose } from '../types';
import { getPaperStatus, statusBg, formatPeso } from './ui';

interface PrintPreviewModalProps {
  open: boolean;
  onClose: () => void;
  printers: Printer[];
  settings: Settings;
}

export function PrintPreviewModal({ open, onClose, printers, settings }: PrintPreviewModalProps) {
  const [purpose, setPurpose] = useState<PrintPurpose>('Office');
  const [confidence] = useState(92);
  const [rememberChoice, setRememberChoice] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const printer = printers[0];
  const pages = 12;
  const copies = 2;
  const paperRequired = pages * copies;
  const estimatedCost = paperRequired * settings.paperCostPerSheet;
  const paperAfter = printer.paperRemaining - paperRequired;
  const willTriggerAlert = paperAfter <= settings.lowPaperThreshold;

  const reasons = ['Business-related document title', 'Company department', 'Office report terminology'];

  const handleConfirm = () => {
    setConfirmed(true);
    setTimeout(() => {
      setConfirmed(false);
      onClose();
    }, 1500);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Print Confirmation"
      subtitle="Review your print job before submitting"
      maxWidth="max-w-xl"
      footer={
        <>
          <button onClick={onClose} className="btn-secondary">
            <RefreshCw size={16} /> Change Purpose
          </button>
          <button onClick={handleConfirm} className="btn-primary" disabled={confirmed}>
            {confirmed ? <><CheckCircle2 size={16} /> Sent to Printer</> : <>Confirm & Print</>}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {/* Document info */}
        <div className="grid grid-cols-2 gap-3">
          <InfoRow icon={FileText} label="Document" value="Quarterly_Report.pdf" />
          <InfoRow icon={Layers} label="Pages" value={`${pages} pages`} />
          <InfoRow icon={Copy} label="Copies" value={`${copies}`} />
          <InfoRow icon={FileText} label="Paper Required" value={`${paperRequired} sheets`} />
          <InfoRow icon={Wallet} label="Estimated Cost" value={formatPeso(estimatedCost)} />
          <InfoRow icon={PrinterIcon} label="Printer" value={printer.name} />
        </div>

        {/* Paper remaining */}
        <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50">
          <div>
            <p className="text-sm font-medium text-slate-700">Paper Remaining</p>
            <p className="text-xs text-slate-500">{printer.paperRemaining} / {printer.maxCapacity} sheets</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-24 h-2 bg-slate-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${getPaperStatus(printer.paperRemaining) === 'Normal' ? 'bg-emerald-500' : 'bg-amber-500'}`}
                style={{ width: `${(printer.paperRemaining / printer.maxCapacity) * 100}%` }}
              />
            </div>
            <span className={`badge border ${statusBg(getPaperStatus(printer.paperRemaining))}`}>
              {getPaperStatus(printer.paperRemaining)}
            </span>
          </div>
        </div>

        {/* Print purpose classification */}
        <div className="p-4 rounded-xl border border-brand-100 bg-brand-50/50">
          <div className="flex items-center gap-2 mb-3">
            <Brain size={16} className="text-brand-600" />
            <h4 className="text-sm font-semibold text-slate-800">Print Purpose Analysis</h4>
          </div>
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-lg font-bold text-slate-900">
                Likely {purpose === 'Office' ? 'Office' : 'Personal'} Use
              </p>
              <p className="text-sm text-slate-500">{confidence}% confidence</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPurpose('Office')}
                className={`px-3 py-1.5 text-sm rounded-lg font-medium transition ${
                  purpose === 'Office' ? 'bg-brand-600 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                Office
              </button>
              <button
                onClick={() => setPurpose('Personal')}
                className={`px-3 py-1.5 text-sm rounded-lg font-medium transition ${
                  purpose === 'Personal' ? 'bg-amber-500 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                Personal
              </button>
            </div>
          </div>
          {/* Confidence bar */}
          <div className="mb-3">
            <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
              <div className="h-full bg-brand-500 rounded-full transition-all" style={{ width: `${confidence}%` }} />
            </div>
          </div>
          {/* Reasons */}
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-slate-500">Reasons:</p>
            {reasons.map((r, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-slate-600">
                <CheckCircle2 size={14} className="text-brand-500" />
                {r}
              </div>
            ))}
          </div>
          <label className="flex items-center gap-2 mt-3 cursor-pointer">
            <input
              type="checkbox"
              checked={rememberChoice}
              onChange={(e) => setRememberChoice(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
            />
            <span className="text-sm text-slate-600">Remember my choice for similar documents</span>
          </label>
        </div>

        {/* Warning */}
        {willTriggerAlert && (
          <div className="flex items-start gap-3 p-3.5 rounded-xl border border-amber-200 bg-amber-50">
            <AlertTriangle size={18} className="shrink-0 text-amber-500 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-800">Paper Level Warning</p>
              <p className="text-sm text-amber-700 mt-0.5">
                This print job will leave approximately <strong>{paperAfter} sheets</strong> in the printer,
                which is below the low-paper threshold of {settings.lowPaperThreshold} sheets.
              </p>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: typeof FileText; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200">
      <Icon size={16} className="text-slate-400 shrink-0" />
      <div className="min-w-0">
        <p className="text-xs text-slate-500">{label}</p>
        <p className="text-sm font-medium text-slate-800 truncate">{value}</p>
      </div>
    </div>
  );
}
