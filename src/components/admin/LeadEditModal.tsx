import React, { useState } from 'react';
import { Lead, Department, LeadStatus, UserProfile } from '../../types/crm';
import { updateLead } from '../../services/db';
import { useToast } from '../common/Toast';
import { X, Edit2, Layers } from 'lucide-react';

interface LeadEditModalProps {
  lead: Lead | null;
  departments: Department[];
  statuses: LeadStatus[];
  users: UserProfile[];
  isOpen: boolean;
  onClose: () => void;
  onUpdated: () => void;
}

export const LeadEditModal: React.FC<LeadEditModalProps> = ({
  lead,
  departments,
  statuses,
  users,
  isOpen,
  onClose,
  onUpdated,
}) => {
  const { showToast } = useToast();
  if (!isOpen || !lead) return null;

  const [customerName, setCustomerName] = useState(lead.customer_name);
  const [mobile, setMobile] = useState(lead.mobile);
  const [alternateMobile, setAlternateMobile] = useState(lead.alternate_mobile || '');
  const [city, setCity] = useState(lead.city);
  const [state, setState] = useState(lead.state);
  const [product, setProduct] = useState(lead.product);
  const [amount, setAmount] = useState(String(lead.amount || '0'));
  const [departmentId, setDepartmentId] = useState(lead.department_id);
  const [statusId, setStatusId] = useState(lead.status_id);
  const [assignedTo, setAssignedTo] = useState(lead.assigned_to || '');
  const [source, setSource] = useState(lead.source);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateLead(lead.id, {
        customer_name: customerName,
        mobile,
        alternate_mobile: alternateMobile || undefined,
        city,
        state,
        product,
        amount: parseFloat(amount) || 0,
        department_id: departmentId,
        status_id: statusId,
        assigned_to: assignedTo || null,
        source,
      });

      showToast('Lead updated successfully.', 'success');
      onUpdated();
      onClose();
    } catch (err: any) {
      showToast(`Error: ${err.message}`, 'error');
    }
  };

  const telecallers = users.filter((u) => u.role === 'TELECALLER');

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-xl w-full p-6 space-y-4 border border-slate-200 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2">
            <Edit2 className="w-5 h-5 text-emerald-600" />
            <h3 className="font-bold text-slate-900 text-base">
              Edit Lead Details: {lead.lead_number}
            </h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Customer Name *</label>
              <input
                type="text"
                required
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Primary Mobile *</label>
              <input
                type="tel"
                required
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Alternate Mobile</label>
              <input
                type="tel"
                value={alternateMobile}
                onChange={(e) => setAlternateMobile(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-mono"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">City</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">State</label>
              <input
                type="text"
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Product / Service</label>
              <input
                type="text"
                value={product}
                onChange={(e) => setProduct(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Amount (₹)</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Department</label>
              <select
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
              >
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Status</label>
              <select
                value={statusId}
                onChange={(e) => setStatusId(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
              >
                {statuses.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Assigned Telecaller</label>
              <select
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
              >
                <option value="">-- Unassigned --</option>
                {telecallers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.full_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 rounded-lg font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold shadow-xs transition"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
