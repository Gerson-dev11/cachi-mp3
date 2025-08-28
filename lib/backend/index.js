const express = require("express");
const cors = require("cors");
const { exec } = require("child_process");
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

// Ruta fija a tu cookies.txt
const COOKIES_PATH = path.join(__dirname, "cookies.txt");

// Endpoint para descargar y convertir a MP3 usando cookies
app.post("/download", (req, res) => {
  const { url } = req.body;

  if (!url) return res.status(400).json({ error: "No se proporcionó URL" });

  const outputTemplate = path.join(DOWNLOAD_DIR, "%(title)s.%(ext)s");

  // Siempre usar cookies.txt
  const cmd = `yt-dlp --cookies "${COOKIES_PATH}" -x --audio-format mp3 -o "${outputTemplate}" "${url}"`;

  exec(cmd, { maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
    if (error) {
      console.error(stderr);
      if (stderr.includes("Sign in to confirm")) {
        return res.status(403).json({ error: "Video requiere autenticación (cookies)" });
      }
      return res.status(500).json({ error: "Error al descargar audio", details: stderr });
    }

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
