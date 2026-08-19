import { formatDate } from '../lib/format';
import { summarizeSpots, summarizeVehicles } from '../lib/spotVehicleFormat';
import Modal from './Modal';

// Clientele.jsx-ийн мөр дарахад гарах Инфо модаль — OwnerInfoModal.jsx-ийн
// загварыг дахин ашигласан (Rule of two).
export default function ClientInfoModal({ client, onClose, onEdit }) {
  return (
    <Modal
      open={!!client}
      onClose={onClose}
      title={client ? client.legal_entity_name : ''}
      size="md"
      footer={
        <>
          <button className="ds-btn-secondary">Мессенжер</button>
          <button className="ds-btn-secondary">Төлбөр бүртгэх</button>
          <button className="ds-btn-secondary">ИБаримт</button>
          <button className="ds-btn-secondary">Мэдэгдэл</button>
          <button className="ds-btn-secondary" onClick={() => onEdit(client)}>Засах</button>
          <button className="ds-btn-secondary" onClick={onClose}>Хаах</button>
        </>
      }
    >
      {client && (
        <div>
          <div className="ds-detail-row"><span className="ds-detail-label">Регистр</span><span className="ds-detail-value">{client.reg_no || '—'}</span></div>
          <div className="ds-detail-row"><span className="ds-detail-label">Талбай</span><span className="ds-detail-value">{client.sqm ?? '—'} м²</span></div>
          <div className="ds-detail-row"><span className="ds-detail-label">Өмчийн Улсын бүртгэлийн дугаар</span><span className="ds-detail-value">{client.property_no || '—'}</span></div>
          <div className="ds-detail-row"><span className="ds-detail-label">Гүйцэтгэх удирдлага</span><span className="ds-detail-value">{client.ceo_first_name_last_name || '—'}</span></div>
          <div className="ds-detail-row"><span className="ds-detail-label">Гар утас</span><span className="ds-detail-value">{client.mobile || '—'}</span></div>
          <div className="ds-detail-row"><span className="ds-detail-label">Утас</span><span className="ds-detail-value">{client.phone || '—'}</span></div>
          <div className="ds-detail-row"><span className="ds-detail-label">Имэйл</span><span className="ds-detail-value">{client.email || '—'}</span></div>
          <div className="ds-detail-row"><span className="ds-detail-label">Гэрээ №</span><span className="ds-detail-value">{client.contract_no || '—'}</span></div>
          <div className="ds-detail-row"><span className="ds-detail-label">Гэрээ эхлэх / дуусах</span><span className="ds-detail-value">{client.contract_start ? formatDate(client.contract_start) : '—'} / {client.contract_end ? formatDate(client.contract_end) : '—'}</span></div>
          <div className="ds-detail-row"><span className="ds-detail-label">Зогсоол</span><span className="ds-detail-value">{summarizeSpots(client.parkings)}</span></div>
          <div className="ds-detail-row"><span className="ds-detail-label">Агуулах</span><span className="ds-detail-value">{summarizeSpots(client.storages)}</span></div>
          <div className="ds-detail-row"><span className="ds-detail-label">Машин</span><span className="ds-detail-value">{summarizeVehicles(client.vehicles)}</span></div>
          <div className="pt-2 pb-1">
            <div className="ds-detail-label mb-1">Тайлбар</div>
            <div className="ds-detail-value text-left font-normal whitespace-pre-wrap">{client.note || '—'}</div>
          </div>
        </div>
      )}
    </Modal>
  );
}
