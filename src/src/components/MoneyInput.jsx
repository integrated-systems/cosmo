import { useState } from 'react';
import { formatMoney } from '../lib/format';

// 2026-09-08: Мөнгөн дүнгийн талбарыг 0.00₮ форматаар харуулах
// нийтлэг input — фокустой үед гараар засварлах raw тоо, фокусгүй үед
// бүтэн форматтай (мянгатын таслал+2 орон+₮) харагдана.
export default function MoneyInput({ value, onChange, className = 'ds-input w-full' }) {
  const [focused, setFocused] = useState(false);

  const display = focused
    ? (value === '' || value == null ? '' : String(value))
    : `${formatMoney(value || 0)}₮`;

  return (
    <input
      type="text"
      inputMode="decimal"
      className={className}
      value={display}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onChange={(e) => {
        const raw = e.target.value.replace(/[^0-9.]/g, '');
        onChange(raw);
      }}
    />
  );
}
