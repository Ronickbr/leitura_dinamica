import { useState, type FormEvent } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { useNavigate } from 'react-router-dom';

// Ícones simplificados
const LogInIcon = () => <span>🔑</span>;
const MailIcon = () => <span>✉️</span>;
const LockIcon = () => <span>🔒</span>;
const BookOpenIcon = () => <span>📖</span>;

const LoginPage = () => {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            await signInWithEmailAndPassword(auth, email, password);
            navigate('/');
        } catch (err: any) {
            console.error('Login error:', err);
            const errorMsg = err.code === 'auth/invalid-credential'
                ? 'E-mail ou senha incorretos.'
                : 'Erro ao acessar o portal. Tente novamente.';
            setError(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="animate-in" style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '80vh',
            padding: '1rem'
        }}>
            <div className="glass-card" style={{ maxWidth: '400px', width: '100%', textAlign: 'center' }}>
                <div style={{
                    background: 'var(--primary)',
                    width: '64px',
                    height: '64px',
                    borderRadius: '16px',
                    margin: '0 auto 1.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.5rem',
                    boxShadow: '0 0 20px rgba(99, 102, 241, 0.3)'
                }}>
                    <BookOpenIcon />
                </div>

                <h2 style={{ fontSize: '1.75rem', marginBottom: '0.5rem', fontWeight: 800, letterSpacing: '-0.5px' }}>
                    Portal do <span style={{ color: 'var(--primary)' }}>Professor</span>
                </h2>
                <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', fontSize: '0.95rem' }}>
                    Entre com suas credenciais para gerenciar turmas e avaliações.
                </p>

                {error && (
                    <div style={{
                        color: 'var(--accent)',
                        background: 'rgba(244, 63, 94, 0.1)',
                        padding: '0.75rem',
                        borderRadius: 'var(--radius-sm)',
                        marginBottom: '1.5rem',
                        fontSize: '0.85rem',
                        border: '1px solid rgba(244, 63, 94, 0.2)'
                    }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} style={{ textAlign: 'left' }}>
                    <div style={{ marginBottom: '1.25rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-main)', fontSize: '0.85rem', fontWeight: 600 }}>
                            E-mail Institucional
                        </label>
                        <div style={{ position: 'relative' }}>
                            <div style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                <MailIcon />
                            </div>
                            <input
                                type="email"
                                placeholder="nome@escola.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="glass-input"
                            />
                        </div>
                    </div>

                    <div style={{ marginBottom: '2rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-main)', fontSize: '0.85rem', fontWeight: 600 }}>
                            Senha de Acesso
                        </label>
                        <div style={{ position: 'relative' }}>
                            <div style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                <LockIcon />
                            </div>
                            <input
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="glass-input"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="btn-primary"
                        style={{ width: '100%', justifyContent: 'center', padding: '0.9rem' }}
                        disabled={loading}
                    >
                        {loading ? 'Validando...' : (
                            <>
                                <LogInIcon />
                                Entrar no Sistema
                            </>
                        )}
                    </button>
                </form>

                <p style={{ marginTop: '1.5rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                    Problemas com acesso? <a href="#" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 600 }}>Fale com o suporte</a>
                </p>
            </div>

            <style>{`
              .glass-input {
                width: 100%;
                background: rgba(15, 23, 42, 0.5);
                border: 1px solid var(--glass-border);
                padding: 0.85rem 1rem 0.85rem 3rem;
                border-radius: var(--radius-sm);
                color: white;
                outline: none;
                transition: all 0.2s ease;
                font-size: 0.95rem;
              }
              .glass-input:focus {
                border-color: var(--primary);
                background: rgba(15, 23, 42, 0.8);
                box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2);
              }
            `}</style>
        </div>
    );
};

export default LoginPage;
