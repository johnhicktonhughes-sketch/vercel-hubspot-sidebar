import { handleOptions, parseJsonBody, respondWithError, setCorsHeaders } from './_lib/http';

interface UpdateLifecycleRequest {
  email?: string;
  phone?: string;
  lifecycleStage?: string;
}

export default async function handler(req: any, res: any) {
  if (handleOptions(req, res)) return;
  setCorsHeaders(res);

  if (req.method !== 'POST') {
    return respondWithError(res, 405, 'Method not allowed');
  }

  const { email, phone, lifecycleStage } = parseJsonBody<UpdateLifecycleRequest>(req);
  const hubspotApiKey = process.env.HUBSPOT_API_KEY;

  if (!hubspotApiKey) {
    return respondWithError(res, 500, 'HUBSPOT_API_KEY is not configured');
  }

  if (!lifecycleStage) {
    return respondWithError(res, 400, 'Lifecycle stage is required');
  }

  const filters = [] as Array<{ propertyName: string; operator: string; value: string }>;

  if (email) {
    filters.push({ propertyName: 'email', operator: 'EQ', value: email });
  }

  if (phone) {
    filters.push({ propertyName: 'phone', operator: 'EQ', value: phone });
  }

  if (filters.length === 0) {
    return respondWithError(res, 400, 'Either email or phone is required');
  }

  try {
    const searchBody = {
      filterGroups: filters.map((filter) => ({ filters: [filter] })),
      properties: ['email', 'lifecyclestage'],
    };

    const searchResponse = await fetch('https://api.hubapi.com/crm/v3/objects/contacts/search', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${hubspotApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(searchBody),
    });

    if (!searchResponse.ok) {
      const errorData = await searchResponse.json();
      console.error('HubSpot search error:', errorData);
      return respondWithError(res, searchResponse.status, errorData.message || 'Failed to search contact in HubSpot');
    }

    const searchData = await searchResponse.json();

    if (!searchData.results || searchData.results.length === 0) {
      return respondWithError(res, 404, 'Contact not found in HubSpot');
    }

    const contactId = searchData.results[0].id;

    const updateResponse = await fetch(`https://api.hubapi.com/crm/v3/objects/contacts/${contactId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${hubspotApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        properties: {
          lifecyclestage: lifecycleStage,
        },
      }),
    });

    if (!updateResponse.ok) {
      const errorData = await updateResponse.json();
      console.error('HubSpot update error:', errorData);
      return respondWithError(res, updateResponse.status, errorData.message || 'Failed to update contact lifecycle in HubSpot');
    }

    const updatedContact = await updateResponse.json();

    return res.status(200).json({
      success: true,
      contactId: updatedContact.id,
      message: 'Contact lifecycle updated successfully in HubSpot',
    });
  } catch (error) {
    console.error('Error updating HubSpot contact lifecycle:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return respondWithError(res, 500, errorMessage);
  }
}
