const mongoose = require("mongoose");

const settingsSchema = new mongoose.Schema(
  {
    schoolName: { type: String, default: "Umapad Elementary School" },
    logo: { type: String, default: null },
    watermarkLogo: { type: String, default: null },
    address: { type: String, default: "" },
    lateThresholdMinutes: { type: Number, default: 15 },
    morningShiftCutoff: { type: String, default: "07:00" },
    afternoonShiftCutoff: { type: String, default: "13:00" },
    academicYear: { type: String, default: "" },
    theme: { type: String, default: "light", enum: ["light", "dark"] },
    lastDailyReset: { type: Date, default: null },
    lastAutoCloseAt10PM: { type: Date, default: null },
    lastDailyResetAt12AM: { type: Date, default: null },
  },
  { timestamps: true },
);

// ─── Config cache (no images) ─────────────────────────────────────────────────
// Fetched with a MongoDB projection so the large base64 blobs never travel
// over the wire for this path. TTL: 60 seconds.

let _cfgCache = null;
let _cfgTime = 0;
const CFG_TTL = 60 * 1000;

settingsSchema.statics.getConfig = async function () {
  if (_cfgCache && Date.now() - _cfgTime < CFG_TTL) return _cfgCache;

  let doc = await this.findOne({}, "-logo -watermarkLogo");
  if (!doc) {
    await this.create({});
    doc = await this.findOne({}, "-logo -watermarkLogo");
  }

  _cfgCache = doc.toObject();
  _cfgTime = Date.now();
  return _cfgCache;
};

// ─── Images cache (logo + watermarkLogo) ─────────────────────────────────────
// These can be large (MB-range base64). Strategy: stale-while-revalidate.
//
//  • If cache is warm  → return it immediately (instant).
//  • If cache is stale → return stale data immediately AND kick off a
//    background refresh. The next call after the refresh completes will
//    get the fresh data. No request ever waits for a large DB fetch.
//  • If cache is empty (first boot) → fetch now and wait once, then cache.
//
// TTL: 24 hours. Images almost never change, so a long TTL is fine.

let _imgCache = null;
let _imgTime = 0;
let _imgRefreshing = false;
const IMG_TTL = 24 * 60 * 60 * 1000; // 24 hours

settingsSchema.statics._refreshImages = async function () {
  if (_imgRefreshing) return; // already running
  _imgRefreshing = true;
  try {
    const doc = await this.findOne({}, "logo watermarkLogo");
    _imgCache = {
      _id: doc?._id ?? null,
      logo: doc?.logo ?? null,
      watermarkLogo: doc?.watermarkLogo ?? null,
    };
    _imgTime = Date.now();
  } catch (err) {
    console.error("[Settings] image cache refresh failed:", err.message);
  } finally {
    _imgRefreshing = false;
  }
};

settingsSchema.statics.getImages = async function () {
  const now = Date.now();

  // Cache is warm → return immediately
  if (_imgCache && now - _imgTime < IMG_TTL) return _imgCache;

  // Cache is stale but not empty → return stale data, refresh in background
  if (_imgCache) {
    this._refreshImages(); // fire and forget
    return _imgCache;
  }

  // Cache is empty (first boot) → wait for the first fetch
  await this._refreshImages();
  return _imgCache ?? { _id: null, logo: null, watermarkLogo: null };
};

// ─── Clear both caches on any save/update ────────────────────────────────────
const clearCache = () => {
  _cfgCache = null;
  _cfgTime = 0;
  _imgCache = null;
  _imgTime = 0;
};
settingsSchema.post("save", clearCache);
settingsSchema.post("findOneAndUpdate", clearCache);

module.exports = mongoose.model("Settings", settingsSchema);
