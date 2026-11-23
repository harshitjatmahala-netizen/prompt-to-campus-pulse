CREATE TABLE public.achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  category text NOT NULL CHECK (category IN ('academic', 'hackathon', 'sports', 'research', 'certification', 'competition', 'cultural', 'other')),
  description text NOT NULL,
  achievement_date date NOT NULL,
  certificate_path text,
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.achievements TO authenticated;
GRANT ALL ON public.achievements TO service_role;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members view achievements" ON public.achievements FOR SELECT TO authenticated USING (public.is_member(auth.uid()));
CREATE POLICY "Staff publish achievements" ON public.achievements FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()) AND created_by = auth.uid());
CREATE POLICY "Staff update achievements" ON public.achievements FOR UPDATE TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Staff delete achievements" ON public.achievements FOR DELETE TO authenticated USING (public.is_staff(auth.uid()));
CREATE INDEX achievements_date_idx ON public.achievements (achievement_date DESC);

CREATE TABLE public.user_preferences (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  appearance_theme text NOT NULL DEFAULT 'system' CHECK (appearance_theme IN ('light', 'dark', 'system')),
  accent_color text NOT NULL DEFAULT 'blue' CHECK (accent_color IN ('blue', 'purple', 'green', 'orange', 'red')),
  interface_density text NOT NULL DEFAULT 'comfortable' CHECK (interface_density IN ('compact', 'comfortable')),
  motion_preference text NOT NULL DEFAULT 'full' CHECK (motion_preference IN ('full', 'reduced')),
  font_size text NOT NULL DEFAULT 'medium' CHECK (font_size IN ('small', 'medium', 'large')),
  tour_completed boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.user_preferences TO authenticated;
GRANT ALL ON public.user_preferences TO service_role;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own preferences select" ON public.user_preferences FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Own preferences insert" ON public.user_preferences FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Own preferences update" ON public.user_preferences FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

ALTER TABLE public.notification_preferences ADD COLUMN system_update boolean NOT NULL DEFAULT true;
CREATE OR REPLACE FUNCTION public.wants_notification(_user uuid, _type text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((
    SELECT CASE _type
      WHEN 'notice' THEN np.notice WHEN 'note' THEN np.note WHEN 'assignment' THEN np.assignment
      WHEN 'deadline' THEN np.deadline WHEN 'event' THEN np.event WHEN 'claim' THEN np.claim
      WHEN 'paper' THEN np.paper WHEN 'system_update' THEN np.system_update ELSE true END
    FROM public.notification_preferences np WHERE np.user_id = _user), true);
$$;
REVOKE EXECUTE ON FUNCTION public.wants_notification(uuid, text) FROM PUBLIC, anon, authenticated;