import api from './api';

export async function getHealth() {
  const { data } = await api.get<{ status: string; timestamp: string }>('/health');
  return data;
}
