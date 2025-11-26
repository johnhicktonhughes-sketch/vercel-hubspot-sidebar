import { handleOptions, parseJsonBody, respondWithError, setCorsHeaders } from './_lib/http';

interface CreateHubSpotDealRequest {
  dealName?: string;
  amount?: string;
  pipeline?: string;
  stage?: string;
  contactEmail?: string;
  closeDate?: string;
  description?: string;
}

export default async function handler(req: any, res: any) {
  if (handleOptions(req, res)) return;
  setCorsHeaders(res);

  if (req.method !== 'POST') {
    return respondWithError(res, 405, 'Method not allowed');
  }

  const hubspotDealsApiKey = process.env.HUBSPOT_DEALS_API_KEY;
  const hubspotApiKey = process.env.HUBSPOT_API_KEY;

  if (!hubspotDealsApiKey) {
    return respondWithError(res, 500, 'HUBSPOT_DEALS_API_KEY is not configured');
  }

  if (!hubspotApiKey) {
    return respondWithError(res, 500, 'HUBSPOT_API_KEY is not configured');
  }

  const { dealName, amount, pipeline, stage, contactEmail, closeDate, description } =
    parseJsonBody<CreateHubSpotDealRequest>(req);

  if (!dealName || !amount || !pipeline || !stage) {
    return respondWithError(res, 400, 'dealName, amount, pipeline, and stage are required');
  }

  try {
    let contactId: string | null = null;

    if (contactEmail) {
      const searchResponse = await fetch('https://api.hubapi.com/crm/v3/objects/contacts/search', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${hubspotApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filterGroups: [
            {
              filters: [
                {
                  propertyName: 'email',
                  operator: 'EQ',
                  value: contactEmail,
                },
              ],
            },
          ],
          properties: ['email'],
        }),
      });

      if (searchResponse.ok) {
        const searchData = await searchResponse.json();
        if (searchData.results && searchData.results.length > 0) {
          contactId = searchData.results[0].id;
        }
      }
    }

    const properties: Record<string, string> = {
      dealname: dealName,
      amount,
      dealstage: stage,
      pipeline,
    };

    if (closeDate) {
      const closeDateTime = new Date(closeDate).getTime();
      properties.closedate = closeDateTime.toString();
    }

    if (description) {
      properties.description = description;
    }

    const createResponse = await fetch('https://api.hubapi.com/crm/v3/objects/deals', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${hubspotDealsApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ properties }),
    });

    if (!createResponse.ok) {
      const errorData = await createResponse.json();
      console.error('HubSpot API error:', errorData);
      return respondWithError(res, createResponse.status, errorData.message || 'Failed to create deal in HubSpot');
    }

    const dealData = await createResponse.json();

    if (contactId) {
      const associateResponse = await fetch(
        `https://api.hubapi.com/crm/v4/objects/deals/${dealData.id}/associations/contacts/${contactId}`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${hubspotDealsApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify([
            {
              associationCategory: 'HUBSPOT_DEFINED',
              associationTypeId: 3,
            },
          ]),
        },
      );

      if (!associateResponse.ok) {
        console.error('Failed to associate deal with contact', await associateResponse.text());
      }
    }

    return res.status(200).json({
      success: true,
      dealId: dealData.id,
      message: 'Deal created successfully in HubSpot',
    });
  } catch (error) {
    console.error('Error creating HubSpot deal:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return respondWithError(res, 500, errorMessage);
  }
}
