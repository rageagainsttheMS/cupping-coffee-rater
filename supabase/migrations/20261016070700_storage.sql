-- Private bucket for review photos: 5 MB, JPEG or WebP, one folder per user.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('review-photos', 'review-photos', false, 5242880, array['image/jpeg', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy "review photos: read when signed in"
  on storage.objects for select to authenticated
  using (bucket_id = 'review-photos');

create policy "review photos: upload to own folder"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'review-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "review photos: delete from own folder"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'review-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
