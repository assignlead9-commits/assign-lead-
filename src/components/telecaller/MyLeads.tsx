import React, { useState, useMemo } from 'react';
import { Lead, LeadStatus } from '../../types/crm';
import { StatusBadge } from '../common/Badge';
import {
  PhoneCall,
  Search,
  Filter,
  Eye,
  Calendar,
  Layers,
  ArrowRight,
} from 'lucide-react';

interface MyLeadsProps {
  leads: Lead[];
  statuses: LeadStatus[];
  onOpenCalling: (lead: Lead) => void;
  statusFilterFromDashboard?: string;
  onClearDashboardFilter?: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
}

export const MyLeads: React.FC<MyLeadsProps> = ({
  leads,
  statuses,
  onOpenCalling,
  statusFilterFromDashboard,
  onClearDashboardFilter,
  searchQuery,
  onSearchChange,
}) => {
  const [selectedStatus, setSelectedStatus] = useState<string>(statusFilterFromDashboard || 'all');

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return leads.filter((lead) => {
      // Global Search
      if (q) {
        const matchName = lead.customer_name?.toLowerCase().includes(q);
        const matchMobile = lead.mobile?.includes(q);
        const matchAlt = lead.alternate_mobile ? lead.alternate_mobile.includes(q) : false;
        const matchNumber = lead.lead_number?.toLowerCase().includes(q);
        const matchCity = lead.city?.toLowerCase().includes(q);
        if (!matchName && !matchMobile && !matchAlt && !matchNumber && !matchCity) return false;
      }

      // Status
      if (selectedStatus !== 'all') {
        const targetStatus = statuses.find(
          (s) =>
            s.id === selectedStatus ||
            s.name.toLowerCase() === selectedStatus.toLowerCase()
        );
        if (targetStatus && lead.status_id !== targetStatus.id) return false;
      }

      return true;
    });
  }, [leads, searchQuery, selectedStatus, statuses]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-slate-200 gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900">My Assigned Leads Queue</h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Showing <span className="font-bold text-slate-800">{filtered.length}</span> assigned leads
          </p>
        </div>

        {/* Status Filter Pill */}
        <div className="flex items-center space-x-2">
          <select
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value);
              if (onClearDashboardFilter) onClearDashboardFilter();
            }}
            className="text-xs px-3 py-1.5 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-emerald-500 font-medium"
          >
            <option value="all">All Dispositions</option>
            {statuses.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {statusFilterFromDashboard && statusFilterFromDashboard !== 'all' && (
        <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between text-xs text-emerald-900">
          <span>
            Filtered by KPI: <span className="font-bold">{statusFilterFromDashboard}</span>
          </span>
          <button
            onClick={() => {
              setSelectedStatus('all');
              if (onClearDashboardFilter) onClearDashboardFilter();
            }}
            className="text-emerald-700 underline font-semibold hover:text-emerald-900"
          >
            Clear Filter
          </button>
        </div>
      )}

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Lead ID</th>
                <th className="px-4 py-3">Customer Name</th>
                <th className="px-4 py-3">Mobile</th>
                <th className="px-4 py-3">Department</th>
                <th className="px-4 py-3">Product</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">Follow-up</th>
                <th className="px-4 py-3">Last Remark</th>
                <th className="px-4 py-3">Assigned Date</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-slate-400">
                    No leads found in your queue matching this search or filter.
                  </td>
                </tr>
              ) : (
                filtered.map((lead) => (
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
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[11px] font-medium">
                        {lead.department_name}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-700 max-w-[170px] truncate" title={lead.product}>
                      {lead.product}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <StatusBadge status={lead.status_name || 'Untouched'} />
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-amber-700 font-medium">
                      {lead.followup_date ? `${lead.followup_date} ${lead.followup_time || ''}` : '-'}
                    </td>
                    <td className="px-4 py-3 text-slate-500 max-w-xs truncate text-[11px]" title={lead.last_remark || ''}>
                      {lead.last_remark || <span className="text-slate-300 italic">No notes yet</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap text-[11px]">
                      {lead.assigned_at ? new Date(lead.assigned_at).toLocaleDateString('en-IN') : '-'}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <button
                        onClick={() => onOpenCalling(lead)}
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
