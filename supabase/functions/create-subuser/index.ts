import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreateSubuserRequest {
  name: string;
  email: string;
  password: string;
  masterUserId: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Usar service role key para operações privilegiadas
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const { name, email, password, masterUserId }: CreateSubuserRequest = await req.json();

    // Verificar se o usuário master existe
    const { data: masterProfile, error: masterError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('user_id', masterUserId)
      .eq('role', 'master')
      .single();

    if (masterError || !masterProfile) {
      throw new Error('Usuário master não encontrado');
    }

    // Verificar se o email já existe
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('email')
      .eq('email', email)
      .maybeSingle();

    if (existingProfile) {
      throw new Error('Email já cadastrado no sistema');
    }

    // Criar usuário usando admin auth API (já confirmado automaticamente)
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Confirma automaticamente
      user_metadata: {
        name: name,
        is_subuser: true,
        master_account_id: masterUserId,
      },
    });

    if (authError || !authUser.user) {
      console.error('Erro ao criar usuário:', authError);
      throw new Error(authError?.message || 'Erro ao criar usuário');
    }

    // Buscar o profile criado pelo trigger
    let profile = null;
    let attempts = 0;
    while (!profile && attempts < 20) {
      const { data } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('user_id', authUser.user.id)
        .maybeSingle();
      
      if (data) {
        profile = data;
        break;
      }
      
      await new Promise(resolve => setTimeout(resolve, 500));
      attempts++;
    }

    if (!profile) {
      throw new Error('Profile não foi criado pelo trigger');
    }

    console.log('Subuser criado com sucesso:', { userId: authUser.user.id, email, name });

    return new Response(JSON.stringify({ 
      success: true, 
      user: authUser.user,
      profile: profile
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error: any) {
    console.error("Erro na função create-subuser:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);