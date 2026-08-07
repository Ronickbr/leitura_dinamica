"use client";

import { useEffect } from "react";
import { logDetailed } from "@/lib/errorUtils";

const FILE_NAME = "app/components/PWAProvider.tsx";

export function PWAProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {

        })
        .catch((error) => {
          logDetailed({
            level: "warn",
            message: "Falha ao registrar Service Worker",
            fileName: FILE_NAME,
            methodName: "PWAProvider/useEffect",
            lineNumber: 13,
            errorName: error instanceof Error ? error.name : String(error),
            errorMessage: error instanceof Error ? error.message : String(error),
            stackTrace: error instanceof Error ? error.stack : undefined
          });
        });
    }
  }, []);

  return <>{children}</>;
}