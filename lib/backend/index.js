const express = require("express");
const cors = require("cors");
const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const DOWNLOAD_DIR = path.join(__dirname, "downloads");

// Crear carpeta de descargas si no existe
if (!fs.existsSync(DOWNLOAD_DIR)) {
  fs.mkdirSync(DOWNLOAD_DIR);
}

// Ruta al archivo de cookies que creamos a partir de tu JSON
const COOKIES_PATH = path.join(__dirname, "cookies.txt");

// Función para crear cookies.txt desde tu JSON (solo si no existe)
const createCookiesFile = () => {
  if (!fs.existsSync(COOKIES_PATH)) {
    const cookiesJson = [ /* Pega aquí tu JSON de cookies completo */ ];

    const lines = cookiesJson.map(c => {
      const domain = c.domain;
      const includeSubdomains = c.hostOnly ? "FALSE" : "TRUE";
      const pathCookie = c.path || "/";
      const secure = c.secure ? "TRUE" : "FALSE";
      const expiration = Math.floor(c.expirationDate || (Date.now()/1000 + 3600));
      const name = c.name;
      const value = c.value;
      return `${domain}\t${includeSubdomains}\t${pathCookie}\t${secure}\t${expiration}\t${name}\t${value}`;
    });

    fs.writeFileSync(COOKIES_PATH, lines.join("\n"));
    console.log("Archivo cookies.txt creado ✅");
  }
};

createCookiesFile();

// Endpoint para descargar y convertir a MP3
app.post("/download", (req, res) => {
  const { url } = req.body;

  if (!url) return res.status(400).json({ error: "No se proporcionó URL" });

  const outputTemplate = path.join(DOWNLOAD_DIR, "%(title)s.%(ext)s");

  // Comando yt-dlp con cookies y extracción de MP3
  const args = [
    "--cookies", COOKIES_PATH,
    "-x",
    "--audio-format", "mp3",
    "--audio-quality", "0",
    "-o", outputTemplate,
    url
  ];

  const ytdlp = spawn("yt-dlp", args);

  ytdlp.stdout.on("data", data => console.log(data.toString()));
  ytdlp.stderr.on("data", data => console.error(data.toString()));

  ytdlp.on("close", code => {
    // Buscar el archivo MP3 generado
    const files = fs.readdirSync(DOWNLOAD_DIR).filter(f => f.endsWith(".mp3"));
    if (files.length === 0) return res.status(500).json({ error: "No se generó MP3" });

    const latestFile = files.sort((a, b) => {
      return fs.statSync(path.join(DOWNLOAD_DIR, b)).mtime - fs.statSync(path.join(DOWNLOAD_DIR, a)).mtime;
    })[0];

    res.json({ filename: latestFile, url: `/file/${latestFile}` });
  });
});

// Servir archivos MP3
app.get("/file/:name", (req, res) => {
  const filePath = path.join(DOWNLOAD_DIR, req.params.name);
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).send("Archivo no encontrado");
  }
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});
