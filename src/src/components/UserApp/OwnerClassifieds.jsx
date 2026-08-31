import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../lib/AuthContext';

// 2026-08-31: Хэрэглэгчийн хүсэлт — "Зарын самбар". Дизайн: Мессенжер
// хуудас шиг (.ds-card/.mobile-list-item ЗУРААС ГАДУУР, зүгээр
// хөөрөлддөг элементүүд) КАРТГүй. Логик: сууц өмчлөгч Facebook-ийн
// пост шиг зар нийтэлж, хотхоны БүХ сууц өмчлөгч нар (нийтэд) харж,
// доор нь жижигхэн 2 SVG товч (иможи/like, коммент) дарж үйлчилнэ.
function HeartIcon({ filled }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill={filled ? '#ef4444' : 'none'} stroke={filled ? '#ef4444' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}
function CommentIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  );
}

function timeAgo(iso) {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function CommentsPanel({ postId, hoaId, user }) {
  const [comments, setComments] = useState(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);

  function load() {
    supabase.rpc('get_classifieds_comments', { p_post_id: postId }).then(({ data }) => setComments(data || []));
  }
  useEffect(() => { load(); }, [postId]);

  async function send() {
    if (!draft.trim()) return;
    setSending(true);
    // 2026-08-31 ОЛСОН БОДИТ АЛДАА: insert үед tenant_id/owner_id
    // огт дамжуулдаггүй байсан тул RLS with-check-д үл нийцэж (мвн
    // хүснэгэлийн NOT NULL хязгаарлалтад ч үл нийцэж) insert ЧИМЭЭГүй
    // бүтэлгүйтдэг байв (алдаа шалгадаггүй байсан тул харагдахгүй,
    // коммент бичсэн мэт боловч бодитоор хадгалагддаггүй байв).
    const { data: ownerRow } = await supabase.from('owners').select('id').eq('user_id', user.id).eq('tenant_id', hoaId).maybeSingle();
    if (!ownerRow) { setSending(false); alert('Таны сууц өмчлөгчийн бүртгэл дутуу тул коммент бичих боломжгүй байна.'); return; }
    const { error } = await supabase.from('classifieds_comments').insert({ post_id: postId, tenant_id: hoaId, owner_id: ownerRow.id, body: draft.trim() });
    setSending(false);
    if (error) { alert(error.message); return; }
    setDraft('');
    load();
  }

  return (
    <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
      {comments === null && <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Ачаалж байна...</div>}
      {comments?.map((c) => (
        <div key={c.id} style={{ marginBottom: 6 }}>
          <div style={{ fontSize: 12 }}>
            <span style={{ fontWeight: 700 }}>{c.author}</span>{' '}
            <span>{c.body}</span>
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>{timeAgo(c.created_at)}</div>
        </div>
      ))}
      <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
        <input
          value={draft} onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') send(); }}
          placeholder="Коммент бичих..."
          style={{ flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 14, padding: '7px 12px', color: 'var(--text-primary)', fontSize: 13, outline: 'none' }}
        />
        <button onClick={send} disabled={sending} style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Илгээх</button>
      </div>
    </div>
  );
}

export default function OwnerClassifieds({ hoaId }) {
  const { user } = useAuth();
  const [posts, setPosts] = useState(null);
  const [draft, setDraft] = useState('');
  const [posting, setPosting] = useState(false);
  const [openComments, setOpenComments] = useState(null); // postId эсвэл null
  const [noOwnerRecord, setNoOwnerRecord] = useState(false);

  function load() {
    supabase.rpc('get_classifieds_feed', { p_tenant_id: hoaId }).then(({ data }) => setPosts(data || []));
  }
  useEffect(() => {
    if (!hoaId || !user?.id) return;
    supabase.from('owners').select('id').eq('user_id', user.id).eq('tenant_id', hoaId).maybeSingle().then(({ data }) => {
      setNoOwnerRecord(!data);
    });
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hoaId, user?.id]);

  async function submitPost() {
    if (!draft.trim()) return;
    setPosting(true);
    const { data: ownerRow } = await supabase.from('owners').select('id').eq('user_id', user.id).eq('tenant_id', hoaId).maybeSingle();
    if (!ownerRow) { setPosting(false); return; }
    const { error } = await supabase.from('classifieds_posts').insert({ tenant_id: hoaId, owner_id: ownerRow.id, body: draft.trim() });
    setPosting(false);
    if (error) { alert(error.message); return; }
    setDraft('');
    load();
  }

  async function toggleReaction(post) {
    const { data: ownerRow } = await supabase.from('owners').select('id').eq('user_id', user.id).eq('tenant_id', hoaId).maybeSingle();
    if (!ownerRow) return;
    if (post.my_reaction) {
      await supabase.from('classifieds_reactions').delete().eq('post_id', post.id).eq('owner_id', ownerRow.id);
    } else {
      await supabase.from('classifieds_reactions').insert({ post_id: post.id, tenant_id: hoaId, owner_id: ownerRow.id });
    }
    load();
  }

  return (
    <div>
      <div className="content-page-header" style={{ padding: '4px 0 12px' }}>
        <div className="content-page-title">Зарын самбар</div>
      </div>

      {noOwnerRecord ? (
        <div className="pool-empty">Таны сууц өмчлөгчийн бүртгэл дутуу тул зар нийтлэх боломжгүй байна. СӨХ-ийн ажилтантай холбогдоно уу.</div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, marginBottom: 14 }}>
          <textarea
            rows={2}
            value={draft} onChange={(e) => setDraft(e.target.value)}
            placeholder="Зар бичих"
            style={{
              flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 14, padding: '10px 14px', color: 'var(--text-primary)', fontSize: 16, lineHeight: 1.4,
              resize: 'none', outline: 'none',
              WebkitBackdropFilter: 'blur(10px)', backdropFilter: 'blur(10px)',
            }}
          />
          <button
            onClick={submitPost} disabled={posting || !draft.trim()}
            style={{ background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 14, padding: '10px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}
          >
            Нийтлэх
          </button>
        </div>
      )}

      {posts === null && <div className="pool-empty">Ачаалж байна...</div>}
      {posts?.length === 0 && <div className="pool-empty">Одоогоор зар алга. Эхний зарыг та нийтэлж үзээрэй!</div>}

      {posts?.map((p) => (
        <div key={p.id} style={{ padding: '12px 0', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 13, fontWeight: 700 }}>{p.author}</span>
            <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>{timeAgo(p.created_at)}</span>
          </div>
          <div style={{ fontSize: 14, lineHeight: 1.5, whiteSpace: 'pre-wrap', marginBottom: 8 }}>{p.body}</div>
          <div style={{ display: 'flex', gap: 16 }}>
            <button onClick={() => toggleReaction(p)} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: 0 }}>
              <HeartIcon filled={p.my_reaction} />
              <span style={{ fontSize: 12 }}>{p.reaction_count > 0 ? p.reaction_count : ''}</span>
            </button>
            <button onClick={() => setOpenComments(openComments === p.id ? null : p.id)} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: 0 }}>
              <CommentIcon />
              <span style={{ fontSize: 12 }}>{p.comment_count > 0 ? p.comment_count : ''}</span>
            </button>
          </div>
          {openComments === p.id && <CommentsPanel postId={p.id} hoaId={hoaId} user={user} />}
        </div>
      ))}
    </div>
  );
}
