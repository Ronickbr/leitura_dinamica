import type { Metadata } from "next";
import "./globals.css";
import Layout from "./components/Layout";

export const metadata: Metadata = {
  title: "Fluência Leitora",
  description: "Plataforma de avaliação de fluência leitora",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>
        <Layout>{children}</Layout>
      </body>
    </html>
  );
}