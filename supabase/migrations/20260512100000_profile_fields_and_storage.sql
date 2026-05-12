-- ============================================================
-- Migration 2 — Campos de perfil + Storage para fotos
-- ============================================================

-- Adicionar campos faltantes ao profiles (full_name e phone já existem do schema inicial)
-- avatar_url novo
alter table public.profiles
  add column if not exists avatar_url text;

-- ============================================================
-- STORAGE BUCKET para avatares
-- ============================================================
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Policies de storage: utilizador pode upload/update/delete o seu próprio avatar
-- O caminho do ficheiro segue a convenção `{user_id}/avatar.{ext}`

drop policy if exists "avatars_select_all" on storage.objects;
create policy "avatars_select_all"
  on storage.objects for select
  using (bucket_id = 'avatars');

drop policy if exists "avatars_insert_own" on storage.objects;
create policy "avatars_insert_own"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars_update_own" on storage.objects;
create policy "avatars_update_own"
  on storage.objects for update
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars_delete_own" on storage.objects;
create policy "avatars_delete_own"
  on storage.objects for delete
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
