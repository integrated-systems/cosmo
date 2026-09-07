// Элэгдлийн тооцооллын нийтлэг логик — EditFixedAssetModal.jsx-ийн
// "ХОЁР АРГЫН ХАРЬЦУУЛСАН НАРИЙВЧИЛСАН ТООЦООЛОЛ" харьцуулалтад
// ашиглана. Rule of two: ирээдүйд НББ тайлан/автомат журналд элэгдэл
// дахин тооцох шаардлага гарвал ЭНЭ л функцүүдийг дуудна, логик
// хуулбарлахгүй.
//
// Аргачлал 2:
//   - Шугаман элэгдэл (straight_line): сар бүр тэнцүү хэмжээгээр.
//   - Хурдасгасан элэгдэл (accelerated): бууралтын үлдэгдэл (declining
//     balance) арга, ХЭРЭГЛЭГЧИЙН ГАРААР сонгосон жилийн хувиар
//     (annual_depreciation_rate, жиш 20%) — үлдэгдэл үнэ жил бүр тэр
//     хувиар үржигдэн буурна. 2026-09-07 (6): өмнөх "2/ашиглах хугацаа"
//     (double declining balance) томьёо буруу таамаглал байсныг
//     хэрэглэгчийн зассан жишээгээр (36000₮, 36 сар, 0₮ үлдэгдэлтэй
//     жишээ) орлуулав — Ашиглах хугацаа одоо ЗӨВХӨН Дансны үлдэгдэл үнэ
//     0 болох мвчийг (disposal_date) тооцоход хэрэглэгдэнэ, хурдны
//     коэффициентэд НӨЛӨӨЛӨХГүй.

function monthsBetween(fromDate, toDate) {
  if (!fromDate || !toDate) return 0;
  const from = new Date(fromDate);
  const to = new Date(toDate);
  if (isNaN(from) || isNaN(to) || to <= from) return 0;
  let months = (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
  if (to.getDate() < from.getDate()) months -= 1;
  return Math.max(0, months);
}

export function computeStraightLineDepreciation({ purchasePrice, salvageValue, usefulLifeMonths, acquiredDate, asOfDate = new Date() }) {
  const base = Math.max(0, (Number(purchasePrice) || 0) - (Number(salvageValue) || 0));
  const months = Number(usefulLifeMonths) || 0;
  if (months <= 0) return { monthly: 0, yearly: 0, accumulated: 0, bookValue: Number(purchasePrice) || 0 };

  const monthly = base / months;
  const elapsed = Math.min(monthsBetween(acquiredDate, asOfDate), months);
  const accumulated = monthly * elapsed;
  const bookValue = (Number(purchasePrice) || 0) - accumulated;
  return { monthly, yearly: monthly * 12, accumulated, bookValue };
}

export function computeAcceleratedDepreciation({ purchasePrice, salvageValue, annualDepreciationRate, acquiredDate, asOfDate = new Date() }) {
  const price = Number(purchasePrice) || 0;
  const salvage = Number(salvageValue) || 0;
  const annualRate = Number(annualDepreciationRate) || 0;
  if (annualRate <= 0) return { firstMonth: 0, yearly: 0, accumulated: 0, bookValue: price };

  // Жилийн хувиас сарын дүйцэх коэффициентийг гаргана: үлдэгдэл үнэ
  // жил бүр (1 - хувь)-аар үржигдэн буурдаг тул сар бүрийн коэффициент
  // нь тэрхүү жилийн үржүүлэгчийн 12-р үндэс.
  const monthlyFactor = Math.pow(1 - annualRate / 100, 1 / 12);
  const elapsed = monthsBetween(acquiredDate, asOfDate);

  let bookValue = price;
  let accumulated = 0;
  let firstMonth = 0;
  let yearOneTotal = 0;
  const maxMonths = 1200; // 100 жил — хязгааргүй давталтаас сэргийлэх аюулгүйн хамгаалалт
  for (let m = 1; m <= maxMonths; m += 1) {
    const dep = Math.max(0, Math.min(bookValue - salvage, bookValue * (1 - monthlyFactor)));
    if (dep <= 0) break;
    if (m === 1) firstMonth = dep;
    if (m <= 12) yearOneTotal += dep;
    if (m <= elapsed) accumulated += dep;
    bookValue -= dep;
    if (m > elapsed && bookValue <= salvage) break;
  }
  return { firstMonth, yearly: yearOneTotal, accumulated, bookValue: price - accumulated };
}
