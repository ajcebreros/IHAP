import { useState } from 'react';
import { ArrowUpRight, ArrowDownRight, Building2, Users, Search, AlertTriangle } from 'lucide-react';
import type { Department } from '../types';
import { formatPeso, formatNumber } from './ui';

export function DepartmentsPage({ departments }: { departments: Department[] }) {
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'sheets' | 'cost' | 'trend'>('sheets');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const filtered = departments
    .filter((d) => d.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      if (sortBy === 'sheets') return (a.sheetsUsed - b.sheetsUsed) * dir;
      if (sortBy === 'cost') return (a.estimatedCost - b.estimatedCost) * dir;
      return (a.trend - b.trend) * dir;
    });

  const totalSheets = departments.reduce((s, d) => s + d.sheetsUsed, 0);
  const totalCost = departments.reduce((s, d) => s + d.estimatedCost, 0);
  const maxSheets = Math.max(1, ...departments.map((d) => d.sheetsUsed));

  const toggleSort = (col: 'sheets' | 'cost' | 'trend') => {
    if (sortBy === col) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else { setSortBy(col); setSortDir('desc'); }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Department Consumption</h2>
        <p className="text-sm text-slate-500 mt-0.5">Compare paper usage across departments</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-4">
          <p className="text-xs text-slate-500 font-medium uppercase">Total Sheets</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{formatNumber(totalSheets)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-slate-500 font-medium uppercase">Total Cost</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{formatPeso(totalCost)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-slate-500 font-medium uppercase">Departments</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{departments.length}</p>
        </div>
      </div>

      {/* Search */}
      <div className="card p-4">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="input pl-9" placeholder="Search departments..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                <th className="text-left px-4 py-3 font-medium">Department</th>
                <th className="text-left px-4 py-3 font-medium">Users</th>
                <th className="text-left px-4 py-3 font-medium" colSpan={2}>Sheets Used</th>
                <th className="text-right px-4 py-3 font-medium cursor-pointer hover:text-slate-700" onClick={() => toggleSort('sheets')}>
                  Sheets
                </th>
                <th className="text-right px-4 py-3 font-medium cursor-pointer hover:text-slate-700" onClick={() => toggleSort('cost')}>
                  Est. Cost
                </th>
                <th className="text-right px-4 py-3 font-medium cursor-pointer hover:text-slate-700" onClick={() => toggleSort('trend')}>
                  Trend
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((d) => (
                <DeptRow key={d.name} dept={d} maxSheets={maxSheets} />
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-slate-500">No department consumption data yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-slate-400 italic flex items-center gap-1.5">
        <AlertTriangle size={13} /> High consumption is highlighted for awareness, not to assign blame. Unusual patterns may warrant investigation.
      </p>
    </div>
  );
}

function DeptRow({ dept, maxSheets }: { dept: Department; maxSheets: number }) {
  const isHigh = dept.trend > 20;
  return (
    <tr className="hover:bg-slate-50/50 transition">
      <td className="px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
            <Building2 size={15} className="text-slate-500" />
          </div>
          <span className="font-medium text-slate-800">{dept.name}</span>
          {isHigh && <span className="badge bg-amber-50 text-amber-700 border border-amber-200">High usage</span>}
        </div>
      </td>
      <td className="px-4 py-3 text-slate-600">
        <span className="inline-flex items-center gap-1">
          <Users size={13} className="text-slate-400" />
          {dept.users}
        </span>
      </td>
      <td className="px-4 py-3" colSpan={2}>
        <div className="flex items-center gap-2">
          <div className="flex-1 max-w-[120px] h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-brand-500 rounded-full" style={{ width: `${(dept.sheetsUsed / maxSheets) * 100}%` }} />
          </div>
        </div>
      </td>
      <td className="px-4 py-3 text-right font-medium text-slate-800">{formatNumber(dept.sheetsUsed)}</td>
      <td className="px-4 py-3 text-right font-medium text-slate-800">{formatPeso(dept.estimatedCost)}</td>
      <td className="px-4 py-3 text-right">
        <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${dept.trend > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
          {dept.trend > 0 ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
          {Math.abs(dept.trend)}%
        </span>
      </td>
    </tr>
  );
}
