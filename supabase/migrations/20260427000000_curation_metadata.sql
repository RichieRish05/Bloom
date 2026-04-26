alter table public.images
  add column tags text[] not null default '{}',
  add column phash text,
  add column social_score real;
