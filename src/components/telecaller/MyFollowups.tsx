import React, { useState, useMemo } from 'react';
import { Followup, Lead } from '../../types/crm';
import { completeFollowup } from '../../services/db';
import { useToast } from '../common/Toast';
import {
  CalendarClock,
  PhoneCall,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Clock,
  Check,
  Search,
} from 'lucide-react';

interface MyFollowupsProps {
  followups: Followup[];
  allLeads: Lead[];
  onOpenCalling: (lead: Lead) => void;
  onRefresh: () => void;
}

export const MyFollowups: React.FC<MyFollowupsProps> = ({
  followups,
  allLeads,
  onOpenCalling,
  onRefresh,
}) => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<
    'today' | 'upcoming' | 'overdue' | 'callback-today' | 'completed'
  >('today');
  const [search, setSearch] = useState<string>('');

  const todayStr = new Date().toISOString().split('T')[0];

  const filteredFollowups = useMemo(() => {
    return followups.filter((f) => {
      // Tab matching
      if (activeTab === 'today') {
        if (f.status !== 'PENDING' || f.scheduled_date !== todayStr || f.followup_type !== 'FOLLOW_UP') return false;
      } else if (activeTab === 'callback-today') {
        if (f.status !== 'PENDING' || f.scheduled_date !== todayStr || f.followup_type !== 'CALL_BACK') return false;
      } else if (activeTab === 'upcoming') {
        if (f.status !== 'PENDING' || f.scheduled_date <= todayStr) return false;
      } else if (activeTab === 'overdue') {
        if (f.status !== 'PENDING' || f.scheduled_date >= todayStr) return false;
      } else if (activeTab === 'completed') {
        if (f.status !== 'COMPLETED') return false;
      }

      // Search matching
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const matchName = f.customer_name?.toLowerCase().includes(q);
        const matchMobile = f.customer_mobile?.includes(q);
        const matchProd = f.product?.toLowerCase().includes(q);
        if (!matchName && !matchMobile && !matchProd) return false;
      }

      return true;
    });
  }, [followups, activeTab, search, todayStr]);

  const handleComplete = async (id: string) => {
    try {
      await completeFollowup(id);
      showToast('Follow-up marked as completed.', 'success');
      onRefresh();
    } catch (e: any) {
      showToast(`Error: ${e.message}`, 'error');
    }
  };

  const handleOpenLeadByFollowup = (leadId: string) => {
    const lead = allLeads.find((l) => l.id === leadId);
    if (lead) {
      onOpenCalling(lead);
    } else {
      showToast('Lead record not found.', 'error');
    }
  };

  // Counts for tabs
  const countToday = followups.filter((f) => f.status === 'PENDING' && f.scheduled_date === todayStr && f.followup_type === 'FOLLOW_UP').length;
  const countCallback = followups.filter((f) => f.status === 'PENDING' && f.scheduled_date === todayStr && f.followup_type === 'CALL_BACK').length;
  const countUpcoming = followups.filter((f) => f.status === 'PENDING' && f.scheduled_date > todayStr).length;
  const countOverdue = followups.filter((f) => f.status === 'PENDING' && f.scheduled_date < todayStr).length;
  const countCompleted = followups.filter((f) => f.status === 'COMPLETED').length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-slate-200 gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900">My Scheduled Follow-ups & Callbacks</h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Never miss a promised call back or interested customer appointment
          </p>
        </div>

        {/* Search */}
        <div className="max-w-xs w-full">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search customer / mobile..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
        {[
          { id: 'today', label: "Today's Follow-ups", count: countToday, color: 'text-amber-700' },
          { id: 'callback-today', label: 'Callbacks Today', count: countCallback, color: 'text-yellow-700' },
          { id: 'overdue', label: 'Overdue Follow-ups', count: countOverdue, color: 'text-rose-700' },
          { id: 'upcoming', label: 'Upcoming Follow-ups', count: countUpcoming, color: 'text-blue-700' },
          { id: 'completed', label: 'Completed Follow-ups', count: countCompleted, color: 'text-emerald-700' },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-bold transition ${
                isActive
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                  isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Follow-ups Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Mobile</th>
                <th className="px-4 py-3">Product</th>
                <th className="px-3 py-3">Type</th>
                <th className="px-3 py-3">Scheduled Date</th>
                <th className="px-3 py-3">Time</th>
                <th className="px-4 py-3">Appointment Remark</th>
                <th className="px-3 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredFollowups.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-400">
                    No follow-ups found in this section.
                  </td>
                </tr>
              ) : (
                filteredFollowups.map((f) => (
                  <tr key={f.id} className="hover:bg-slate-50 transition">
                    <td className="px-4 py-3 font-semibold text-slate-900 whitespace-nowrap">
                      {f.customer_name}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-700 whitespace-nowrap">
                      {f.customer_mobile}
                    </td>
                    <td className="px-4 py-3 text-slate-700 max-w-[170px] truncate" title={f.product}>
                      {f.product}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          f.followup_type === 'CALL_BACK'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {f.followup_type === 'CALL_BACK' ? 'Call Back' : 'Follow-up'}
                      </span>
                    </td>
                    <td className="px-3 py-3 font-medium whitespace-nowrap text-slate-900">
                      {f.scheduled_date}
                    </td>
                    <td className="px-3 py-3 font-medium whitespace-nowrap text-slate-700">
                      {f.scheduled_time || '11:00'}
                    </td>
                    <td className="px-4 py-3 text-slate-600 max-w-xs truncate text-[11px]" title={f.remark}>
                      {f.remark}
                    </td>
                    <td className="px-3 py-3 text-center whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          f.status === 'COMPLETED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : f.scheduled_date < todayStr
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {f.status === 'COMPLETED'
                          ? 'Completed'
                          : f.scheduled_date < todayStr
                          ? 'Overdue'
                          : 'Pending'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end space-x-1.5">
                        <button
                          onClick={() => handleOpenLeadByFollowup(f.lead_id)}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-bold shadow-xs transition inline-flex items-center space-x-1"
                        >
                          <PhoneCall className="w-3 h-3" />
                          <span>Call Lead</span>
                        </button>
                        {f.status === 'PENDING' && (
                          <button
                            onClick={() => handleComplete(f.id)}
                            title="Mark as completed"
                            className="p-1 text-emerald-700 hover:bg-emerald-50 rounded border border-emerald-300 transition"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
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
