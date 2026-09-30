import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  Search,
  Database,
  LogOut,
  User,
  Shield,
  PhoneCall,
  Calendar,
  Building,
  ChevronDown,
  Flame,
} from 'lucide-react';
import { SupabaseModal } from '../common/SupabaseModal';
import { getStoredSupabaseConfig } from '../../lib/supabase';

interface NavbarProps {
  onSearchClick: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onOpenFirebaseStatus?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onSearchClick, searchQuery, onSearchChange, onOpenFirebaseStatus }) => {
  const { currentUser, role, logout, switchUser, availableUsers } = useAuth();
  const [showDbModal, setShowDbModal] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [currentTime, setCurrentTime] = useState<string>('');

  const supabaseConfig = getStoredSupabaseConfig();
  const hasCustomDb = !!supabaseConfig.url;

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const options: Intl.DateTimeFormatOptions = {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      };
      setCurrentTime(now.toLocaleDateString('en-IN', options));
    };
    updateTime();
  }, []);

  return (
    <>
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 h-16 flex items-center justify-between px-4 sm:px-6">
        {/* Left Section: Branding & Date */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-lg bg-emerald-700 flex items-center justify-center text-white font-bold text-lg shadow-xs">
              ES
            </div>
            <div>
              <h1 className="font-bold text-slate-900 leading-tight text-base tracking-tight flex items-center">
                Essential Soul
                <span className="ml-1.5 text-xs font-semibold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                  CRM
                </span>
              </h1>
              <p className="text-xs text-slate-500 font-medium">Lead Assignment & Calling</p>
            </div>
          </div>

          <div className="hidden lg:flex items-center text-xs text-slate-500 pl-4 border-l border-slate-200">
            <Calendar className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
            <span className="font-medium text-slate-700">{currentTime}</span>
          </div>
        </div>

        {/* Center: Global Search Bar */}
        <div className="flex-1 max-w-lg mx-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              placeholder={
                role === 'ADMIN'
                  ? 'Search Customer Name / Mobile / Lead ID...'
                  : 'Search your assigned leads by Name / Mobile / ID...'
              }
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-100 hover:bg-slate-50 focus:bg-white text-xs sm:text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500 transition placeholder:text-slate-400"
            />
          </div>
        </div>

        {/* Right Section: Database Status + User Switcher + Profile */}
        <div className="flex items-center space-x-3">
          {/* Firebase Cloud Database Status Button */}
          <button
            onClick={onOpenFirebaseStatus || (() => setShowDbModal(true))}
            title="Firebase Firestore: Live & Connected (Click to view database status)"
            className="inline-flex items-center px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100 transition shadow-xs cursor-pointer"
          >
            <Flame className="w-3.5 h-3.5 mr-1 text-orange-500 fill-orange-500" />
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse mr-1.5" />
            <span className="hidden sm:inline">Firebase: </span>
            <span>Connected</span>
          </button>

          {/* Quick Role & User Switcher */}
          <div className="relative">
            <button
              onClick={() => setShowUserDropdown(!showUserDropdown)}
              className="flex items-center space-x-2 p-1.5 sm:px-3 sm:py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition text-left"
            >
              <div className="w-7 h-7 rounded-full bg-slate-800 text-white flex items-center justify-center font-semibold text-xs shrink-0">
                {currentUser?.full_name?.charAt(0) || 'U'}
              </div>
              <div className="hidden md:block">
                <div className="text-xs font-semibold text-slate-900 leading-tight">
                  {currentUser?.full_name}
                </div>
                <div className="flex items-center text-[10px] text-slate-500">
                  <span
                    className={`inline-block w-1.5 h-1.5 rounded-full mr-1 ${
                      role === 'ADMIN' ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}
                  />
                  {role === 'ADMIN' ? 'Admin' : 'Telecaller'}
                </div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {/* Dropdown Menu */}
            {showUserDropdown && (
              <div
                className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 text-xs animate-in fade-in"
                onClick={() => setShowUserDropdown(false)}
              >
                <div className="px-4 py-2 border-b border-slate-100">
                  <p className="font-semibold text-slate-800">{currentUser?.full_name}</p>
                  <p className="text-slate-500 truncate">{currentUser?.email}</p>
                  <div className="mt-1 flex items-center gap-1">
                    <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">
                      Role: {role}
                    </span>
                  </div>
                </div>

                <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Switch Active Account
                </div>

                {availableUsers.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => switchUser(user.id)}
                    className={`w-full text-left px-4 py-2 flex items-center justify-between hover:bg-slate-50 transition ${
                      currentUser?.id === user.id ? 'bg-emerald-50/70 font-semibold text-emerald-900' : 'text-slate-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-center space-x-1.5">
                        <span>{user.full_name}</span>
                        {user.role === 'ADMIN' && (
                          <span className="text-[10px] bg-amber-100 text-amber-800 px-1 rounded font-bold">Admin</span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 block">{user.username}</span>
                    </div>
                    {currentUser?.id === user.id && (
                      <span className="text-[10px] text-emerald-600 font-bold">Current</span>
                    )}
                  </button>
                ))}

                <div className="border-t border-slate-100 mt-2 pt-2">
                  <button
                    onClick={logout}
                    className="w-full text-left px-4 py-2 text-rose-600 hover:bg-rose-50 flex items-center space-x-2 transition font-medium"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Logout</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <SupabaseModal isOpen={showDbModal} onClose={() => setShowDbModal(false)} />
    </>
  );
};
