const express = require("express");
const fs = require("fs");
const path = require("path");
const { DOMParser } = require("xmldom");

const router = express.Router();
const UPLOADS_ROOT = path.join(__dirname, "../../uploads"); // adjust if needed

// --- GET /api/courses  (list directories) ---
router.get("/", async (req, res) => {
  try {
    const items = await fs.promises.readdir(UPLOADS_ROOT, { withFileTypes: true });
    const dirs = items.filter(item => item.isDirectory()).map(d => d.name);

    const courses = dirs.map((dir, idx) => {
      const name = dir.includes("-") ? dir.split("-").pop() : dir;
      return { id: idx + 1, name, path: `/uploads/${dir}`, folder: dir };
    });

    res.json(courses);
  } catch (err) {
    console.error("Failed to list courses:", err);
    res.status(500).json({ error: "Failed to list courses" });
  }
});

// --- GET /api/courses/:id  (get course by ID) ---
/**
 * It first get the course folder,
 * then go inside it and search for imsmanifest.xml,
 * then parse the XML to extract course metadata (SCOs list with their launchable URLs).
 */
router.get("/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const items = await fs.promises.readdir(UPLOADS_ROOT, { withFileTypes: true });
    const dirs = items.filter(item => item.isDirectory()).map(d => d.name);

    let folderName = null;

    if (/^\d+$/.test(id)) {
      const idx = parseInt(id, 10) - 1;
      if (idx < 0 || idx >= dirs.length) return res.status(404).json({ error: "Course not found (index out of range)" });
      folderName = dirs[idx];
    } else {
      folderName = dirs.find(d => d === id || (d.includes("-") ? d.split("-").pop() === id : false));
      if (!folderName) return res.status(404).json({ error: "Course not found" });
    }

    const coursePath = path.join(UPLOADS_ROOT, folderName);
    if (!fs.existsSync(coursePath)) return res.status(404).json({ error: "Course folder missing on disk" });

    // --- search for imsmanifest.xml ---
    const manifestPath = path.join(coursePath, "imsmanifest.xml");
    if (!fs.existsSync(manifestPath)) {
      return res.status(400).json({ error: "imsmanifest.xml not found in course folder" });
    }

    // --- parse manifest ---
    const xmlString = await fs.promises.readFile(manifestPath, "utf8");
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, "application/xml");

    // --- build resources map ---
    const resourcesMap = new Map();
    const resourceNodes = xmlDoc.getElementsByTagName("resource");
    for (let r = 0; r < resourceNodes.length; r++) {
      const node = resourceNodes[r];
      const identifier = node.getAttribute("identifier");
      if (!identifier) continue;
      resourcesMap.set(identifier, {
        href: node.getAttribute("href") || "",
        scormType: node.getAttribute("adlcp:scormType") || node.getAttribute("adlcp:scormtype") || ""
      });
    }

    // --- get default organization ---
    const orgsElem = xmlDoc.getElementsByTagName("organizations")[0];
    if (!orgsElem) return res.status(400).json({ error: "No <organizations> element found in manifest" });

    const defaultOrgId = orgsElem.getAttribute("default") || null;

    const orgNodes = xmlDoc.getElementsByTagName("organization") || [];
    let organization = null;
    if (defaultOrgId) {
      for (let i = 0; i < orgNodes.length; i++) {
        if (orgNodes[i].getAttribute && orgNodes[i].getAttribute("identifier") === defaultOrgId) {
          organization = orgNodes[i];
          break;
        }
      }
    }
    if (!organization && orgNodes.length > 0) organization = orgNodes[0];
    if (!organization) return res.status(400).json({ error: "Organization not found in manifest" });

    // --- check sequencing ---
    const sequencingNode = organization.getElementsByTagName("imsss:sequencing")[0]
      || organization.getElementsByTagName("sequencing")[0];
    const hasSequencing = !!sequencingNode;

    // --- build SCO list ---
    const itemNodes = Array.from(organization.getElementsByTagName("item")).filter(item => item.getAttribute("identifierref"));
    const scos = itemNodes
      .map(item => {
        const id = item.getAttribute("identifier") || "";
        const titleNode = item.getElementsByTagName("title")[0];
        const title = titleNode?.textContent?.trim() || "Untitled";
        const identifierRef = item.getAttribute("identifierref");
        const resource = resourcesMap.get(identifierRef);
        const parameters = item.getAttribute("parameters") || "";

        const launchUrl = `/uploads/${folderName}/${resource.href}${parameters}`;
        return { id, title, launchUrl, scormType: resource.scormType || "" };
      })
      .filter(x => x !== null);

    res.json({
      name: folderName.includes("-") ? folderName.split("-").pop() : folderName,
      scos,
      scoCount: scos.length,
      hasSequencing
    });

  } catch (err) {
    console.error("getCourseById failed:", err);
    res.status(500).json({ error: "Failed to read/parse manifest", details: err.message });
  }
});

// Delete a folder from /uploads folderPath
router.delete("/:folder", async (req, res) => {
  const folderName = req.params.folder;
  const folderPath = path.join(UPLOADS_ROOT, folderName);

  try {
    if (!fs.existsSync(folderPath)) {
      return res.status(404).json({ error: "Folder not found" });
    }

    // Delete the folder
    await fs.promises.rmdir(folderPath, { recursive: true });
    res.json({ message: "Folder deleted successfully" });
  } catch (err) {
    console.error("deleteFolder failed:", err);
    res.status(500).json({ error: "Failed to delete folder", details: err.message });
  }
});

module.exports = router;
