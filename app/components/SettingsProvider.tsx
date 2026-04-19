"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface SettingsContextType {
    isAnonymized: boolean;
    setAnonymized: (val: boolean) => void;
    anonymizeName: (id: string, realName: string) => string;
    anonymizeText: (realText?: string) => string;
}

const SettingsContext = createContext<SettingsContextType>({
    isAnonymized: false,
    setAnonymized: () => { },
    anonymizeName: (id, name) => name,
    anonymizeText: (text) => text || "",
});

export const useSettings = () => useContext(SettingsContext);

export function SettingsProvider({ children }: { children: ReactNode }) {
    const [isAnonymized, setIsAnonymized] = useState(false);

    useEffect(() => {
        const saved = localStorage.getItem("leitura_anonymized");
        if (saved === "true") {
            setIsAnonymized(true);
        }
    }, []);

    const setAnonymized = (val: boolean) => {
        setIsAnonymized(val);
        localStorage.setItem("leitura_anonymized", String(val));
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
        <SettingsContext.Provider value={{ isAnonymized, setAnonymized, anonymizeName, anonymizeText }}>
            {children}
        </SettingsContext.Provider>
    );
}
