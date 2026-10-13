import { useState } from 'react';
import { Search, FileText, Brain } from 'lucide-react';
import type { PrintJob, PrintPurpose } from '../types';
import { formatPeso } from './ui';

interface UserPrintJobsProps {
  printJobs: PrintJob[];
}

export function UserPrintJobs({ printJobs }: UserPrintJobsProps) {
  const [search, setSearch] = useState('');
  const [purposeFilter, setPurposeFilter] = useState<string>('All');

  const filtered = printJobs
    .filter((j) => j.document.toLowerCase().includes(search.toLowerCase()))
    .filter((j) => purposeFilter === 'All' || j.purpose === purposeFilter);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">My Print Jobs</h2>
        <p className="text-sm text-slate-500 mt-0.5">Your personal print history</p>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input className="input pl-9" placeholder="Search your documents..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <select className="input w-auto" value={purposeFilter} onChange={(e) => setPurposeFilter(e.target.value)}>
            <option>All</option>
            <option>Office</option>
            <option>Personal</option>
            <option>Unclassified</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                <th className="text-left px-4 py-3 font-medium">Date & Time</th>
                <th className="text-left px-4 py-3 font-medium">Document</th>
                <th className="text-right px-4 py-3 font-medium">Pages</th>
                <th className="text-right px-4 py-3 font-medium">Copies</th>
                <th className="text-right px-4 py-3 font-medium">Paper Used</th>
                <th className="text-left px-4 py-3 font-medium">Purpose</th>
                <th className="text-right px-4 py-3 font-medium">Confidence</th>
                <th className="text-left px-4 py-3 font-medium">Printer</th>
                <th className="text-right px-4 py-3 font-medium">Cost</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((job) => (
                <JobRow key={job.id} job={job} />
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 text-sm text-slate-500 border-t border-slate-100">
          Showing {filtered.length} of {printJobs.length} print jobs
        </div>
      </div>
    </div>
  );
}

function JobRow({ job }: { job: PrintJob }) {
  const purposeBadge: Record<PrintPurpose, string> = {
    Office: 'bg-brand-50 text-brand-700',
    Personal: 'bg-amber-50 text-amber-700',
    Unclassified: 'bg-slate-100 text-slate-500',
  };
  return (
    <tr className="hover:bg-slate-50/50 transition">
      <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{job.datetime}</td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <FileText size={14} className="text-slate-400 shrink-0" />
          <span className="text-slate-700">{job.document}</span>
        </div>
      </td>
      <td className="px-4 py-3 text-right text-slate-600">{job.pages}</td>
      <td className="px-4 py-3 text-right text-slate-600">{job.copies}</td>
      <td className="px-4 py-3 text-right font-medium text-slate-800">{job.paperUsed}</td>
      <td className="px-4 py-3">
        <span className={`badge ${purposeBadge[job.purpose]}`}>{job.purpose}</span>
      </td>
      <td className="px-4 py-3 text-right">
        <div className="inline-flex items-center gap-1.5">
          <Brain size={13} className="text-slate-400" />
          <span className={job.confidence >= 80 ? 'text-emerald-600 font-medium' : job.confidence >= 60 ? 'text-amber-600 font-medium' : 'text-slate-500'}>
            {job.confidence}%
          </span>
        </div>
      </td>
      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{job.printer}</td>
      <td className="px-4 py-3 text-right font-medium text-slate-800">{formatPeso(job.cost)}</td>
    </tr>
  );
}
