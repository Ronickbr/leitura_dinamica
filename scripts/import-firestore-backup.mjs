import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import pg from "pg";

const databaseUrl = process.env.DATABASE_URL?.trim();
const backupPath = path.resolve(process.argv[2] ?? "backup_firestore.json");
if (!databaseUrl) throw new Error("DATABASE_URL não configurada.");

const timestamp = value => {
  if (!value) return null;
  if (typeof value === "string") return new Date(value);
  const seconds = value._seconds ?? value.seconds;
  const nanos = value._nanoseconds ?? value.nanoseconds ?? 0;
  if (!Number.isFinite(seconds)) throw new Error("Timestamp Firestore inválido.");
  return new Date(seconds * 1000 + Math.floor(nanos / 1_000_000));
};
const entries = (value, name) => {
  if (!value || Array.isArray(value) || typeof value !== "object") throw new Error(`Coleção ${name} inválida.`);
  return Object.entries(value);
};

const backup = JSON.parse(await fs.readFile(backupPath, "utf8"));
const data = {
  alunos: entries(backup.alunos, "alunos"),
  textos: entries(backup.textos, "textos"),
  avaliacoes: entries(backup.avaliacoes, "avaliacoes"),
  import_history: entries(backup.import_history, "import_history"),
};
const studentIds = new Set(data.alunos.map(([id]) => id));
const textIds = new Set(data.textos.map(([id]) => id));
const orphanStudents = data.avaliacoes.filter(([,v]) => v.alunoId && !studentIds.has(v.alunoId)).length;
const orphanTexts = data.avaliacoes.filter(([,v]) => v.textoId && !textIds.has(v.textoId)).length;
if (orphanStudents) throw new Error(`${orphanStudents} avaliações sem aluno no backup.`);

const pool = new pg.Pool({ connectionString: databaseUrl, max: 1 });
const client = await pool.connect();
try {
  await client.query("SELECT pg_advisory_lock($1)", [2026091502]);
  await client.query("BEGIN");

  for (const [id,v] of data.alunos) {
    await client.query(`INSERT INTO alunos
      (id,nome,turma,serie,turno,professor_id,ano_letivo,meta_pcm,created_at,updated_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW())
      ON CONFLICT(id) DO UPDATE SET nome=$2,turma=$3,serie=$4,turno=$5,professor_id=$6,ano_letivo=$7,meta_pcm=$8`,
      [id,v.nome,v.turma ?? "",v.serie ?? "",v.turno ?? null,v.professorId ?? "legacy",v.anoLetivo ?? "",v.metaPCM ?? 0,timestamp(v.createdAt) ?? new Date()]);
    if (v.diagnostico || v.observacoes) await client.query(`INSERT INTO student_private
      (student_id,professor_id,diagnostico,observacoes,updated_at) VALUES ($1,$2,$3,$4,NOW())
      ON CONFLICT(student_id) DO UPDATE SET diagnostico=$3,observacoes=$4,updated_at=NOW()`,
      [id,v.professorId ?? "legacy",v.diagnostico ?? null,v.observacoes ?? null]);
  }
  for (const [id,v] of data.textos) await client.query(`INSERT INTO textos
    (id,titulo,conteudo,serie,numero_palavras,com_diagnostico,created_at,updated_at)
    VALUES ($1,$2,$3,$4,$5,$6,$7,NOW()) ON CONFLICT(id) DO UPDATE SET
    titulo=$2,conteudo=$3,serie=$4,numero_palavras=$5,com_diagnostico=$6`,
    [id,v.titulo,v.conteudo,v.serie ?? "",v.numeroPalavras ?? 0,v.comDiagnostico ?? false,timestamp(v.createdAt) ?? new Date()]);
  for (const [id,v] of data.avaliacoes) await client.query(`INSERT INTO avaliacoes
    (id,aluno_id,professor_id,texto_id,precisao,transcricao,transcricao_marcada,erros,pcm,intervencao_ia,
     diagnostico_ia,metricas_qualitativas,perguntas_compreensao,words,fluency_metrics,data,created_at)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb,$13::jsonb,$14::jsonb,$15::jsonb,$16,$16)
    ON CONFLICT(id) DO UPDATE SET aluno_id=$2,professor_id=$3,texto_id=$4,precisao=$5,transcricao=$6,
    transcricao_marcada=$7,erros=$8,pcm=$9,intervencao_ia=$10,diagnostico_ia=$11,
    metricas_qualitativas=$12::jsonb,perguntas_compreensao=$13::jsonb,words=$14::jsonb,fluency_metrics=$15::jsonb,data=$16`,
    [id,v.alunoId,v.professorId ?? "legacy",v.textoId || null,v.precisao ?? null,v.transcricao ?? "",v.transcricaoMarcada ?? null,
     v.erros ?? null,v.pcm ?? null,v.intervencaoIA ?? "",v.diagnosticoIA ?? "",JSON.stringify(v.metricasQualitativas ?? {}),
     JSON.stringify(v.perguntasCompreensao ?? []),JSON.stringify(v.words ?? []),JSON.stringify(v.fluencyMetrics ?? {}),timestamp(v.data) ?? new Date()]);
  for (const [id,v] of data.import_history) await client.query(`INSERT INTO import_history
    (id,file_name,success_count,error_count,professor_id,imported_at) VALUES ($1,$2,$3,$4,$5,$6)
    ON CONFLICT(id) DO UPDATE SET file_name=$2,success_count=$3,error_count=$4,professor_id=$5,imported_at=$6`,
    [id,v.fileName ?? "arquivo",v.successCount ?? 0,v.errorCount ?? 0,v.professorId ?? "legacy",timestamp(v.importedAt) ?? new Date()]);

  for (const [table, rows] of Object.entries(data)) {
    const ids = rows.map(([id]) => id);
    const count = await client.query(`SELECT COUNT(*)::int count FROM ${table} WHERE id = ANY($1::text[])`, [ids]);
    if (count.rows[0].count !== ids.length) throw new Error(`Validação falhou em ${table}.`);
  }
  await client.query("COMMIT");
  console.log(JSON.stringify({ status: "ok", imported: Object.fromEntries(Object.entries(data).map(([k,v]) => [k,v.length])), warnings: { evaluationsWithMissingText: orphanTexts } }, null, 2));
} catch (error) {
  await client.query("ROLLBACK").catch(() => undefined);
  throw error;
} finally {
  await client.query("SELECT pg_advisory_unlock($1)", [2026091502]).catch(() => undefined);
  client.release();
  await pool.end();
}
