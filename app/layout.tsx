import type { Metadata, Viewport } from "next";
import "./globals.css";
import Layout from "./components/Layout";
import { FirebaseProvider } from "./components/FirebaseProvider";
import MobilePerformanceMonitor from "./components/MobilePerformanceMonitor";
import { MobileExperienceProvider } from "./components/MobileExperienceProvider";
import { SettingsProvider } from "./components/SettingsProvider";
import { PWAProvider } from "./components/PWAProvider";

export const metadata: Metadata = {
  title: "Fluência Leitora",
  description: "Plataforma de avaliação de fluência leitora",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Fluência Leitora",
  },
  icons: {
    apple: [
      { url: "/icon-192.png", sizes: "180x180", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  },
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
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="mobile-web-app-capable" content="yes" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
      </head>
      <body style={{ fontFamily: "'Outfit', sans-serif" }}>
        <PWAProvider>
          <MobileExperienceProvider>
            <MobilePerformanceMonitor />
            <FirebaseProvider>
              <SettingsProvider>
                <Layout>{children}</Layout>
              </SettingsProvider>
            </FirebaseProvider>
          </MobileExperienceProvider>
        </PWAProvider>
      </body>
    </html>
  );
}
