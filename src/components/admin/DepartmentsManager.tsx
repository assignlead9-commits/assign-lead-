import React, { useState } from 'react';
import { Department } from '../../types/crm';
import { createDepartment, updateDepartment, toggleDepartmentStatus } from '../../services/db';
import { useToast } from '../common/Toast';
import { Building2, Plus, Edit2, CheckCircle2, XCircle, Search, X } from 'lucide-react';

interface DepartmentsManagerProps {
  departments: Department[];
  onRefresh: () => void;
}

export const DepartmentsManager: React.FC<DepartmentsManagerProps> = ({
  departments,
  onRefresh,
}) => {
  const { showToast } = useToast();
  const [search, setSearch] = useState<string>('');
  const [showModal, setShowModal] = useState<boolean>(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });

  const filtered = departments.filter(
    (d) =>
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.description.toLowerCase().includes(search.toLowerCase())
  );

  const handleOpenAdd = () => {
    setEditingDept(null);
    setFormData({ name: '', description: '' });
    setShowModal(true);
  };

  const handleOpenEdit = (dept: Department) => {
    setEditingDept(dept);
    setFormData({ name: dept.name, description: dept.description });
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showToast('Department name is required.', 'error');
      return;
    }

    try {
      if (editingDept) {
        await updateDepartment(editingDept.id, formData);
        showToast('Department updated successfully.', 'success');
      } else {
        await createDepartment(formData);
        showToast('Department created successfully.', 'success');
      }
      setShowModal(false);
      onRefresh();
    } catch (err: any) {
      showToast(`Error: ${err.message}`, 'error');
    }
  };

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    try {
      await toggleDepartmentStatus(id);
      showToast(`Department ${currentActive ? 'deactivated' : 'activated'}.`, 'success');
      onRefresh();
    } catch (err: any) {
      showToast(`Failed: ${err.message}`, 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-slate-200 gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Department Master</h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Define organizational departments (Ayurveda Sales, Astrology, Home Decor, Reorder, etc.)
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs transition flex items-center space-x-1.5 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Department</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="max-w-md">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search department name or description..."
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
                <th className="px-4 py-3">Department ID</th>
                <th className="px-4 py-3">Department Name</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-3 py-3 text-center">Status</th>
                <th className="px-4 py-3">Created Date</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((dept) => (
                <tr key={dept.id} className="hover:bg-slate-50 transition">
                  <td className="px-4 py-3 font-mono font-medium text-slate-500 whitespace-nowrap">
                    {dept.id}
                  </td>
                  <td className="px-4 py-3 font-bold text-slate-900 whitespace-nowrap">
                    {dept.name}
                  </td>
                  <td className="px-4 py-3 text-slate-600 max-w-sm">
                    {dept.description || '-'}
                  </td>
                  <td className="px-3 py-3 text-center whitespace-nowrap">
                    <button
                      onClick={() => handleToggleActive(dept.id, dept.active)}
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold transition ${
                        dept.active
                          ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                          : 'bg-rose-100 text-rose-800 hover:bg-rose-200'
                      }`}
                    >
                      {dept.active ? (
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
                    {new Date(dept.created_at).toLocaleDateString('en-IN')}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button
                      onClick={() => handleOpenEdit(dept)}
                      className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded transition"
                      title="Edit Department"
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

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <Building2 className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-slate-900 text-base">
                  {editingDept ? 'Edit Department' : 'Create New Department'}
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
                <label className="block font-bold text-slate-700 mb-1">Department Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ayurveda Sales, Astrology..."
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={3}
                  placeholder="Brief description of product lines, campaign scope or target clientele..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
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
                  {editingDept ? 'Update Department' : 'Create Department'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
