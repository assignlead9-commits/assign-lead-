import React, { useState, useEffect } from 'react';
import { Lead, Department, UserProfile } from '../../types/crm';
import { getLeads, assignLeads } from '../../services/db';
import { useToast } from '../common/Toast';
import { useAuth } from '../../context/AuthContext';
import { StatusBadge } from '../common/Badge';
import {
  UserCheck,
  CheckSquare,
  Square,
  AlertCircle,
  Filter,
  Check,
  Search,
  Sparkles,
} from 'lucide-react';

interface AssignLeadsProps {
  departments: Department[];
  users: UserProfile[];
  onAssignmentDone: () => void;
}

export const AssignLeads: React.FC<AssignLeadsProps> = ({
  departments,
  users,
  onAssignmentDone,
}) => {
  const { showToast } = useToast();
  const { currentUser } = useAuth();

  const [selectedDeptId, setSelectedDeptId] = useState<string>('all');
  const [filterType, setFilterType] = useState<'unassigned' | 'all'>('unassigned');
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set());
  const [targetUserId, setTargetUserId] = useState<string>('');
  const [isAssigning, setIsAssigning] = useState<boolean>(false);
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);

  const telecallers = users.filter((u) => u.role === 'TELECALLER' && u.active);

  const loadLeads = async () => {
    try {
      const fetched = await getLeads({
        role: 'ADMIN',
        currentUserId: currentUser?.id || '',
        departmentId: selectedDeptId === 'all' ? undefined : selectedDeptId,
        unassignedOnly: filterType === 'unassigned',
        searchQuery: searchFilter,
      });
      setLeads(fetched);
      setSelectedLeadIds(new Set());
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadLeads();
  }, [selectedDeptId, filterType, searchFilter]);

  const toggleSelectLead = (id: string) => {
    const updated = new Set(selectedLeadIds);
    if (updated.has(id)) {
      updated.delete(id);
    } else {
      updated.add(id);
    }
    setSelectedLeadIds(updated);
  };

  const toggleSelectAll = () => {
    if (selectedLeadIds.size === leads.length) {
      setSelectedLeadIds(new Set());
    } else {
      setSelectedLeadIds(new Set(leads.map((l) => l.id)));
    }
  };

  const handleOpenConfirm = () => {
    if (selectedLeadIds.size === 0) {
      showToast('Please select at least one lead to assign.', 'error');
      return;
    }
    if (!targetUserId) {
      showToast('Please choose a telecaller to assign the leads to.', 'error');
      return;
    }
    setShowConfirmModal(true);
  };

  const handleConfirmAssign = async () => {
    setIsAssigning(true);
    const targetUser = telecallers.find((u) => u.id === targetUserId);
    try {
      const res = await assignLeads({
        leadIds: Array.from(selectedLeadIds),
        assignToUserId: targetUserId,
        assignedByUserId: currentUser?.id || 'admin',
        departmentId: selectedDeptId !== 'all' ? selectedDeptId : undefined,
      });

      showToast(`${res.count} leads assigned successfully to ${targetUser?.full_name || 'Telecaller'}.`, 'success');
      setShowConfirmModal(false);
      setSelectedLeadIds(new Set());
      await loadLeads();
      onAssignmentDone();
    } catch (err: any) {
      showToast(`Assignment failed: ${err.message}`, 'error');
    } finally {
      setIsAssigning(false);
    }
  };

  const targetUserName = telecallers.find((u) => u.id === targetUserId)?.full_name || 'Selected User';

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="border-b border-slate-200 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Manual Lead Assignment Engine</h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Filter unassigned leads by department, pick leads individually or bulk, and allocate to telecallers.
          </p>
        </div>
      </div>

      {/* Top Filter and Allocation Controls */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Department Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              1. Filter Department:
            </label>
            <select
              value={selectedDeptId}
              onChange={(e) => setSelectedDeptId(e.target.value)}
              className="w-full text-xs sm:text-sm px-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          {/* Allocation Pool: Unassigned vs All */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              2. Leads Pool:
            </label>
            <div className="flex rounded-lg border border-slate-300 p-0.5 bg-slate-50">
              <button
                type="button"
                onClick={() => setFilterType('unassigned')}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition ${
                  filterType === 'unassigned'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Unassigned Only
              </button>
              <button
                type="button"
                onClick={() => setFilterType('all')}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition ${
                  filterType === 'all'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                All Leads (Reassign)
              </button>
            </div>
          </div>

          {/* Target Telecaller Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              3. Assign Selected to Telecaller:
            </label>
            <select
              value={targetUserId}
              onChange={(e) => setTargetUserId(e.target.value)}
              className="w-full text-xs sm:text-sm px-3 py-2 border border-emerald-300 rounded-lg bg-emerald-50/30 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-medium"
            >
              <option value="">-- Choose Telecaller --</option>
              {telecallers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.full_name} ({t.username})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Action Bar: Select count & Assign button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-3 border-t border-slate-100 gap-3">
          <div className="flex items-center space-x-3 text-xs text-slate-600">
            <button
              onClick={toggleSelectAll}
              className="inline-flex items-center space-x-1 font-semibold text-slate-700 hover:text-slate-900 px-2 py-1 rounded bg-slate-100"
            >
              {selectedLeadIds.size > 0 && selectedLeadIds.size === leads.length ? (
                <CheckSquare className="w-4 h-4 text-emerald-600" />
              ) : (
                <Square className="w-4 h-4 text-slate-400" />
              )}
              <span>
                {selectedLeadIds.size === leads.length ? 'Deselect All' : 'Select All Visible'}
              </span>
            </button>
            <span>
              Selected <span className="font-bold text-emerald-700">{selectedLeadIds.size}</span> of{' '}
              <span className="font-bold text-slate-900">{leads.length}</span> leads
            </span>
          </div>

          <button
            onClick={handleOpenConfirm}
            disabled={selectedLeadIds.size === 0 || !targetUserId}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-xs sm:text-sm font-bold rounded-lg shadow-sm transition flex items-center justify-center space-x-2"
          >
            <UserCheck className="w-4 h-4" />
            <span>
              Assign {selectedLeadIds.size > 0 ? `${selectedLeadIds.size} Leads` : 'Leads'}
            </span>
          </button>
        </div>
      </div>

      {/* Leads Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="p-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={leads.length > 0 && selectedLeadIds.size === leads.length}
                    onChange={toggleSelectAll}
                    className="rounded text-emerald-600 focus:ring-emerald-500"
                  />
                </th>
                <th className="px-3 py-3">Lead ID</th>
                <th className="px-3 py-3">Customer Name</th>
                <th className="px-3 py-3">Mobile</th>
                <th className="px-3 py-3">Department</th>
                <th className="px-3 py-3">Product</th>
                <th className="px-3 py-3">Amount</th>
                <th className="px-3 py-3">Current Assignment</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {leads.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-slate-400">
                    No leads found matching current filter criteria.
                  </td>
                </tr>
              ) : (
                leads.map((lead) => {
                  const isChecked = selectedLeadIds.has(lead.id);
                  return (
                    <tr
                      key={lead.id}
                      onClick={() => toggleSelectLead(lead.id)}
                      className={`cursor-pointer transition ${
                        isChecked ? 'bg-emerald-50/60' : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSelectLead(lead.id)}
                          className="rounded text-emerald-600 focus:ring-emerald-500"
                        />
                      </td>
                      <td className="px-3 py-3 font-mono font-bold text-slate-800 whitespace-nowrap">
                        {lead.lead_number}
                      </td>
                      <td className="px-3 py-3 font-medium text-slate-900 whitespace-nowrap">
                        {lead.customer_name}
                      </td>
                      <td className="px-3 py-3 font-mono text-slate-700 whitespace-nowrap">
                        {lead.mobile}
                      </td>
                      <td className="px-3 py-3 text-slate-600 whitespace-nowrap">
                        <span className="px-2 py-0.5 bg-slate-100 rounded text-[11px] font-medium text-slate-700">
                          {lead.department_name}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-slate-700 max-w-[180px] truncate" title={lead.product}>
                        {lead.product}
                      </td>
                      <td className="px-3 py-3 font-semibold text-slate-900 whitespace-nowrap">
                        ₹{lead.amount?.toLocaleString('en-IN') || 0}
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
                      <td className="px-3 py-3 text-slate-500 whitespace-nowrap text-[11px]">
                        {new Date(lead.created_at).toLocaleDateString('en-IN')}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
              <UserCheck className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h3 className="font-bold text-slate-900 text-lg">Confirm Lead Assignment</h3>
              <p className="text-xs text-slate-600 mt-2">
                Are you sure you want to assign{' '}
                <span className="font-bold text-emerald-700">{selectedLeadIds.size} leads</span> to{' '}
                <span className="font-bold text-slate-900">{targetUserName}</span>?
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                These leads will immediately appear in their workspace queue under Untouched Leads.
              </p>
            </div>

            <div className="flex space-x-3 pt-3">
              <button
                onClick={() => setShowConfirmModal(false)}
                disabled={isAssigning}
                className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmAssign}
                disabled={isAssigning}
                className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs transition"
              >
                {isAssigning ? 'Assigning...' : `Yes, Assign ${selectedLeadIds.size} Leads`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
