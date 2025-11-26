import { handleOptions, respondWithError, setCorsHeaders } from './_lib/http';

export default async function handler(req: any, res: any) {
  if (handleOptions(req, res)) return;
  setCorsHeaders(res);

  if (req.method !== 'GET') {
    return respondWithError(res, 405, 'Method not allowed');
  }

  const hubspotDealsApiKey = process.env.HUBSPOT_DEALS_API_KEY;

  if (!hubspotDealsApiKey) {
    return respondWithError(res, 500, 'HUBSPOT_DEALS_API_KEY is not configured');
  }

  try {
    const response = await fetch('https://api.hubapi.com/crm/v3/pipelines/deals', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${hubspotDealsApiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('HubSpot API error:', errorData);
      return respondWithError(res, response.status, errorData.message || 'Failed to fetch deal pipelines from HubSpot');
    }

    const pipelinesData = await response.json();

    if (!pipelinesData.results || pipelinesData.results.length === 0) {
      return respondWithError(res, 404, 'No deal pipelines found in HubSpot');
    }

    const pipelines = pipelinesData.results.map((pipeline: any) => ({
      id: pipeline.id,
      label: pipeline.label,
      stages: pipeline.stages.map((stage: any) => ({
        id: stage.id,
        label: stage.label,
        displayOrder: stage.displayOrder,
      })),
    }));

    return res.status(200).json({
      success: true,
      pipelines,
    });
  } catch (error) {
    console.error('Error fetching HubSpot deal stages:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return respondWithError(res, 500, errorMessage);
  }
}
