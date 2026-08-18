import Modal from './Modal';

// window.alert() (браузерийн native dialog) орлож, Modal.jsx-той ижил
// дизайн (тэг голд) OK-товчтой мэдэгдэл харуулах модаль. useAlert()
// hook-той хамт ашиглана.
export default function AlertModal({ open, title, message, onClose }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title || 'Мэдэгдэл'}
      size="sm"
      footer={<button className="ds-btn-primary" onClick={onClose}>OK</button>}
    >
      {message}
    </Modal>
  );
}
