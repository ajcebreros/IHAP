import {
  LayoutDashboard,
  Printer,
  FileText,
  BarChart3,
  Building2,
  Bell,
  FileBarChart,
  Settings,
  LogOut,
  ChevronRight,
  Users as UsersIcon,
} from 'lucide-react';
import type { PageKey, User } from '../types';

interface SidebarProps {
  active: PageKey;
  onNavigate: (page: PageKey) => void;
  alertCount: number;
  onLogout: () => void;
  user: User;
}

const navItems: { key: PageKey; label: string; icon: typeof LayoutDashboard }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'print-jobs', label: 'Print Jobs', icon: FileText },
  { key: 'consumption', label: 'Paper Consumption', icon: BarChart3 },
  { key: 'printers', label: 'Printers', icon: Printer },
  { key: 'users', label: 'Users', icon: UsersIcon },
  { key: 'departments', label: 'Departments', icon: Building2 },
  { key: 'analytics', label: 'Analytics', icon: BarChart3 },
  { key: 'alerts', label: 'Alerts', icon: Bell },
  { key: 'reports', label: 'Reports', icon: FileBarChart },
  { key: 'settings', label: 'Settings', icon: Settings },
];

export function Sidebar({ active, onNavigate, alertCount, onLogout, user }: SidebarProps) {
  return (
    <aside className="w-64 shrink-0 bg-white border-r border-slate-200 flex flex-col h-screen sticky top-0">
      <div className="px-5 py-5 flex items-center border-b border-slate-100">
        <img src="/ihap-logo.png" alt="IHAP" className="h-auto max-h-14 w-full object-contain object-left" />
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto scrollbar-thin">
        {navItems.map((item) => {
          const isActive = active === item.key;
          const Icon = item.icon;
          return (
            <button
              key={item.key}
              onClick={() => onNavigate(item.key)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group ${
                isActive
                  ? 'bg-brand-50 text-brand-700'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Icon size={18} className={isActive ? 'text-brand-600' : 'text-slate-400 group-hover:text-slate-600'} />
              <span className="flex-1 text-left">{item.label}</span>
              {item.key === 'alerts' && alertCount > 0 && (
                <span className="px-1.5 py-0.5 text-xs font-semibold rounded-md bg-red-100 text-red-600">{alertCount}</span>
              )}
              {isActive && <ChevronRight size={14} className="text-brand-400" />}
            </button>
          );
        })}
      </nav>

      <div className="p-3 border-t border-slate-100">
        <button onClick={onLogout} className="w-full flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-slate-50 transition group">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center text-white text-sm font-semibold">
            {user.avatar}
          </div>
          <div className="flex-1 min-w-0 text-left">
            <p className="text-sm font-medium text-slate-700 truncate">{user.name}</p>
            <p className="text-xs text-slate-400 truncate">{user.email}</p>
          </div>
          <LogOut size={16} className="text-slate-300 group-hover:text-red-400 transition" />
        </button>
      </div>
    </aside>
  );
}
