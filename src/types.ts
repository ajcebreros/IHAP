export type PaperStatus = 'Normal' | 'Low' | 'Critical' | 'Empty';
export type PrintPurpose = 'Office' | 'Personal' | 'Unclassified';
export type AlertLevel = 'info' | 'low' | 'critical' | 'empty';
export type UserRole = 'admin' | 'user';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  college?: string;
  department: string;
  avatar: string;
  totalSheets: number;
  monthlySheets: number;
  officeSheets: number;
  personalSheets: number;
  status: 'active' | 'inactive';
  printingAllowed: boolean;
}

export interface Printer {
  id: string;
  name: string;
  location: string;
  department: string;
  online: boolean;
  paperRemaining: number;
  maxCapacity: number;
  queue: number;
  pagesToday: number;
  dailyAvg: number;
}

export interface PrintJob {
  id: string;
  datetime: string;
  user: string;
  department: string;
  document: string;
  documentType: string;
  pages: number;
  copies: number;
  paperUsed: number;
  purpose: PrintPurpose;
  confidence: number;
  printer: string;
  cost: number;
  paperSize: string;
  paperType: string;
  reasons?: string[];
  isDuplex?: boolean;
}

export interface Department {
  name: string;
  sheetsUsed: number;
  estimatedCost: number;
  trend: number;
  users: number;
}

export interface AlertItem {
  id: string;
  level: AlertLevel;
  title: string;
  message: string;
  printer?: string;
  time: string;
  acknowledged?: boolean;
}

export interface Settings {
  paperCostPerSheet: number;
  maxPrinterCapacity: number;
  lowPaperThreshold: number;
  criticalPaperThreshold: number;
  classificationEnabled: boolean;
  confidenceThreshold: number;
  requireConfirmation: boolean;
  lowPaperAlerts: boolean;
  criticalPaperAlerts: boolean;
  highConsumptionAlerts: boolean;
  emailNotifications: boolean;
  inAppNotifications: boolean;
}

export type PageKey =
  | 'dashboard'
  | 'print'
  | 'print-jobs'
  | 'consumption'
  | 'printers'
  | 'departments'
  | 'analytics'
  | 'alerts'
  | 'reports'
  | 'settings'
  | 'users';
