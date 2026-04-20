"use client";

import { useSettings } from "./SettingsProvider";

export default function ThemeToggle() {
    const { theme, toggleTheme } = useSettings();

    return (
        <button
            onClick={toggleTheme}
            className="btn-icon"
            title={theme === "light" ? "Mudar para modo escuro" : "Mudar para modo claro"}
            style={{
                fontSize: "1.25rem",
                width: "40px",
                height: "40px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "var(--glass-bg)",
                border: "1px solid var(--glass-border)",
                borderRadius: "12px",
                transition: "all 0.3s ease",
            }}
        >
            {theme === "light" ? "🌙" : "☀️"}
        </button>
    );
}
