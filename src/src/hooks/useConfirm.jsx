import { useCallback, useRef, useState } from 'react';
import ConfirmModal from '../components/ConfirmModal';

// window.confirm()-ийг Cosmo дизайнтай Modal-аар орлуулах hook. Ашиглах
// байдал: `const { confirm, ConfirmDialog } = useConfirm();` дараа нь
// `if (!(await confirm('...'))) return;` гэж бичээд компонентын
// return-ийн доторх аль нэг газарт `<ConfirmDialog />`-г нэг л удаа
// байрлуулна.
export function useConfirm() {
  const [state, setState] = useState({ open: false, message: '' });
  const resolver = useRef(null);

  const confirm = useCallback((message) => {
    setState({ open: true, message });
    return new Promise((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  function handleConfirm() {
    setState((s) => ({ ...s, open: false }));
    resolver.current?.(true);
  }
  function handleCancel() {
    setState((s) => ({ ...s, open: false }));
    resolver.current?.(false);
  }

  const ConfirmDialog = () => (
    <ConfirmModal open={state.open} message={state.message} onConfirm={handleConfirm} onCancel={handleCancel} />
  );

  return { confirm, ConfirmDialog };
}
