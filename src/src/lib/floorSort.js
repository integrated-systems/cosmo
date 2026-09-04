// 2026-09-04: Давхаргын нэрсийг (B1, B2, F1, F2 гэх мэт) "хамгийн дээд
// давхарга зүүн захад, хамгийн доод давхарга баруун захад" гэсэн
// хэрэглэгчийн хүссэн дарааллаар эрэмбэлнэ. "F" (Floor, газрын тэнхэрт
// өөрвөрвөр давхарга) - тоо их байх тусам өндөр тул эхэнд, буурах
// дарааллаар. "B" (Basement, гүнзгийрэх давхарга) - тоо бага байх
// тусам өндөр (гадаргад ойр) тул F давхаргуудын ДАРАА, өсх өрд дарааллаар.
export function floorSortKey(fk) {
  const m = /^([A-Za-z]+)(\d+)$/.exec(fk || '');
  if (!m) return [2, 0, fk || ''];
  const prefix = m[1].toUpperCase();
  const n = parseInt(m[2], 10);
  if (prefix === 'F') return [0, -n, fk];
  if (prefix === 'B') return [1, n, fk];
  return [2, 0, fk];
}

export function sortFloors(list) {
  return [...(list || [])].sort((a, b) => {
    const ka = floorSortKey(a), kb = floorSortKey(b);
    if (ka[0] !== kb[0]) return ka[0] - kb[0];
    if (ka[1] !== kb[1]) return ka[1] - kb[1];
    return String(ka[2]).localeCompare(String(kb[2]));
  });
}
