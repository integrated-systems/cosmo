import { useRef, useState } from 'react';

// 2026-08-19: userapp-react (the2m26/suh) прожектийн TileGrid.jsx-ийн
// UI/UX-ыг (удаан дарж нуух, badge тоолуур, "нуусан товч сэргээх" модаль)
// Cosmo-ийн бодит эрхийн системтэй (useAccessRules+userapp_config, UserApp.jsx-д
// аль хэдийн дуудагдсан) холбож дасан зохицуулав. Үвр Supabase project/схем
// (get_my_permissions RPC, settings хүснэгэл)-ийг ОГТ ашиглахгүй.
const HIDDEN_TILES_KEY = 'cosmo_userapp_hidden_tiles';
function getHiddenTiles() {
  try { return new Set(JSON.parse(localStorage.getItem(HIDDEN_TILES_KEY) || '[]')); }
  catch { return new Set(); }
}
function setHiddenTilesStorage(set) { localStorage.setItem(HIDDEN_TILES_KEY, JSON.stringify([...set])); }

const LONG_PRESS_MS = 500;

function Tile({ tile, wide, showHideBtn, onOpen, onLongPress, onHide, badgeCount = 0 }) {
  const timerRef = useRef(null);
  const firedRef = useRef(false);
  function onDown() {
    firedRef.current = false;
    timerRef.current = setTimeout(() => { firedRef.current = true; onLongPress(); }, LONG_PRESS_MS);
  }
  function onUp() { clearTimeout(timerRef.current); }
  function onClick(e) {
    if (firedRef.current) { e.preventDefault(); e.stopPropagation(); return; }
    onOpen();
  }
  return (
    <div className={`tile${wide ? ' wide' : ''}`} onClick={onClick} onPointerDown={onDown} onPointerUp={onUp} onPointerLeave={onUp}
      onContextMenu={(e) => e.preventDefault()}>
      {showHideBtn && <button className="tile-hide-btn" onClick={onHide} aria-label="Нуух">✕</button>}
      {badgeCount > 0 && <span className="tile-count-badge">{badgeCount}</span>}
      <div>
        <div className="tile-label">{tile.label}</div>
        <div className="tile-status">Нээлттэй</div>
      </div>
      {wide && <span style={{ color: 'var(--text-secondary)', fontSize: 18 }}>›</span>}
    </div>
  );
}

export default function TileGrid({ items, onOpenTile, showAddModal, onCloseAddModal, badges = {} }) {
  const [hidden, setHidden] = useState(getHiddenTiles());
  const [showHideBtnFor, setShowHideBtnFor] = useState(null);

  function hideTile(e, key) {
    e.stopPropagation();
    const next = new Set(hidden);
    next.add(key);
    setHidden(next);
    setHiddenTilesStorage(next);
    setShowHideBtnFor(null);
  }
  function unhideTile(key) {
    const next = new Set(hidden);
    next.delete(key);
    setHidden(next);
    setHiddenTilesStorage(next);
  }

  const shown = items.filter((t) => !hidden.has(t.key));
  const hiddenList = items.filter((t) => hidden.has(t.key));

  return (
    <div onClick={() => showHideBtnFor && setShowHideBtnFor(null)}>
      <div className="tile-grid">
        {shown.map((t) => {
          const badgeCount = badges[t.key] || 0;
          // 2026-08-30 ЗАЛРУУЛГА: хэрэглэгч тодруулав — badge гарч ирэхэд
          // tile гэнэт "wide" болж хэмжээ үүргүй үүсгэдэг байсныг болиулав.
          // Одоо бүх tile (Мессенжер хамт) үүргүй ижил хэмжээст (энгийн
          // 2-баганат) tile компонент байна, badge зүгээр жижиг тоолуур үлдэнэ.
          return (
            <Tile key={t.key} tile={t} wide={false} showHideBtn={showHideBtnFor === t.key}
              onOpen={() => onOpenTile(t)} onLongPress={() => setShowHideBtnFor(t.key)}
              onHide={(e) => hideTile(e, t.key)} badgeCount={badgeCount} />
          );
        })}
      </div>
      {showAddModal && (
        <div className="modal-overlay open" onClick={(e) => e.target === e.currentTarget && onCloseAddModal()}>
          <div className="qpay-modal add-tile-modal">
            <div className="add-tile-title">Нуусан товчоо сэргээх</div>
            {hiddenList.length ? hiddenList.map((t) => (
              <div key={t.key} className="add-tile-row" onClick={() => unhideTile(t.key)}>
                <span>{t.label}</span><span className="add-tile-plus">+</span>
              </div>
            )) : <div className="pool-empty" style={{ padding: '20px 0' }}>Нуусан товч алга</div>}
            <button className="login-btn" style={{ marginTop: 14 }} onClick={onCloseAddModal}>Хаах</button>
          </div>
        </div>
      )}
    </div>
  );
}
