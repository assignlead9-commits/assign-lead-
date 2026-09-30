import React, { useState, useEffect } from 'react';
import { Lead, LeadStatus, LeadActivity } from '../../types/crm';
import { updateLeadCallResponse, getLeadActivities } from '../../services/db';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../common/Toast';
import { StatusBadge } from '../common/Badge';
import {
  PhoneCall,
  Save,
  ArrowRight,
  Clock,
  Calendar,
  IndianRupee,
  ShoppingBag,
  History,
  Building2,
  MapPin,
  Tag,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  FileText,
} from 'lucide-react';

interface CallingScreenProps {
  lead: Lead;
  allLeadsQueue: Lead[];
  statuses: LeadStatus[];
  onBack: () => void;
  onLeadUpdated: () => void;
  onOpenNextLead: (nextLead: Lead) => void;
}

export const CallingScreen: React.FC<CallingScreenProps> = ({
  lead,
  allLeadsQueue,
  statuses,
  onBack,
  onLeadUpdated,
  onOpenNextLead,
}) => {
  const { currentUser } = useAuth();
  const { showToast } = useToast();

  const [selectedStatusId, setSelectedStatusId] = useState<string>(lead.status_id);
  const [remark, setRemark] = useState<string>('');
  const [followupDate, setFollowupDate] = useState<string>(lead.followup_date || '');
  const [followupTime, setFollowupTime] = useState<string>(lead.followup_time || '11:00');
  const [callbackDate, setCallbackDate] = useState<string>(lead.callback_date || '');
  const [callbackTime, setCallbackTime] = useState<string>(lead.callback_time || '15:00');

  // Status-based smart fields
  const [expectedBudget, setExpectedBudget] = useState<string>(lead.expected_budget ? String(lead.expected_budget) : '');
  const [orderAmount, setOrderAmount] = useState<string>(lead.order_amount ? String(lead.order_amount) : String(lead.amount || ''));
  const [orderProduct, setOrderProduct] = useState<string>(lead.order_product || lead.product || '');
  const [orderQuantity, setOrderQuantity] = useState<string>(lead.order_quantity ? String(lead.order_quantity) : '1');
  const [paymentStatus, setPaymentStatus] = useState<string>(lead.payment_status || 'Prepaid / UPI');

  const [activities, setActivities] = useState<LeadActivity[]>([]);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Load activities timeline for this lead
  const loadActivities = async () => {
    try {
      const history = await getLeadActivities(lead.id);
      setActivities(history);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    setSelectedStatusId(lead.status_id);
    setRemark('');
    setFollowupDate(lead.followup_date || '');
    setFollowupTime(lead.followup_time || '11:00');
    setCallbackDate(lead.callback_date || '');
    setCallbackTime(lead.callback_time || '15:00');
    loadActivities();
  }, [lead.id]);

  // Selected Status Object
  const currentStatusObj = statuses.find((s) => s.id === selectedStatusId);
  const statusNameLower = currentStatusObj?.name.toLowerCase() || '';

  const isFollowup = statusNameLower.includes('follow-up') || statusNameLower.includes('followup');
  const isCallback = statusNameLower.includes('call back') || statusNameLower.includes('callback');
  const isMoneyProblem = statusNameLower.includes('money problem');
  const isOrderPlaced = statusNameLower.includes('order placed') || statusNameLower.includes('converted');

  const handleSave = async (shouldOpenNext: boolean) => {
    if (!remark.trim()) {
      showToast('Please enter call remarks before saving.', 'error');
      return;
    }

    if (isFollowup && (!followupDate || !followupTime)) {
      showToast('Follow-up Date and Follow-up Time are required for Follow-up status.', 'error');
      return;
    }

    if (isCallback && (!callbackDate || !callbackTime)) {
      showToast('Callback Date and Callback Time are required for Call Back status.', 'error');
      return;
    }

    setIsSaving(true);
    try {
      const orderData = isOrderPlaced
        ? {
            amount: parseFloat(orderAmount) || lead.amount,
            product: orderProduct || lead.product,
            quantity: parseInt(orderQuantity) || 1,
            payment_status: paymentStatus,
          }
        : isMoneyProblem
        ? {
            expected_budget: parseFloat(expectedBudget) || undefined,
          }
        : undefined;

      await updateLeadCallResponse({
        leadId: lead.id,
        userId: currentUser?.id || 'telecaller',
        userName: currentUser?.full_name || 'Telecaller',
        newStatusId: selectedStatusId,
        remark: remark.trim(),
        followupDate: isFollowup || isMoneyProblem ? followupDate : null,
        followupTime: isFollowup ? followupTime : null,
        callbackDate: isCallback ? callbackDate : null,
        callbackTime: isCallback ? callbackTime : null,
        orderData,
      });

      showToast('Lead status updated successfully!', 'success');
      setRemark('');
      onLeadUpdated();

      if (shouldOpenNext) {
        // Find next untouched or pending lead
        const currentIndex = allLeadsQueue.findIndex((l) => l.id === lead.id);
        const nextLead = allLeadsQueue.find((l, idx) => idx > currentIndex && l.id !== lead.id);
        if (nextLead) {
          showToast(`Opening next lead: ${nextLead.customer_name}`, 'info');
          onOpenNextLead(nextLead);
        } else {
          showToast('You have reached the end of your current calling queue!', 'success');
          onBack();
        }
      } else {
        await loadActivities();
      }
    } catch (err: any) {
      showToast(`Save failed: ${err.message}`, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Breadcrumb & Call Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBack}
            className="p-1.5 rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-600 transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-mono font-bold text-slate-900 text-lg">{lead.lead_number}</span>
              <StatusBadge status={lead.status_name || 'Untouched'} />
            </div>
            <p className="text-xs text-slate-500">
              Assigned to you on {lead.assigned_at ? new Date(lead.assigned_at).toLocaleDateString('en-IN') : 'Recently'}
            </p>
          </div>
        </div>

        {/* CALL CUSTOMER PROMINENT BUTTON */}
        <a
          href={`tel:${lead.mobile}`}
          className="inline-flex items-center justify-center px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl font-extrabold text-sm shadow-md transition space-x-2"
        >
          <PhoneCall className="w-4 h-4" />
          <span>Call Customer ({lead.mobile})</span>
        </a>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Customer Information Card */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex items-center space-x-2 text-slate-800 font-bold border-b border-slate-100 pb-2">
              <Building2 className="w-4 h-4 text-emerald-600" />
              <h3 className="text-sm uppercase tracking-wide">Customer Information</h3>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 font-medium block">Customer Name</label>
                <div className="font-bold text-slate-900 text-sm mt-0.5">{lead.customer_name}</div>
              </div>

              <div>
                <label className="text-slate-400 font-medium block">Primary Mobile</label>
                <div className="font-mono font-bold text-slate-800 text-sm flex items-center justify-between">
                  <span>{lead.mobile}</span>
                  <a href={`tel:${lead.mobile}`} className="text-emerald-600 hover:underline text-[11px] font-semibold">
                    Dial &rarr;
                  </a>
                </div>
              </div>

              {lead.alternate_mobile && (
                <div>
                  <label className="text-slate-400 font-medium block">Alternate Mobile</label>
                  <div className="font-mono text-slate-700 text-xs flex items-center justify-between">
                    <span>{lead.alternate_mobile}</span>
                    <a href={`tel:${lead.alternate_mobile}`} className="text-emerald-600 hover:underline text-[11px]">
                      Dial &rarr;
                    </a>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 pt-1">
                <div>
                  <label className="text-slate-400 font-medium block">City</label>
                  <div className="font-medium text-slate-800">{lead.city || 'Unknown'}</div>
                </div>
                <div>
                  <label className="text-slate-400 font-medium block">State</label>
                  <div className="font-medium text-slate-800">{lead.state || 'India'}</div>
                </div>
              </div>

              <div className="pt-1">
                <label className="text-slate-400 font-medium block">Department</label>
                <div className="font-semibold text-emerald-800 bg-emerald-50 px-2 py-1 rounded inline-block mt-0.5">
                  {lead.department_name}
                </div>
              </div>

              <div className="pt-1">
                <label className="text-slate-400 font-medium block">Inquired Product / Service</label>
                <div className="font-medium text-slate-800 mt-0.5">{lead.product}</div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
                <div>
                  <label className="text-slate-400 font-medium block">Amount</label>
                  <div className="font-bold text-slate-900 text-sm">
                    ₹{lead.amount?.toLocaleString('en-IN') || 0}
                  </div>
                </div>
                <div>
                  <label className="text-slate-400 font-medium block">Source</label>
                  <div className="font-medium text-slate-700">{lead.source || 'Direct'}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Script Tips */}
          <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-4 text-xs text-emerald-900 space-y-1.5">
            <p className="font-bold flex items-center">
              <CheckCircle2 className="w-3.5 h-3.5 mr-1.5 text-emerald-700" />
              Telecalling Pro-Tip
            </p>
            <p className="text-[11px] text-emerald-800 leading-relaxed">
              Always address customer politely by name. Clarify health wellness / astrology concerns before offering the package.
            </p>
          </div>
        </div>

        {/* Center / Right Columns: Calling Response & Status Update */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex items-center space-x-2 text-slate-800 font-bold border-b border-slate-100 pb-2">
              <FileText className="w-4 h-4 text-emerald-600" />
              <h3 className="text-sm uppercase tracking-wide">Update Customer Call Response</h3>
            </div>

            <div className="space-y-4 text-xs">
              {/* Status Selector */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  1. Call Status / Disposition *
                </label>
                <select
                  value={selectedStatusId}
                  onChange={(e) => setSelectedStatusId(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-emerald-500 font-semibold text-slate-800"
                >
                  {statuses.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.name} ({st.category})
                    </option>
                  ))}
                </select>
              </div>

              {/* DYNAMIC SMART FIELDS: FOLLOW-UP */}
              {isFollowup && (
                <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-xl space-y-3 animate-in fade-in">
                  <div className="flex items-center space-x-1.5 font-bold text-amber-900">
                    <Calendar className="w-4 h-4 text-amber-700" />
                    <span>Schedule Follow-up Date & Time *</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Follow-up Date *</label>
                      <input
                        type="date"
                        required
                        value={followupDate}
                        onChange={(e) => setFollowupDate(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Follow-up Time *</label>
                      <input
                        type="time"
                        required
                        value={followupTime}
                        onChange={(e) => setFollowupTime(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* DYNAMIC SMART FIELDS: CALL BACK */}
              {isCallback && (
                <div className="p-3.5 bg-yellow-50/80 border border-yellow-200 rounded-xl space-y-3 animate-in fade-in">
                  <div className="flex items-center space-x-1.5 font-bold text-yellow-900">
                    <Clock className="w-4 h-4 text-yellow-700" />
                    <span>Customer Requested Call Back Time *</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Callback Date *</label>
                      <input
                        type="date"
                        required
                        value={callbackDate}
                        onChange={(e) => setCallbackDate(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-yellow-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Callback Time *</label>
                      <input
                        type="time"
                        required
                        value={callbackTime}
                        onChange={(e) => setCallbackTime(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-yellow-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* DYNAMIC SMART FIELDS: MONEY PROBLEM */}
              {isMoneyProblem && (
                <div className="p-3.5 bg-purple-50/80 border border-purple-200 rounded-xl space-y-3 animate-in fade-in">
                  <div className="flex items-center space-x-1.5 font-bold text-purple-900">
                    <IndianRupee className="w-4 h-4 text-purple-700" />
                    <span>Budget Constraint Details</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Customer Expected Budget (₹)</label>
                      <input
                        type="number"
                        placeholder="e.g. 1500"
                        value={expectedBudget}
                        onChange={(e) => setExpectedBudget(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Next Follow-up Date (Salary / Next Month)</label>
                      <input
                        type="date"
                        value={followupDate}
                        onChange={(e) => setFollowupDate(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* DYNAMIC SMART FIELDS: ORDER PLACED */}
              {isOrderPlaced && (
                <div className="p-3.5 bg-emerald-50/80 border border-emerald-200 rounded-xl space-y-3 animate-in fade-in">
                  <div className="flex items-center space-x-1.5 font-bold text-emerald-900">
                    <ShoppingBag className="w-4 h-4 text-emerald-700" />
                    <span>Order Placement Details</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Final Order Amount (₹) *</label>
                      <input
                        type="number"
                        value={orderAmount}
                        onChange={(e) => setOrderAmount(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white font-bold text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Product Ordered</label>
                      <input
                        type="text"
                        value={orderProduct}
                        onChange={(e) => setOrderProduct(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Quantity</label>
                      <input
                        type="number"
                        min="1"
                        value={orderQuantity}
                        onChange={(e) => setOrderQuantity(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Payment Status</label>
                      <select
                        value={paymentStatus}
                        onChange={(e) => setPaymentStatus(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                      >
                        <option value="Prepaid / UPI">Prepaid / UPI</option>
                        <option value="Cash on Delivery (COD)">Cash on Delivery (COD)</option>
                        <option value="Partial Advance">Partial Advance</option>
                        <option value="Payment Pending">Payment Pending</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Calling Remark Textarea */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  2. Call Remarks & Discussion Notes *
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Summarize customer response, objections, dosage questions, delivery preference..."
                  value={remark}
                  onChange={(e) => setRemark(e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => handleSave(false)}
                  disabled={isSaving}
                  className="w-full sm:w-auto px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold transition flex items-center justify-center space-x-2"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Update</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSave(true)}
                  disabled={isSaving}
                  className="w-full sm:w-auto px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-md transition flex items-center justify-center space-x-2"
                >
                  <span>Save & Next Lead</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Activity History Timeline (Never overwrite old remarks) */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex items-center space-x-2 text-slate-800 font-bold border-b border-slate-100 pb-2">
              <History className="w-4 h-4 text-emerald-600" />
              <h3 className="text-sm uppercase tracking-wide">Activity Timeline & Historical Remarks</h3>
            </div>

            {activities.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-3">
                No calling activity recorded yet. This lead is currently Untouched.
              </p>
            ) : (
              <div className="space-y-4">
                {activities.map((act) => (
                  <div
                    key={act.id}
                    className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <StatusBadge status={act.new_status_name || 'Contacted'} />
                        <span className="font-bold text-slate-800">{act.user_name || 'Telecaller'}</span>
                      </div>
                      <span className="text-[11px] text-slate-400">
                        {new Date(act.created_at).toLocaleString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>

                    <p className="text-slate-700 text-xs mt-1 bg-white p-2.5 rounded border border-slate-100">
                      {act.remark}
                    </p>

                    {act.order_data && (
                      <div className="text-[11px] text-emerald-800 bg-emerald-50/70 p-2 rounded border border-emerald-200">
                        {act.order_data.amount && <span>Amount: ₹{act.order_data.amount} | </span>}
                        {act.order_data.product && <span>Product: {act.order_data.product} | </span>}
                        {act.order_data.payment_status && <span>Payment: {act.order_data.payment_status}</span>}
                        {act.order_data.budget && <span>Budget: ₹{act.order_data.budget}</span>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
