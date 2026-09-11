import { beforeEach, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';
const mocks = vi.hoisted(() => ({ authenticate: vi.fn(), quota: vi.fn(), process: vi.fn(), admin: vi.fn() }));
vi.mock('../lib/server/audioSecurity', () => ({
 authenticateAudioRequest: mocks.authenticate, consumeAudioQuota: mocks.quota,
 RequestError: class extends Error { constructor(public status: number, message: string) { super(message); } },
}));
vi.mock('../lib/server/firebaseAdmin', () => ({ adminServices: mocks.admin }));
vi.mock('../lib/analysisService', () => ({ processReadingAudio: mocks.process }));
import { POST } from '../app/api/process-audio/route';
import { RequestError } from '../lib/server/audioSecurity';
beforeEach(() => { vi.clearAllMocks(); mocks.authenticate.mockResolvedValue({uid:'p1'}); mocks.quota.mockResolvedValue(undefined); });
it('recusa sessão ausente antes de processar o corpo', async () => {
 mocks.authenticate.mockRejectedValue(new RequestError(401,'Faça login'));
 const response = await POST(new NextRequest('http://localhost/api/process-audio', {method:'POST'}));
 expect(response.status).toBe(401);
 expect(mocks.process).not.toHaveBeenCalled();
 expect(mocks.quota).not.toHaveBeenCalled();
});
it('recusa excesso de chamadas', async () => {
 mocks.quota.mockRejectedValue(new RequestError(429,'Limite'));
 const response = await POST(new NextRequest('http://localhost/api/process-audio', {method:'POST'}));
 expect(response.status).toBe(429);
 expect(response.headers.get('retry-after')).toBe('60');
});
it('bloqueia acesso ao aluno de outro professor', async () => {
 mocks.admin.mockReturnValue({db:{collection:()=>({doc:(id: string)=>({get:async()=>({
   exists:true, data:()=>id==='a1'?{professorId:'p2'}:{conteudo:'texto'}
 })})})}});
 const form = new FormData();
 form.append('aluno_id','a1'); form.append('texto_id','t1');
 form.append('file',new Blob(['RIFF0000WAVEdata'],{type:'audio/wav'}),'reading.wav');
 const response = await POST(new NextRequest('http://localhost/api/process-audio',{method:'POST',body:form}));
 expect(response.status).toBe(403);
 expect(mocks.process).not.toHaveBeenCalled();
});
