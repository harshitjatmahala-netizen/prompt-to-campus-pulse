DROP POLICY IF EXISTS "Anyone can read allowed domains" ON public.allowed_domains;
REVOKE SELECT ON public.allowed_domains FROM anon, authenticated;