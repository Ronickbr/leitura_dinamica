require("dotenv").config();

const compression = require("compression");
const cors = require("cors");
const express = require("express");
const fs = require("fs");
const helmet = require("helmet");
const multer = require("multer");
const os = require("os");
const path = require("path");

const { processReadingAudio } = require("./analysisService");

const app = express();
const port = Number(process.env.PORT || 8000);
const maxFileSizeInBytes = 25 * 1024 * 1024;
const uploadDir = path.join(os.tmpdir(), "leitura-uploads");
const allowedAudioMimeTypes = [
  "audio/mpeg",
  "audio/mp3",
  "audio/mp4",
  "audio/ogg",
  "audio/wav",
  "audio/webm",
  "video/webm",
];

const configuredOrigins = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const localDevOriginPattern = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i;

fs.mkdirSync(uploadDir, { recursive: true });

function isAllowedOrigin(origin) {
  if (!origin) {
    return true;
  }

  if (configuredOrigins.length > 0) {
    return configuredOrigins.includes(origin);
  }

  // Permite dev e preview locais sem precisar alinhar manualmente a porta do frontend.
  return localDevOriginPattern.test(origin);
}

function sendError(res, statusCode, message) {
  return res.status(statusCode).json({ detail: message });
}

const upload = multer({
  dest: uploadDir,
  limits: {
    fileSize: maxFileSizeInBytes,
    files: 1,
  },
  fileFilter: (req, file, callback) => {
    console.log(`Recebendo arquivo: ${file.originalname} (${file.mimetype})`);

    // Aceita se o tipo MIME começar com algum dos permitidos (ignora parâmetros como codecs)
    const isAllowed = allowedAudioMimeTypes.some(type => file.mimetype.startsWith(type));

    if (!isAllowed) {
      console.error(`MimeType rejeitado: ${file.mimetype}`);
      return callback(new Error(`Formato de audio "${file.mimetype}" nao suportado.`));
    }

    return callback(null, true);
  },
});


app.use(helmet());
app.use(compression());
app.use(
  cors({
    origin(origin, callback) {
      if (isAllowedOrigin(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Origem nao permitida pelo CORS."));
    },
  }),
);
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    runtime: "express-dev-server",
    message: "API de leitura ativa",
    env: {
      groqConfigured: Boolean(process.env.GROQ_API_KEY),
      openRouterConfigured: Boolean(process.env.OPENROUTER_API_KEY),
    },
  });
});

app.post("/api/process-audio", upload.single("file"), async (req, res) => {
  const uploadedFile = req.file;

  if (!uploadedFile) {
    return sendError(res, 400, "Envie um arquivo de audio no campo 'file'.");
  }

  try {
    console.log(`Processando audio para texto: "${req.body.original_text?.substring(0, 30)}..."`);
    const result = await processReadingAudio({
      filePath: uploadedFile.path,
      originalText: req.body.original_text,
      filename: uploadedFile.originalname,
    });

    console.log("Processamento concluido com sucesso");
    return res.json(result);

  } catch (error) {
    console.error("Erro no processamento:", error);
    fs.appendFileSync("api-errors.log", `${new Date().toISOString()} - Erro no processamento: ${error.stack}\n`);

    const message =
      error instanceof Error && error.message
        ? error.message
        : "Erro interno no processamento do audio.";

    const statusCode = error.status || (
      message.includes("obrigatorio") ||
        message.includes("invalido") ||
        message.includes("file must be one of")
        ? 400
        : 500
    );

    return sendError(res, statusCode, message);
  } finally {
    // Remove o arquivo temporario para manter o servidor local limpo entre as execucoes.
    if (uploadedFile?.path && fs.existsSync(uploadedFile.path)) {
      fs.unlinkSync(uploadedFile.path);
    }
  }
});

app.use((error, req, res, next) => {
  console.error("Erro global:", error);
  fs.appendFileSync("api-errors.log", `${new Date().toISOString()} - Erro global: ${error.stack || error}\n`);
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return sendError(res, 413, "O arquivo excede o limite de 25 MB.");
    }

    return sendError(res, 400, error.message);
  }

  if (error instanceof Error) {
    return sendError(res, 400, error.message);
  }

  return sendError(res, 500, "Erro inesperado na API.");
});

app.listen(port, () => {
  console.log(`Servidor Leitura rodando em http://localhost:${port}`);
  console.log(`Modo atual: ${process.env.NODE_ENV || "development"}`);
});
