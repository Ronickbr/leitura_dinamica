"use client";

import {
  MobileCard,
  MobileCardList,
  MobileDataGrid,
  MobileDataPoint,
} from "../components/MobileCards";

const sampleStudents = [
  {
    id: "1",
    nome: "Ana Clara",
    serie: "3º Ano",
    turma: "A",
    turno: "Manhã",
    diagnostico: "Nenhum",
  },
  {
    id: "2",
    nome: "Pedro Henrique",
    serie: "4º Ano",
    turma: "B",
    turno: "Tarde",
    diagnostico: "TDAH",
  },
];

export default function MobilePreviewPage() {
  return (
    <div className="animate-in" style={{ paddingBottom: "4rem" }}>
      <header className="page-header">
        <div className="page-header-content">
          <h1 className="page-title">Preview <span style={{ color: "var(--primary)" }}>Mobile</span></h1>
          <p className="page-subtitle">
            Ambiente de QA para validar cards mobile, visibilidade responsiva e alvos de toque.
          </p>
        </div>
      </header>

      <section style={{ display: "grid", gap: "1rem" }}>
        <div className="glass-card desktop-only-view" data-testid="preview-desktop-table">
          <h2 style={{ marginBottom: "1rem", fontSize: "1.1rem" }}>Tabela Desktop</h2>
          <div className="table-scroll">
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--glass-border)" }}>
                  <th style={{ textAlign: "left", padding: "1rem" }}>Nome</th>
                  <th style={{ textAlign: "left", padding: "1rem" }}>Série</th>
                  <th style={{ textAlign: "left", padding: "1rem" }}>Turma</th>
                  <th style={{ textAlign: "left", padding: "1rem" }}>Turno</th>
                </tr>
              </thead>
              <tbody>
                {sampleStudents.map((student) => (
                  <tr key={student.id} style={{ borderBottom: "1px solid var(--glass-border)" }}>
                    <td style={{ padding: "1rem" }}>{student.nome}</td>
                    <td style={{ padding: "1rem" }}>{student.serie}</td>
                    <td style={{ padding: "1rem" }}>{student.turma}</td>
                    <td style={{ padding: "1rem" }}>{student.turno}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mobile-only-view" data-testid="preview-mobile-cards">
          <MobileCardList testId="preview-mobile-card-list">
            {sampleStudents.map((student) => (
              <MobileCard
                key={student.id}
                testId="preview-mobile-card"
                title={student.nome}
                subtitle={`${student.serie} • Turma ${student.turma}`}
                badge={
                  <span
                    style={{
                      padding: "0.35rem 0.7rem",
                      borderRadius: "999px",
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      background: "rgba(99, 102, 241, 0.1)",
                      color: "var(--primary)",
                    }}
                  >
                    {student.turno}
                  </span>
                }
                footer={<button className="btn-primary">Ação principal</button>}
              >
                <MobileDataGrid>
                  <MobileDataPoint label="Série" value={student.serie} />
                  <MobileDataPoint label="Turma" value={student.turma} accent />
                  <MobileDataPoint label="Turno" value={student.turno} />
                  <MobileDataPoint label="Diagnóstico" value={student.diagnostico} />
                </MobileDataGrid>
              </MobileCard>
            ))}
          </MobileCardList>
        </div>
      </section>
    </div>
  );
}
