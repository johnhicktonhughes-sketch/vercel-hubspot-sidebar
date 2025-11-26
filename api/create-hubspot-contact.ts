import { handleOptions, parseJsonBody, respondWithError, setCorsHeaders } from './_lib/http';

interface CreateHubSpotContactRequest {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  company?: string;
  jobTitle?: string;
}

export default async function handler(req: any, res: any) {
  if (handleOptions(req, res)) return;
  setCorsHeaders(res);

  if (req.method !== 'POST') {
    return respondWithError(res, 405, 'Method not allowed');
  }

  const { firstName, lastName, email, phone, company, jobTitle } = parseJsonBody<CreateHubSpotContactRequest>(req);
  const hubspotApiKey = process.env.HUBSPOT_API_KEY;

  if (!hubspotApiKey) {
    return respondWithError(res, 500, 'HUBSPOT_API_KEY is not configured');
  }

  if (!firstName || !lastName || !email) {
    return respondWithError(res, 400, 'First name, last name, and email are required');
  }

  const properties: Record<string, string> = {
    firstname: firstName,
    lastname: lastName,
    email,
  };

  if (phone) properties.phone = phone;
  if (company) properties.company = company;
  if (jobTitle) properties.jobtitle = jobTitle;

  try {
    const response = await fetch('https://api.hubapi.com/crm/v3/objects/contacts', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${hubspotApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ properties }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('HubSpot API error:', errorData);
      return respondWithError(res, response.status, errorData.message || 'Failed to create contact in HubSpot');
    }

    const contactData = await response.json();

    return res.status(200).json({
      success: true,
      contactId: contactData.id,
      message: 'Contact created successfully in HubSpot',
    });
  } catch (error) {
    console.error('Error creating HubSpot contact:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return respondWithError(res, 500, errorMessage);
  }
}
