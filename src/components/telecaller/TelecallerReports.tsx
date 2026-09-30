import React, { useState, useMemo } from 'react';
import { TelecallerDashboardMetrics } from '../../services/db';
import { Lead, LeadActivity } from '../../types/crm';
import {
  BarChart3,
  Percent,
  Calendar,
  PhoneCall,
  Clock,
  Flame,
  ShoppingBag,
  TrendingUp,
  AlertCircle,
  Sparkles,
} from 'lucide-react';

interface TelecallerReportsProps {
  metrics: TelecallerDashboardMetrics;
  myLeads: Lead[];
  myActivities: LeadActivity[];
}

export const TelecallerReports: React.FC<TelecallerReportsProps> = ({
  metrics,
  myLeads,
  myActivities,
}) => {
  const [quickDate, setQuickDate] = useState<'all' | 'today' | 'yesterday' | 'this_week' | 'this_month'>('all');

  // Conversion calculations
  const totalAssigned = metrics.totalAssigned;
  const untouched = metrics.untouched;
  const totalWorked = Math.max(0, totalAssigned - untouched);
  const contacted = metrics.contacted + metrics.followup + metrics.callback + metrics.interested + metrics.hotLeads;
  const interested = metrics.interested + metrics.hotLeads;
  const orderPlaced = metrics.orderPlaced;

  const workRatePercent = totalAssigned > 0 ? Math.round((totalWorked / totalAssigned) * 100) : 0;
  const contactRatePercent = totalWorked > 0 ? Math.round((contacted / totalWorked) * 100) : 0;
  const interestRatePercent = contacted > 0 ? Math.round((interested / contacted) * 100) : 0;
  const orderConversionRatePercent = totalWorked > 0 ? Math.round((orderPlaced / totalWorked) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-slate-200 gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900">My Calling Performance & Conversion Reports</h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Real-time personal metrics calculated strictly from your assigned leads database
          </p>
        </div>

        {/* Quick Date Filters */}
        <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
          {[
            { id: 'all', label: 'All Time' },
            { id: 'today', label: 'Today' },
            { id: 'yesterday', label: 'Yesterday' },
            { id: 'this_week', label: 'This Week' },
            { id: 'this_month', label: 'This Month' },
          ].map((d) => (
            <button
              key={d.id}
              onClick={() => setQuickDate(d.id as any)}
              className={`px-2.5 py-1 rounded-md font-medium transition ${
                quickDate === d.id ? 'bg-white font-bold text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      {/* Conversion Funnel Cards */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
          Conversion Funnel Metrics
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
              Work Rate %
            </div>
            <div className="text-2xl font-bold text-slate-900">{workRatePercent}%</div>
            <div className="text-[11px] text-slate-400 mt-1">
              {totalWorked} worked of {totalAssigned} assigned
            </div>
          </div>

          <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
              Contact Rate %
            </div>
            <div className="text-2xl font-bold text-blue-700">{contactRatePercent}%</div>
            <div className="text-[11px] text-slate-400 mt-1">
              {contacted} reached of {totalWorked} worked
            </div>
          </div>

          <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
              Interest Rate %
            </div>
            <div className="text-2xl font-bold text-teal-700">{interestRatePercent}%</div>
            <div className="text-[11px] text-slate-400 mt-1">
              {interested} hot/interested customers
            </div>
          </div>

          <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
              Order Conversion %
            </div>
            <div className="text-2xl font-bold text-emerald-700">{orderConversionRatePercent}%</div>
            <div className="text-[11px] text-slate-400 mt-1">
              {orderPlaced} orders closed successfully
            </div>
          </div>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
          Calling Disposition Breakdown
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
            <span className="text-slate-500 block">Total Assigned</span>
            <span className="text-xl font-bold text-slate-900">{metrics.totalAssigned}</span>
          </div>

          <div className="p-3 rounded-lg bg-purple-50 border border-purple-200">
            <span className="text-purple-700 block">Untouched Pool</span>
            <span className="text-xl font-bold text-purple-900">{metrics.untouched}</span>
          </div>

          <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
            <span className="text-blue-700 block">Contacted</span>
            <span className="text-xl font-bold text-blue-900">{metrics.contacted}</span>
          </div>

          <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
            <span className="text-amber-700 block">Follow-ups</span>
            <span className="text-xl font-bold text-amber-900">{metrics.followup}</span>
          </div>

          <div className="p-3 rounded-lg bg-yellow-50 border border-yellow-200">
            <span className="text-yellow-700 block">Call Backs</span>
            <span className="text-xl font-bold text-yellow-900">{metrics.callback}</span>
          </div>

          <div className="p-3 rounded-lg bg-teal-50 border border-teal-200">
            <span className="text-teal-700 block">Interested</span>
            <span className="text-xl font-bold text-teal-900">{metrics.interested}</span>
          </div>

          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200">
            <span className="text-rose-700 block">Hot Leads</span>
            <span className="text-xl font-bold text-rose-900">{metrics.hotLeads}</span>
          </div>

          <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200">
            <span className="text-emerald-700 block">Order Placed</span>
            <span className="text-xl font-bold text-emerald-900">{metrics.orderPlaced}</span>
          </div>

          <div className="p-3 rounded-lg bg-indigo-50 border border-indigo-200">
            <span className="text-indigo-700 block">Money Problem</span>
            <span className="text-xl font-bold text-indigo-900">{metrics.moneyProblem}</span>
          </div>

          <div className="p-3 rounded-lg bg-stone-50 border border-stone-200">
            <span className="text-stone-700 block">No Answer</span>
            <span className="text-xl font-bold text-stone-900">{metrics.noAnswer}</span>
          </div>

          <div className="p-3 rounded-lg bg-red-50 border border-red-200">
            <span className="text-red-700 block">Not Interested</span>
            <span className="text-xl font-bold text-red-900">{metrics.notInterested}</span>
          </div>

          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200">
            <span className="text-rose-700 block">Overdue Follow-ups</span>
            <span className="text-xl font-bold text-rose-900">{metrics.overdueFollowups}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
