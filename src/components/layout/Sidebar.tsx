import React from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  Users,
  Building2,
  FileSpreadsheet,
  UserCheck,
  ListFilter,
  BarChart3,
  LogOut,
  PhoneCall,
  CalendarClock,
  Sparkles,
  Layers,
} from 'lucide-react';

export type AdminTab =
  | 'dashboard'
  | 'leads'
  | 'import'
  | 'assign'
  | 'departments'
  | 'users'
  | 'status-master'
  | 'reports';

export type TelecallerTab = 'dashboard' | 'my-leads' | 'my-followups' | 'reports';

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tab: any) => void;
  untouchedCount?: number;
  followupCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  untouchedCount = 0,
  followupCount = 0,
}) => {
  const { role, logout, currentUser } = useAuth();

  const adminNavItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'leads', label: 'All Leads', icon: Layers },
    { id: 'import', label: 'Import Leads', icon: FileSpreadsheet },
    { id: 'assign', label: 'Assign Leads', icon: UserCheck },
    { id: 'departments', label: 'Departments', icon: Building2 },
    { id: 'users', label: 'Users Master', icon: Users },
    { id: 'status-master', label: 'Status Master', icon: ListFilter },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
  ];

  const telecallerNavItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    {
      id: 'my-leads',
      label: 'My Leads',
      icon: PhoneCall,
      badge: untouchedCount > 0 ? `${untouchedCount} New` : undefined,
      badgeColor: 'bg-emerald-100 text-emerald-800',
    },
    {
      id: 'my-followups',
      label: 'My Follow-ups',
      icon: CalendarClock,
      badge: followupCount > 0 ? `${followupCount}` : undefined,
      badgeColor: 'bg-amber-100 text-amber-800',
    },
    { id: 'reports', label: 'My Reports', icon: BarChart3 },
  ];

  const items = role === 'ADMIN' ? adminNavItems : telecallerNavItems;

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0 min-h-[calc(100vh-4rem)] border-r border-slate-800">
      {/* Role Banner */}
      <div className="p-4 border-b border-slate-800/80 bg-slate-950/40">
        <div className="flex items-center space-x-2 text-xs">
          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          <span className="font-semibold uppercase tracking-wider text-slate-400">
            {role === 'ADMIN' ? 'Admin Portal' : 'Telecaller Workspace'}
          </span>
        </div>
        <p className="text-xs text-slate-400 mt-1 truncate">
          Logged in as <span className="text-white font-medium">{currentUser?.full_name}</span>
        </p>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition duration-150 ${
                isActive
                  ? 'bg-emerald-600 text-white font-semibold shadow-xs'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </div>
              {(item as any).badge && (
                <span
                  className={`text-[11px] px-2 py-0.5 rounded-full font-bold shadow-xs ${
                    isActive ? 'bg-white/20 text-white' : (item as any).badgeColor
                  }`}
                >
                  {(item as any).badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer / Logout */}
      <div className="p-4 border-t border-slate-800/80">
        <button
          onClick={logout}
          className="w-full flex items-center space-x-3 px-3.5 py-2 rounded-lg text-sm font-medium text-slate-400 hover:bg-rose-950/40 hover:text-rose-400 transition"
        >
          <LogOut className="w-4 h-4 text-slate-400" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
};
