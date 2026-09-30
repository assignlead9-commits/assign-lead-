import React, { useState } from 'react';
import { LeadStatus } from '../../types/crm';
import { createLeadStatus, updateLeadStatus } from '../../services/db';
import { useToast } from '../common/Toast';
import { StatusBadge } from '../common/Badge';
import {
  ListFilter,
  Plus,
  Edit2,
  CheckCircle2,
  XCircle,
  ArrowUpDown,
  X,
  Search,
} from 'lucide-react';

interface StatusMasterProps {
  statuses: LeadStatus[];
  onRefresh: () => void;
}

export const StatusMaster: React.FC<StatusMasterProps> = ({ statuses, onRefresh }) => {
  const { showToast } = useToast();
  const [search, setSearch] = useState<string>('');
  const [showModal, setShowModal] = useState<boolean>(false);
  const [editingStatus, setEditingStatus] = useState<LeadStatus | null>(null);

  const [formData, setFormData] = useState<{
    name: string;
    category: LeadStatus['category'];
    display_order: number;
  }>({
    name: '',
    category: 'In Progress',
    display_order: statuses.length + 1,
  });

  const filtered = statuses.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.category.toLowerCase().includes(search.toLowerCase())
  );

  const handleOpenAdd = () => {
    setEditingStatus(null);
    setFormData({
      name: '',
      category: 'In Progress',
      display_order: statuses.length + 1,
    });
    setShowModal(true);
  };

  const handleOpenEdit = (st: LeadStatus) => {
    setEditingStatus(st);
    setFormData({
      name: st.name,
      category: st.category,
      display_order: st.display_order,
    });
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showToast('Status name is required.', 'error');
      return;
    }

    try {
      if (editingStatus) {
        await updateLeadStatus(editingStatus.id, formData);
        showToast('Lead status updated successfully.', 'success');
      } else {
        await createLeadStatus(formData);
        showToast('New lead status created successfully.', 'success');
      }
      setShowModal(false);
      onRefresh();
    } catch (err: any) {
      showToast(`Error: ${err.message}`, 'error');
    }
  };

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    try {
      await updateLeadStatus(id, { active: !currentActive });
      showToast(`Status ${currentActive ? 'deactivated' : 'activated'}.`, 'success');
      onRefresh();
    } catch (err: any) {
      showToast(`Error: ${err.message}`, 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-slate-200 gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Lead Status Master</h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Configure dynamic disposition statuses, lifecycle categories, and telecaller response options
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs transition flex items-center space-x-1.5 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Status</span>
        </button>
      </div>

      {/* Search */}
      <div className="max-w-md">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search status name or category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-3 py-3 w-16 text-center">Order</th>
                <th className="px-4 py-3">Status Name & Badge</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Status ID</th>
                <th className="px-3 py-3 text-center">Active</th>
                <th className="px-4 py-3">Created Date</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((st) => (
                <tr key={st.id} className="hover:bg-slate-50 transition">
                  <td className="px-3 py-3 text-center font-bold text-slate-700 whitespace-nowrap">
                    #{st.display_order}
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-900 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <StatusBadge status={st.name} />
                      <span className="text-slate-800 font-medium">{st.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                        st.category === 'Converted'
                          ? 'bg-emerald-100 text-emerald-800'
                          : st.category === 'Lost'
                          ? 'bg-rose-100 text-rose-800'
                          : st.category === 'Follow-up'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {st.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-slate-500 whitespace-nowrap">
                    {st.id}
                  </td>
                  <td className="px-3 py-3 text-center whitespace-nowrap">
                    <button
                      onClick={() => handleToggleActive(st.id, st.active)}
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold transition ${
                        st.active
                          ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                          : 'bg-rose-100 text-rose-800 hover:bg-rose-200'
                      }`}
                    >
                      {st.active ? (
                        <>
                          <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" />
                          Active
                        </>
                      ) : (
                        <>
                          <XCircle className="w-3 h-3 mr-1 text-rose-600" />
                          Inactive
                        </>
                      )}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-slate-500 whitespace-nowrap text-[11px]">
                    {new Date(st.created_at).toLocaleDateString('en-IN')}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button
                      onClick={() => handleOpenEdit(st)}
                      className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded transition"
                      title="Edit Status"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Status Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <ListFilter className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-slate-900 text-base">
                  {editingStatus ? 'Edit Lead Status' : 'Create New Lead Status'}
                </h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Status Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Price Negotiation, Whatsapp Sent..."
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Status Category *</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                >
                  <option value="New">New</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Follow-up">Follow-up</option>
                  <option value="Converted">Converted</option>
                  <option value="Lost">Lost</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Display Order</label>
                <input
                  type="number"
                  min="1"
                  value={formData.display_order}
                  onChange={(e) => setFormData({ ...formData, display_order: Number(e.target.value) })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold shadow-xs transition"
                >
                  {editingStatus ? 'Update Status' : 'Create Status'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
