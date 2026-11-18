
-- ===== Enums =====
CREATE TYPE public.app_role AS ENUM ('student', 'faculty', 'admin');
CREATE TYPE public.notice_category AS ENUM ('academic', 'exam', 'placement', 'holiday', 'sports', 'general');
CREATE TYPE public.item_status AS ENUM ('available', 'claim_requested', 'approved', 'collected', 'archived');
CREATE TYPE public.claim_status AS ENUM ('pending', 'approved', 'rejected');

-- ===== Config tables =====
CREATE TABLE public.allowed_domains (
  domain text PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.allowed_domains TO anon, authenticated;
GRANT ALL ON public.allowed_domains TO service_role;
ALTER TABLE public.allowed_domains ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read allowed domains" ON public.allowed_domains FOR SELECT TO anon, authenticated USING (true);
INSERT INTO public.allowed_domains (domain) VALUES ('jecrcu.edu.in');

CREATE TABLE public.admin_emails (
  email text PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.admin_emails TO service_role;
ALTER TABLE public.admin_emails ENABLE ROW LEVEL SECURITY;

-- ===== Profiles =====
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL UNIQUE,
  full_name text NOT NULL DEFAULT '',
  avatar_url text,
  phone text,
  college_name text,
  roll_number text,
  branch text,
  semester int,
  section text,
  profile_completed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ===== Roles =====
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
CREATE INDEX idx_user_roles_user ON public.user_roles(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- ===== Helper functions =====
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('faculty','admin'))
$$;

CREATE OR REPLACE FUNCTION public.is_member(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = _user_id)
$$;

CREATE OR REPLACE FUNCTION public.is_allowed_email(_email text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.allowed_domains WHERE domain = lower(split_part(_email, '@', 2)))
$$;

CREATE OR REPLACE FUNCTION public.current_role_name()
RETURNS public.app_role LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role FROM public.user_roles WHERE user_id = auth.uid()
  ORDER BY CASE role WHEN 'admin' THEN 1 WHEN 'faculty' THEN 2 ELSE 3 END LIMIT 1
$$;

-- Profile policies
CREATE POLICY "View own profile or staff view all" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_staff(auth.uid()));
CREATE POLICY "Update own profile" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "Admins update any profile" ON public.profiles FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Role policies
CREATE POLICY "View own roles or admin" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins insert roles" ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update roles" ON public.user_roles FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete roles" ON public.user_roles FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Lock email & keep timestamps
CREATE OR REPLACE FUNCTION public.profiles_before_update()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.email IS DISTINCT FROM OLD.email THEN
    RAISE EXCEPTION 'The verified college email cannot be changed';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_profiles_before_update BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.profiles_before_update();

-- New user handling: only allowed domains get a profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.email IS NULL OR NOT public.is_allowed_email(NEW.email) THEN
    RETURN NEW;
  END IF;
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    lower(NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture')
  ) ON CONFLICT (id) DO NOTHING;

  IF EXISTS (SELECT 1 FROM public.admin_emails WHERE email = lower(NEW.email)) THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin') ON CONFLICT DO NOTHING;
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'student') ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- When an admin email is added later, promote existing account
CREATE OR REPLACE FUNCTION public.handle_admin_email_added()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  SELECT p.id, 'admin' FROM public.profiles p WHERE p.email = lower(NEW.email)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_admin_email_added AFTER INSERT ON public.admin_emails
  FOR EACH ROW EXECUTE FUNCTION public.handle_admin_email_added();

-- Author name helper
CREATE OR REPLACE FUNCTION public.profile_name(_id uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT full_name FROM public.profiles WHERE id = _id
$$;

-- ===== Notifications =====
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  body text,
  link text,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_notifications_user ON public.notifications(user_id, created_at DESC);
GRANT SELECT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own notifications select" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Own notifications update" ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Own notifications delete" ON public.notifications FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.notify_students(_type text, _title text, _body text, _link text, _exclude uuid, _branch text DEFAULT NULL, _semester int DEFAULT NULL)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO public.notifications (user_id, type, title, body, link)
  SELECT p.id, _type, _title, _body, _link
  FROM public.profiles p
  JOIN public.user_roles r ON r.user_id = p.id AND r.role = 'student'
  WHERE p.id IS DISTINCT FROM _exclude
    AND (_branch IS NULL OR p.branch IS NULL OR p.branch = _branch)
    AND (_semester IS NULL OR p.semester IS NULL OR p.semester = _semester);
$$;
REVOKE EXECUTE ON FUNCTION public.notify_students(text, text, text, text, uuid, text, int) FROM PUBLIC, anon, authenticated;

-- ===== Notices =====
CREATE TABLE public.notices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  category public.notice_category NOT NULL DEFAULT 'general',
  pinned boolean NOT NULL DEFAULT false,
  author_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  author_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_notices_created ON public.notices(pinned DESC, created_at DESC);
CREATE INDEX idx_notices_category ON public.notices(category);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notices TO authenticated;
GRANT ALL ON public.notices TO service_role;
ALTER TABLE public.notices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members view notices" ON public.notices FOR SELECT TO authenticated USING (public.is_member(auth.uid()));
CREATE POLICY "Staff create notices" ON public.notices FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()) AND author_id = auth.uid());
CREATE POLICY "Author or admin update notices" ON public.notices FOR UPDATE TO authenticated USING ((author_id = auth.uid() AND public.is_staff(auth.uid())) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Author or admin delete notices" ON public.notices FOR DELETE TO authenticated USING ((author_id = auth.uid() AND public.is_staff(auth.uid())) OR public.has_role(auth.uid(), 'admin'));

-- ===== Notes =====
CREATE TABLE public.notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  subject text NOT NULL,
  branch text NOT NULL,
  semester int NOT NULL,
  description text,
  file_path text NOT NULL,
  file_name text NOT NULL,
  file_size bigint,
  uploaded_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  uploaded_by_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_notes_filters ON public.notes(branch, semester);
CREATE INDEX idx_notes_created ON public.notes(created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notes TO authenticated;
GRANT ALL ON public.notes TO service_role;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members view notes" ON public.notes FOR SELECT TO authenticated USING (public.is_member(auth.uid()));
CREATE POLICY "Staff upload notes" ON public.notes FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()) AND uploaded_by = auth.uid());
CREATE POLICY "Owner or admin update notes" ON public.notes FOR UPDATE TO authenticated USING ((uploaded_by = auth.uid() AND public.is_staff(auth.uid())) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Owner or admin delete notes" ON public.notes FOR DELETE TO authenticated USING ((uploaded_by = auth.uid() AND public.is_staff(auth.uid())) OR public.has_role(auth.uid(), 'admin'));

-- ===== Assignments =====
CREATE TABLE public.assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  subject text NOT NULL,
  description text,
  branch text,
  semester int,
  due_date timestamptz NOT NULL,
  reminder_sent boolean NOT NULL DEFAULT false,
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_by_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_assignments_due ON public.assignments(due_date);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assignments TO authenticated;
GRANT ALL ON public.assignments TO service_role;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members view assignments" ON public.assignments FOR SELECT TO authenticated USING (public.is_member(auth.uid()));
CREATE POLICY "Staff create assignments" ON public.assignments FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()) AND created_by = auth.uid());
CREATE POLICY "Owner or admin update assignments" ON public.assignments FOR UPDATE TO authenticated USING ((created_by = auth.uid() AND public.is_staff(auth.uid())) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Owner or admin delete assignments" ON public.assignments FOR DELETE TO authenticated USING ((created_by = auth.uid() AND public.is_staff(auth.uid())) OR public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.assignment_completions (
  assignment_id uuid NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  completed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (assignment_id, user_id)
);
CREATE INDEX idx_completions_user ON public.assignment_completions(user_id);
GRANT SELECT, INSERT, DELETE ON public.assignment_completions TO authenticated;
GRANT ALL ON public.assignment_completions TO service_role;
ALTER TABLE public.assignment_completions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own completions or staff view" ON public.assignment_completions FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_staff(auth.uid()));
CREATE POLICY "Mark own completion" ON public.assignment_completions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Unmark own completion" ON public.assignment_completions FOR DELETE TO authenticated USING (user_id = auth.uid());

-- ===== Events =====
CREATE TABLE public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  banner_url text,
  event_date date NOT NULL,
  start_time time NOT NULL,
  venue text NOT NULL,
  organizer text NOT NULL,
  capacity int,
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_events_date ON public.events(event_date);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.events TO authenticated;
GRANT ALL ON public.events TO service_role;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members view events" ON public.events FOR SELECT TO authenticated USING (public.is_member(auth.uid()));
CREATE POLICY "Staff create events" ON public.events FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()) AND created_by = auth.uid());
CREATE POLICY "Owner or admin update events" ON public.events FOR UPDATE TO authenticated USING ((created_by = auth.uid() AND public.is_staff(auth.uid())) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Owner or admin delete events" ON public.events FOR DELETE TO authenticated USING ((created_by = auth.uid() AND public.is_staff(auth.uid())) OR public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.event_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, user_id)
);
CREATE INDEX idx_event_regs_event ON public.event_registrations(event_id);
CREATE INDEX idx_event_regs_user ON public.event_registrations(user_id);
GRANT SELECT, INSERT, DELETE ON public.event_registrations TO authenticated;
GRANT ALL ON public.event_registrations TO service_role;
ALTER TABLE public.event_registrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own regs or staff view" ON public.event_registrations FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_staff(auth.uid()));
CREATE POLICY "Register self" ON public.event_registrations FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND public.is_member(auth.uid()));
CREATE POLICY "Unregister self or admin" ON public.event_registrations FOR DELETE TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Registration counts visible to all members
CREATE OR REPLACE FUNCTION public.event_registration_counts()
RETURNS TABLE(event_id uuid, total bigint) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT event_id, count(*) FROM public.event_registrations
  WHERE public.is_member(auth.uid())
  GROUP BY event_id
$$;

-- ===== Lost & Found =====
CREATE TABLE public.lost_found (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_name text NOT NULL,
  category text NOT NULL,
  description text,
  image_url text,
  location_found text NOT NULL,
  date_found date NOT NULL,
  storage_number text NOT NULL,
  status public.item_status NOT NULL DEFAULT 'available',
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_lost_found_status ON public.lost_found(status, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lost_found TO authenticated;
GRANT ALL ON public.lost_found TO service_role;
ALTER TABLE public.lost_found ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members view items" ON public.lost_found FOR SELECT TO authenticated USING (public.is_member(auth.uid()));
CREATE POLICY "Admins create items" ON public.lost_found FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') AND created_by = auth.uid());
CREATE POLICY "Admins update items" ON public.lost_found FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete items" ON public.lost_found FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.claim_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES public.lost_found(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  student_name text NOT NULL,
  roll_number text NOT NULL,
  phone text NOT NULL,
  reason text NOT NULL,
  status public.claim_status NOT NULL DEFAULT 'pending',
  admin_note text,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (item_id, user_id)
);
CREATE INDEX idx_claims_item ON public.claim_requests(item_id);
CREATE INDEX idx_claims_status ON public.claim_requests(status, created_at DESC);
GRANT SELECT, INSERT, UPDATE ON public.claim_requests TO authenticated;
GRANT ALL ON public.claim_requests TO service_role;
ALTER TABLE public.claim_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own claims or admin view" ON public.claim_requests FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Students submit own claim" ON public.claim_requests FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND status = 'pending' AND public.is_member(auth.uid())
    AND EXISTS (SELECT 1 FROM public.lost_found i WHERE i.id = item_id AND i.status IN ('available','claim_requested')));
CREATE POLICY "Admins review claims" ON public.claim_requests FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ===== Triggers: author names & updated_at =====
CREATE OR REPLACE FUNCTION public.set_notice_author() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN NEW.author_name := public.profile_name(NEW.author_id); RETURN NEW; END; $$;
CREATE TRIGGER trg_notice_author BEFORE INSERT ON public.notices FOR EACH ROW EXECUTE FUNCTION public.set_notice_author();

CREATE OR REPLACE FUNCTION public.set_note_author() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN NEW.uploaded_by_name := public.profile_name(NEW.uploaded_by); RETURN NEW; END; $$;
CREATE TRIGGER trg_note_author BEFORE INSERT ON public.notes FOR EACH ROW EXECUTE FUNCTION public.set_note_author();

CREATE OR REPLACE FUNCTION public.set_assignment_author() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN NEW.created_by_name := public.profile_name(NEW.created_by); RETURN NEW; END; $$;
CREATE TRIGGER trg_assignment_author BEFORE INSERT ON public.assignments FOR EACH ROW EXECUTE FUNCTION public.set_assignment_author();

CREATE OR REPLACE FUNCTION public.touch_updated_at() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END; $$;
CREATE TRIGGER trg_notices_touch BEFORE UPDATE ON public.notices FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_events_touch BEFORE UPDATE ON public.events FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_lost_found_touch BEFORE UPDATE ON public.lost_found FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ===== Triggers: notifications =====
CREATE OR REPLACE FUNCTION public.on_notice_created() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN PERFORM public.notify_students('notice', 'New notice: ' || NEW.title, left(NEW.content, 140), '/notices/' || NEW.id, NEW.author_id); RETURN NEW; END; $$;
CREATE TRIGGER trg_notice_notify AFTER INSERT ON public.notices FOR EACH ROW EXECUTE FUNCTION public.on_notice_created();

CREATE OR REPLACE FUNCTION public.on_note_created() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN PERFORM public.notify_students('note', 'New notes: ' || NEW.subject, NEW.title, '/notes', NEW.uploaded_by, NEW.branch, NEW.semester); RETURN NEW; END; $$;
CREATE TRIGGER trg_note_notify AFTER INSERT ON public.notes FOR EACH ROW EXECUTE FUNCTION public.on_note_created();

CREATE OR REPLACE FUNCTION public.on_assignment_created() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN PERFORM public.notify_students('assignment', 'New assignment: ' || NEW.title, NEW.subject || ' · due ' || to_char(NEW.due_date AT TIME ZONE 'Asia/Kolkata', 'DD Mon, HH12:MI AM'), '/assignments', NEW.created_by, NEW.branch, NEW.semester); RETURN NEW; END; $$;
CREATE TRIGGER trg_assignment_notify AFTER INSERT ON public.assignments FOR EACH ROW EXECUTE FUNCTION public.on_assignment_created();

CREATE OR REPLACE FUNCTION public.on_event_created() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN PERFORM public.notify_students('event', 'New event: ' || NEW.title, NEW.venue || ' · ' || to_char(NEW.event_date, 'DD Mon YYYY'), '/events/' || NEW.id, NEW.created_by); RETURN NEW; END; $$;
CREATE TRIGGER trg_event_notify AFTER INSERT ON public.events FOR EACH ROW EXECUTE FUNCTION public.on_event_created();

CREATE OR REPLACE FUNCTION public.on_claim_created() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.lost_found SET status = 'claim_requested' WHERE id = NEW.item_id AND status = 'available';
  INSERT INTO public.notifications (user_id, type, title, body, link)
  SELECT r.user_id, 'claim', 'New claim request', NEW.student_name || ' requested a claim', '/admin/claims'
  FROM public.user_roles r WHERE r.role = 'admin';
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_claim_created AFTER INSERT ON public.claim_requests FOR EACH ROW EXECUTE FUNCTION public.on_claim_created();

CREATE OR REPLACE FUNCTION public.on_claim_reviewed() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _item text;
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    SELECT item_name INTO _item FROM public.lost_found WHERE id = NEW.item_id;
    IF NEW.status = 'approved' THEN
      UPDATE public.lost_found SET status = 'approved' WHERE id = NEW.item_id;
      UPDATE public.claim_requests SET status = 'rejected', reviewed_at = now()
        WHERE item_id = NEW.item_id AND id <> NEW.id AND status = 'pending';
      INSERT INTO public.notifications (user_id, type, title, body, link)
      VALUES (NEW.user_id, 'claim', 'Claim approved: ' || _item, 'Collect it from the College Office. Bring your ID card.', '/lost-found');
    ELSIF NEW.status = 'rejected' THEN
      INSERT INTO public.notifications (user_id, type, title, body, link)
      VALUES (NEW.user_id, 'claim', 'Claim not approved: ' || _item, COALESCE(NEW.admin_note, 'Contact the College Office for details.'), '/lost-found');
      IF NOT EXISTS (SELECT 1 FROM public.claim_requests WHERE item_id = NEW.item_id AND status IN ('pending','approved') AND id <> NEW.id) THEN
        UPDATE public.lost_found SET status = 'available' WHERE id = NEW.item_id AND status = 'claim_requested';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_claim_reviewed AFTER UPDATE ON public.claim_requests FOR EACH ROW EXECUTE FUNCTION public.on_claim_reviewed();

-- Deadline reminders (run daily by scheduler)
CREATE OR REPLACE FUNCTION public.send_assignment_reminders() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE a record;
BEGIN
  FOR a IN SELECT * FROM public.assignments WHERE NOT reminder_sent AND due_date > now() AND due_date <= now() + interval '48 hours' LOOP
    INSERT INTO public.notifications (user_id, type, title, body, link)
    SELECT p.id, 'deadline', 'Deadline approaching: ' || a.title, a.subject || ' is due ' || to_char(a.due_date AT TIME ZONE 'Asia/Kolkata', 'DD Mon, HH12:MI AM'), '/assignments'
    FROM public.profiles p JOIN public.user_roles r ON r.user_id = p.id AND r.role = 'student'
    WHERE (a.branch IS NULL OR p.branch IS NULL OR p.branch = a.branch)
      AND (a.semester IS NULL OR p.semester IS NULL OR p.semester = a.semester)
      AND NOT EXISTS (SELECT 1 FROM public.assignment_completions c WHERE c.assignment_id = a.id AND c.user_id = p.id);
    UPDATE public.assignments SET reminder_sent = true WHERE id = a.id;
  END LOOP;
END; $$;
REVOKE EXECUTE ON FUNCTION public.send_assignment_reminders() FROM PUBLIC, anon, authenticated;

-- Realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
