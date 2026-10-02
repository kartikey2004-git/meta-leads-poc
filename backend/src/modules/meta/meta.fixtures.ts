import type { MetaLeadResponse } from './meta.schema';

export const fixtures = {
  validLead: {
    id: 'lead_mock_001',
    created_time: '2024-10-01T14:30:00+0000',
    form_id: 'form_456',
    field_data: [
      { name: 'full_name', values: ['Sarah Johnson'] },
      { name: 'email', values: ['sarah.johnson@example.com'] },
      { name: 'phone_number', values: ['+1-555-0123'] },
      { name: 'company', values: ['Acme Corp'] },
    ],
  } as MetaLeadResponse,

  leadWithMissingOptional: {
    id: 'lead_mock_002',
    created_time: '2024-10-01T14:25:00+0000',
    form_id: 'form_789',
    field_data: [
      { name: 'full_name', values: ['Mike Chen'] },
      { name: 'email', values: ['mike@example.com'] },
    ],
  } as MetaLeadResponse,

  leadWithCustomFieldsOnly: {
    id: 'lead_mock_003',
    created_time: '2024-10-01T14:20:00+0000',
    field_data: [
      { name: 'full_name', values: ['Alex Rodriguez'] },
      { name: 'industry', values: ['Technology'] },
      { name: 'budget_range', values: ['$50k-$100k'] },
      { name: 'timeline', values: ['Next 30 days'] },
    ],
  } as MetaLeadResponse,

  leadWithEmptyValues: {
    id: 'lead_mock_004',
    created_time: '2024-10-01T14:15:00+0000',
    field_data: [
      { name: 'full_name', values: ['Jane Doe'] },
      { name: 'phone_number', values: [] },
    ],
  } as MetaLeadResponse,
};

export function getRandomFixture(): MetaLeadResponse {
  const fixtureList = Object.values(fixtures);
  const randomIndex = Math.floor(Math.random() * fixtureList.length);
  const fixture = fixtureList[randomIndex];
  return {
    ...fixture,
    id: `lead_mock_${Date.now()}`,
  };
}

export const mockErrors = {
  invalidToken: {
    error: { type: 'OAuthException', code: 190, message: 'Invalid OAuth access token.' },
  },
  insufficientPermissions: {
    error: {
      type: 'GraphMethodException',
      code: 200,
      message: 'Caller does not have permission to access this field on parameter (Field)',
    },
  },
  leadNotFound: {
    error: { type: 'GraphMethodException', code: 100, message: 'Invalid parameter' },
  },
  rateLimit: {
    error: { type: 'OAuthException', code: 80004, message: 'Application request limit reached' },
  },
};
