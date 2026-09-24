import { extractGridItemUuid } from './spotVehicleFormat';

// 2026-09-20 (61): Invoice.jsx, Property.jsx (getLinkBorderColor)-д
// дараагаар үүссэн, гурав дахь газарт (RecordPaymentModal.jsx) бас
// шаардлагатай болсон тул, эндээс шинэчлэн гаргав (Rule of two).
// Өмчлөгч/клиент бүртгэлийн ТОГТВОРТОЙ target_id (invoices.target_id-
// тэй ЯГ ТОХИРОХ ёстой): (1) сууц (unit_layouts) тохирвол ТЭР мөрийн
// id, (2) үгүй бол зогсоол/агуулахын грид UUID, (3) үгүй бол raw id.
export function computeOwnerTargetId(owner, unitLayouts) {
  const matchedUnit = owner.building_no
    ? (unitLayouts || []).find((u) => u.building_no === owner.building_no && u.floor === owner.floor && u.door_no === owner.door_no)
    : null;
  if (matchedUnit) return matchedUnit.id;
  if (owner.has_grid_parking && Array.isArray(owner.grid_parkings) && owner.grid_parkings.length > 0) {
    const uuid = extractGridItemUuid(owner.grid_parkings[0]?.id);
    if (uuid) return uuid;
  }
  if (owner.has_grid_storage && Array.isArray(owner.grid_storages) && owner.grid_storages.length > 0) {
    const uuid = extractGridItemUuid(owner.grid_storages[0]?.id);
    if (uuid) return uuid;
  }
  return owner.id;
}

// 2026-09-23 (77): НББ үлдэгдэл засвар — Зогсоол/агуулах дангаар
// өмчлөгчдийн авлагыг Сууц өмчлөгчдийн авлагатай (1210) андуурч
// байсныг олов. Энэ функц (Invoice.jsx, RecordPaymentModal.jsx хоёр
// газарт ХЭРЭГТЭЙ болсон — Rule of two) тухайн owner мөр бодит СУУЦ
// (unit_layouts-тай тохирсон) эсэхийг заана — үгүй бол дан зогсоол/
// агуулах өмчлөгч гэсэн үг, receivable-ийг 1240 (Бусад авлага) руу
// чиглүүлэх ёстой.
export function isOwnerUnit(owner, unitLayouts) {
  if (!owner.building_no) return false;
  return !!(unitLayouts || []).find((u) => u.building_no === owner.building_no && u.floor === owner.floor && u.door_no === owner.door_no);
}

// 2026-09-23 (81): Хянах самбарын "Сүүлийн гүйлгээ"/"Төлбөрийн eртэй"
// картуудад invoices.target_id-ыг ЭРГүүлж (reverse) харгалзах өмчлөгч/
// талбайн нэр рүү буцаах шаардлагатай болов. computeOwnerTargetId()/
// computeClientTargetId() нь owner→id чиглэлээр ажилладаг тул, энд
// БүХ owners/clientele-ийг тойрч, target_id → {name, sub} map үүсгэнэ
// (Rule of two — Invoice.jsx-ийн matchedUnit логиктой нийцүүлэв).
export function buildPayerNameMap(owners, clientele, unitLayouts) {
  const map = new Map();
  (owners || []).forEach((o) => {
    const targetId = computeOwnerTargetId(o, unitLayouts);
    const isUnit = isOwnerUnit(o, unitLayouts);
    const name = `${o.lastname || ''} ${o.firstname || ''}`.trim() || 'Нэргүй';
    const sub = isUnit ? `${o.building_no}-${o.floor}-${o.door_no}` : 'Зогсоол/агуулах';
    map.set(targetId, { name, sub, kind: isUnit ? 'unit' : 'spot' });
  });
  (clientele || []).forEach((c) => {
    const targetId = computeClientTargetId(c);
    map.set(targetId, { name: c.legal_entity_name || 'Нэргүй', sub: 'Талбай өмчлөгч', kind: 'client' });
  });
  return map;
}

// Талбай өмчлөгч (client)-ийн тогтвортой target_id: (1) талбайн
// полигон (grid_land_plots) тохирвол ТЭР UUID, (2) үгүй бол зогсоол,
// (3) үгүй бол агуулах, (4) үгүй бол raw id.
export function computeClientTargetId(client) {
  if (client.has_grid_land && Array.isArray(client.grid_land_plots) && client.grid_land_plots.length > 0) {
    const uuid = extractGridItemUuid(client.grid_land_plots[0]?.id);
    if (uuid) return uuid;
  }
  if (client.has_grid_parking && Array.isArray(client.grid_parkings) && client.grid_parkings.length > 0) {
    const uuid = extractGridItemUuid(client.grid_parkings[0]?.id);
    if (uuid) return uuid;
  }
  if (client.has_grid_storage && Array.isArray(client.grid_storages) && client.grid_storages.length > 0) {
    const uuid = extractGridItemUuid(client.grid_storages[0]?.id);
    if (uuid) return uuid;
  }
  return client.id;
}
