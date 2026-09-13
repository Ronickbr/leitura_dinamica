import { Timestamp } from 'firebase/firestore';

export function getResearchRetentionUntil(): Timestamp | null {
  const raw = process.env.NEXT_PUBLIC_RESEARCH_RETENTION_UNTIL?.trim();
  if (!raw) return null;

  const parsed = new Date(`${raw}T23:59:59.999Z`);
  if (Number.isNaN(parsed.getTime())) return null;
  return Timestamp.fromDate(parsed);
}

export function assertResearchRetentionConfigured(): void {
  if (process.env.NODE_ENV === 'production' && !getResearchRetentionUntil()) {
    throw new Error('NEXT_PUBLIC_RESEARCH_RETENTION_UNTIL deve ser definido antes da coleta em produção.');
  }
}
