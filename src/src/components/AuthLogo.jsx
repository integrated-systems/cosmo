// LoginPage.jsx/SignUpPage.jsx/OnboardingPage.jsx 3 файлд ижилхэн
// давтагдаж бичигдэж байсан лого блокийг 2026-08-15 хэрэглэгчийн заасны
// дагуу НЭГ дахин ашиглагдах компонент болгов (Rule of two).
export default function AuthLogo() {
  return (
    <div className="text-center mb-8">
      <img src={`${import.meta.env.BASE_URL}logicon.png`} alt="COSMO" className="w-[70px] h-[70px] mx-auto mb-2.5 rounded-xl" />
      <div className="text-[16px] font-normal text-text tracking-[.02em]">COSMO</div>
      <div className="text-[14px] text-darktext mt-1">Integrated Systems</div>
    </div>
  );
}
