-- Integrated Systems (Cosmo) — Real Estate Market seed дата.
-- 2026-08-16 хэрэглэгчийн тодорхой заасны дагуу: жинхэнэ (production) tenant
-- бүр өөрсдийн зах зээлийн судалгааг өөрсдөө хийж оруулна ёстой тул,
-- SUPERSYSADMIN-ийн тест дата ХЭЗЭЭ Ч бүх tenant-д автоматаар нэвтрэх
-- ёсгүй. Иймд ЭНЭ script нь зөвхөн ХОЁР баталгаажсан ТЕСТ tenant ID-д
-- (нэрээр ilike хайлт "Гэрлүг Виста" олдоогүй байсан тул хэрэглэгчийн
-- өгсөн бодит ID-г шууд ашиглав) хязгаарлагдана.

delete from restmarket
where tenant_id in ('2dcdfa20-8cb5-431d-8e9b-24c8d08ebae9', '48413dde-247b-420f-badc-5d09e492b8f1');

do $$
declare
  t_id uuid;
  base bigint;
  m int;
  month_label text;
  variation numeric;
begin
  foreach t_id in array array['2dcdfa20-8cb5-431d-8e9b-24c8d08ebae9'::uuid, '48413dde-247b-420f-badc-5d09e492b8f1'::uuid]
  loop
    base := 5000000 + (abs(hashtext(t_id::text)) % 4000000);

    for m in 0..11 loop
      month_label := to_char(date_trunc('month', current_date) - ((11 - m) || ' months')::interval, 'YYYY/MM');
      variation := 1 + (m * 0.012);

      insert into restmarket (
        tenant_id, month, residential_sale_price,
        rental_1_room, rental_2_room, rental_3_room, rental_4_room, rental_5_room, rental_6_room,
        storage_sale_price, storage_rental_price, parking_sale_price, parking_rental_price
      ) values (
        t_id, month_label,
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
