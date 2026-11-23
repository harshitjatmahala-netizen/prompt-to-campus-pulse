CREATE OR REPLACE FUNCTION public.achievement_wall()
RETURNS TABLE (
  achievement_id uuid,
  student_id uuid,
  title text,
  category text,
  description text,
  achievement_date date,
  certificate_path text,
  created_at timestamptz,
  student_name text,
  roll_number text,
  branch text,
  avatar_url text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT a.id, a.student_id, a.title, a.category, a.description, a.achievement_date,
         a.certificate_path, a.created_at, p.full_name, p.roll_number, p.branch, p.avatar_url
  FROM public.achievements a
  JOIN public.profiles p ON p.id = a.student_id
  WHERE public.is_member(auth.uid())
  ORDER BY a.achievement_date DESC, a.created_at DESC
$$;
REVOKE ALL ON FUNCTION public.achievement_wall() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.achievement_wall() TO authenticated;

CREATE OR REPLACE FUNCTION public.faculty_directory()
RETURNS TABLE (
  id uuid,
  full_name text,
  email text,
  branch text,
  avatar_url text,
  role public.app_role
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.full_name, p.email, p.branch, p.avatar_url, chosen.role
  FROM public.profiles p
  JOIN LATERAL (
    SELECT r.role
    FROM public.user_roles r
    WHERE r.user_id = p.id AND r.role IN ('faculty', 'admin')
    ORDER BY CASE r.role WHEN 'admin' THEN 1 ELSE 2 END
    LIMIT 1
  ) chosen ON true
  WHERE public.is_member(auth.uid()) AND p.profile_completed
  ORDER BY p.full_name
$$;
REVOKE ALL ON FUNCTION public.faculty_directory() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.faculty_directory() TO authenticated;