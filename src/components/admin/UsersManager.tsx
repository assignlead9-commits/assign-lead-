import React, { useState } from 'react';
import { UserProfile, Department, UserRole } from '../../types/crm';
import { createProfile, updateProfile, toggleUserStatus } from '../../services/db';
import { useToast } from '../common/Toast';
import {
  Users,
  Plus,
  Edit2,
  KeyRound,
  CheckCircle2,
  XCircle,
  Search,
  X,
  Shield,
  PhoneCall,
  Lock,
} from 'lucide-react';

interface UsersManagerProps {
  users: UserProfile[];
  departments: Department[];
  onRefresh: () => void;
}

export const UsersManager: React.FC<UsersManagerProps> = ({
  users,
  departments,
  onRefresh,
}) => {
  const { showToast } = useToast();
  const [search, setSearch] = useState<string>('');
  const [showModal, setShowModal] = useState<boolean>(false);
  const [showPasswordModal, setShowPasswordModal] = useState<boolean>(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);

  const [formData, setFormData] = useState<{
    full_name: string;
    email: string;
    mobile: string;
    username: string;
    role: UserRole;
    department_ids: string[];
  }>({
    full_name: '',
    email: '',
    mobile: '',
    username: '',
    role: 'TELECALLER',
    department_ids: [],
  });

  const [newPassword, setNewPassword] = useState<string>('');

  const filteredUsers = users.filter(
    (u) =>
      u.full_name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.username.toLowerCase().includes(search.toLowerCase()) ||
      u.mobile.includes(search)
  );

  const handleOpenAdd = () => {
    setSelectedUser(null);
    setFormData({
      full_name: '',
      email: '',
      mobile: '',
      username: '',
      role: 'TELECALLER',
      department_ids: [departments[0]?.id || ''],
    });
    setShowModal(true);
  };

  const handleOpenEdit = (user: UserProfile) => {
    setSelectedUser(user);
    setFormData({
      full_name: user.full_name,
      email: user.email,
      mobile: user.mobile,
      username: user.username,
      role: user.role,
      department_ids: user.department_ids || [],
    });
    setShowModal(true);
  };

  const handleOpenPasswordReset = (user: UserProfile) => {
    setSelectedUser(user);
    setNewPassword('');
    setShowPasswordModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.full_name || !formData.email || !formData.username) {
      showToast('Name, Email and Username are required.', 'error');
      return;
    }

    try {
      if (selectedUser) {
        await updateProfile(selectedUser.id, formData);
        showToast('User profile updated successfully.', 'success');
      } else {
        await createProfile(formData);
        showToast('New user account created successfully.', 'success');
      }
      setShowModal(false);
      onRefresh();
    } catch (err: any) {
      showToast(`Error: ${err.message}`, 'error');
    }
  };

  const handleResetPasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      showToast('Password must be at least 6 characters long.', 'error');
      return;
    }
    showToast(`Password for ${selectedUser?.full_name} has been reset successfully.`, 'success');
    setShowPasswordModal(false);
  };

  const handleToggleStatus = async (id: string, currentActive: boolean) => {
    try {
      await toggleUserStatus(id);
      showToast(`User ${currentActive ? 'deactivated' : 'activated'}.`, 'success');
      onRefresh();
    } catch (err: any) {
      showToast(`Error: ${err.message}`, 'error');
    }
  };

  const toggleDept = (deptId: string) => {
    setFormData((prev) => {
      const exists = prev.department_ids.includes(deptId);
      if (exists) {
        return { ...prev, department_ids: prev.department_ids.filter((id) => id !== deptId) };
      } else {
        return { ...prev, department_ids: [...prev.department_ids, deptId] };
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-slate-200 gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900">User Master & Telecallers</h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Manage admin and telecaller staff profiles, department permissions, and active status
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs transition flex items-center space-x-1.5 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add New User</span>
        </button>
      </div>

      {/* Search */}
      <div className="max-w-md">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, email, username or mobile..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
          />
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Full Name</th>
                <th className="px-4 py-3">Username</th>
                <th className="px-4 py-3">Email & Mobile</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Assigned Department(s)</th>
                <th className="px-3 py-3 text-center">Status</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.map((user) => {
                const userDeptNames = (user.department_ids || [])
                  .map((id) => departments.find((d) => d.id === id)?.name)
                  .filter(Boolean);

                return (
                  <tr key={user.id} className="hover:bg-slate-50 transition">
                    <td className="px-4 py-3 font-bold text-slate-900 whitespace-nowrap">
                      {user.full_name}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-600 whitespace-nowrap">
                      @{user.username}
                    </td>
                    <td className="px-4 py-3 text-slate-700 whitespace-nowrap">
                      <div>{user.email}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{user.mobile}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {user.role === 'ADMIN' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                          <Shield className="w-3 h-3 mr-1 text-amber-700" />
                          ADMIN
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 text-emerald-900 border border-emerald-300">
                          <PhoneCall className="w-3 h-3 mr-1 text-emerald-700" />
                          TELECALLER
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {userDeptNames.length > 0 ? (
                          userDeptNames.map((name) => (
                            <span
                              key={name}
                              className="px-2 py-0.5 rounded text-[10px] bg-slate-100 text-slate-700 font-medium"
                            >
                              {name}
                            </span>
                          ))
                        ) : (
                          <span className="text-slate-400 italic">None assigned</span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-center whitespace-nowrap">
                      <button
                        onClick={() => handleToggleStatus(user.id, user.active)}
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold transition ${
                          user.active
                            ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                            : 'bg-rose-100 text-rose-800 hover:bg-rose-200'
                        }`}
                      >
                        {user.active ? (
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
                      {new Date(user.created_at).toLocaleDateString('en-IN')}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end space-x-1">
                        <button
                          onClick={() => handleOpenPasswordReset(user)}
                          className="p-1.5 text-slate-600 hover:text-amber-700 hover:bg-amber-50 rounded transition"
                          title="Reset User Password"
                        >
                          <KeyRound className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(user)}
                          className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded transition"
                          title="Edit User Profile"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit User Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 space-y-4 border border-slate-200 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <Users className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-slate-900 text-base">
                  {selectedUser ? 'Edit User Profile' : 'Create New User Account'}
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rahul Sharma"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Username *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. rahul.telecaller"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    placeholder="rahul@essentialsoul.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Mobile Number</label>
                  <input
                    type="tel"
                    placeholder="9820011223"
                    value={formData.mobile}
                    onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">System Role</label>
                <div className="flex gap-4">
                  <label className="flex items-center space-x-2 text-sm cursor-pointer">
                    <input
                      type="radio"
                      name="role"
                      value="TELECALLER"
                      checked={formData.role === 'TELECALLER'}
                      onChange={() => setFormData({ ...formData, role: 'TELECALLER' })}
                      className="text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>Telecaller / Sales Agent</span>
                  </label>
                  <label className="flex items-center space-x-2 text-sm cursor-pointer">
                    <input
                      type="radio"
                      name="role"
                      value="ADMIN"
                      checked={formData.role === 'ADMIN'}
                      onChange={() => setFormData({ ...formData, role: 'ADMIN' })}
                      className="text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>Admin (Full Access)</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Assign Department(s)
                </label>
                <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 border border-slate-200 rounded-lg max-h-36 overflow-y-auto">
                  {departments.map((dept) => (
                    <label key={dept.id} className="flex items-center space-x-2 text-xs cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.department_ids.includes(dept.id)}
                        onChange={() => toggleDept(dept.id)}
                        className="rounded text-emerald-600 focus:ring-emerald-500"
                      />
                      <span className="truncate">{dept.name}</span>
                    </label>
                  ))}
                </div>
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
                  {selectedUser ? 'Save Changes' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Password Reset Modal */}
      {showPasswordModal && selectedUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6 space-y-4 border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center space-x-2 text-amber-700">
              <Lock className="w-5 h-5" />
              <h3 className="font-bold text-slate-900 text-base">Reset Password</h3>
            </div>
            <p className="text-xs text-slate-600">
              Set a new secure password for <span className="font-bold">{selectedUser.full_name}</span> ({selectedUser.email}).
            </p>

            <form onSubmit={handleResetPasswordSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">New Password *</label>
                <input
                  type="password"
                  required
                  placeholder="Minimum 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold shadow-xs transition"
                >
                  Update Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
