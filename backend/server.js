const express = require("express");
const multer = require("multer");
const unzipper = require("unzipper");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = 3000;

// ---------- Angular dist path ----------
const angularDistPath = path.join(__dirname, "..", "dist", "scorm-demo", "browser"); 
app.use(express.static(angularDistPath));

// ---------- Uploads folder ----------
const uploadPath = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });

// ---------- Multer storage ----------
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadPath),
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname),
});
const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } }); // 50MB limit

// ---------- Upload & unzip route ----------
app.post("/api/upload", upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });

  const zipPath = req.file.path;
  const extractDir = path.join(uploadPath, path.parse(req.file.filename).name);
  if (!fs.existsSync(extractDir)) fs.mkdirSync(extractDir, { recursive: true });

  try {
    const directory = await unzipper.Open.file(zipPath);

    for (const entry of directory.files) {
      const entryPath = path.join(extractDir, entry.path);
      if (entry.type === "Directory") {
        fs.mkdirSync(entryPath, { recursive: true });
      } else {
        fs.mkdirSync(path.dirname(entryPath), { recursive: true });
        await new Promise((resolve, reject) => {
          entry.stream()
            .pipe(fs.createWriteStream(entryPath))
            .on("finish", resolve)
            .on("error", reject);
        });
      }
    }

    // Delete original ZIP
    fs.unlink(zipPath, (err) => {
      if (err) console.error("Failed to delete ZIP:", err);
    });

    // Return path for Angular to use
    res.json({ path: `/uploads/${path.parse(req.file.filename).name}/` });

  } catch (err) {
    console.error("Upload/Extract failed:", err);
    if (!res.headersSent) res.status(500).json({ error: "Failed to extract ZIP" });
  }
});

// ---------- Serve extracted uploads ----------
app.use("/uploads", express.static(uploadPath));

// get files names and paths
app.get("/api/courses", (req, res) => {
  fs.readdir(uploadPath, (err, files) => {
    if (err) {
      console.error("Failed to list files:", err);
      return res.status(500).json({ error: "Failed to list files" });
    }

    // get files names after the last "-" dash
    const fileInfos = files.map((file) => {
      const filePath = path.join(uploadPath, file);
      const name = file.split("-").pop(); // Get name after last "-"
      console.log(`Found course: ${name} at ${filePath}`);
      return { name, path: `/uploads/${file}` };
    });

    res.json(fileInfos);
  });
});

// ---------- Angular fallback ----------
app.get("*", (req, res) => {
  res.sendFile(path.join(angularDistPath, "index.html"));
});

// ---------- Start server ----------
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
