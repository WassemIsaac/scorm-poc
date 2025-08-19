const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const unzipper = require("unzipper");

const router = express.Router();

// KEEP the original relative path (relative to this file)
const UPLOADS_ROOT = path.resolve(__dirname, "../../uploads");

// Ensure uploads folder exists
if (!fs.existsSync(UPLOADS_ROOT)) fs.mkdirSync(UPLOADS_ROOT, { recursive: true });

// Multer setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_ROOT),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({ storage });

// Helper: remove folder recursively
async function removeFolder(folderPath) {
  if (fs.existsSync(folderPath)) {
    await fs.promises.rm(folderPath, { recursive: true, force: true });
  }
}

// Helper: recursively count files (not directories)
async function countFiles(dir) {
  let count = 0;
  const items = await fs.promises.readdir(dir, { withFileTypes: true });
  for (const it of items) {
    const p = path.join(dir, it.name);
    if (it.isDirectory()) {
      count += await countFiles(p);
    } else {
      count += 1;
    }
  }
  return count;
}

router.post("/", upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });

  const zipPath = req.file.path;
  // remove trailing .zip (case-insensitive) from the saved filename
  const folderName = req.file.filename.replace(/\.zip$/i, "");
  const extractDir = path.join(UPLOADS_ROOT, folderName);

  console.log(`Start extraction: zip=${zipPath} -> dir=${extractDir}`);

  try {
    await fs.promises.mkdir(extractDir, { recursive: true });

    // Open the ZIP and iterate entries
    const directory = await unzipper.Open.file(zipPath);

    // Count non-directory entries in zip (expected files)
    const expectedFiles = directory.files.filter(f => f.type !== "Directory").length;
    console.log(`ZIP contains ${expectedFiles} files (excluding directories)`);

    for (const entry of directory.files) {
      const entryPath = path.join(extractDir, entry.path);

      if (entry.type === "Directory") {
        await fs.promises.mkdir(entryPath, { recursive: true });
        continue;
      }

      // Ensure parent folder exists
      await fs.promises.mkdir(path.dirname(entryPath), { recursive: true });

      // Write the file and await finish
      await new Promise((resolve, reject) => {
        const ws = fs.createWriteStream(entryPath, { flags: "w" });
        entry.stream()
          .pipe(ws)
          .on("finish", resolve)
          .on("close", resolve)   // some streams emit close instead of finish
          .on("error", err => {
            console.error(`Write error for ${entry.path}:`, err);
            reject(err);
          });
      });

      // Verify file size > 0 (basic sanity)
      const st = await fs.promises.stat(entryPath);
      if (st.size === 0) {
        throw new Error(`Extracted file has zero size: ${entry.path}`);
      }
      console.log(`Extracted: ${entry.path} (${st.size} bytes)`);
    }

    // Verify extracted file count matches expected
    const actualFiles = await countFiles(extractDir);
    console.log(`Extraction done. expected=${expectedFiles}, actual=${actualFiles}`);

    if (actualFiles !== expectedFiles) {
      throw new Error(`Extraction incomplete: expected ${expectedFiles} files but found ${actualFiles}`);
    }

    // Delete the original ZIP only after success
    await fs.promises.unlink(zipPath);

    res.json({ success: true, folder: folderName, path: `/uploads/${folderName}` });
  } catch (error) {
    console.error("Extraction failed:", error);
    // Cleanup partial extraction and zip
    await removeFolder(extractDir);
    if (fs.existsSync(zipPath)) await fs.promises.unlink(zipPath).catch(() => {});
    return res.status(500).json({ error: "Failed to extract ZIP", details: String(error) });
  }
});

module.exports = router;
