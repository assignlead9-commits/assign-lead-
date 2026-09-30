/**
 * Production-ready Supabase SQL Schema for Essential Soul Lead Management CRM.
 * Run this in your Supabase SQL Editor.
 */
export const SUPABASE_SQL_SCHEMA = `-- ==========================================================
-- ESSENTIAL SOUL LEAD MANAGEMENT CRM - SUPABASE SQL SCHEMA
-- ==========================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PROFILES TABLE (Linked with Supabase Auth)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    mobile TEXT,
    username TEXT UNIQUE,
    role TEXT NOT NULL CHECK (role IN ('ADMIN', 'TELECALLER')),
    active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. DEPARTMENTS TABLE
CREATE TABLE IF NOT EXISTS public.departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. USER_DEPARTMENTS TABLE (Many-to-many relationship)
CREATE TABLE IF NOT EXISTS public.user_departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, department_id)
);

-- 4. LEAD_STATUSES TABLE (Configurable Status Master)
CREATE TABLE IF NOT EXISTS public.lead_statuses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT UNIQUE NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('New', 'In Progress', 'Converted', 'Lost', 'Follow-up')),
    display_order INTEGER NOT NULL DEFAULT 0,
    active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. LEADS TABLE
CREATE TABLE IF NOT EXISTS public.leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_number TEXT UNIQUE NOT NULL,
    customer_name TEXT NOT NULL,
    mobile TEXT NOT NULL,
    alternate_mobile TEXT,
    city TEXT,
    state TEXT,
    product TEXT,
    amount NUMERIC DEFAULT 0,
    department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
    source TEXT DEFAULT 'Manual / Import',
    status_id UUID REFERENCES public.lead_statuses(id) ON DELETE SET NULL,
    assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    assigned_at TIMESTAMP WITH TIME ZONE,
    followup_date DATE,
    followup_time TIME,
    callback_date DATE,
    callback_time TIME,
    last_remark TEXT,
    last_activity_at TIMESTAMP WITH TIME ZONE,
    imported_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. LEAD_ACTIVITIES TABLE (Activity Timeline - Never Overwrite)
CREATE TABLE IF NOT EXISTS public.lead_activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    old_status_id UUID REFERENCES public.lead_statuses(id) ON DELETE SET NULL,
    new_status_id UUID NOT NULL REFERENCES public.lead_statuses(id) ON DELETE CASCADE,
    remark TEXT NOT NULL,
    activity_type TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. FOLLOWUPS TABLE
CREATE TABLE IF NOT EXISTS public.followups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    followup_type TEXT NOT NULL CHECK (followup_type IN ('FOLLOW_UP', 'CALL_BACK')),
    scheduled_date DATE NOT NULL,
    scheduled_time TIME,
    remark TEXT,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'COMPLETED', 'CANCELLED')),
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. LEAD_ASSIGNMENTS TABLE (Assignment Audit History)
CREATE TABLE IF NOT EXISTS public.lead_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    assigned_from UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    assigned_to UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==========================================================
-- INDEXES FOR FAST SEARCH & HIGH PERFORMANCE
-- ==========================================================
CREATE INDEX IF NOT EXISTS idx_leads_mobile ON public.leads(mobile);
CREATE INDEX IF NOT EXISTS idx_leads_customer_name ON public.leads(customer_name);
CREATE INDEX IF NOT EXISTS idx_leads_assigned_to ON public.leads(assigned_to);
CREATE INDEX IF NOT EXISTS idx_leads_department_id ON public.leads(department_id);
CREATE INDEX IF NOT EXISTS idx_leads_status_id ON public.leads(status_id);
CREATE INDEX IF NOT EXISTS idx_leads_followup_date ON public.leads(followup_date);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON public.leads(created_at);
CREATE INDEX IF NOT EXISTS idx_leads_last_activity_at ON public.leads(last_activity_at);
CREATE INDEX IF NOT EXISTS idx_lead_activities_lead_id ON public.lead_activities(lead_id);
CREATE INDEX IF NOT EXISTS idx_followups_user_date ON public.followups(user_id, scheduled_date);

-- ==========================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.followups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_assignments ENABLE ROW LEVEL SECURITY;

-- Helper function to check if auth.uid() is an Admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'ADMIN' AND active = TRUE
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- PROFILES POLICIES
CREATE POLICY "Admins have full access to profiles"
    ON public.profiles FOR ALL
    USING (public.is_admin() OR auth.uid() = id);

CREATE POLICY "Users can view active profiles"
    ON public.profiles FOR SELECT
    USING (active = TRUE);

-- DEPARTMENTS & STATUSES POLICIES
CREATE POLICY "All authenticated users can read departments"
    ON public.departments FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage departments"
    ON public.departments FOR ALL
    USING (public.is_admin());

CREATE POLICY "All authenticated users can read lead statuses"
    ON public.lead_statuses FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage lead statuses"
    ON public.lead_statuses FOR ALL
    USING (public.is_admin());

CREATE POLICY "All authenticated users can read user_departments"
    ON public.user_departments FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage user_departments"
    ON public.user_departments FOR ALL
    USING (public.is_admin());

-- LEADS POLICIES (Telecaller strictly only sees assigned_to = auth.uid())
CREATE POLICY "Admins can manage all leads"
    ON public.leads FOR ALL
    USING (public.is_admin());

CREATE POLICY "Telecallers can view their assigned leads only"
    ON public.leads FOR SELECT
    USING (assigned_to = auth.uid());

CREATE POLICY "Telecallers can update their assigned leads only"
    ON public.leads FOR UPDATE
    USING (assigned_to = auth.uid())
    WITH CHECK (assigned_to = auth.uid());

-- LEAD ACTIVITIES POLICIES
CREATE POLICY "Admins can manage all activities"
    ON public.lead_activities FOR ALL
    USING (public.is_admin());

CREATE POLICY "Telecallers can view activities for assigned leads"
    ON public.lead_activities FOR SELECT
    USING (
      EXISTS (SELECT 1 FROM public.leads WHERE leads.id = lead_activities.lead_id AND leads.assigned_to = auth.uid())
    );

CREATE POLICY "Telecallers can insert activities for their assigned leads"
    ON public.lead_activities FOR INSERT
    WITH CHECK (
      user_id = auth.uid() AND
      EXISTS (SELECT 1 FROM public.leads WHERE leads.id = lead_activities.lead_id AND leads.assigned_to = auth.uid())
    );

-- FOLLOWUPS POLICIES
CREATE POLICY "Admins can manage all followups"
    ON public.followups FOR ALL
    USING (public.is_admin());

CREATE POLICY "Telecallers can view their own followups"
    ON public.followups FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Telecallers can manage their own followups"
    ON public.followups FOR ALL
    USING (user_id = auth.uid());

-- LEAD ASSIGNMENTS AUDIT POLICIES
CREATE POLICY "Admins can view lead assignments"
    ON public.lead_assignments FOR ALL
    USING (public.is_admin());

-- ==========================================================
-- DEFAULT SEED DATA
-- ==========================================================

-- Insert Default Departments
INSERT INTO public.departments (name, description, active)
VALUES 
    ('Ayurveda Sales', 'Pure herbal supplements, wellness consultations and kits', true),
    ('Astrology', 'Kundali, gemstone, puja rituals and astrological remedies', true),
    ('Home Decor', 'Vastu items, spiritual idols and premium home aesthetics', true),
    ('Reorder', 'Existing customer re-orders and subscription refills', true),
    ('Customer Support', 'Post-purchase queries and tracking updates', true),
    ('Other', 'General inquiries and miscellaneous marketing leads', true)
ON CONFLICT (name) DO NOTHING;

-- Insert Default Lead Statuses
INSERT INTO public.lead_statuses (name, category, display_order, active)
VALUES
    ('Untouched', 'New', 1, true),
    ('Contacted', 'In Progress', 2, true),
    ('Follow-up', 'Follow-up', 3, true),
    ('Call Back', 'Follow-up', 4, true),
    ('Interested', 'In Progress', 5, true),
    ('Hot Lead', 'In Progress', 6, true),
    ('Order Placed', 'Converted', 7, true),
    ('Payment Pending', 'In Progress', 8, true),
    ('Money Problem', 'Follow-up', 9, true),
    ('Thinking / Discussing', 'In Progress', 10, true),
    ('No Answer', 'In Progress', 11, true),
    ('Busy', 'In Progress', 12, true),
    ('Switch Off / Unreachable', 'In Progress', 13, true),
    ('Not Interested', 'Lost', 14, true),
    ('Wrong Number', 'Lost', 15, true),
    ('Duplicate Lead', 'Lost', 16, true),
    ('Do Not Call', 'Lost', 17, true),
    ('Converted / Completed', 'Converted', 18, true)
ON CONFLICT (name) DO NOTHING;
`;
