import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../common/Toast';
import {
  Lock,
  Mail,
  ArrowRight,
  Shield,
  PhoneCall,
  Database,
  Sparkles,
  KeyRound,
} from 'lucide-react';
import { SupabaseModal } from '../common/SupabaseModal';

export const LoginScreen: React.FC = () => {
  const { login, availableUsers } = useAuth();
  const { showToast } = useToast();

  const [emailOrUsername, setEmailOrUsername] = useState('admin@essentialsoul.com');
  const [password, setPassword] = useState('password123');
  const [isLoading, setIsLoading] = useState(false);
  const [showDbModal, setShowDbModal] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailOrUsername.trim()) {
      showToast('Please enter your email or username.', 'error');
      return;
    }

    setIsLoading(true);
    try {
      const success = await login(emailOrUsername, password);
      if (success) {
        showToast('Login successful! Welcome to Essential Soul CRM.', 'success');
      } else {
        showToast('Invalid credentials or inactive account.', 'error');
      }
    } catch (err: any) {
      showToast(`Login failed: ${err.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickDemoLogin = async (userEmail: string) => {
    setEmailOrUsername(userEmail);
    setPassword('password123');
    setIsLoading(true);
    const success = await login(userEmail, 'password123');
    setIsLoading(false);
    if (success) {
      showToast(`Logged in as ${userEmail}`, 'success');
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-0 -left-4 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4">
        {/* Brand Logo & Name */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-emerald-600 flex items-center justify-center text-white font-extrabold text-2xl shadow-xl shadow-emerald-900/40 mb-3 border border-emerald-400/30">
            ES
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight text-center">
            Essential Soul
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 font-medium mt-1">
            Lead Management & Telecalling CRM
          </p>
        </div>

        {/* Card */}
        <div className="bg-slate-800/90 backdrop-blur-md border border-slate-700/80 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Email or Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={emailOrUsername}
                  onChange={(e) => setEmailOrUsername(e.target.value)}
                  placeholder="admin@essentialsoul.com or rahul"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-white text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500 transition placeholder:text-slate-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-white text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500 transition placeholder:text-slate-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold rounded-xl shadow-lg transition flex items-center justify-center space-x-2 text-sm disabled:opacity-50"
            >
              <span>{isLoading ? 'Signing In...' : 'Sign In to CRM'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Demo Switcher */}
          <div className="border-t border-slate-700/60 pt-4 space-y-2.5">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-semibold uppercase tracking-wider text-[10px]">
                One-Click Role Access:
              </span>
              <button
                type="button"
                onClick={() => setShowDbModal(true)}
                className="text-emerald-400 hover:text-emerald-300 flex items-center space-x-1 font-medium"
              >
                <Database className="w-3 h-3" />
                <span>Supabase SQL</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleQuickDemoLogin('admin@essentialsoul.com')}
                className="p-2.5 bg-slate-900/90 hover:bg-slate-900 border border-amber-500/40 rounded-xl text-left transition flex items-center space-x-2.5 group"
              >
                <Shield className="w-4 h-4 text-amber-400 shrink-0" />
                <div className="truncate">
                  <div className="font-bold text-amber-300 group-hover:text-amber-200">Super Admin</div>
                  <div className="text-[10px] text-slate-400 truncate">Full CRM control</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemoLogin('rahul@essentialsoul.com')}
                className="p-2.5 bg-slate-900/90 hover:bg-slate-900 border border-emerald-500/40 rounded-xl text-left transition flex items-center space-x-2.5 group"
              >
                <PhoneCall className="w-4 h-4 text-emerald-400 shrink-0" />
                <div className="truncate">
                  <div className="font-bold text-emerald-300 group-hover:text-emerald-200">Rahul Sharma</div>
                  <div className="text-[10px] text-slate-400 truncate">Ayurveda Telecaller</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemoLogin('priya@essentialsoul.com')}
                className="p-2.5 bg-slate-900/90 hover:bg-slate-900 border border-teal-500/40 rounded-xl text-left transition flex items-center space-x-2.5 group"
              >
                <PhoneCall className="w-4 h-4 text-teal-400 shrink-0" />
                <div className="truncate">
                  <div className="font-bold text-teal-300 group-hover:text-teal-200">Priya Patel</div>
                  <div className="text-[10px] text-slate-400 truncate">Astrology Telecaller</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemoLogin('sneha@essentialsoul.com')}
                className="p-2.5 bg-slate-900/90 hover:bg-slate-900 border border-indigo-500/40 rounded-xl text-left transition flex items-center space-x-2.5 group"
              >
                <PhoneCall className="w-4 h-4 text-indigo-400 shrink-0" />
                <div className="truncate">
                  <div className="font-bold text-indigo-300 group-hover:text-indigo-200">Sneha Singh</div>
                  <div className="text-[10px] text-slate-400 truncate">Reorder Telecaller</div>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>

      <SupabaseModal isOpen={showDbModal} onClose={() => setShowDbModal(false)} />
    </div>
  );
};
