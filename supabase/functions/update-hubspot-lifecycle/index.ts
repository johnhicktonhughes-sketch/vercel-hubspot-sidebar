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
    const { email, phone, lifecycleStage } = await req.json();

    console.log('Updating contact lifecycle:', { email, phone, lifecycleStage });

    if (!HUBSPOT_API_KEY) {
      console.error('HUBSPOT_API_KEY is not configured');
      throw new Error('HUBSPOT_API_KEY is not configured');
    }

    if (!lifecycleStage) {
      throw new Error('Lifecycle stage is required');
    }

    // First, search for the contact
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

    const searchBody = {
      filterGroups: filters.map(filter => ({
        filters: [filter]
      })),
      properties: ['email', 'lifecyclestage']
    };

    console.log('Searching for contact...');
    const searchResponse = await fetch('https://api.hubapi.com/crm/v3/objects/contacts/search', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${HUBSPOT_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(searchBody),
    });

    if (!searchResponse.ok) {
      const errorData = await searchResponse.json();
      console.error('HubSpot search error:', errorData);
      throw new Error(errorData.message || 'Failed to search contact in HubSpot');
    }

    const searchData = await searchResponse.json();

    if (!searchData.results || searchData.results.length === 0) {
      throw new Error('Contact not found in HubSpot');
    }

    const contactId = searchData.results[0].id;
    console.log('Found contact ID:', contactId);

    // Update the contact's lifecycle stage
    const updateResponse = await fetch(`https://api.hubapi.com/crm/v3/objects/contacts/${contactId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${HUBSPOT_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        properties: {
          lifecyclestage: lifecycleStage
        }
      }),
    });

    if (!updateResponse.ok) {
      const errorData = await updateResponse.json();
      console.error('HubSpot update error:', errorData);
      throw new Error(errorData.message || 'Failed to update contact lifecycle in HubSpot');
    }

    const updatedContact = await updateResponse.json();
    console.log('Contact updated successfully:', contactId);

    return new Response(
      JSON.stringify({ 
        success: true, 
        contactId: updatedContact.id,
        message: 'Contact lifecycle updated successfully in HubSpot' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error updating HubSpot contact lifecycle:', error);
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
