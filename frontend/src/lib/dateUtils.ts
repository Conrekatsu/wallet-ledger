/** Safe display for API date strings (ISO) or missing values */
export function formatDateTime(value: string | undefined | null): string {
  if (value == null || value === '') return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString();
}
