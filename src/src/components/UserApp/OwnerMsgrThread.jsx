import { useEffect, useRef, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../lib/AuthContext';

// 2026-08-27: ОЛСОН БОДИТ ЦООРХОЙ — "Мессенжер" tile дээр дарахад owner
// (сууц өмчлөгч) хүн Msgr.jsx (staff/менежерийн БүХ харилцан ярианы
// удирдлагын dashboard)-г шууд харж байсан. Энэ нь зөвхөн зохисгүй
// байдлаас гадна аюулгүй байдлын хувьд ч буруу (бусад хүний харилцан
// яриаг харах гэсэн UI). Одоо OwnerApp-д зориулсан ЭНЭ тусдаа, энгийн
// thread-only компонент ашиглагдана — owner зөвхөн ӨӨРИЙН СүХ-тэй
// хийсэн харилцан ярианыхаа мессежүүдийг харж, шинэ зурвас бичиж болно.
export default function OwnerMsgrThread({ hoaId }) {
  const { user } = useAuth();
  const [listId, setListId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  async function loadThread() {
    setLoading(true);
    const { data: ownerRow } = await supabase.from('owners').select('id').eq('user_id', user.id).eq('tenant_id', hoaId).maybeSingle();
    if (!ownerRow) { setLoading(false); return; }

    let { data: listRow } = await supabase.from('msgr_list').select('id').eq('owner_id', ownerRow.id).eq('tenant_id', hoaId).order('created_at', { ascending: true }).limit(1).maybeSingle();
    if (!listRow) {
      const { data: created } = await supabase.from('msgr_list').insert({ tenant_id: hoaId, owner_id: ownerRow.id }).select('id').single();
      listRow = created;
    }
    if (!listRow) { setLoading(false); return; }
    setListId(listRow.id);

    const { data: msgs } = await supabase.from('msgr_messages').select('*').eq('list_id', listRow.id).order('created_at', { ascending: true });
    setMessages(msgs ?? []);
    setLoading(false);
  }

  useEffect(() => {
    if (!hoaId || !user?.id) return;
    loadThread();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hoaId, user?.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function send() {
    if (!draft.trim() || !listId) return;
    setSending(true);
    const { data, error } = await supabase.from('msgr_messages').insert({
      list_id: listId, tenant_id: hoaId, dir: 'in', body: draft.trim(),
    }).select().single();
    setSending(false);
    if (error) { alert(error.message); return; }
    setMessages((m) => [...m, data]);
    setDraft('');
  }

  if (loading) return <div className="pool-empty">Ачаалж байна...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 190px)' }}>
      <div className="content-page-header" style={{ padding: '4px 0 12px' }}>
        <div className="content-page-title">Мессенжер</div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6, paddingBottom: 8 }}>
        {messages.length === 0 && (
          <div className="pool-empty">СүХ-ийн ажилтантай холбогдохын тулд доор зурвас бичнэ vv.</div>
        )}
        {messages.map((m) => (
          <div key={m.id} style={{ alignSelf: m.dir === 'out' ? 'flex-end' : 'flex-start', maxWidth: '78%' }}>
            <div
              className="mobile-list-item"
              style={{
                margin: 0,
                background: m.dir === 'out' ? 'var(--accent)' : undefined,
                color: m.dir === 'out' ? '#fff' : undefined,
              }}
            >
              {m.body}
              <div style={{ fontSize: 10, opacity: 0.7, marginTop: 4 }}>
                {new Date(m.created_at).toLocaleString('mn-MN', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'numeric' })}
              </div>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div style={{ display: 'flex', gap: 8, paddingTop: 8 }}>
        <textarea
          className="profile-edit-input" style={{ flex: 1, resize: 'none' }} rows={1}
          value={draft} onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="Мессеж бичих..."
        />
        <button className="login-btn" style={{ width: 'auto', padding: '0 18px' }} onClick={send} disabled={sending}>
          {sending ? '...' : 'Илгээх'}
        </button>
      </div>
    </div>
  );
}
