import { formatDate } from '../lib/format';
import { useParams } from 'react-router-dom';
import { summarizeSpots, summarizeVehicles, summarizeGridSpots } from '../lib/spotVehicleFormat';
import { useGridSpots, sumLinkedSqm } from '../hooks/useGridSpots';
import Modal from './Modal';

// Clientele.jsx-ийн мүр дарахад гарах Инфо модаль - OwnerInfoModal.jsx-ийн
// загварыг дахин ашигласан (Rule of two).
// 2026-09-03 ОЛСОН БОДИТ АЛДАА - грид (Конструктор)-оос сонгосон
// Зогсоол/Агуулах/Талбай огт харуулагдаж байгаагүй, "Талбай" (полигон)
// мвр огт байхгүй байсан. "Талбай" нэрийг м2 талбартай зврчилдвхгүй
// байхын тулд "Эзэмшдэг талбай" гэж тусад нь нэрлэв.
export default function ClientInfoModal({ client, onClose, onEdit }) {
  const { hoaId } = useParams();
  const { gridParkingSpots, gridStorageSpots, gridLandPlots } = useGridSpots(hoaId);
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
          <div className="ds-detail-row"><span className="ds-detail-label">Талбай</span><span className="ds-detail-value">{sumLinkedSqm(client.grid_land_plots, gridLandPlots) ?? client.sqm ?? '—'} м²</span></div>
          <div className="ds-detail-row"><span className="ds-detail-label">Өмчийн Улсын бүртгэлийн дугаар</span><span className="ds-detail-value">{client.property_no || '—'}</span></div>
          <div className="ds-detail-row"><span className="ds-detail-label">Гүйцэтгэх удирдлага</span><span className="ds-detail-value">{client.ceo_first_name_last_name || '—'}</span></div>
          <div className="ds-detail-row"><span className="ds-detail-label">Гар утас</span><span className="ds-detail-value">{client.mobile || '—'}</span></div>
          <div className="ds-detail-row"><span className="ds-detail-label">Утас</span><span className="ds-detail-value">{client.phone || '—'}</span></div>
          <div className="ds-detail-row"><span className="ds-detail-label">Имэйл</span><span className="ds-detail-value">{client.email || '—'}</span></div>
          <div className="ds-detail-row"><span className="ds-detail-label">Гэрээ №</span><span className="ds-detail-value">{client.contract_no || '—'}</span></div>
          <div className="ds-detail-row"><span className="ds-detail-label">Гэрээ эхлэх / дуусах</span><span className="ds-detail-value">{client.contract_start ? formatDate(client.contract_start) : '—'} / {client.contract_end ? formatDate(client.contract_end) : '—'}</span></div>
          <div className="ds-detail-row"><span className="ds-detail-label">Зогсоол</span><span className="ds-detail-value">{[summarizeSpots(client.parkings), summarizeGridSpots(client.grid_parkings, gridParkingSpots)].filter((s) => s !== '—').join(', ') || '—'}</span></div>
          <div className="ds-detail-row"><span className="ds-detail-label">Агуулах</span><span className="ds-detail-value">{[summarizeSpots(client.storages), summarizeGridSpots(client.grid_storages, gridStorageSpots)].filter((s) => s !== '—').join(', ') || '—'}</span></div>
          <div className="ds-detail-row"><span className="ds-detail-label">Эзэмшдэг талбай</span><span className="ds-detail-value">{summarizeGridSpots(client.grid_land_plots, gridLandPlots)}</span></div>
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
