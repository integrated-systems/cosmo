import Modal from './Modal';

// 2026-08-16 хэрэглэгчийн заасны дагуу: window.confirm() (браузерийн native
// dialog, дэлгэцний дээд ирмэгт гардаг) орлож, Modal.jsx-той ижил дизайн
// (дэлгэцний босоо+хэвтээ тэнхлэгийн дагуу ТЭГ ГОЛД) баталгаажуулах модаль.
// useConfirm() hook-той хамт ашиглана — өөрөө шууд дуудахгүй.
export default function ConfirmModal({ open, message, onConfirm, onCancel }) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title="Баталгаажуулах"
      size="sm"
      footer={
        <>
          <button className="ds-btn-secondary" onClick={onCancel}>Үгүй</button>
          <button className="ds-btn-primary" onClick={onConfirm}>Тийм</button>
        </>
      }
    >
      {message}
    </Modal>
  );
}
