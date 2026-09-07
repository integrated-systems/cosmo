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
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-sidebg">
      <div className="w-[340px] rounded bg-appbg border border-bordercol px-7 py-8 text-center">
        {!error ? (
          <>
            <div className="mx-auto mb-4 w-6 h-6 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
            <div className="text-sm text-text">Уншиж байна...</div>
          </>
        ) : (
          <div className="text-sm text-customRed">{error}</div>
        )}
      </div>
    </div>
  );
}
