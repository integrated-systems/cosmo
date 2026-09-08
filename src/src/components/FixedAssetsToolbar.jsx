import { SearchIcon } from './icons/Icons';

// FixedAssets.jsx-ийн түүлбэр — ClienteleToolbar.jsx-ийн бүтцийг дахин
// ашигласан (Rule of two). Хуучин "suh" прототипийн "Бүх харицагч /
// Бүх байршил / Хайх" шүүлтүүр + "Хавлах→Хэвлэх / Экспорт→Экспортлох"
// товчнуудыг Cosmo-ийн аль хэдийн тогтсон нэршлээр (ClienteleToolbar-тай
// адил) хэрэгжүүлэв.
export default function FixedAssetsToolbar({
  responsiblePerson, onResponsiblePersonChange, responsibleOptions,
  location, onLocationChange, locationOptions,
  search, onSearchChange,
  onAddClick, canAdd = true, addLabel = '+ Хөрөнгө нэмэх', addDisabled = false,
}) {
  return (
    <div className="ds-toolbar flex-wrap">
      <div className="flex flex-wrap items-center gap-2">
        <select className="ds-select" value={responsiblePerson} onChange={(e) => onResponsiblePersonChange(e.target.value)}>
          <option value="all">Бүх хариуцагч</option>
          {responsibleOptions.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
        <select className="ds-select" value={location} onChange={(e) => onLocationChange(e.target.value)}>
          <option value="all">Бүх байршил</option>
          {locationOptions.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
        <div className="relative min-w-[240px]">
          <SearchIcon className="w-4 h-4 text-slate-400 dark:text-mutedtext absolute left-2.5 top-2" />
          <input
            type="text"
            placeholder="Хайх (нэр, бүртгэлийн дугаар, марк/модель)..."
            className="ds-input w-full pl-8"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button className="ds-btn-secondary">Хэвлэх</button>
        <button className="ds-btn-secondary">Экспортлох</button>
        {canAdd && <button className="ds-btn-primary" disabled={addDisabled} onClick={onAddClick}>{addLabel}</button>}
      </div>
    </div>
  );
}
