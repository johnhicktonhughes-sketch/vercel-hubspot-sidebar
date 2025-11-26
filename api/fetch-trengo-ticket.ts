import { handleOptions, parseJsonBody, respondWithError, setCorsHeaders } from './_lib/http';

interface TrengoTicketResponse {
  contact?: {
    name?: string;
    email?: string;
    phone?: string;
    company?: string;
  };
  subject?: string;
  id?: string | number;
}

export default async function handler(req: any, res: any) {
  if (handleOptions(req, res)) return;
  setCorsHeaders(res);

  if (req.method !== 'POST') {
    return respondWithError(res, 405, 'Method not allowed');
  }

  const { ticketId } = parseJsonBody<{ ticketId?: string }>(req);

  if (!ticketId) {
    return respondWithError(res, 400, 'ticketId is required');
  }

  const trengoApiKey = process.env.TRENGO_API_KEY;

  if (!trengoApiKey) {
    return respondWithError(res, 500, 'Trengo API key not configured');
  }

  try {
    const response = await fetch(`https://app.trengo.com/api/v2/tickets/${ticketId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${trengoApiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Trengo API error', response.status, errorText);
      return respondWithError(res, response.status, 'Failed to fetch ticket from Trengo');
    }

    const ticketData = (await response.json()) as TrengoTicketResponse;

    const contactInfo = {
      firstName: ticketData.contact?.name?.split(' ')[0] || '',
      lastName: ticketData.contact?.name?.split(' ').slice(1).join(' ') || '',
      email: ticketData.contact?.email || '',
      phone: ticketData.contact?.phone || '',
      company: ticketData.contact?.company || '',
      ticketSubject: ticketData.subject || '',
      ticketId: ticketData.id ?? ticketId,
    };

    return res.status(200).json(contactInfo);
  } catch (error) {
    console.error('Error in fetch-trengo-ticket function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return respondWithError(res, 500, errorMessage);
  }
}
