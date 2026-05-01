import api from './api';
import { MetricsSnapshot } from './types';

export async function getMetrics() {
  const { data } = await api.get<MetricsSnapshot>('/metrics');
  return data;
}
