// 2026-08-28: Accounts.jsx-д зөвхөн локал байсан ROLE_LABELS-ыг shared
// config болгов — Msgr.jsx-д staff-ийн зурвасны "agent" (илгээгчийн
// рол) талбарыг бодит role нэрээр дүүргэхэд ашиглана (Rule of two).
export const ROLE_LABELS = {
  admin: 'Админ',
  board: 'Удирдах зөвлөл',
  supervisory_board: 'Хяналтын зөвлөл',
  executive_director: 'Гүйцэтгэх захирал',
  accountant: 'Нягтлан бодогч',
  manager: 'Менежер',
  owner: 'Сууц өмчлөгч',
};
export const ROLE_OPTIONS = ['manager', 'accountant', 'executive_director', 'supervisory_board', 'board', 'owner', 'admin'];
