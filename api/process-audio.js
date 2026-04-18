const fs = require("fs");
const os = require("os");
const path = require("path");
const formidable = require("formidable");

const { processReadingAudio } = require("./lib/analysisService");

const maxFileSizeInBytes = 25 * 1024 * 1024;
const allowedAudioMimeTypes = [
  "audio/mpeg",
  "audio/mp3",
  "audio/mp4",
  "audio/ogg",
  "audio/wav",
  "audio/webm",
  "video/webm",
];


function parseMultipartForm(req) {
  const uploadDir = path.join(os.tmpdir(), "leitura-uploads");
  fs.mkdirSync(uploadDir, { recursive: true });

  const form = formidable({
    multiples: false,
    maxFiles: 1,
    maxFileSize: maxFileSizeInBytes,
    uploadDir,
    keepExtensions: true,
    filter: ({ mimetype }) => {
      // Bloqueia uploads inesperados antes do arquivo chegar ao pipeline de IA.
      return Boolean(mimetype && allowedAudioMimeTypes.some(type => mimetype.startsWith(type)));
    },

  });

  return new Promise((resolve, reject) => {
    form.parse(req, (error, fields, files) => {
      if (error) {
        return reject(error);
      }

      return resolve({ fields, files });
    });
  });
}

function getFieldValue(value) {
  return Array.isArray(value) ? value[0] : value;
}

function getUploadedFile(files) {
  const file = files.file;
  return Array.isArray(file) ? file[0] : file;
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ detail: "Metodo nao permitido." });
  }

  const contentType = req.headers["content-type"] || "";

  if (!contentType.includes("multipart/form-data")) {
    return res
      .status(400)
      .json({ detail: "Envie os dados como multipart/form-data." });
  }

  let uploadedFile;

  try {
    const { fields, files } = await parseMultipartForm(req);
    uploadedFile = getUploadedFile(files);

    if (!uploadedFile?.filepath) {
      return res
        .status(400)
        .json({ detail: "Envie um arquivo de audio no campo 'file'." });
    }

    const result = await processReadingAudio({
      filePath: uploadedFile.filepath,
      originalText: getFieldValue(fields.original_text),
      filename: uploadedFile.originalFilename || "audio.webm",
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error("Erro no processamento da funcao serverless:", error);

    const message =
      error instanceof Error && error.message
        ? error.message
        : "Erro interno no processamento do audio.";

    const statusCode = message.includes("obrigatorio") || message.includes("invalido")
      ? 400
      : 500;

    return res.status(statusCode).json({ detail: message });
  } finally {
    // Remove o temporario para evitar crescimento do armazenamento efemero da funcao.
    if (uploadedFile?.filepath && fs.existsSync(uploadedFile.filepath)) {
      fs.unlinkSync(uploadedFile.filepath);
    }
  }
};
