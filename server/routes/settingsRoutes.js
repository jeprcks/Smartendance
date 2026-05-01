const express = require("express");
const {
  getSettings,
  getImages,
  updateSettings,
  uploadImage,
  removeImage,
  uploadMiddleware,
} = require("../controllers/settingsController");

const router = express.Router();

router.get("/", getSettings); // config only — no images (~1 KB)
router.get("/images", getImages); // images only — URL paths
router.put("/", updateSettings); // update text settings
router.post("/upload/:type", uploadMiddleware, uploadImage); // upload logo or watermark file
router.delete("/image/:type", removeImage); // remove logo or watermark

module.exports = router;
