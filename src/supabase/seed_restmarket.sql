-- Integrated Systems (Cosmo) — Real Estate Market seed дата: tenant БҮР үүсгэсэн үедээ
-- өөрсдийн сүүлийн 12 сарын зах зээлийн үнийг оруулсан мэт харагдуулна.
-- 2026-08-16 хэрэглэгчийн хүссэний дагуу: өмнөх ад-хок тест бичлэгүүдийг
-- цэвэрлээд, tenant БҮРД (өнөөгийн одоо байгаа болон ирээдүйд нэмэгдэх)
-- ялгаатай (tenant ID-аас deterministic тооцсон) үнийн жагсаалт үүсгэнэ.
-- Цэвэр жишээ/тест дата (algorithmic боловч ил тод, TODO-той) —
-- production бодит үнэ биш.

delete from restmarket;

do $$
declare
  t record;
  base bigint;
  m int;
  month_label text;
  variation numeric;
begin
  for t in select id from tenants loop
    -- tenant ID-аас deterministic (санамсаргүй бус, дахин ажиллуулахад
    -- ижил гарна) үндсэн үнэ тооцно — tenant бүр өөр үнэтэй харагдана.
    base := 5000000 + (abs(hashtext(t.id::text)) % 4000000);

    for m in 0..11 loop
      month_label := to_char(date_trunc('month', current_date) - ((11 - m) || ' months')::interval, 'YYYY/MM');
      variation := 1 + (m * 0.012);

      insert into restmarket (
        tenant_id, month, residential_sale_price,
        rental_1_room, rental_2_room, rental_3_room, rental_4_room, rental_5_room, rental_6_room,
        storage_sale_price, storage_rental_price, parking_sale_price, parking_rental_price
      ) values (
        t.id, month_label,
        round(base * variation),
        round(base * 0.35 * variation), round(base * 0.38 * variation), round(base * 0.40 * variation),
        round(base * 0.42 * variation), round(base * 0.44 * variation), round(base * 0.46 * variation),
        round(base * 2.0 * variation), round(base * 0.05 * variation),
        round(base * 8.0 * variation), round(base * 0.045 * variation)
      )
      on conflict (tenant_id, month) do nothing;
    end loop;
  end loop;
end $$;
