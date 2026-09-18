import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { summarizeGridSpots, summarizeVehicles, summarizePropertyNos } from '../lib/spotVehicleFormat';
import { useGridSpots } from '../hooks/useGridSpots';
import { supabase } from '../lib/supabaseClient';
import Modal from './Modal';

// 2026-09-13: OwnerInfoModal.jsx-ийн "Зогсоол, агуулах дангаар
// өмчлөгч" табанд зориулсан хувилбар (Rule of two — ижил бүтэц,
// footer товчнууд, зөвхөн Байр/Тоот/Талбай/өмчийн ӨУБД (сууц)
// зэрэг сууцад л хамаарах талбаруудыг арилгаж, ӨУБД Зогсоол/Агуулах
// (мвр бүр eeрийн) талбаруудыг нэмсэн). eмнe нь мвр дээр дарахад
// шууд Засах модал нээгддэг байсныг, Сууц өмчлөгч табтай адил
// эхлээд Инфо модал нээгддэг болгов.
export default function OwnerSpotOnlyInfoModal({ owner, onClose, onEdit }) {
  const { hoaId } = useParams();
  const navigate = useNavigate();
  const [opening, setOpening] = useState(false);
  const { gridParkingSpots, gridStorageSpots } = useGridSpots(hoaId);

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

  function openOfficialNotice() {
    onClose();
    navigate(`/${hoaId}/anndunn`, {
      state: { group: 'spot_only', recipientId: owner.id, firstname: owner.firstname, lastname: owner.lastname },
    });
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
          <button className="ds-btn-secondary" onClick={openOfficialNotice}>Албан мэдэгдэл</button>
          <button className="ds-btn-secondary" onClick={() => onEdit(owner)}>Засах</button>
          <button className="ds-btn-secondary" onClick={onClose}>Хаах</button>
        </>
      }
    >
      {owner && (
        <div>
          <div className="ds-detail-row"><span className="ds-detail-label">Регистрийн дугаар</span><span className="ds-detail-value">{owner.regno || '—'}</span></div>
          <div className="ds-detail-row"><span className="ds-detail-label">Утас</span><span className="ds-detail-value">{owner.phones?.join(', ') || '—'}</span></div>
          <div className="ds-detail-row"><span className="ds-detail-label">Имэйл</span><span className="ds-detail-value">{owner.emails?.join(', ') || '—'}</span></div>
          <div className="ds-detail-row"><span className="ds-detail-label">Зогсоол</span><span className="ds-detail-value">{summarizeGridSpots(owner.grid_parkings, gridParkingSpots)}</span></div>
          <div className="ds-detail-row"><span className="ds-detail-label">ӨУБД Зогсоол</span><span className="ds-detail-value">{summarizePropertyNos(owner.grid_parkings)}</span></div>
          <div className="ds-detail-row"><span className="ds-detail-label">Агуулах</span><span className="ds-detail-value">{summarizeGridSpots(owner.grid_storages, gridStorageSpots)}</span></div>
          <div className="ds-detail-row"><span className="ds-detail-label">ӨУБД Агуулах</span><span className="ds-detail-value">{summarizePropertyNos(owner.grid_storages)}</span></div>
          <div className="ds-detail-row"><span className="ds-detail-label">Машин</span><span className="ds-detail-value">{summarizeVehicles(owner.vehicles)}</span></div>
          <div className="pt-2 pb-1">
            <div className="ds-detail-label mb-1">Тэмдэглэл</div>
            <div className="ds-detail-value text-left font-normal whitespace-pre-wrap">{owner.note || '—'}</div>
          </div>
        </div>
      )}
    </Modal>
  );
}
