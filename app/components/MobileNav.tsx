"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
    { href: "/", label: "Home", icon: "🏠" },
    { href: "/evaluations/new", label: "Avaliar", icon: "🎤" },
    { href: "/history", label: "Histórico", icon: "📊" },
    { href: "/students", label: "Alunos", icon: "👥" },
];

export default function MobileNav() {
    const pathname = usePathname();

    return (
        <nav
            className="glass-panel mobile-nav"
            aria-label="Navegação principal mobile"
            style={{
            position: "fixed",
            bottom: "1rem",
            left: "1rem",
            right: "1rem",
            height: "64px",
            display: "grid",
            gridTemplateColumns: `repeat(${navItems.length}, 1fr)`,
            alignItems: "center",
            zIndex: 1000,
            borderRadius: "20px",
            border: "1px solid var(--glass-border)",
            boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
            padding: "0 0.5rem",
        }}>
            {navItems.map((item) => (
                <Link
                    key={item.href}
                    href={item.href}
                    aria-current={pathname === item.href ? "page" : undefined}
                    className="mobile-nav-link"
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: "4px",
                        textDecoration: "none",
                        color: pathname === item.href ? "var(--primary)" : "var(--text-muted)",
                        transition: "all 0.2s ease",
                        minHeight: "48px",
                        justifyContent: "center",
                        borderRadius: "14px",
                    }}
                >
                    <span style={{
                        fontSize: "1.25rem",
                        transform: pathname === item.href ? "scale(1.1)" : "scale(1)",
                    }}>
                        {item.icon}
                    </span>
                    <span style={{
                        fontSize: "0.65rem",
                        fontWeight: 700,
                        opacity: pathname === item.href ? 1 : 0.7,
                        textTransform: "uppercase",
                        letterSpacing: "0.5px"
                    }}>
                        {item.label}
                    </span>
                </Link>
            ))}
        </nav>
    );
}
