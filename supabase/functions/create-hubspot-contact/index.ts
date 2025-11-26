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
    const { firstName, lastName, email, phone, company, jobTitle } = await req.json();

    console.log('Creating HubSpot contact:', { firstName, lastName, email });

    if (!HUBSPOT_API_KEY) {
      console.error('HUBSPOT_API_KEY is not configured');
      throw new Error('HUBSPOT_API_KEY is not configured');
    }

    console.log('API Key exists:', HUBSPOT_API_KEY ? 'Yes' : 'No');
    console.log('API Key length:', HUBSPOT_API_KEY?.length || 0);

    // Prepare HubSpot contact properties
    const properties: Record<string, string> = {
      firstname: firstName,
      lastname: lastName,
      email: email,
    };

    if (phone) properties.phone = phone;
    if (company) properties.company = company;
    if (jobTitle) properties.jobtitle = jobTitle;

    // Create contact in HubSpot
    const response = await fetch('https://api.hubapi.com/crm/v3/objects/contacts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${HUBSPOT_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ properties }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('HubSpot API error:', errorData);
      throw new Error(errorData.message || 'Failed to create contact in HubSpot');
    }

    const contactData = await response.json();
    console.log('Contact created successfully:', contactData.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        contactId: contactData.id,
        message: 'Contact created successfully in HubSpot' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error creating HubSpot contact:', error);
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
