import type { AuthUser } from '@supabase/supabase-js';
import type { AlertItem, Department, PrintJob, Printer, Settings, User } from './types.js';
import { supabase } from './supabaseClient.js';

type ProfileRow = {
  id: string;
  email: string | null;
  name: string;
  college: string | null;
  department: string | null;
  role: 'admin' | 'user';
  avatar: string;
  total_sheets: number;
  monthly_sheets: number;
  office_sheets: number;
  personal_sheets: number;
  status: 'active' | 'inactive';
  printing_allowed: boolean;
  created_at: string;
};

type PrinterRow = {
  id: string;
  name: string;
  location: string;
  department: string;
  online: boolean;
  paper_remaining: number;
  max_capacity: number;
  queue: number;
  pages_today: number;
  daily_avg: number;
};

type PrintJobRow = {
  id: string;
  user_id: string | null;
  user_name: string;
  department: string;
  document: string;
  document_type: string;
  pages: number;
  copies: number;
  paper_used: number;
  purpose: 'Office' | 'Personal' | 'Unclassified';
  confidence: number;
  printer: string;
  cost: number;
  paper_size: string;
  paper_type: string;
  reasons: string[];
  is_duplex: boolean;
  created_at: string;
};

type AlertRow = {
  id: string;
  level: 'info' | 'low' | 'critical' | 'empty';
  title: string;
  message: string;
  printer: string | null;
  acknowledged: boolean;
  created_at: string;
};

type SettingsRow = {
  id: boolean;
  paper_cost_per_sheet: number;
  max_printer_capacity: number;
  low_paper_threshold: number;
  critical_paper_threshold: number;
  classification_enabled: boolean;
  confidence_threshold: number;
  require_confirmation: boolean;
  low_paper_alerts: boolean;
  critical_paper_alerts: boolean;
  high_consumption_alerts: boolean;
  email_notifications: boolean;
  in_app_notifications: boolean;
};

export interface ChartDatum {
  label: string;
  value: number;
  color: string;
  percent?: number;
}

export interface SustainabilityMetrics {
  totalSheets: number;
  sheetsSaved: number;
  treesSaved: number;
  co2Reduction: number;
  duplexPercentage: number;
}

export interface ConsumptionAnalytics {
  daily: ChartDatum[];
  weekly: ChartDatum[];
  monthly: ChartDatum[];
  yearly: ChartDatum[];
  byPrinter: ChartDatum[];
  byDepartment: ChartDatum[];
  byUser: ChartDatum[];
  byPaperSize: ChartDatum[];
  byPaperType: ChartDatum[];
  byPurpose: ChartDatum[];
  totalPaperConsumed: number;
  monthlyUsage: number;
  avgDailyConsumption: number;
  estimatedCost: number;
  sustainability: SustainabilityMetrics;
  departments: Department[];
}

export interface ApplicationData {
  printers: Printer[];
  alerts: AlertItem[];
  settings: Settings;
  printJobs: PrintJob[];
  analytics: ConsumptionAnalytics;
}

const chartColors = ['#2563eb', '#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe', '#dbeafe'];
const purposeColors: Record<PrintJob['purpose'], string> = {
  Office: '#2563eb',
  Personal: '#f59e0b',
  Unclassified: '#94a3b8',
};

function throwIfError(error: { message: string } | null): void {
  if (error) throw new Error(error.message);
}

export function mapProfileToUser(profile: ProfileRow, email = profile.email ?? ''): User {
  return {
    id: profile.id,
    email,
    name: profile.name,
    role: profile.role,
    college: profile.college ?? undefined,
    department: profile.department ?? '',
    avatar: profile.avatar,
    totalSheets: profile.total_sheets,
    monthlySheets: profile.monthly_sheets,
    officeSheets: profile.office_sheets,
    personalSheets: profile.personal_sheets,
    status: profile.status,
    printingAllowed: profile.printing_allowed,
  };
}

function profileWithUsage(profile: ProfileRow, jobs: PrintJobRow[]): ProfileRow {
  const userJobs = jobs.filter((job) => job.user_id === profile.id);
  const now = new Date();
  return {
    ...profile,
    total_sheets: sum(userJobs, (job) => job.paper_used),
    monthly_sheets: sum(userJobs.filter((job) => {
      const date = new Date(job.created_at);
      return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
    }), (job) => job.paper_used),
    office_sheets: sum(userJobs.filter((job) => job.purpose === 'Office'), (job) => job.paper_used),
    personal_sheets: sum(userJobs.filter((job) => job.purpose === 'Personal'), (job) => job.paper_used),
  };
}

export async function loadCurrentProfile(authUser: AuthUser): Promise<User> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', authUser.id)
    .maybeSingle();
  throwIfError(error);
  if (!data) {
    throw new Error('Your profile was not found. Apply the Supabase profile migrations, then sign in again.');
  }

  const trustedRole = authUser.app_metadata.role === 'admin' ? 'admin' : 'user';
  if (data.role !== trustedRole) {
    throw new Error('Your account role is not configured consistently. Ask an administrator to review your Supabase account.');
  }
  if (data.status !== 'active') {
    throw new Error('This account is inactive. Contact an administrator.');
  }

  const jobs = await loadAllPrintJobRows(authUser.id);
  return mapProfileToUser(profileWithUsage(data, jobs), authUser.email ?? data.email ?? '');
}

async function loadAllProfiles(): Promise<ProfileRow[]> {
  const rows: ProfileRow[] = [];
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: true })
      .range(from, from + pageSize - 1);
    throwIfError(error);
    if (!data) throw new Error('Supabase returned no profile data.');
    rows.push(...data);
    if (data.length < pageSize) return rows;
  }
}

async function loadAllPrintJobRows(userId?: string): Promise<PrintJobRow[]> {
  const rows: PrintJobRow[] = [];
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const response = userId
      ? await supabase
        .from('print_jobs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(from, from + pageSize - 1)
      : await supabase
        .from('print_jobs')
        .select('*')
        .order('created_at', { ascending: false })
        .range(from, from + pageSize - 1);
    throwIfError(response.error);
    if (!response.data) throw new Error('Supabase returned no print job data.');
    rows.push(...response.data);
    if (response.data.length < pageSize) return rows;
  }
}

type CapturedPrintEventRow = {
  windows_username: string | null;
  pages_printed: number | null;
  printed_at: string;
};

async function loadAllCapturedPrintEventRows(): Promise<CapturedPrintEventRow[]> {
  const rows: CapturedPrintEventRow[] = [];
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const response = await supabase
      .from('print_job_events')
      .select('windows_username, pages_printed, printed_at')
      .order('printed_at', { ascending: false })
      .range(from, from + pageSize - 1);
    throwIfError(response.error);
    if (!response.data) throw new Error('Supabase returned no captured print activity.');
    rows.push(...response.data);
    if (response.data.length < pageSize) return rows;
  }
}

function mapPrintJob(row: PrintJobRow): PrintJob {
  return {
    id: row.id,
    datetime: new Date(row.created_at).toLocaleString(),
    user: row.user_name,
    department: row.department,
    document: row.document,
    documentType: row.document_type,
    pages: row.pages,
    copies: row.copies,
    paperUsed: row.paper_used,
    purpose: row.purpose,
    confidence: row.confidence,
    printer: row.printer,
    cost: Number(row.cost),
    paperSize: row.paper_size,
    paperType: row.paper_type,
    reasons: row.reasons,
    isDuplex: row.is_duplex,
  };
}

function mapPrinter(row: PrinterRow): Printer {
  return {
    id: row.id,
    name: row.name,
    location: row.location,
    department: row.department,
    online: row.online,
    paperRemaining: row.paper_remaining,
    maxCapacity: row.max_capacity,
    queue: row.queue,
    pagesToday: row.pages_today,
    dailyAvg: row.daily_avg,
  };
}

function mapAlert(row: AlertRow): AlertItem {
  return {
    id: row.id,
    level: row.level,
    title: row.title,
    message: row.message,
    printer: row.printer ?? undefined,
    time: new Date(row.created_at).toLocaleString(),
    acknowledged: row.acknowledged,
  };
}

function mapSettings(row: SettingsRow): Settings {
  return {
    paperCostPerSheet: Number(row.paper_cost_per_sheet),
    maxPrinterCapacity: row.max_printer_capacity,
    lowPaperThreshold: row.low_paper_threshold,
    criticalPaperThreshold: row.critical_paper_threshold,
    classificationEnabled: row.classification_enabled,
    confidenceThreshold: row.confidence_threshold,
    requireConfirmation: row.require_confirmation,
    lowPaperAlerts: row.low_paper_alerts,
    criticalPaperAlerts: row.critical_paper_alerts,
    highConsumptionAlerts: row.high_consumption_alerts,
    emailNotifications: row.email_notifications,
    inAppNotifications: row.in_app_notifications,
  };
}

function mapSettingsUpdate(settings: Settings) {
  return {
    paper_cost_per_sheet: settings.paperCostPerSheet,
    max_printer_capacity: settings.maxPrinterCapacity,
    low_paper_threshold: settings.lowPaperThreshold,
    critical_paper_threshold: settings.criticalPaperThreshold,
    classification_enabled: settings.classificationEnabled,
    confidence_threshold: settings.confidenceThreshold,
    require_confirmation: settings.requireConfirmation,
    low_paper_alerts: settings.lowPaperAlerts,
    critical_paper_alerts: settings.criticalPaperAlerts,
    high_consumption_alerts: settings.highConsumptionAlerts,
    email_notifications: settings.emailNotifications,
    in_app_notifications: settings.inAppNotifications,
    updated_at: new Date().toISOString(),
  };
}

function sum(rows: PrintJobRow[], getValue: (row: PrintJobRow) => number): number {
  return rows.reduce((total, row) => total + getValue(row), 0);
}

function sumCapturedEvents(rows: CapturedPrintEventRow[]): number {
  return rows.reduce((total, row) => total + (row.pages_printed ?? 0), 0);
}

function groupJobs(
  rows: PrintJobRow[],
  getLabel: (row: PrintJobRow) => string,
  colorForLabel: (label: string, index: number) => string = (_, index) => chartColors[index % chartColors.length],
): ChartDatum[] {
  const totals = new Map<string, number>();
  for (const row of rows) {
    const label = getLabel(row);
    totals.set(label, (totals.get(label) ?? 0) + row.paper_used);
  }
  return [...totals.entries()]
    .map(([label, value], index) => ({
      label,
      value,
      color: colorForLabel(label, index),
    }))
    .sort((a, b) => b.value - a.value);
}

function dailyBuckets(rows: PrintJobRow[]): ChartDatum[] {
  const now = new Date();
  const buckets = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(now);
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - (6 - index));
    return { date, label: date.toLocaleDateString(undefined, { weekday: 'short' }), value: 0 };
  });
  for (const row of rows) {
    const date = new Date(row.created_at);
    const bucket = buckets.find((item) => item.date.toDateString() === date.toDateString());
    if (bucket) bucket.value += row.paper_used;
  }
  return buckets.map(({ label, value }, index) => ({ label, value, color: chartColors[index % chartColors.length] }));
}

function weeklyBuckets(rows: PrintJobRow[]): ChartDatum[] {
  const now = new Date();
  const buckets = Array.from({ length: 4 }, (_, index) => {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - start.getDay() - (3 - index) * 7);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    return { start, end, label: `W${index + 1}`, value: 0 };
  });
  for (const row of rows) {
    const date = new Date(row.created_at);
    const bucket = buckets.find((item) => date >= item.start && date < item.end);
    if (bucket) bucket.value += row.paper_used;
  }
  return buckets.map(({ label, value }, index) => ({ label, value, color: chartColors[index % chartColors.length] }));
}

function monthlyBuckets(rows: PrintJobRow[]): ChartDatum[] {
  const now = new Date();
  const buckets = Array.from({ length: 12 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (11 - index), 1);
    return {
      year: date.getFullYear(),
      month: date.getMonth(),
      label: date.toLocaleDateString(undefined, { month: 'short' }),
      value: 0,
    };
  });
  for (const row of rows) {
    const date = new Date(row.created_at);
    const bucket = buckets.find((item) => item.year === date.getFullYear() && item.month === date.getMonth());
    if (bucket) bucket.value += row.paper_used;
  }
  return buckets.map(({ label, value }, index) => ({ label, value, color: chartColors[index % chartColors.length] }));
}

function yearlyBuckets(rows: PrintJobRow[]): ChartDatum[] {
  const thisYear = new Date().getFullYear();
  const buckets = Array.from({ length: 5 }, (_, index) => ({
    year: thisYear - (4 - index),
    label: String(thisYear - (4 - index)),
    value: 0,
  }));
  for (const row of rows) {
    const bucket = buckets.find((item) => item.year === new Date(row.created_at).getFullYear());
    if (bucket) bucket.value += row.paper_used;
  }
  return buckets.map(({ label, value }, index) => ({ label, value, color: chartColors[index % chartColors.length] }));
}

function departmentRows(
  jobs: PrintJobRow[],
  profiles: ProfileRow[],
  capturedEvents: CapturedPrintEventRow[] = [],
  paperCostPerSheet = 0,
): Department[] {
  const normalizeDepartment = (value: string) => value.trim().replace(/\s+/g, ' ');
  const departmentNames = new Map<string, string>();
  const departmentKey = (value: string) => normalizeDepartment(value).toLowerCase();

  for (const profile of profiles) {
    const name = normalizeDepartment(profile.department ?? '');
    if (name) departmentNames.set(departmentKey(name), name);
  }
  for (const job of jobs) {
    const name = normalizeDepartment(job.department);
    if (name) departmentNames.set(departmentKey(name), name);
  }

  const normalizeIdentity = (value: string) => {
    const trimmed = value.trim();
    const afterDomain = trimmed.split(/[\\\\/@]/).filter(Boolean).pop() ?? trimmed;
    return afterDomain.toLowerCase();
  };
  const capturedByDepartment = new Map<string, CapturedPrintEventRow[]>();
  for (const event of capturedEvents) {
    const username = normalizeIdentity(event.windows_username ?? '');
    if (!username) continue;
    const profile = profiles.find((candidate) =>
      normalizeIdentity(candidate.name) === username
      || normalizeIdentity(candidate.email ?? '') === username
      || normalizeIdentity(candidate.email?.split('@')[0] ?? '') === username
    );
    const departmentName = normalizeDepartment(profile?.department ?? 'Unassigned');
    if (departmentName) departmentNames.set(departmentKey(departmentName), departmentName);
    const key = departmentKey(departmentName);
    capturedByDepartment.set(key, [...(capturedByDepartment.get(key) ?? []), event]);
  }

  const now = Date.now();
  const month = 30 * 24 * 60 * 60 * 1000;
  return [...departmentNames.entries()].map(([key, name]) => {
    const departmentJobs = jobs.filter((job) => departmentKey(job.department) === key);
    const capturedRows = capturedByDepartment.get(key) ?? [];
    const recentCapturedSheets = sumCapturedEvents(capturedRows.filter((event) => now - Date.parse(event.printed_at) <= month));
    const previousCapturedSheets = sumCapturedEvents(capturedRows.filter((event) => {
      const age = now - Date.parse(event.printed_at);
      return age > month && age <= 2 * month;
    }));
    const recordedRecentSheets = sum(departmentJobs.filter((job) => now - Date.parse(job.created_at) <= month), (job) => job.paper_used);
    const recordedPreviousSheets = sum(departmentJobs.filter((job) => {
      const age = now - Date.parse(job.created_at);
      return age > month && age <= 2 * month;
    }), (job) => job.paper_used);
    const recentSheets = recordedRecentSheets + recentCapturedSheets;
    const previousSheets = recordedPreviousSheets + previousCapturedSheets;
    const trend = previousSheets === 0 ? (recentSheets > 0 ? 100 : 0) : ((recentSheets - previousSheets) / previousSheets) * 100;
    const userNames = new Set<string>();
    for (const profile of profiles) {
      if (profile.role !== 'admin' && departmentKey(profile.department ?? '') === key) {
        userNames.add(profile.id);
      }
    }
    for (const job of departmentJobs) {
      if (job.user_name.trim()) userNames.add(job.user_name.trim().toLowerCase());
    }
    for (const event of capturedRows) {
      if (event.windows_username?.trim()) userNames.add(normalizeIdentity(event.windows_username));
    }
    return {
      name,
      sheetsUsed: sum(departmentJobs, (job) => job.paper_used) + sumCapturedEvents(capturedRows),
      estimatedCost: sum(departmentJobs, (job) => Number(job.cost)) + (sumCapturedEvents(capturedRows) * paperCostPerSheet),
      trend: Math.round(trend * 10) / 10,
      users: userNames.size,
    };
  }).sort((a, b) => b.sheetsUsed - a.sheetsUsed);
}

function buildAnalytics(
  jobs: PrintJobRow[],
  profiles: ProfileRow[],
  capturedEvents: CapturedPrintEventRow[] = [],
  paperCostPerSheet = 0,
): ConsumptionAnalytics {
  const totalPaperConsumed = sum(jobs, (job) => job.paper_used);
  const monthlyUsage = sum(
    jobs.filter((job) => {
      const date = new Date(job.created_at);
      const now = new Date();
      return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
    }),
    (job) => job.paper_used,
  );
  const office = sum(jobs.filter((job) => job.purpose === 'Office'), (job) => job.paper_used);
  const personal = sum(jobs.filter((job) => job.purpose === 'Personal'), (job) => job.paper_used);
  const unclassified = sum(jobs.filter((job) => job.purpose === 'Unclassified'), (job) => job.paper_used);
  const purposeTotals = [
    { label: 'Office Use', value: office, color: purposeColors.Office },
    { label: 'Personal Use', value: personal, color: purposeColors.Personal },
    { label: 'Unclassified', value: unclassified, color: purposeColors.Unclassified },
  ];
  const duplexSheetsSaved = sum(jobs.filter((job) => job.is_duplex), (job) => Math.max(0, job.pages * job.copies - job.paper_used));
  const duplexJobs = jobs.filter((job) => job.is_duplex);
  const totalPrintedPages = sum(jobs, (job) => job.pages * job.copies);
  const duplexPages = sum(duplexJobs, (job) => job.pages * job.copies);
  const daily = dailyBuckets(jobs);

  return {
    daily,
    weekly: weeklyBuckets(jobs),
    monthly: monthlyBuckets(jobs),
    yearly: yearlyBuckets(jobs),
    byPrinter: groupJobs(jobs, (job) => job.printer, (_, index) => chartColors[index % chartColors.length]),
    byDepartment: groupJobs(jobs, (job) => job.department, (_, index) => chartColors[index % chartColors.length]),
    byUser: groupJobs(jobs, (job) => job.user_name, (_, index) => chartColors[index % chartColors.length]),
    byPaperSize: groupJobs(jobs, (job) => job.paper_size, (_, index) => chartColors[index % chartColors.length]),
    byPaperType: groupJobs(jobs, (job) => job.paper_type, (_, index) => chartColors[index % chartColors.length]),
    byPurpose: purposeTotals.map((item) => ({
      ...item,
      percent: totalPaperConsumed ? Math.round((item.value / totalPaperConsumed) * 100) : 0,
    })),
    totalPaperConsumed,
    monthlyUsage,
    avgDailyConsumption: Math.round(daily.reduce((total, bucket) => total + bucket.value, 0) / 7),
    estimatedCost: sum(jobs, (job) => Number(job.cost)),
    sustainability: {
      totalSheets: totalPaperConsumed,
      sheetsSaved: duplexSheetsSaved,
      treesSaved: Math.round((duplexSheetsSaved / 8333) * 1000) / 1000,
      co2Reduction: Math.round(duplexSheetsSaved * 0.002 * 10) / 10,
      duplexPercentage: totalPrintedPages ? Math.round((duplexPages / totalPrintedPages) * 100) : 0,
    },
    departments: departmentRows(jobs, profiles, capturedEvents, paperCostPerSheet),
  };
}

export async function loadUsers(): Promise<User[]> {
  const [profiles, jobs, capturedEvents] = await Promise.all([
    loadAllProfiles(),
    loadAllPrintJobRows(),
    loadAllCapturedPrintEventRows(),
  ]);

  const now = new Date();
  const normalizeIdentity = (value: string) => {
    const trimmed = value.trim();
    const afterDomain = trimmed.split(/[\\\\/@]/).filter(Boolean).pop() ?? trimmed;
    return afterDomain.toLowerCase();
  };
  const profileKeys = new Map<string, ProfileRow>();
  for (const profile of profiles) {
    for (const key of [profile.name, profile.email ?? '', profile.email ? profile.email.split('@')[0] : '']) {
      const normalized = normalizeIdentity(key);
      if (normalized) profileKeys.set(normalized, profile);
    }
  }

  const capturedByProfile = new Map<string, CapturedPrintEventRow[]>();
  const capturedByName = new Map<string, CapturedPrintEventRow[]>();
  for (const event of capturedEvents) {
    const username = event.windows_username?.trim();
    if (!username) continue;
    const identity = normalizeIdentity(username);
    if (!identity) continue;
    const profile = profileKeys.get(identity);
    if (profile) {
      const matched = capturedByProfile.get(profile.id) ?? [];
      matched.push(event);
      capturedByProfile.set(profile.id, matched);
    } else {
      const matched = capturedByName.get(identity) ?? [];
      matched.push(event);
      capturedByName.set(identity, matched);
    }
  }

  const capturedUsers: User[] = [...capturedByName.entries()].map(([identity, events]) => {
    const displayName = events[0].windows_username?.trim() || identity;
    const totalSheets = sumCapturedEvents(events);
    const monthlySheets = sumCapturedEvents(events.filter((event) => {
      const date = new Date(event.printed_at);
      return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
    }));
    return {
      id: `captured:${identity}`,
      email: '',
      name: displayName,
      role: 'user',
      department: 'Unassigned',
      avatar: displayName.split(/[\s._-]+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'CU',
      totalSheets,
      monthlySheets,
      officeSheets: 0,
      personalSheets: 0,
      status: 'active',
      printingAllowed: true,
    };
  });

  const profileUsers = profiles
    .filter((profile) => profile.role !== 'admin')
    .map((profile) => {
      const captured = capturedByProfile.get(profile.id) ?? [];
      const user = mapProfileToUser(profileWithUsage(profile, jobs));
      const capturedSheets = sumCapturedEvents(captured);
      const capturedMonthly = sumCapturedEvents(captured.filter((event) => {
        const date = new Date(event.printed_at);
        return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
      }));
      return {
        ...user,
        totalSheets: user.totalSheets + capturedSheets,
        monthlySheets: user.monthlySheets + capturedMonthly,
      };
    });

  return [...profileUsers, ...capturedUsers].sort((a, b) => a.name.localeCompare(b.name));
}

export async function deleteUser(userId: string): Promise<void> {
  const { data, error } = await supabase.rpc('delete_user_account', { target_user_id: userId });
  throwIfError(error);
  if (!data) throw new Error('Supabase did not confirm user deletion.');
}

export async function recordManualConsumption(input: {
  printer: string;
  userName: string;
  department: string;
  paperType: string;
  paperSize: string;
  sheets: number;
  purpose: PrintJob['purpose'];
  datetime: string;
  notes: string;
  paperCostPerSheet: number;
}): Promise<void> {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  throwIfError(authError);
  if (!user) throw new Error('You must be signed in to record consumption.');

  const { error } = await supabase.from('print_jobs').insert({
    user_id: null,
    user_name: input.userName.trim() || 'Manual entry',
    department: input.department,
    document: input.notes.trim() || 'Manual consumption record',
    document_type: 'Manual record',
    pages: input.sheets,
    copies: 1,
    paper_used: input.sheets,
    purpose: input.purpose,
    confidence: 0,
    printer: input.printer,
    cost: input.sheets * input.paperCostPerSheet,
    paper_size: input.paperSize,
    paper_type: input.paperType,
    reasons: input.notes.trim() ? [input.notes.trim()] : [],
    created_at: new Date(input.datetime).toISOString(),
  });
  throwIfError(error);
}

export async function recordUserPrintJob(input: {
  user: User;
  printer: Printer;
  document: string;
  pages: number;
  copies: number;
  purpose: PrintJob['purpose'];
  paperCostPerSheet: number;
}): Promise<void> {
  const paperUsed = input.pages * input.copies;
  const { error } = await supabase.from('print_jobs').insert({
    user_id: input.user.id,
    user_name: input.user.name,
    department: input.user.department,
    document: input.document,
    document_type: input.document.split('.').pop()?.toUpperCase() || 'Document',
    pages: input.pages,
    copies: input.copies,
    paper_used: paperUsed,
    purpose: input.purpose,
    confidence: 0,
    printer: input.printer.name,
    cost: paperUsed * input.paperCostPerSheet,
    paper_size: 'A4',
    paper_type: 'Standard',
    reasons: [],
  });
  throwIfError(error);
}

export async function loadApplicationData(user: User): Promise<ApplicationData> {
  const [printerResponse, alertResponse, settingsResponse, jobRows, profiles, capturedEvents] = await Promise.all([
    supabase.from('printers').select('*').order('name', { ascending: true }),
    supabase.from('alerts').select('*').order('created_at', { ascending: false }),
    supabase.from('app_settings').select('*').eq('id', true).maybeSingle(),
    loadAllPrintJobRows(user.role === 'admin' ? undefined : user.id),
    user.role === 'admin' ? loadAllProfiles() : Promise.resolve([] as ProfileRow[]),
    user.role === 'admin' ? loadAllCapturedPrintEventRows() : Promise.resolve([] as CapturedPrintEventRow[]),
  ]);

  throwIfError(printerResponse.error);
  throwIfError(alertResponse.error);
  throwIfError(settingsResponse.error);
  if (!printerResponse.data || !alertResponse.data) {
    throw new Error('Supabase returned an empty response for printers or alerts.');
  }
  if (!settingsResponse.data) {
    throw new Error('Application settings are missing. Apply the Supabase data migration.');
  }

  const settings = mapSettings(settingsResponse.data);
  const printJobs = jobRows.map(mapPrintJob);
  return {
    printers: printerResponse.data.map(mapPrinter),
    alerts: alertResponse.data.map(mapAlert),
    settings,
    printJobs,
    analytics: buildAnalytics(jobRows, profiles, capturedEvents, settings.paperCostPerSheet),
  };
}

export async function saveApplicationSettings(settings: Settings): Promise<void> {
  const { error } = await supabase
    .from('app_settings')
    .update(mapSettingsUpdate(settings))
    .eq('id', true);
  throwIfError(error);
}
