"use client";

import { useEffect } from "react";

export function PWAProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          console.log("PWA Service Worker registrado:", registration.scope);
        })
        .catch((error) => {
          console.error("Falha ao registrar Service Worker:", error);
        });
    }
  }, []);

  return <>{children}</>;
}