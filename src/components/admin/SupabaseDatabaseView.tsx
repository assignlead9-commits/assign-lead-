import React, { useState, useEffect } from 'react';
import {
  Database,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  Server,
  Layers,
  Users,
  Building2,
  CalendarClock,
  PhoneCall,
  Key,
  Globe,
  UploadCloud,
  CheckCheck,
} from 'lucide-react';
import {
  getStoredSupabaseConfig,
  saveSupabaseConfig,
  clearSupabaseConfig,
  testSupabaseConnection,
  getSupabase,
} from '../../lib/supabase';
import { SUPABASE_SQL_SCHEMA } from '../../lib/sqlSchema';
import { useToast } from '../common/Toast';
import { seedSupabaseDatabase } from '../../services/db';

interface TableStat {
  name: string;
  tableName: string;
  count: number | null;
  description: string;
  icon: any;
  color: string;
}

export const SupabaseDatabaseView: React.FC = () => {
  const { showToast } = useToast();
  const config = getStoredSupabaseConfig();

  const [url, setUrl] = useState<string>(config.url || '');
  const [anonKey, setAnonKey] = useState<string>(config.anonKey || '');
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [isSeeding, setIsSeeding] = useState<boolean>(false);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [connectionMsg, setConnectionMsg] = useState<string>('');
  const [copiedSchema, setCopiedSchema] = useState<boolean>(false);
  const [latency, setLatency] = useState<number | null>(null);

  const [tables, setTables] = useState<TableStat[]>([
    { name: 'Customer Leads', tableName: 'leads', count: null, description: 'All customer leads, disposition & follow-up dates', icon: Layers, color: 'text-emerald-700 bg-emerald-50' },
    { name: 'Departments', tableName: 'departments', count: null, description: 'Ayurveda, Astrology, Home Decor, Reorder', icon: Building2, color: 'text-blue-700 bg-blue-50' },
    { name: 'Lead Statuses', tableName: 'lead_statuses', count: null, description: 'Lifecycle categories & disposition master', icon: PhoneCall, color: 'text-indigo-700 bg-indigo-50' },
    { name: 'User Profiles', tableName: 'profiles', count: null, description: 'Admins & telecallers accounts', icon: Users, color: 'text-amber-700 bg-amber-50' },
    { name: 'Call Activities', tableName: 'lead_activities', count: null, description: 'Telecaller remarks & call timeline history', icon: PhoneCall, color: 'text-purple-700 bg-purple-50' },
    { name: 'Follow-ups', tableName: 'followups', count: null, description: 'Scheduled follow-ups and callbacks', icon: CalendarClock, color: 'text-rose-700 bg-rose-50' },
    { name: 'Lead Assignments', tableName: 'lead_assignments', count: null, description: 'Audit trail of lead allocation history', icon: ShieldCheck, color: 'text-slate-700 bg-slate-100' },
  ]);

  const loadTableCounts = async () => {
    const supabase = getSupabase();
    if (!supabase) return;

    try {
      const counts = await Promise.all(
        tables.map(async (t) => {
          try {
            const { count, error } = await supabase.from(t.tableName).select('*', { count: 'exact', head: true });
            if (error) return null;
            return count ?? 0;
          } catch {
            return null;
          }
        })
      );

      setTables((prev) =>
        prev.map((item, idx) => ({
          ...item,
          count: counts[idx],
        }))
      );
    } catch (e) {
      console.warn('Error loading Supabase table counts:', e);
    }
  };

  const checkConnection = async () => {
    setIsTesting(true);
    const start = performance.now();
    const result = await testSupabaseConnection();
    const end = performance.now();
    setIsTesting(false);

    setIsConnected(result.success);
    setConnectionMsg(result.message);
    if (result.success) {
      setLatency(Math.round(end - start));
      showToast('Connected to Supabase PostgreSQL database!', 'success');
      await loadTableCounts();
    } else {
      setLatency(null);
    }
  };

  useEffect(() => {
    checkConnection();
  }, []);

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim() || !anonKey.trim()) {
      showToast('Please provide both Project URL and Anon API Key.', 'error');
      return;
    }
    saveSupabaseConfig(url, anonKey);
    showToast('Supabase configuration saved! Testing connection...', 'info');
    await checkConnection();
  };

  const handleResetConfig = () => {
    clearSupabaseConfig();
    setUrl('');
    setAnonKey('');
    setIsConnected(false);
    setConnectionMsg('Disconnected from custom Supabase instance.');
    showToast('Reset Supabase configuration.', 'info');
  };

  const handleCopySchema = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA);
    setCopiedSchema(true);
    showToast('Complete PostgreSQL SQL Schema copied to clipboard!', 'success');
    setTimeout(() => setCopiedSchema(false), 3000);
  };

  const handleSeedDatabase = async () => {
    setIsSeeding(true);
    try {
      const result = await seedSupabaseDatabase();
      if (result.success) {
        showToast(result.message, 'success');
        await loadTableCounts();
      } else {
        showToast(result.message, 'error');
      }
    } catch (err: any) {
      showToast(`Database seeding failed: ${err.message}`, 'error');
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200 gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              Supabase PostgreSQL Database
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                  isConnected
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                    : 'bg-amber-100 text-amber-800 border-amber-300'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full mr-1.5 ${
                    isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                  }`}
                />
                {isConnected ? 'Live Connected' : 'Configuration Pending'}
              </span>
            </h2>
            <p className="text-xs text-slate-500">
              Primary cloud relational database with Row-Level Security (RLS) & PostgreSQL
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={checkConnection}
            disabled={isTesting}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg shadow-xs transition flex items-center space-x-1.5 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
            <span>{isTesting ? 'Testing...' : 'Test Connection'}</span>
          </button>

          <button
            onClick={handleCopySchema}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg shadow-xs transition flex items-center space-x-1.5 cursor-pointer"
          >
            {copiedSchema ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedSchema ? 'Schema Copied!' : 'Copy SQL Schema'}</span>
          </button>
        </div>
      </div>

      {/* Main Connection Status Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white rounded-2xl p-6 shadow-xl space-y-4 border border-slate-700">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-700/60 pb-4">
          <div className="flex items-center space-x-3">
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center border ${
                isConnected
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                  : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
              }`}
            >
              {isConnected ? <CheckCircle2 className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />}
            </div>
            <div>
              <div
                className={`text-xs uppercase tracking-wider font-semibold ${
                  isConnected ? 'text-emerald-400' : 'text-amber-400'
                }`}
              >
                Operational Status: {isConnected ? 'Online & Synchronized' : 'Setup Required'}
              </div>
              <h3 className="text-lg font-bold text-white">
                {isConnected ? 'Connected to Live Supabase Database' : 'Connect Your Supabase Project'}
              </h3>
              <p className="text-xs text-slate-300">
                {connectionMsg ||
                  'Enter your Supabase Project URL and Anon API Key below to activate cloud persistence.'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-4 bg-slate-950/60 px-4 py-2.5 rounded-xl border border-slate-800 text-xs">
            <div>
              <div className="text-[10px] text-slate-400 uppercase font-bold">Roundtrip Latency</div>
              <div className="text-emerald-400 font-bold text-sm">
                {latency ? `${latency} ms` : isConnected ? '< 100 ms' : 'Offline'}
              </div>
            </div>
            <div className="h-6 w-px bg-slate-800" />
            <div>
              <div className="text-[10px] text-slate-400 uppercase font-bold">Engine</div>
              <div className="text-white font-mono text-xs">PostgreSQL 15+</div>
            </div>
          </div>
        </div>

        {/* Database Identifiers Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Supabase Project URL</span>
            <span className="font-mono text-emerald-300 text-xs truncate block mt-0.5" title={url || 'Not configured'}>
              {url || 'https://xyz.supabase.co'}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Row-Level Security (RLS)</span>
            <span className="text-emerald-400 font-bold text-xs flex items-center mt-0.5">
              <ShieldCheck className="w-3.5 h-3.5 mr-1" />
              Role-Based RLS Policies
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Database Provider</span>
            <span className="font-mono text-white text-xs truncate block mt-0.5">
              Supabase (PostgreSQL)
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Firebase Status</span>
            <span className="text-rose-400 font-semibold text-xs flex items-center mt-0.5">
              Disconnected & Removed
            </span>
          </div>
        </div>
      </div>

      {/* Supabase Connection Setup Form */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 gap-2">
          <div>
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <Key className="w-4 h-4 text-emerald-600" />
              Supabase API Credentials
            </h3>
            <p className="text-xs text-slate-500">
              Found in your Supabase Dashboard &rarr; Project Settings &rarr; API
            </p>
          </div>

          <a
            href="https://supabase.com/dashboard"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center text-xs font-semibold text-emerald-700 hover:text-emerald-800 hover:underline"
          >
            <span>Open Supabase Dashboard</span>
            <ExternalLink className="w-3 h-3 ml-1" />
          </a>
        </div>

        <form onSubmit={handleSaveConfig} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Project URL <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Globe className="w-4 h-4" />
                </div>
                <input
                  type="url"
                  placeholder="https://your-project-id.supabase.co"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm font-mono border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Anon API Key <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Key className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  value={anonKey}
                  onChange={(e) => setAnonKey(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm font-mono border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  required
                />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex items-center space-x-2">
              <button
                type="submit"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-xs transition cursor-pointer"
              >
                Save & Connect
              </button>

              {config.isCustom && (
                <button
                  type="button"
                  onClick={handleResetConfig}
                  className="px-3.5 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-lg transition cursor-pointer"
                >
                  Clear Config
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={handleSeedDatabase}
              disabled={isSeeding || !isConnected}
              title={
                !isConnected
                  ? 'Connect to Supabase first before seeding'
                  : 'Insert initial departments, statuses, users and sample leads into Supabase'
              }
              className={`px-4 py-2 font-bold text-xs rounded-lg shadow-xs transition flex items-center space-x-1.5 ${
                isConnected
                  ? 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              <UploadCloud className={`w-3.5 h-3.5 ${isSeeding ? 'animate-bounce' : ''}`} />
              <span>{isSeeding ? 'Seeding Tables...' : 'Seed Default CRM Data to Supabase'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Tables Live Data Overview */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
            <Server className="w-4 h-4 text-emerald-600" />
            Supabase PostgreSQL Tables & Live Row Counts
          </h3>
          <span className="text-xs text-slate-500 font-medium">Real-time counts queried from Supabase</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {tables.map((t, idx) => {
            const Icon = t.icon;
            return (
              <div
                key={idx}
                className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs hover:border-emerald-300 transition flex flex-col justify-between"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`p-2 rounded-lg ${t.color}`}>
                    <Icon className="w-4 h-4" />
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-400">public.{t.tableName}</span>
                </div>
                <div>
                  <div className="text-2xl font-extrabold text-slate-900">
                    {t.count !== null ? t.count : isConnected ? '0' : '—'}
                  </div>
                  <div className="text-xs font-bold text-slate-700 capitalize mt-0.5">{t.name}</div>
                  <div className="text-[11px] text-slate-400 mt-1 line-clamp-1">{t.description}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SQL Setup Instructions & Schema Preview Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 gap-2">
          <div>
            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <CheckCheck className="w-4 h-4 text-emerald-600" />
              How to Create Your Supabase Database in 2 Minutes
            </h4>
            <p className="text-xs text-slate-500">
              Run this SQL script in your Supabase SQL Editor to initialize all 8 tables and RLS security policies.
            </p>
          </div>

          <button
            onClick={handleCopySchema}
            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition flex items-center space-x-1.5 self-start sm:self-auto cursor-pointer"
          >
            {copiedSchema ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedSchema ? 'Copied!' : 'Copy SQL Schema'}</span>
          </button>
        </div>

        {/* 3 Steps */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1">
            <span className="font-bold text-slate-800 flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px]">
                1
              </span>
              Create Supabase Project
            </span>
            <p className="text-slate-600 text-[11px]">
              Go to <a href="https://database.new" target="_blank" rel="noreferrer" className="text-emerald-700 underline font-semibold">database.new</a> and create a free project.
            </p>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1">
            <span className="font-bold text-slate-800 flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px]">
                2
              </span>
              Paste SQL in SQL Editor
            </span>
            <p className="text-slate-600 text-[11px]">
              Click <strong>Copy SQL Schema</strong> above, open the SQL Editor in Supabase, paste and click <strong>Run</strong>.
            </p>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1">
            <span className="font-bold text-slate-800 flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px]">
                3
              </span>
              Save Credentials & Seed
            </span>
            <p className="text-slate-600 text-[11px]">
              Copy your Project URL & Anon Key from Project Settings &rarr; API, paste above and click <strong>Seed Default CRM Data</strong>.
            </p>
          </div>
        </div>

        {/* Schema Code Window */}
        <div className="bg-slate-900 text-slate-200 p-4 rounded-xl font-mono text-xs overflow-x-auto max-h-56 border border-slate-800">
          <pre>{SUPABASE_SQL_SCHEMA.substring(0, 1500)}
            {'\n-- ... [Click "Copy SQL Schema" for complete 274-line script with all 8 tables, indexes & RLS policies]'}
          </pre>
        </div>
      </div>
    </div>
  );
};
