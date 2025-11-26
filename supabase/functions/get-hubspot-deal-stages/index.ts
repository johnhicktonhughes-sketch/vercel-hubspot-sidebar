import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const HUBSPOT_DEALS_API_KEY = Deno.env.get('HUBSPOT_DEALS_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('Fetching HubSpot deal stages');

    if (!HUBSPOT_DEALS_API_KEY) {
      console.error('HUBSPOT_DEALS_API_KEY is not configured');
      throw new Error('HUBSPOT_DEALS_API_KEY is not configured');
    }

    // Get all pipelines
    const response = await fetch('https://api.hubapi.com/crm/v3/pipelines/deals', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${HUBSPOT_DEALS_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('HubSpot API error:', errorData);
      throw new Error(errorData.message || 'Failed to fetch deal pipelines from HubSpot');
    }

    const pipelinesData = await response.json();
    console.log('Pipelines fetched:', pipelinesData.results?.length || 0);

    if (!pipelinesData.results || pipelinesData.results.length === 0) {
      throw new Error('No deal pipelines found in HubSpot');
    }

    // Return all pipelines with their stages
    const pipelines = pipelinesData.results.map((pipeline: any) => ({
      id: pipeline.id,
      label: pipeline.label,
      stages: pipeline.stages.map((stage: any) => ({
        id: stage.id,
        label: stage.label,
        displayOrder: stage.displayOrder,
      }))
    }));

    console.log('Pipelines formatted:', pipelines.length);

    return new Response(
      JSON.stringify({ 
        success: true, 
        pipelines
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error fetching HubSpot deal stages:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
