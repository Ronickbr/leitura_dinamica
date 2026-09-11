import { readFileSync } from 'node:fs';
import { applicationDefault, cert, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
const file = process.argv[2];
if (!file) throw new Error('Informe o arquivo de mapeamento. Modo padrão: somente conferência.');
const projectId = process.env.FIREBASE_PROJECT_ID;
if (!projectId) throw new Error('FIREBASE_PROJECT_ID é obrigatório.');
const app = initializeApp({projectId, credential: process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY
 ? cert({projectId, clientEmail:process.env.FIREBASE_CLIENT_EMAIL, privateKey:process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g,'\n')})
 : applicationDefault()});
const db=getFirestore(app);
const rows=JSON.parse(readFileSync(file,'utf8'));
if (!Array.isArray(rows)) throw new Error('O mapa deve ser uma lista.');
const seen=new Set();
const prepared=[];
for (const row of rows) {
 if (!['alunos','avaliacoes','import_history','textos'].includes(row.collection) ||
     typeof row.id !== 'string' || !/^[\w-]+$/.test(row.id) ||
     typeof row.professorId !== 'string' || !row.professorId || row.professorId.length > 128)
   throw new Error('Entrada inválida no mapa.');
 const key=row.collection+'/'+row.id;
 if(seen.has(key)) throw new Error('Entrada repetida: '+key);
 seen.add(key);
 await getAuth(app).getUser(row.professorId);
 const ref=db.doc(key);
 const snapshot=await ref.get();
 if(!snapshot.exists) throw new Error('Documento inexistente: '+key);
 if(snapshot.data().professorId) throw new Error('Documento já possui proprietário: '+key);
 prepared.push({ref, row});
}
const apply=process.argv.includes('--apply');
console.log(JSON.stringify({projectId, mode:apply?'APLICAR':'CONFERIR', documents:prepared.length}));
for(const {ref,row} of prepared) {
 console.log(row.collection+'/'+row.id);
 if(apply) await db.runTransaction(async tx=>{
   const current=await tx.get(ref);
   if(!current.exists || current.data().professorId) throw new Error('Registro mudou durante a migração: '+ref.path);
   tx.update(ref,{professorId:row.professorId});
 });
}
