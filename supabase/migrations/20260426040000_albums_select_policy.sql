create policy "users read albums" on public.albums for select using (auth.uid() = created_by);
