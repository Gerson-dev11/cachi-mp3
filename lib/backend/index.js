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

// Endpoint para descargar y convertir a MP3
app.post("/download", (req, res) => {
  const { url } = req.body;

  if (!url) return res.status(400).json({ error: "No se proporcionó URL" });

  // Nombre del archivo temporal
  const outputTemplate = path.join(DOWNLOAD_DIR, "%(title)s.%(ext)s");

  // Comando yt-dlp para descargar y convertir a mp3
  const cmd = `yt-dlp -x --audio-format mp3 -o "${outputTemplate}" "${url}"`;

  exec(cmd, (error, stdout, stderr) => {
    if (error) {
      console.error(stderr);
      return res.status(500).json({ error: "Error al descargar audio" });
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
