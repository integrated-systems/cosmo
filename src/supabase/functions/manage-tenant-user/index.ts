// "Хэрэглэгчийн удирдлага" (/accounts) — 2026-08-19 хэрэглэгч тодорхой
// заасны дагуу үүсгэв. SISADMIN (tenant_admin) эсвэл SUPERSYSADMIN л
// шинэ (Менежер/Нягтлан бодогч гэх мэт) хэрэглэгчид БОДИТ Supabase Auth
// нэвтрэх эрх үүсгэж, устгаж, нууц үг сэргээж чадна — service_role key
// зүгээр ЭНД (Edge Function) ашиглагдана, клиент кодоос ХЭЗЭЭ Ч ил
// гарахгүй.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  });
}

async function isAuthorized(callerClient, tenantId) {
  const { data: { user } } = await callerClient.auth.getUser();
  if (!user) return false;
  const { data } = await callerClient
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .eq('tenant_id', tenantId);
  if ((data ?? []).some((r) => r.role === 'tenant_admin')) return true;
  const { data: sup } = await callerClient.from('user_roles').select('role').eq('user_id', user.id).eq('role', 'supersysadmin');
  return (sup ?? []).length > 0;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
    const authHeader = req.headers.get('Authorization') || '';
    const callerClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const body = await req.json();
    const { action, tenantId } = body;

    if (!(await isAuthorized(callerClient, tenantId))) {
      return json({ error: 'Энэ үйлдлийг зөвхөн СөХ-ийн Админ эсвэл SuperSysAdmin хийж чадна.' }, 403);
    }

    if (action === 'create') {
      const { email, password, fullname, role, address } = body;
      if (!email || !password || password.length < 6) {
        return json({ error: 'Имэйл болон хамгийн багадаа 6 тэмдэгттэй нууц үг шаардлагатай.' }, 400);
      }
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email, password, email_confirm: true, user_metadata: { fullname },
      });
      if (createErr) return json({ error: createErr.message }, 400);

      const userId = created.user.id;
      const { error: roleErr } = await admin.from('user_roles').insert({ user_id: userId, tenant_id: tenantId, role });
      if (roleErr) { await admin.auth.admin.deleteUser(userId); return json({ error: roleErr.message }, 400); }

      const { data: rowData, error: rowErr } = await admin
        .from('tenant_users')
        .insert({ tenant_id: tenantId, user_id: userId, role, fullname, email, address: address || null })
        .select().single();
      if (rowErr) return json({ error: rowErr.message }, 400);

      return json({ data: rowData });
    }

    if (action === 'delete') {
      const { rowId, userId } = body;
      if (userId) await admin.auth.admin.deleteUser(userId);
      const { error } = await admin.from('tenant_users').delete().eq('id', rowId);
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    if (action === 'reset_password') {
      const { userId, password } = body;
      if (!password || password.length < 6) return json({ error: 'Нууц үг хамгийн багадаа 6 тэмдэгттэй байх ёстой.' }, 400);
      const { error } = await admin.auth.admin.updateUserById(userId, { password });
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    return json({ error: 'Үл мэдэгдэх action.' }, 400);
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
