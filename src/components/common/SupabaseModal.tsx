import React, { useState } from 'react';
import { Database, Copy, Check, ExternalLink, X, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { SUPABASE_SQL_SCHEMA } from '../../lib/sqlSchema';
import {
  getStoredSupabaseConfig,
  saveSupabaseConfig,
  clearSupabaseConfig,
  testSupabaseConnection,
} from '../../lib/supabase';
import { useToast } from './Toast';

interface SupabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SupabaseModal: React.FC<SupabaseModalProps> = ({ isOpen, onClose }) => {
  const { showToast } = useToast();
  const currentConfig = getStoredSupabaseConfig();
  const [url, setUrl] = useState(currentConfig.url);
  const [anonKey, setAnonKey] = useState(currentConfig.anonKey);
  const [isCopied, setIsCopied] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  if (!isOpen) return null;

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA);
    setIsCopied(true);
    showToast('SQL Schema copied to clipboard!', 'success');
    setTimeout(() => setIsCopied(false), 3000);
  };

  const handleSave = async () => {
    saveSupabaseConfig(url, anonKey);
    setIsTesting(true);
    const res = await testSupabaseConnection();
    setIsTesting(false);
    setTestResult(res);
    if (res.success) {
      showToast('Connected to Supabase successfully!', 'success');
    } else {
      showToast(res.message, 'error');
    }
  };

  const handleClear = () => {
    clearSupabaseConfig();
    setUrl('');
    setAnonKey('');
    setTestResult(null);
    showToast('Supabase configuration cleared. Running on persistent local engine.', 'info');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <Database className="w-5 h-5 text-emerald-400" />
            <h3 className="font-semibold text-lg text-white">Supabase Database & SQL Configuration</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Status Box */}
          <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 flex items-start space-x-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold text-emerald-900">Application Storage is Active & Operational</p>
              <p className="text-emerald-700 mt-0.5">
                All leads, manual assignments, activities, follow-ups, and reports persist and update in real-time.
                You can link your own Supabase project below anytime.
              </p>
            </div>
          </div>

          {/* Quick SQL Copy Section */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-slate-800 text-sm">Supabase SQL Schema & RLS Rules</h4>
                <p className="text-xs text-slate-500">
                  Includes tables, indexes, RLS policies for Admin vs Telecaller, and default departments/statuses.
                </p>
              </div>
              <button
                onClick={handleCopySql}
                className="inline-flex items-center px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded-md shadow-xs transition"
              >
                {isCopied ? <Check className="w-3.5 h-3.5 mr-1" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
                {isCopied ? 'Copied!' : 'Copy SQL Schema'}
              </button>
            </div>
            <div className="text-xs bg-slate-900 text-slate-200 p-3 rounded font-mono overflow-x-auto max-h-32 border border-slate-700">
              <code>{SUPABASE_SQL_SCHEMA.substring(0, 320)}...</code>
            </div>
          </div>

          {/* Supabase Connection Form */}
          <div className="space-y-4">
            <h4 className="font-semibold text-slate-800 text-sm">Connect Your Supabase Project</h4>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Supabase Project URL
              </label>
              <input
                type="text"
                placeholder="https://xyzcompany.supabase.co"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Supabase Anon / Public Key
              </label>
              <input
                type="password"
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                value={anonKey}
                onChange={(e) => setAnonKey(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {testResult && (
              <div
                className={`p-3 rounded-lg text-xs font-medium ${
                  testResult.success
                    ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                    : 'bg-rose-100 text-rose-900 border border-rose-300'
                }`}
              >
                {testResult.message}
              </div>
            )}
          </div>
        </div>

        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            onClick={handleClear}
            className="text-xs text-rose-600 hover:text-rose-800 font-medium underline"
          >
            Reset Configuration
          </button>
          <div className="flex space-x-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 border border-slate-300 rounded-lg transition"
            >
              Close
            </button>
            <button
              onClick={handleSave}
              disabled={isTesting}
              className="px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition"
            >
              {isTesting ? 'Testing...' : 'Save & Verify'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
