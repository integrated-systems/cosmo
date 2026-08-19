-- Integrated Systems (Cosmo) — "Vзсэн" тоолуур (view_count) бодитоор
-- нэмэгддэг байхгvй байсныг 2026-08-19 хэрэглэгч заав. Клиент талаас
-- шууд "select-then-update" хийвэл race condition vvсэх магадлалтай тул
-- атом (server-side) increment RPC функц vvсгэв.
create or replace function increment_news_view(p_id uuid)
returns void
language sql
as $$
  update news set view_count = view_count + 1 where id = p_id;
$$;
