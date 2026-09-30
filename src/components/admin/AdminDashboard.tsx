import React from 'react';
import {
  AdminDashboardMetrics,
  UserPerformanceRow,
  DepartmentReportRow,
} from '../../services/db';
import {
  Users,
  Layers,
  UserCheck,
  Clock,
  Flame,
  ShoppingBag,
  CheckCircle,
  AlertTriangle,
  ArrowUpRight,
  TrendingUp,
  PhoneCall,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { StatusBadge } from '../common/Badge';

interface AdminDashboardProps {
  metrics: AdminDashboardMetrics;
  userPerformance: UserPerformanceRow[];
  deptSummary: DepartmentReportRow[];
  onNavigateToTab: (tab: string, filterParams?: any) => void;
  onOpenCalling?: (leadId: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  metrics,
  userPerformance,
  deptSummary,
  onNavigateToTab,
}) => {
  const topKpis = [
    { label: 'Total Leads', value: metrics.totalLeads, icon: Layers, color: 'text-slate-900', bg: 'bg-slate-100', tab: 'leads', filter: 'all' },
    { label: 'Unassigned Leads', value: metrics.unassignedLeads, icon: AlertTriangle, color: 'text-amber-700', bg: 'bg-amber-100', tab: 'assign', filter: 'unassigned' },
    { label: 'Assigned Leads', value: metrics.assignedLeads, icon: UserCheck, color: 'text-blue-700', bg: 'bg-blue-100', tab: 'leads', filter: 'assigned' },
    { label: 'Untouched Leads', value: metrics.untouchedLeads, icon: Clock, color: 'text-purple-700', bg: 'bg-purple-100', tab: 'leads', filter: 'stat-untouched' },
    { label: 'Follow-ups', value: metrics.followupLeads, icon: Calendar, color: 'text-yellow-700', bg: 'bg-yellow-100', tab: 'leads', filter: 'stat-followup' },
    { label: 'Interested', value: metrics.interestedLeads, icon: Sparkles, color: 'text-teal-700', bg: 'bg-teal-100', tab: 'leads', filter: 'stat-interested' },
    { label: 'Hot Leads', value: metrics.hotLeads, icon: Flame, color: 'text-rose-700', bg: 'bg-rose-100', tab: 'leads', filter: 'stat-hotlead' },
    { label: 'Order Placed', value: metrics.orderPlacedLeads, icon: ShoppingBag, color: 'text-emerald-700', bg: 'bg-emerald-100', tab: 'leads', filter: 'stat-orderplaced' },
    { label: 'Converted', value: metrics.convertedLeads, icon: CheckCircle, color: 'text-emerald-800', bg: 'bg-emerald-200', tab: 'leads', filter: 'stat-completed' },
    { label: 'Active Users', value: metrics.activeUsers, icon: Users, color: 'text-indigo-700', bg: 'bg-indigo-100', tab: 'users', filter: null },
  ];

  const todaySummary = [
    { label: 'Leads Imported Today', value: metrics.leadsImportedToday, icon: Layers, color: 'text-slate-800' },
    { label: 'Leads Assigned Today', value: metrics.leadsAssignedToday, icon: UserCheck, color: 'text-blue-800' },
    { label: 'Untouched Leads', value: metrics.untouchedToday, icon: Clock, color: 'text-purple-800' },
    { label: 'Calls/Updates Today', value: metrics.callsToday, icon: PhoneCall, color: 'text-emerald-800' },
    { label: 'Follow-ups Today', value: metrics.followupsToday, icon: Calendar, color: 'text-amber-800' },
    { label: 'Overdue Follow-ups', value: metrics.overdueFollowups, icon: AlertTriangle, color: 'text-rose-800' },
    { label: 'Orders Today', value: metrics.ordersToday, icon: ShoppingBag, color: 'text-emerald-900' },
    { label: 'Active Telecallers', value: metrics.activeTelecallers, icon: Users, color: 'text-indigo-800' },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner / Greeting */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-slate-200 gap-2">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Admin Control Dashboard</h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Real-time pipeline overview, lead allocation, and telecaller team velocity
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => onNavigateToTab('import')}
            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-xs transition flex items-center space-x-1.5"
          >
            <span>+ Import Leads</span>
          </button>
          <button
            onClick={() => onNavigateToTab('assign')}
            className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg shadow-xs transition flex items-center space-x-1.5"
          >
            <span>Assign Leads</span>
          </button>
        </div>
      </div>

      {/* Top KPI Cards (10 Clickable Cards) */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
          Lead Pipeline Metrics
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {topKpis.map((kpi, idx) => {
            const Icon = kpi.icon;
            return (
              <button
                key={idx}
                onClick={() => onNavigateToTab(kpi.tab, kpi.filter)}
                className="bg-white border border-slate-200 hover:border-emerald-400 hover:shadow-md p-3.5 rounded-xl transition text-left group flex flex-col justify-between"
              >
                <div className="flex items-center justify-between w-full mb-2">
                  <span className={`p-2 rounded-lg ${kpi.bg} ${kpi.color}`}>
                    <Icon className="w-4 h-4" />
                  </span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-emerald-600 transition" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-slate-900">{kpi.value}</div>
                  <div className="text-xs font-medium text-slate-500 truncate mt-0.5">
                    {kpi.label}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Today's Summary Section */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 sm:p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <TrendingUp className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
              Today&apos;s Summary
            </h3>
          </div>
          <span className="text-xs text-slate-500 font-medium">Real-time daily activity counters</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {todaySummary.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className="bg-white border border-slate-200 p-3 rounded-lg shadow-xs flex items-center space-x-3"
              >
                <div className="p-2 rounded-lg bg-slate-100 text-slate-700">
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-lg font-bold text-slate-900">{item.value}</div>
                  <div className="text-xs text-slate-500 font-medium">{item.label}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* User-Wise Performance Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-sm sm:text-base">
              User-Wise Telecaller Performance
            </h3>
            <p className="text-xs text-slate-500">
              Live tracking of lead assignment, untouched pool, calls made, and conversions
            </p>
          </div>
          <button
            onClick={() => onNavigateToTab('reports')}
            className="text-xs font-semibold text-emerald-600 hover:text-emerald-800"
          >
            View Full Report &rarr;
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Telecaller</th>
                <th className="px-4 py-3">Department</th>
                <th className="px-3 py-3 text-center">Assigned</th>
                <th className="px-3 py-3 text-center">Untouched</th>
                <th className="px-3 py-3 text-center">Worked</th>
                <th className="px-3 py-3 text-center">Contacted</th>
                <th className="px-3 py-3 text-center">Follow-up</th>
                <th className="px-3 py-3 text-center">Call Back</th>
                <th className="px-3 py-3 text-center">Interested</th>
                <th className="px-3 py-3 text-center">Hot</th>
                <th className="px-3 py-3 text-center">Order Placed</th>
                <th className="px-3 py-3 text-center">Money Prob</th>
                <th className="px-4 py-3 text-right">Conversion %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {userPerformance.length === 0 ? (
                <tr>
                  <td colSpan={13} className="px-4 py-8 text-center text-slate-400">
                    No active telecallers found.
                  </td>
                </tr>
              ) : (
                userPerformance.map((u) => (
                  <tr key={u.userId} className="hover:bg-slate-50/70 transition">
                    <td className="px-4 py-3 font-semibold text-slate-900 whitespace-nowrap">
                      {u.userName}
                    </td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[11px] font-medium">
                        {u.departmentName}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center font-bold text-slate-900">{u.assigned}</td>
                    <td className="px-3 py-3 text-center text-purple-700 font-medium">
                      {u.untouched}
                    </td>
                    <td className="px-3 py-3 text-center text-slate-700">{u.worked}</td>
                    <td className="px-3 py-3 text-center text-blue-700">{u.contacted}</td>
                    <td className="px-3 py-3 text-center text-amber-700">{u.followup}</td>
                    <td className="px-3 py-3 text-center text-yellow-700">{u.callback}</td>
                    <td className="px-3 py-3 text-center text-teal-700 font-medium">
                      {u.interested}
                    </td>
                    <td className="px-3 py-3 text-center text-rose-700 font-medium">{u.hot}</td>
                    <td className="px-3 py-3 text-center text-emerald-700 font-bold">
                      {u.orderPlaced}
                    </td>
                    <td className="px-3 py-3 text-center text-purple-600">{u.moneyProblem}</td>
                    <td className="px-4 py-3 text-right font-bold text-emerald-600">
                      <span className="px-2 py-1 bg-emerald-50 text-emerald-800 rounded-md">
                        {u.conversionPercent}%
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Department-Wise Summary Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-sm sm:text-base">
              Department-Wise Lead Distribution
            </h3>
            <p className="text-xs text-slate-500">
              Department pipeline breakdown (Ayurveda, Astrology, Home Decor, Reorder)
            </p>
          </div>
          <button
            onClick={() => onNavigateToTab('departments')}
            className="text-xs font-semibold text-emerald-600 hover:text-emerald-800"
          >
            Manage Departments &rarr;
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Department</th>
                <th className="px-3 py-3 text-center">Total</th>
                <th className="px-3 py-3 text-center">Assigned</th>
                <th className="px-3 py-3 text-center">Unassigned</th>
                <th className="px-3 py-3 text-center">Untouched</th>
                <th className="px-3 py-3 text-center">Contacted</th>
                <th className="px-3 py-3 text-center">Follow-up</th>
                <th className="px-3 py-3 text-center">Interested</th>
                <th className="px-3 py-3 text-center">Hot</th>
                <th className="px-3 py-3 text-center">Order Placed</th>
                <th className="px-4 py-3 text-right">Conversion %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {deptSummary.map((d) => (
                <tr key={d.departmentId} className="hover:bg-slate-50/70 transition">
                  <td className="px-4 py-3 font-semibold text-slate-900 whitespace-nowrap">
                    {d.departmentName}
                  </td>
                  <td className="px-3 py-3 text-center font-bold text-slate-900">{d.totalLeads}</td>
                  <td className="px-3 py-3 text-center text-blue-700">{d.assigned}</td>
                  <td className="px-3 py-3 text-center font-semibold text-amber-700">
                    {d.unassigned}
                  </td>
                  <td className="px-3 py-3 text-center text-purple-700">{d.untouched}</td>
                  <td className="px-3 py-3 text-center text-slate-700">{d.contacted}</td>
                  <td className="px-3 py-3 text-center text-amber-700">{d.followup}</td>
                  <td className="px-3 py-3 text-center text-teal-700">{d.interested}</td>
                  <td className="px-3 py-3 text-center text-rose-700">{d.hotLeads}</td>
                  <td className="px-3 py-3 text-center text-emerald-700 font-bold">
                    {d.orderPlaced}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-emerald-600">
                    <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 rounded">
                      {d.conversionPercent}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
