import { useState, useEffect } from 'react';
import { getAlunos, addAluno, updateAluno, deleteAluno, type Aluno } from '../../services/studentsService';

// Ícones simplificados
const PlusIcon = () => <span>➕</span>;
const UploadIcon = () => <span>📤</span>;
const EditIcon = () => <span>✏️</span>;
const TrashIcon = () => <span>🗑️</span>;
const UserIcon = () => <span>👤</span>;
const XIcon = () => <span>✕</span>;

const StudentsManagementPage = () => {
    const [alunos, setAlunos] = useState<Aluno[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingAluno, setEditingAluno] = useState<Aluno | null>(null);

    const [nome, setNome] = useState('');
    const [turma, setTurma] = useState('');
    const [serie, setSerie] = useState('');
    const [diagnostico, setDiagnostico] = useState('Nenhum');
    const [observacoes, setObservacoes] = useState('');

    const fetchAlunos = async () => {
        setLoading(true);
        try {
            const data = await getAlunos();
            setAlunos(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchAlunos(); }, []);

    const resetForm = () => {
        setEditingAluno(null);
        setNome(''); setTurma(''); setSerie('');
        setDiagnostico('Nenhum'); setObservacoes('');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const data = { nome, turma, serie, diagnostico, observacoes };
        if (editingAluno) await updateAluno(editingAluno.id, data);
        else await addAluno(data);
        setIsModalOpen(false);
        resetForm();
        fetchAlunos();
    };

    const handleEdit = (aluno: Aluno) => {
        setEditingAluno(aluno);
        setNome(aluno.nome); setTurma(aluno.turma); setSerie(aluno.serie);
        setDiagnostico(aluno.diagnostico); setObservacoes(aluno.observacoes || '');
        setIsModalOpen(true);
    };

    return (
        <div className="animate-in" style={{ paddingBottom: '4rem' }}>
            <header style={{ marginBottom: '3rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                    <h2 style={{ fontSize: '2.5rem', fontWeight: 800 }}>Gestão de <span style={{ color: 'var(--primary)' }}>Estudantes</span></h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>Mantenha sua base de alunos sempre atualizada.</p>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button className="btn-outline" onClick={() => { resetForm(); setIsModalOpen(true); }}><PlusIcon /> Novo Aluno</button>
                    <button className="btn-primary" onClick={() => document.getElementById('txt-upload')?.click()}><UploadIcon /> Importar Lista</button>
                    <input type="file" id="txt-upload" accept=".txt" style={{ display: 'none' }} onChange={() => { }} />
                </div>
            </header>

            <div className="glass-card" style={{ padding: 0 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--glass-border)' }}>
                            <th style={{ padding: '1.5rem', textAlign: 'left', fontSize: '0.85rem', color: 'var(--text-muted)' }}>ESTUDANTE</th>
                            <th style={{ padding: '1.5rem', textAlign: 'left', fontSize: '0.85rem', color: 'var(--text-muted)' }}>TURMA / SÉRIE</th>
                            <th style={{ padding: '1.5rem', textAlign: 'left', fontSize: '0.85rem', color: 'var(--text-muted)' }}>DIAGNÓSTICO</th>
                            <th style={{ padding: '1.5rem', textAlign: 'right', fontSize: '0.85rem', color: 'var(--text-muted)' }}>AÇÕES</th>
                        </tr>
                    </thead>
                    <tbody>
                        {alunos.map(aluno => (
                            <tr key={aluno.id} style={{ borderBottom: '1px solid var(--glass-border)' }} className="hover-row">
                                <td style={{ padding: '1.25rem 1.5rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                        <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(99, 102, 241, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}><UserIcon /></div>
                                        <div>
                                            <div style={{ fontWeight: 700 }}>{aluno.nome}</div>
                                            {aluno.observacoes && <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{aluno.observacoes}</div>}
                                        </div>
                                    </div>
                                </td>
                                <td style={{ padding: '1.5rem' }}>
                                    <span style={{ color: 'var(--text-main)' }}>{aluno.turma}</span>
                                    <span style={{ margin: '0 0.5rem', color: 'var(--glass-border)' }}>|</span>
                                    <span style={{ color: 'var(--text-muted)' }}>{aluno.serie}</span>
                                </td>
                                <td style={{ padding: '1.5rem' }}>
                                    <span style={{
                                        padding: '0.35rem 0.75rem',
                                        borderRadius: '12px',
                                        fontSize: '0.75rem',
                                        fontWeight: 600,
                                        background: aluno.diagnostico !== 'Nenhum' ? 'rgba(236, 72, 153, 0.1)' : 'rgba(255,255,255,0.05)',
                                        color: aluno.diagnostico !== 'Nenhum' ? 'var(--accent)' : 'var(--text-muted)',
                                        border: `1px solid ${aluno.diagnostico !== 'Nenhum' ? 'rgba(236, 72, 153, 0.2)' : 'transparent'}`
                                    }}>
                                        {aluno.diagnostico}
                                    </span>
                                </td>
                                <td style={{ padding: '1.5rem', textAlign: 'right' }}>
                                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                        <button onClick={() => handleEdit(aluno)} className="btn-icon" title="Editar"><EditIcon /></button>
                                        <button onClick={async () => { if (confirm('Excluir?')) { await deleteAluno(aluno.id); fetchAlunos(); } }} className="btn-icon" style={{ color: '#ef4444' }} title="Excluir"><TrashIcon /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {!loading && alunos.length === 0 && <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>Nenhum estudante encontrado.</div>}
            </div>

            {isModalOpen && (
                <div className="glass-modal animate-in" style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
                    <div className="glass-card" style={{ maxWidth: '520px', width: '100%', padding: '2.5rem', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                            <h3 style={{ fontSize: '1.5rem', fontWeight: 800 }}>{editingAluno ? 'Editar Dados' : 'Novo Estudante'}</h3>
                            <button onClick={() => setIsModalOpen(false)} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}><XIcon /></button>
                        </div>
                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>NOME COMPLETO</label>
                                <input type="text" value={nome} onChange={e => setNome(e.target.value)} required className="glass-panel" style={{ width: '100%', padding: '0.85rem', color: 'white' }} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>TURMA</label>
                                    <input type="text" value={turma} onChange={e => setTurma(e.target.value)} required placeholder="3º A" className="glass-panel" style={{ width: '100%', padding: '0.85rem', color: 'white' }} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>SÉRIE</label>
                                    <input type="text" value={serie} onChange={e => setSerie(e.target.value)} required placeholder="3º Ano" className="glass-panel" style={{ width: '100%', padding: '0.85rem', color: 'white' }} />
                                </div>
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>DIAGNÓSTICO</label>
                                <select value={diagnostico} onChange={e => setDiagnostico(e.target.value)} className="glass-panel" style={{ width: '100%', padding: '0.85rem', color: 'white' }}>
                                    <option value="Nenhum">Nenhum</option>
                                    <option value="TEA">TEA (Autismo)</option>
                                    <option value="TDAH">TDAH</option>
                                    <option value="Dislexia">Dislexia</option>
                                    <option value="Outros">Outros</option>
                                </select>
                            </div>
                            <button type="submit" className="btn-primary" style={{ marginTop: '1rem', padding: '1rem' }}>Salvar Alterações</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StudentsManagementPage;
