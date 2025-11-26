import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const HUBSPOT_API_KEY = Deno.env.get('HUBSPOT_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { email, phone } = await req.json();

    console.log('Searching HubSpot contact:', { email, phone });

    if (!HUBSPOT_API_KEY) {
      console.error('HUBSPOT_API_KEY is not configured');
      throw new Error('HUBSPOT_API_KEY is not configured');
    }

    // Build search filters
    const filters = [];
    if (email) {
      filters.push({
        propertyName: 'email',
        operator: 'EQ',
        value: email
      });
    }
    if (phone) {
      filters.push({
        propertyName: 'phone',
        operator: 'EQ',
        value: phone
      });
    }

    if (filters.length === 0) {
      throw new Error('Either email or phone is required');
    }

    // Search for contact in HubSpot
    const searchBody = {
      filterGroups: filters.map(filter => ({
        filters: [filter]
      })),
      properties: [
        'firstname',
        'lastname',
        'email',
        'phone',
        'company',
        'jobtitle',
        'lifecyclestage',
        'createdate',
        'lastmodifieddate',
        'hs_lead_status'
      ]
    };

    console.log('Search request body:', JSON.stringify(searchBody, null, 2));

    const response = await fetch('https://api.hubapi.com/crm/v3/objects/contacts/search', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${HUBSPOT_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(searchBody),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('HubSpot API error:', errorData);
      throw new Error(errorData.message || 'Failed to search contact in HubSpot');
    }

    const searchData = await response.json();
    console.log('Search results:', JSON.stringify(searchData, null, 2));

    if (searchData.results && searchData.results.length > 0) {
      const contact = searchData.results[0];
      return new Response(
        JSON.stringify({ 
          success: true, 
          contact: {
            id: contact.id,
            firstName: contact.properties.firstname || '',
            lastName: contact.properties.lastname || '',
            email: contact.properties.email || '',
            phone: contact.properties.phone || '',
            company: contact.properties.company || '',
            jobTitle: contact.properties.jobtitle || '',
            lifecycleStage: contact.properties.lifecyclestage || '',
            leadStatus: contact.properties.hs_lead_status || '',
            createdDate: contact.properties.createdate || '',
            lastModifiedDate: contact.properties.lastmodifieddate || ''
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Contact not found in HubSpot'
        }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
  } catch (error) {
    console.error('Error searching HubSpot contact:', error);
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
