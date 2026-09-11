import { readFileSync } from 'node:fs';
import { beforeAll, afterAll, beforeEach, it, expect } from 'vitest';
import { initializeTestEnvironment, assertSucceeds, assertFails, RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, setDoc, getDoc, deleteDoc, updateDoc, getDocs, collection, query, where } from 'firebase/firestore';
let env: RulesTestEnvironment;
beforeAll(async () => {
 env = await initializeTestEnvironment({projectId:'demo-leitura',firestore:{rules:readFileSync('firestore.rules','utf8')}});
});
afterAll(async()=>{await env?.cleanup();});
beforeEach(async()=>{
 await env.clearFirestore();
 await env.withSecurityRulesDisabled(async ctx=>{
  const db=ctx.firestore();
  await setDoc(doc(db,'alunos/a1'),{professorId:'p1',nome:'Aluno'});
  await setDoc(doc(db,'textos/t1'),{professorId:'p1',conteudo:'texto'});
  await setDoc(doc(db,'avaliacoes/p1_existing'),{professorId:'p1',alunoId:'a1',textoId:'t1',pcm:30,precisao:100});
 });
});
it('isola consultas por professor e bloqueia não autenticados',async()=>{
 const p1=env.authenticatedContext('p1').firestore(), p2=env.authenticatedContext('p2').firestore();
 await assertSucceeds(getDoc(doc(p1,'alunos/a1')));
 await assertFails(getDoc(doc(p2,'alunos/a1')));
 await assertFails(getDocs(collection(p1,'alunos')));
 await assertSucceeds(getDocs(query(collection(p1,'alunos'),where('professorId','==','p1'))));
 await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(),'textos/t1')));
});
it('reserva exclusão ao claim administrativo',async()=>{
 await assertFails(deleteDoc(doc(env.authenticatedContext('p1').firestore(),'alunos/a1')));
 await assertSucceeds(deleteDoc(doc(env.authenticatedContext('admin',{admin:true}).firestore(),'alunos/a1')));
});
it('impede troca de proprietário',async()=>{
 await assertFails(updateDoc(doc(env.authenticatedContext('p1').firestore(),'alunos/a1'),{professorId:'p2'}));
});
it('impede avaliação de aluno alheio',async()=>{
 await assertFails(setDoc(doc(env.authenticatedContext('p2').firestore(),'avaliacoes/p2_new'),
  {professorId:'p2',alunoId:'a1',textoId:'t1',pcm:30,precisao:100}));
});
it('autoriza rascunho próprio inexistente para transação idempotente',async()=>{
 await assertSucceeds(getDoc(doc(env.authenticatedContext('p1').firestore(),'avaliacoes/p1_new')));
 await assertFails(getDoc(doc(env.authenticatedContext('p2').firestore(),'avaliacoes/p1_new')));
});
it('permite criar avaliação válida e editar somente o plano',async()=>{
 const db=env.authenticatedContext('p1').firestore();
 await assertSucceeds(setDoc(doc(db,'avaliacoes/p1_new'),{professorId:'p1',alunoId:'a1',textoId:'t1',pcm:30,precisao:100}));
 await assertSucceeds(updateDoc(doc(db,'avaliacoes/p1_new'),{planoPedagogico:{atividade:'Leitura guiada',meta:'',reavaliacao:'',status:'planejada'}}));
 await assertFails(updateDoc(doc(db,'avaliacoes/p1_new'),{pcm:999}));
});
it('bloqueia quotas e demais coleções no cliente',async()=>{
 await assertFails(setDoc(doc(env.authenticatedContext('p1').firestore(),'_audio_quotas/p1'),{dayCount:0}));
});

it('salva duas vezes o mesmo rascunho sem duplicar a avaliação', async () => {
 const { setFirebaseInstances, saveAvaliacao } = await import('../lib/evaluationsService');
 const db = env.authenticatedContext('p1').firestore();
 setFirebaseInstances(db as never, { currentUser: { uid: 'p1' } } as never);
 const evaluation = {alunoId:'a1',textoId:'t1',pcm:30,precisao:100,transcricao:'texto',diagnosticoIA:'revisto',intervencaoIA:'guiada'};
 const id = 'c48774b1-2eec-4f88-8f64-f1a0eed44dbd';
 const [first, second] = await Promise.all([saveAvaliacao(evaluation,id),saveAvaliacao(evaluation,id)]);
 expect(first).toBe(second);
 const saved = await getDoc(doc(db,'avaliacoes/' + first));
 expect(saved.exists()).toBe(true);
});

it('mantém a cota sob chamadas concorrentes e renova a janela', async () => {
 process.env.FIREBASE_PROJECT_ID = 'demo-leitura';
 const { consumeAudioQuota } = await import('../lib/server/audioSecurity');
 const results = await Promise.allSettled(Array.from({length:6},()=>consumeAudioQuota('quota-user',120000)));
 expect(results.filter(result=>result.status==='fulfilled')).toHaveLength(5);
 expect(results.filter(result=>result.status==='rejected')).toHaveLength(1);
 await consumeAudioQuota('quota-user',180000);
});
it('recusa plano pedagógico fora do esquema', async () => {
 const db=env.authenticatedContext('p1').firestore();
 await assertFails(updateDoc(doc(db,'avaliacoes/p1_existing'),{planoPedagogico:{status:'inventado'}}));
});
