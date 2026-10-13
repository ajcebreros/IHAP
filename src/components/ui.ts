import type { PaperStatus } from '../types';

export function getPaperStatus(remaining: number): PaperStatus {
  if (remaining <= 5) return 'Empty';
  if (remaining <= 20) return 'Critical';
  if (remaining <= 50) return 'Low';
  return 'Normal';
}

export function statusColor(status: PaperStatus): string {
  switch (status) {
    case 'Normal': return 'text-emerald-600';
    case 'Low': return 'text-amber-600';
    case 'Critical': return 'text-orange-600';
    case 'Empty': return 'text-red-600';
  }
}

export function statusBg(status: PaperStatus): string {
  switch (status) {
    case 'Normal': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'Low': return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'Critical': return 'bg-orange-50 text-orange-700 border-orange-200';
    case 'Empty': return 'bg-red-50 text-red-700 border-red-200';
  }
}

export function statusDot(status: PaperStatus): string {
  switch (status) {
    case 'Normal': return 'bg-emerald-500';
    case 'Low': return 'bg-amber-500';
    case 'Critical': return 'bg-orange-500';
    case 'Empty': return 'bg-red-500';
  }
}

export function formatPeso(v: number): string {
  return '₱' + v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatNumber(v: number): string {
  return v.toLocaleString();
}
