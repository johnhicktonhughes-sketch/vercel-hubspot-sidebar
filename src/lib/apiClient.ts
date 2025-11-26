export interface TrengoContactInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  company: string;
  ticketSubject?: string;
  ticketId?: string | number;
}

export interface HubSpotContact {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  company: string;
  jobTitle: string;
  lifecycleStage: string;
  leadStatus: string;
  createdDate: string;
  lastModifiedDate: string;
}

export interface DealStage {
  id: string;
  label: string;
  displayOrder: number;
}

export interface Pipeline {
  id: string;
  label: string;
  stages: DealStage[];
}

async function requestJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`/api/${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });

  const contentType = response.headers.get('content-type');
  const data = contentType?.includes('application/json') ? await response.json() : await response.text();

  if (!response.ok) {
    const errorMessage = typeof data === 'string' ? data : (data as { error?: string })?.error;
    throw new Error(errorMessage || `Request to ${path} failed with status ${response.status}`);
  }

  return data as T;
}

export function fetchTrengoTicket(ticketId: string) {
  return requestJson<TrengoContactInfo>('fetch-trengo-ticket', {
    method: 'POST',
    body: JSON.stringify({ ticketId }),
  });
}

export function searchHubSpotContact(email?: string, phone?: string) {
  return requestJson<{ success: boolean; contact?: HubSpotContact; message?: string; error?: string }>(
    'search-hubspot-contact',
    {
      method: 'POST',
      body: JSON.stringify({ email, phone }),
    },
  );
}

export function createHubSpotContact(payload: {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  company?: string;
  jobTitle?: string;
}) {
  return requestJson<{ success: boolean; contactId?: string; message?: string; error?: string }>(
    'create-hubspot-contact',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  );
}

export function updateHubSpotLifecycle(payload: { email?: string; phone?: string; lifecycleStage: string }) {
  return requestJson<{ success: boolean; contactId?: string; message?: string; error?: string }>(
    'update-hubspot-lifecycle',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  );
}

export function getDealPipelines() {
  return requestJson<{ success: boolean; pipelines: Pipeline[] }>('get-hubspot-deal-stages');
}

export function createHubSpotDeal(payload: {
  dealName: string;
  amount: string;
  pipeline: string;
  stage: string;
  contactEmail: string;
  closeDate?: string;
  description?: string;
}) {
  return requestJson<{ success: boolean; dealId?: string; message?: string; error?: string }>('create-hubspot-deal', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
