import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

// 2026-09-07 (12): /a/{barcode} — QR-ийн шошгон дээр байрлах БОГИНО
// холбоос (tenant UUID агуулаагүй тул QR-ийн модулийн тоог их
// хэмжээгээр цөөрүүлж, thermal хэвлэлтэд илүү тэсвэртэй болгосон).
// Баркод бол "{СӨХ-ны регистрийн дугаар}-{дэс дугаар}" хэлбэртэй тул
// зүүн хэсгээс нь регистрийн дугаарыг гаргаж авч, org_report_info-с
// tenant_id-г олж, дараа нь бүтэн /{hoaId}/fixedassets?asset={barcode}
// route руу шилжүүлнэ (Rule of two — tenant-ыг дахин encode хийхгүй,
// байгаа мэдээллээс дахин гаргаж авна).
export default function AssetShortLink() {
  const { barcode } = useParams();
  const navigate = useNavigate();
  const [error, setError] = useState('');

  useEffect(() => {
    if (!barcode) return;
    const regNo = barcode.split('-')[0];
    if (!regNo) { setError('Баркод буруу байна.'); return; }

    supabase.from('org_report_info').select('tenant_id').eq('reg_no', regNo).maybeSingle().then(({ data, error: err }) => {
      if (err || !data) {
        setError('Энэ баркодтой холбоотой хөрөнгө олдсонгүй. Та системд нэвтэрсэн эсэхээ шалгана уу.');
        return;
      }
      navigate(`/${data.tenant_id}/fixedassets?asset=${encodeURIComponent(barcode)}`, { replace: true });
    });
  }, [barcode, navigate]);

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#94a3b8', fontSize: 14, textAlign: 'center', padding: 24 }}>
      {error || 'Уншиж байна...'}
    </div>
  );
}
