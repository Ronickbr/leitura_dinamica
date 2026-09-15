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
        <nav className="mobile-nav no-print" aria-label="Navegação principal mobile">
            {navItems.map((item) => (
                <Link
                    key={item.href}
                    href={item.href}
                    aria-current={pathname === item.href ? "page" : undefined}
                    onClick={(event) => {
                        if (pathname === item.href) event.preventDefault();
                    }}
                    className={`mobile-nav-link ${pathname === item.href ? 'active' : ''}`}
                >
                    <span className="mobile-nav-icon">
                        {item.icon}
                    </span>
                    <span className="mobile-nav-label">
                        {item.label}
                    </span>
                </Link>
            ))}
        </nav>
    );
}
