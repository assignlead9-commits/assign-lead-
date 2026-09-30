import React, { useState, useMemo } from 'react';
import { Lead, Department, UserProfile, LeadStatus, LeadFilterState } from '../../types/crm';
import { StatusBadge } from '../common/Badge';
import { exportTableToExcel, exportTableToCsv } from '../../utils/exportUtils';
import {
  Search,
  Filter,
  RotateCcw,
  Download,
  Eye,
  Edit2,
  UserCheck,
  ChevronLeft,
  ChevronRight,
  PhoneCall,
  Calendar,
  X,
  FileSpreadsheet,
} from 'lucide-react';

interface LeadsListProps {
  leads: Lead[];
  departments: Department[];
  users: UserProfile[];
  statuses: LeadStatus[];
  onViewLead: (lead: Lead) => void;
  onEditLead: (lead: Lead) => void;
  onAssignLead: (lead: Lead) => void;
  onRefresh: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
}

export const LeadsList: React.FC<LeadsListProps> = ({
  leads,
  departments,
  users,
  statuses,
  onViewLead,
  onEditLead,
  onAssignLead,
  onRefresh,
  searchQuery,
  onSearchChange,
}) => {
  // Filter States
  const [selectedDept, setSelectedDept] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedSource, setSelectedSource] = useState<string>('all');
  const [selectedCity, setSelectedCity] = useState<string>('all');
  const [dateType, setDateType] = useState<'created' | 'assigned' | 'followup' | 'all'>('created');
  const [quickDate, setQuickDate] = useState<'all' | 'today' | 'yesterday' | 'this_week' | 'this_month' | 'custom'>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState<boolean>(false);

  // Pagination State
  const [pageSize, setPageSize] = useState<number>(25);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Bulk selection
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set());

  // Distinct sources and cities
  const sources = useMemo(() => {
    const set = new Set<string>();
    leads.forEach((l) => l.source && set.add(l.source));
    return Array.from(set);
  }, [leads]);

  const cities = useMemo(() => {
    const set = new Set<string>();
    leads.forEach((l) => l.city && set.add(l.city));
    return Array.from(set);
  }, [leads]);

  // Filtering
  const filteredLeads = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    const weekAgo = new Date(now);
    weekAgo.setDate(now.getDate() - 7);
    const monthAgo = new Date(now);
    monthAgo.setDate(now.getDate() - 30);

    const q = searchQuery.trim().toLowerCase();

    return leads.filter((lead) => {
      // Global Search
      if (q) {
        const matchName = lead.customer_name?.toLowerCase().includes(q);
        const matchMobile = lead.mobile?.includes(q);
        const matchAlt = lead.alternate_mobile ? lead.alternate_mobile.includes(q) : false;
        const matchId = lead.lead_number?.toLowerCase().includes(q);
        const matchCity = lead.city?.toLowerCase().includes(q);
        if (!matchName && !matchMobile && !matchAlt && !matchId && !matchCity) return false;
      }

      // Department
      if (selectedDept !== 'all' && lead.department_id !== selectedDept) return false;

      // User
      if (selectedUser === 'unassigned' && lead.assigned_to) return false;
      if (selectedUser !== 'all' && selectedUser !== 'unassigned' && lead.assigned_to !== selectedUser) return false;

      // Status
      if (selectedStatus !== 'all' && lead.status_id !== selectedStatus) return false;

      // Source
      if (selectedSource !== 'all' && lead.source !== selectedSource) return false;

      // City
      if (selectedCity !== 'all' && lead.city !== selectedCity) return false;

      // Date Filtering
      if (quickDate !== 'all') {
        let dateVal = lead.created_at;
        if (dateType === 'assigned') dateVal = lead.assigned_at || '';
        else if (dateType === 'followup') dateVal = lead.followup_date || '';

        if (!dateVal) return false;
        const dStr = dateVal.split('T')[0];

        if (quickDate === 'today' && dStr !== todayStr) return false;
        if (quickDate === 'yesterday' && dStr !== yesterdayStr) return false;
        if (quickDate === 'this_week' && new Date(dateVal) < weekAgo) return false;
        if (quickDate === 'this_month' && new Date(dateVal) < monthAgo) return false;
        if (quickDate === 'custom') {
          if (startDate && dStr < startDate) return false;
          if (endDate && dStr > endDate) return false;
        }
      }

      return true;
    });
  }, [
    leads,
    searchQuery,
    selectedDept,
    selectedUser,
    selectedStatus,
    selectedSource,
    selectedCity,
    quickDate,
    dateType,
    startDate,
    endDate,
  ]);

  // Reset Filters
  const handleResetFilters = () => {
    setSelectedDept('all');
    setSelectedUser('all');
    setSelectedStatus('all');
    setSelectedSource('all');
    setSelectedCity('all');
    setDateType('created');
    setQuickDate('all');
    setStartDate('');
    setEndDate('');
    onSearchChange('');
    setCurrentPage(1);
  };

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredLeads.length / pageSize));
  const paginatedLeads = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredLeads.slice(start, start + pageSize);
  }, [filteredLeads, currentPage, pageSize]);

  // Selection
  const toggleSelectAllPage = () => {
    if (paginatedLeads.every((l) => selectedLeadIds.has(l.id))) {
      const next = new Set(selectedLeadIds);
      paginatedLeads.forEach((l) => next.delete(l.id));
      setSelectedLeadIds(next);
    } else {
      const next = new Set(selectedLeadIds);
      paginatedLeads.forEach((l) => next.add(l.id));
      setSelectedLeadIds(next);
    }
  };

  const toggleSelectOne = (id: string) => {
    const next = new Set(selectedLeadIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedLeadIds(next);
  };

  // Exports
  const handleExportExcel = () => {
    const exportData = filteredLeads.map((l) => ({
      'Lead ID': l.lead_number,
      'Customer Name': l.customer_name,
      'Mobile': l.mobile,
      'Alternate Mobile': l.alternate_mobile || '',
      'City': l.city,
      'State': l.state,
      'Department': l.department_name,
      'Product': l.product,
      'Amount': l.amount,
      'Assigned User': l.assigned_user_name,
      'Status': l.status_name,
      'Followup Date': l.followup_date || '',
      'Followup Time': l.followup_time || '',
      'Last Remark': l.last_remark || '',
      'Created Date': l.created_at,
    }));
    exportTableToExcel(exportData, `Leads_Export_${new Date().toISOString().split('T')[0]}`);
  };

  const handleExportCsv = () => {
    const exportData = filteredLeads.map((l) => ({
      'Lead ID': l.lead_number,
      'Customer Name': l.customer_name,
      'Mobile': l.mobile,
      'Alternate Mobile': l.alternate_mobile || '',
      'City': l.city,
      'State': l.state,
      'Department': l.department_name,
      'Product': l.product,
      'Amount': l.amount,
      'Assigned User': l.assigned_user_name,
      'Status': l.status_name,
      'Followup Date': l.followup_date || '',
      'Created Date': l.created_at,
    }));
    exportTableToCsv(exportData, `Leads_Export_${new Date().toISOString().split('T')[0]}`);
  };

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-slate-200 gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900">All Leads Master Database</h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Showing <span className="font-bold text-slate-800">{filteredLeads.length}</span> matching leads
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center space-x-1.5 transition ${
              showAdvancedFilters
                ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Filters</span>
          </button>

          <button
            onClick={handleExportExcel}
            className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 transition flex items-center space-x-1.5"
            title="Export filtered records to Excel"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Excel</span>
          </button>

          <button
            onClick={handleExportCsv}
            className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 transition flex items-center space-x-1.5"
            title="Export filtered records to CSV"
          >
            <Download className="w-3.5 h-3.5 text-blue-600" />
            <span>CSV</span>
          </button>
        </div>
      </div>

      {/* Filters Box */}
      {showAdvancedFilters && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3 animate-in fade-in">
          {/* Quick Date Pills */}
          <div className="flex flex-wrap items-center gap-2 pb-2 border-b border-slate-100">
            <span className="text-xs font-bold text-slate-600 mr-1">Quick Date:</span>
            {[
              { id: 'all', label: 'All Dates' },
              { id: 'today', label: 'Today' },
              { id: 'yesterday', label: 'Yesterday' },
              { id: 'this_week', label: 'This Week' },
              { id: 'this_month', label: 'This Month' },
              { id: 'custom', label: 'Custom Range' },
            ].map((q) => (
              <button
                key={q.id}
                type="button"
                onClick={() => setQuickDate(q.id as any)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition ${
                  quickDate === q.id
                    ? 'bg-slate-900 text-white font-semibold'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {q.label}
              </button>
            ))}

            {quickDate === 'custom' && (
              <div className="flex items-center space-x-2 pl-2">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="text-xs px-2 py-1 border border-slate-300 rounded"
                />
                <span className="text-slate-400 text-xs">to</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="text-xs px-2 py-1 border border-slate-300 rounded"
                />
              </div>
            )}
          </div>

          {/* Grid Filters */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Department</label>
              <select
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                className="w-full text-xs px-2 py-1.5 border border-slate-300 rounded-md bg-white"
              >
                <option value="all">All Departments</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Assigned Telecaller</label>
              <select
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
                className="w-full text-xs px-2 py-1.5 border border-slate-300 rounded-md bg-white"
              >
                <option value="all">All Users</option>
                <option value="unassigned">Unassigned Only</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.full_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Status</label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full text-xs px-2 py-1.5 border border-slate-300 rounded-md bg-white"
              >
                <option value="all">All Statuses</option>
                {statuses.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">City</label>
              <select
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                className="w-full text-xs px-2 py-1.5 border border-slate-300 rounded-md bg-white"
              >
                <option value="all">All Cities</option>
                {cities.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Source</label>
              <select
                value={selectedSource}
                onChange={(e) => setSelectedSource(e.target.value)}
                className="w-full text-xs px-2 py-1.5 border border-slate-300 rounded-md bg-white"
              >
                <option value="all">All Sources</option>
                {sources.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={handleResetFilters}
              className="inline-flex items-center text-xs font-semibold text-rose-600 hover:text-rose-800 transition"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1" />
              <span>Reset Filters</span>
            </button>
          </div>
        </div>
      )}

      {/* Leads Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="p-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={
                      paginatedLeads.length > 0 &&
                      paginatedLeads.every((l) => selectedLeadIds.has(l.id))
                    }
                    onChange={toggleSelectAllPage}
                    className="rounded text-emerald-600 focus:ring-emerald-500"
                  />
                </th>
                <th className="px-3 py-3">Lead ID</th>
                <th className="px-3 py-3">Customer Name</th>
                <th className="px-3 py-3">Mobile</th>
                <th className="px-3 py-3">Department</th>
                <th className="px-3 py-3">Product</th>
                <th className="px-3 py-3">Assigned User</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">Follow-up</th>
                <th className="px-3 py-3">Last Activity</th>
                <th className="px-3 py-3">Created</th>
                <th className="px-3 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedLeads.length === 0 ? (
                <tr>
                  <td colSpan={12} className="p-8 text-center text-slate-400">
                    No leads match your search or filter criteria.
                  </td>
                </tr>
              ) : (
                paginatedLeads.map((lead) => {
                  const isChecked = selectedLeadIds.has(lead.id);
                  return (
                    <tr
                      key={lead.id}
                      className={`hover:bg-slate-50 transition ${
                        isChecked ? 'bg-emerald-50/50' : ''
                      }`}
                    >
                      <td className="p-3 text-center">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSelectOne(lead.id)}
                          className="rounded text-emerald-600 focus:ring-emerald-500"
                        />
                      </td>
                      <td className="px-3 py-3 font-mono font-bold text-slate-800 whitespace-nowrap">
                        {lead.lead_number}
                      </td>
                      <td className="px-3 py-3 font-semibold text-slate-900 whitespace-nowrap">
                        <div>{lead.customer_name}</div>
                        <div className="text-[10px] text-slate-400">{lead.city}, {lead.state}</div>
                      </td>
                      <td className="px-3 py-3 font-mono text-slate-700 whitespace-nowrap">
                        <div>{lead.mobile}</div>
                        {lead.alternate_mobile && (
                          <div className="text-[10px] text-slate-400 font-mono">Alt: {lead.alternate_mobile}</div>
                        )}
                      </td>
                      <td className="px-3 py-3 text-slate-600 whitespace-nowrap">
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[11px] font-medium">
                          {lead.department_name}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-slate-700 max-w-[170px] truncate" title={lead.product}>
                        {lead.product}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        {lead.assigned_user_name !== 'Unassigned' ? (
                          <span className="text-blue-700 font-medium">
                            {lead.assigned_user_name}
                          </span>
                        ) : (
                          <span className="text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded border border-amber-200 text-[11px]">
                            Unassigned
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <StatusBadge status={lead.status_name || 'Untouched'} />
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        {lead.followup_date ? (
                          <div className="text-amber-700 font-medium">
                            {lead.followup_date}
                            {lead.followup_time && <span className="ml-1 text-[10px] text-slate-500">@{lead.followup_time}</span>}
                          </div>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-slate-500 whitespace-nowrap text-[11px]">
                        {lead.last_activity_at
                          ? new Date(lead.last_activity_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
                          : 'None'}
                      </td>
                      <td className="px-3 py-3 text-slate-500 whitespace-nowrap text-[11px]">
                        {new Date(lead.created_at).toLocaleDateString('en-IN')}
                      </td>
                      <td className="px-3 py-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end space-x-1">
                          <button
                            onClick={() => onViewLead(lead)}
                            title="View Calling Screen & Details"
                            className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded transition"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onAssignLead(lead)}
                            title="Assign or Reassign Lead"
                            className="p-1.5 text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded transition"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onEditLead(lead)}
                            title="Edit Lead Information"
                            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-600">
          <div className="flex items-center space-x-2">
            <span>Rows per page:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="text-xs px-2 py-1 border border-slate-300 rounded bg-white"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span>
              Showing {filteredLeads.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} to{' '}
              {Math.min(currentPage * pageSize, filteredLeads.length)} of {filteredLeads.length}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded border border-slate-300 hover:bg-white disabled:opacity-30 transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span>
              Page <span className="font-bold">{currentPage}</span> of{' '}
              <span className="font-bold">{totalPages}</span>
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded border border-slate-300 hover:bg-white disabled:opacity-30 transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
