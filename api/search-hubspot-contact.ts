import { handleOptions, parseJsonBody, respondWithError, setCorsHeaders } from './_lib/http';

interface SearchHubSpotContactRequest {
  email?: string;
  phone?: string;
}

export default async function handler(req: any, res: any) {
  if (handleOptions(req, res)) return;
  setCorsHeaders(res);

  if (req.method !== 'POST') {
    return respondWithError(res, 405, 'Method not allowed');
  }

  const { email, phone } = parseJsonBody<SearchHubSpotContactRequest>(req);

  const hubspotApiKey = process.env.HUBSPOT_API_KEY;

  if (!hubspotApiKey) {
    return respondWithError(res, 500, 'HUBSPOT_API_KEY is not configured');
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
        'hs_lead_status',
      ],
    };

    const response = await fetch('https://api.hubapi.com/crm/v3/objects/contacts/search', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${hubspotApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(searchBody),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('HubSpot API error:', errorData);
      return respondWithError(res, response.status, errorData.message || 'Failed to search contact in HubSpot');
    }

    const searchData = await response.json();

    if (searchData.results && searchData.results.length > 0) {
      const contact = searchData.results[0];
      return res.status(200).json({
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
          lastModifiedDate: contact.properties.lastmodifieddate || '',
        },
      });
    }

    return res.status(200).json({
      success: false,
      message: 'Contact not found in HubSpot',
    });
  } catch (error) {
    console.error('Error searching HubSpot contact:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return respondWithError(res, 500, errorMessage);
  }
}
