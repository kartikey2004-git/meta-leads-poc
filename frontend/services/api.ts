import { API_URL } from '../config';
import type { Lead } from '../types/lead';

export async function fetchLeads(): Promise<Lead[]> {
  const response = await fetch(`${API_URL}/leads`);
  if (!response.ok) {
    throw new Error(`Failed to fetch leads: ${response.status}`);
  }
  return response.json() as Promise<Lead[]>;
}
