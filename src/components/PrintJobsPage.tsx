import { useCallback, useEffect, useRef, useState } from 'react';
import { Search, Filter, FileText, Brain, RefreshCw, Activity } from 'lucide-react';
import type { PrintJob } from '../types';
import type { Database } from '../lib/supabase.types';
import { supabase } from '../supabaseClient.js';
import { formatPeso } from './ui';

type CapturedPrintEvent = Database['public']['Tables']['print_job_events']['Row'];

export function PrintJobsPage({ printJobs }: { printJobs: PrintJob[] }) {
  const [search, setSearch] = useState('');
  const [purposeFilter, setPurposeFilter] = useState<string>('All');
  const [sortBy, setSortBy] = useState<string>('datetime');
  const [capturedSearch, setCapturedSearch] = useState('');
  const [capturedEvents, setCapturedEvents] = useState<CapturedPrintEvent[]>([]);
  const [capturedLoading, setCapturedLoading] = useState(true);
  const [capturedRefreshing, setCapturedRefreshing] = useState(false);
  const [capturedError, setCapturedError] = useState('');
  const capturedRequestInFlight = useRef(false);

  const loadCapturedEvents = useCallback(async (refresh = false) => {
    if (capturedRequestInFlight.current) return;
    capturedRequestInFlight.current = true;

    if (refresh) setCapturedRefreshing(true);
    else setCapturedLoading(true);
    setCapturedError('');

    try {
      const { data, error } = await supabase
        .from('print_job_events')
        .select(
          'id, agent_id, event_record_id, source_job_id, printer_name, windows_username, machine_name, document_name, port_name, pages_printed, job_size_bytes, printed_at'
        )
        .order('printed_at', { ascending: false })
        .order('id', { ascending: false })
        .limit(200);

      if (error) {
        setCapturedError(error.message);
        return;
      }

      const uniqueEvents = new Map<number, CapturedPrintEvent>();
      for (const event of data ?? []) {
        if (!uniqueEvents.has(event.id)) uniqueEvents.set(event.id, event);
      }
      setCapturedEvents([...uniqueEvents.values()]);
    } catch (loadError: unknown) {
      setCapturedError(
        loadError instanceof Error
          ? loadError.message
          : 'Unable to load captured print events.'
      );
    } finally {
      capturedRequestInFlight.current = false;
      setCapturedLoading(false);
      setCapturedRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadCapturedEvents();
    const timer = window.setInterval(() => {
      void loadCapturedEvents(true);
    }, 15000);
    return () => window.clearInterval(timer);
  }, [loadCapturedEvents]);

  const filtered = printJobs
    .filter((j) => j.document.toLowerCase().includes(search.toLowerCase()) || j.user.toLowerCase().includes(search.toLowerCase()))
    .filter((j) => purposeFilter === 'All' || j.purpose === purposeFilter)
    .sort((a, b) => {
      if (sortBy === 'pages') return b.pages - a.pages;
      if (sortBy === 'cost') return b.cost - a.cost;
      if (sortBy === 'confidence') return b.confidence - a.confidence;
      return b.datetime.localeCompare(a.datetime);
    });
  const capturedTerm = capturedSearch.trim().toLowerCase();
  const filteredCapturedEvents = capturedEvents.filter((event) =>
    [
      event.document_name,
      event.printer_name,
      event.windows_username,
      event.machine_name,
    ].some((value) => value?.toLowerCase().includes(capturedTerm))
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Print Jobs</h2>
          <p className="text-sm text-slate-500 mt-0.5">Recent print activity across all printers</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input className="input pl-9" placeholder="Search by document or user..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-slate-400" />
            <select className="input w-auto" value={purposeFilter} onChange={(e) => setPurposeFilter(e.target.value)}>
              <option>All</option>
              <option>Office</option>
              <option>Personal</option>
              <option>Unclassified</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500">Sort by</span>
            <select className="input w-auto" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="datetime">Date & Time</option>
              <option value="pages">Pages</option>
              <option value="cost">Cost</option>
              <option value="confidence">Confidence</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                <th className="text-left px-4 py-3 font-medium">Date & Time</th>
                <th className="text-left px-4 py-3 font-medium">User</th>
                <th className="text-left px-4 py-3 font-medium">Department</th>
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
        <div className="px-4 py-3 flex items-center justify-between text-sm text-slate-500 border-t border-slate-100">
          <span>Showing {filtered.length} of {printJobs.length} print jobs</span>
          <div className="flex items-center gap-2">
            <button className="btn-ghost text-sm" disabled>Previous</button>
            <button className="btn-ghost text-sm" disabled>Next</button>
          </div>
        </div>
      </div>

      <section className="space-y-4" aria-labelledby="captured-print-jobs-heading">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 id="captured-print-jobs-heading" className="text-lg font-bold text-slate-900">
              Captured print activity
            </h3>
            <p className="mt-0.5 text-sm text-slate-500">
              Windows print metadata. Document contents are not shown.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadCapturedEvents(true)}
            disabled={capturedRefreshing}
            className="btn-secondary inline-flex items-center gap-2"
          >
            <RefreshCw size={16} className={capturedRefreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        <div className="card p-4">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className="input pl-9"
              placeholder="Search captured document, printer, user, or computer..."
              value={capturedSearch}
              onChange={(event) => setCapturedSearch(event.target.value)}
              aria-label="Search captured print activity"
            />
          </div>
        </div>

        {capturedError && (
          <div role="alert" className="card border border-red-200 p-4 text-sm text-red-700">
            <p className="font-semibold">Could not load captured print activity.</p>
            <p className="mt-1">{capturedError}</p>
            <p className="mt-2">Check the administrator SELECT policy for print_job_events in Supabase.</p>
          </div>
        )}

        <div className="card overflow-hidden">
          {capturedLoading ? (
            <p role="status" className="p-10 text-center text-sm text-slate-500">
              Loading captured print events…
            </p>
          ) : !capturedError && filteredCapturedEvents.length === 0 ? (
            <div className="p-10 text-center">
              <Activity size={24} className="mx-auto text-slate-300" />
              <p className="mt-3 font-medium text-slate-700">
                {capturedEvents.length ? 'No matching events' : 'No captured print events yet'}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                New events will appear when the Windows watcher uploads them.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <th className="whitespace-nowrap px-4 py-3 text-left font-medium">Printed at</th>
                    <th className="px-4 py-3 text-left font-medium">Document</th>
                    <th className="px-4 py-3 text-left font-medium">Windows user</th>
                    <th className="px-4 py-3 text-left font-medium">Printer</th>
                    <th className="px-4 py-3 text-right font-medium">Pages</th>
                    <th className="px-4 py-3 text-right font-medium">Job size</th>
                    <th className="px-4 py-3 text-left font-medium">Computer</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredCapturedEvents.map((event) => (
                    <tr key={event.id} className="hover:bg-slate-50/60">
                      <td className="whitespace-nowrap px-4 py-3 text-slate-500">
                        {new Date(event.printed_at).toLocaleString()}
                      </td>
                      <td className="max-w-xs break-words px-4 py-3 font-medium text-slate-800">
                        {event.document_name || 'Unknown document'}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                        {event.windows_username || '—'}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{event.printer_name || '—'}</td>
                      <td className="px-4 py-3 text-right text-slate-600">
                        {event.pages_printed ?? '—'}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right text-slate-600">
                        {event.job_size_bytes == null
                          ? '—'
                          : `${(event.job_size_bytes / 1024).toFixed(1)} KB`}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                        {event.machine_name || event.agent_id || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {!capturedLoading && !capturedError && (
            <div className="border-t border-slate-100 px-4 py-3 text-sm text-slate-500">
              Showing {filteredCapturedEvents.length} of {capturedEvents.length} loaded events. Refreshes every 15 seconds.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function JobRow({ job }: { job: PrintJob }) {
  const purposeBadge = {
    Office: 'bg-brand-50 text-brand-700',
    Personal: 'bg-amber-50 text-amber-700',
    Unclassified: 'bg-slate-100 text-slate-500',
  };
  return (
    <tr className="hover:bg-slate-50/50 transition">
      <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{job.datetime}</td>
      <td className="px-4 py-3 font-medium text-slate-800 whitespace-nowrap">{job.user}</td>
      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{job.department}</td>
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
