// send-monthly-report-news — 2026-09-20. pg_cron-оор өдөр бүр (00:00
// UTC орчимд) дуудагдана. Идэвхтэй ("monthly_report_enabled=true")
// бөгөөд, "monthly_report_day"-нь МОНГОЛЫН ЦАГААР (UTC+8) өнөөдрийн
// сарын өдөртэй тохирсон tenant бүрийг олж, өмнөх сарын орлого,
// зарлагын тайланг "Мэдээ, мэдээлэл" рүү автоматаар (НИЙТЛЭГДСЭН
// төрлөөр) үүсгэнэ. Логик нь NewsFormModal.jsx-ийн
// buildMonthlyReportHtml()-тэй ЯГ ИЖИЛ (хэрэглэгчтэй зөвлөлдсөн
// бүтэц: Нэхэмжилсэн дүн / Нийт орлого (задаргаатай) / Нийт зардал /
// Дансны эхний, эцсийн үлдэгдэл / Хүлээгдэж буй өр төлбөр
// (задаргаатай) / Хуримтлалын санд төвлөрсөн хөрөнгө). Давхардлаас
// сэргийлэхийн тулд, ЯГ ТЭР ГАРЧИГТАЙ мэдээ энэ tenant-д аль хэдийн
// байвал дахин үүсгэхгүй (staff гараар үүсгэсэн ч хамаарна).
import { createClient } from 'jsr:@supabase/supabase-js@2';

const NO_DATA_NOTE = 'Гүйлгээ бүртгэл хараахан ашиглагдаагүй тул мэдээлэл алга';

function fmtMoney(n: number) {
  return Number(n || 0).toLocaleString('mn-MN') + '₮';
}

function htmlToPlainText(html: string) {
  return html
    .replace(/<\/tr>/gi, '\n')
    .replace(/<\/(td|th)>/gi, '  ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

async function fetchAll(query: any) {
  const rows: any[] = [];
  let from = 0;
  const pageSize = 1000;
  while (true) {
    const { data, error } = await query.range(from, from + pageSize - 1);
    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < pageSize) break;
    from += pageSize;
  }
  return rows;
}

async function buildMonthlyReportHtml(supabase: any, hoaId: string, year: number, month: number) {
  const [invoices, unitLayouts] = await Promise.all([
    fetchAll(supabase.from('invoices').select('target_type, target_id, total_amount, status').eq('tenant_id', hoaId).eq('period_year', year).eq('period_month', month)),
    fetchAll(supabase.from('unit_layouts').select('id').eq('tenant_id', hoaId)),
  ]);
  const unitIds = new Set(unitLayouts.map((u: any) => u.id));

  let invoicedTotal = 0;
  let paidUnit = 0, paidSpot = 0, paidClient = 0;
  let sentTotal = 0, overdueTotal = 0;
  invoices.forEach((inv: any) => {
    const amount = Number(inv.total_amount || 0);
    invoicedTotal += amount;
    const bucket = inv.target_type === 'client' ? 'client' : (unitIds.has(inv.target_id) ? 'unit' : 'spot');
    if (inv.status === 'paid') {
      if (bucket === 'unit') paidUnit += amount;
      else if (bucket === 'spot') paidSpot += amount;
      else paidClient += amount;
    } else if (inv.status === 'overdue') {
      overdueTotal += amount;
    } else if (inv.status === 'sent') {
      sentTotal += amount;
    }
  });
  const paidTotal = paidUnit + paidSpot + paidClient;
  const paidPct = invoicedTotal > 0 ? ((paidTotal / invoicedTotal) * 100).toFixed(1) : '0.0';
  const owedTotal = sentTotal + overdueTotal;

  const sectionRow = (label: string) => `<tr><td colspan="2" style="font-weight:bold; padding:10px 4px 4px;">${label}</td></tr>`;
  const dataRow = (label: string, value: string, bold?: boolean) => `<tr><td style="padding:3px 8px;${bold ? ' font-weight:bold;' : ''}">${label}</td><td style="padding:3px 8px; text-align:right;${bold ? ' font-weight:bold;' : ''}">${value}</td></tr>`;
  const noDataRow = () => `<tr><td colspan="2" style="padding:3px 8px; color:#94a3b8; font-style:italic;">${NO_DATA_NOTE}</td></tr>`;

  return `<table style="width:100%; border-collapse:collapse;">
${sectionRow('Нэхэмжилсэн дүн')}
${dataRow('Нийт нэхэмжилсэн дүн', fmtMoney(invoicedTotal), true)}
${sectionRow('Нийт орлого')}
${dataRow('Сууц өмчлөгч', fmtMoney(paidUnit))}
${dataRow('Зогсоол, агуулах дангаар өмчлөгч', fmtMoney(paidSpot))}
${dataRow('Талбай өмчлөгч', fmtMoney(paidClient))}
${dataRow('Нийт орлого', fmtMoney(paidTotal), true)}
${dataRow('Төлбөрийн хувь', `${paidPct}%`)}
${sectionRow('Нийт зардал')}
${noDataRow()}
${sectionRow('Дансны эхний үлдэгдэл')}
${noDataRow()}
${sectionRow('Дансны эцсийн үлдэгдэл')}
${noDataRow()}
${sectionRow('Хүлээгдэж буй нийт өр төлбөр')}
${dataRow('Энэ сарын төлөгдөөгүй', fmtMoney(sentTotal))}
${dataRow('Хугацаа хэтэрсэн', fmtMoney(overdueTotal))}
${dataRow('Нийт өр төлбөр', fmtMoney(owedTotal), true)}
${sectionRow('Хуримтлалын санд төвлөрсөн хөрөнгө')}
${noDataRow()}
</table>`;
}

Deno.serve(async (_req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Монголын цагаар (UTC+8) өнөөдрийн сарын eдрийг тооцоолно.
    const now = new Date();
    const mnNow = new Date(now.getTime() + 8 * 60 * 60 * 1000);
    const todayDay = mnNow.getUTCDate();

    let prevMonth = mnNow.getUTCMonth();
    let prevYear = mnNow.getUTCFullYear();
    if (prevMonth === 0) { prevMonth = 12; prevYear -= 1; }

    const { data: settingsRows } = await supabase
      .from('fin_settings')
      .select('tenant_id')
      .eq('monthly_report_enabled', true)
      .eq('monthly_report_day', todayDay);

    const results = [];
    for (const row of settingsRows || []) {
      const hoaId = row.tenant_id;
      const title = `${prevYear} оны ${prevMonth}-р сарын орлого, зарлагын тайлан`;

      // Давхардлаас сэргийлэлт — ЯГ ТЭР ГАРЧИГТАЙ мэдээ энэ tenant-д
      // аль хэдийн байвал (staff гараар үүсгэсэн ч хамаарна) дахин
      // үүсгэхгүй.
      const { data: existing } = await supabase.from('news').select('id').eq('tenant_id', hoaId).eq('title', title).limit(1);
      if (existing && existing.length > 0) { results.push({ hoaId, skipped: 'already_exists' }); continue; }

      const bodyHtml = await buildMonthlyReportHtml(supabase, hoaId, prevYear, prevMonth);
      const { error: insertError } = await supabase.from('news').insert({
        tenant_id: hoaId,
        title,
        category: 'Сарын орлого, зарлагын тайлан',
        body_html: bodyHtml,
        body_text: htmlToPlainText(bodyHtml),
        status: 'published',
      });
      if (insertError) { results.push({ hoaId, error: insertError.message }); continue; }
      results.push({ hoaId, created: true });
    }

    return new Response(JSON.stringify({ processed: results.length, results }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
