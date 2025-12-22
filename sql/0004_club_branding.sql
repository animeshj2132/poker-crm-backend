-- Club branding additions (video, color scheme, gradient)
alter table if exists public.clubs
  add column if not exists video_url text,
  add column if not exists skin_color text,
  add column if not exists gradient text;

