import { useNavigate, Link, useLocation } from 'react-router-dom';
import { auth } from '../../lib/firebase';

interface HeaderProps {
    user: any;
}

const Header = ({ user }: HeaderProps) => {
    const navigate = useNavigate();
    const location = useLocation();

    const isActive = (path: string) => location.pathname === path;

    return (
        <nav className="glass-panel" style={{
            width: '100%',
            height: '80px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            borderRadius: '0',
            border: 'none',
            borderBottom: '1px solid var(--glass-border)',
            boxShadow: '0 4px 20px -5px rgba(0,0,0,0.3)',
            position: 'sticky',
            top: '0',
            zIndex: 1000,
            background: 'rgba(15, 23, 42, 0.8)',
            backdropFilter: 'blur(12px)'
        }}>
            <div className="container" style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                height: '100%',
                padding: '0 2rem'
            }}>
                <div style={{ display: 'flex', gap: '2.5rem', alignItems: 'center' }}>
                    <Link to="/" style={{
                        textDecoration: 'none',
                        color: 'white',
                        fontWeight: 900,
                        fontSize: '1.4rem',
                        letterSpacing: '-1px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                    }}>
                        <span style={{ background: 'var(--primary)', color: 'white', padding: '0.2rem 0.6rem', borderRadius: '8px', fontSize: '1rem' }}>PCM</span>
                        Reader
                    </Link>
                    {user && (
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            {[
                                { path: '/', label: 'Dashboard' },
                                { path: '/selecao', label: 'Avaliar' },
                                { path: '/alunos/gerenciar', label: 'Alunos' },
                                { path: '/textos/gerenciar', label: 'Textos' },
                                { path: '/historico', label: 'Relatórios' }
                            ].map(link => (
                                <Link
                                    key={link.path}
                                    to={link.path}
                                    className={`nav-item ${isActive(link.path) ? 'active' : ''}`}
                                    style={{
                                        textDecoration: 'none',
                                        padding: '0.6rem 1rem',
                                        borderRadius: '12px',
                                        fontSize: '0.9rem',
                                        fontWeight: 600,
                                        transition: 'all 0.3s ease',
                                        color: isActive(link.path) ? 'white' : 'var(--text-muted)',
                                        background: isActive(link.path) ? 'rgba(99, 102, 241, 0.15)' : 'transparent'
                                    }}
                                >
                                    {link.label}
                                </Link>
                            ))}
                        </div>
                    )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                    {user && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <div className="user-badge" style={{ textAlign: 'right' }}>
                                <p style={{ fontSize: '0.7rem', color: 'var(--primary)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '2px' }}>Acesso Professor</p>
                                <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'white' }}>{user.email?.split('@')[0]}</p>
                            </div>
                            <button
                                onClick={() => auth.signOut().then(() => navigate('/login'))}
                                className="btn-outline"
                                style={{ padding: '0.6rem 1.25rem', borderRadius: '12px', border: '1px solid var(--glass-border)', fontSize: '0.85rem' }}
                            >
                                Sair
                            </button>
                        </div>
                    )}
                    {!user && (
                        <button onClick={() => navigate('/login')} className="btn-primary" style={{ padding: '0.6rem 1.5rem', borderRadius: '12px' }}>Entrar no Sistema</button>
                    )}
                </div>

                <style>{`
                .nav-item:hover {
                    color: white !important;
                    background: rgba(255,255,255,0.05) !important;
                }
                .nav-item.active {
                    box-shadow: inset 0 0 10px rgba(99, 102, 241, 0.2);
                    border: 1px solid rgba(99, 102, 241, 0.2);
                }
                .user-badge {
                    display: none;
                }
                @media (min-width: 768px) {
                    .user-badge {
                        display: block;
                    }
                }
            `}</style>
            </div>
        </nav>
    );
};

export default Header;
