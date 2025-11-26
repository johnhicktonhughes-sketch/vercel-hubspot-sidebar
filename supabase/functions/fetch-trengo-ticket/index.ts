import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { ticketId } = await req.json();
    console.log('Fetching Trengo ticket:', ticketId);

    if (!ticketId) {
      return new Response(
        JSON.stringify({ error: 'ticketId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const trengoApiKey = Deno.env.get('TRENGO_API_KEY');
    if (!trengoApiKey) {
      console.error('TRENGO_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Trengo API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch ticket data from Trengo API
    const response = await fetch(`https://app.trengo.com/api/v2/tickets/${ticketId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${trengoApiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('Trengo API error:', response.status, await response.text());
      return new Response(
        JSON.stringify({ error: 'Failed to fetch ticket from Trengo' }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const ticketData = await response.json();
    console.log('Fetched ticket data:', ticketData);

    // Extract contact information from ticket
    const contactInfo = {
      firstName: ticketData.contact?.name?.split(' ')[0] || '',
      lastName: ticketData.contact?.name?.split(' ').slice(1).join(' ') || '',
      email: ticketData.contact?.email || '',
      phone: ticketData.contact?.phone || '',
      company: ticketData.contact?.company || '',
      ticketSubject: ticketData.subject || '',
      ticketId: ticketData.id || ticketId,
    };

    return new Response(
      JSON.stringify(contactInfo),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in fetch-trengo-ticket function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
