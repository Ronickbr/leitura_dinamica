"use client";
import type { PlanoPedagogico } from '@/lib/evaluationsService';
export function PedagogicalPlan({ value, onChange }: { value: PlanoPedagogico; onChange: (value: PlanoPedagogico) => void }) {
  return <fieldset style={{ padding: '1rem', margin: '1rem 0', border: '1px solid var(--text-secondary)', borderRadius: 8 }}>
    <legend>Acompanhamento pedagógico</legend>
    <div style={{ display: 'grid', gap: '1rem' }}>
      <label>Atividade proposta<textarea className="form-input" maxLength={2000} rows={3} value={value.atividade}
        onChange={e => onChange({ ...value, atividade: e.target.value })} /></label>
      <label>Meta de aprendizagem<input className="form-input" maxLength={500} value={value.meta}
        onChange={e => onChange({ ...value, meta: e.target.value })} /></label>
      <label>Data de reavaliação<input className="form-input" type="date" value={value.reavaliacao}
        onChange={e => onChange({ ...value, reavaliacao: e.target.value })} /></label>
      <label>Situação<select className="form-input" value={value.status}
        onChange={e => onChange({ ...value, status: e.target.value as PlanoPedagogico['status'] })}>
        <option value="planejada">Planejada</option><option value="em_andamento">Em andamento</option>
        <option value="concluida">Concluída</option></select></label>
    </div>
  </fieldset>;
}
