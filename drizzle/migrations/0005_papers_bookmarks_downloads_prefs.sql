CREATE TYPE public.exam_type AS ENUM ('mid_sem', 'end_sem');

CREATE TABLE public.question_papers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject text NOT NULL,
  branch text NOT NULL,
  semester integer NOT NULL,
  exam_type public.exam_type NOT NULL DEFAULT 'end_sem',
  academic_year text NOT NULL,
  file_path text NOT NULL,
  file_name text NOT NULL,
  file_size bigint,
  uploaded_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  uploaded_by_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.question_papers TO authenticated;
GRANT ALL ON public.question_papers TO service_role;
ALTER TABLE public.question_papers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members view papers" ON public.question_papers FOR SELECT TO authenticated USING (public.is_member(auth.uid()));
CREATE POLICY "Staff upload papers" ON public.question_papers FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()) AND uploaded_by = auth.uid());
CREATE POLICY "Owner or admin update papers" ON public.question_papers FOR UPDATE TO authenticated USING ((uploaded_by = auth.uid() AND public.is_staff(auth.uid())) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Owner or admin delete papers" ON public.question_papers FOR DELETE TO authenticated USING ((uploaded_by = auth.uid() AND public.is_staff(auth.uid())) OR public.has_role(auth.uid(), 'admin'));
CREATE INDEX question_papers_created_idx ON public.question_papers (created_at DESC);

CREATE OR REPLACE FUNCTION public.set_paper_author() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN NEW.uploaded_by_name := public.profile_name(NEW.uploaded_by); RETURN NEW; END; $$;
CREATE TRIGGER trg_paper_author BEFORE INSERT ON public.question_papers FOR EACH ROW EXECUTE FUNCTION public.set_paper_author();

CREATE OR REPLACE FUNCTION public.on_paper_created() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN PERFORM public.notify_students('paper', 'New question paper: ' || NEW.subject,
  (CASE WHEN NEW.exam_type = 'mid_sem' THEN 'Mid Semester' ELSE 'End Semester' END) || ' · ' || NEW.academic_year,
  '/papers', NEW.uploaded_by, NEW.branch, NEW.semester); RETURN NEW; END; $$;
CREATE TRIGGER trg_paper_notify AFTER INSERT ON public.question_papers FOR EACH ROW EXECUTE FUNCTION public.on_paper_created();
REVOKE EXECUTE ON FUNCTION public.set_paper_author() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.on_paper_created() FROM PUBLIC, anon, authenticated;

CREATE TABLE public.bookmarks (
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('notice', 'note', 'event', 'paper')),
  item_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, kind, item_id)
);
GRANT SELECT, INSERT, DELETE ON public.bookmarks TO authenticated;
GRANT ALL ON public.bookmarks TO service_role;
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own bookmarks select" ON public.bookmarks FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Own bookmarks insert" ON public.bookmarks FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND public.is_member(auth.uid()));
CREATE POLICY "Own bookmarks delete" ON public.bookmarks FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE TABLE public.downloads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('note', 'paper')),
  item_id uuid NOT NULL,
  title text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.downloads TO authenticated;
GRANT ALL ON public.downloads TO service_role;
ALTER TABLE public.downloads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own downloads select" ON public.downloads FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Own downloads insert" ON public.downloads FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND public.is_member(auth.uid()));
CREATE POLICY "Own downloads delete" ON public.downloads FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE INDEX downloads_user_idx ON public.downloads (user_id, created_at DESC);

CREATE TABLE public.notification_preferences (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  notice boolean NOT NULL DEFAULT true,
  note boolean NOT NULL DEFAULT true,
  assignment boolean NOT NULL DEFAULT true,
  deadline boolean NOT NULL DEFAULT true,
  event boolean NOT NULL DEFAULT true,
  claim boolean NOT NULL DEFAULT true,
  paper boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.notification_preferences TO authenticated;
GRANT ALL ON public.notification_preferences TO service_role;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own prefs select" ON public.notification_preferences FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Own prefs insert" ON public.notification_preferences FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Own prefs update" ON public.notification_preferences FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.wants_notification(_user uuid, _type text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((
    SELECT CASE _type
      WHEN 'notice' THEN np.notice WHEN 'note' THEN np.note WHEN 'assignment' THEN np.assignment
      WHEN 'deadline' THEN np.deadline WHEN 'event' THEN np.event WHEN 'claim' THEN np.claim
      WHEN 'paper' THEN np.paper ELSE true END
    FROM public.notification_preferences np WHERE np.user_id = _user), true);
$$;
REVOKE EXECUTE ON FUNCTION public.wants_notification(uuid, text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.notify_students(_type text, _title text, _body text, _link text, _exclude uuid, _branch text DEFAULT NULL, _semester int DEFAULT NULL)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO public.notifications (user_id, type, title, body, link)
  SELECT p.id, _type, _title, _body, _link
  FROM public.profiles p
  JOIN public.user_roles r ON r.user_id = p.id AND r.role = 'student'
  WHERE p.id IS DISTINCT FROM _exclude
    AND (_branch IS NULL OR p.branch IS NULL OR p.branch = _branch)
    AND (_semester IS NULL OR p.semester IS NULL OR p.semester = _semester)
    AND public.wants_notification(p.id, _type);
$$;
REVOKE EXECUTE ON FUNCTION public.notify_students(text, text, text, text, uuid, text, int) FROM PUBLIC, anon, authenticated;

ALTER TABLE public.notices ADD COLUMN event_date date;
COMMENT ON COLUMN public.notices.event_date IS 'Optional date the notice applies to (holiday/exam) shown on the calendar';