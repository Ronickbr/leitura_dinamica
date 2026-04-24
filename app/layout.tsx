import type { Metadata, Viewport } from "next";
import "./globals.css";
import Layout from "./components/Layout";
import { FirebaseProvider } from "./components/FirebaseProvider";
import MobilePerformanceMonitor from "./components/MobilePerformanceMonitor";
import { MobileExperienceProvider } from "./components/MobileExperienceProvider";
import { SettingsProvider } from "./components/SettingsProvider";

export const metadata: Metadata = {
  title: "Fluência Leitora",
  description: "Plataforma de avaliação de fluência leitora",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#6366f1",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
      </head>
      <body style={{ fontFamily: "'Outfit', sans-serif" }}>
        <MobileExperienceProvider>
          <MobilePerformanceMonitor />
          <FirebaseProvider>
            <SettingsProvider>
              <Layout>{children}</Layout>
            </SettingsProvider>
          </FirebaseProvider>
        </MobileExperienceProvider>
      </body>
    </html>
  );
}
