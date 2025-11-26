import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const HUBSPOT_DEALS_API_KEY = Deno.env.get('HUBSPOT_DEALS_API_KEY');
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
    const { dealName, amount, pipeline, stage, contactEmail, closeDate, description } = await req.json();

    console.log('Creating HubSpot deal:', { dealName, amount, pipeline, stage, contactEmail });

    if (!HUBSPOT_DEALS_API_KEY) {
      console.error('HUBSPOT_DEALS_API_KEY is not configured');
      throw new Error('HUBSPOT_DEALS_API_KEY is not configured');
    }

    if (!HUBSPOT_API_KEY) {
      console.error('HUBSPOT_API_KEY is not configured');
      throw new Error('HUBSPOT_API_KEY is not configured');
    }

    // First, search for the contact by email
    let contactId = null;
    if (contactEmail) {
      console.log('Searching for contact:', contactEmail);
      const searchResponse = await fetch('https://api.hubapi.com/crm/v3/objects/contacts/search', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${HUBSPOT_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filterGroups: [{
            filters: [{
              propertyName: 'email',
              operator: 'EQ',
              value: contactEmail
            }]
          }],
          properties: ['email']
        }),
      });

      if (searchResponse.ok) {
        const searchData = await searchResponse.json();
        if (searchData.results && searchData.results.length > 0) {
          contactId = searchData.results[0].id;
          console.log('Found contact ID:', contactId);
        } else {
          console.warn('Contact not found, deal will be created without association');
        }
      }
    }

    // Prepare deal properties
    const properties: Record<string, string> = {
      dealname: dealName,
      amount: amount,
      dealstage: stage,
      pipeline: pipeline,
    };

    if (closeDate) {
      // Convert date to timestamp in milliseconds
      const closeDateTime = new Date(closeDate).getTime();
      properties.closedate = closeDateTime.toString();
    }

    if (description) {
      properties.description = description;
    }

    // Create deal in HubSpot
    console.log('Creating deal with properties:', properties);
    const createResponse = await fetch('https://api.hubapi.com/crm/v3/objects/deals', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${HUBSPOT_DEALS_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ properties }),
    });

    if (!createResponse.ok) {
      const errorData = await createResponse.json();
      console.error('HubSpot API error:', errorData);
      throw new Error(errorData.message || 'Failed to create deal in HubSpot');
    }

    const dealData = await createResponse.json();
    console.log('Deal created successfully:', dealData.id);

    // Associate deal with contact if contact was found
    if (contactId) {
      console.log('Associating deal with contact');
      const associateResponse = await fetch(
        `https://api.hubapi.com/crm/v4/objects/deals/${dealData.id}/associations/contacts/${contactId}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${HUBSPOT_DEALS_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify([{
            associationCategory: "HUBSPOT_DEFINED",
            associationTypeId: 3 // Deal to Contact association type
          }]),
        }
      );

      if (associateResponse.ok) {
        console.log('Deal associated with contact successfully');
      } else {
        const errorData = await associateResponse.json();
        console.error('Failed to associate deal with contact:', errorData);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        dealId: dealData.id,
        message: 'Deal created successfully in HubSpot' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error creating HubSpot deal:', error);
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
