const express = require("express");
const path = require("path");
const uploadRoutes = require("./routes/upload");
const coursesRoutes = require("./routes/courses");
const errorHandler = require("./middlewares/errorHandler");

const app = express();
const PORT = 3000;


// ---------- API routes ----------
app.use("/api/upload", uploadRoutes);
app.use("/api/courses", coursesRoutes);


// ---------- Serve extracted uploads ----------
const uploadPath = path.join(__dirname, "../uploads");
app.use("/uploads", express.static(uploadPath));


// ---------- Serve Angular frontend ----------
const angularDistPath = path.join(__dirname, "..", "dist", "scorm-demo", "browser"); 
app.use(express.static(angularDistPath));


// ---------- Angular fallback (for client-side routing) ----------
// Angular fallback (for SPA routes only, NOT /api or /uploads)
app.get("*", (req, res) => {
  if (!req.path.startsWith("/api") && !req.path.startsWith("/uploads")) {
    res.sendFile(path.join(angularDistPath, "index.html"));
  }
});

// ---------- Error handling ----------
app.use(errorHandler);

// ---------- Start server ----------
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
