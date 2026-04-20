"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface SettingsContextType {
    isAnonymized: boolean;
    setAnonymized: (val: boolean) => void;
    anonymizeName: (id: string, realName: string) => string;
    anonymizeText: (realText?: string) => string;
    theme: "light" | "dark";
    toggleTheme: () => void;
}

const SettingsContext = createContext<SettingsContextType>({
    isAnonymized: false,
    setAnonymized: () => { },
    anonymizeName: (id, name) => name,
    anonymizeText: (text) => text || "",
    theme: "light",
    toggleTheme: () => { },
});

export const useSettings = () => useContext(SettingsContext);

export function SettingsProvider({ children }: { children: ReactNode }) {
    const [isAnonymized, setIsAnonymized] = useState(false);
    const [theme, setTheme] = useState<"light" | "dark">("light");

    useEffect(() => {
        const savedAnonymized = localStorage.getItem("leitura_anonymized");
        if (savedAnonymized === "true") {
            setIsAnonymized(true);
        }

        const savedTheme = localStorage.getItem("leitura_theme") as "light" | "dark";
        if (savedTheme) {
            setTheme(savedTheme);
        } else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
            setTheme("dark");
        }
    }, []);

    useEffect(() => {
        document.documentElement.classList.remove("light", "dark");
        document.documentElement.classList.add(theme);
        localStorage.setItem("leitura_theme", theme);
    }, [theme]);

    const setAnonymized = (val: boolean) => {
        setIsAnonymized(val);
        localStorage.setItem("leitura_anonymized", String(val));
    };

    const toggleTheme = () => {
        setTheme(prev => prev === "light" ? "dark" : "light");
    };

    const anonymizeName = (id: string, realName: string) => {
        if (!isAnonymized) return realName;
        return `Estudante ${id.substring(0, 4).toUpperCase()}`;
    };

    const anonymizeText = (realText?: string) => {
        if (!isAnonymized) return realText || "";
        return realText ? "********************" : "";
    };

    return (
        <SettingsContext.Provider value={{
            isAnonymized,
            setAnonymized,
            anonymizeName,
            anonymizeText,
            theme,
            toggleTheme
        }}>
            {children}
        </SettingsContext.Provider>
    );
}

