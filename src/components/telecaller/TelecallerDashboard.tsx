import React, { useState, useMemo } from 'react';
import { TelecallerDashboardMetrics, TelecallerDateRangeFilter, getTelecallerDashboardMetrics } from '../../services/db';
import { Lead } from '../../types/crm';
import { useAuth } from '../../context/AuthContext';
import {
  PhoneCall,
  Clock,
  Calendar,
  Flame,
  ShoppingBag,
  AlertCircle,
  Sparkles,
  ArrowRight,
  TrendingUp,
  UserCheck,
  CheckCircle2,
  CalendarClock,
  Layers,
  Filter,
  RotateCcw,
  Check,
} from 'lucide-react';
import { StatusBadge } from '../common/Badge';

interface TelecallerDashboardProps {
  metrics: TelecallerDashboardMetrics;
  myLeads: Lead[];
  onStartCalling: () => void;
  onFilterLeadsByStatus: (statusName: string) => void;
  onOpenLead: (lead: Lead) => void;
}

export const TelecallerDashboard: React.FC<TelecallerDashboardProps> = ({
  metrics: initialMetrics,
  myLeads,
  onStartCalling,
  onFilterLeadsByStatus,
  onOpenLead,
}) => {
  const { currentUser } = useAuth();

  // Date Range Filter States
  const [quickDate, setQuickDate] = useState<'all' | 'today' | 'yesterday' | 'this_week' | 'this_month' | 'custom'>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [dateField, setDateField] = useState<'assigned' | 'activity' | 'created'>('assigned');
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);

  // Compute metrics dynamically based on selected date filter
  const currentMetrics = useMemo(() => {
    if (!currentUser) return initialMetrics;
    const dateFilter: TelecallerDateRangeFilter = {
      quickDate,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      dateField,
    };
    return getTelecallerDashboardMetrics(currentUser.id, dateFilter);
  }, [currentUser, quickDate, startDate, endDate, dateField, initialMetrics]);

  // Filter queue leads by selected date range
  const filteredQueueLeads = useMemo(() => {
    if (quickDate === 'all') return myLeads;

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    const weekAgo = new Date(now);
    weekAgo.setDate(now.getDate() - 7);
    const monthAgo = new Date(now);
    monthAgo.setDate(now.getDate() - 30);

    return myLeads.filter((lead) => {
      let targetDateStr = '';
      if (dateField === 'assigned') targetDateStr = lead.assigned_at || lead.created_at || '';
      else if (dateField === 'activity') targetDateStr = lead.last_activity_at || '';
      else if (dateField === 'created') targetDateStr = lead.created_at || '';

      if (!targetDateStr) return false;
      const dStr = targetDateStr.split('T')[0];

      if (quickDate === 'today') return dStr === todayStr;
      if (quickDate === 'yesterday') return dStr === yesterdayStr;
      if (quickDate === 'this_week') return new Date(targetDateStr) >= weekAgo;
      if (quickDate === 'this_month') return new Date(targetDateStr) >= monthAgo;
      if (quickDate === 'custom') {
        if (startDate && dStr < startDate) return false;
        if (endDate && dStr > endDate) return false;
        return true;
      }
      return true;
    });
  }, [myLeads, quickDate, startDate, endDate, dateField]);

  const handleResetDate = () => {
    setQuickDate('all');
    setStartDate('');
    setEndDate('');
    setDateField('assigned');
  };

  const kpiCards = [
    { label: 'Total Assigned Leads', count: currentMetrics.totalAssigned, status: 'all', bg: 'bg-slate-100', text: 'text-slate-900', border: 'border-slate-200' },
    { label: 'Untouched Leads', count: currentMetrics.untouched, status: 'Untouched', bg: 'bg-purple-50', text: 'text-purple-800', border: 'border-purple-200' },
    { label: 'Contacted', count: currentMetrics.contacted, status: 'Contacted', bg: 'bg-blue-50', text: 'text-blue-800', border: 'border-blue-200' },
    { label: 'Follow-up', count: currentMetrics.followup, status: 'Follow-up', bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200' },
    { label: 'Call Back', count: currentMetrics.callback, status: 'Call Back', bg: 'bg-yellow-50', text: 'text-yellow-800', border: 'border-yellow-200' },
    { label: 'Interested', count: currentMetrics.interested, status: 'Interested', bg: 'bg-teal-50', text: 'text-teal-800', border: 'border-teal-200' },
    { label: 'Hot Leads', count: currentMetrics.hotLeads, status: 'Hot Lead', bg: 'bg-rose-50', text: 'text-rose-800', border: 'border-rose-200' },
    { label: 'Order Placed', count: currentMetrics.orderPlaced, status: 'Order Placed', bg: 'bg-emerald-50', text: 'text-emerald-800', border: 'border-emerald-200' },
    { label: 'Payment Pending', count: currentMetrics.paymentPending, status: 'Payment Pending', bg: 'bg-orange-50', text: 'text-orange-800', border: 'border-orange-200' },
    { label: 'Money Problem', count: currentMetrics.moneyProblem, status: 'Money Problem', bg: 'bg-indigo-50', text: 'text-indigo-800', border: 'border-indigo-200' },
    { label: 'No Answer', count: currentMetrics.noAnswer, status: 'No Answer', bg: 'bg-stone-50', text: 'text-stone-800', border: 'border-stone-200' },
    { label: 'Not Interested', count: currentMetrics.notInterested, status: 'Not Interested', bg: 'bg-red-50', text: 'text-red-800', border: 'border-red-200' },
  ];

  const todayWorkItems = [
    { label: "Today's New Leads", count: currentMetrics.todayNewLeads, icon: Layers, color: 'text-slate-800' },
    { label: 'Untouched Leads', count: currentMetrics.untouched, icon: Clock, color: 'text-purple-700' },
    { label: "Today's Follow-ups", count: currentMetrics.todayFollowups, icon: Calendar, color: 'text-amber-700' },
    { label: "Today's Call Backs", count: currentMetrics.todayCallbacks, icon: PhoneCall, color: 'text-yellow-700' },
    { label: 'Overdue Follow-ups', count: currentMetrics.overdueFollowups, icon: AlertCircle, color: 'text-rose-700' },
    { label: 'Interested Customers', count: currentMetrics.interested, icon: Sparkles, color: 'text-teal-700' },
    { label: 'Hot Leads', count: currentMetrics.hotLeads, icon: Flame, color: 'text-rose-600' },
    { label: 'Orders Today', count: currentMetrics.ordersToday, icon: ShoppingBag, color: 'text-emerald-700' },
    { label: 'Updates Done Today', count: currentMetrics.updatesDoneToday, icon: TrendingUp, color: 'text-blue-700' },
  ];

  return (
    <div className="space-y-6">
      {/* Date Range Filter Section */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                Dashboard Date Range Filter
              </h3>
              <p className="text-[11px] text-slate-500">
                Filter KPI metrics and lead queue by assignment or activity period
              </p>
            </div>
          </div>

          {/* Quick Date Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'all', label: 'All Time' },
              { id: 'today', label: 'Today' },
              { id: 'yesterday', label: 'Yesterday' },
              { id: 'this_week', label: 'This Week' },
              { id: 'this_month', label: 'This Month' },
              { id: 'custom', label: 'Custom Range' },
            ].map((p) => {
              const isSelected = quickDate === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => setQuickDate(p.id as any)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    isSelected
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {p.label}
                </button>
              );
            })}

            {quickDate !== 'all' && (
              <button
                onClick={handleResetDate}
                title="Reset Date Filter"
                className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg border border-rose-200 transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Custom Date Controls & Field Selector */}
        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-2">
            <span className="text-slate-500 font-medium">Filter On:</span>
            <select
              value={dateField}
              onChange={(e) => setDateField(e.target.value as any)}
              className="text-xs px-2.5 py-1 border border-slate-300 rounded-md bg-white font-medium text-slate-700"
            >
              <option value="assigned">Lead Assigned Date</option>
              <option value="activity">Last Calling Activity Date</option>
              <option value="created">Lead Creation Date</option>
            </select>
          </div>

          {quickDate === 'custom' && (
            <div className="flex items-center space-x-2 animate-in fade-in">
              <span className="text-slate-500 font-medium">From:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="text-xs px-2.5 py-1 border border-slate-300 rounded-md bg-white font-mono"
              />
              <span className="text-slate-400">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="text-xs px-2.5 py-1 border border-slate-300 rounded-md bg-white font-mono"
              />
            </div>
          )}

          {quickDate !== 'all' && (
            <div className="text-[11px] text-emerald-800 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              Active Period: {quickDate.toUpperCase().replace('_', ' ')} ({currentMetrics.totalAssigned} Leads)
            </div>
          )}
        </div>
      </div>

      {/* Hero Calling Action Bar */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-2xl p-6 shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider text-emerald-400 mb-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Calling Queue Active</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            Ready to call your leads today?
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">
            You have <span className="font-bold text-emerald-400">{currentMetrics.untouched} untouched leads</span> waiting for first contact and{' '}
            <span className="font-bold text-amber-300">{currentMetrics.todayFollowups} follow-ups</span> scheduled for today.
          </p>
        </div>

        <button
          onClick={onStartCalling}
          className="px-6 py-3.5 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white font-extrabold text-sm sm:text-base rounded-xl shadow-lg transition transform hover:-translate-y-0.5 flex items-center space-x-2.5 shrink-0"
        >
          <PhoneCall className="w-5 h-5" />
          <span>START CALLING</span>
        </button>
      </div>

      {/* KPI Cards (Clickable - filter table) */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Pipeline KPI Counters (Click to Filter My Leads)
          </h3>
          <span className="text-[11px] text-slate-400">
            {quickDate !== 'all' ? `Filtered by ${quickDate}` : 'All time assigned leads'}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
          {kpiCards.map((kpi, idx) => (
            <button
              key={idx}
              onClick={() => onFilterLeadsByStatus(kpi.status)}
              className={`p-3 rounded-xl border text-left transition hover:shadow-md flex flex-col justify-between ${kpi.bg} ${kpi.border} hover:ring-2 hover:ring-emerald-500/30`}
            >
              <div className="text-[11px] font-bold text-slate-600 truncate">{kpi.label}</div>
              <div className={`text-2xl font-extrabold mt-1 ${kpi.text}`}>{kpi.count}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Today's Work Section */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2">
            <CalendarClock className="w-5 h-5 text-emerald-600" />
            <h3 className="font-bold text-slate-900 text-base">Today&apos;s Work & Priority Summary</h3>
          </div>
          <span className="text-xs text-slate-500 font-medium">Daily productivity scorecard</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {todayWorkItems.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className="bg-slate-50 border border-slate-200 p-3 rounded-lg flex items-center space-x-3"
              >
                <div className="p-2 rounded-lg bg-white shadow-xs text-slate-700">
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <div className={`text-lg font-bold ${item.color}`}>{item.count}</div>
                  <div className="text-[11px] text-slate-500 font-medium leading-tight">{item.label}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* My Leads Quick Queue (Untouched or Priority Leads matching date range) */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-base">
              Assigned Leads Calling Queue ({filteredQueueLeads.length})
            </h3>
            <p className="text-xs text-slate-500">
              {quickDate !== 'all' ? `Filtered by ${quickDate}` : 'Showing all leads in your queue'}
            </p>
          </div>
          <button
            onClick={onStartCalling}
            className="text-xs font-semibold text-emerald-600 hover:text-emerald-800 flex items-center space-x-1"
          >
            <span>Open First Pending Lead</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Lead ID</th>
                <th className="px-4 py-3">Customer Name</th>
                <th className="px-4 py-3">Mobile</th>
                <th className="px-4 py-3">Product</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">Follow-up</th>
                <th className="px-4 py-3">Last Remark</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredQueueLeads.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    No leads found matching the selected date range.
                  </td>
                </tr>
              ) : (
                filteredQueueLeads.slice(0, 10).map((lead) => (
                  <tr key={lead.id} className="hover:bg-slate-50 transition">
                    <td className="px-4 py-3 font-mono font-bold text-slate-800 whitespace-nowrap">
                      {lead.lead_number}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-900 whitespace-nowrap">
                      <div>{lead.customer_name}</div>
                      <div className="text-[10px] text-slate-400">{lead.city}, {lead.state}</div>
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-700 whitespace-nowrap">
                      {lead.mobile}
                    </td>
                    <td className="px-4 py-3 text-slate-700 max-w-[180px] truncate" title={lead.product}>
                      {lead.product}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <StatusBadge status={lead.status_name || 'Untouched'} />
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-amber-700 font-medium">
                      {lead.followup_date ? `${lead.followup_date} ${lead.followup_time || ''}` : '-'}
                    </td>
                    <td className="px-4 py-3 text-slate-500 max-w-xs truncate text-[11px]" title={lead.last_remark || ''}>
                      {lead.last_remark || <span className="text-slate-300 italic">No activity yet</span>}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <button
                        onClick={() => onOpenLead(lead)}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md font-bold text-xs shadow-xs transition inline-flex items-center space-x-1"
                      >
                        <PhoneCall className="w-3 h-3" />
                        <span>Call & Update</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
