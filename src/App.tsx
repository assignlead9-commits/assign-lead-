import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider, useToast } from './components/common/Toast';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { LoginScreen } from './components/auth/LoginScreen';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { LeadsList } from './components/admin/LeadsList';
import { LeadImport } from './components/admin/LeadImport';
import { AssignLeads } from './components/admin/AssignLeads';
import { DepartmentsManager } from './components/admin/DepartmentsManager';
import { UsersManager } from './components/admin/UsersManager';
import { StatusMaster } from './components/admin/StatusMaster';
import { AdminReports } from './components/admin/AdminReports';
import { LeadEditModal } from './components/admin/LeadEditModal';
import { FirebaseStatusView } from './components/admin/FirebaseStatusView';

import { TelecallerDashboard } from './components/telecaller/TelecallerDashboard';
import { MyLeads } from './components/telecaller/MyLeads';
import { CallingScreen } from './components/telecaller/CallingScreen';
import { MyFollowups } from './components/telecaller/MyFollowups';
import { TelecallerReports } from './components/telecaller/TelecallerReports';

import {
  Department,
  UserProfile,
  LeadStatus,
  Lead,
  LeadActivity,
  Followup,
} from './types/crm';
import {
  getDepartments,
  getProfiles,
  getLeadStatuses,
  getLeads,
  getFollowups,
  getAdminDashboardMetrics,
  getTelecallerDashboardMetrics,
  getUserPerformanceReport,
  getDepartmentReport,
  subscribeToDatabaseChanges,
  initCloudDatabase,
} from './services/db';

const MainApp: React.FC = () => {
  const { currentUser, role, isAuthenticated, isLoading } = useAuth();
  const { showToast } = useToast();

  // Navigation tab
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [callingLead, setCallingLead] = useState<Lead | null>(null);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Dashboard filter state passed to MyLeads
  const [statusFilterFromDashboard, setStatusFilterFromDashboard] = useState<string>('all');

  // Master entities
  const [departments, setDepartments] = useState<Department[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [statuses, setStatuses] = useState<LeadStatus[]>([]);
  const [allLeads, setAllLeads] = useState<Lead[]>([]);
  const [telecallerLeads, setTelecallerLeads] = useState<Lead[]>([]);
  const [followups, setFollowups] = useState<Followup[]>([]);

  // Reload all data
  const reloadData = async () => {
    try {
      const [depts, profs, stats] = await Promise.all([
        getDepartments(),
        getProfiles(),
        getLeadStatuses(),
      ]);
      setDepartments(depts);
      setUsers(profs);
      setStatuses(stats);

      if (currentUser) {
        if (role === 'ADMIN') {
          const leadsData = await getLeads({
            role: 'ADMIN',
            currentUserId: currentUser.id,
          });
          setAllLeads(leadsData);

          const folData = await getFollowups({
            role: 'ADMIN',
          });
          setFollowups(folData);
        } else {
          // TELECALLER RLS
          const myLeadsData = await getLeads({
            role: 'TELECALLER',
            currentUserId: currentUser.id,
          });
          setTelecallerLeads(myLeadsData);

          const myFolData = await getFollowups({
            role: 'TELECALLER',
            userId: currentUser.id,
          });
          setFollowups(myFolData);
        }
      }
    } catch (err) {
      console.error('Error loading CRM data', err);
    }
  };

  useEffect(() => {
    initCloudDatabase().catch((e) => console.warn('Cloud DB init:', e));
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      reloadData();
      // Listen to database changes
      const unsubscribe = subscribeToDatabaseChanges(() => {
        reloadData();
      });
      return () => unsubscribe();
    }
  }, [isAuthenticated, currentUser?.id, role]);

  // Reset tab on role switch
  useEffect(() => {
    setCurrentTab('dashboard');
    setCallingLead(null);
    setStatusFilterFromDashboard('all');
  }, [role, currentUser?.id]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white font-semibold">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-300">Loading Essential Soul CRM...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !currentUser) {
    return <LoginScreen />;
  }

  // Dashboard Metrics
  const adminMetrics = getAdminDashboardMetrics();
  const telecallerMetrics = getTelecallerDashboardMetrics(currentUser.id);
  const userPerformance = getUserPerformanceReport();
  const deptSummary = getDepartmentReport();

  // START CALLING action: Pick first untouched or pending lead
  const handleStartCalling = () => {
    const queue = telecallerLeads.filter(
      (l) => !l.last_activity_at || l.status_name?.toLowerCase() === 'untouched'
    );
    const targetLead = queue[0] || telecallerLeads[0];

    if (targetLead) {
      setCallingLead(targetLead);
    } else {
      showToast('No assigned leads found in your calling queue.', 'info');
    }
  };

  const handleKpiFilterClick = (statusName: string) => {
    setStatusFilterFromDashboard(statusName);
    setCurrentTab(role === 'ADMIN' ? 'leads' : 'my-leads');
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans text-slate-900">
      {/* Top Navbar */}
      <Navbar
        onSearchClick={() => {}}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onOpenFirebaseStatus={() => {
          if (role === 'ADMIN') {
            setCallingLead(null);
            setCurrentTab('firebase-status');
          }
        }}
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Role-based Sidebar */}
        <Sidebar
          currentTab={currentTab}
          onSelectTab={(tab) => {
            setCallingLead(null);
            setCurrentTab(tab);
          }}
          untouchedCount={telecallerMetrics.untouched}
          followupCount={telecallerMetrics.todayFollowups}
        />

        {/* Main Content View */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto max-w-7xl mx-auto w-full">
          {/* Active Calling Screen (If Open) */}
          {callingLead ? (
            <CallingScreen
              lead={callingLead}
              allLeadsQueue={role === 'ADMIN' ? allLeads : telecallerLeads}
              statuses={statuses}
              onBack={() => setCallingLead(null)}
              onLeadUpdated={() => reloadData()}
              onOpenNextLead={(next) => setCallingLead(next)}
            />
          ) : role === 'ADMIN' ? (
            /* ADMIN VIEWS */
            <>
              {currentTab === 'dashboard' && (
                <AdminDashboard
                  metrics={adminMetrics}
                  userPerformance={userPerformance}
                  deptSummary={deptSummary}
                  onNavigateToTab={(tab, filter) => {
                    if (filter) setStatusFilterFromDashboard(filter);
                    setCurrentTab(tab);
                  }}
                  onOpenCalling={(leadId) => {
                    const l = allLeads.find((x) => x.id === leadId);
                    if (l) setCallingLead(l);
                  }}
                />
              )}

              {currentTab === 'leads' && (
                <LeadsList
                  leads={allLeads}
                  departments={departments}
                  users={users}
                  statuses={statuses}
                  onViewLead={(lead) => setCallingLead(lead)}
                  onEditLead={(lead) => setEditingLead(lead)}
                  onAssignLead={(lead) => {
                    setCurrentTab('assign');
                  }}
                  onRefresh={reloadData}
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                />
              )}

              {currentTab === 'import' && (
                <LeadImport
                  departments={departments}
                  users={users}
                  onImportComplete={() => {
                    reloadData();
                    setCurrentTab('leads');
                  }}
                />
              )}

              {currentTab === 'assign' && (
                <AssignLeads
                  departments={departments}
                  users={users}
                  onAssignmentDone={reloadData}
                />
              )}

              {currentTab === 'departments' && (
                <DepartmentsManager
                  departments={departments}
                  onRefresh={reloadData}
                />
              )}

              {currentTab === 'users' && (
                <UsersManager
                  users={users}
                  departments={departments}
                  onRefresh={reloadData}
                />
              )}

              {currentTab === 'status-master' && (
                <StatusMaster
                  statuses={statuses}
                  onRefresh={reloadData}
                  onOpenFirebaseStatus={() => setCurrentTab('firebase-status')}
                />
              )}

              {currentTab === 'reports' && (
                <AdminReports
                  departments={departments}
                  users={users}
                  statuses={statuses}
                  leads={allLeads}
                  activities={[]}
                  followups={followups}
                />
              )}

              {currentTab === 'firebase-status' && (
                <FirebaseStatusView />
              )}
            </>
          ) : (
            /* TELECALLER VIEWS */
            <>
              {currentTab === 'dashboard' && (
                <TelecallerDashboard
                  metrics={telecallerMetrics}
                  myLeads={telecallerLeads}
                  onStartCalling={handleStartCalling}
                  onFilterLeadsByStatus={handleKpiFilterClick}
                  onOpenLead={(lead) => setCallingLead(lead)}
                />
              )}

              {currentTab === 'my-leads' && (
                <MyLeads
                  leads={telecallerLeads}
                  statuses={statuses}
                  onOpenCalling={(lead) => setCallingLead(lead)}
                  statusFilterFromDashboard={statusFilterFromDashboard}
                  onClearDashboardFilter={() => setStatusFilterFromDashboard('all')}
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                />
              )}

              {currentTab === 'my-followups' && (
                <MyFollowups
                  followups={followups}
                  allLeads={telecallerLeads}
                  onOpenCalling={(lead) => setCallingLead(lead)}
                  onRefresh={reloadData}
                />
              )}

              {currentTab === 'reports' && (
                <TelecallerReports
                  metrics={telecallerMetrics}
                  myLeads={telecallerLeads}
                  myActivities={[]}
                />
              )}
            </>
          )}
        </main>
      </div>

      {/* Admin Lead Edit Modal */}
      {editingLead && (
        <LeadEditModal
          lead={editingLead}
          departments={departments}
          statuses={statuses}
          users={users}
          isOpen={!!editingLead}
          onClose={() => setEditingLead(null)}
          onUpdated={reloadData}
        />
      )}
    </div>
  );
};

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <MainApp />
      </AuthProvider>
    </ToastProvider>
  );
}
