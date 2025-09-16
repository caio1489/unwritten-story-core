import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DeleteSubuserRequest {
  subUserId: string;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Client for caller auth (to check permissions)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: { headers: { Authorization: req.headers.get('Authorization') || '' } },
      }
    );

    // Admin client for privileged operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { data: authData, error: authErr } = await supabase.auth.getUser();
    if (authErr || !authData?.user) {
      return new Response(JSON.stringify({ error: 'Não autenticado' }), { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
    }

    const callerId = authData.user.id;

    // Check caller is master
    const { data: callerProfile, error: profileErr } = await supabaseAdmin
      .from('profiles')
      .select('user_id, role')
      .eq('user_id', callerId)
      .single();

    if (profileErr || !callerProfile || callerProfile.role !== 'master') {
      return new Response(JSON.stringify({ error: 'Acesso negado' }), { status: 403, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
    }

    const { subUserId }: DeleteSubuserRequest = await req.json();
    if (!subUserId) {
      return new Response(JSON.stringify({ error: 'subUserId é obrigatório' }), { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
    }

    // Delete profile first (idempotent)
    const { error: profileDeleteErr } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('user_id', subUserId);

    if (profileDeleteErr) {
      console.error('Erro ao excluir profile:', profileDeleteErr);
      return new Response(JSON.stringify({ error: 'Falha ao excluir perfil' }), { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
    }

    // Delete auth user
    const { error: authDeleteErr } = await supabaseAdmin.auth.admin.deleteUser(subUserId);
    if (authDeleteErr) {
      console.error('Erro ao excluir usuário auth:', authDeleteErr);
      return new Response(JSON.stringify({ error: 'Perfil removido, mas falhou ao remover a conta' }), { status: 207, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
    }

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
  } catch (e: any) {
    console.error('delete-subuser error:', e);
    return new Response(JSON.stringify({ error: e?.message || 'Erro inesperado' }), { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
  }
});
