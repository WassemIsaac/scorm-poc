const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const unzipper = require("unzipper");
const { pipeline } = require("stream/promises");

const router = express.Router();
const uploadPath = path.resolve("/tmp/uploads"); // <- changed from ../../uploads

// Ensure uploads folder exists
if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });

// Multer setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadPath),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({ storage });

// Utility: remove folder recursively
async function removeFolder(folderPath) {
  if (fs.existsSync(folderPath)) {
    await fs.promises.rm(folderPath, { recursive: true, force: true });
  }
}

// Upload + extract ZIP
router.post("/", upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });

  const zipPath = req.file.path;
  const folderName = req.file.filename.replace(/\.zip$/, "");
  const extractDir = path.join(uploadPath, folderName);

  try {
    // Ensure extraction folder exists
    await fs.promises.mkdir(extractDir, { recursive: true });

    // Properly await extraction
    await pipeline(
      fs.createReadStream(zipPath),
      unzipper.Extract({ path: extractDir })
    );

    // Delete original ZIP after successful extraction
    await fs.promises.unlink(zipPath);

    res.json({
      success: true,
      folder: folderName,
      path: `/uploads/${folderName}`,
    });
  } catch (error) {
    console.error("Extraction failed:", error);

    // Cleanup: remove partial folder
    await removeFolder(extractDir);

    // Cleanup: remove ZIP if still exists
    if (fs.existsSync(zipPath)) {
      await fs.promises.unlink(zipPath).catch(() => {});
    }

    res.status(500).json({ error: "Failed to extract ZIP" });
  }
});

module.exports = router;
