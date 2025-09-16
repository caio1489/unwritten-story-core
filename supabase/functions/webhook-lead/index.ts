import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface LeadWebhookData {
  name: string;
  email: string;
  phone: string;
  company?: string;
  value?: number;
  source: string;
  tags?: string[];
  notes?: string;
  assignedTo?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Webhook received:', req.method, req.url);

    if (!(req.method === 'POST' || req.method === 'GET')) {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { 
          status: 405, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Parse the request body (support POST/PUT with JSON and GET via query params)
    let body: any = {};
    const url = new URL(req.url);

    if (req.method === 'GET') {
      // Map query params to body shape for uniform handling
      url.searchParams.forEach((value, key) => {
        body[key] = value;
      });

      // Parse possible JSON fields passed as strings
      try {
        if (typeof body.tags === 'string') {
          body.tags = body.tags.split(',').map((t: string) => t.trim()).filter(Boolean);
        }
        if (typeof body.value === 'string') body.value = Number(body.value);
        if (typeof body.data === 'string') body.data = JSON.parse(body.data);
      } catch (_) {
        // ignore JSON parse errors, keep raw values
      }
    } else {
      body = await req.json();
    }
    console.log('Request body (normalized):', body);

    // Validate required fields
    const { name, email, phone, company, value, source, tags, notes, assignedTo, userId, user_id, data: payloadData } = body as any;

    if (!name || !email || !phone) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required fields', 
          required: ['name', 'email', 'phone'] 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Get webhook_id from query params to identify which webhook is being used
    const webhookId = url.searchParams.get('webhook_id');
    
    console.log('Webhook ID:', webhookId);

    const ownerId = userId || user_id || url.searchParams.get('user_id') || assignedTo || 'webhook-user';

    // Create lead object - always starts in 'new' status (first kanban column)
    const leadData = {
      id: crypto.randomUUID(),
      name,
      email,
      phone,
      company: company || '',
      value: value || 0,
      status: 'new' as const, // Always 'new' for webhook leads
      tags: tags || [],
      assigned_to: ownerId, // Assign to owner
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      notes: (notes || `Lead recebido via webhook${webhookId ? ` (ID: ${webhookId})` : ''}`) + (payloadData ? ` | Dados: ${typeof payloadData === 'string' ? payloadData : JSON.stringify(payloadData)}` : ''),
      source: source || `Webhook${webhookId ? ` #${webhookId}` : ''}`,
      user_id: ownerId // Visibility via RLS
    };

    console.log('Lead data created:', leadData);

    // Save to database
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Save to leads table
    const { data: insertData, error } = await supabase
      .from('leads')
      .insert([leadData]);

    if (error) {
      console.error('Database error:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to save lead', details: error.message }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Lead received successfully',
        leadId: leadData.id,
        leadData: leadData
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Webhook error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        message: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});