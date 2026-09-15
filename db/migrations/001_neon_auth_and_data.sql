BEGIN;

CREATE TABLE IF NOT EXISTS app_users (
  email TEXT PRIMARY KEY CHECK (email = LOWER(email)),
  display_name TEXT,
  role TEXT NOT NULL CHECK (role IN ('administrador','professor')),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS alunos (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  turma TEXT NOT NULL,
  serie TEXT NOT NULL,
  turno TEXT,
  professor_id TEXT NOT NULL,
  ano_letivo TEXT NOT NULL,
  meta_pcm INTEGER DEFAULT 0,
  retention_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE alunos ADD COLUMN IF NOT EXISTS retention_until TIMESTAMPTZ;
ALTER TABLE alunos ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS student_private (
  student_id TEXT PRIMARY KEY REFERENCES alunos(id) ON DELETE CASCADE,
  professor_id TEXT NOT NULL,
  diagnostico TEXT,
  observacoes TEXT,
  retention_until TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Compatibilidade com uma carga inicial que ainda tenha campos privados em alunos.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='alunos' AND column_name='diagnostico') THEN
    INSERT INTO student_private (student_id,professor_id,diagnostico,observacoes,retention_until)
    SELECT id,professor_id,diagnostico,observacoes,retention_until FROM alunos
    WHERE diagnostico IS NOT NULL OR observacoes IS NOT NULL
    ON CONFLICT (student_id) DO NOTHING;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS textos (
  id TEXT PRIMARY KEY,
  titulo TEXT NOT NULL,
  conteudo TEXT NOT NULL,
  serie TEXT NOT NULL,
  numero_palavras INTEGER NOT NULL,
  com_diagnostico BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE textos ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS avaliacoes (
  id TEXT PRIMARY KEY,
  aluno_id TEXT NOT NULL REFERENCES alunos(id) ON DELETE RESTRICT,
  professor_id TEXT NOT NULL,
  texto_id TEXT,
  precisao DOUBLE PRECISION,
  transcricao TEXT,
  transcricao_marcada TEXT,
  erros INTEGER,
  pcm DOUBLE PRECISION,
  intervencao_ia TEXT,
  diagnostico_ia TEXT,
  metricas_qualitativas JSONB NOT NULL DEFAULT '{}'::jsonb,
  perguntas_compreensao JSONB NOT NULL DEFAULT '[]'::jsonb,
  words JSONB NOT NULL DEFAULT '[]'::jsonb,
  fluency_metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
  data TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  retention_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE avaliacoes ADD COLUMN IF NOT EXISTS words JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE avaliacoes ADD COLUMN IF NOT EXISTS fluency_metrics JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE avaliacoes ADD COLUMN IF NOT EXISTS retention_until TIMESTAMPTZ;
ALTER TABLE avaliacoes ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE avaliacoes DROP CONSTRAINT IF EXISTS avaliacoes_texto_fk;

CREATE TABLE IF NOT EXISTS import_history (
  id TEXT PRIMARY KEY,
  file_name TEXT NOT NULL,
  success_count INTEGER NOT NULL DEFAULT 0,
  error_count INTEGER NOT NULL DEFAULT 0,
  professor_id TEXT NOT NULL,
  imported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  retention_until TIMESTAMPTZ
);
ALTER TABLE import_history ADD COLUMN IF NOT EXISTS retention_until TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS data_subject_requests (
  id TEXT PRIMARY KEY,
  professor_id TEXT NOT NULL,
  aluno_id TEXT NOT NULL REFERENCES alunos(id) ON DELETE RESTRICT,
  type TEXT NOT NULL CHECK (type IN ('withdraw_consent','delete_identifiable_data','access_information')),
  note TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','completed')),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS alunos_professor_idx ON alunos(professor_id);
CREATE INDEX IF NOT EXISTS alunos_turma_serie_idx ON alunos(turma,serie);
CREATE INDEX IF NOT EXISTS student_private_professor_idx ON student_private(professor_id);
CREATE INDEX IF NOT EXISTS avaliacoes_professor_data_idx ON avaliacoes(professor_id,data DESC);
CREATE INDEX IF NOT EXISTS avaliacoes_aluno_data_idx ON avaliacoes(aluno_id,data DESC);
CREATE INDEX IF NOT EXISTS import_history_professor_idx ON import_history(professor_id,imported_at DESC);
CREATE INDEX IF NOT EXISTS privacy_requests_status_idx ON data_subject_requests(status,requested_at DESC);

COMMIT;
