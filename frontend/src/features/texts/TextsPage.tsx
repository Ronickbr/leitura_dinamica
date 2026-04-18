import { useState, useEffect } from 'react';
import { getTextos, addTexto, updateTexto, deleteTexto, type Texto } from '../../services/textsService';

// Ícones simplificados
const PlusIcon = () => <span>➕</span>;
const EditIcon = () => <span>✏️</span>;
const TrashIcon = () => <span>🗑️</span>;
const BookIcon = () => <span>📖</span>;
const XIcon = () => <span>✕</span>;

const TextsManagementPage = () => {
    const [textos, setTextos] = useState<Texto[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTexto, setEditingTexto] = useState<Texto | null>(null);

    const [titulo, setTitulo] = useState('');
    const [conteudo, setConteudo] = useState('');
    const [serie, setSerie] = useState('');
    const [numeroPalavras, setNumeroPalavras] = useState(0);

    const fetchTextos = async () => {
        try {
            const data = await getTextos();
            setTextos(data);
        } catch (err) { }
    };

    useEffect(() => { fetchTextos(); }, []);

    useEffect(() => {
        const count = conteudo.trim() === '' ? 0 : conteudo.trim().split(/\s+/).length;
        setNumeroPalavras(count);
    }, [conteudo]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const data = { titulo, conteudo, serie, numeroPalavras };
        if (editingTexto) await updateTexto(editingTexto.id, data);
        else await addTexto(data);
        setIsModalOpen(false);
        resetForm();
        fetchTextos();
    };

    const handleEdit = (texto: Texto) => {
        setEditingTexto(texto);
        setTitulo(texto.titulo); setConteudo(texto.conteudo); setSerie(texto.serie);
        setIsModalOpen(true);
    };

    const resetForm = () => {
        setEditingTexto(null); setTitulo(''); setConteudo(''); setSerie('');
    };

    return (
        <div className="animate-in" style={{ paddingBottom: '4rem' }}>
            <header style={{ marginBottom: '3.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h2 style={{ fontSize: '2.5rem', fontWeight: 900, letterSpacing: '-1.5px' }}>Biblioteca de <span style={{ color: 'var(--primary)' }}>Textos</span></h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>Gerencie o material pedagógico para as avaliações.</p>
                </div>
                <button className="btn-primary" onClick={() => { resetForm(); setIsModalOpen(true); }} style={{ height: 'fit-content' }}><PlusIcon /> Novo Texto</button>
            </header>

            <div className="grid-cards">
                {textos.map(texto => (
                    <div key={texto.id} className="glass-card card-equal-height" style={{ gap: '1.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--success)' }}><BookIcon /></div>
                                <div>
                                    <h4 style={{ fontWeight: 700, fontSize: '1.1rem' }}>{texto.titulo}</h4>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{texto.serie}</span>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '0.25rem' }}>
                                <button onClick={() => handleEdit(texto)} className="btn-icon" style={{ padding: '0.4rem' }}><EditIcon /></button>
                                <button onClick={async () => { if (confirm('Excluir?')) { await deleteTexto(texto.id); fetchTextos(); } }} className="btn-icon" style={{ padding: '0.4rem', color: '#ef4444' }} disabled={texto.id === 'texto_padrao'}><TrashIcon /></button>
                            </div>
                        </div>

                        <p style={{
                            fontSize: '0.85rem',
                            color: 'var(--text-muted)',
                            lineHeight: '1.5',
                            display: '-webkit-box',
                            WebkitLineClamp: 3,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                            flex: 1
                        }}>
                            {texto.conteudo}
                        </p>

                        <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--primary)' }}>{texto.numeroPalavras} PALAVRAS</span>
                        </div>
                    </div>
                ))}
            </div>

            {isModalOpen && (
                <div className="glass-modal animate-in" style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
                    <div className="glass-card" style={{ maxWidth: '700px', width: '100%', padding: '2.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                            <h3 style={{ fontSize: '1.5rem', fontWeight: 800 }}>{editingTexto ? 'Editar Texto' : 'Novo Material'}</h3>
                            <button onClick={() => setIsModalOpen(false)} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}><XIcon /></button>
                        </div>
                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>TÍTULO</label>
                                    <input type="text" value={titulo} onChange={e => setTitulo(e.target.value)} required className="glass-panel" style={{ width: '100%', padding: '0.85rem', color: 'white' }} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>SÉRIE ALVO</label>
                                    <input type="text" value={serie} onChange={e => setSerie(e.target.value)} required placeholder="3º Ano" className="glass-panel" style={{ width: '100%', padding: '0.85rem', color: 'white' }} />
                                </div>
                            </div>
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                    <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>CONTEÚDO</label>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 700 }}>{numeroPalavras} PALAVRAS</span>
                                </div>
                                <textarea value={conteudo} onChange={e => setConteudo(e.target.value)} required rows={10} className="glass-panel" style={{ width: '100%', padding: '1rem', color: 'white', lineHeight: '1.6', resize: 'vertical' }} />
                            </div>
                            <button type="submit" className="btn-primary" style={{ padding: '1rem' }}>Salvar Conteúdo</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TextsManagementPage;
