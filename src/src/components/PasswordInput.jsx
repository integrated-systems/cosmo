import { useState } from 'react';
import { EyeIcon, EyeOffIcon } from './icons/Icons';

// LoginPage.jsx/SignUpPage.jsx хоёуланд ижилхэн давтагдаж бичигдэж байсан
// нууц үг талбар (харуулах/нуух товчтой)-ыг 2026-08-15 хэрэглэгчийн
// заасны дагуу НЭГ дахин ашиглагдах компонент болгов (Rule of two).
export default function PasswordInput({ id, value, onChange, autoComplete = 'current-password', placeholder = '••••••••' }) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="relative">
      <input
        id={id} name="password" type={showPassword ? 'text' : 'password'} placeholder={placeholder}
        autoComplete={autoComplete} required value={value} onChange={onChange}
        className="w-full px-3.5 py-2.5 pr-10 bg-inputbg border border-blue-500/20 rounded-md text-text text-sm outline-none focus:border-blue-500/50"
      />
      <button
        type="button" onClick={() => setShowPassword((v) => !v)} tabIndex={-1}
        className="absolute right-2 top-1/2 -translate-y-1/2 bg-transparent border-none cursor-pointer text-mutedtext p-1 flex items-center"
      >
        {showPassword ? <EyeOffIcon /> : <EyeIcon />}
      </button>
    </div>
  );
}
