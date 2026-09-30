export type UserRole = 'ADMIN' | 'TELECALLER';

export interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  mobile: string;
  username: string;
  role: UserRole;
  active: boolean;
  department_ids?: string[];
  created_at: string;
}

export interface Department {
  id: string;
  name: string;
  description: string;
  active: boolean;
  created_at: string;
}

export interface UserDepartment {
  id: string;
  user_id: string;
  department_id: string;
  created_at: string;
}

export interface LeadStatus {
  id: string;
  name: string;
  category: 'New' | 'In Progress' | 'Converted' | 'Lost' | 'Follow-up';
  display_order: number;
  active: boolean;
  color?: string;
  created_at: string;
}

export interface Lead {
  id: string;
  lead_number: string;
  customer_name: string;
  mobile: string;
  alternate_mobile?: string;
  city: string;
  state: string;
  product: string;
  amount: number;
  department_id: string;
  source: string;
  status_id: string;
  assigned_to: string | null; // user_id or null if unassigned
  assigned_at: string | null;
  followup_date: string | null; // YYYY-MM-DD
  followup_time: string | null; // HH:mm
  callback_date: string | null; // YYYY-MM-DD
  callback_time: string | null; // HH:mm
  last_remark: string | null;
  last_activity_at: string | null;
  imported_at: string;
  created_at: string;
  updated_at: string;

  // Joined fields for convenience in UI
  department_name?: string;
  status_name?: string;
  assigned_user_name?: string;
  order_amount?: number;
  order_product?: string;
  order_quantity?: number;
  payment_status?: string;
  expected_budget?: number;
}

export interface LeadActivity {
  id: string;
  lead_id: string;
  user_id: string;
  user_name?: string;
  old_status_id?: string | null;
  old_status_name?: string | null;
  new_status_id: string;
  new_status_name?: string | null;
  remark: string;
  activity_type: 'CALL' | 'STATUS_UPDATE' | 'FOLLOWUP_SCHEDULED' | 'ORDER_PLACED' | 'ASSIGNED' | 'NOTE';
  order_data?: {
    amount?: number;
    product?: string;
    quantity?: number;
    payment_status?: string;
    budget?: number;
  };
  created_at: string;
}

export interface Followup {
  id: string;
  lead_id: string;
  user_id: string;
  customer_name?: string;
  customer_mobile?: string;
  product?: string;
  followup_type: 'FOLLOW_UP' | 'CALL_BACK';
  scheduled_date: string; // YYYY-MM-DD
  scheduled_time: string; // HH:mm
  remark: string;
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED';
  completed_at?: string | null;
  created_at: string;
}

export interface LeadAssignment {
  id: string;
  lead_id: string;
  assigned_from: string | null;
  assigned_to: string;
  assigned_by: string;
  department_id: string;
  assigned_at: string;
}

export interface LeadFilterState {
  departmentId: string;
  userId: string;
  statusId: string;
  product: string;
  source: string;
  city: string;
  dateType: 'created' | 'assigned' | 'followup' | 'all';
  quickDate: 'all' | 'today' | 'yesterday' | 'this_week' | 'this_month' | 'custom';
  startDate: string;
  endDate: string;
  searchQuery: string;
  unassignedOnly?: boolean;
}
