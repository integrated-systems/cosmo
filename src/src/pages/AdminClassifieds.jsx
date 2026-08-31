import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { DEFAULT_TENANT_ID } from '../config/tenant';
import { useAuth } from '../lib/AuthContext';

// "Зарын самбар" (/classifieds) — 2026-08-31 хэрэглэгчийн хүсэлт.
// үвр нь "ИБаримт" (key: 'vat') гэсэн хэзээ ч бодитоор бүтээгдээгүй
// (route ч, компонент ч байгаагүй) placeholder цэс байсныг үүнд
// зориулж ашиглав. Энэ хуудас нь OwnerApp-ийн "Зарын самбар"
// (сууц өмчлөгчдийн Facebook-ийн пост шиг зар самбар)-ийн МОДЕРАЦИЙН
// (admin/staff-т зориулсан) хуудас — бүх постыг харж, зохисгүй пост/
// коммент устгах боломжтой.
function timeAgo(iso) {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
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

  function load() {
    supabase.rpc('get_classifieds_feed', { p_tenant_id: hoaId }).then(({ data }) => setPosts(data || []));
  }
  useEffect(() => { load(); }, [hoaId]);

  // 2026-08-31: Хэрэглэгчийн хүсэлт — СӨХ-ийн БүХ роль (staff) мвн
  // адил НИЙТ сууц өмчлөгчид хандан зар нийтлэх эрхтэй. Staff-д owners
  // мвр байхгүй тул owner_id=null (author_user_id-аар л тодорхойлно).
  async function submitPost() {
    if (!draft.trim()) return;
    setPosting(true);
    const { error } = await supabase.from('classifieds_posts').insert({
      tenant_id: hoaId, author_user_id: user.id, body: draft.trim(),
    });
    setPosting(false);
    if (error) { alert(error.message); return; }
    setDraft('');
    load();
  }

  async function deletePost(postId) {
    if (!window.confirm('Энэ зарыг (коммент, реакц хамт) бүрмөсөн устгах уу?')) return;
    const { error } = await supabase.from('classifieds_posts').delete().eq('id', postId);
    if (error) { alert(error.message); return; }
    load();
  }

  return (
    <div className="ds-card p-0 overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-200 dark:border-bordercol flex items-center justify-between">
        <span className="text-[14px] font-semibold text-slate-900 dark:text-white">Зарын самбар</span>
        <span className="text-[11px] text-mutedtext">OwnerApp дээрх сууц өмчлөгчдийн зарын модераци</span>
      </div>

      <div className="p-4">
        <div className="ds-card p-3 mb-4 flex items-end gap-2">
          <textarea
            className="ds-input flex-1 resize-none" rows={2}
            value={draft} onChange={(e) => setDraft(e.target.value)}
            placeholder="Нийт сууц өмчлөгчдвд зориулсан зар бичих (жиш: усны хагалт, засварын мэдэгдэл г.м)..."
          />
          <button className="ds-btn-primary shrink-0" onClick={submitPost} disabled={posting || !draft.trim()}>
            {posting ? 'Илгээж байна...' : 'СӨХ-ийн нэрээр нийтлэх'}
          </button>
        </div>

        {posts === null && <div className="text-[12px] text-darktext py-4">Ачаалж байна...</div>}
        {posts?.length === 0 && <div className="text-[12px] text-mutedtext py-4">Зар одоогоор алга.</div>}

        <div className="flex flex-col divide-y divide-slate-200 dark:divide-bordercol">
          {posts?.map((p) => (
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
  );
}
