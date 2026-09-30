import {
  UserProfile,
  Department,
  LeadStatus,
  Lead,
  LeadActivity,
  Followup,
  LeadAssignment,
  LeadFilterState,
  UserRole,
} from '../types/crm';
import { getSupabase } from '../lib/supabase';
import {
  saveDocToFirestore,
  saveBatchToFirestore,
  initFirestoreDatabase,
  COLL_DEPARTMENTS,
  COLL_STATUSES,
  COLL_PROFILES,
  COLL_LEADS,
  COLL_ACTIVITIES,
  COLL_FOLLOWUPS,
  COLL_ASSIGNMENTS,
} from './firestoreService';
import {
  INITIAL_PROFILES,
  INITIAL_DEPARTMENTS,
  INITIAL_STATUSES,
  INITIAL_LEADS,
  INITIAL_ACTIVITIES,
  INITIAL_FOLLOWUPS,
} from './seedData';

// Local storage keys for persistent offline/direct data
const STORAGE_PROFILES = 'es_crm_profiles';
const STORAGE_DEPARTMENTS = 'es_crm_departments';
const STORAGE_STATUSES = 'es_crm_statuses';
const STORAGE_LEADS = 'es_crm_leads';
const STORAGE_ACTIVITIES = 'es_crm_activities';
const STORAGE_FOLLOWUPS = 'es_crm_followups';
const STORAGE_ASSIGNMENTS = 'es_crm_assignments';

function loadOrInit<T>(key: string, initial: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      localStorage.setItem(key, JSON.stringify(initial));
      return initial;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error(`Error loading key ${key}`, e);
    return initial;
  }
}

function save<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error(`Error saving key ${key}`, e);
  }
}

// In-memory / localStorage cache
let profilesStore: UserProfile[] = loadOrInit(STORAGE_PROFILES, INITIAL_PROFILES);
let departmentsStore: Department[] = loadOrInit(STORAGE_DEPARTMENTS, INITIAL_DEPARTMENTS);
let statusesStore: LeadStatus[] = loadOrInit(STORAGE_STATUSES, INITIAL_STATUSES);
let leadsStore: Lead[] = loadOrInit(STORAGE_LEADS, INITIAL_LEADS);
let activitiesStore: LeadActivity[] = loadOrInit(STORAGE_ACTIVITIES, INITIAL_ACTIVITIES);
let followupsStore: Followup[] = loadOrInit(STORAGE_FOLLOWUPS, INITIAL_FOLLOWUPS);
let assignmentsStore: LeadAssignment[] = loadOrInit(STORAGE_ASSIGNMENTS, []);

// Listeners for reactive updates
type ChangeListener = () => void;
const listeners: ChangeListener[] = [];

export function subscribeToDatabaseChanges(listener: ChangeListener): () => void {
  listeners.push(listener);
  return () => {
    const idx = listeners.indexOf(listener);
    if (idx !== -1) listeners.splice(idx, 1);
  };
}

function notifyChange() {
  listeners.forEach((fn) => {
    try {
      fn();
    } catch (e) {
      console.error('Listener error', e);
    }
  });
}

// ==========================================
// DEPARTMENTS SERVICE
// ==========================================
export async function getDepartments(): Promise<Department[]> {
  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase.from('departments').select('*').order('name');
      if (!error && data && data.length > 0) return data as Department[];
    } catch (e) {
      console.warn('Supabase fetch departments failed, using local store', e);
    }
  }
  return [...departmentsStore];
}

export async function createDepartment(input: { name: string; description: string }): Promise<Department> {
  const newDept: Department = {
    id: 'dept-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
    name: input.name.trim(),
    description: input.description.trim(),
    active: true,
    created_at: new Date().toISOString(),
  };

  departmentsStore = [newDept, ...departmentsStore];
  save(STORAGE_DEPARTMENTS, departmentsStore);
  saveDocToFirestore(COLL_DEPARTMENTS, newDept.id, newDept);

  const supabase = getSupabase();
  if (supabase) {
    try {
      await supabase.from('departments').insert([newDept]);
    } catch (e) {
      console.warn('Supabase sync department failed', e);
    }
  }

  notifyChange();
  return newDept;
}

export async function updateDepartment(id: string, input: Partial<Department>): Promise<Department> {
  departmentsStore = departmentsStore.map((d) => (d.id === id ? { ...d, ...input } : d));
  save(STORAGE_DEPARTMENTS, departmentsStore);
  saveDocToFirestore(COLL_DEPARTMENTS, id, input);

  const supabase = getSupabase();
  if (supabase) {
    try {
      await supabase.from('departments').update(input).eq('id', id);
    } catch (e) {
      console.warn('Supabase update department failed', e);
    }
  }

  notifyChange();
  const updated = departmentsStore.find((d) => d.id === id);
  if (!updated) throw new Error('Department not found');
  return updated;
}

export async function toggleDepartmentStatus(id: string): Promise<boolean> {
  const dept = departmentsStore.find((d) => d.id === id);
  if (!dept) throw new Error('Department not found');
  const newActive = !dept.active;
  await updateDepartment(id, { active: newActive });
  return newActive;
}

// ==========================================
// STATUS MASTER SERVICE
// ==========================================
export async function getLeadStatuses(): Promise<LeadStatus[]> {
  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase.from('lead_statuses').select('*').order('display_order');
      if (!error && data && data.length > 0) return data as LeadStatus[];
    } catch (e) {
      console.warn('Supabase fetch lead_statuses failed', e);
    }
  }
  return [...statusesStore].sort((a, b) => a.display_order - b.display_order);
}

export async function createLeadStatus(input: {
  name: string;
  category: 'New' | 'In Progress' | 'Converted' | 'Lost' | 'Follow-up';
  display_order: number;
}): Promise<LeadStatus> {
  const newStatus: LeadStatus = {
    id: 'stat-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
    name: input.name.trim(),
    category: input.category,
    display_order: input.display_order || statusesStore.length + 1,
    active: true,
    created_at: new Date().toISOString(),
  };

  statusesStore = [...statusesStore, newStatus].sort((a, b) => a.display_order - b.display_order);
  save(STORAGE_STATUSES, statusesStore);
  saveDocToFirestore(COLL_STATUSES, newStatus.id, newStatus);

  const supabase = getSupabase();
  if (supabase) {
    try {
      await supabase.from('lead_statuses').insert([newStatus]);
    } catch (e) {
      console.warn('Supabase sync status failed', e);
    }
  }

  notifyChange();
  return newStatus;
}

export async function updateLeadStatus(id: string, input: Partial<LeadStatus>): Promise<LeadStatus> {
  statusesStore = statusesStore
    .map((s) => (s.id === id ? { ...s, ...input } : s))
    .sort((a, b) => a.display_order - b.display_order);
  save(STORAGE_STATUSES, statusesStore);
  saveDocToFirestore(COLL_STATUSES, id, input);

  const supabase = getSupabase();
  if (supabase) {
    try {
      await supabase.from('lead_statuses').update(input).eq('id', id);
    } catch (e) {
      console.warn('Supabase update status failed', e);
    }
  }

  notifyChange();
  const updated = statusesStore.find((s) => s.id === id);
  if (!updated) throw new Error('Status not found');
  return updated;
}

// ==========================================
// USER PROFILES SERVICE
// ==========================================
export async function getProfiles(): Promise<UserProfile[]> {
  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase.from('profiles').select('*').order('full_name');
      if (!error && data && data.length > 0) return data as UserProfile[];
    } catch (e) {
      console.warn('Supabase fetch profiles failed', e);
    }
  }
  return [...profilesStore];
}

export async function getProfileById(id: string): Promise<UserProfile | null> {
  const profiles = await getProfiles();
  return profiles.find((p) => p.id === id) || null;
}

export async function createProfile(input: {
  full_name: string;
  email: string;
  mobile: string;
  username: string;
  role: UserRole;
  department_ids: string[];
}): Promise<UserProfile> {
  // Check email/username uniqueness
  const exists = profilesStore.some(
    (p) => p.email.toLowerCase() === input.email.toLowerCase() || p.username.toLowerCase() === input.username.toLowerCase()
  );
  if (exists) {
    throw new Error('A user with this email or username already exists.');
  }

  const newProfile: UserProfile = {
    id: 'user-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
    full_name: input.full_name.trim(),
    email: input.email.trim().toLowerCase(),
    mobile: input.mobile.trim(),
    username: input.username.trim(),
    role: input.role,
    active: true,
    department_ids: input.department_ids || [],
    created_at: new Date().toISOString(),
  };

  profilesStore = [newProfile, ...profilesStore];
  save(STORAGE_PROFILES, profilesStore);
  saveDocToFirestore(COLL_PROFILES, newProfile.id, newProfile);

  const supabase = getSupabase();
  if (supabase) {
    try {
      await supabase.from('profiles').insert([
        {
          id: newProfile.id,
          full_name: newProfile.full_name,
          email: newProfile.email,
          mobile: newProfile.mobile,
          username: newProfile.username,
          role: newProfile.role,
          active: newProfile.active,
          created_at: newProfile.created_at,
        },
      ]);
    } catch (e) {
      console.warn('Supabase sync profile failed', e);
    }
  }

  notifyChange();
  return newProfile;
}

export async function updateProfile(id: string, input: Partial<UserProfile>): Promise<UserProfile> {
  profilesStore = profilesStore.map((p) => (p.id === id ? { ...p, ...input } : p));
  save(STORAGE_PROFILES, profilesStore);
  saveDocToFirestore(COLL_PROFILES, id, input);

  const supabase = getSupabase();
  if (supabase) {
    try {
      await supabase.from('profiles').update(input).eq('id', id);
    } catch (e) {
      console.warn('Supabase update profile failed', e);
    }
  }

  notifyChange();
  const updated = profilesStore.find((p) => p.id === id);
  if (!updated) throw new Error('Profile not found');
  return updated;
}

export async function toggleUserStatus(id: string): Promise<boolean> {
  const profile = profilesStore.find((p) => p.id === id);
  if (!profile) throw new Error('User not found');
  const newActive = !profile.active;
  await updateProfile(id, { active: newActive });
  return newActive;
}

// ==========================================
// LEADS SERVICE
// ==========================================

export interface LeadFilterParams {
  role: UserRole;
  currentUserId: string;
  departmentId?: string;
  userId?: string;
  statusId?: string;
  product?: string;
  source?: string;
  city?: string;
  searchQuery?: string;
  unassignedOnly?: boolean;
  assignedOnly?: boolean;
  dateType?: 'created' | 'assigned' | 'followup' | 'all';
  quickDate?: 'all' | 'today' | 'yesterday' | 'this_week' | 'this_month' | 'custom';
  startDate?: string;
  endDate?: string;
  kpiStatusFilter?: string; // e.g. 'stat-untouched' or 'Untouched' or 'Money Problem'
}

function enrichLead(lead: Lead): Lead {
  const dept = departmentsStore.find((d) => d.id === lead.department_id);
  const stat = statusesStore.find((s) => s.id === lead.status_id);
  const user = profilesStore.find((u) => u.id === lead.assigned_to);

  return {
    ...lead,
    department_name: dept ? dept.name : 'Unassigned Dept',
    status_name: stat ? stat.name : 'Unknown',
    assigned_user_name: user ? user.full_name : 'Unassigned',
  };
}

export async function getLeads(params: LeadFilterParams): Promise<Lead[]> {
  // CRITICAL RLS ENFORCEMENT:
  // If user is TELECALLER, they can ONLY see leads where assigned_to === currentUserId!
  let leads = [...leadsStore];

  if (params.role === 'TELECALLER') {
    leads = leads.filter((l) => l.assigned_to === params.currentUserId);
  } else if (params.userId && params.userId !== 'all') {
    leads = leads.filter((l) => l.assigned_to === params.userId);
  }

  if (params.unassignedOnly) {
    leads = leads.filter((l) => !l.assigned_to);
  } else if (params.assignedOnly) {
    leads = leads.filter((l) => !!l.assigned_to);
  }

  if (params.departmentId && params.departmentId !== 'all') {
    leads = leads.filter((l) => l.department_id === params.departmentId);
  }

  if (params.statusId && params.statusId !== 'all') {
    leads = leads.filter((l) => l.status_id === params.statusId);
  }

  if (params.product && params.product !== 'all') {
    leads = leads.filter((l) => l.product.toLowerCase().includes(params.product!.toLowerCase()));
  }

  if (params.source && params.source !== 'all') {
    leads = leads.filter((l) => l.source.toLowerCase().includes(params.source!.toLowerCase()));
  }

  if (params.city && params.city !== 'all') {
    leads = leads.filter((l) => l.city.toLowerCase().includes(params.city!.toLowerCase()));
  }

  // Quick Date & Date Type Filtering
  if (params.quickDate && params.quickDate !== 'all') {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const weekAgo = new Date(now);
    weekAgo.setDate(now.getDate() - 7);
    const monthAgo = new Date(now);
    monthAgo.setDate(now.getDate() - 30);

    leads = leads.filter((lead) => {
      let targetDateStr = lead.created_at;
      if (params.dateType === 'assigned') targetDateStr = lead.assigned_at || '';
      else if (params.dateType === 'followup') targetDateStr = lead.followup_date || '';

      if (!targetDateStr) return false;
      const dStr = targetDateStr.split('T')[0];

      if (params.quickDate === 'today') return dStr === todayStr;
      if (params.quickDate === 'yesterday') return dStr === yesterdayStr;
      if (params.quickDate === 'this_week') return new Date(targetDateStr) >= weekAgo;
      if (params.quickDate === 'this_month') return new Date(targetDateStr) >= monthAgo;
      if (params.quickDate === 'custom') {
        if (params.startDate && dStr < params.startDate) return false;
        if (params.endDate && dStr > params.endDate) return false;
        return true;
      }
      return true;
    });
  }

  // KPI status quick filter (e.g. from clicking dashboard cards)
  if (params.kpiStatusFilter) {
    const targetStatus = statusesStore.find(
      (s) =>
        s.id === params.kpiStatusFilter ||
        s.name.toLowerCase() === params.kpiStatusFilter!.toLowerCase()
    );
    if (targetStatus) {
      leads = leads.filter((l) => l.status_id === targetStatus.id);
    }
  }

  // Global Search Filter (Customer Name, Mobile, Alternate Mobile, Lead Number)
  if (params.searchQuery && params.searchQuery.trim()) {
    const q = params.searchQuery.trim().toLowerCase();
    leads = leads.filter((l) => {
      const matchName = l.customer_name.toLowerCase().includes(q);
      const matchMobile = l.mobile.includes(q);
      const matchAltMobile = l.alternate_mobile ? l.alternate_mobile.includes(q) : false;
      const matchNumber = l.lead_number.toLowerCase().includes(q);
      const matchCity = l.city.toLowerCase().includes(q);
      return matchName || matchMobile || matchAltMobile || matchNumber || matchCity;
    });
  }

  // Sort by created_at desc
  leads.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return leads.map(enrichLead);
}

export async function getLeadById(
  id: string,
  userRole: UserRole,
  currentUserId: string
): Promise<Lead | null> {
  const lead = leadsStore.find((l) => l.id === id);
  if (!lead) return null;

  // STRICT RLS: Telecaller can never access someone else's lead
  if (userRole === 'TELECALLER' && lead.assigned_to !== currentUserId) {
    throw new Error('Access denied: You do not have permission to view this lead.');
  }

  return enrichLead(lead);
}

export async function createLead(input: Omit<Lead, 'id' | 'lead_number' | 'created_at' | 'updated_at' | 'imported_at'>): Promise<Lead> {
  const nextNum = 1000 + leadsStore.length + 1;
  const leadNumber = `ESL-${nextNum}`;
  const now = new Date().toISOString();

  const untouchedStatus = statusesStore.find((s) => s.name.toLowerCase() === 'untouched');
  const defaultStatusId = input.status_id || (untouchedStatus ? untouchedStatus.id : statusesStore[0]?.id || 'stat-untouched');

  const newLead: Lead = {
    ...input,
    id: 'lead-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
    lead_number: leadNumber,
    status_id: defaultStatusId,
    imported_at: now,
    created_at: now,
    updated_at: now,
    last_activity_at: null,
    last_remark: input.last_remark || null,
    followup_date: input.followup_date || null,
    followup_time: input.followup_time || null,
    callback_date: input.callback_date || null,
    callback_time: input.callback_time || null,
    assigned_to: input.assigned_to || null,
    assigned_at: input.assigned_to ? now : null,
  };

  leadsStore = [newLead, ...leadsStore];
  save(STORAGE_LEADS, leadsStore);
  saveDocToFirestore(COLL_LEADS, newLead.id, newLead);

  const supabase = getSupabase();
  if (supabase) {
    try {
      await supabase.from('leads').insert([newLead]);
    } catch (e) {
      console.warn('Supabase lead create failed', e);
    }
  }

  notifyChange();
  return enrichLead(newLead);
}

export async function updateLead(id: string, input: Partial<Lead>): Promise<Lead> {
  const now = new Date().toISOString();
  leadsStore = leadsStore.map((l) => (l.id === id ? { ...l, ...input, updated_at: now } : l));
  save(STORAGE_LEADS, leadsStore);
  saveDocToFirestore(COLL_LEADS, id, input);

  const supabase = getSupabase();
  if (supabase) {
    try {
      await supabase.from('leads').update({ ...input, updated_at: now }).eq('id', id);
    } catch (e) {
      console.warn('Supabase lead update failed', e);
    }
  }

  notifyChange();
  const updated = leadsStore.find((l) => l.id === id);
  if (!updated) throw new Error('Lead not found');
  return enrichLead(updated);
}

// ==========================================
// MANUAL & BULK ASSIGNMENT SERVICE
// ==========================================
export async function assignLeads(params: {
  leadIds: string[];
  assignToUserId: string;
  assignedByUserId: string;
  departmentId?: string;
}): Promise<{ count: number }> {
  const { leadIds, assignToUserId, assignedByUserId, departmentId } = params;
  const now = new Date().toISOString();
  const targetUser = profilesStore.find((u) => u.id === assignToUserId);
  if (!targetUser) throw new Error('Target user not found');

  const newAssignments: LeadAssignment[] = [];

  leadsStore = leadsStore.map((lead) => {
    if (leadIds.includes(lead.id)) {
      const fromUser = lead.assigned_to;
      const deptId = departmentId || lead.department_id;

      // Add to assignment audit history
      newAssignments.push({
        id: 'asg-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
        lead_id: lead.id,
        assigned_from: fromUser,
        assigned_to: assignToUserId,
        assigned_by: assignedByUserId,
        department_id: deptId,
        assigned_at: now,
      });

      return {
        ...lead,
        assigned_to: assignToUserId,
        assigned_at: now,
        department_id: deptId,
        updated_at: now,
      };
    }
    return lead;
  });

  save(STORAGE_LEADS, leadsStore);

  assignmentsStore = [...newAssignments, ...assignmentsStore];
  save(STORAGE_ASSIGNMENTS, assignmentsStore);

  saveBatchToFirestore(
    COLL_LEADS,
    leadIds.map((id) => ({ id, data: { assigned_to: assignToUserId, assigned_at: now, department_id: departmentId || undefined } }))
  );
  saveBatchToFirestore(
    COLL_ASSIGNMENTS,
    newAssignments.map((a) => ({ id: a.id, data: a }))
  );

  const supabase = getSupabase();
  if (supabase) {
    try {
      await supabase.from('leads').update({ assigned_to: assignToUserId, assigned_at: now }).in('id', leadIds);
      await supabase.from('lead_assignments').insert(newAssignments);
    } catch (e) {
      console.warn('Supabase bulk assign sync failed', e);
    }
  }

  notifyChange();
  return { count: leadIds.length };
}

// ==========================================
// LEAD IMPORT SERVICE (.xlsx, .xls, .csv)
// ==========================================
export interface ImportLeadRow {
  customer_name: string;
  mobile: string;
  alternate_mobile?: string;
  city?: string;
  state?: string;
  product?: string;
  amount?: number;
  source?: string;
  department_id?: string;
}

export interface ImportValidationResult {
  totalRows: number;
  validRows: ImportLeadRow[];
  invalidRows: { row: number; reason: string; data: any }[];
  duplicateRows: { row: number; mobile: string; reason: string; data: any }[];
}

export function validateImportLeads(
  rows: any[],
  fieldMapping: { [key: string]: string },
  defaultDepartmentId: string
): ImportValidationResult {
  const validRows: ImportLeadRow[] = [];
  const invalidRows: { row: number; reason: string; data: any }[] = [];
  const duplicateRows: { row: number; mobile: string; reason: string; data: any }[] = [];

  const existingMobiles = new Set(leadsStore.map((l) => l.mobile.replace(/\D/g, '')));
  const seenInBatch = new Set<string>();

  rows.forEach((raw, index) => {
    const rowNum = index + 2; // header is row 1
    const name = String(raw[fieldMapping.customer_name] || '').trim();
    let mobile = String(raw[fieldMapping.mobile] || '').replace(/\D/g, '').trim();
    const altMobile = String(raw[fieldMapping.alternate_mobile] || '').replace(/\D/g, '').trim();
    const city = String(raw[fieldMapping.city] || 'Unknown').trim();
    const state = String(raw[fieldMapping.state] || 'India').trim();
    const product = String(raw[fieldMapping.product] || 'General Inquiry').trim();
    const amountVal = parseFloat(String(raw[fieldMapping.amount] || '0').replace(/[^0-9.]/g, '')) || 0;
    const source = String(raw[fieldMapping.source] || 'Excel / CSV Import').trim();
    const deptId = fieldMapping.department ? String(raw[fieldMapping.department] || defaultDepartmentId) : defaultDepartmentId;

    if (!name) {
      invalidRows.push({ row: rowNum, reason: 'Missing customer name', data: raw });
      return;
    }

    if (!mobile || mobile.length < 10) {
      invalidRows.push({ row: rowNum, reason: 'Invalid or missing mobile number (min 10 digits)', data: raw });
      return;
    }

    // Standardize Indian 10-digit if prefixed with 91 or 0
    if (mobile.length === 12 && mobile.startsWith('91')) mobile = mobile.substring(2);
    if (mobile.length === 11 && mobile.startsWith('0')) mobile = mobile.substring(1);

    if (existingMobiles.has(mobile)) {
      duplicateRows.push({ row: rowNum, mobile, reason: 'Mobile already exists in database', data: raw });
      return;
    }

    if (seenInBatch.has(mobile)) {
      duplicateRows.push({ row: rowNum, mobile, reason: 'Duplicate mobile inside same import file', data: raw });
      return;
    }

    seenInBatch.add(mobile);
    validRows.push({
      customer_name: name,
      mobile,
      alternate_mobile: altMobile || undefined,
      city: city || 'Unknown',
      state: state || 'India',
      product: product || 'General Inquiry',
      amount: amountVal,
      source: source || 'Import',
      department_id: deptId,
    });
  });

  return {
    totalRows: rows.length,
    validRows,
    invalidRows,
    duplicateRows,
  };
}

export async function executeImportLeads(
  validRows: ImportLeadRow[],
  options: {
    departmentId: string;
    assignToUserId?: string | null;
    importedByUserId: string;
  }
): Promise<{ importedCount: number }> {
  const now = new Date().toISOString();
  const untouchedStatus = statusesStore.find((s) => s.name.toLowerCase() === 'untouched');
  const defaultStatusId = untouchedStatus ? untouchedStatus.id : statusesStore[0]?.id || 'stat-untouched';

  let currentLeadNum = 1000 + leadsStore.length;
  const newLeads: Lead[] = [];
  const newAssignments: LeadAssignment[] = [];

  for (const row of validRows) {
    currentLeadNum++;
    const leadId = 'lead-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
    const deptId = row.department_id || options.departmentId;

    const lead: Lead = {
      id: leadId,
      lead_number: `ESL-${currentLeadNum}`,
      customer_name: row.customer_name,
      mobile: row.mobile,
      alternate_mobile: row.alternate_mobile || '',
      city: row.city || 'Unknown',
      state: row.state || 'India',
      product: row.product || 'Ayurvedic Wellness Kit',
      amount: row.amount || 0,
      department_id: deptId,
      source: row.source || 'Bulk Import',
      status_id: defaultStatusId,
      assigned_to: options.assignToUserId || null,
      assigned_at: options.assignToUserId ? now : null,
      followup_date: null,
      followup_time: null,
      callback_date: null,
      callback_time: null,
      last_remark: null,
      last_activity_at: null,
      imported_at: now,
      created_at: now,
      updated_at: now,
    };

    newLeads.push(lead);

    if (options.assignToUserId) {
      newAssignments.push({
        id: 'asg-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
        lead_id: leadId,
        assigned_from: null,
        assigned_to: options.assignToUserId,
        assigned_by: options.importedByUserId,
        department_id: deptId,
        assigned_at: now,
      });
    }
  }

  leadsStore = [...newLeads, ...leadsStore];
  save(STORAGE_LEADS, leadsStore);

  if (newAssignments.length > 0) {
    assignmentsStore = [...newAssignments, ...assignmentsStore];
    save(STORAGE_ASSIGNMENTS, assignmentsStore);
  }

  saveBatchToFirestore(
    COLL_LEADS,
    newLeads.map((l) => ({ id: l.id, data: l }))
  );
  if (newAssignments.length > 0) {
    saveBatchToFirestore(
      COLL_ASSIGNMENTS,
      newAssignments.map((a) => ({ id: a.id, data: a }))
    );
  }

  const supabase = getSupabase();
  if (supabase) {
    try {
      await supabase.from('leads').insert(newLeads);
      if (newAssignments.length > 0) {
        await supabase.from('lead_assignments').insert(newAssignments);
      }
    } catch (e) {
      console.warn('Supabase bulk lead insert failed', e);
    }
  }

  notifyChange();
  return { importedCount: newLeads.length };
}

// ==========================================
// CALLING & STATUS UPDATE SERVICE
// ==========================================
export async function updateLeadCallResponse(params: {
  leadId: string;
  userId: string;
  userName: string;
  newStatusId: string;
  remark: string;
  followupDate?: string | null;
  followupTime?: string | null;
  callbackDate?: string | null;
  callbackTime?: string | null;
  orderData?: {
    amount?: number;
    product?: string;
    quantity?: number;
    payment_status?: string;
    expected_budget?: number;
  };
}): Promise<{ lead: Lead; activity: LeadActivity }> {
  const {
    leadId,
    userId,
    userName,
    newStatusId,
    remark,
    followupDate,
    followupTime,
    callbackDate,
    callbackTime,
    orderData,
  } = params;

  const lead = leadsStore.find((l) => l.id === leadId);
  if (!lead) throw new Error('Lead not found');

  const oldStatusId = lead.status_id;
  const oldStatus = statusesStore.find((s) => s.id === oldStatusId);
  const newStatus = statusesStore.find((s) => s.id === newStatusId);
  const now = new Date().toISOString();

  // Determine activity type
  let actType: LeadActivity['activity_type'] = 'STATUS_UPDATE';
  if (newStatus?.name.toLowerCase().includes('order') || newStatus?.name.toLowerCase().includes('converted')) {
    actType = 'ORDER_PLACED';
  } else if (newStatus?.name.toLowerCase().includes('follow')) {
    actType = 'FOLLOWUP_SCHEDULED';
  } else if (newStatus?.name.toLowerCase().includes('call back')) {
    actType = 'CALL';
  }

  // 1. Create Lead Activity record (NEVER OVERWRITE OLD REMARKS)
  const newActivity: LeadActivity = {
    id: 'act-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
    lead_id: leadId,
    user_id: userId,
    user_name: userName,
    old_status_id: oldStatusId,
    old_status_name: oldStatus ? oldStatus.name : '',
    new_status_id: newStatusId,
    new_status_name: newStatus ? newStatus.name : '',
    remark: remark.trim(),
    activity_type: actType,
    order_data: orderData,
    created_at: now,
  };

  activitiesStore = [newActivity, ...activitiesStore];
  save(STORAGE_ACTIVITIES, activitiesStore);
  saveDocToFirestore(COLL_ACTIVITIES, newActivity.id, newActivity);

  // 2. If follow-up or callback is scheduled, create Followup record
  if (followupDate || callbackDate) {
    const isCallback = !!callbackDate;
    const newFollowup: Followup = {
      id: 'fol-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
      lead_id: leadId,
      user_id: userId,
      customer_name: lead.customer_name,
      customer_mobile: lead.mobile,
      product: lead.product,
      followup_type: isCallback ? 'CALL_BACK' : 'FOLLOW_UP',
      scheduled_date: (isCallback ? callbackDate : followupDate) || now.split('T')[0],
      scheduled_time: (isCallback ? callbackTime : followupTime) || '11:00',
      remark: remark.trim(),
      status: 'PENDING',
      created_at: now,
    };
    followupsStore = [newFollowup, ...followupsStore];
    save(STORAGE_FOLLOWUPS, followupsStore);
    saveDocToFirestore(COLL_FOLLOWUPS, newFollowup.id, newFollowup);
  }

  // 3. Update Lead in database
  const updatedLeadData: Partial<Lead> = {
    status_id: newStatusId,
    last_remark: remark.trim(),
    last_activity_at: now,
    followup_date: followupDate || null,
    followup_time: followupTime || null,
    callback_date: callbackDate || null,
    callback_time: callbackTime || null,
    updated_at: now,
  };

  if (orderData) {
    if (orderData.amount !== undefined) updatedLeadData.amount = orderData.amount;
    if (orderData.amount !== undefined) updatedLeadData.order_amount = orderData.amount;
    if (orderData.product) updatedLeadData.order_product = orderData.product;
    if (orderData.quantity) updatedLeadData.order_quantity = orderData.quantity;
    if (orderData.payment_status) updatedLeadData.payment_status = orderData.payment_status;
    if (orderData.expected_budget) updatedLeadData.expected_budget = orderData.expected_budget;
  }

  leadsStore = leadsStore.map((l) => (l.id === leadId ? { ...l, ...updatedLeadData } : l));
  save(STORAGE_LEADS, leadsStore);
  saveDocToFirestore(COLL_LEADS, leadId, updatedLeadData);

  const supabase = getSupabase();
  if (supabase) {
    try {
      await supabase.from('lead_activities').insert([newActivity]);
      await supabase.from('leads').update(updatedLeadData).eq('id', leadId);
    } catch (e) {
      console.warn('Supabase sync status update failed', e);
    }
  }

  notifyChange();
  const updatedLead = leadsStore.find((l) => l.id === leadId)!;
  return { lead: enrichLead(updatedLead), activity: newActivity };
}

export async function getLeadActivities(leadId: string): Promise<LeadActivity[]> {
  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('lead_activities')
        .select('*')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false });
      if (!error && data && data.length > 0) return data as LeadActivity[];
    } catch (e) {
      console.warn('Supabase activities fetch failed', e);
    }
  }
  return activitiesStore.filter((a) => a.lead_id === leadId);
}

// ==========================================
// FOLLOWUPS SERVICE
// ==========================================
export async function getFollowups(params: {
  userId?: string;
  role: UserRole;
  statusFilter?: 'ALL' | 'PENDING' | 'COMPLETED';
}): Promise<Followup[]> {
  let list = [...followupsStore];

  if (params.role === 'TELECALLER' && params.userId) {
    list = list.filter((f) => f.user_id === params.userId);
  } else if (params.userId && params.userId !== 'all') {
    list = list.filter((f) => f.user_id === params.userId);
  }

  if (params.statusFilter && params.statusFilter !== 'ALL') {
    list = list.filter((f) => f.status === params.statusFilter);
  }

  // Populate customer name/mobile if missing
  list = list.map((f) => {
    const lead = leadsStore.find((l) => l.id === f.lead_id);
    return {
      ...f,
      customer_name: f.customer_name || (lead ? lead.customer_name : 'Unknown Customer'),
      customer_mobile: f.customer_mobile || (lead ? lead.mobile : ''),
      product: f.product || (lead ? lead.product : ''),
    };
  });

  list.sort((a, b) => {
    const timeA = `${a.scheduled_date} ${a.scheduled_time || '00:00'}`;
    const timeB = `${b.scheduled_date} ${b.scheduled_time || '00:00'}`;
    return timeA.localeCompare(timeB);
  });

  return list;
}

export async function completeFollowup(followupId: string): Promise<void> {
  const now = new Date().toISOString();
  followupsStore = followupsStore.map((f) =>
    f.id === followupId ? { ...f, status: 'COMPLETED', completed_at: now } : f
  );
  save(STORAGE_FOLLOWUPS, followupsStore);
  saveDocToFirestore(COLL_FOLLOWUPS, followupId, { status: 'COMPLETED', completed_at: now });

  const supabase = getSupabase();
  if (supabase) {
    try {
      await supabase.from('followups').update({ status: 'COMPLETED', completed_at: now }).eq('id', followupId);
    } catch (e) {
      console.warn('Supabase complete followup failed', e);
    }
  }

  notifyChange();
}

// ==========================================
// DASHBOARD & REPORTS CALCULATIONS
// ==========================================

export interface AdminDashboardMetrics {
  totalLeads: number;
  unassignedLeads: number;
  assignedLeads: number;
  untouchedLeads: number;
  contactedLeads: number;
  followupLeads: number;
  interestedLeads: number;
  hotLeads: number;
  orderPlacedLeads: number;
  convertedLeads: number;
  activeUsers: number;
  // Today's summary
  leadsImportedToday: number;
  leadsAssignedToday: number;
  untouchedToday: number;
  callsToday: number;
  followupsToday: number;
  overdueFollowups: number;
  ordersToday: number;
  activeTelecallers: number;
}

export function getAdminDashboardMetrics(): AdminDashboardMetrics {
  const todayStr = new Date().toISOString().split('T')[0];

  const totalLeads = leadsStore.length;
  const unassignedLeads = leadsStore.filter((l) => !l.assigned_to).length;
  const assignedLeads = leadsStore.filter((l) => !!l.assigned_to).length;

  const untouchedStatus = statusesStore.find((s) => s.name.toLowerCase() === 'untouched');
  const untouchedLeads = leadsStore.filter((l) => {
    if (!l.assigned_to) return false;
    // Untouched means: Lead has been assigned to user but user has not yet performed any calling/status activity
    return !l.last_activity_at || l.status_id === untouchedStatus?.id;
  }).length;

  const getCountByStatus = (statusName: string) => {
    const s = statusesStore.find((st) => st.name.toLowerCase().includes(statusName.toLowerCase()));
    return s ? leadsStore.filter((l) => l.status_id === s.id).length : 0;
  };

  const contactedLeads = getCountByStatus('Contacted');
  const followupLeads = getCountByStatus('Follow-up');
  const interestedLeads = getCountByStatus('Interested');
  const hotLeads = getCountByStatus('Hot Lead');
  const orderPlacedLeads = getCountByStatus('Order Placed');
  const convertedLeads = getCountByStatus('Converted');
  const activeUsers = profilesStore.filter((u) => u.active).length;

  const leadsImportedToday = leadsStore.filter((l) => l.imported_at && l.imported_at.startsWith(todayStr)).length;
  const leadsAssignedToday = leadsStore.filter((l) => l.assigned_at && l.assigned_at.startsWith(todayStr)).length;
  const callsToday = activitiesStore.filter((a) => a.created_at && a.created_at.startsWith(todayStr)).length;
  const followupsToday = followupsStore.filter((f) => f.scheduled_date === todayStr && f.status === 'PENDING').length;
  const overdueFollowups = followupsStore.filter((f) => f.scheduled_date < todayStr && f.status === 'PENDING').length;
  const ordersToday = activitiesStore.filter(
    (a) => a.created_at && a.created_at.startsWith(todayStr) && a.activity_type === 'ORDER_PLACED'
  ).length;

  const activeTelecallers = profilesStore.filter((u) => u.role === 'TELECALLER' && u.active).length;

  return {
    totalLeads,
    unassignedLeads,
    assignedLeads,
    untouchedLeads,
    contactedLeads,
    followupLeads,
    interestedLeads,
    hotLeads,
    orderPlacedLeads,
    convertedLeads,
    activeUsers,
    leadsImportedToday,
    leadsAssignedToday,
    untouchedToday: untouchedLeads,
    callsToday,
    followupsToday,
    overdueFollowups,
    ordersToday,
    activeTelecallers,
  };
}

export interface TelecallerDashboardMetrics {
  totalAssigned: number;
  untouched: number;
  contacted: number;
  followup: number;
  callback: number;
  interested: number;
  hotLeads: number;
  orderPlaced: number;
  paymentPending: number;
  moneyProblem: number;
  noAnswer: number;
  notInterested: number;
  todayNewLeads: number;
  todayFollowups: number;
  todayCallbacks: number;
  overdueFollowups: number;
  ordersToday: number;
  updatesDoneToday: number;
}

export interface TelecallerDateRangeFilter {
  quickDate?: 'all' | 'today' | 'yesterday' | 'this_week' | 'this_month' | 'custom';
  startDate?: string;
  endDate?: string;
  dateField?: 'assigned' | 'activity' | 'created';
}

export function getTelecallerDashboardMetrics(
  userId: string,
  dateFilter?: TelecallerDateRangeFilter
): TelecallerDashboardMetrics {
  let myLeads = leadsStore.filter((l) => l.assigned_to === userId);
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];
  const weekAgo = new Date(now);
  weekAgo.setDate(now.getDate() - 7);
  const monthAgo = new Date(now);
  monthAgo.setDate(now.getDate() - 30);

  // Apply date filter if specified
  if (dateFilter && dateFilter.quickDate && dateFilter.quickDate !== 'all') {
    const field = dateFilter.dateField || 'assigned';
    myLeads = myLeads.filter((l) => {
      let targetDateStr = '';
      if (field === 'assigned') targetDateStr = l.assigned_at || l.created_at || '';
      else if (field === 'activity') targetDateStr = l.last_activity_at || '';
      else if (field === 'created') targetDateStr = l.created_at || '';

      if (!targetDateStr) return false;
      const dStr = targetDateStr.split('T')[0];

      if (dateFilter.quickDate === 'today') return dStr === todayStr;
      if (dateFilter.quickDate === 'yesterday') return dStr === yesterdayStr;
      if (dateFilter.quickDate === 'this_week') return new Date(targetDateStr) >= weekAgo;
      if (dateFilter.quickDate === 'this_month') return new Date(targetDateStr) >= monthAgo;
      if (dateFilter.quickDate === 'custom') {
        if (dateFilter.startDate && dStr < dateFilter.startDate) return false;
        if (dateFilter.endDate && dStr > dateFilter.endDate) return false;
        return true;
      }
      return true;
    });
  }

  const getStatusCount = (nameMatch: string) => {
    const s = statusesStore.find((st) => st.name.toLowerCase().includes(nameMatch.toLowerCase()));
    return s ? myLeads.filter((l) => l.status_id === s.id).length : 0;
  };

  const untouchedStatus = statusesStore.find((s) => s.name.toLowerCase() === 'untouched');
  const untouched = myLeads.filter((l) => !l.last_activity_at || l.status_id === untouchedStatus?.id).length;

  const myFollowups = followupsStore.filter((f) => f.user_id === userId && f.status === 'PENDING');
  const todayFollowups = myFollowups.filter((f) => f.scheduled_date === todayStr && f.followup_type === 'FOLLOW_UP').length;
  const todayCallbacks = myFollowups.filter((f) => f.scheduled_date === todayStr && f.followup_type === 'CALL_BACK').length;
  const overdueFollowups = myFollowups.filter((f) => f.scheduled_date < todayStr).length;

  const myActivities = activitiesStore.filter((a) => a.user_id === userId);
  const myActivitiesToday = myActivities.filter(
    (a) => a.created_at && a.created_at.startsWith(todayStr)
  );
  const updatesDoneToday = myActivitiesToday.length;
  const ordersToday = myActivitiesToday.filter((a) => a.activity_type === 'ORDER_PLACED').length;
  const todayNewLeads = leadsStore.filter(
    (l) => l.assigned_to === userId && l.assigned_at && l.assigned_at.startsWith(todayStr)
  ).length;

  return {
    totalAssigned: myLeads.length,
    untouched,
    contacted: getStatusCount('contacted'),
    followup: getStatusCount('follow-up'),
    callback: getStatusCount('call back'),
    interested: getStatusCount('interested'),
    hotLeads: getStatusCount('hot lead'),
    orderPlaced: getStatusCount('order placed'),
    paymentPending: getStatusCount('payment pending'),
    moneyProblem: getStatusCount('money problem'),
    noAnswer: getStatusCount('no answer'),
    notInterested: getStatusCount('not interested'),
    todayNewLeads,
    todayFollowups,
    todayCallbacks,
    overdueFollowups,
    ordersToday,
    updatesDoneToday,
  };
}

export interface UserPerformanceRow {
  userId: string;
  userName: string;
  departmentName: string;
  assigned: number;
  untouched: number;
  worked: number;
  contacted: number;
  followup: number;
  callback: number;
  interested: number;
  hot: number;
  orderPlaced: number;
  moneyProblem: number;
  pending: number;
  conversionPercent: number;
}

export function getUserPerformanceReport(): UserPerformanceRow[] {
  const telecallers = profilesStore.filter((u) => u.role === 'TELECALLER');
  const untouchedStatus = statusesStore.find((s) => s.name.toLowerCase() === 'untouched');

  return telecallers.map((user) => {
    const userLeads = leadsStore.filter((l) => l.assigned_to === user.id);
    const assigned = userLeads.length;

    const untouched = userLeads.filter((l) => !l.last_activity_at || l.status_id === untouchedStatus?.id).length;
    const worked = assigned - untouched;

    const getCount = (nameMatch: string) => {
      const s = statusesStore.find((st) => st.name.toLowerCase().includes(nameMatch.toLowerCase()));
      return s ? userLeads.filter((l) => l.status_id === s.id).length : 0;
    };

    const contacted = getCount('contacted');
    const followup = getCount('follow-up');
    const callback = getCount('call back');
    const interested = getCount('interested');
    const hot = getCount('hot lead');
    const orderPlaced = getCount('order placed') + getCount('completed');
    const moneyProblem = getCount('money problem');
    const pending = followup + callback + getCount('thinking');

    const conversionPercent = worked > 0 ? Math.round((orderPlaced / worked) * 100) : 0;

    const deptNames = (user.department_ids || [])
      .map((dId) => departmentsStore.find((d) => d.id === dId)?.name)
      .filter(Boolean)
      .join(', ') || 'Ayurveda';

    return {
      userId: user.id,
      userName: user.full_name,
      departmentName: deptNames,
      assigned,
      untouched,
      worked,
      contacted,
      followup,
      callback,
      interested,
      hot,
      orderPlaced,
      moneyProblem,
      pending,
      conversionPercent,
    };
  });
}

export interface DepartmentReportRow {
  departmentId: string;
  departmentName: string;
  totalLeads: number;
  assigned: number;
  unassigned: number;
  untouched: number;
  contacted: number;
  followup: number;
  callback: number;
  interested: number;
  hotLeads: number;
  orderPlaced: number;
  moneyProblem: number;
  notInterested: number;
  conversionPercent: number;
}

export function getDepartmentReport(): DepartmentReportRow[] {
  const untouchedStatus = statusesStore.find((s) => s.name.toLowerCase() === 'untouched');

  return departmentsStore.map((dept) => {
    const deptLeads = leadsStore.filter((l) => l.department_id === dept.id);
    const totalLeads = deptLeads.length;
    const assigned = deptLeads.filter((l) => !!l.assigned_to).length;
    const unassigned = totalLeads - assigned;

    const untouched = deptLeads.filter((l) => !l.last_activity_at || l.status_id === untouchedStatus?.id).length;
    const worked = assigned - untouched;

    const getCount = (nameMatch: string) => {
      const s = statusesStore.find((st) => st.name.toLowerCase().includes(nameMatch.toLowerCase()));
      return s ? deptLeads.filter((l) => l.status_id === s.id).length : 0;
    };

    const orderPlaced = getCount('order placed') + getCount('completed');
    const conversionPercent = worked > 0 ? Math.round((orderPlaced / worked) * 100) : 0;

    return {
      departmentId: dept.id,
      departmentName: dept.name,
      totalLeads,
      assigned,
      unassigned,
      untouched,
      contacted: getCount('contacted'),
      followup: getCount('follow-up'),
      callback: getCount('call back'),
      interested: getCount('interested'),
      hotLeads: getCount('hot lead'),
      orderPlaced,
      moneyProblem: getCount('money problem'),
      notInterested: getCount('not interested'),
      conversionPercent,
    };
  });
}

export interface ConversionMetrics {
  totalAssigned: number;
  totalWorked: number;
  contacted: number;
  interested: number;
  orderPlaced: number;
  converted: number;
  workRatePercent: number;
  contactRatePercent: number;
  interestRatePercent: number;
  orderConversionRatePercent: number;
}

export function getConversionMetrics(userId?: string): ConversionMetrics {
  const list = userId ? leadsStore.filter((l) => l.assigned_to === userId) : leadsStore;
  const assigned = list.filter((l) => !!l.assigned_to).length;

  const untouchedStatus = statusesStore.find((s) => s.name.toLowerCase() === 'untouched');
  const untouched = list.filter((l) => !l.last_activity_at || l.status_id === untouchedStatus?.id).length;
  const worked = Math.max(0, assigned - untouched);

  const getCount = (nameMatch: string) => {
    const s = statusesStore.find((st) => st.name.toLowerCase().includes(nameMatch.toLowerCase()));
    return s ? list.filter((l) => l.status_id === s.id).length : 0;
  };

  const contacted = getCount('contacted') + getCount('follow-up') + getCount('interested') + getCount('hot');
  const interested = getCount('interested') + getCount('hot lead');
  const orderPlaced = getCount('order placed');
  const converted = orderPlaced + getCount('completed');

  const workRatePercent = assigned > 0 ? Math.round((worked / assigned) * 100) : 0;
  const contactRatePercent = worked > 0 ? Math.round((contacted / worked) * 100) : 0;
  const interestRatePercent = contacted > 0 ? Math.round((interested / contacted) * 100) : 0;
  const orderConversionRatePercent = worked > 0 ? Math.round((converted / worked) * 100) : 0;

  return {
    totalAssigned: assigned,
    totalWorked: worked,
    contacted,
    interested,
    orderPlaced,
    converted,
    workRatePercent,
    contactRatePercent,
    interestRatePercent,
    orderConversionRatePercent,
  };
}

export { initFirestoreDatabase as initCloudDatabase };
