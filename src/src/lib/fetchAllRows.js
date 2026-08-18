// Supabase/PostgREST анхдагчаар НЭГ хүсэлтэд буцаах мөрийн тоог
// хязгаарладаг (project-ийн тохиргооноос хамаарч ихэвчлэн ~1000). Олон
// байр/давхар үүссэнээр `unit_layouts` мөрийн тоо энэ хязгаараас
// давахад дата хэсэгчлэн (заримдаа огтхон ч) алга болж харагддаг байсан
// ЧУХАЛ алдааг эндээс олов. Энэ функц `.range()`-ээр хуудаслан
// ДАВТААД дуудаж, бүх мөрийг бүрэн цуглуулна.
export async function fetchAllRows(queryFactory, pageSize = 1000) {
  let allRows = [];
  let from = 0;
  while (true) {
    const { data, error } = await queryFactory().range(from, from + pageSize - 1);
    if (error) return { data: null, error };
    allRows = allRows.concat(data ?? []);
    if (!data || data.length < pageSize) break;
    from += pageSize;
  }
  return { data: allRows, error: null };
}
