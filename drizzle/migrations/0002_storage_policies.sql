CREATE POLICY "Members read notes files" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'notes' AND public.is_member(auth.uid()));
CREATE POLICY "Staff upload notes files" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'notes' AND public.is_staff(auth.uid()) AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Owner or admin delete notes files" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'notes' AND (owner = auth.uid() OR public.has_role(auth.uid(), 'admin')));

CREATE POLICY "Members read media" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'media' AND public.is_member(auth.uid()));
CREATE POLICY "Members upload own media" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'media' AND public.is_member(auth.uid()) AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Owner update media" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'media' AND owner = auth.uid());
CREATE POLICY "Owner or admin delete media" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'media' AND (owner = auth.uid() OR public.has_role(auth.uid(), 'admin')));