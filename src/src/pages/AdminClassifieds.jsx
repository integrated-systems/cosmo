import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { DEFAULT_TENANT_ID } from '../config/tenant';
import { useAuth } from '../lib/AuthContext';
import { SearchIcon } from '../components/icons/Icons';

// "Зарын самбар" (/classifieds) — 2026-08-31 хэрэглэгчийн хүсэлт.
// үвр нь "ИБаримт" (key: 'vat') гэсэн хэзээ ч бодитоор бүтээгдээгүй
// (route ч, компонент ч байгаагүй) placeholder цэс байсныг үүнд
// зориулж ашиглав. Энэ хуудас нь OwnerApp-ийн "Зарын самбар"
// (сууц өмчлөгчдийн Facebook-ийн пост шиг зар самбар)-ийн МОДЕРАЦИЙН
// (admin/staff-т зориулсан) хуудас — бүх постыг харж, зохисгүй пост/
// коммент устгах боломжтой.
//
// 2026-08-31 (2) ЗАЛРУУЛГА: хэрэглэгч тодруулав —
//   1) Гарчиг мвр (карт-ий title) арилгаж, оронд нь ХАЙЛТЫН toolbar
//      картны дээд талд байрлуулав.
//   2) СӨХ-ны ажилтны зар бичих талбарыг ДАВХАР карт (nested card)
//      биш, зүгээр л үндсэн контент картын дээд/зүүн/баруун ирмэгээс
//      10px зайтай, 1-мөрийн өндөртэй (auto-grow) болгов.
function timeAgo(iso) {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function autoGrowTextarea(el) {
  if (!el) return;
  el.style.height = 'auto';
  el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
}

function CommentsRow({ postId, expanded, onDeleted }) {
  const [comments, setComments] = useState(null);

  useEffect(() => {
    if (!expanded) return;
    supabase.rpc('get_classifieds_comments', { p_post_id: postId }).then(({ data }) => setComments(data || []));
  }, [expanded, postId]);

  async function del(commentId) {
    if (!window.confirm('Энэ комментыг устгах уу?')) return;
    await supabase.from('classifieds_comments').delete().eq('id', commentId);
    setComments((c) => c.filter((x) => x.id !== commentId));
    onDeleted?.();
  }

  if (!expanded) return null;
  return (
    <div className="pl-6 pb-3 flex flex-col gap-2">
      {comments === null && <div className="text-[11px] text-mutedtext">Ачаалж байна...</div>}
      {comments?.length === 0 && <div className="text-[11px] text-mutedtext">Коммент алга.</div>}
      {comments?.map((c) => (
        <div key={c.id} className="flex items-start justify-between gap-2 text-[12px]">
          <div>
            <span className="font-semibold text-slate-800 dark:text-white">{c.author}</span>{' '}
            <span className="text-slate-700 dark:text-text">{c.body}</span>
            <div className="text-[10px] text-mutedtext">{timeAgo(c.created_at)}</div>
          </div>
          <button className="text-customRed text-[11px] shrink-0" onClick={() => del(c.id)}>Устгах</button>
        </div>
      ))}
    </div>
  );
}

export default function AdminClassifieds() {
  const { hoaId = DEFAULT_TENANT_ID } = useParams();
  const { user } = useAuth();
  const [posts, setPosts] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [draft, setDraft] = useState('');
  const [posting, setPosting] = useState(false);
  const [search, setSearch] = useState('');
  const textareaRef = useRef(null);

  function load() {
    supabase.rpc('get_classifieds_feed', { p_tenant_id: hoaId }).then(({ data }) => setPosts(data || []));
  }
  useEffect(() => { load(); }, [hoaId]);

  async function submitPost() {
    if (!draft.trim()) return;
    setPosting(true);
    const { error } = await supabase.from('classifieds_posts').insert({
      tenant_id: hoaId, author_user_id: user.id, body: draft.trim(),
    });
    setPosting(false);
    if (error) { alert(error.message); return; }
    setDraft('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    load();
  }

  async function deletePost(postId) {
    if (!window.confirm('Энэ зарыг (коммент, реакц хамт) бүрмөсөн устгах уу?')) return;
    const { error } = await supabase.from('classifieds_posts').delete().eq('id', postId);
    if (error) { alert(error.message); return; }
    load();
  }

  const q = search.trim().toLowerCase();
  const filtered = q ? (posts ?? []).filter((p) => p.body.toLowerCase().includes(q) || p.author.toLowerCase().includes(q)) : posts;

  return (
    <>
      {/* 2026-08-31 ЗАЛРУУЛГА: хэрэглэгч тодруулав — .ds-toolbar өөрөө
          .ds-card агуулдаг (@apply ds-card ...) тул үүнийг вндсэн
          контент картан дотор байрлуулснаар ДАВХАР карт
          үүсгэсэн байв (Accounts.jsx/VotingPage.jsx-ийн зөвөө
          загварын дагуу toolbar болон контент карт ХОЁР ТУСДАА
          sibling байх ёстой). */}
      <div className="ds-toolbar">
        <div className="relative w-full max-w-xs">
          <SearchIcon className="w-3.5 h-3.5 text-slate-400 dark:text-darktext absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Зар хайх (түлхүүр үг)..."
            className="ds-input w-full pl-8 text-[13px]"
            value={search} onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="ds-card p-0 overflow-hidden">
      <div className="p-4">
        {/* 2026-08-31 (2): давхар карт үгүйгээр, зүгээр 10px margin-тай
            композ талбар. */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, margin: '0 10px 16px' }}>
          <textarea
            ref={textareaRef}
            rows={1}
            className="ds-input flex-1 resize-none"
            style={{ overflowY: 'auto', maxHeight: 140 }}
            value={draft}
            onChange={(e) => { setDraft(e.target.value); autoGrowTextarea(e.target); }}
            placeholder="СӨХ-г төлөөлөн зар бичих"
          />
          <button className="ds-btn-primary shrink-0" onClick={submitPost} disabled={posting || !draft.trim()}>
            {posting ? 'Илгээж байна...' : 'Нийтлэх'}
          </button>
        </div>

        {posts === null && <div className="text-[12px] text-darktext py-4">Ачаалж байна...</div>}
        {posts?.length === 0 && <div className="text-[12px] text-mutedtext py-4">Зар одоогоор алга.</div>}
        {posts?.length > 0 && filtered?.length === 0 && <div className="text-[12px] text-mutedtext py-4">Хайлтад тохирох зар олдсонгүй.</div>}

        <div className="flex flex-col divide-y divide-slate-200 dark:divide-bordercol">
          {filtered?.map((p) => (
            <div key={p.id} className="py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[13px] font-semibold text-slate-900 dark:text-white">{p.author}</span>
                    {p.is_staff_post && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-customBlue/15 text-customBlue">СӨХ</span>}
                    <span className="text-[10px] text-mutedtext">{timeAgo(p.created_at)}</span>
                  </div>
                  <div className="text-[13px] text-slate-700 dark:text-text whitespace-pre-wrap">{p.body}</div>
                  <div className="flex items-center gap-4 mt-2 text-[11px] text-mutedtext">
                    <span>♥ {p.reaction_count}</span>
                    <button className="hover:underline" onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}>
                      💬 {p.comment_count} {expandedId === p.id ? '(нуух)' : '(харах)'}
                    </button>
                  </div>
                </div>
                <button className="ds-btn-secondary !py-1 !px-2 text-[11px] text-customRed shrink-0" onClick={() => deletePost(p.id)}>Зарыг устгах</button>
              </div>
              <CommentsRow postId={p.id} expanded={expandedId === p.id} onDeleted={load} />
            </div>
          ))}
        </div>
      </div>
    </div>
    </>
  );
}
