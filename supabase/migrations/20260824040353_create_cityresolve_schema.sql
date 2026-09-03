/*
# CityResolve-AI — Core Schema

## Purpose
CityResolve-AI is a civic issue reporting platform. Citizens report issues (potholes,
streetlights, garbage, etc.) with optional photos and location. AI suggests category and
priority from the description. Officers get assigned issues and update their status through
Pending → In Progress → Resolved → Closed. Admins manage assignment, priority, and view analytics.

## New Tables

1. `profiles`
   - `id` (uuid, PK, references auth.users) — one row per user
   - `full_name` (text) — display name
   - `role` (text: 'citizen' | 'officer' | 'admin') — determines workspace
   - `ward` (text, nullable) — area assignment for officers
   - `created_at` (timestamptz)

2. `issues`
   - `id` (uuid, PK)
   - `reporter_id` (uuid, FK → profiles.id) — citizen who reported
   - `title` (text)
   - `description` (text)
   - `category` (text) — e.g. Pothole, Streetlight, Garbage
   - `priority` (text: 'low' | 'medium' | 'high' | 'urgent')
   - `status` (text: 'pending' | 'in_progress' | 'resolved' | 'closed', default 'pending')
   - `location` (text, nullable) — human-readable address
   - `ward` (text, nullable)
   - `latitude` (double precision, nullable)
   - `longitude` (double precision, nullable)
   - `photo_url` (text, nullable) — Supabase Storage path
   - `assigned_officer_id` (uuid, FK → profiles.id, nullable)
   - `resolution_notes` (text, nullable)
   - `created_at` (timestamptz, default now())
   - `updated_at` (timestamptz, default now())

3. `notifications`
   - `id` (uuid, PK)
   - `user_id` (uuid, FK → profiles.id) — recipient
   - `issue_id` (uuid, FK → issues.id, nullable)
   - `message` (text)
   - `type` (text) — e.g. 'status_change', 'assignment', 'new_issue'
   - `read` (boolean, default false)
   - `created_at` (timestamptz, default now())

## Security (RLS)
- `profiles`: authenticated users can read all profiles (needed for officer/admin lists);
  users can update only their own profile. Inserts handled via trigger on signup.
- `issues`: authenticated users can read all issues (platform transparency). Citizens can
  insert their own. Officers can update issues assigned to them. Admins can update any issue.
- `notifications`: users can read/update only their own notifications; system inserts via
  service role or trigger.

## Important Notes
1. A trigger `handle_new_user` auto-creates a profile row when a user signs up, using the
   role stored in raw_user_meta_data during signUp.
2. An `updated_at` trigger keeps issues.updated_at current on every UPDATE.
3. A status-change trigger inserts a notification for the reporter when an officer/admin
   changes an issue's status.
4. All policies use auth.uid() — never current_user.
*/

-- ============================================================
-- PROFILES
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT 'Resident',
  role text NOT NULL DEFAULT 'citizen' CHECK (role IN ('citizen', 'officer', 'admin')),
  ward text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_all" ON profiles;
CREATE POLICY "profiles_select_all" ON profiles FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- ============================================================
-- ISSUES
-- ============================================================
CREATE TABLE IF NOT EXISTS issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL,
  category text NOT NULL DEFAULT 'Other',
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'resolved', 'closed')),
  location text,
  ward text,
  latitude double precision,
  longitude double precision,
  photo_url text,
  assigned_officer_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  resolution_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE issues ENABLE ROW LEVEL SECURITY;

-- Everyone authenticated can read all issues (transparency)
DROP POLICY IF EXISTS "issues_select_all" ON issues;
CREATE POLICY "issues_select_all" ON issues FOR SELECT
  TO authenticated USING (true);

-- Citizens insert their own issues
DROP POLICY IF EXISTS "issues_insert_own" ON issues;
CREATE POLICY "issues_insert_own" ON issues FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = reporter_id);

-- Officers can update issues assigned to them; admins can update any
DROP POLICY IF EXISTS "issues_update_assigned_or_admin" ON issues;
CREATE POLICY "issues_update_assigned_or_admin" ON issues FOR UPDATE
  TO authenticated
  USING (
    assigned_officer_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  )
  WITH CHECK (
    assigned_officer_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

-- Only the reporter or an admin can delete
DROP POLICY IF EXISTS "issues_delete_own_or_admin" ON issues;
CREATE POLICY "issues_delete_own_or_admin" ON issues FOR DELETE
  TO authenticated
  USING (
    reporter_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  issue_id uuid REFERENCES issues(id) ON DELETE CASCADE,
  message text NOT NULL,
  type text NOT NULL DEFAULT 'status_change',
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifications_select_own" ON notifications;
CREATE POLICY "notifications_select_own" ON notifications FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "notifications_update_own" ON notifications;
CREATE POLICY "notifications_update_own" ON notifications FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "notifications_delete_own" ON notifications;
CREATE POLICY "notifications_delete_own" ON notifications FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_issues_status ON issues(status);
CREATE INDEX IF NOT EXISTS idx_issues_reporter ON issues(reporter_id);
CREATE INDEX IF NOT EXISTS idx_issues_officer ON issues(assigned_officer_id);
CREATE INDEX IF NOT EXISTS idx_issues_category ON issues(category);
CREATE INDEX IF NOT EXISTS idx_issues_created ON issues(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, read);

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role, ward)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Resident'),
    COALESCE(NEW.raw_user_meta_data->>'role', 'citizen'),
    NEW.raw_user_meta_data->>'ward'
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Auto-update updated_at on issues
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS issues_updated_at ON issues;
CREATE TRIGGER issues_updated_at
  BEFORE UPDATE ON issues
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Notify reporter on status change
CREATE OR REPLACE FUNCTION public.notify_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  msg text;
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    msg := 'Your issue "' || NEW.title || '" status changed to ' || NEW.status;
    INSERT INTO public.notifications (user_id, issue_id, message, type)
    VALUES (NEW.reporter_id, NEW.id, msg, 'status_change');
  END IF;
  IF NEW.assigned_officer_id IS DISTINCT FROM OLD.assigned_officer_id AND NEW.assigned_officer_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, issue_id, message, type)
    VALUES (NEW.assigned_officer_id, NEW.id, 'You have been assigned to issue "' || NEW.title || '"', 'assignment');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS issues_status_notify ON issues;
CREATE TRIGGER issues_status_notify
  AFTER UPDATE ON issues
  FOR EACH ROW EXECUTE FUNCTION public.notify_status_change();