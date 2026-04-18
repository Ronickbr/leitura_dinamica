import React from 'react';
import Header from './Header';

interface LayoutProps {
    children: React.ReactNode;
    user: any;
}

const Layout: React.FC<LayoutProps> = ({ children, user }) => {
    return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', width: '100%' }}>
            <Header user={user} />
            <div className="container" style={{ flex: 1, width: '100%' }}>
                <main style={{ marginTop: '2rem', width: '100%' }}>
                    {children}
                </main>
            </div>
            <footer style={{
                padding: '2rem 0',
                textAlign: 'center',
                color: 'var(--text-muted)',
                fontSize: '0.8rem',
                borderTop: '1px solid var(--glass-border)',
                marginTop: '4rem'
            }}>
                © {new Date().getFullYear()} PCM Reader • Sistema de Avaliação de Fluência Leitora • Versão Profissional
            </footer>
        </div>
    );
};

export default Layout;
