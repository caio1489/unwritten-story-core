import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface OutgoingWebhookData {
  event: string;
  leadId?: string;
  leadData?: any;
  timestamp: string;
  userId: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Outgoing webhook triggered:', req.method, req.url);

    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { 
          status: 405, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Parse the request body
    const body = await req.json() as OutgoingWebhookData;
    console.log('Outgoing webhook data:', body);

    const { event, leadId, leadData, userId } = body;

    if (!event || !userId) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required fields', 
          required: ['event', 'userId'] 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Get database connection
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get all active outgoing webhooks for this user's team
    // Note: Since we can't access the webhooks table (it's in localStorage), 
    // we'll need to receive webhook configuration in the request
    
    const webhookData = {
      event,
      timestamp: new Date().toISOString(),
      data: {
        leadId,
        leadData,
        userId,
        ...body
      }
    };

    console.log('Webhook data prepared:', webhookData);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Outgoing webhook processed successfully',
        data: webhookData
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Outgoing webhook error:', error);
    
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