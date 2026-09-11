export const READING_PROTOCOL = 'pcm-audio-duration-v1';
export const CLASSIFICATION_VERSION = 'faixas-historicas-v1';
export function measuredPCM(correctWords: number, duration: number): number {
  if (!Number.isFinite(duration) || duration < 1 || duration > 120)
    throw new Error('A gravação deve ter entre 1 e 120 segundos. Grave novamente.');
  if (!Number.isFinite(correctWords) || correctWords < 0)
    throw new Error('Contagem de palavras inválida.');
  return Math.round(correctWords * 60 / duration);
}
export function analysisConfidence(value: unknown, unavailable: boolean): number {
  if (unavailable || typeof value !== 'number' || !Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, value));
}
