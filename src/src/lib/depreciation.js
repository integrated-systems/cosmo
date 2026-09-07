// Элэгдлийн тооцооллын нийтлэг логик — EditFixedAssetModal.jsx-ийн
// "ХОЁР АРГЫН ХАРЬЦУУЛСАН НАРИЙВЧИЛСАН ТООЦООЛОЛ" харьцуулалтад
// ашиглана. Rule of two: ирээдүйд НББ тайлан/автомат журналд элэгдэл
// дахин тооцох шаардлага гарвал ЭНЭ л функцүүдийг дуудна, логик
// хуулбарлахгүй.
//
// Аргачлал 2:
//   - Шугаман элэгдэл (straight_line): сар бүр тэнцүү хэмжээгээр.
//   - Хурдасгасан элэгдэл (accelerated): 2х-балансын бууралтын арга
//     (double declining balance) — сар бүрт үлдэгдэл үнийн дээр
//     тогтмол хувиар тооцож, үлдэгдэл үнэ (salvage value)-c доош
//     орохгүйгээр хязгаарлана.

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

export function computeAcceleratedDepreciation({ purchasePrice, salvageValue, usefulLifeMonths, acquiredDate, asOfDate = new Date() }) {
  const price = Number(purchasePrice) || 0;
  const salvage = Number(salvageValue) || 0;
  const months = Number(usefulLifeMonths) || 0;
  if (months <= 0) return { firstMonth: 0, yearly: 0, accumulated: 0, bookValue: price };

  const monthlyRate = 2 / months;
  const elapsed = Math.min(monthsBetween(acquiredDate, asOfDate), months);

  let bookValue = price;
  let accumulated = 0;
  let firstMonth = 0;
  let yearOneTotal = 0;
  for (let m = 1; m <= months; m += 1) {
    const dep = Math.min(bookValue - salvage, bookValue * monthlyRate);
    if (dep <= 0) break;
    if (m === 1) firstMonth = dep;
    if (m <= 12) yearOneTotal += dep;
    if (m <= elapsed) accumulated += dep;
    bookValue -= dep;
  }
  return { firstMonth, yearly: yearOneTotal, accumulated, bookValue: price - accumulated };
}
