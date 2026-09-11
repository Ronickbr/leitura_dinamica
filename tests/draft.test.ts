import { expect, it } from 'vitest';
import { draftKey, parseDraft } from '../lib/evaluationDraft';
const now = 100000000;
const valid = { draftId: 'c48774b1-2eec-4f88-8f64-f1a0eed44dbd', professorId: 'p1', alunoId: 'a1',
  createdAt: now, textoId: 't1', pcm: 30, duration: 60, protocolVersion: 'v1', classificationVersion: 'v1' };
it('separa as chaves por aluno e professor', () => expect(draftKey('p1','a1')).not.toBe(draftKey('p2','a1')));
it('restaura rascunho válido', () => expect(parseDraft(JSON.stringify(valid), 'p1','a1',now).draftId).toBe(valid.draftId));
it.each([null, '{', '{}'])('recusa conteúdo inválido', raw => expect(() => parseDraft(raw,'p1','a1',now)).toThrow());
it('bloqueia troca de aluno', () => expect(() => parseDraft(JSON.stringify(valid),'p1','a2',now)).toThrow());
it('bloqueia troca de professor', () => expect(() => parseDraft(JSON.stringify(valid),'p2','a1',now)).toThrow());
it('expira rascunhos antigos', () => expect(() => parseDraft(JSON.stringify(valid),'p1','a1',now+86400001)).toThrow());
