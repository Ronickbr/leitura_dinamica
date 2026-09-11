"use client";
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <section role="alert"><h2>Não foi possível carregar esta página</h2>
    <p>Verifique sua conexão e tente novamente.</p><button className="btn-primary" onClick={reset}>Tentar novamente</button></section>;
}
