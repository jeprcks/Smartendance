const Settings = require("../models/settingsSchema");

const getSettings = async (req, res) => {
  try {
    const settings = await Settings.get();
    res.status(200).json(settings);
  } catch (error) {
    console.error("Error fetching settings:", error);
    res.status(500).json({ error: "Failed to fetch settings" });
  }
};

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

    let settings = await Settings.findOne();
    if (!settings) {
      settings = new Settings({});
    }

    if (schoolName !== undefined) settings.schoolName = schoolName;
    if (logo !== undefined) settings.logo = logo;
    if (watermarkLogo !== undefined) settings.watermarkLogo = watermarkLogo;
    if (address !== undefined) settings.address = address;
    if (lateThresholdMinutes !== undefined) settings.lateThresholdMinutes = Number(lateThresholdMinutes);
    if (morningShiftCutoff !== undefined) settings.morningShiftCutoff = morningShiftCutoff;
    if (afternoonShiftCutoff !== undefined) settings.afternoonShiftCutoff = afternoonShiftCutoff;
    if (academicYear !== undefined) settings.academicYear = academicYear;
    if (theme !== undefined && ["light", "dark"].includes(theme)) settings.theme = theme;

    await settings.save();
    res.status(200).json(settings);
  } catch (error) {
    console.error("Error updating settings:", error);
    res.status(500).json({ error: "Failed to update settings" });
  }
};

module.exports = {
  getSettings,
  updateSettings,
};
