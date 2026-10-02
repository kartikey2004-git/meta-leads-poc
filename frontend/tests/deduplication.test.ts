import type { Lead } from '../types/lead';

type DisplayLead = Lead & { _isNew: boolean };

function mergeLeads(prev: DisplayLead[], fetched: Lead[]): DisplayLead[] {
  const fetchedIds = new Set(fetched.map((l) => l.id));
  const localNew = prev.filter((l) => l._isNew && !fetchedIds.has(l.id));
  const fetchedDisplay = fetched.map((l) => ({ ...l, _isNew: false }));
  return [...localNew, ...fetchedDisplay];
}

const baseLead: Lead = {
  id: 'lead_1',
  metaLeadId: 'meta_1',
  formId: 'form_1',
  pageId: 'page_1',
  name: 'John Doe',
  email: 'john@example.com',
  phone: null,
  customFields: null,
  createdTime: '2024-01-01T00:00:00.000Z',
  receivedAt: '2024-01-01T00:00:00.000Z',
};

describe('lead deduplication', () => {
  it('does not add a duplicate lead by id', () => {
    const prev: DisplayLead[] = [{ ...baseLead, _isNew: false }];
    const addLeadToList = (leads: DisplayLead[], newLead: Lead) => {
      if (leads.some((l) => l.id === newLead.id)) return leads;
      return [{ ...newLead, _isNew: true }, ...leads];
    };
    const result = addLeadToList(prev, baseLead);
    expect(result).toHaveLength(1);
  });

  it('prepends a new lead with _isNew=true', () => {
    const prev: DisplayLead[] = [{ ...baseLead, _isNew: false }];
    const newLead: Lead = { ...baseLead, id: 'lead_2', name: 'Jane Doe' };
    const addLeadToList = (leads: DisplayLead[], lead: Lead) => {
      if (leads.some((l) => l.id === lead.id)) return leads;
      return [{ ...lead, _isNew: true }, ...leads];
    };
    const result = addLeadToList(prev, newLead);
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('lead_2');
    expect(result[0]._isNew).toBe(true);
  });
});

describe('mergeLeads (reconnect recovery)', () => {
  it('incorporates missed lead from REST response', () => {
    const local: DisplayLead[] = [{ ...baseLead, _isNew: false }];
    const missedLead: Lead = { ...baseLead, id: 'lead_missed', name: 'Missed Lead' };
    const result = mergeLeads(local, [baseLead, missedLead]);
    expect(result.map((l) => l.id)).toContain('lead_missed');
  });

  it('keeps local-only new leads not yet in REST response', () => {
    const justArrived: DisplayLead = { ...baseLead, id: 'lead_new', _isNew: true };
    const local: DisplayLead[] = [justArrived];
    const fetched: Lead[] = [baseLead];
    const result = mergeLeads(local, fetched);
    expect(result.map((l) => l.id)).toContain('lead_new');
  });

  it('does not duplicate a lead present in both local and REST', () => {
    const local: DisplayLead[] = [{ ...baseLead, _isNew: true }];
    const fetched: Lead[] = [baseLead];
    const result = mergeLeads(local, fetched);
    expect(result.filter((l) => l.id === baseLead.id)).toHaveLength(1);
  });
});
