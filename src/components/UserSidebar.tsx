import {
  LayoutDashboard,
  FileText,
  BarChart3,
  Settings,
  LogOut,
  ChevronRight,
} from 'lucide-react';
import type { PageKey, User } from '../types';

interface UserSidebarProps {
  active: PageKey;
  onNavigate: (page: PageKey) => void;
  onLogout: () => void;
  user: User;
}

const navItems: { key: PageKey; label: string; icon: typeof LayoutDashboard }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'print-jobs', label: 'My Print Jobs', icon: FileText },
  { key: 'consumption', label: 'My Usage', icon: BarChart3 },
  { key: 'settings', label: 'Settings', icon: Settings },
];

export function UserSidebar({ active, onNavigate, onLogout, user }: UserSidebarProps) {
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
                  ? 'bg-eco-50 text-eco-700'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Icon size={18} className={isActive ? 'text-eco-600' : 'text-slate-400 group-hover:text-slate-600'} />
              <span className="flex-1 text-left">{item.label}</span>
              {isActive && <ChevronRight size={14} className="text-eco-400" />}
            </button>
          );
        })}
      </nav>

      <div className="p-3 border-t border-slate-100">
        <button onClick={onLogout} className="w-full flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-slate-50 transition group">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-eco-500 to-eco-700 flex items-center justify-center text-white text-sm font-semibold">
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
