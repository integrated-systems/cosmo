import { useCallback, useState } from 'react';
import AlertModal from '../components/AlertModal';

// window.alert()-ийг Cosmo дизайнтай Modal-аар орлуулах hook. Ашиглах
// байдал: `const { alert, AlertDialog } = useAlert();` дараа нь
// `alert('өгүүлэл')` гэж дуудаад компонентын return-ийн доторх аль нэг
// газарт `<AlertDialog />`-г нэг л удаа байрлуулна.
export function useAlert() {
  const [state, setState] = useState({ open: false, title: '', message: '' });

  const alertFn = useCallback((message, title = 'Мэдэгдэл') => {
    setState({ open: true, title, message });
  }, []);

  function close() {
    setState((s) => ({ ...s, open: false }));
  }

  const AlertDialog = () => (
    <AlertModal open={state.open} title={state.title} message={state.message} onClose={close} />
  );

  return { alert: alertFn, AlertDialog };
}
