import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { formatDate } from '../lib/format';
import { summarizeSpots, summarizeVehicles, formatUnitCode } from '../lib/ownersFormat';
import { supabase } from '../lib/supabaseClient';
import Modal from './Modal';

// Owners.jsx-ийн мөр дарахад гарах Инфо модаль — 2026-08-15 хэрэглэгчийн
// заасны дагуу тусдаа компонент болгов (Rule of two).
// 2026-08-19: "Байр / Тоот" мврийг EditOwnerModal-ийн Тоот dropdown-той
// ЯГ ИЖИЛ форматтай (formatUnitCode, структур-мэдрэмтгий) болгож
// зассан — өмнө нь давхар үгүй, падинг үгүй буруу формат байсан.
// 2026-08-19 (2): "Мессенжер" товчийг ажилд оруулав — тухайн өмчлөгчид
// msgr_list мвр байгаа эсэхийг шалгаж, байхгүй бол шинээр үүсгээд,
// /msgr хуудас руу тэр харилцан ярианд шууд орсон байдлаар шилжүүлнэ.
export default function OwnerInfoModal({ owner, unitLayouts = [], onClose, onEdit }) {
  const { hoaId } = useParams();
  const navigate = useNavigate();
  const [opening, setOpening] = useState(false);
  const layoutRow = owner && unitLayouts.find(
    (u) => u.building_no === owner.building_no && u.floor === owner.floor && u.door_no === owner.door_no
  );
  const unitCode = owner
    ? formatUnitCode(owner.building_no, layoutRow?.structure_type, owner.floor, layoutRow?.entrance_no, owner.door_no)
    : '';

  async function openMessenger() {
    if (!owner || opening) return;
    setOpening(true);
    const { data: existing } = await supabase
      .from('msgr_list').select('id').eq('tenant_id', hoaId).eq('owner_id', owner.id).maybeSingle();
    let listId = existing?.id;
    if (!listId) {
      const { data: created, error } = await supabase
        .from('msgr_list').insert({ tenant_id: hoaId, owner_id: owner.id }).select('id').single();
      if (error) { window.alert(error.message); setOpening(false); return; }
      listId = created.id;
    }
    setOpening(false);
    onClose();
    navigate(`/${hoaId}/msgr?list=${listId}`);
  }

  return (
    <Modal
      open={!!owner}
      onClose={onClose}
      title={owner ? `${owner.firstname} ${owner.lastname}` : ''}
      size="md"
      footer={
        <>
          <button className="ds-btn-secondary" onClick={openMessenger} disabled={opening}>Мессенжер</button>
          <button className="ds-btn-secondary">Төлбөр бүртгэх</button>
          <button className="ds-btn-secondary">ИБаримт</button>
          <button className="ds-btn-secondary">Мэдэгдэл</button>
          <button className="ds-btn-secondary" onClick={() => onEdit(owner)}>Засах</button>
          <button className="ds-btn-secondary" onClick={onClose}>Хаах</button>
        </>
      }
    >
      {owner && (
        <div>
          <div className="ds-detail-row"><span className="ds-detail-label">Байр / Тоот</span><span className="ds-detail-value">{unitCode || '—'}</span></div>
          <div className="ds-detail-row"><span className="ds-detail-label">Талбай</span><span className="ds-detail-value">{owner.sqm ?? '—'} м²</span></div>
          <div className="ds-detail-row"><span className="ds-detail-label">Өмчийн Улсын бүртгэлийн дугаар</span><span className="ds-detail-value">{owner.property_no || '—'}</span></div>
          <div className="ds-detail-row"><span className="ds-detail-label">Утас</span><span className="ds-detail-value">{owner.phones?.join(', ') || '—'}</span></div>
          <div className="ds-detail-row"><span className="ds-detail-label">Имэйл</span><span className="ds-detail-value">{owner.emails?.join(', ') || '—'}</span></div>
          <div className="ds-detail-row"><span className="ds-detail-label">өмчлөх огноо</span><span className="ds-detail-value">{owner.own_date ? formatDate(owner.own_date) : '—'}</span></div>
          <div className="ds-detail-row"><span className="ds-detail-label">Ам бүл</span><span className="ds-detail-value">{owner.people_count ?? '—'}</span></div>
          <div className="ds-detail-row"><span className="ds-detail-label">0-6 / 6-18 нас</span><span className="ds-detail-value">{owner.child_0_5 ?? 0} / {owner.child_6_18 ?? 0}</span></div>
          <div className="ds-detail-row"><span className="ds-detail-label">Зогсоол</span><span className="ds-detail-value">{summarizeSpots(owner.parkings)}</span></div>
          <div className="ds-detail-row"><span className="ds-detail-label">Агуулах</span><span className="ds-detail-value">{summarizeSpots(owner.storages)}</span></div>
          <div className="ds-detail-row"><span className="ds-detail-label">Машин</span><span className="ds-detail-value">{summarizeVehicles(owner.vehicles)}</span></div>
          <div className="pt-2 pb-1">
            <div className="ds-detail-label mb-1">Тайлбар</div>
            <div className="ds-detail-value text-left font-normal whitespace-pre-wrap">{owner.note || '—'}</div>
          </div>
        </div>
      )}
    </Modal>
  );
}
