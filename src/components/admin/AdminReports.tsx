import React, { useState, useMemo } from 'react';
import {
  Department,
  UserProfile,
  LeadStatus,
  Lead,
  LeadActivity,
  Followup,
} from '../../types/crm';
import {
  getUserPerformanceReport,
  getDepartmentReport,
  getConversionMetrics,
  UserPerformanceRow,
  DepartmentReportRow,
} from '../../services/db';
import { exportTableToExcel, exportTableToCsv } from '../../utils/exportUtils';
import {
  BarChart3,
  Users,
  Building2,
  Calendar,
  Percent,
  CalendarClock,
  Download,
  FileSpreadsheet,
  Filter,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
} from 'lucide-react';

interface AdminReportsProps {
  departments: Department[];
  users: UserProfile[];
  statuses: LeadStatus[];
  leads: Lead[];
  activities: LeadActivity[];
  followups: Followup[];
}

export const AdminReports: React.FC<AdminReportsProps> = ({
  departments,
  users,
  statuses,
  leads,
  activities,
  followups,
}) => {
  const [activeReportTab, setActiveReportTab] = useState<
    'user-performance' | 'department' | 'conversion' | 'daily' | 'followup'
  >('user-performance');

  // Filter state
  const [selectedDept, setSelectedDept] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<string>('all');
  const [quickDate, setQuickDate] = useState<'all' | 'today' | 'yesterday' | 'this_week' | 'this_month' | 'custom'>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Data calculations
  const userPerformance = useMemo(() => getUserPerformanceReport(), [leads, activities]);
  const departmentReport = useMemo(() => getDepartmentReport(), [leads, activities]);
  const conversionMetrics = useMemo(() => getConversionMetrics(), [leads, activities]);

  // Daily activity aggregation
  const dailyReport = useMemo(() => {
    const map = new Map<string, any>();

    activities.forEach((act) => {
      const dateStr = act.created_at.split('T')[0];
      if (!map.has(dateStr)) {
        map.set(dateStr, {
          date: dateStr,
          totalActivities: 0,
          contacted: 0,
          followups: 0,
          callbacks: 0,
          interested: 0,
          hotLeads: 0,
          orders: 0,
          moneyProblem: 0,
          noAnswer: 0,
          notInterested: 0,
        });
      }

      const row = map.get(dateStr);
      row.totalActivities++;

      const n = (act.new_status_name || '').toLowerCase();
      if (n.includes('order') || n.includes('converted')) row.orders++;
      else if (n.includes('follow-up')) row.followups++;
      else if (n.includes('call back')) row.callbacks++;
      else if (n.includes('hot')) row.hotLeads++;
      else if (n.includes('interested')) row.interested++;
      else if (n.includes('money')) row.moneyProblem++;
      else if (n.includes('no answer')) row.noAnswer++;
      else if (n.includes('not interested')) row.notInterested++;
      else if (n.includes('contacted')) row.contacted++;
    });

    return Array.from(map.values()).sort((a, b) => b.date.localeCompare(a.date));
  }, [activities]);

  // Follow-up metrics
  const todayStr = new Date().toISOString().split('T')[0];
  const followupMetrics = useMemo(() => {
    const totalCreated = followups.length;
    const completed = followups.filter((f) => f.status === 'COMPLETED').length;
    const pending = followups.filter((f) => f.status === 'PENDING').length;
    const overdue = followups.filter((f) => f.status === 'PENDING' && f.scheduled_date < todayStr).length;
    const todayFollowups = followups.filter((f) => f.scheduled_date === todayStr && f.followup_type === 'FOLLOW_UP').length;
    const callbacksToday = followups.filter((f) => f.scheduled_date === todayStr && f.followup_type === 'CALL_BACK').length;

    return { totalCreated, completed, pending, overdue, todayFollowups, callbacksToday };
  }, [followups, todayStr]);

  // Export handlers
  const handleExport = (type: 'excel' | 'csv') => {
    let exportData: any[] = [];
    let name = `Report_${activeReportTab}`;

    if (activeReportTab === 'user-performance') {
      exportData = userPerformance;
      name = 'User_Wise_Performance_Report';
    } else if (activeReportTab === 'department') {
      exportData = departmentReport;
      name = 'Department_Wise_Report';
    } else if (activeReportTab === 'daily') {
      exportData = dailyReport;
      name = 'Daily_Activity_Report';
    } else if (activeReportTab === 'conversion') {
      exportData = [conversionMetrics];
      name = 'Conversion_Metrics_Report';
    } else if (activeReportTab === 'followup') {
      exportData = [followupMetrics];
      name = 'Followup_Summary_Report';
    }

    if (type === 'excel') {
      exportTableToExcel(exportData, name);
    } else {
      exportTableToCsv(exportData, name);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-slate-200 gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900">CRM Analytical Reports & Audits</h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Real-time multi-dimensional reports, telecaller conversion rates, and pipeline velocity
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => handleExport('excel')}
            className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 transition flex items-center space-x-1.5 shadow-xs"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Export to Excel</span>
          </button>
          <button
            onClick={() => handleExport('csv')}
            className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 transition flex items-center space-x-1.5 shadow-xs"
          >
            <Download className="w-3.5 h-3.5 text-blue-600" />
            <span>Export to CSV</span>
          </button>
        </div>
      </div>

      {/* Report Navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
        {[
          { id: 'user-performance', label: 'User-Wise Performance', icon: Users },
          { id: 'department', label: 'Department-Wise Report', icon: Building2 },
          { id: 'conversion', label: 'Conversion & Funnel %', icon: Percent },
          { id: 'daily', label: 'Daily Activity Logs', icon: Calendar },
          { id: 'followup', label: 'Follow-Up & Callbacks', icon: CalendarClock },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeReportTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveReportTab(tab.id as any)}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-bold transition ${
                isActive
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 1. USER-WISE PERFORMANCE REPORT */}
      {activeReportTab === 'user-performance' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs space-y-4 p-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-base">Telecaller Performance Audit</h3>
              <p className="text-xs text-slate-500">
                Detailed assignment, untouched count, calling activity, and conversion percentage per staff member
              </p>
            </div>
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
                  <th className="px-3 py-3 text-center">Money Problem</th>
                  <th className="px-4 py-3 text-right">Conversion %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {userPerformance.map((u) => (
                  <tr key={u.userId} className="hover:bg-slate-50 transition">
                    <td className="px-4 py-3 font-bold text-slate-900 whitespace-nowrap">
                      {u.userName}
                    </td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[11px] font-medium">
                        {u.departmentName}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center font-bold text-slate-900">{u.assigned}</td>
                    <td className="px-3 py-3 text-center text-purple-700 font-medium">{u.untouched}</td>
                    <td className="px-3 py-3 text-center text-slate-700">{u.worked}</td>
                    <td className="px-3 py-3 text-center text-blue-700">{u.contacted}</td>
                    <td className="px-3 py-3 text-center text-amber-700">{u.followup}</td>
                    <td className="px-3 py-3 text-center text-yellow-700">{u.callback}</td>
                    <td className="px-3 py-3 text-center text-teal-700 font-medium">{u.interested}</td>
                    <td className="px-3 py-3 text-center text-rose-700 font-medium">{u.hot}</td>
                    <td className="px-3 py-3 text-center text-emerald-700 font-bold">{u.orderPlaced}</td>
                    <td className="px-3 py-3 text-center text-purple-600">{u.moneyProblem}</td>
                    <td className="px-4 py-3 text-right font-bold text-emerald-700">
                      <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 rounded-md font-bold">
                        {u.conversionPercent}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2. DEPARTMENT REPORT */}
      {activeReportTab === 'department' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs space-y-4 p-5">
          <div>
            <h3 className="font-bold text-slate-900 text-base">Department-Wise Lead Analysis</h3>
            <p className="text-xs text-slate-500">
              Pipeline distribution and conversion breakdown by department
            </p>
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
                  <th className="px-3 py-3 text-center">Call Back</th>
                  <th className="px-3 py-3 text-center">Interested</th>
                  <th className="px-3 py-3 text-center">Hot</th>
                  <th className="px-3 py-3 text-center">Orders</th>
                  <th className="px-3 py-3 text-center">Money Prob</th>
                  <th className="px-4 py-3 text-right">Conversion %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {departmentReport.map((d) => (
                  <tr key={d.departmentId} className="hover:bg-slate-50 transition">
                    <td className="px-4 py-3 font-bold text-slate-900 whitespace-nowrap">
                      {d.departmentName}
                    </td>
                    <td className="px-3 py-3 text-center font-bold text-slate-900">{d.totalLeads}</td>
                    <td className="px-3 py-3 text-center text-blue-700">{d.assigned}</td>
                    <td className="px-3 py-3 text-center font-semibold text-amber-700">{d.unassigned}</td>
                    <td className="px-3 py-3 text-center text-purple-700">{d.untouched}</td>
                    <td className="px-3 py-3 text-center text-slate-700">{d.contacted}</td>
                    <td className="px-3 py-3 text-center text-amber-700">{d.followup}</td>
                    <td className="px-3 py-3 text-center text-yellow-700">{d.callback}</td>
                    <td className="px-3 py-3 text-center text-teal-700 font-medium">{d.interested}</td>
                    <td className="px-3 py-3 text-center text-rose-700 font-medium">{d.hotLeads}</td>
                    <td className="px-3 py-3 text-center text-emerald-700 font-bold">{d.orderPlaced}</td>
                    <td className="px-3 py-3 text-center text-purple-600">{d.moneyProblem}</td>
                    <td className="px-4 py-3 text-right font-bold text-emerald-700">
                      <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 rounded-md">
                        {d.conversionPercent}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. CONVERSION REPORT */}
      {activeReportTab === 'conversion' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-xs">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                Work Rate %
              </div>
              <div className="text-3xl font-bold text-slate-900">{conversionMetrics.workRatePercent}%</div>
              <div className="text-[11px] text-slate-400 mt-1">
                {conversionMetrics.totalWorked} worked of {conversionMetrics.totalAssigned} assigned
              </div>
            </div>

            <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-xs">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                Contact Rate %
              </div>
              <div className="text-3xl font-bold text-blue-700">{conversionMetrics.contactRatePercent}%</div>
              <div className="text-[11px] text-slate-400 mt-1">
                {conversionMetrics.contacted} reached of {conversionMetrics.totalWorked} worked
              </div>
            </div>

            <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-xs">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                Interest Rate %
              </div>
              <div className="text-3xl font-bold text-teal-700">{conversionMetrics.interestRatePercent}%</div>
              <div className="text-[11px] text-slate-400 mt-1">
                {conversionMetrics.interested} showed interest
              </div>
            </div>

            <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-xs">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                Order Conversion %
              </div>
              <div className="text-3xl font-bold text-emerald-700">
                {conversionMetrics.orderConversionRatePercent}%
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                {conversionMetrics.converted} closed orders
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
            <h4 className="font-bold text-slate-900 text-sm mb-3">Formula Transparency & Calculation Logic</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-600">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="font-bold text-slate-800">Work Rate %:</span> (Worked Leads ÷ Total Assigned Leads) × 100
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="font-bold text-slate-800">Contact Rate %:</span> (Contacted Leads ÷ Worked Leads) × 100
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="font-bold text-slate-800">Interest Rate %:</span> (Interested + Hot Leads ÷ Contacted) × 100
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="font-bold text-slate-800">Order Conversion Rate %:</span> (Orders Placed ÷ Worked Leads) × 100
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. DAILY ACTIVITY REPORT */}
      {activeReportTab === 'daily' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs space-y-4 p-5">
          <div>
            <h3 className="font-bold text-slate-900 text-base">Daily Calling & Update Activity Logs</h3>
            <p className="text-xs text-slate-500">
              Aggregated daily update counters generated by telecallers
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-3 py-3 text-center">Total Updates</th>
                  <th className="px-3 py-3 text-center">Contacted</th>
                  <th className="px-3 py-3 text-center">Follow-up</th>
                  <th className="px-3 py-3 text-center">Call Back</th>
                  <th className="px-3 py-3 text-center">Interested</th>
                  <th className="px-3 py-3 text-center">Hot</th>
                  <th className="px-3 py-3 text-center">Orders</th>
                  <th className="px-3 py-3 text-center">Money Prob</th>
                  <th className="px-3 py-3 text-center">No Answer</th>
                  <th className="px-3 py-3 text-center">Not Interested</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {dailyReport.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="p-8 text-center text-slate-400">
                      No activity logs recorded yet today.
                    </td>
                  </tr>
                ) : (
                  dailyReport.map((row) => (
                    <tr key={row.date} className="hover:bg-slate-50 transition">
                      <td className="px-4 py-3 font-bold text-slate-900 whitespace-nowrap">
                        {row.date}
                      </td>
                      <td className="px-3 py-3 text-center font-bold text-slate-900">
                        {row.totalActivities}
                      </td>
                      <td className="px-3 py-3 text-center text-blue-700">{row.contacted}</td>
                      <td className="px-3 py-3 text-center text-amber-700">{row.followups}</td>
                      <td className="px-3 py-3 text-center text-yellow-700">{row.callbacks}</td>
                      <td className="px-3 py-3 text-center text-teal-700 font-medium">{row.interested}</td>
                      <td className="px-3 py-3 text-center text-rose-700 font-medium">{row.hotLeads}</td>
                      <td className="px-3 py-3 text-center text-emerald-700 font-bold">{row.orders}</td>
                      <td className="px-3 py-3 text-center text-purple-600">{row.moneyProblem}</td>
                      <td className="px-3 py-3 text-center text-slate-500">{row.noAnswer}</td>
                      <td className="px-3 py-3 text-center text-rose-600">{row.notInterested}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. FOLLOW-UP REPORT */}
      {activeReportTab === 'followup' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs text-center">
              <div className="text-xl font-bold text-slate-900">{followupMetrics.totalCreated}</div>
              <div className="text-xs text-slate-500 font-medium mt-1">Total Scheduled</div>
            </div>
            <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs text-center">
              <div className="text-xl font-bold text-emerald-700">{followupMetrics.completed}</div>
              <div className="text-xs text-emerald-800 font-medium mt-1">Completed</div>
            </div>
            <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs text-center">
              <div className="text-xl font-bold text-blue-700">{followupMetrics.pending}</div>
              <div className="text-xs text-blue-800 font-medium mt-1">Pending</div>
            </div>
            <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs text-center">
              <div className="text-xl font-bold text-rose-700">{followupMetrics.overdue}</div>
              <div className="text-xs text-rose-800 font-medium mt-1">Overdue</div>
            </div>
            <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs text-center">
              <div className="text-xl font-bold text-amber-700">{followupMetrics.todayFollowups}</div>
              <div className="text-xs text-amber-800 font-medium mt-1">Today Follow-ups</div>
            </div>
            <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs text-center">
              <div className="text-xl font-bold text-yellow-700">{followupMetrics.callbacksToday}</div>
              <div className="text-xs text-yellow-800 font-medium mt-1">Callbacks Today</div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
            <h4 className="font-bold text-slate-900 text-sm mb-3">Follow-up Pipeline Status Bar</h4>
            <div className="w-full bg-slate-100 rounded-full h-4 overflow-hidden flex">
              <div
                style={{
                  width: `${(followupMetrics.completed / Math.max(1, followupMetrics.totalCreated)) * 100}%`,
                }}
                className="bg-emerald-500"
                title={`Completed: ${followupMetrics.completed}`}
              />
              <div
                style={{
                  width: `${(followupMetrics.pending / Math.max(1, followupMetrics.totalCreated)) * 100}%`,
                }}
                className="bg-blue-500"
                title={`Pending: ${followupMetrics.pending}`}
              />
              <div
                style={{
                  width: `${(followupMetrics.overdue / Math.max(1, followupMetrics.totalCreated)) * 100}%`,
                }}
                className="bg-rose-500"
                title={`Overdue: ${followupMetrics.overdue}`}
              />
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500 mt-2">
              <div className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span>Completed ({followupMetrics.completed})</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                <span>Pending Active ({followupMetrics.pending})</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                <span>Overdue Alert ({followupMetrics.overdue})</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
