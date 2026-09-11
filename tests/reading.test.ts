import { describe, it, expect, vi } from 'vitest';
import { measuredPCM, analysisConfidence } from '../lib/readingProtocol';
import { calculatePCM } from '../lib/pcmUtils';
import { applyDeterministicValidation, getFallbackAnalysis } from '../lib/analysisService';
vi.mock('../lib/errorUtils', async importOriginal => ({ ...await importOriginal<object>(), logDetailed: vi.fn() }));
describe('PCM e análise', () => {
 it('usa duração real, inclusive acima de 60 segundos', () => {
   expect(measuredPCM(60, 75)).toBe(48);
   expect(measuredPCM(30, 30)).toBe(60);
 });
 it.each([0, -1, NaN, Infinity, 121])('recusa duração inválida %s', duration => expect(() => measuredPCM(30, duration)).toThrow());
 it('não aumenta a confiança informada', () => {
   expect(analysisConfidence(12, false)).toBe(12);
   expect(analysisConfidence(90, true)).toBe(0);
 });
 it('preserva falha da IA ao validar métricas corretas', () => {
   const metrics = calculatePCM('o gato dormiu', 'o gato dormiu');
   const result = applyDeterministicValidation(getFallbackAnalysis('timeout'), metrics);
   expect(result.nivel_de_confianca).toBe(0);
   expect(result.status).toBe('indisponivel');
   expect(result.diagnostico).toContain('indisponível');
 });
 it('não conta o restante não lido como erros', () => {
   const metrics = calculatePCM('o gato dormiu sobre a mesa', 'o gato dormiu');
   expect(metrics.corretas).toBe(3);
   expect(metrics.erros).toBe(0);
 });
 it('marca uma substituição lexical', () => {
   const metrics = calculatePCM('o gato dormiu', 'o peixe dormiu');
   expect(metrics.erros).toBeGreaterThan(0);
 });
});
