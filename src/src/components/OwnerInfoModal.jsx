import { formatDate } from '../lib/format';
import { summarizeSpots, summarizeVehicles } from '../lib/ownersFormat';
import Modal from './Modal';

// Owners.jsx-ийн мөр дарахад гарах Инфо модаль — 2026-08-15 хэрэглэгчийн
// заасны дагуу тусдаа компонент болгов (Rule of two).
export default function OwnerInfoModal({ owner, onClose, onEdit }) {
  return (
    <Modal
      open={!!owner}
      onClose={onClose}
      title={owner ? `${owner.firstname} ${owner.lastname}` : ''}
      size="md"
      footer={
        <>
          <button className="ds-btn-secondary">CC center</button>
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
          <div className="ds-detail-row"><span className="ds-detail-label">Байр / Тоот</span><span className="ds-detail-value">{owner.building_no ?? '—'} / {owner.door_no ?? '—'}</span></div>
          <div className="ds-detail-row"><span className="ds-detail-label">Талбай</span><span className="ds-detail-value">{owner.sqm ?? '—'} м²</span></div>
          <div className="ds-detail-row"><span className="ds-detail-label">өмчийн Улсын бүртгэлийн дугаар</span><span className="ds-detail-value">{owner.cadastral_no || '—'}</span></div>
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
