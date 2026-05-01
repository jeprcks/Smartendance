const path = require("path");
const fs = require("fs");
const multer = require("multer");
const Settings = require("../models/settingsSchema");

// ─── Multer: save logo/watermark to server/public/logo/ ──────────────────────
const logoDir = path.join(__dirname, "..", "public", "logo");
if (!fs.existsSync(logoDir)) fs.mkdirSync(logoDir, { recursive: true });

/** Supported extensions we may need to clean up when replacing an image. */
const IMAGE_EXTS = ["png", "jpg", "jpeg", "webp", "gif"];

/** Delete any existing logo/watermark file regardless of extension. */
function removeImageFile(base /* 'logo' | 'watermark' */) {
  for (const ext of IMAGE_EXTS) {
    const p = path.join(logoDir, `${base}.${ext}`);
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, logoDir),
  filename: (req, file, cb) => {
    // Use the actual MIME type so WebP files aren't stored as .png
    const base = req.params.type === "watermark" ? "watermark" : "logo";
    const ext = (file.mimetype.split("/")[1] || "png").replace("jpeg", "jpg");
    cb(null, `${base}.${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB max
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only image files are allowed"));
  },
});

const uploadMiddleware = upload.single("file");

// GET /api/settings  — config only, no images (~1 KB, fast)
const getSettings = async (req, res) => {
  try {
    const config = await Settings.getConfig();
    res.status(200).json(config);
  } catch (error) {
    console.error("Error fetching settings:", error);
    res.status(500).json({ error: "Failed to fetch settings" });
  }
};

// GET /api/settings/images  — images only (~4.4 MB, only when needed)
const getImages = async (req, res) => {
  try {
    const images = await Settings.getImages();
    res.status(200).json(images);
  } catch (error) {
    console.error("Error fetching settings images:", error);
    res.status(500).json({ error: "Failed to fetch settings images" });
  }
};

// PUT /api/settings  — update any field, returns config-only (fast response)
const updateSettings = async (req, res) => {
  try {
    const {
      schoolName,
      logo,
      watermarkLogo,
      address,
      lateThresholdMinutes,
      morningShiftCutoff,
      afternoonShiftCutoff,
      academicYear,
      theme,
    } = req.body;

    // Validate image size (5 MB limit)
    const MAX = 5 * 1024 * 1024;
    for (const [field, val] of [
      ["logo", logo],
      ["watermarkLogo", watermarkLogo],
    ]) {
      if (val && typeof val === "string") {
        // Accept both:
        // 1. Legacy base64: "data:image/..."
        // 2. New file paths: "/logo/logo.webp"
        // 3. Full URLs: "http://localhost:4000/logo/logo.webp"
        const isBase64 = val.startsWith("data:image/");
        const isFilePath = val.startsWith("/logo/") || val.includes("/logo/");

        if (!isBase64 && !isFilePath)
          return res
            .status(400)
            .json({ error: `${field}: invalid image format` });

        // Only validate size for base64 (file paths are already validated at upload)
        if (isBase64 && (val.length * 3) / 4 > MAX)
          return res
            .status(400)
            .json({ error: `${field}: image exceeds 5 MB limit` });
      }
    }

    // Validate time format HH:mm
    const timeRe = /^([01]\d|2[0-3]):([0-5]\d)$/;
    if (morningShiftCutoff !== undefined && !timeRe.test(morningShiftCutoff))
      return res
        .status(400)
        .json({ error: "Invalid morning shift time (HH:mm)" });
    if (
      afternoonShiftCutoff !== undefined &&
      !timeRe.test(afternoonShiftCutoff)
    )
      return res
        .status(400)
        .json({ error: "Invalid afternoon shift time (HH:mm)" });

    // Validate late threshold
    if (lateThresholdMinutes !== undefined) {
      const n = Number(lateThresholdMinutes);
      if (isNaN(n) || n < 0 || n > 120)
        return res
          .status(400)
          .json({ error: "Late threshold must be 0–120 minutes" });
    }

    let settings = await Settings.findOne();
    if (!settings) settings = new Settings({});

    if (schoolName !== undefined) settings.schoolName = schoolName;
    if (logo !== undefined) settings.logo = logo;
    if (watermarkLogo !== undefined) settings.watermarkLogo = watermarkLogo;
    if (address !== undefined) settings.address = address;
    if (lateThresholdMinutes !== undefined)
      settings.lateThresholdMinutes = Number(lateThresholdMinutes);
    if (morningShiftCutoff !== undefined)
      settings.morningShiftCutoff = morningShiftCutoff;
    if (afternoonShiftCutoff !== undefined)
      settings.afternoonShiftCutoff = afternoonShiftCutoff;
    if (academicYear !== undefined) settings.academicYear = academicYear;
    if (theme !== undefined && ["light", "dark"].includes(theme))
      settings.theme = theme;

    await settings.save(); // triggers clearCache via post('save') hook

    // Return config only — no images in the response keeps the payload tiny
    const config = await Settings.getConfig();
    res.status(200).json(config);
  } catch (error) {
    console.error("Error updating settings:", error);
    res.status(500).json({ error: "Failed to update settings" });
  }
};

// POST /api/settings/upload/:type  — upload logo or watermark file
const uploadImage = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const type = req.params.type; // 'logo' or 'watermark'
    const base = type === "watermark" ? "watermark" : "logo";

    // Multer has already written the new file; delete any OLD file that used
    // a different extension (e.g. replace logo.png with logo.webp).
    for (const ext of IMAGE_EXTS) {
      const p = path.join(logoDir, `${base}.${ext}`);
      if (p !== path.join(logoDir, req.file.filename) && fs.existsSync(p)) {
        fs.unlinkSync(p);
      }
    }

    const urlPath = `/logo/${req.file.filename}`; // served as static

    let settings = await Settings.findOne();
    if (!settings) settings = new Settings({});

    if (type === "watermark") settings.watermarkLogo = urlPath;
    else settings.logo = urlPath;

    await settings.save(); // clears cache via post('save') hook

    res.status(200).json({ url: urlPath });
  } catch (error) {
    console.error("Error uploading image:", error);
    res.status(500).json({ error: error.message || "Upload failed" });
  }
};

// DELETE /api/settings/image/:type  — remove logo or watermark
const removeImage = async (req, res) => {
  try {
    const type = req.params.type;
    const base = type === "watermark" ? "watermark" : "logo";

    // Delete any stored file regardless of extension
    removeImageFile(base);

    // Clear field in database
    let settings = await Settings.findOne();
    if (!settings) settings = new Settings({});

    if (type === "watermark") settings.watermarkLogo = null;
    else settings.logo = null;

    await settings.save();

    res.status(200).json({ ok: true });
  } catch (error) {
    console.error("Error removing image:", error);
    res.status(500).json({ error: error.message || "Remove failed" });
  }
};

module.exports = {
  getSettings,
  getImages,
  updateSettings,
  uploadImage,
  removeImage,
  uploadMiddleware,
};
