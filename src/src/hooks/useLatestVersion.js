import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

// 2026-09-27 (93): Sidebar.jsx (доод инфо карт) БОЛОН AboutProgram.jsx
// ("Change Log" таб-ын "Одоогийн хувилбар" карт) хоёул ЯГ ИЖИЛ утга
// (хамгийн сүүлийн НИЙТЛЭГДСЭН Change Log-ийн version_label) харуулах
// шаардлагатай тул НЭГ дундын hook болгов (Rule of two/three) —
// хэрэглэгч Change Log-д шинэ хувилбар нэмж НИЙТЛЭХ бүрд, Sidebar
// ч мөн автоматаар шинэчлэгдэнэ (хоёр газарт тус тусад нь гараар
// eeрчлөх шаардлагагүй).
export function useLatestVersion() {
  const [version, setVersion] = useState(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    const { data } = await supabase.from('program_docs').select('version_label,is_published,created_at')
      .eq('doc_type', 'changelog')
      .order('created_at', { ascending: false });
    const latestPublished = (data || []).find((d) => d.is_published !== false && d.version_label);
    setVersion(latestPublished?.version_label || null);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  return { version, loading, reload: load };
}
