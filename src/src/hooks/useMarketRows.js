import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

// DB (snake_case) ⟷ мөр-төвтэй (row-oriented) бүтэц хөрвүүлэлт.
function fromDb(r) {
  return {
    month: r.month,
    residentialSale: r.residential_sale_price,
    rental: [r.rental_1_room, r.rental_2_room, r.rental_3_room, r.rental_4_room, r.rental_5_room, r.rental_6_room],
    storageSale: r.storage_sale_price,
    storageRental: r.storage_rental_price,
    parkingSale: r.parking_sale_price,
    parkingRental: r.parking_rental_price,
  };
}
function toDb(tenantId, row) {
  return {
    tenant_id: tenantId,
    month: row.month,
    residential_sale_price: row.residentialSale,
    rental_1_room: row.rental[0], rental_2_room: row.rental[1], rental_3_room: row.rental[2],
    rental_4_room: row.rental[3], rental_5_room: row.rental[4], rental_6_room: row.rental[5],
    storage_sale_price: row.storageSale,
    storage_rental_price: row.storageRental,
    parking_sale_price: row.parkingSale,
    parking_rental_price: row.parkingRental,
  };
}

// `restmarket` хүснэгэлээс tenant-аар шүүсэн зах зээлийн үнэ унших/бичих —
// Dashboard.jsx БОЛОН RealEstateMarket.jsx хоёулаа ЭНЭ hook-оор дамжуулж
// НЭГ дата эх сурвалж (Supabase, tenant тус бүрд тусдаа) ашиглана. Шинэ
// tenant-д мөр байхгүй тул `rows=[]` (хоосон, өмнөх жишээ дата харагдахгүй).
export function useMarketRows(tenantId) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    setError('');
    const { data, error: err } = await supabase
      .from('restmarket')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('month', { ascending: true });
    if (err) setError(err.message);
    else setRows((data ?? []).map(fromDb));
    setLoading(false);
  }, [tenantId]);

  useEffect(() => { load(); }, [load]);

  async function saveRow(row) {
    const { error: err } = await supabase
      .from('restmarket')
      .upsert(toDb(tenantId, row), { onConflict: 'tenant_id,month' });
    if (err) throw err;
    await load();
  }

  async function deleteRow(month) {
    const { error: err } = await supabase
      .from('restmarket')
      .delete()
      .eq('tenant_id', tenantId)
      .eq('month', month);
    if (err) throw err;
    await load();
  }

  return { rows, loading, error, saveRow, deleteRow };
}
