import { useState } from 'react';
import {
  FileText,
  Copy,
  Layers,
  Wallet,
  Printer as PrinterIcon,
  AlertTriangle,
  CheckCircle2,
  Upload,
  ArrowLeft,
} from 'lucide-react';
import type { Printer, Settings, PrintPurpose, PageKey, User } from '../types';
import { recordUserPrintJob } from '../data';
import { getPaperStatus, statusBg, formatPeso } from './ui';

interface UserPrintScreenProps {
  user: User;
  printers: Printer[];
  settings: Settings;
  onNavigate: (page: PageKey) => void;
  onSaved: () => Promise<void>;
}

export function UserPrintScreen({ user, printers, settings, onNavigate, onSaved }: UserPrintScreenProps) {
  const [selectedPrinterId, setSelectedPrinterId] = useState(printers[0]?.id ?? '');
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [pages, setPages] = useState(1);
  const [copies, setCopies] = useState(1);
  const [purpose, setPurpose] = useState<PrintPurpose>('Office');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const selectedPrinter = printers.find((printer) => printer.id === selectedPrinterId) ?? printers[0];

  if (!selectedPrinter) {
    return (
      <div className="card max-w-2xl mx-auto p-8 text-center">
        <h2 className="text-lg font-semibold text-slate-900">No printer is available</h2>
        <p className="text-sm text-slate-500 mt-2">Ask an administrator to add a printer before recording a print job.</p>
      </div>
    );
  }

  const paperRequired = pages * copies;
  const estimatedCost = paperRequired * settings.paperCostPerSheet;
  const paperAfter = selectedPrinter.paperRemaining - paperRequired;
  const willTriggerAlert = paperAfter <= settings.lowPaperThreshold;
  const status = getPaperStatus(selectedPrinter.paperRemaining);

  const handleSubmit = async () => {
    if (!documentFile) {
      setError('Select a document before submitting the print job.');
      return;
    }
    if (documentFile.size > 50 * 1024 * 1024) {
      setError('The selected file exceeds the 50 MB limit.');
      return;
    }
    if (paperRequired > selectedPrinter.paperRemaining) {
      setError('This printer does not have enough paper for the requested job.');
      return;
    }

    setIsSubmitting(true);
    setError('');
    try {
      await recordUserPrintJob({
        user,
        printer: selectedPrinter,
        document: documentFile.name,
        pages,
        copies,
        purpose,
        paperCostPerSheet: settings.paperCostPerSheet,
      });
      await onSaved();
      onNavigate('print-jobs');
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to save the print job to Supabase.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3">
        <button onClick={() => onNavigate('dashboard')} className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h2 className="text-xl font-bold text-slate-900">Record a Print Job</h2>
          <p className="text-sm text-slate-500 mt-0.5">Save print job details to your account</p>
        </div>
      </div>

      <div className="card p-8 border-2 border-dashed border-slate-200">
        <label className="flex flex-col items-center justify-center text-center cursor-pointer">
          <div className="w-14 h-14 rounded-2xl bg-brand-50 flex items-center justify-center mb-3">
            <Upload size={26} className="text-brand-500" />
          </div>
          <span className="font-medium text-slate-700">{documentFile?.name ?? 'Choose a file to record'}</span>
          <span className="text-sm text-slate-400 mt-1">PDF, DOCX, XLSX, PNG — up to 50 MB</span>
          <input
            type="file"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.png"
            className="sr-only"
            onChange={(event) => {
              setDocumentFile(event.target.files?.[0] ?? null);
              setError('');
            }}
          />
        </label>
        <p className="text-xs text-slate-400 text-center mt-4">
          This records job metadata only. The file is not uploaded and no physical print command is sent.
        </p>
      </div>

      <div className="card p-5">
        <h3 className="font-semibold text-slate-900 mb-4">Print Settings</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="label" htmlFor="printer">Printer</label>
            <select id="printer" className="input" value={selectedPrinter.id} onChange={(event) => setSelectedPrinterId(event.target.value)}>
              {printers.map((printer) => <option key={printer.id} value={printer.id}>{printer.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="pages">Pages</label>
            <input id="pages" type="number" min="1" className="input" value={pages} onChange={(event) => setPages(Math.max(1, parseInt(event.target.value) || 1))} />
          </div>
          <div>
            <label className="label" htmlFor="copies">Copies</label>
            <input id="copies" type="number" min="1" className="input" value={copies} onChange={(event) => setCopies(Math.max(1, parseInt(event.target.value) || 1))} />
          </div>
        </div>
      </div>

      <div className="card p-5">
        <h3 className="font-semibold text-slate-900 mb-4">Job Summary</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
          <InfoRow icon={FileText} label="Document" value={documentFile?.name ?? 'No file selected'} />
          <InfoRow icon={Layers} label="Pages" value={`${pages} pages`} />
          <InfoRow icon={Copy} label="Copies" value={`${copies}`} />
          <InfoRow icon={FileText} label="Paper Required" value={`${paperRequired} sheets`} />
          <InfoRow icon={Wallet} label="Estimated Cost" value={formatPeso(estimatedCost)} />
          <InfoRow icon={PrinterIcon} label="Printer" value={selectedPrinter.name} />
        </div>
        <label className="label" htmlFor="purpose">Purpose</label>
        <select id="purpose" className="input" value={purpose} onChange={(event) => setPurpose(event.target.value as PrintPurpose)}>
          <option value="Office">Office</option>
          <option value="Personal">Personal</option>
          <option value="Unclassified">Unclassified</option>
        </select>

        <div className="flex items-center justify-between p-3 mt-4 rounded-xl border border-slate-200 bg-slate-50">
          <div>
            <p className="text-sm font-medium text-slate-700">Paper Remaining</p>
            <p className="text-xs text-slate-500">{selectedPrinter.paperRemaining} / {selectedPrinter.maxCapacity} sheets</p>
          </div>
          <span className={`badge border ${statusBg(status)}`}>{status}</span>
        </div>
      </div>

      {willTriggerAlert && (
        <div className="flex items-start gap-3 p-4 rounded-xl border border-amber-200 bg-amber-50">
          <AlertTriangle size={18} className="shrink-0 text-amber-500 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800">Paper Level Warning</p>
            <p className="text-sm text-amber-700 mt-0.5">
              This job would leave approximately <strong>{paperAfter} sheets</strong>, below the low-paper threshold of {settings.lowPaperThreshold} sheets.
            </p>
          </div>
        </div>
      )}

      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      <div className="flex items-center justify-end gap-3">
        <button onClick={() => onNavigate('dashboard')} className="btn-secondary" disabled={isSubmitting}>Cancel</button>
        <button onClick={() => void handleSubmit()} className="btn-primary" disabled={isSubmitting}>
          {isSubmitting ? 'Saving…' : <><CheckCircle2 size={16} /> Record Job</>}
        </button>
      </div>
    </div>
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
