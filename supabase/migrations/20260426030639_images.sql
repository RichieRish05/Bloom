create table public.images (
  id            uuid primary key default gen_random_uuid(),
  public_id     text not null unique,
  secure_url    text not null,
  width         int  not null,
  height        int  not null,
  format        text not null,
  quality_score real,
  uploader_id   uuid not null references auth.users(id),
  created_at    timestamptz not null default now()
);

create table public.album_images (
  album_id  uuid not null references public.albums(id) on delete cascade,
  image_id  uuid not null references public.images(id) on delete cascade,
  primary key (album_id, image_id)
);
