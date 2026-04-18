module.exports = (req, res) => {
  if (req.method !== "GET") {
    return res.status(405).json({ detail: "Metodo nao permitido." });
  }

  return res.status(200).json({
    status: "ok",
    runtime: "vercel-function",
    message: "API de leitura ativa",
    env: {
      groqConfigured: Boolean(process.env.GROQ_API_KEY),
      openRouterConfigured: Boolean(process.env.OPENROUTER_API_KEY),
    },
  });
};
