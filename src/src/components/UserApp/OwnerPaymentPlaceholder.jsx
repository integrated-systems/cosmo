// 2026-08-30: Хэрэглэгчийн хүсэлтээр "Төлбөр" хуудсыг хуучин "suh"
// (userapp-react) төслийн статик placeholder-тэй адил байдлаар түр
// байрлуулав. Cosmo-д ОДООГООР нэхэмжлэх/төлбөрийн бодит backend
// (payments/invoices) үүсээгүй тул ЭНД харагдах тоо/мөр бүгд ЖИШЭЭ
// (placeholder) бөгөөд бодит датаг төлөөлөхгүй — үнэн backend бэлэн
// болмогц энэ компонентыг бодит асуулгаар сольно.
export default function OwnerPaymentPlaceholder() {
  const rows = [
    ['7-р сарын төлбөр', 115000],
    ['Зогсоол', 35000],
    ['Агуулах', 10000],
    ['Ашиглалтын зардал', 27000],
    ['СӨХ-ны төлбөр', 43000],
  ];
  const total = rows.reduce((s, [, v]) => s + v, 0);
  const fmt = (n) => n.toLocaleString('mn-MN') + '₮';

  return (
    <div>
      <div className="content-page-header" style={{ padding: '4px 0 12px' }}>
        <div className="content-page-title">Төлбөр</div>
      </div>

      <div className="mobile-list-item">
        <div style={{ fontSize: 11, fontWeight: 700, color: '#f87171', marginBottom: 6 }}>Өмнөх төлөгдөөгүй сарууд</div>
        {rows.map(([label, val], i) => (
          <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderTop: i === 0 ? 'none' : '1px solid rgba(255,255,255,0.06)' }}>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{label}</span>
            <span style={{ fontSize: 13, fontWeight: 700 }}>{fmt(val)}</span>
          </div>
        ))}
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0 2px', borderTop: '1px solid rgba(255,255,255,0.12)', marginTop: 4 }}>
          <span style={{ fontSize: 14, fontWeight: 700 }}>Нийт төлөх дүн (1 сар)</span>
          <span style={{ fontSize: 16, fontWeight: 800 }}>{fmt(total)}</span>
        </div>
      </div>

      {/* 2026-08-31 ЗАСАВ: glassmorphism + хэвтээ тэнхэлэгийн дагуу голлуулав. */}
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 4 }}>
        <button
          onClick={() => alert('QPay холболт удахгүй нэмэгдэнэ.')}
          style={{
            padding: '13px 32px', borderRadius: 14, fontSize: 15, fontWeight: 700,
            color: 'var(--text-primary)', background: '#ffffff24', border: '1px solid #ffffff2e',
            WebkitBackdropFilter: 'blur(14px)', backdropFilter: 'blur(14px)', cursor: 'pointer',
          }}
        >
          QPay-аар төлөх
        </button>
      </div>

      <div className="section-title" style={{ textAlign: 'center', marginTop: 20 }}>Төлбөр төлөлтийн түүх</div>
      <div className="pool-empty">Төлбөрийн түүх алга</div>
    </div>
  );
}
