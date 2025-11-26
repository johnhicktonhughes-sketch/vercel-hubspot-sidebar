const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET,POST,PATCH,OPTIONS',
};

export function setCorsHeaders(res: any) {
  Object.entries(CORS_HEADERS).forEach(([key, value]) => {
    res.setHeader(key, value);
  });
}

export function handleOptions(req: any, res: any) {
  if (req.method === 'OPTIONS') {
    setCorsHeaders(res);
    res.status(200).end();
    return true;
  }
  return false;
}

export function parseJsonBody<T>(req: any): T {
  if (!req || req.method === 'GET') {
    return {} as T;
  }

  const body = req.body;

  if (!body) {
    return {} as T;
  }

  if (typeof body === 'string') {
    try {
      return JSON.parse(body) as T;
    } catch (error) {
      console.error('Failed to parse request body', error);
      return {} as T;
    }
  }

  return body as T;
}

export function respondWithError(res: any, status: number, message: string) {
  setCorsHeaders(res);
  res.status(status).json({ success: false, error: message });
}
