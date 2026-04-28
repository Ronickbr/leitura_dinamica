"use client";

import type { AlunoFilterOptions } from "@/lib/services";

interface StudentFilterValues {
  turma: string;
  serie: string;
  turno: string;
  diagnostico: string;
}

interface StudentFilterSelectsProps {
  values: StudentFilterValues;
  options: AlunoFilterOptions;
  loading: boolean;
  error: string | null;
  onChange: (field: keyof StudentFilterValues, value: string) => void;
}

const UsersIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
    <path d="M15 19v-1a3 3 0 0 0-3-3H7a3 3 0 0 0-3 3v1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="9.5" cy="8" r="3" stroke="currentColor" strokeWidth="1.8" />
    <path d="M20 19v-1a3 3 0 0 0-2-2.82" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M15 5.2a3 3 0 0 1 0 5.6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const GridIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
    <rect x="4" y="4" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
    <rect x="13" y="4" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
    <rect x="4" y="13" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
    <rect x="13" y="13" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
  </svg>
);

const ClockIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
    <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.8" />
    <path d="M12 8v4l2.5 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const DiagnosisIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
    <path d="M9 3h6l1 2h3a1 1 0 0 1 1 1v3l-8 12L4 9V6a1 1 0 0 1 1-1h3l1-2Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    <path d="m9 10 2 2 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

function buildOptionLabel(
  loading: boolean,
  valuesLength: number,
  emptyLabel: string,
  defaultLabel: string
) {
  if (loading) return "Carregando opcoes...";
  if (valuesLength === 0) return emptyLabel;
  return defaultLabel;
}

function renderOptions(values: string[]) {
  return values.map((value) => (
    <option key={value} value={value} className="students-filter-option">
      {value}
    </option>
  ));
}

export function StudentFilterSelects({
  values,
  options,
  loading,
  error,
  onChange
}: StudentFilterSelectsProps) {
  const isTableEmpty = !loading && !error && options.totalRegistros === 0;
  const helperId = "students-filters-database-status";

  return (
    <>
      <div className="students-filters-grid" role="group" aria-describedby={helperId}>
        <label className="students-filter-field" htmlFor="students-filter-turma">
          <span className="students-filter-label">Turma</span>
          <span className="students-filter-control">
            <span className="students-filter-icon">
              <UsersIcon />
            </span>
            <select
              id="students-filter-turma"
              value={values.turma}
              onChange={(event) => onChange("turma", event.target.value)}
              className="students-filter-select"
              disabled={loading || options.turmas.length === 0}
            >
              <option value="" className="students-filter-option">
                {buildOptionLabel(loading, options.turmas.length, "Nenhuma turma encontrada", "Todas as turmas")}
              </option>
              {renderOptions(options.turmas)}
            </select>
          </span>
        </label>

        <label className="students-filter-field" htmlFor="students-filter-serie">
          <span className="students-filter-label">Serie</span>
          <span className="students-filter-control">
            <span className="students-filter-icon">
              <GridIcon />
            </span>
            <select
              id="students-filter-serie"
              value={values.serie}
              onChange={(event) => onChange("serie", event.target.value)}
              className="students-filter-select"
              disabled={loading || options.series.length === 0}
            >
              <option value="" className="students-filter-option">
                {buildOptionLabel(loading, options.series.length, "Nenhuma serie encontrada", "Todas as series")}
              </option>
              {renderOptions(options.series)}
            </select>
          </span>
        </label>

        <label className="students-filter-field" htmlFor="students-filter-turno">
          <span className="students-filter-label">Turno</span>
          <span className="students-filter-control">
            <span className="students-filter-icon">
              <ClockIcon />
            </span>
            <select
              id="students-filter-turno"
              value={values.turno}
              onChange={(event) => onChange("turno", event.target.value)}
              className="students-filter-select"
              disabled={loading || options.turnos.length === 0}
            >
              <option value="" className="students-filter-option">
                {buildOptionLabel(loading, options.turnos.length, "Nenhum turno encontrado", "Todos os turnos")}
              </option>
              {renderOptions(options.turnos)}
            </select>
          </span>
        </label>

        <label className="students-filter-field" htmlFor="students-filter-diagnostico">
          <span className="students-filter-label">Diagnostico</span>
          <span className="students-filter-control">
            <span className="students-filter-icon">
              <DiagnosisIcon />
            </span>
            <select
              id="students-filter-diagnostico"
              value={values.diagnostico}
              onChange={(event) => onChange("diagnostico", event.target.value)}
              className="students-filter-select"
              disabled={loading || options.diagnosticos.length === 0}
            >
              <option value="" className="students-filter-option">
                {buildOptionLabel(loading, options.diagnosticos.length, "Nenhum diagnostico encontrado", "Todos os diagnosticos")}
              </option>
              {renderOptions(options.diagnosticos)}
            </select>
          </span>
        </label>
      </div>

      <div id={helperId} className={`students-filter-status${error ? " students-filter-status-error" : ""}`} aria-live="polite">
        {error
          ? error
          : isTableEmpty
            ? "Nenhum registro encontrado na colecao de alunos para preencher os filtros."
            : `${options.totalRegistros} registro(s) analisado(s) para montar as opcoes unicas dos filtros.`}
      </div>
    </>
  );
}
